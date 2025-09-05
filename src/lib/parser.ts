import { stripTags } from "./text";
import type { ParsedDoc } from "@/types/docs";

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c as "&" | "<" | ">"]!));

function sanitizeHtml(html: string) {
  if (typeof window === "undefined") return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  // Remove unsafe elements
  doc.querySelectorAll("script, iframe, object, embed").forEach((el) => el.remove());
  // Clean unsafe attributes
  doc.querySelectorAll("*").forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      if ((name === "href" || name === "src") && /^javascript:/i.test(attr.value)) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return doc.body.innerHTML;
}

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
  const rawHtml = result.value as string;
  const safeHtml = sanitizeHtml(rawHtml);
  const text = stripTags(safeHtml);
  return { id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    name,
    type: "docx",
    contentHtml: safeHtml,
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

export async function parseDOCFallback(name: string, buf: ArrayBuffer): Promise<ParsedDoc> {
  // Extração básica de texto de um arquivo .doc binário (baixa fidelidade)
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  // Mantém sequências de caracteres imprimíveis (ASCII) e quebras de linha
  const matches = binary.match(/[\t\r\n\x20-\x7E]{3,}/g) || [];
  const text = matches.join("\n");
  const contentHtml = `<div class="text-xs text-amber-700 dark:text-amber-400 mb-2">Pré-visualização de texto simples de arquivo .doc (baixa fidelidade)</div><pre>${esc(text)}</pre>`;
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    name,
    type: "doc",
    contentHtml,
    contentText: text,
  };
}
