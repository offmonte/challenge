
Application that lets you upload and preview files (.pdf, .docx, .xlsx; .doc shows a notice), search for an exact phrase, and highlight occurrences in the preview (including PDF, DOCX and XLSX). Responsive UI with Tailwind CSS.

## Table of Contents
- [Features](#features)
- [UI/UX](#ui-ux)
- [Architecture and Project Structure](#architecture-and-project-structure)
- [How It Works](#how-it-works)
- [Technologies](#technologies)
- [Performance and Security](#performance-and-security)
- [Errors and Handling](#errors-and-handling)
- [Local Development](#local-development)
- [Build and Production](#build-and-production)
- [Deploy (Vercel)](#deploy-vercel)
- [Troubleshooting](#troubleshooting)

## Features
- Upload multiple files (drag & drop and file picker) with extension validation.
- Preview:
  - PDF: React‑PDF (PDF.js) with local worker; term highlighting applied on the Text Layer.
  - DOCX: docx-preview with layout preserved; post-render highlighting directly in the DOM.
  - XLSX: preview with formatting via ExcelJS (column widths, merges, alignment, font/size, cell colors and borders), rendered as a `<table>`.
  - DOC: not supported in the browser; shows guidance to convert to .docx.
- Exact phrase search:
  - The text you type is treated as ONE single term (no splitting by space/comma).
  - Filter documents by occurrences of the phrase in content and in the file name.
  - Sort by relevance (occurrences in content + weight on file name).
  - Visual highlighting of the phrase in rendered contents (HTML, XLSX, PDF, DOCX).
- Responsive UI, dark mode and friendly error messages.

## UI/UX
The interface is **simple, minimalistic, and easy to use**, ensuring that any user can interact with it effortlessly.  
The layout automatically adapts to the system's **light or dark mode**, providing visual comfort and consistency.  
The design was inspired by the **Next.js / Vercel style**, focusing on clarity and content.


## Architecture and Project Structure
```
.
├─ public/
│  └─ pdf.worker.min.mjs              # PDF.js worker served locally
├─ src/
│  ├─ components/
│  │  ├─ HeaderBar.tsx               # Header with search and file count
│  │  ├─ UploadDropzone.tsx          # Upload area (drag & drop + input)
│  │  ├─ FileList.tsx                # File list with selection
│  │  ├─ PreviewPane.tsx             # Dynamic preview panel
│  │  ├─ PdfViewer.tsx               # PDF viewer (React‑PDF) + highlight
│  │  ├─ DocxViewer.tsx              # DOCX viewer (docx-preview) + highlight
│  │  └─ XlsxViewer.tsx              # XLSX viewer with formatting (ExcelJS) + highlight
│  ├─ lib/
│  │  ├─ parser.ts                   # Parse PDF/DOCX/XLSX to HTML + text; DOCX sanitization; extract text from PDF/XLSX
│  │  ├─ highlight.ts                # Keyword highlighting in HTML
│  │  ├─ hooks.ts                    # useDebouncedValue (search debounce)
│  │  └─ text.ts                     # Text utilities (escapeRegex, stripTags)
│  ├─ pages/
│  │  ├─ _app.tsx                    # Import global styles
│  │  ├─ _document.tsx               # Base markup and lang
│  │  └─ index.tsx                   # Main page (state, filter, blob revocation)
│  ├─ styles/
│  │  └─ globals.css                 # Theme vars, utility classes, tables and XLSX styles
│  └─ types/
│     └─ docs.ts                     # Types (ParsedDoc, DocType)
├─ eslint.config.mjs                 # ESLint (Next + TS)
├─ next.config.ts                    # Next config
├─ postcss.config.mjs                # Tailwind CSS v4
├─ tsconfig.json                     # Paths and strict mode
└─ package.json                      # Scripts and dependencies
```

### Design Decisions
- `src/pages/index.tsx` coordinates state (docs, query, selection), delegating parsing and rendering to specific modules.
- Parsing isolated in `src/lib/parser.ts` (text/HTML extraction); DOCX/PDF/XLSX rendering in dedicated components.
- Highlighting in HTML via `src/lib/highlight.ts`; PDF via Text Layer; DOCX and XLSX post-render in the DOM.
- Types centralized in `src/types/docs.ts` and imports via `@/*` (configured in `tsconfig.json`).

## How It Works
1. Upload: `UploadDropzone` triggers `onFiles`; `index.tsx` validates extensions and creates a Blob URL.
2. Parsing/extraction:
   - PDF → extract text with PDF.js for search; faithful rendering via `PdfViewer`.
   - DOCX → rendered via `docx-preview`; HTML sanitized in `parser.ts` for safe display.
   - XLSX → text extracted via `xlsx` (for search); formatted preview via `XlsxViewer` (ExcelJS) using the Blob.
3. Search: `HeaderBar` updates `query`; `useDebouncedValue` (300ms) smooths typing; `index.tsx` scores and sorts results.
4. Highlight: `PreviewPane` applies `highlightHtml` on HTML/XLSX fallback; `PdfViewer` highlights on Text Layer; `DocxViewer` and `XlsxViewer` highlight after render.
5. Selection: `FileList` controls the active document; selection is preserved when possible after filtering.
6. Resource cleanup: Blob URLs are revoked on unmount to avoid leaks.

## Technologies
- Next.js 15, React 19, TypeScript, Tailwind CSS 4
- react-pdf + pdfjs-dist, docx-preview, xlsx, exceljs

## Performance and Security
- 300ms search debounce reduces re-renders and reprocessing for large documents.
- Blob URLs are revoked on unmount (saves memory).
- DOCX HTML sanitized in `src/lib/parser.ts` (removes `script/iframe/object/embed`, `on*` events and `javascript:` URLs).
- XLSX rendered as `<table>` with per-cell inline styles only when necessary (formatting fidelity).

## Errors and Handling
- Invalid extensions → user message.
- `.doc` → not supported natively; guidance to convert to `.docx`.
- Parsing/rendering failures → descriptive message in the UI.

## Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Development (Turbopack):
   ```bash
   npm run dev
   ```
3. Production build:
   ```bash
   npm run build
   ```
4. Production start:
   ```bash
   npm start
   ```

## Build and Production
- PDF.js worker is at `public/pdf.worker.min.mjs` and is referenced in both `PdfViewer` and the PDF parser.
- PDF Text Layer styles are imported in `src/components/PdfViewer.tsx`.
- `exceljs` is client-only (loaded dynamically in `XlsxViewer`).

## Troubleshooting
- PDF.js version mismatch: verify `pdf.worker.min.mjs` matches `pdfjs-dist` in `package.json`.
- "TextLayer styles not found": confirm `import "react-pdf/dist/Page/TextLayer.css"` in `PdfViewer.tsx`.
- XLSX without styles: remember theme styles are approximations (Office default palette, with `tint`); some formats (number/date) may need extra mapping.
- Very large spreadsheets: consider virtualization or tab pagination.
