import { describe, expect, it } from "vitest";
import { usesSharedLimit } from "./throttle-policy.js";

describe("usesSharedLimit", () => {
  // Apply, login and status are open to anyone, so per-IP limits are their
  // protection against abuse.
  it("limits public routes", () => {
    expect(usesSharedLimit({ isPublic: true, hasOwnLimit: false })).toBe(true);
    expect(usesSharedLimit({ isPublic: true, hasOwnLimit: true })).toBe(true);
  });

  // Staff pages are rendered by the website's server, so every signed-in user
  // arrives from that one address. A shared per-IP budget there throttles the
  // whole team at once, while the session check already guards the route.
  it("does not limit signed-in routes by IP", () => {
    expect(usesSharedLimit({ isPublic: false, hasOwnLimit: false })).toBe(false);
  });

  it("still limits a signed-in route that sets its own limit", () => {
    expect(usesSharedLimit({ isPublic: false, hasOwnLimit: true })).toBe(true);
  });
});
