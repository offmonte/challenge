import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type ParsedDoc = {
  id: string;
  name: string;
  type: "pdf" | "docx" | "doc" | "xlsx";
  contentHtml: string;
  contentText: string;
  error?: string;
  blobUrl?: string;
};

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripTags(html: string) {
  if (typeof window === "undefined") return html;
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

export default function Home() {
  const [docs, setDocs] = useState<ParsedDoc[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const keywords = useMemo(() => {
    return query
      .split(/[\,\s]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }, [query]);

  const acceptExt = [".pdf", ".docx", ".doc", ".xlsx"];
  const acceptAttr = "application/pdf,.pdf,.docx,.doc,.xlsx";

  const addError = useCallback((msg: string) => {
    setErrors((prev) => [...prev, msg]);
    setTimeout(() => setErrors((prev) => prev.slice(1)), 5000);
  }, []);

  const parsePDF = useCallback(async (name: string, buf: ArrayBuffer): Promise<ParsedDoc> => {
    const { pdfjs } = await import("react-pdf");
    const WORKER_SRC = `https://unpkg.com/pdfjs-dist@${(pdfjs as any).version}/build/pdf.worker.min.js`;
    (pdfjs as any).GlobalWorkerOptions.workerSrc = WORKER_SRC;
    const loadingTask = (pdfjs as any).getDocument({ data: buf });
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = (content.items as any[])
        .map((item: any) => (typeof item.str === "string" ? item.str : ""))
        .filter(Boolean);
      fullText += strings.join(" ") + "\n";
    }
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c as "&" | "<" | ">"]!));
    const contentHtml = `<pre>${esc(fullText)}</pre>`;
    return { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, name, type: "pdf", contentHtml, contentText: fullText };
  }, []);

  const parseDOCX = useCallback(async (name: string, buf: ArrayBuffer): Promise<ParsedDoc> => {
    const mammoth = await import("mammoth/mammoth.browser.js");
    const result = await mammoth.convertToHtml({ arrayBuffer: buf });
    const html = result.value as string;
    const text = stripTags(html);
    return { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, name, type: "docx", contentHtml: html, contentText: text };
  }, []);

  const parseXLSX = useCallback(async (name: string, buf: ArrayBuffer): Promise<ParsedDoc> => {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buf, { type: "array" });
    let htmlParts: string[] = [];
    let textParts: string[] = [];
    wb.SheetNames.forEach((sn: string) => {
      const ws = wb.Sheets[sn];
      const html = XLSX.utils.sheet_to_html(ws, { header: `<h3 class=\"text-base font-semibold mb-2\">${sn}</h3>` });
      const csv = XLSX.utils.sheet_to_csv(ws);
      htmlParts.push(html);
      textParts.push(csv);
    });
    return { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, name, type: "xlsx", contentHtml: htmlParts.join("\n"), contentText: textParts.join("\n") };
  }, []);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    const incoming = Array.from(fileList);
    for (const file of incoming) {
      const ext = "." + file.name.split(".").pop()!.toLowerCase();
      if (!acceptExt.includes(ext)) {
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
  }, [addError, parseDOCX, parsePDF, parseXLSX]);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const filtered = useMemo(() => {
    if (keywords.length === 0) return docs;
    const regex = new RegExp(keywords.map(escapeRegex).join("|"), "i");
    return docs.filter((d) => regex.test(d.contentText));
  }, [docs, keywords]);

  // Keep selection valid when filters or docs change
  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((d) => d.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const highlightHtml = useCallback(
    (html: string) => {
      if (keywords.length === 0) return html;
      if (typeof window === "undefined") return html;
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const rx = new RegExp(`(${keywords.map(escapeRegex).join("|")})`, "gi");
      const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.nodeValue || "";
          if (!rx.test(text)) return;
          rx.lastIndex = 0;
          const frag = document.createDocumentFragment();
          let last = 0;
          text.replace(rx, (m, _g, idx: number) => {
            if (idx > last) frag.appendChild(document.createTextNode(text.slice(last, idx)));
            const mark = document.createElement("mark");
            mark.className = "keyword-highlight";
            mark.textContent = m;
            frag.appendChild(mark);
            last = idx + m.length;
            return m;
          });
          if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
          node.parentNode?.replaceChild(frag, node);
          return;
        }
        Array.from(node.childNodes).forEach(walk);
      };
      walk(doc.body);
      return doc.body.innerHTML;
    },
    [keywords]
  );

  const selected = filtered.find((d) => d.id === selectedId) || null;
  const PdfViewer = useMemo(() => dynamic(() => import("../components/PdfViewer").then((m) => m.PdfViewer), { ssr: false }), []);

  return (
    <div className={`${geistSans.className} ${geistMono.className} font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-6 sm:p-10 pb-24 gap-10`}>
      <main className="row-start-2 w-full max-w-6xl">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Image className="dark:invert" src="/next.svg" alt="Next.js logo" width={28} height={28} />
            <div>
              <h1 className="text-lg sm:text-xl font-semibold">Visualizador de Arquivos</h1>
              <p className="text-xs text-black/60 dark:text-white/60">Upload e visualização de PDF, DOCX, DOC e XLSX</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar palavras-chave..."
              className="w-56 sm:w-72 rounded-full border border-black/[.08] dark:border-white/[.145] bg-transparent px-4 h-10 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
            />
            <span className="text-xs text-black/60 dark:text-white/60">{docs.length} arquivo(s)</span>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* Left column: uploader + list */}
          <section className="col-span-12 md:col-span-4 flex flex-col gap-6">
            <div
              ref={dropRef}
              onDrop={onDrop}
              onDragOver={onDragOver}
              className="rounded-xl border border-dashed border-black/[.18] dark:border-white/[.22] p-5 bg-background"
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div className="rounded-full border border-black/[.08] dark:border-white/[.145] w-12 h-12 flex items-center justify-center">
                  <span className="text-xl">⬆️</span>
                </div>
                <p className="text-sm">Arraste arquivos aqui ou clique para selecionar</p>
                <label htmlFor="file-input" className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm h-9 px-4 cursor-pointer">Selecionar arquivos</label>
                <input id="file-input" type="file" className="hidden" accept={acceptAttr} multiple onChange={(e) => handleFiles(e.currentTarget.files)} />
                <span className="text-[11px] text-black/60 dark:text-white/60">Suporta: PDF, DOCX, DOC, XLSX</span>
              </div>
              {errors.length > 0 && (
                <ul className="mt-3 text-sm text-red-600 dark:text-red-400 list-disc pl-5">
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-black/[.08] dark:border-white/[.145] bg-background">
              <header className="px-4 py-3 border-b border-black/[.06] dark:border-white/[.12] text-sm font-medium">Arquivos</header>
              {docs.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-black/60 dark:text-white/60">
                  Nenhum arquivo enviado
                </div>
              ) : (
                <ul className="max-h-[420px] overflow-auto divide-y divide-black/[.06] dark:divide-white/[.12]">
                  {filtered.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(d.id)}
                        className={`w-full text-left px-4 py-3 text-sm hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] ${selectedId === d.id ? "bg-black/[.04] dark:bg-white/[.06]" : ""}`}
                        title={d.name}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate">{d.name}</span>
                          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-black/[.08] dark:border-white/[.145]">{d.type}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && (
                    <li className="px-4 py-6 text-sm text-black/60 dark:text-white/60">Nenhum arquivo corresponde à pesquisa</li>
                  )}
                </ul>
              )}
            </div>
          </section>

          {/* Right column: preview */}
          <section className="col-span-12 md:col-span-8">
            <div className="rounded-xl border border-black/[.08] dark:border-white/[.145] bg-background p-5 min-h-[420px]">
              {!selected ? (
                <div className="h-full w-full flex items-center justify-center text-center">
                  <div className="max-w-md">
                    <div className="mx-auto mb-3 w-10 h-10 rounded-full border border-black/[.08] dark:border-white/[.145] flex items-center justify-center">📄</div>
                    <h2 className="text-base font-semibold mb-1">Selecione um arquivo para visualizar</h2>
                    <p className="text-sm text-black/60 dark:text-white/60">Faça upload de arquivos PDF, DOCX, DOC ou XLSX e selecione-os na lista à esquerda para visualizar seu conteúdo aqui.</p>
                  </div>
                </div>
              ) : (
                <article>
                  <header className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold truncate" title={selected.name}>{selected.name}</h2>
                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-black/[.08] dark:border-white/[.145]">{selected.type}</span>
                  </header>
                  {selected.error && (
                    <div className="text-xs mb-2 text-amber-700 dark:text-amber-400">{selected.error}</div>
                  )}
                  {selected.type === "pdf" && selected.blobUrl ? (
                    <PdfViewer fileUrl={selected.blobUrl} />
                  ) : (
                    <div className="max-w-none text-sm leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: highlightHtml(selected.contentHtml) }} />
                  )}
                </article>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="row-start-3 w-full text-center text-[11px] text-black/60 dark:text-white/60">
        Visualizador de Arquivos - Suporte para PDF, DOCX, DOC e XLSX · Desenvolvido com Next.js, TypeScript e Tailwind CSS
      </footer>
    </div>
  );
}
