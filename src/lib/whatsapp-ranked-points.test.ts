import { expect, test } from "vitest";
import { detectSellingPoints } from "./whatsapp-text";

test.each(["Single self-contained", "Double self-contained"])("%s ranks inside kitchen then included bills", title => {
  expect(detectSellingPoints({ title, description: "Kitchen inside, water and electricity bills included in rent, own yaka meter and own water meter, fenced compound" })).toEqual(["kitchen inside", "bills included"]);
});
test("self-contained falls through to both meters and fencing", () => {
  expect(detectSellingPoints({ room_type: "single", is_self_contained: true, description: "Own yaka meter and own water meter", amenities: ["fence"] })).toEqual(["own yaka and water meters", "fenced compound"]);
});
test("apartment ranks two washrooms then few neighbors then gate", () => {
  expect(detectSellingPoints({ room_type: "apartment", description: "Gate, few neighbours, two washrooms" })).toEqual(["two washrooms", "few neighbors"]);
  expect(detectSellingPoints({ title: "2 bedroom apartment", amenities: ["gate"] })).toEqual(["gate"]);
});
test.each(["Single ordinary", "Double ordinary"])("%s ranks beds, kitchen, outside washrooms, fence, meters", title => {
  expect(detectSellingPoints({ title, description: "Beds included in rent, own washrooms outside, fenced, own water and yaka meters", amenities: ["kitchen"] })).toEqual(["beds included", "kitchen"]);
  expect(detectSellingPoints({ title, description: "Own washrooms outside, fenced, own water and yaka meters" })).toEqual(["own washrooms outside", "fenced compound"]);
});
test("no ranked points produces no invented fallback", () => {
  expect(detectSellingPoints({ title: "Single ordinary", description: "Near town", amenities: ["water", "electricity"] })).toEqual([]);
  expect(detectSellingPoints({ title: "Apartment", description: "Dining room, ensuite" })).toEqual([]);
});
test.each(["Own yaka meter", "Own water meter", "Water bills included", "Power bills covered"])("does not claim BOTH utilities from %s", description => {
  expect(detectSellingPoints({ title: "Single self-contained", description })).toEqual([]);
});
test.each(["No fence", "Not fenced", "Without fence"])("negated fence overrides amenity: %s", description => {
  expect(detectSellingPoints({ title: "Single ordinary", description, amenities: ["fence"] })).toEqual([]);
});
test("shared utilities suppress meter and inclusive-bill claims", () => {
  expect(detectSellingPoints({ title: "Self-contained", description: "All bills included, own water and yaka meters, shared water meter" })).toEqual([]);
});
test("generic kitchen is not evidence of inside kitchen for self-contained", () => {
  expect(detectSellingPoints({ title: "Single self-contained", amenities: ["kitchen", "fence"] })).toEqual(["fenced compound"]);
});
test("one existing point is included, never padded to two", () => {
  expect(detectSellingPoints({ title: "Single ordinary", amenities: ["kitchen"] })).toEqual(["kitchen"]);
});