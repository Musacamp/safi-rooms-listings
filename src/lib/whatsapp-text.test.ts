import { describe, expect, test } from "vitest";
import { buildWhatsAppText, whatsappTextUrl } from "./whatsapp-text";

const room = { id: "room-id", location: "Pamba", rent_ugx: 70000, deposit_ugx: 140000, amenities: ["water", "electricity"] };
const date = new Date("2026-10-17T04:16:00Z");

describe("WhatsApp room text", () => {
  test("includes the room location, rent, nonzero deposit, amenities and exact ID link", () => {
    const [text] = buildWhatsAppText([room], "Single rooms", date);
    expect(text).toContain("1. *Pamba*\nUGX 70,000/month\nDeposit: UGX 140,000\nWater · Electricity\nhttps://safi-rooms-listings.lovable.app/listing/room-id");
  });
  test("omits a zero deposit", () => {
    expect(buildWhatsAppText([{ ...room, deposit_ugx: 0 }], "Rooms", date)[0]).not.toContain("Deposit:");
  });
  test("splits 17 rooms into eight-room parts labeled 1/3, 2/3, 3/3", () => {
    const parts = buildWhatsAppText(Array.from({ length: 17 }, (_, i) => ({ ...room, id: `room-${i}` })), "Rooms", date);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toContain("Part 1/3");
    expect(parts[0]?.match(/\d+\. \*Pamba\*/g)).toHaveLength(8);
    expect(parts[1]).toContain("Part 2/3");
    expect(parts[1]?.match(/\d+\. \*Pamba\*/g)).toHaveLength(8);
    expect(parts[2]).toContain("Part 3/3");
    expect(parts[2]).toContain("17. *Pamba*");
  });
  test("uses only the SafiRooms booking number and excludes private phone fields", () => {
    const input = { ...room, landlord_phone: "+256000123456", phone: "+256000999999" };
    const [text] = buildWhatsAppText([input], "Rooms", date);
    expect(text).toContain("Book a viewing: WhatsApp +256 765 597 471");
    expect(text).not.toContain(input.landlord_phone);
    expect(text).not.toContain(input.phone);
  });
  test("URL-encodes edited text for WhatsApp sharing", () => {
    const text = "*Pamba*\nUGX 70,000 & viewing?";
    expect(new URL(whatsappTextUrl(text)).searchParams.get("text")).toBe(text);
  });
});