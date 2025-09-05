"use client";
import dynamic from "next/dynamic";
import type { ParsedDoc } from "@/types/docs";
import { highlightHtml } from "@/lib/highlight";

const PdfViewer = dynamic(() => import("./PdfViewer").then((m) => m.PdfViewer), { ssr: false });
const DocxDynamic = dynamic(() => import("./DocxViewer").then((m) => m.DocxViewer), { ssr: false });

export type PreviewPaneProps = {
  selected: ParsedDoc | null;
  keywords: string[];
};

export function PreviewPane({ selected, keywords }: PreviewPaneProps) {
  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145] bg-background p-5 min-h-[420px] max-h-[70vh] overflow-auto">
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
            <PdfViewer fileUrl={selected.blobUrl} keywords={keywords} />
          ) : selected.type === "docx" && selected.blobUrl ? (
            <DocxDynamic fileUrl={selected.blobUrl} keywords={keywords} />
          ) : (
            <div className="max-w-none text-sm leading-relaxed break-words" dangerouslySetInnerHTML={{ __html: highlightHtml(selected.contentHtml, keywords) }} />
          )}
        </article>
      )}
    </div>
  );
}
