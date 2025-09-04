import { escapeRegex } from "./text";

export function highlightHtml(html: string, keywords: string[]): string {
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
}
