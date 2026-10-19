import { describe, expect, test } from "vitest";
import { buildWhatsAppText, detectRoomCategory, detectSellingPoints, whatsappTextUrl } from "./whatsapp-text";

const room = { id: "room-id", location: "Pamba", rent_ugx: 70000, deposit_ugx: 140000, amenities: ["water", "electricity"] };
const date = new Date("2026-10-17T04:16:00Z");

describe("room categories", () => {
  test.each([
    [{ title: "2 bedroom house" }, "two_bedroom"],
    [{ title: "Two-Bedrooms in Pamba" }, "two_bedroom"],
    [{ title: "2bedroom apartment" }, "two_bedroom"],
    [{ title: "Double self-contained" }, "double_self_contained"],
    [{ title: "Double room" }, "double_ordinary"],
    [{ title: "Single self contained" }, "single_self_contained"],
    [{ title: "Single ordinary" }, "single_ordinary"],
    [{ title: "Shop in town" }, "other"],
    [{ room_type: "double", is_self_contained: true }, "double_self_contained"],
    [{ room_type: "single", is_self_contained: false }, "single_ordinary"],
    [{ room_type: "apartment" }, "other"],
  ])("categorizes %o as %s", (listing, expected) => {
    expect(detectRoomCategory(listing as never)).toBe(expected);
  });
});

describe("category-ranked selling points (max 2)", () => {
  test("two_bedroom with no features and no fence gets 'not fenced'", () => {
    expect(detectSellingPoints({ title: "2 bedroom house", description: "", amenities: [] })).toEqual(["not fenced"]);
  });
  test("two_bedroom with own bathrooms and dining ranks them first", () => {
    expect(detectSellingPoints({
      title: "Two bedroom house",
      description: "Each room self-contained, spacious dining room, fenced",
      amenities: ["fence"],
    })).toEqual(["own bathrooms", "dining"]);
  });
  test("two_bedroom with only dining and no fence adds 'not fenced'", () => {
    expect(detectSellingPoints({ title: "2 bedrooms", description: "Dining room", amenities: [] })).toEqual(["dining", "not fenced"]);
  });
  test("single_ordinary with kitchen amenity and '2k to town' gives 'kitchen, near town'", () => {
    expect(detectSellingPoints({
      title: "Single ordinary",
      description: "",
      amenities: ["kitchen"],
      distance_from_town: "2k to town",
    })).toEqual(["kitchen", "near town"]);
  });
  test("single_self_contained ranks bills inclusive before fenced", () => {
    expect(detectSellingPoints({
      title: "Single self-contained",
      description: "Bills inclusive",
      amenities: ["fence"],
      room_type: "single",
      is_self_contained: true,
    })).toEqual(["bills inclusive", "fenced"]);
  });
  test("double_ordinary ranks kitchen before own meter", () => {
    expect(detectSellingPoints({
      title: "Double room",
      description: "Own yaka meter",
      amenities: ["kitchen", "fence"],
    })).toEqual(["kitchen", "own meter"]);
  });
  test("double_self_contained with inside kitchen + own yaka + bills gives 'inside kitchen, own meter'", () => {
    expect(detectSellingPoints({
      title: "Double self-contained",
      description: "Inside kitchen, own yaka meter, bills inclusive",
      amenities: [],
    })).toEqual(["inside kitchen", "own meter"]);
  });
  test("other category ranks inside kitchen then bills inclusive", () => {
    expect(detectSellingPoints({
      title: "Shop space",
      description: "Own kitchen, bills inclusive, fenced",
      amenities: ["fence"],
    })).toEqual(["inside kitchen", "bills inclusive"]);
  });
  test("never outputs more than 2 features", () => {
    const points = detectSellingPoints({
      title: "Single self-contained",
      description: "Inside kitchen, bills inclusive, own yaka meter, fenced, near town",
      amenities: ["fence"],
    });
    expect(points.length).toBeLessThanOrEqual(2);
    expect(new Set(points).size).toBe(points.length);
  });
  test("never outputs 'bathroom inside' for any category", () => {
    expect(detectSellingPoints({ title: "Self-contained own bathroom ensuite", description: "With bathroom", amenities: [] })).not.toContain("bathroom inside");
  });
});

