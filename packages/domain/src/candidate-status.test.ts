import { describe, expect, it } from "vitest";
import { APPLICATION_STATUSES } from "./application-status.js";
import { candidateFacingStatus } from "./candidate-status.js";

describe("candidateFacingStatus", () => {
  it.each([
    ["NEW", "received"],
    ["SCREENING", "in_review"],
    ["ON_HOLD", "in_review"],
    ["SHORTLISTED", "shortlisted"],
    ["INTERVIEW", "interview"],
    ["SELECTED", "selected"],
    ["OFFER", "selected"],
    ["JOINED", "selected"],
    ["REJECTED", "closed"],
  ] as const)("shows %s as %s", (status, stage) => {
    expect(candidateFacingStatus(status).stage).toBe(stage);
  });

  // On hold is an internal pause. Telling a candidate "on hold" invites anxious
  // follow-ups about something they cannot influence, so it reads as in review.
  it("never reveals an internal on-hold", () => {
    expect(candidateFacingStatus("ON_HOLD").label).not.toMatch(/hold/i);
  });

  it("words a rejection respectfully rather than bluntly", () => {
    const { label } = candidateFacingStatus("REJECTED");
    expect(label).not.toMatch(/reject/i);
    expect(label.length).toBeGreaterThan(0);
  });

  it("gives every internal status a label and an explanation", () => {
    for (const status of APPLICATION_STATUSES) {
      const view = candidateFacingStatus(status);
      expect(view.label.trim()).not.toBe("");
      expect(view.detail.trim()).not.toBe("");
    }
  });

  it("marks only the three winning stages as a positive outcome", () => {
    const positive = APPLICATION_STATUSES.filter((s) => candidateFacingStatus(s).tone === "positive");
    expect(positive.sort()).toEqual(["JOINED", "OFFER", "SELECTED"]);
  });
});
