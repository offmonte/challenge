import { useCallback, useEffect, useMemo, useState } from "react";
import { HeaderBar } from "@/components/HeaderBar";
import { UploadDropzone } from "@/components/UploadDropzone";
import { FileList } from "@/components/FileList";
import { PreviewPane } from "@/components/PreviewPane";
import { parseDOCX, parsePDF, parseXLSX } from "@/lib/parser";
import { escapeRegex } from "@/lib/text";
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

  const keywords = useMemo(() => query.split(/[\,\s]+/).map((k) => k.trim()).filter(Boolean), [query]);

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
          const parsed: ParsedDoc = {
            id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
            name: file.name,
            type: "doc",
            contentHtml:
              '<div class="text-sm">O formato .doc não é suportado no navegador. Converta para .docx e envie novamente.</div>',
            contentText: ".doc not supported",
            error: ".doc parsing is not supported in-browser",
            blobUrl,
          };
          setDocs((prev) => [parsed, ...prev]);
          setSelectedId((sid) => sid ?? parsed.id);
        }
      } catch (e: any) {
        addError(`Falha ao processar ${file.name}: ${e?.message || e}`);
      }
    }
  }, [addError]);

  const filtered = useMemo(() => {
    if (keywords.length === 0) return docs;
    const regex = new RegExp(keywords.map(escapeRegex).join("|"), "i");
    return docs.filter((d) => regex.test(d.contentText));
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
