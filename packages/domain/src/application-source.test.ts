import { describe, expect, it } from "vitest";
import { APPLICATION_SOURCES, normaliseSource } from "./application-source.js";

describe("normaliseSource", () => {
  it("reads the source the recruiter put in the link", () => {
    expect(normaliseSource("whatsapp")).toBe("WHATSAPP");
  });

  it("recognises Telegram links", () => {
    expect(normaliseSource("telegram")).toBe("TELEGRAM");
  });

  it.each(APPLICATION_SOURCES)("accepts %s", (source) => {
    expect(normaliseSource(source.toLowerCase())).toBe(source);
  });

  it("tolerates the casing and padding a pasted link picks up", () => {
    expect(normaliseSource("  LinkedIn  ")).toBe("LINKEDIN");
  });

  // ?source= is attacker-controlled on a public URL. Anything unrecognised is
  // attributed to OTHER rather than rejected: a mangled link must still let a
  // real candidate apply.
  it.each([
    undefined,
    null,
    "",
    "   ",
    "facebook",
    "WHATSAPP; DROP TABLE candidates",
    "<script>alert(1)</script>",
    "__proto__",
    "constructor",
  ])("attributes %p to OTHER", (raw) => {
    expect(normaliseSource(raw)).toBe("OTHER");
  });
});
