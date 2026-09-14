export type CvType = "pdf" | "docx" | "doc";

export const CV_MIME: Record<CvType, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
};

/** Value for a file input's `accept` attribute. */
export const CV_ACCEPT = [".pdf", ".docx", ".doc", ...Object.values(CV_MIME)].join(",");

const startsWith = (head: Uint8Array, signature: number[]) =>
  head.length >= signature.length && signature.every((byte, i) => head[i] === byte);

/**
 * Identifies a CV from its first bytes, which is the only evidence a candidate
 * cannot simply lie about -- the file name and declared content type are both
 * chosen by the browser.
 *
 * ponytail: a DOCX is a ZIP, and the first bytes alone cannot tell it from any
 * other ZIP (an .xlsx, a .zip renamed .docx). Accepted as a known gap because
 * Word files are never rendered in a browser (ADR-0009), so a mislabelled ZIP is
 * a useless download rather than a hazard. Inspect the central directory for
 * word/document.xml if that ever needs to be exact.
 */
export function cvTypeFromSignature(head: Uint8Array): CvType | null {
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"; // %PDF-
  if (startsWith(head, [0x50, 0x4b, 0x03, 0x04])) return "docx"; // PK\x03\x04
  if (startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "doc"; // OLE
  return null;
}

/** First-pass check in the browser, before anything is uploaded. */
export function cvTypeFromName(fileName: string): CvType | null {
  const match = /\.(pdf|docx|doc)$/i.exec(fileName.trim());
  return match ? (match[1]!.toLowerCase() as CvType) : null;
}

/** Only PDFs render inline; Word files are always downloaded (ADR-0009). */
export function isPreviewable(mimeType: string): boolean {
  return mimeType === CV_MIME.pdf;
}
