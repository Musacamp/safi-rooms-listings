import { describe, expect, test } from "vitest";
import { buildWhatsAppText, detectSellingPoints, whatsappTextUrl } from "./whatsapp-text";

const room = { id: "room-id", location: "Pamba", rent_ugx: 70000, deposit_ugx: 140000, amenities: ["water", "electricity"] };
const date = new Date("2026-10-17T04:16:00Z");

describe("deterministic selling points", () => {
  test.each([
    ["Single Self-contained water bill inclusive", "Water bill paid by landlord on rent money", ["water", "electricity", "parking", "fence", "security"], ["water bill inclusive", "bathroom inside", "fenced"]],
    ["Classy double Self-contained", "Inside kitchen\nOwn yaka meter\nShared water bill", ["kitchen", "fence"], ["bathroom inside", "inside kitchen", "fenced"]],
    ["Single ordinary", "", ["water", "electricity"], []],
    ["Double Self-contained own bathroom", "Own yaka meter", ["kitchen", "fence"], ["bathroom inside", "kitchen", "fenced"]],
    ["Single Self-contained bills inclusive", "Water and power bills covered on rent", ["fence"], ["bills inclusive", "bathroom inside", "fenced"]],
  ])("detects the real listing: %s", (title, description, amenities, expected) => {
    expect(detectSellingPoints({ title: String(title), description: String(description), amenities: amenities as string[] })).toEqual(expected);
  });
  test("appends only fixed lowercase claims on the same numbered room line", () => {
    const [text] = buildWhatsAppText([{ ...room, location: "Oderai", description: "Fenced, with bathroom and own kitchen" }], "Rooms", date);
    expect(text?.split("\n").filter((line) => /^\d+\./.test(line))).toEqual([
      "1. 70,000UGX  *ODERAI* - bathroom inside, inside kitchen, fenced",
    ]);
  });
  test("omits the dash when no features are detected", () => {
    const [text] = buildWhatsAppText([{ ...room, title: "Single ordinary", description: "" }], "Rooms", date);
    expect(text?.split("\n").find((line) => /^1\./.test(line))).toBe("1. 70,000UGX  *PAMBA*");
  });
  test.each(["Power shared 15k per month", "Shared water bill", "Sharing power meter", "Water bill is shared"]) ("suppresses inclusive bills and own meters when utilities are shared: %s", (description) => {
    expect(detectSellingPoints({ title: "Bills inclusive own yaka meter", description, amenities: [] })).toEqual([]);
  });
  test.each([
    ["No fence", ["fence"]], ["Not fenced", ["fence"]], ["No own bathroom", []],
    ["Not self-contained", []], ["No inside kitchen", ["kitchen"]],
    ["Not bills inclusive", []], ["No water bill inclusive", []], ["No own meter", []],
  ])("rejects explicitly negated claims: %s", (description, amenities) => {
    expect(detectSellingPoints({ description, amenities })).toEqual([]);
  });
  test.each(["bill inclusive", "all bills included", "bills included", "bills covered", "power bills covered"]) ("detects general inclusive bills: %s", (description) => {
    expect(detectSellingPoints({ description, amenities: [] })).toEqual(["bills inclusive"]);
  });
  test.each(["self contained", "selfcontained", "own bathroom", "bathroom inside", "inside bathroom", "with bathroom", "ensuite"]) ("detects inside bathrooms: %s", (title) => {
    expect(detectSellingPoints({ title, amenities: [] })).toEqual(["bathroom inside"]);
  });
  test("normalizes case and whitespace and prioritizes inside over generic kitchen", () => {
    expect(detectSellingPoints({ description: "  KITCHEN   INSIDE  ", amenities: [" Kitchen "] })).toEqual(["inside kitchen"]);
  });
  test.each(["enclosed", "compound wall", "fence"]) ("detects fenced synonyms: %s", (description) => {
    expect(detectSellingPoints({ description, amenities: [] })).toEqual(["fenced"]);
  });
  test.each(["own yaka", "own meter", "own water meter", "own power meter"]) ("detects own meters: %s", (description) => {
    expect(detectSellingPoints({ description, amenities: [] })).toEqual(["own meter"]);
  });
  test.each(["Own water meter\nOwn yaka meter", "Own water and power meters"]) ("detects both owned meters: %s", (description) => {
    expect(detectSellingPoints({ description, amenities: [] })).toEqual(["own water and power meters"]);
  });
  test("limits features to three in priority order without duplicates", () => {
    expect(detectSellingPoints({ title: "Self-contained own bathroom bills inclusive", description: "Own kitchen fenced own meter", amenities: ["fence", "kitchen"] })).toEqual(["bills inclusive", "bathroom inside", "inside kitchen"]);
  });
  test("never copies arbitrary descriptions or private contacts into room lines", () => {
    const [text] = buildWhatsAppText([{ ...room, description: "Fenced landlord +256000123456 deposit 140000 https://private.example" }], "Rooms", date);
    expect(text?.split("\n").find((line) => /^1\./.test(line))).toBe("1. 70,000UGX  *PAMBA* - fenced");
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
  test("URL-encodes edited text for WhatsApp sharing", () => {
    const text = "*Pamba*\nUGX 70,000 & viewing?";
    expect(new URL(whatsappTextUrl(text)).searchParams.get("text")).toBe(text);
  });
});