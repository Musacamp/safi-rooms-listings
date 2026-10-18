import { CONTACT_PHONE_DISPLAY, SITE_URL } from "./constants";

export type WhatsAppRoom = {
  id: string;
  location: string;
  rent_ugx: number;
  deposit_ugx: number | null;
  amenities: string[] | null;
  title?: string | null;
  description?: string | null;
};

const clean = (value: string) => value.replace(/[\r\n*_~`]/g, " ").replace(/\s+/g, " ").trim();

/** Only fixed, explicitly supported claims can leave this helper. */
export function detectSellingPoints(listing: Pick<WhatsAppRoom, "title" | "description" | "amenities">): string[] {
  const text = [listing.title, listing.description].filter(Boolean).join("\n")
    .toLowerCase().replace(/[-–—]/g, " ").replace(/[^\S\n]+/g, " ").trim();
  const amenities = new Set((listing.amenities ?? []).map((value) => value.trim().toLowerCase()));
  const negated = (pattern: string) => new RegExp(`\\b(?:no|not)\\s+(?:\\w+\\s+){0,3}(?:${pattern})\\b`).test(text);
  const has = (pattern: string) => new RegExp(`\\b(?:${pattern})\\b`).test(text) && !negated(pattern);
  // Bound proximity to four intervening words and never cross a sentence or line.
  const shared = /\b(?:shared|sharing)\s+(?:\w+\s+){0,4}(?:water|power|yaka|bills?|meters?)\b|\b(?:water|power|yaka|bills?|meters?)\s+(?:\w+\s+){0,4}(?:shared|sharing)\b/.test(text);
  const points: string[] = [];
  const bills = "bills? inclusive|all bills included|bills included|bills covered|water and power bills covered|power bills covered";
  const waterBills = "water bills? inclusive|water bills? (?:paid by landlord|included|covered)";
  // A water-only bill claim must not match the generic 'bill inclusive' substring.
  const generalBillText = text.replace(/\bwater bills? (?:inclusive|included|covered|paid by landlord)\b/g, "");
  if (!shared && !negated(bills) && new RegExp(`\\b(?:${bills})\\b`).test(generalBillText)) {
    points.push("bills inclusive");
  } else if (!shared && has(waterBills)) {
    points.push("water bill inclusive");
  }
  const bathroom = "self contained|selfcontained|own bathroom|bathroom inside|inside bathroom|with bathroom|ensuite";
  if (has(bathroom) && !negated("bathroom|own bathroom|self contained|selfcontained|ensuite")) points.push("bathroom inside");
  const insideKitchen = "inside kitchen|kitchen inside|own kitchen";
  if (!negated("kitchen|inside kitchen|kitchen inside|own kitchen")) {
    if (has(insideKitchen)) points.push("inside kitchen");
    else if (amenities.has("kitchen")) points.push("kitchen");
  }
  const fence = "fence|fenced|enclosed|compound wall";
  if (!negated(fence) && (amenities.has("fence") || has(fence))) points.push("fenced");
  const ownMeter = "own yaka(?: meter)?|own meter|own water meter|own power meter|own water and (?:power|yaka) meters?|own (?:power|yaka) and water meters?";
  if (!shared && has(ownMeter)) {
    const both = has("own water and (?:power|yaka) meters?|own (?:power|yaka) and water meters?") ||
      (has("own water meter") && has("own (?:yaka|power)(?: meter)?"));
    points.push(both ? "own water and power meters" : "own meter");
  }
  return points.slice(0, 3);
}

export function buildWhatsAppText(rooms: WhatsAppRoom[], heading: string, date = new Date()): string[] {
  const dateLabel = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Kampala" });
  const blocks = rooms.map((room, index) => {
    const features = detectSellingPoints(room);
    return `${index + 1}. ${room.rent_ugx.toLocaleString("en-UG")}UGX  *${clean(room.location).toUpperCase()}*${features.length ? ` - ${features.join(", ")}` : ""}`;
  });
  const parts: string[][] = [];
  for (let offset = 0; offset < blocks.length; offset += 40) {
    parts.push(blocks.slice(offset, offset + 40));
  }
  return parts.map((part, index) => [
    `*SafiRooms · ${clean(heading)} · ${dateLabel}*`,
    ...(parts.length > 1 ? [`Part ${index + 1}/${parts.length}`] : []),
    "",
    part.join("\n"),
    "",
    `Book a viewing: WhatsApp ${CONTACT_PHONE_DISPLAY} · ${SITE_URL}`,
  ].join("\n"));
}

export function whatsappTextUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}