import { describe, expect, test } from "vitest";
import {
  MAX_LINES, expensiveRooms, median, priceGuide, roomsOfMonth, splitPost, takenFast, type PostData, type PostRoom,
} from "./insight-templates";

const ctx = { period: "OCTOBER 2026", now: new Date("2026-10-20T00:00:00Z") };
let n = 0;
const room = (p: Partial<PostRoom>): PostRoom => ({
  id: `r${n++}`, location: "pamba", rent_ugx: 100000, deposit_ugx: 0, amenities: [], title: "Single room",
  description: "", room_type: "single", is_self_contained: false, distance_from_town: null,
  posted_at: "2026-10-01T00:00:00Z", score: 0, ...p,
});
const data = (p: Partial<PostData>): PostData => ({
  searchCount: 0, searchAreas: [], viewAreas: [], taken: [], takenWeek: [], available: [], rentByArea: [], vacantNow: 0, ...p,
});

describe("roomsOfMonth", () => {
  test("picks highest-scoring available room per category", () => {
    const r = roomsOfMonth(data({ available: [
      room({ rent_ugx: 50000, score: 3, location: "oderai" }),
      room({ rent_ugx: 70000, score: 12, location: " arapai " }),
      room({ title: "Single self-contained", is_self_contained: true, rent_ugx: 90000, score: 1 }),
    ] }), ctx);
    expect(r.ok && r.parts[0]).toContain("1. *SINGLE ORDINARY*: 70,000UGX *ARAPAI*");
    expect(r.ok && r.parts[0]).toContain("2. *SINGLE SELF-CONTAINED*: 90,000UGX *PAMBA*");
    expect(r.ok && r.parts[0]).not.toContain("50,000UGX");
  });
  test("disabled with no available rooms", () => {
    expect(roomsOfMonth(data({}), ctx).ok).toBe(false);
  });
});

test("expensive rooms: top 5 by rent, descending", () => {
  const rents = [10, 90, 50, 70, 30, 80].map((k) => room({ rent_ugx: k * 1000 }));
  const r = expensiveRooms(data({ available: rents }), ctx);
  const text = r.ok ? r.parts[0] : "";
  expect(text.indexOf("90,000UGX")).toBeLessThan(text.indexOf("80,000UGX"));
  expect(text).toContain("5. SINGLE ROOM · 30,000UGX");
  expect(text).not.toContain("10,000UGX");
});

describe("rent price guide", () => {
  test("median of odd and even lists", () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 20, 30, 40])).toBe(25);
  });
  test("lowest, typical, highest per category with >=3 rooms", () => {
    const r = priceGuide(data({ available: [60000, 40000, 100000, 50000].map((x) => room({ rent_ugx: x })) }), ctx);
    expect(r.ok && r.parts[0]).toContain("*SINGLE ORDINARY* (4 rooms): lowest 40,000UGX, typical 55,000UGX, highest 100,000UGX");
  });
  test("categories under 3 rooms are skipped", () => {
    expect(priceGuide(data({ available: [room({}), room({})] }), ctx).ok).toBe(false);
  });
});

describe("taken fast", () => {
  const rows = [
    { area: "ARAPAI", estimated: false, taken: 3, avgDays: 6 },
    { area: "PAMBA", estimated: false, taken: 4, avgDays: 9 },
    { area: "ODERAI", estimated: false, taken: 5, avgDays: 3.4 },
  ];
  test("ranks areas by average days, excluding estimated rows", () => {
    const r = takenFast(data({ taken: [...rows, { area: "SENIOR", estimated: true, taken: 9, avgDays: 1 }] }), ctx);
    const text = r.ok ? r.parts[0] : "";
    expect(text).toContain("1. *ODERAI* - taken in about 3 days");
    expect(text).toContain("2. *ARAPAI* - taken in about 6 days");
    expect(text).not.toContain("SENIOR");
  });
  test("disabled when fewer than 3 areas qualify", () => {
    expect(takenFast(data({ taken: [rows[0], rows[1], { ...rows[2], estimated: true }] }), ctx).ok).toBe(false);
  });
});

test("splits into parts only beyond 40 lines", () => {
  expect(splitPost("*H*", Array(MAX_LINES).fill("x"), "tenants")).toHaveLength(1);
  const parts = splitPost("*H*", Array(MAX_LINES + 1).fill("x"), "tenants");
  expect(parts).toHaveLength(2);
  expect(parts[1]).toContain("Part 2/2");
  expect(parts[1]).toContain("Book a viewing: WhatsApp");
});
