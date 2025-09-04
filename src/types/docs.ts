export type DocType = "pdf" | "docx" | "doc" | "xlsx";

export type ParsedDoc = {
  id: string;
  name: string;
  type: DocType;
  contentHtml: string;
  contentText: string;
  error?: string;
  blobUrl?: string;
};
