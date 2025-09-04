import { stripTags } from "./text";
import type { ParsedDoc } from "@/types/docs";

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c as "&" | "<" | ">"]!));

export async function parsePDF(name: string, buf: ArrayBuffer): Promise<ParsedDoc> {
  const { pdfjs } = await import("react-pdf");
  (pdfjs as any).GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
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
  const contentHtml = `<pre>${esc(fullText)}</pre>`;
  return { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    name,
    type: "pdf",
    contentHtml,
    contentText: fullText,
  };
}

export async function parseDOCX(name: string, buf: ArrayBuffer): Promise<ParsedDoc> {
  const mammoth = await import("mammoth/mammoth.browser.js");
  const result = await mammoth.convertToHtml({ arrayBuffer: buf });
  const html = result.value as string;
  const text = stripTags(html);
  return { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    name,
    type: "docx",
    contentHtml: html,
    contentText: text };
}

export async function parseXLSX(name: string, buf: ArrayBuffer): Promise<ParsedDoc> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "array" });

  const htmlParts: string[] = [];
  const textParts: string[] = [];

  wb.SheetNames.forEach((sn: string) => {
    const ws = wb.Sheets[sn];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: "" });
    const textSheet: string[] = [];

    if (rows.length === 0) {
      htmlParts.push(`<h3 class="text-base font-semibold mb-2">${esc(sn)}</h3><div class="text-sm text-black/60 dark:text-white/60">Planilha vazia</div>`);
      return;
    }

    const head = rows[0] as any[];
    const body = rows.slice(1) as any[][];

    const thead = `<thead><tr>${head.map((c) => `<th>${esc(String(c))}</th>`).join("")}</tr></thead>`;

    const tbody = `<tbody>${body
      .map((r) => {
        textSheet.push(r.map((c) => String(c)).join("\t"));
        return `<tr>${r.map((c) => `<td>${esc(String(c)).replace(/\n/g, "<br>")}</td>`).join("")}</tr>`;
      })
      .join("")}</tbody>`;

    htmlParts.push(`<h3 class="text-base font-semibold mb-2">${esc(sn)}</h3><table class="excel-table">${thead}${tbody}</table>`);
    textParts.push(textSheet.join("\n"));
  });

  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    name,
    type: "xlsx",
    contentHtml: htmlParts.join("\n"),
    contentText: textParts.join("\n"),
  };
}
