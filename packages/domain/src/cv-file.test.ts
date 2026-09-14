import { describe, expect, it } from "vitest";
import { cvTypeFromSignature, cvTypeFromName, isPreviewable, CV_ACCEPT } from "./cv-file.js";

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => new TextEncoder().encode(s);

describe("cvTypeFromSignature", () => {
  it("recognises a PDF by its %PDF- header", () => {
    expect(cvTypeFromSignature(ascii("%PDF-1.7\n..."))).toBe("pdf");
  });

  it("recognises DOCX, which is a ZIP container", () => {
    expect(cvTypeFromSignature(bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00))).toBe("docx");
  });

  it("recognises legacy DOC by its OLE compound-file header", () => {
    expect(cvTypeFromSignature(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1))).toBe("doc");
  });

  // The declared content type comes from the browser and is free to lie. These
  // are the files a renamed .pdf or .docx most often really is.
  it.each([
    ["an HTML page", ascii("<!DOCTYPE html><script>")],
    ["plain text", ascii("just some text pretending")],
    ["a PNG image", bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a)],
    ["an empty file", bytes()],
    ["a truncated header", bytes(0x50, 0x4b)],
  ])("refuses %s", (_label, head) => {
    expect(cvTypeFromSignature(head)).toBeNull();
  });
});

describe("cvTypeFromName", () => {
  it.each([
    ["resume.pdf", "pdf"],
    ["Resume.PDF", "pdf"],
    ["priya nair cv.docx", "docx"],
    ["old-cv.doc", "doc"],
  ])("reads %s as %s", (name, type) => {
    expect(cvTypeFromName(name)).toBe(type);
  });

  it.each(["cv.txt", "cv.png", "cv", "cv.docm", "cv.pdf.exe"])("refuses %s", (name) => {
    expect(cvTypeFromName(name)).toBeNull();
  });
});

describe("isPreviewable", () => {
  it("previews PDFs inline but never Word files", () => {
    expect(isPreviewable("application/pdf")).toBe(true);
    expect(isPreviewable("application/msword")).toBe(false);
    expect(
      isPreviewable("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ).toBe(false);
  });
});

describe("CV_ACCEPT", () => {
  it("offers exactly the three accepted types to the file picker", () => {
    expect(CV_ACCEPT).toContain(".pdf");
    expect(CV_ACCEPT).toContain(".docx");
    expect(CV_ACCEPT).toContain(".doc");
    expect(CV_ACCEPT).not.toContain(".docm");
  });
});
