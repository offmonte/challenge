"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// Configure worker via CDN to match the installed pdfjs version
const WORKER_SRC = "/pdf.worker.min.mjs" as const;
(pdfjs as any).GlobalWorkerOptions.workerSrc = WORKER_SRC;

export type PdfViewerProps = {
  fileUrl: string;
  keywords: string[];
};

export function PdfViewer({ fileUrl, keywords }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth);
    });
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const onLoadSuccess = ({ numPages: n }: { numPages: number }) => setNumPages(n);

  const pages = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages]);

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    if (!keywords || keywords.length === 0) {
      // Remove previous highlights if any
      root.querySelectorAll("mark.keyword-highlight").forEach((m) => {
        const parent = m.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(m.textContent || ""), m);
        parent.normalize();
      });
      return;
    }
    const rx = new RegExp(`(${keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");

    const apply = () => {
      // Unwrap previous marks to avoid nested highlights
      root.querySelectorAll("mark.keyword-highlight").forEach((m) => {
        const parent = m.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(m.textContent || ""), m);
        parent.normalize();
      });
      // Highlight inside PDF text layer spans
      const layers = root.querySelectorAll<HTMLDivElement>(".react-pdf__Page__textContent");
      layers.forEach((layer) => {
        const spans = layer.querySelectorAll<HTMLSpanElement>("span");
        spans.forEach((span) => {
          const text = span.textContent || "";
          if (!rx.test(text)) return;
          rx.lastIndex = 0;
          const parts: (string | HTMLElement)[] = [];
          let last = 0;
          text.replace(rx, (m, _g, idx: number) => {
            if (idx > last) parts.push(text.slice(last, idx));
            const mark = document.createElement("mark");
            mark.className = "keyword-highlight";
            mark.textContent = m;
            parts.push(mark);
            last = idx + m.length;
            return m;
          });
          if (last < text.length) parts.push(text.slice(last));
          span.innerHTML = "";
          parts.forEach((p) => {
            if (typeof p === "string") span.appendChild(document.createTextNode(p));
            else span.appendChild(p);
          });
        });
      });
    };

    // Apply after render; a small delay ensures text layers exist
    const raf = requestAnimationFrame(() => setTimeout(apply, 0));
    return () => cancelAnimationFrame(raf);
  }, [keywords, numPages, fileUrl]);

  return (
    <div ref={wrapRef} className="w-full">
      <Document
        key={fileUrl}
        file={fileUrl}
        onLoadSuccess={onLoadSuccess}
        loading={<div className="text-sm text-black/60 dark:text-white/60">Carregando PDF...</div>}
        noData={<div className="text-sm">Nenhum PDF</div>}
      >
        {pages.map((p) => (
          <Page key={p} pageNumber={p} width={containerWidth} renderTextLayer={true} renderAnnotationLayer={false} />
        ))}
      </Document>
    </div>
  );
}
