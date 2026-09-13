import { describe, expect, it } from "vitest";
import { normalisePhone } from "./phone.js";

describe("normalisePhone", () => {
  it("keeps an already-normalised Indian mobile", () => {
    expect(normalisePhone("+919876543210")).toBe("+919876543210");
  });

  // A Candidate is identified by phone. Every spelling below is one person, and
  // all of them get typed into a form on a phone keypad.
  it.each([
    ["+919876543210", "already normalised"],
    ["9876543210", "bare ten digits"],
    ["09876543210", "leading trunk zero"],
    ["919876543210", "country code, no plus"],
    ["+91 98765 43210", "spaces as written on a CV"],
    ["+91-98765-43210", "hyphenated"],
    ["(+91) 98765 43210", "parenthesised"],
    ["0091 9876543210", "00 international prefix"],
    ["  +919876543210  ", "pasted with whitespace"],
  ])("resolves %s (%s) to one Candidate", (input) => {
    expect(normalisePhone(input)).toBe("+919876543210");
  });

  it("keeps a genuine non-Indian number instead of forcing +91", () => {
    expect(normalisePhone("+971 50 123 4567")).toBe("+971501234567");
    expect(normalisePhone("+1 415 555 0123")).toBe("+14155550123");
  });

  it.each([
    "",
    "   ",
    "12345",
    "98765abcde",
    "5876543210",
    "+91987654321",
    "+9198765432101234",
    "++919876543210",
  ])("refuses %p rather than creating a junk Candidate", (input) => {
    expect(normalisePhone(input)).toBeNull();
  });
});
