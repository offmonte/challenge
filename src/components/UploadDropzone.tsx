import { useCallback } from "react";

export type UploadDropzoneProps = {
  accept: string;
  onFiles: (files: FileList | null) => void;
  errors: string[];
};

export function UploadDropzone({ accept, onFiles, errors }: UploadDropzoneProps) {
  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      onFiles(e.dataTransfer.files);
    },
    [onFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div className="rounded-xl border border-dashed border-black/[.18] dark:border-white/[.22] p-5 bg-background" onDrop={onDrop} onDragOver={onDragOver}>
      <div className="flex flex-col items-center text-center gap-3">
        <div className="rounded-full border border-black/[.08] dark:border-white/[.145] w-12 h-12 flex items-center justify-center">
          <span className="text-xl">⬆️</span>
        </div>
        <p className="text-sm">Arraste arquivos aqui ou clique para selecionar</p>
        <label htmlFor="file-input" className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm h-9 px-4 cursor-pointer">Selecionar arquivos</label>
        <input id="file-input" type="file" className="hidden" accept={accept} multiple onChange={(e) => onFiles(e.currentTarget.files)} />
        <span className="text-[11px] text-black/60 dark:text-white/60">Suporta: PDF, DOCX, DOC, XLSX</span>
      </div>
      {errors.length > 0 && (
        <ul className="mt-3 text-sm text-red-600 dark:text-red-400 list-disc pl-5">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
