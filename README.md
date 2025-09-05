# Visualizador de Arquivos + Busca (Next.js + TypeScript)

Aplicação que permite fazer upload e visualizar arquivos (.pdf, .docx, .xlsx; .doc exibe aviso), realizar busca por frase exata e destacar ocorrências na visualização (incluindo PDF, DOCX e XLSX). UI responsiva com Tailwind CSS.

## Sumário
- [Funcionalidades](#funcionalidades)
- [Arquitetura e Estrutura do Projeto](#arquitetura-e-estrutura-do-projeto)
- [Fluxo de Funcionamento](#fluxo-de-funcionamento)
- [Tecnologias](#tecnologias)
- [Performance e Segurança](#performance-e-segurança)
- [Erros e Tratamento](#erros-e-tratamento)
- [Execução Local](#execução-local)
- [Build e Produção](#build-e-produção)
- [Deploy (Vercel)](#deploy-vercel)
- [Solução de Problemas](#solução-de-problemas)

## Funcionalidades
- Upload de múltiplos arquivos (arrastar/soltar e seletor) com validação por extensão.
- Visualização:
  - PDF: React‑PDF (PDF.js) com worker local; destaque de termos aplicado na Text Layer.
  - DOCX: docx-preview com preservação de layout; destaque pós-render diretamente no DOM.
  - XLSX: visualização com formatação via ExcelJS (larguras de coluna, merges, alinhamento, fonte/tamanho, cores de célula e bordas), renderizada como `<table>`.
  - DOC: não suportado no navegador; exibe orientação para converter para .docx.
- Busca por frase exata:
  - O texto digitado é tratado como UM termo único (sem dividir por espaço/vírgula).
  - Filtro de documentos por ocorrência da frase no conteúdo e no nome do arquivo.
  - Ordenação por relevância (ocorrências no conteúdo + peso no nome do arquivo).
  - Destaque visual da frase nos conteúdos renderizados (HTML, XLSX, PDF, DOCX).
- UI responsiva, dark mode e mensagens de erro amigáveis.

## Arquitetura e Estrutura do Projeto
```
.
├─ public/
│  └─ pdf.worker.min.mjs              # Worker do PDF.js servido localmente
├─ src/
│  ├─ components/
│  │  ├─ HeaderBar.tsx               # Cabeçalho com busca e contagem de arquivos
│  │  ├─ UploadDropzone.tsx          # Área de upload (drag & drop + input)
│  │  ├─ FileList.tsx                # Lista de arquivos com seleção
│  │  ├─ PreviewPane.tsx             # Painel de visualização dinâmico
│  │  ├─ PdfViewer.tsx               # Visualizador de PDF (React‑PDF) + destaque
│  │  ├─ DocxViewer.tsx              # Visualizador de DOCX (docx-preview) + destaque
│  │  └─ XlsxViewer.tsx              # Visualizador de XLSX com formatação (ExcelJS) + destaque
│  ├─ lib/
│  │  ├─ parser.ts                   # Parse de PDF/DOCX/XLSX em HTML + texto; sanitização de DOCX; extração de texto de PDF/XLSX
│  │  ├─ highlight.ts                # Destaque de palavras‑chave em HTML
│  │  ├─ hooks.ts                    # useDebouncedValue (debounce da busca)
│  │  └─ text.ts                     # Utilitários de texto (escapeRegex, stripTags)
│  ├─ pages/
│  │  ├─ _app.tsx                    # Import de estilos globais
│  │  ├─ _document.tsx               # Marcação base e lang
│  │  └─ index.tsx                   # Página principal (estado, filtro, revogação de blobs)
│  ├─ styles/
│  │  └─ globals.css                 # Variáveis de tema, classes utilitárias, tabelas e estilos XLSX
│  └─ types/
│     └─ docs.ts                     # Tipagens (ParsedDoc, DocType)
├─ eslint.config.mjs                 # ESLint (Next + TS)
├─ next.config.ts                    # Configurações do Next
├─ postcss.config.mjs                # Tailwind CSS v4
├─ tsconfig.json                     # Paths e strict mode
└─ package.json                      # Scripts e dependências
```

### Decisões de design
- `src/pages/index.tsx` coordena estado (docs, query, seleção), delegando parsing e visualização para módulos específicos.
- Parsing isolado em `src/lib/parser.ts` (extração de texto/HTML); visualização DOCX/PDF/XLSX em componentes dedicados.
- Destaque em HTML via `src/lib/highlight.ts`; PDF via Text Layer; DOCX e XLSX pós-render no DOM.
- Tipagens centralizadas em `src/types/docs.ts` e imports com `@/*` (configurado em `tsconfig.json`).

## Fluxo de Funcionamento
1. Upload: `UploadDropzone` dispara `onFiles`; `index.tsx` valida extensão e cria Blob URL.
2. Parsing/extração:
   - PDF → extrai texto com PDF.js para busca; visualização fiel via `PdfViewer`.
   - DOCX → renderizado via `docx-preview`; HTML sanitizado em `parser.ts` para exibição segura.
   - XLSX → texto extraído via `xlsx` (para busca); visualização com formatação via `XlsxViewer` (ExcelJS) usando o Blob.
3. Busca: `HeaderBar` atualiza `query`; `useDebouncedValue` (300ms) suaviza digitação; `index.tsx` calcula relevância e ordena resultados.
4. Destaque: `PreviewPane` aplica `highlightHtml` em HTML/XLSX fallback; `PdfViewer` destaca na Text Layer; `DocxViewer` e `XlsxViewer` destacam após renderização.
5. Seleção: `FileList` controla documento ativo; seleção é mantida quando possível após filtro.
6. Liberação de recursos: Blob URLs são revogadas no unmount para evitar vazamentos.

## Tecnologias
- Next.js 15, React 19, TypeScript, Tailwind CSS 4
- react-pdf + pdfjs-dist, docx-preview, xlsx, exceljs

## Performance e Segurança
- Debounce na busca (300ms) reduz renders e reprocessamentos em documentos grandes.
- Revogação de Blob URLs no unmount (economiza memória).
- HTML de DOCX sanitizado em `src/lib/parser.ts` (remove `script/iframe/object/embed`, eventos `on*` e URLs `javascript:`).
- XLSX renderizado em `<table>` com estilos inline por célula apenas quando necessário (fidelidade de formatação).

## Erros e Tratamento
- Extensões inválidas → mensagem ao usuário.
- `.doc` → não suportado nativamente; orientação para converter para `.docx`.
- Falhas de parsing/visualização → mensagem descritiva na UI.

## Execução Local
1. Instalar dependências:
   ```bash
   npm install
   ```
2. Desenvolvimento (Turbopack):
   ```bash
   npm run dev
   ```
3. Build de produção:
   ```bash
   npm run build
   ```
4. Start de produção:
   ```bash
   npm start
   ```

## Build e Produção
- Worker do PDF.js está em `public/pdf.worker.min.mjs` e é referenciado no `PdfViewer` e no parser de PDF.
- Estilos da Text Layer do PDF são importados em `src/components/PdfViewer.tsx`.
- `exceljs` é usado apenas no cliente (carregado dinamicamente no `XlsxViewer`).

## Deploy (Vercel)
1. Importar o repositório no Vercel (Framework: Next.js).
2. Build command: `next build` (padrão). Output: `.next/`.
3. Verificar que `public/pdf.worker.min.mjs` está versionado.
4. Sem variáveis de ambiente obrigatórias.

## Solução de Problemas
- Incompatibilidade de versões PDF.js: verifique `pdf.worker.min.mjs` condizente com `pdfjs-dist` do `package.json`.
- "TextLayer styles not found": confirme `import "react-pdf/dist/Page/TextLayer.css"` em `PdfViewer.tsx`.
- XLSX sem estilos: lembre-se que estilos de tema são aproximados (palette padrão do Office, com `tint`); algumas formatações (número/data) podem exigir mapeamento adicional.
- Planilhas muito grandes: considere virtualização ou paginação por aba.
