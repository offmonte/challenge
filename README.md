# Visualizador de Arquivos + Busca (Next.js + TypeScript)

Aplicação que permite fazer upload e visualizar arquivos (.pdf, .docx, .xlsx; .doc exibe aviso), realizar busca por frase exata e destacar ocorrências na visualização (incluindo PDF e DOCX). UI responsiva com Tailwind CSS.

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
  - XLSX: conversão para `<table>` semântica (`<thead>`, `<tbody>`), mantendo quebras de linha.
  - DOC: não suportado no navegador; exibe orientação para converter para .docx.
- Busca por frase exata:
  - O texto digitado é tratado como UM termo único (sem dividir por espaço/vírgula).
  - Filtro de documentos por ocorrência da frase no conteúdo ou nome do arquivo.
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
│  │  └─ DocxViewer.tsx              # Visualizador de DOCX (docx-preview) + destaque
│  ├─ lib/
│  │  ├─ parser.ts                   # Parse de PDF/DOCX/XLSX em HTML + texto; sanitização de DOCX
│  │  ├─ highlight.ts                # Destaque de palavras‑chave em HTML
│  │  ├─ hooks.ts                    # useDebouncedValue (debounce da busca)
│  │  └─ text.ts                     # Utilitários de texto (escapeRegex, stripTags)
│  ├─ pages/
│  │  ├─ _app.tsx                    # Import de estilos globais
│  │  ├─ _document.tsx               # Marcação base e lang
│  │  └─ index.tsx                   # Página principal (estado, filtro, revogação de blobs)
│  ├─ styles/
│  │  └─ globals.css                 # Variáveis de tema, classes utilitárias e tabelas
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
- Parsing isolado em `src/lib/parser.ts` para cada formato.
- Destaque em HTML via `src/lib/highlight.ts`; PDF via Text Layer; DOCX via pós-render.
- Tipagens centralizadas em `src/types/docs.ts` e imports com `@/*` (configurado em `tsconfig.json`).

## Fluxo de Funcionamento
1. Upload: `UploadDropzone` dispara `onFiles`; `index.tsx` valida extensão e cria Blob URL.
2. Parsing:
   - PDF → extrai texto com PDF.js e permite visualização fiel via `PdfViewer`.
   - DOCX → renderizado via `docx-preview`; HTML sanitizado para exibição segura.
   - XLSX → lido com `xlsx` e montado HTML semântico.
3. Busca: `HeaderBar` atualiza `query`; `useDebouncedValue` (300ms) suaviza digitação; `index.tsx` calcula relevância e ordena resultados.
4. Destaque: `PreviewPane` aplica `highlightHtml` em HTML/XLSX; `PdfViewer` destaca na Text Layer; `DocxViewer` destaca após `renderAsync`.
5. Seleção: `FileList` controla documento ativo; seleção é mantida quando possível após filtro.
6. Liberação de recursos: Blob URLs são revogadas no unmount para evitar vazamentos.

## Tecnologias
- Next.js 15, React 19, TypeScript, Tailwind CSS 4
- react-pdf + pdfjs-dist, docx-preview, xlsx

## Performance e Segurança
- Debounce na busca (300ms) reduz renders e reprocessamentos em PDFs/DOCX grandes.
- Revogação de Blob URLs no unmount (economiza memória e descritores).
- HTML de DOCX sanitizado em `src/lib/parser.ts` (remove `script/iframe/object/embed`, eventos `on*` e URLs `javascript:`).

## Erros e Tratamento
- Extensões inválidas → mensagem ao usuário.
- `.doc` → não suportado nativamente; orientação para converter para `.docx`.
- Falhas de parsing → mensagem descritiva na UI.

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
- Worker do PDF.js está em `public/pdf.worker.min.mjs` e é referenciado em `PdfViewer` e no parser de PDF.
- Estilos da Text Layer do PDF são importados em `src/components/PdfViewer.tsx`.

## Deploy (Vercel)
1. Importar o repositório no Vercel (Framework: Next.js).
2. Build command: `next build` (usado pelos scripts). Output: `.next/` padrão.
3. Verificar que `public/pdf.worker.min.mjs` está versionado.
4. Sem variáveis de ambiente obrigatórias.

## Solução de Problemas
- "API version ... does not match Worker version ...": garanta que o worker em `public/` corresponde à versão de `pdfjs-dist` do `package.json`.
- Aviso "TextLayer styles not found": confirme o import em `src/components/PdfViewer.tsx`:
  ```ts
  import "react-pdf/dist/Page/TextLayer.css";
  ```
- PDF não renderiza: verifique `/public/pdf.worker.min.mjs` e limpe o cache do navegador.
- DOCX quebrado: confirme que o arquivo é `.docx` válido; `.doc` não é suportado no navegador.
