import { describe, expect, it } from "vitest";
import { APPLICATION_STATUSES, canTransition } from "./application-status.js";

describe("canTransition", () => {
  it("lets a new Application move into screening", () => {
    expect(canTransition("NEW", "SCREENING")).toBe(true);
  });

  it.each([
    ["NEW", "SCREENING"],
    ["SCREENING", "SHORTLISTED"],
    ["SHORTLISTED", "INTERVIEW"],
    ["INTERVIEW", "SELECTED"],
    ["SELECTED", "OFFER"],
    ["OFFER", "JOINED"],
  ] as const)("advances %s to %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each(["NEW", "SCREENING", "SHORTLISTED", "INTERVIEW"] as const)(
    "rejects an Application still in play at %s",
    (from) => {
      expect(canTransition(from, "REJECTED")).toBe(true);
    },
  );

  // Recruiters correct their own mistakes. A candidate dragged to the wrong
  // column, or rejected in error, must be recoverable without an administrator
  // and without a history entry that misrepresents what happened.
  it.each([
    ["REJECTED", "SCREENING"],
    ["JOINED", "OFFER"],
    ["INTERVIEW", "SCREENING"],
    ["OFFER", "INTERVIEW"],
    ["ON_HOLD", "SELECTED"],
  ] as const)("allows %s back to %s to undo a mistake", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ["NEW", "SELECTED"],
    ["NEW", "JOINED"],
    ["SCREENING", "OFFER"],
  ] as const)("allows %s straight to %s without the stages between", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });
});

describe("canTransition invariants", () => {
  // The only rule left. A status change that changes nothing would write a
  // history row claiming something happened when nothing did.
  it.each(APPLICATION_STATUSES)("refuses %s as a transition to itself", (status) => {
    expect(canTransition(status, status)).toBe(false);
  });

  it("allows every other pair, in both directions", () => {
    for (const from of APPLICATION_STATUSES) {
      for (const to of APPLICATION_STATUSES) {
        expect(canTransition(from, to)).toBe(from !== to);
      }
    }
  });

  it("offers every stage but the current one as a destination", () => {
    const destinations = APPLICATION_STATUSES.filter((to) => canTransition("SHORTLISTED", to));
    expect(destinations).toHaveLength(APPLICATION_STATUSES.length - 1);
    expect(destinations).not.toContain("SHORTLISTED");
  });
});
