import { describe, expect, test } from "vitest";
import { buildWhatsAppText, whatsappTextUrl } from "./whatsapp-text";

const room = { id: "room-id", location: "Pamba", rent_ugx: 70000, deposit_ugx: 140000, amenities: ["water", "electricity"] };
const date = new Date("2026-10-17T04:16:00Z");

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