import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip.js";

describe("clientIp", () => {
  it("uses Vercel's own client header when present", () => {
    expect(clientIp({ "x-vercel-forwarded-for": "49.36.10.5" }, "10.0.0.1")).toBe("49.36.10.5");
  });

  it("takes the first address of x-forwarded-for, which is the original client", () => {
    expect(clientIp({ "x-forwarded-for": "49.36.10.5, 76.76.21.9, 10.0.0.1" }, "10.0.0.1")).toBe("49.36.10.5");
  });

  it("prefers Vercel's header over x-forwarded-for", () => {
    expect(
      clientIp({ "x-vercel-forwarded-for": "49.36.10.5", "x-forwarded-for": "1.1.1.1" }, "10.0.0.1"),
    ).toBe("49.36.10.5");
  });

  it("handles a header delivered as an array", () => {
    expect(clientIp({ "x-forwarded-for": ["49.36.10.5, 10.0.0.1"] }, "10.0.0.1")).toBe("49.36.10.5");
  });

  it("falls back to the socket address when no proxy header exists (local dev)", () => {
    expect(clientIp({}, "127.0.0.1")).toBe("127.0.0.1");
  });

  it.each(["", "   ", ",", " , 10.0.0.1"])("ignores a blank leading entry %p", (value) => {
    expect(clientIp({ "x-forwarded-for": value }, "127.0.0.1")).toBe("127.0.0.1");
  });
});
