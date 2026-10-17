import { expect, test } from "vitest";
import { orderPublicListings } from "./public-listing-order";

test("public database sort keeps availability first, photos second and newest third", () => {
  const orders: [string, boolean][] = [];
  const query = { order(column: string, options: { ascending: boolean }) { orders.push([column, options.ascending]); return this; } };
  expect(orderPublicListings(query)).toBe(query);
  expect(orders).toEqual([["is_available", false], ["has_listing_photos", false], ["posted_at", false], ["id", false]]);
  const rows = [
    { id: "taken-empty", is_available: false, has_listing_photos: false, posted_at: "2026-10-17" },
    { id: "available-empty", is_available: true, has_listing_photos: false, posted_at: "2026-10-17" },
    { id: "taken-photo", is_available: false, has_listing_photos: true, posted_at: "2026-10-16" },
    { id: "available-old-photo", is_available: true, has_listing_photos: true, posted_at: "2026-10-15" },
    { id: "available-new-photo", is_available: true, has_listing_photos: true, posted_at: "2026-10-16" },
  ];
  rows.sort((a, b) => {
    for (const [key] of orders) {
      const av = a[key as keyof typeof a]; const bv = b[key as keyof typeof b];
      if (av !== bv) return av > bv ? -1 : 1;
    }
    return 0;
  });
  expect(rows.map((r) => r.id)).toEqual(["available-new-photo", "available-old-photo", "available-empty", "taken-photo", "taken-empty"]);
});