import { describe, it, expect } from "vitest";
import { buildMultiAreaText, buildPropertyText } from "./whatsapp-text";

const r = (o: any) => ({ id: Math.random().toString(), deposit_ugx: 0, amenities: [], ...o });

describe("multi-area and property text", () => {
  it("lists price, type and area per line, case/space-insensitive, and reports empty areas", () => {
    const text = buildMultiAreaText([
      r({ location: "Pamba", rent_ugx: 180000, room_type: "single", is_self_contained: true }),
      r({ location: "Kam Swahili", rent_ugx: 280000, room_type: "double", is_self_contained: true }),
    ], ["Pamba", "kamswahili", "Arapai"])[0];
    expect(text).toContain("Rooms available in Pamba, kamswahili and Arapai");
    expect(text).toContain("1. UGX 180,000 – Single self-contained, *PAMBA*");
    expect(text).toContain("2. UGX 280,000 – Double self-contained, *KAM SWAHILI*");
    expect(text).toContain("No rooms available in Arapai");
  });
  it("shows location only for plots", () => {
    const text = buildPropertyText([
      r({ title: "Plot 50x100", location: "Pamba", rent_ugx: 15000000, room_type: "shop" }),
      r({ title: "Samsung A14 phone", location: "Town", rent_ugx: 450000, room_type: "shop" }),
    ])[0];
    expect(text).toContain("1. Plot 50x100 – Pamba – UGX 15,000,000");
    expect(text).toContain("2. Samsung A14 phone – UGX 450,000");
  });
});
