"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { escapeRegex } from "@/lib/text";

function argbToCss(argb?: { argb?: string } | null): string | null {
  const a = argb?.argb;
  if (!a || a.length !== 8) return null;
  const aHex = a.substring(0, 2);
  const r = parseInt(a.substring(2, 4), 16);
  const g = parseInt(a.substring(4, 6), 16);
  const b = parseInt(a.substring(6, 8), 16);
  const alpha = parseInt(aHex, 16) / 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyHighlight(root: HTMLElement, words: string[]) {
  // Unwrap previous highlights
  root.querySelectorAll("mark.keyword-highlight").forEach((m) => {
    const parent = m.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(m.textContent || ""), m);
    (parent as HTMLElement).normalize();
  });
  if (!words || words.length === 0) return;
  const rx = new RegExp(`(${words.map((k) => escapeRegex(k)).join("|")})`, "gi");
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
}

export function XlsxViewer({ fileUrl, keywords }: { fileUrl: string; keywords: string[] }) {
  const [sheets, setSheets] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(fileUrl);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const ExcelJS = await import("exceljs");
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buf);
        const parsed = wb.worksheets.map((ws: any) => {
          // Collect merges
          const merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = [];
          if (ws.model?.merges) {
            ws.model.merges.forEach((addr: string) => {
              const range = ws.getCell(addr.split(":")[0]).worksheet.getCell(addr.split(":")[0]);
              // ExcelJS range parsing helper
            });
          }
          // Build matrix bounds
          const rowCount = ws.rowCount;
          const colCount = ws.columnCount;
          // Column widths (approximate px)
          const colWidths: number[] = [];
          ws.columns.forEach((col: any, i: number) => {
            const w = col.width ? Math.round(col.width * 7 + 5) : 100;
            colWidths[i] = w;
          });
          // Extract cell data
          const rows: any[] = [];
          for (let r = 1; r <= rowCount; r++) {
            const row = ws.getRow(r);
            const cells: any[] = [];
            for (let c = 1; c <= colCount; c++) {
              const cell = row.getCell(c);
              const text = (cell.text ?? cell.value ?? "").toString();
              const font = cell.font || {};
              const align = cell.alignment || {};
              const fill = cell.fill || {};
              const border = cell.border || {};
              let bg: string | null = null;
              if (fill && fill.type === "pattern" && fill.fgColor) bg = argbToCss(fill.fgColor as any);
              const fg = font && (font as any).color ? argbToCss((font as any).color as any) : null;
              cells.push({
                r,
                c,
                text,
                bold: !!font.bold,
                italic: !!font.italic,
                underline: !!font.underline,
                alignH: align.horizontal || undefined,
                alignV: align.vertical || undefined,
                wrap: !!align.wrapText,
                bg,
                fg,
                border,
              });
            }
            rows.push(cells);
          }
          // Merges
          const mergeMap = new Map<string, { rowspan: number; colspan: number }>();
          if (ws.model?.merges?.length) {
            ws.model.merges.forEach((ref: string) => {
              const [a, b] = ref.split(":");
              const addrToRC = (addr: string) => {
                const m = addr.match(/^([A-Z]+)(\d+)$/);
                if (!m) return { r: 1, c: 1 };
                const col = m[1];
                const row = parseInt(m[2], 10);
                let c = 0;
                for (let i = 0; i < col.length; i++) {
                  c = c * 26 + (col.charCodeAt(i) - 64);
                }
                return { r: row, c };
              };
              const s = addrToRC(a);
              const e = addrToRC(b);
              const rowspan = e.r - s.r + 1;
              const colspan = e.c - s.c + 1;
              mergeMap.set(`${s.r}:${s.c}`, { rowspan, colspan });
              for (let rr = s.r; rr <= e.r; rr++) {
                for (let cc = s.c; cc <= e.c; cc++) {
                  if (!(rr === s.r && cc === s.c)) mergeMap.set(`${rr}:${cc}`, { rowspan: 0, colspan: 0 });
                }
              }
            });
          }
          return { name: ws.name, rows, colWidths, mergeMap };
        });
        if (!cancelled) setSheets(parsed);
      } catch (e) {
        if (containerRef.current) containerRef.current.textContent = "Falha ao carregar XLSX.";
      }
    }
    load();
    return () => { cancelled = true; };
  }, [fileUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    applyHighlight(containerRef.current, keywords);
  }, [keywords, sheets]);

  const content = useMemo(() => {
    return (
      <div className="excel-viewer">
        {sheets.map((s, si) => (
          <section key={si} className="mb-6">
            <h3 className="text-base font-semibold mb-2">{s.name}</h3>
            <table className="excel-table">
              <colgroup>
                {s.colWidths.map((w: number, i: number) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <tbody>
                {s.rows.map((row: any[], rIdx: number) => (
                  <tr key={rIdx}>
                    {row.map((cell: any, cIdx: number) => {
                      const m = s.mergeMap.get(`${cell.r}:${cell.c}`);
                      if (m && m.rowspan === 0 && m.colspan === 0) return null;
                      const style: any = {};
                      if (cell.bg) style["--excel-bg" as any] = cell.bg;
                      if (cell.fg) style["--excel-fg" as any] = cell.fg;
                      if (cell.alignH) style.textAlign = cell.alignH;
                      const cls = [
                        "excel-cell",
                        cell.bold ? "font-semibold" : "",
                        cell.italic ? "italic" : "",
                        cell.underline ? "underline" : "",
                        cell.wrap ? "whitespace-pre-wrap" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      const props: any = {};
                      if (m && (m.rowspan > 1 || m.colspan > 1)) {
                        if (m.rowspan > 1) props.rowSpan = m.rowspan;
                        if (m.colspan > 1) props.colSpan = m.colspan;
                      }
                      return (
                        <td key={cIdx} className={cls} style={style} {...props}>
                          {cell.text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
    );
  }, [sheets]);

  return (
    <div ref={containerRef} className="excel-container">
      {content}
    </div>
  );
}

export default XlsxViewer;
