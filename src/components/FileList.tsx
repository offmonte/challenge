import type { ParsedDoc } from "@/types/docs";

export type FileListProps = {
  items: ParsedDoc[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function FileList({ items, selectedId, onSelect }: FileListProps) {
  return (
    <div className="rounded-xl border border-black/[.08] dark:border-white/[.145] bg-background">
      <header className="px-4 py-3 border-b border-black/[.06] dark:border-white/[.12] text-sm font-medium">Files</header>
      {items.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-black/60 dark:text-white/60">No files uploaded</div>
      ) : (
        <ul className="max-h-[420px] overflow-auto divide-y divide-black/[.06] dark:divide-white/[.12]">
          {items.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onSelect(d.id)}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] ${selectedId === d.id ? "bg-black/[.04] dark:bg-white/[.06]" : ""}`}
                title={d.name}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate">{d.name}</span>
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border border-black/[.08] dark:border-white/[.145]">{d.type}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
