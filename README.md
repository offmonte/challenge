# Visualizador de Arquivos + Busca (Next.js + TypeScript)

Aplicação que permite fazer upload e visualizar arquivos (.pdf, .docx, .xlsx e aviso para .doc), pesquisar por palavras‑chave e destacar resultados. UI responsiva com Tailwind CSS.

## Sumário
- [Funcionalidades](#funcionalidades)
- [Arquitetura e Estrutura do Projeto](#arquitetura-e-estrutura-do-projeto)
- [Fluxo de Funcionamento](#fluxo-de-funcionamento)
- [Tecnologias](#tecnologias)
- [Estilos e Acessibilidade](#estilos-e-acessibilidade)
- [Erros e Tratamento](#erros-e-tratamento)
- [Execução Local](#execução-local)
- [Deploy (Vercel)](#deploy-vercel)
- [Solução de Problemas](#solução-de-problemas)
- [Próximos Passos (opcional)](#próximos-passos-opcional)

## Funcionalidades
- Upload de múltiplos arquivos (arrastar/soltar e seletor) com validação por extensão.
- Visualização:
  - PDF: React‑PDF (PDF.js) com worker local para compatibilidade de versão.
  - DOCX: docx-preview com preservação de layout básico (parágrafos, imagens, estilos).
  - XLSX: conversão para `<table>` semântica (thead/tbody), com quebra de linha.
  - DOC: não suportado no navegador; exibe orientação para converter para .docx.
- Busca por palavras‑chave (separadas por espaço ou vírgula) com filtro de documentos e destaque visual.
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
│  │  ├─ PdfViewer.tsx               # Visualizador de PDF (React‑PDF)
│  │  └─ DocxViewer.tsx              # Visualizador de DOCX (docx-preview)
│  ├─ lib/
│  │  ├─ parser.ts                   # Parse de PDF/DOCX/XLSX em HTML + texto
│  │  ├─ highlight.ts                # Destaque de palavras‑chave em HTML
│  │  └─ text.ts                     # Utilitários de texto (escapeRegex, stripTags)
│  ├─ pages/
│  │  ├─ _app.tsx                    # Import de estilos globais
│  │  ├─ _document.tsx               # Marcação base e lang
│  │  └─ index.tsx                   # Página principal (orquestração e estado)
│  ├─ styles/
│  │  └─ globals.css                 # Variáveis de tema, classes utilitárias e tabelas
│  └─ types/
│     └─ docs.ts                     # Tipagens (ParsedDoc, DocType)
├─ eslint.config.mjs                 # ESLint (Next + TS)
├─ next.config.ts                    # React strict mode
├─ postcss.config.mjs                # Tailwind CSS v4
├─ tsconfig.json                     # Paths e strict mode
└─ package.json                      # Scripts e dependências
```

### Decisões de design
- Página `index.tsx` atua apenas como camada de coordenação (estado e composição de componentes). Sem lógica de parsing inline.
- Lógica de parsing/extração isolada em `src/lib/parser.ts` para fácil manutenção e testes.
- Destaque de busca em `src/lib/highlight.ts` (função pura para reaproveitamento e testes).
- Tipagens compartilhadas em `src/types/docs.ts` para consistência e legibilidade.
- Componentes visuais pequenos, com responsabilidades claras e nomes descritivos.
- Imports com alias `@/*` (configurado em `tsconfig.json`).

## Fluxo de Funcionamento
1. Upload: `UploadDropzone` dispara `onFiles`; `index.tsx` valida extensão e cria Blob URL.
2. Parsing:
   - PDF → extrai texto com PDF.js e também permite visualização fiel via `PdfViewer`.
   - DOCX → converte para HTML com `docx-preview` (render no cliente).
   - XLSX → lê planilhas com `xlsx` e monta HTML semântico.
3. Busca: `HeaderBar` atualiza `query`; `index.tsx` filtra documentos por regex e repassa `keywords`.
4. Destaque: `PreviewPane` aplica `highlightHtml` nos conteúdos HTML renderizados.
5. Seleção: `FileList` controla documento ativo; seleção é mantida ao filtrar sempre que possível.

## Tecnologias
- Next.js 15, React 19, TypeScript, Tailwind CSS 4
- react-pdf + pdfjs-dist, docx-preview, xlsx

## Estilos e Acessibilidade
- Variáveis CSS para tema claro/escuro preservadas; classes utilitárias do Tailwind.
- Tabela XLSX com semântica (`<thead>`, `<tbody>`) e contraste de bordas configurável em dark mode.
- Área de upload com label conectada ao input (teclado/leitor de tela).

## Erros e Tratamento
- Extensões inválidas → mensagem listada ao usuário.
- `.doc` → informa não suportado nativamente e sugere conversão para `.docx`.
- Falhas de parsing → mensagem descritiva em lista de erros.
- Observações: conteúdo destacado usa `dangerouslySetInnerHTML`; se for exibir HTML não confiável, adicionar sanitização.

## Execução Local
1. Instalar dependências:
   ```bash
   npm install
   ```
2. Rodar em desenvolvimento:
   ```bash
   npm run dev
   ```
3. Acessar http://localhost:3000

## Deploy (Vercel)
- Importar o repositório no Vercel e fazer deploy padrão de app Next.js.
- Certifique-se de que `public/pdf.worker.min.mjs` está versionado; o React‑PDF usa esse caminho.

## Solução de Problemas
- "API version ... does not match Worker version ...": garanta que o worker em `public/` tem a mesma versão do `pdfjs-dist` instalado.
- PDF sem renderizar: verifique a existência de `/pdf.worker.min.mjs` e cache do navegador.
- DOCX fora do contêiner: estilos em `.docx-container .docx { width: 100% !important; }` já aplicados.

## Próximos Passos (opcional)
- Sanitização de HTML antes do destaque para cenários com conteúdo não confiável.
- Virtualização/paginação para planilhas grandes.
- Persistência dos uploads (ex.: Supabase) e compartilhamento de sessões.
