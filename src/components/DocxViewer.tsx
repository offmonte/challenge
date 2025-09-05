"use client";
import { useEffect, useRef } from "react";
import { renderAsync } from "docx-preview";

export function DocxViewer({ fileUrl, keywords }: { fileUrl: string; keywords: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const applyHighlight = (root: HTMLElement, words: string[]) => {
    // Unwrap previous highlights
    root.querySelectorAll("mark.keyword-highlight").forEach((m) => {
      const parent = m.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent || ""), m);
      parent.normalize();
    });
    if (!words || words.length === 0) return;
    const rx = new RegExp(`(${words.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const toProcess: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const t = n as Text;
      if (t.nodeValue && rx.test(t.nodeValue)) {
        rx.lastIndex = 0;
        toProcess.push(t);
      }
    }
    toProcess.forEach((textNode) => {
      const text = textNode.nodeValue || "";
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
      textNode.parentNode?.replaceChild(frag, textNode);
    });
  };

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
          // Apply highlight after rendering
          applyHighlight(containerRef.current, keywords);
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

  useEffect(() => {
    if (!containerRef.current) return;
    applyHighlight(containerRef.current, keywords);
  }, [keywords]);

  return <div ref={containerRef} className="docx-container" />;
}
