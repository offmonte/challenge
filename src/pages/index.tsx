import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { UploadDropzone } from "@/components/UploadDropzone";
import { FileList } from "@/components/FileList";
import { PreviewPane } from "@/components/PreviewPane";
import { parseDOCX, parsePDF, parseXLSX } from "@/lib/parser";
import { escapeRegex } from "@/lib/text";
import { useDebouncedValue } from "@/lib/hooks";
import type { ParsedDoc } from "@/types/docs";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function Home() {
  const [docs, setDocs] = useState<ParsedDoc[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, 300);
  const keywords = useMemo(() => {
    const q = debouncedQuery.trim();
    return q ? [q] : [];
  }, [debouncedQuery]);

  const acceptExt = [".pdf", ".docx", ".doc", ".xlsx"] as const;
  const acceptAttr = "application/pdf,.pdf,.docx,.doc,.xlsx" as const;

  const addError = useCallback((msg: string) => {
    setErrors((prev) => [...prev, msg]);
    setTimeout(() => setErrors((prev) => prev.slice(1)), 5000);
  }, []);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    for (const file of incoming) {
      const ext = "." + file.name.split(".").pop()!.toLowerCase();
      if (!acceptExt.includes(ext as any)) {
        addError(`Formato não suportado: ${file.name}`);
        continue;
      }
      try {
        const buf = await file.arrayBuffer();
        const blobUrl = URL.createObjectURL(file);
        if (ext === ".pdf") {
          const parsed = await parsePDF(file.name, buf);
          setDocs((prev) => [{ ...parsed, blobUrl }, ...prev]);
          setSelectedId((sid) => sid ?? parsed.id);
        } else if (ext === ".docx") {
          const parsed = await parseDOCX(file.name, buf);
          setDocs((prev) => [{ ...parsed, blobUrl }, ...prev]);
          setSelectedId((sid) => sid ?? parsed.id);
        } else if (ext === ".xlsx") {
          const parsed = await parseXLSX(file.name, buf);
          setDocs((prev) => [{ ...parsed, blobUrl }, ...prev]);
          setSelectedId((sid) => sid ?? parsed.id);
        } else if (ext === ".doc") {
          try {
            const b64 = Buffer.from(buf).toString("base64");
            const resp = await fetch("/api/convert-doc", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename: file.name, base64: b64, output: "docx" }),
            });
            if (!resp.ok) throw new Error(await resp.text());
            const { url } = await resp.json();
            const converted = await fetch(url);
            const convBuf = await converted.arrayBuffer();
            const convFile = new File([convBuf], file.name.replace(/\.doc$/i, ".docx"), { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
            const convBlobUrl = URL.createObjectURL(convFile);
            const parsed = await parseDOCX(convFile.name, convBuf);
            setDocs((prev) => [{ ...parsed, blobUrl: convBlobUrl }, ...prev]);
            setSelectedId((sid) => sid ?? parsed.id);
          } catch (err: any) {
            const parsed: ParsedDoc = {
              id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
              name: file.name,
              type: "doc",
              contentHtml:
                '<div class="text-sm">Falha ao converter .doc automaticamente. Converta para .docx e envie novamente.</div>',
              contentText: ".doc not supported",
              error: ".doc parsing is not supported in-browser",
              blobUrl,
            };
            setDocs((prev) => [parsed, ...prev]);
            setSelectedId((sid) => sid ?? parsed.id);
          }
        }
      } catch (e: any) {
        addError(`Falha ao processar ${file.name}: ${e?.message || e}`);
      }
    }
  }, [addError]);

  // Track current blob URLs and revoke them on unmount to free resources
  const blobUrlsRef = useRef<string[]>([]);
  useEffect(() => {
    blobUrlsRef.current = docs.map((d) => d.blobUrl).filter(Boolean) as string[];
  }, [docs]);
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch {}
      });
    };
  }, []);

  const filtered = useMemo(() => {
    if (keywords.length === 0) return docs;
    const pattern = keywords.map(escapeRegex).join("|");
    const rxText = new RegExp(pattern, "gi");
    const rxName = new RegExp(pattern, "gi");

    const scored = docs
      .map((d) => {
        const textMatches = (d.contentText.match(rxText) || []).length;
        const nameMatches = (d.name.match(rxName) || []).length;
        const score = textMatches + nameMatches * 2;
        return { d, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.d.name.localeCompare(b.d.name));

    return scored.map((x) => x.d);
  }, [docs, keywords]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((d) => d.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((d) => d.id === selectedId) || null;

  return (
    <div className={`${geistSans.className} ${geistMono.className} font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-6 sm:p-10 pb-24 gap-10`}>
      <main className="row-start-2 w-full max-w-6xl">
        <HeaderBar query={query} onQueryChange={setQuery} count={docs.length} />

        <div className="grid grid-cols-12 gap-6">
          <section className="col-span-12 md:col-span-4 flex flex-col gap-6">
            <UploadDropzone accept={acceptAttr} onFiles={handleFiles} errors={errors} />
            <FileList items={filtered} selectedId={selectedId} onSelect={setSelectedId} />
          </section>

          <section className="col-span-12 md:col-span-8">
            <PreviewPane selected={selected} keywords={keywords} />
          </section>
        </div>
      </main>

      <footer className="row-start-3 w-full text-center text-[11px] text-black/60 dark:text-white/60">
        Visualizador de Arquivos - Suporte para PDF, DOCX, DOC e XLSX · Desenvolvido com Next.js, TypeScript e Tailwind CSS
      </footer>
    </div>
  );
}
