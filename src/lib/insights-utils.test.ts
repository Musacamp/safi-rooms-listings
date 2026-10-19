import { describe, expect, test } from "vitest";
import { averageDays, buildQuickInsights, normalizeLocation } from "./insights-utils";

describe("normalizeLocation", () => {
  test.each([
    ["  pamba ", "PAMBA"],
    ["Oderai   East", "ODERAI EAST"],
    ["\n arapai\t", "ARAPAI"],
    ["", ""],
    [null, ""],
    [undefined, ""],
  ])("normalizes %j to %s", (input, expected) => {
    expect(normalizeLocation(input)).toBe(expected);
  });
});

describe("averageDays", () => {
  test("averages whole days from posted to taken", () => {
    expect(
      averageDays([
        { postedAt: "2026-10-01T00:00:00Z", takenAt: "2026-10-08T00:00:00Z" },
        { postedAt: "2026-10-01T00:00:00Z", takenAt: "2026-10-15T00:00:00Z" },
      ]),
    ).toBe(10.5);
  });
  test("returns null when there is nothing to average", () => {
    expect(averageDays([])).toBeNull();
  });
  test("ignores invalid or negative pairs", () => {
    expect(
      averageDays([
        { postedAt: "not-a-date", takenAt: "2026-10-08T00:00:00Z" },
        { postedAt: "2026-10-10T00:00:00Z", takenAt: "2026-10-01T00:00:00Z" },
        { postedAt: "2026-10-01T00:00:00Z", takenAt: "2026-10-03T00:00:00Z" },
      ]),
    ).toBe(2);
  });
});

describe("buildQuickInsights", () => {
  const base = {
    summary: { vacantNow: 20, takenInRange: 8, avgDaysToTake: 6.4, pctTakenWithin7: 62.5 },
    vacantByArea: [{ area: "PAMBA", vacant: 15, avgRent: 80000, oldestDays: 40, rooms: [] }],
    fastestAreas: [{ area: "ARAPAI", avgDays: 6, medianDays: 5, taken: 4, estimated: true }],
    staleRooms: [{ area: "PAMBA", rooms: [{ id: "1", roomType: "single", rent: 70000, daysListed: 45, photo: null }] }],
    demandByArea: [{ area: "ODERAI", views: 30, whatsapp: 5, calls: 2, vacant: 2 }],
    byType: [{ category: "single_self_contained", vacant: 5, takenInRange: 3, avgDaysToTake: 6, avgRent: 120000 }],
  } as const;
  test("generates plain-language sentences from the data", () => {
    const sentences = buildQuickInsights(base as never);
    expect(sentences).toContain("PAMBA has 15 vacant rooms, the oldest listed 40 days ago.");
    expect(sentences).toContain("Rooms in ARAPAI are taken in about 6 days on average (estimated).");
    expect(sentences.some((s) => s.includes("most demand but few rooms: ODERAI"))).toBe(true);
    expect(sentences.some((s) => s.includes("over 30 days"))).toBe(true);
    expect(sentences.length).toBeGreaterThanOrEqual(4);
    expect(sentences.length).toBeLessThanOrEqual(6);
  });
  test("handles empty data without errors", () => {
    expect(
      buildQuickInsights({
        summary: { vacantNow: 0, takenInRange: 0, avgDaysToTake: null, pctTakenWithin7: null },
        vacantByArea: [],
        fastestAreas: [],
        staleRooms: [],
        demandByArea: [],
        byType: [],
      }),
    ).toEqual([]);
  });
});
