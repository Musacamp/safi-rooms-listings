import { CONTACT_PHONE_DISPLAY, SITE_URL } from "./constants";

export type WhatsAppRoom = {
  id: string;
  location: string;
  rent_ugx: number;
  deposit_ugx: number | null;
  amenities: string[] | null;
  title?: string | null;
  description?: string | null;
  room_type?: string | null;
  is_self_contained?: boolean | null;
  distance_from_town?: string | null;
};

const clean = (value: string) => value.replace(/[\r\n*_~`]/g, " ").replace(/\s+/g, " ").trim();

export type RoomCategory =
  | "two_bedroom"
  | "double_self_contained"
  | "double_ordinary"
  | "single_self_contained"
  | "single_ordinary"
  | "other";

/** Category from title + description first, then room_type / is_self_contained. */
export function detectRoomCategory(
  listing: Pick<WhatsAppRoom, "title" | "description" | "room_type" | "is_self_contained">,
): RoomCategory {
  const text = [listing.title, listing.description].filter(Boolean).join(" ").toLowerCase();
  if (/\b(?:2|two)\s*-?\s*bedrooms?\b/.test(text)) return "two_bedroom";
  const selfContained = /self\s*-?\s*contained/.test(text) || listing.is_self_contained === true;
  if (/\bdouble\b/.test(text) || listing.room_type === "double") {
    return selfContained ? "double_self_contained" : "double_ordinary";
  }
  if (/\bsingle\b/.test(text) || listing.room_type === "single") {
    return selfContained ? "single_self_contained" : "single_ordinary";
  }
  return "other";
}

type FeatureLabel =
  | "inside kitchen"
  | "kitchen"
  | "bills inclusive"
  | "water bill inclusive"
  | "own meter"
  | "near town"
  | "fenced"
  | "own bathrooms"
  | "dining";

/** Detect every supported feature; shared-utility and negation guards suppress false claims. */
function detectFeatures(
  listing: Pick<WhatsAppRoom, "title" | "description" | "amenities" | "distance_from_town">,
): Set<FeatureLabel> {
  const text = [listing.title, listing.description].filter(Boolean).join("\n")
    .toLowerCase().replace(/[-–—]/g, " ").replace(/[^\S\n]+/g, " ").trim();
  const amenities = new Set((listing.amenities ?? []).map((value) => value.trim().toLowerCase()));
  const negated = (pattern: string) => new RegExp(`\\b(?:no|not)\\s+(?:\\w+\\s+){0,3}(?:${pattern})\\b`).test(text);
  const has = (pattern: string) => new RegExp(`\\b(?:${pattern})\\b`).test(text) && !negated(pattern);
  // Bound proximity to four intervening words and never cross a sentence or line.
  const shared = /\b(?:shared|sharing)\s+(?:\w+\s+){0,4}(?:water|power|yaka|bills?|meters?)\b|\b(?:water|power|yaka|bills?|meters?)\s+(?:\w+\s+){0,4}(?:shared|sharing)\b/.test(text);
  const features = new Set<FeatureLabel>();

  if (!negated("kitchen|inside kitchen|kitchen inside|own kitchen")) {
    if (has("inside kitchen|kitchen inside|own kitchen")) features.add("inside kitchen");
    else if (amenities.has("kitchen")) features.add("kitchen");
  }

  const bills = "bills? inclusive|all bills included|bills included|bills covered|water and power bills covered|power bills covered";
  const waterBills = "water bills? inclusive|water bills? (?:paid by landlord|included|covered)";
  // A water-only bill claim must not match the generic 'bill inclusive' substring.
  const generalBillText = text.replace(/\bwater bills? (?:inclusive|included|covered|paid by landlord)\b/g, "");
  if (!shared && !negated(bills) && new RegExp(`\\b(?:${bills})\\b`).test(generalBillText)) {
    features.add("bills inclusive");
  } else if (!shared && has(waterBills)) {
    features.add("water bill inclusive");
  }

  const ownMeter = "own yaka(?: meter)?|own meter|own water meter|own power meter|own water and (?:power|yaka) meters?|own (?:power|yaka) and water meters?";
  if (!shared && has(ownMeter)) features.add("own meter");

  const distance = (listing.distance_from_town ?? "").toLowerCase();
  const distanceMatch = distance.match(/(\d+(?:\.\d+)?)\s*k(?:m)?/);
  if (
    (distanceMatch != null && Number(distanceMatch[1]) <= 2) ||
    /near town|close to town|walking distance to town|\b[12]k(?:m)? to town\b/.test(text)
  ) {
    features.add("near town");
  }

  const fence = "fence|fenced|enclosed|compound wall";
  if (!negated(fence) && (amenities.has("fence") || has(fence))) features.add("fenced");

  if (
    /each (?:room|bedroom)\b[^.\n]*self\s*contained|both rooms self\s*contained|bedrooms self\s*contained|own bathrooms|ensuite/.test(text) &&
    !negated("bathrooms?|ensuite|self contained")
  ) {
    features.add("own bathrooms");
  }

  if (/\bdining\b/.test(text)) features.add("dining");

  return features;
}

/** First two matches win; a missing higher rank falls through to the next. */
const RANKING: Record<RoomCategory, FeatureLabel[]> = {
  single_ordinary: ["inside kitchen", "kitchen", "near town", "bills inclusive", "water bill inclusive", "own meter", "fenced"],
  single_self_contained: ["inside kitchen", "kitchen", "bills inclusive", "water bill inclusive", "own meter", "fenced", "near town"],
  double_ordinary: ["inside kitchen", "kitchen", "own meter", "bills inclusive", "water bill inclusive", "fenced", "near town"],
  double_self_contained: ["inside kitchen", "kitchen", "own meter", "bills inclusive", "water bill inclusive", "fenced", "near town"],
  two_bedroom: ["own bathrooms", "dining"],
  other: ["inside kitchen", "kitchen", "bills inclusive", "water bill inclusive", "own meter", "fenced", "near town"],
};

/** Up to 2 lowercase selling points for the WhatsApp line; never 'bathroom inside'. */
export function detectSellingPoints(
  listing: Pick<WhatsAppRoom, "title" | "description" | "amenities" | "room_type" | "is_self_contained" | "distance_from_town">,
): string[] {
  const category = detectRoomCategory(listing);
  const features = detectFeatures(listing);
  const picked: string[] = [];
  for (const label of RANKING[category]) {
    if (picked.length >= 2) break;
    if (!features.has(label)) continue;
    if (label === "kitchen" && picked.includes("inside kitchen")) continue;
    picked.push(label);
  }
  // 'not fenced' is only ever used for two-bedroom houses.
  if (category === "two_bedroom" && picked.length < 2 && !features.has("fenced")) {
    picked.push("not fenced");
  }
  return picked.slice(0, 2);
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
