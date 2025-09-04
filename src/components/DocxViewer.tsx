"use client";
import { useEffect, useRef } from "react";
import { renderAsync } from "docx-preview";

export function DocxViewer({ fileUrl }: { fileUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(fileUrl);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
          await renderAsync(buf, containerRef.current, undefined, {
            className: "docx-view",
            ignoreWidth: false,
            ignoreHeight: false,
            experimental: true,
            inWrapper: true,
          });
        }
      } catch (e) {
        if (containerRef.current) containerRef.current.textContent = "Falha ao carregar DOCX.";
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return <div ref={containerRef} className="docx-container" />;
}
