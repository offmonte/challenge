declare module "mammoth/mammoth.browser.js" {
  export type ConvertToHtmlResult = {
    value: string;
    messages?: unknown[];
  };
  export function convertToHtml(input: { arrayBuffer: ArrayBuffer }): Promise<ConvertToHtmlResult>;
}
