export type HeaderBarProps = {
  query: string;
  onQueryChange: (v: string) => void;
  count: number;
};

export function HeaderBar({ query, onQueryChange, count }: HeaderBarProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold">Visualizador de Arquivos</h1>
          <p className="text-xs text-black/60 dark:text-white/60">Upload e visualização de PDF, DOCX, DOC e XLSX</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Pesquisar frase exata..."
          className="w-56 sm:w-72 rounded-full border border-black/[.08] dark:border-white/[.145] bg-transparent px-4 h-10 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20"
        />
        <span className="text-xs text-black/60 dark:text-white/60">{count} arquivo(s)</span>
      </div>
    </header>
  );
}
