"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// Configure worker via CDN to match the installed pdfjs version
const WORKER_SRC = "/pdf.worker.min.mjs" as const;
(pdfjs as any).GlobalWorkerOptions.workerSrc = WORKER_SRC;

export type PdfViewerProps = {
  fileUrl: string;
};

export function PdfViewer({ fileUrl }: PdfViewerProps) {
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

  return (
    <div ref={wrapRef} className="w-full">
      <Document
        file={fileUrl}
        options={{ workerSrc: WORKER_SRC as any }}
        onLoadSuccess={onLoadSuccess}
        loading={<div className="text-sm text-black/60 dark:text-white/60">Carregando PDF...</div>}
        noData={<div className="text-sm">Nenhum PDF</div>}
      >
        {pages.map((p) => (
          <Page key={p} pageNumber={p} width={containerWidth} renderTextLayer={false} renderAnnotationLayer={false} />
        ))}
      </Document>
    </div>
  );
}
