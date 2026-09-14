import { describe, expect, it } from "vitest";
import { parseDescription } from "./description.js";

describe("parseDescription", () => {
  it("keeps a single line as one paragraph", () => {
    expect(parseDescription("Implementation role for R12.")).toEqual([
      { type: "paragraph", text: "Implementation role for R12." },
    ]);
  });

  it("splits paragraphs on blank lines", () => {
    expect(parseDescription("First paragraph.\n\nSecond paragraph.")).toEqual([
      { type: "paragraph", text: "First paragraph." },
      { type: "paragraph", text: "Second paragraph." },
    ]);
  });

  it("joins wrapped lines inside one paragraph", () => {
    expect(parseDescription("A sentence that\nwraps onto a second line.")).toEqual([
      { type: "paragraph", text: "A sentence that wraps onto a second line." },
    ]);
  });

  // The three ways people type bullets when pasting from WhatsApp, Word or email.
  it.each(["- ", "* ", "• "])("turns lines starting %p into a list", (marker) => {
    expect(parseDescription(`${marker}GL\n${marker}AP\n${marker}AR`)).toEqual([
      { type: "list", ordered: false, items: ["GL", "AP", "AR"] },
    ]);
  });

  it("turns numbered lines into an ordered list", () => {
    expect(parseDescription("1. Discovery\n2) Build\n3. Cutover")).toEqual([
      { type: "list", ordered: true, items: ["Discovery", "Build", "Cutover"] },
    ]);
  });

  it("handles a paragraph followed directly by a list", () => {
    expect(parseDescription("Skills needed:\n- Oracle EBS\n- SQL")).toEqual([
      { type: "paragraph", text: "Skills needed:" },
      { type: "list", ordered: false, items: ["Oracle EBS", "SQL"] },
    ]);
  });

  it("ignores stray whitespace and empty input", () => {
    expect(parseDescription("")).toEqual([]);
    expect(parseDescription("   \n\n  ")).toEqual([]);
    expect(parseDescription("  -  Trimmed item  ")).toEqual([
      { type: "list", ordered: false, items: ["Trimmed item"] },
    ]);
  });

  it("does not treat a hyphenated word or a year as a bullet", () => {
    expect(parseDescription("Self-starter wanted.\n2026 hiring plan.")).toEqual([
      { type: "paragraph", text: "Self-starter wanted. 2026 hiring plan." },
    ]);
  });
});