describe("selling point guards", () => {
  test.each(["Power shared 15k per month", "Shared water bill", "Sharing power meter", "Water bill is shared"])("suppresses inclusive bills and own meters when utilities are shared: %s", (description) => {
    expect(detectSellingPoints({ title: "Bills inclusive own yaka meter", description, amenities: [] })).toEqual([]);
  });
  test.each([
    ["No fence", ["fence"]], ["Not fenced", ["fence"]],
    ["No inside kitchen", ["kitchen"]],
    ["Not bills inclusive", []], ["No water bill inclusive", []], ["No own meter", []],
  ])("rejects explicitly negated claims: %s", (description, amenities) => {
    expect(detectSellingPoints({ description, amenities })).toEqual([]);
  });
  test.each(["bill inclusive", "all bills included", "bills included", "bills covered", "power bills covered"])("detects general inclusive bills: %s", (description) => {
    expect(detectSellingPoints({ description, amenities: [] })).toEqual(["bills inclusive"]);
  });
  test("water-only bill coverage shows 'water bill inclusive'", () => {
    expect(detectSellingPoints({ title: "Single", description: "Water bill paid by landlord on rent money", amenities: [] })).toEqual(["water bill inclusive"]);
  });
  test("normalizes case and whitespace and prioritizes inside over generic kitchen", () => {
    expect(detectSellingPoints({ description: "  KITCHEN   INSIDE  ", amenities: [" Kitchen "] })).toEqual(["inside kitchen"]);
  });
  test.each(["enclosed", "compound wall", "fence"])("detects fenced synonyms: %s", (description) => {
    expect(detectSellingPoints({ description, amenities: [] })).toEqual(["fenced"]);
  });
  test.each(["own yaka", "own meter", "own water meter", "own power meter", "Own water and power meters"])("detects own meters: %s", (description) => {
    expect(detectSellingPoints({ description, amenities: [] })).toEqual(["own meter"]);
  });
  test.each(["near town", "close to town", "walking distance to town", "1k to town", "2k to town"])("detects near town from text: %s", (description) => {
    expect(detectSellingPoints({ title: "Single ordinary", description, amenities: [] })).toEqual(["near town"]);
  });
  test("detects near town from a filled distance of 2k or less only", () => {
    expect(detectSellingPoints({ title: "Single ordinary", amenities: [], distance_from_town: "1.5km" })).toEqual(["near town"]);
    expect(detectSellingPoints({ title: "Single ordinary", amenities: [], distance_from_town: "4km" })).toEqual([]);
  });
});

describe("WhatsApp room text", () => {
  test("formats numbered rooms as priceUGX, two spaces and bold uppercase location on one line", () => {
    const rooms = [
      { ...room, location: "Oderai" },
      { ...room, rent_ugx: 90000 },
      { ...room, location: "Arapai", rent_ugx: 120000 },
    ];
    const [text] = buildWhatsAppText(rooms, "Single rooms", date);
    expect(text?.split("\n").filter((line) => /^\d+\./.test(line))).toEqual([
      "1. 70,000UGX  *ODERAI*",
      "2. 90,000UGX  *PAMBA*",
      "3. 120,000UGX  *ARAPAI*",
    ]);
  });
  test("appends up to 2 lowercase features after a dash on the same line", () => {
    const [text] = buildWhatsAppText(
      [{ ...room, location: "Oderai", title: "Single ordinary", description: "Fenced, own kitchen", amenities: [] }],
      "Rooms",
      date,
    );
    expect(text?.split("\n").filter((line) => /^\d+\./.test(line))).toEqual([
      "1. 70,000UGX  *ODERAI* - inside kitchen, fenced",
    ]);
  });
  test("omits the dash when no features are detected", () => {
    const [text] = buildWhatsAppText([{ ...room, title: "Single ordinary", description: "" }], "Rooms", date);
    expect(text?.split("\n").find((line) => /^1\./.test(line))).toBe("1. 70,000UGX  *PAMBA*");
  });
  test("excludes deposit, amenities and individual room links even when present", () => {
    const [text] = buildWhatsAppText([room], "Single rooms", date);
    expect(text).not.toContain("140,000");
    expect(text).not.toMatch(/water|electricity|\/listing\//i);
  });
  test("keeps 40 rooms in a single message", () => {
    const parts = buildWhatsAppText(Array.from({ length: 40 }, () => room), "Rooms", date);
    expect(parts).toHaveLength(1);
    expect(parts[0]?.match(/^\d+\./gm)).toHaveLength(40);
    expect(parts[0]).not.toContain("Part ");
  });
  test("splits 41 rooms into labeled 40/1 parts with continuous numbering", () => {
    const parts = buildWhatsAppText(Array.from({ length: 41 }, () => room), "Rooms", date);
    expect(parts).toHaveLength(2);
    expect(parts[0]).toContain("Part 1/2");
    expect(parts[0]?.match(/^\d+\./gm)).toHaveLength(40);
    expect(parts[1]).toContain("Part 2/2");
    expect(parts[1]).toContain("41. 70,000UGX  *PAMBA*");
  });
  test("keeps untrusted multiline locations on one room line", () => {
    const [text] = buildWhatsAppText([{ ...room, location: "*Pamba*\nEast" }], "Rooms", date);
    expect(text).toContain("1. 70,000UGX  *PAMBA EAST*");
  });
  test("uses only the SafiRooms booking number and excludes private phone fields", () => {
    const input = { ...room, landlord_phone: "+256000123456", phone: "+256000999999" };
    const [text] = buildWhatsAppText([input], "Rooms", date);
    expect(text).toContain("Book a viewing: WhatsApp +256 765 597 471");
    expect(text?.split("\n").at(-1)).toBe("Book a viewing: WhatsApp +256 765 597 471 · https://safi-rooms-listings.lovable.app");
    expect(text).not.toContain(input.landlord_phone);
    expect(text).not.toContain(input.phone);
  });
  test("never copies arbitrary descriptions or private contacts into room lines", () => {
    const [text] = buildWhatsAppText([{ ...room, title: "Single", description: "Fenced landlord +256000123456 deposit 140000 https://private.example" }], "Rooms", date);
    expect(text?.split("\n").find((line) => /^1\./.test(line))).toBe("1. 70,000UGX  *PAMBA* - fenced");
  });
  test("URL-encodes edited text for WhatsApp sharing", () => {
    const text = "*Pamba*\nUGX 70,000 & viewing?";
    expect(new URL(whatsappTextUrl(text)).searchParams.get("text")).toBe(text);
  });
});
