import { expect, test } from "vitest";
import { coverFirstPhotos, dailyCoverIndex, photoDay } from "./cover-photo";

test("covers advance daily and wrap without changing saved photos", () => {
  const photos = Object.freeze(["first", "second", "third"]);
  expect([0, 1, 2, 3].map(day => photos[dailyCoverIndex(photos, day)])).toEqual(["first", "second", "third", "first"]);
  expect(coverFirstPhotos(photos, 1)).toEqual(["second", "third", "first"]);
  expect(photos).toEqual(["first", "second", "third"]);
});
test("UTC date remains stable throughout the day regardless of visitor timezone", () => {
  const morning = photoDay(new Date("2026-11-01T00:00:00Z"));
  expect(photoDay(new Date("2026-11-01T23:59:59Z"))).toBe(morning);
  expect(photoDay(new Date("2026-11-01T03:00:00+03:00"))).toBe(morning);
  expect(photoDay(new Date("2026-11-02T00:00:00Z"))).toBe(morning + 1);
});
test("single photo never rotates and empty or null photos remain empty", () => {
  expect(dailyCoverIndex(["only"], 500)).toBe(0);
  expect(coverFirstPhotos(null, 0)).toEqual([]);
  expect(coverFirstPhotos([], 0)).toEqual([]);
});
import { pickedCoverIndex } from "./cover-photo";
test("rotation only uses hand-picked covers", () => {
  const photos = ["a", "toilet", "b", "c"];
  expect([0, 1, 2, 3].map((d) => photos[pickedCoverIndex(photos, ["a", "b", "c"], d)])).toEqual(["a", "b", "c", "a"]);
  expect([0, 1, 7].map((d) => pickedCoverIndex(photos, ["b"], d))).toEqual([2, 2, 2]);
  expect([0, 1, 5].map((d) => pickedCoverIndex(photos, [], d))).toEqual([0, 0, 0]);
  expect(pickedCoverIndex(photos, ["removed"], 3)).toBe(0);
});
