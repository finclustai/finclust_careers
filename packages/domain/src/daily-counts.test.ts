import { describe, expect, it } from "vitest";
import { dailyCounts } from "./daily-counts.js";

// 14 Sep 2026, 10:00 in India.
const NOW = new Date("2026-09-14T04:30:00Z");

describe("dailyCounts", () => {
  it("returns one bucket per day, oldest first, ending today", () => {
    const days = dailyCounts([], 3, NOW);
    expect(days.map((d) => d.date)).toEqual(["2026-09-12", "2026-09-13", "2026-09-14"]);
    expect(days.every((d) => d.count === 0)).toBe(true);
  });

  it("buckets by the India calendar day, not UTC", () => {
    // 20:00 UTC on the 13th is 01:30 on the 14th in India.
    const days = dailyCounts([new Date("2026-09-13T20:00:00Z")], 2, NOW);
    expect(days).toEqual([
      { date: "2026-09-13", count: 0 },
      { date: "2026-09-14", count: 1 },
    ]);
  });

  it("counts several on the same day and ignores dates outside the window", () => {
    const days = dailyCounts(
      [
        new Date("2026-09-14T01:00:00Z"),
        new Date("2026-09-14T03:00:00Z"),
        new Date("2026-09-01T03:00:00Z"),
      ],
      2,
      NOW,
    );
    expect(days).toEqual([
      { date: "2026-09-13", count: 0 },
      { date: "2026-09-14", count: 2 },
    ]);
  });
});
