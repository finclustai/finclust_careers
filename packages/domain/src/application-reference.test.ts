import { describe, expect, it } from "vitest";
import { buildApplicationReference } from "./application-reference.js";

describe("buildApplicationReference", () => {
  // Format taken verbatim from requirement section 14's success screen.
  it("matches the format the requirement document shows a candidate", () => {
    expect(buildApplicationReference("EBS-FIN-001", 125)).toBe("FIN-EBS-FIN-001-000125");
  });

  it("pads the counter so references sort and align in a column", () => {
    expect(buildApplicationReference("EBS-FIN-001", 1)).toBe("FIN-EBS-FIN-001-000001");
    expect(buildApplicationReference("EPM-002", 999999)).toBe("FIN-EPM-002-999999");
  });

  it("keeps growing past the padding width rather than truncating", () => {
    expect(buildApplicationReference("EBS-FIN-001", 1_000_000)).toBe("FIN-EBS-FIN-001-1000000");
  });
});
