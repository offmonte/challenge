# Visualizador de Arquivos + Busca (Next.js + TypeScript)

Aplicação que permite fazer upload e visualizar arquivos (.pdf, .docx, .xlsx e aviso para .doc), pesquisar por palavras‑chave e destacar resultados. UI responsiva com Tailwind CSS.

## Funcionalidades
- Upload de múltiplos arquivos com validação (arrastar/soltar e seletor).
- Visualização:
  - PDF: renderizado com React‑PDF (PDF.js) preservando layout.
  - DOCX: renderizado com docx-preview mantendo formatação básica (parágrafos, imagens, estilos).
  - XLSX: convertido em HTML semântico (<table>) para leitura clara.
  - DOC: não suportado nativamente no navegador; mostra orientação para converter para .docx.
- Busca por palavras‑chave (lista separada por espaço/vírgula) e destaque em conteúdos HTML.
- Feedback de erros (tipos inválidos, falhas de parsing).

## Tecnologias e por quê
- Next.js + TypeScript: DX, roteamento e build otimizados.
- Tailwind CSS: utilitários rápidos, mantendo o visual original do template.
- react‑pdf (PDF.js): renderização de PDF no cliente com fidelidade.
- docx-preview: melhor preservação de layout de DOCX que conversões somente para texto/HTML.
- xlsx: leitura de planilhas e conversão para tabela HTML semântica.

## Estrutura (arquivos relevantes)
- `src/pages/index.tsx`: página principal (upload, parsing, busca, UI de lista/preview).
- `src/components/PdfViewer.tsx`: visualizador PDF (React‑PDF) com configuração do worker.
- `src/components/DocxViewer.tsx`: visualizador DOCX (docx-preview).
- `src/styles/globals.css`: estilos globais, destaque de palavras e tabela do XLSX.
- `public/pdf.worker.min.mjs`: worker do PDF.js servido localmente (evita incompatibilidade de versões/CDN).

## Executando localmente
1. Instale dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Acesse http://localhost:3000 e faça upload dos arquivos.

## Como funciona cada formato
### PDF (React‑PDF)
- Configuração do worker local (evita erros de versão e de network):
  - Arquivo: `public/pdf.worker.min.mjs` (copiado da versão do `pdfjs-dist` usada pelo `react-pdf`).
  - Uso: `src/components/PdfViewer.tsx` e parsing de texto em `src/pages/index.tsx` configuram `pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"`.
- Observações:
  - Destaque de busca não é aplicado dentro do canvas do PDF (apenas em HTML renderizado).
  - Se preferir, é possível alternar para `<iframe src={blobUrl}>` como fallback simples.

### DOCX (docx-preview)
- Carrega o arquivo via Blob URL e renderiza no container `.docx-container`.
- CSS em `globals.css` garante que o documento não extrapole o preview (largura 100%, imagens responsivas).
- Limitações: recursos avançados (alguns shapes/headers complexos) podem não ser 100% idênticos ao Word.

### XLSX (xlsx)
- Uso de `XLSX.utils.sheet_to_json(ws, { header: 1 })` para obter matriz de células.
- Geração de `<table class="excel-table">` com `<thead>` e `<tbody>`; quebra de linha preservada com `<br>`.
- Estilos em `globals.css` para bordas e legibilidade; cabeçalho pode ser tornado "sticky" facilmente.

## Busca e destaque
- Campo no cabeçalho aceita palavras separadas por espaço/vírgula.
- Filtragem por regex (case‑insensitive) em `contentText` de cada documento.
- Destaque com `<mark.keyword-highlight>` nos conteúdos HTML (DOCX/XLSX/Texto de PDF extraído). Não afeta o canvas do PDF.

## Tratamento de erros
- Tipos não suportados mostram mensagem amigável.
- Falhas de parsing são exibidas em lista de alertas.
- `.doc` exibe instrução para converter para `.docx`.

## Decisões de arquitetura
- Todo parsing é client‑side para evitar necessidade de backend/infra.
- Worker do PDF servido localmente para evitar mismatch de versão entre API e worker.
- Carregamentos pesados (React‑PDF, DocxViewer) via `dynamic(..., { ssr: false })` para não quebrar SSR.

## Deploy (Vercel)
- Build padrão Next.js. Configure a pasta `public/` para incluir `pdf.worker.min.mjs`.
- Após deploy, se houver erro de worker versão, rode novamente `npm install` local e copie o worker da pasta: `node_modules/react-pdf/node_modules/pdfjs-dist/build/pdf.worker.min.mjs` para `public/`.

## Solução de problemas
- "API version ... does not match Worker version ...":
  - Confirme que o `public/pdf.worker.min.mjs` foi copiado da mesma versão do `pdfjs-dist` usada por `react-pdf`.
  - Limpe o cache do navegador (Ctrl+F5 / Cmd+Shift+R).
- "Failed to fetch" ao carregar PDF:
  - Certifique‑se de que o `workerSrc` aponta para `/pdf.worker.min.mjs` e que o arquivo existe em produção.
- DOCX saindo da área de preview:
  - Estilos `.docx-container .docx { width: 100% !important; }` já aplicados; ajuste `max-h`/`overflow` do painel conforme necessário.

## Próximos passos (opcional)
- Fallback automático para iframe no PDF quando o worker falhar.
- Cabeçalho sticky nas tabelas XLSX e paginação de planilhas grandes.
- Persistência dos uploads em storage externo (ex.: Supabase) quando desejado.
