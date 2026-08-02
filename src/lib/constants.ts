export const CONTACT_PHONE_E164 = "+256765597471";
export const CONTACT_PHONE_DIGITS = "256765597471";
export const CONTACT_PHONE_DISPLAY = "+256 765 597 471";
export const WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE_DIGITS}`;
export const TEL_URL = `tel:${CONTACT_PHONE_E164}`;
export const SITE_URL = "https://safi-rooms-listings.lovable.app";
export const SITE_URL_SHORT = "safi-rooms-listings.lovable.app";

/** Raw database room types. */
export const ROOM_TYPES = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "apartment", label: "Apartment" },
  { value: "business", label: "Business" },
  { value: "shop", label: "Shop" },
] as const;

export type RoomTypeValue = (typeof ROOM_TYPES)[number]["value"] | "self_contained";

export const ROOM_TYPE_LABEL: Record<string, string> = {
  single: "Single Room",
  double: "Double Room",
  self_contained: "Self-Contained",
  apartment: "Apartment",
  business: "Business Room",
  shop: "Shop",
};

/**
 * The seven property types shown to admins and clients.
 * Self-contained is stored as a flag on single/double rooms, never as its own type.
 */
export const PROPERTY_TYPES = [
  {
    key: "single",
    label: "Single Room",
    chip: "Single Rooms",
    poster: "SINGLE ROOMS ORDINARY",
    room_type: "single",
    self: false as boolean | null,
  },
  {
    key: "single_self",
    label: "Single Self-contained",
    chip: "Single Self-contained",
    poster: "SINGLE ROOMS SELF-CONTAINED",
    room_type: "single",
    self: true as boolean | null,
  },
  {
    key: "double",
    label: "Double Room",
    chip: "Double Rooms",
    poster: "DOUBLE ROOMS ORDINARY",
    room_type: "double",
    self: false as boolean | null,
  },
  {
    key: "double_self",
    label: "Double Self-contained",
    chip: "Double Self-contained",
    poster: "DOUBLE ROOMS SELF-CONTAINED",
    room_type: "double",
    self: true as boolean | null,
  },
  {
    key: "apartment",
    label: "Apartment",
    chip: "Apartments",
    poster: "APARTMENTS",
    room_type: "apartment",
    self: null as boolean | null,
  },
  {
    key: "business",
    label: "Business Room",
    chip: "Business Rooms",
    poster: "BUSINESS ROOMS",
    room_type: "business",
    self: null as boolean | null,
  },
  {
    key: "shop",
    label: "Shop",
    chip: "Shops",
    poster: "SHOPS",
    room_type: "shop",
    self: null as boolean | null,
  },
] as const;

export type PropertyTypeKey = (typeof PROPERTY_TYPES)[number]["key"];

export function propertyType(key: string | undefined | null) {
  return PROPERTY_TYPES.find((p) => p.key === key);
}

/** Which of the seven property types a listing row belongs to. */
export function propertyTypeKeyOf(l: {
  room_type: string;
  is_self_contained?: boolean | null;
}): PropertyTypeKey {
  if (l.room_type === "single") return l.is_self_contained ? "single_self" : "single";
  if (l.room_type === "double") return l.is_self_contained ? "double_self" : "double";
  if (l.room_type === "apartment") return "apartment";
  if (l.room_type === "shop") return "shop";
  if (l.room_type === "business") return "business";
  // legacy self_contained rows
  return "single_self";
}

export function propertyTypeLabel(l: {
  room_type: string;
  is_self_contained?: boolean | null;
}): string {
  return propertyType(propertyTypeKeyOf(l))?.label ?? ROOM_TYPE_LABEL[l.room_type] ?? l.room_type;
}

export function matchesPropertyType(
  l: { room_type: string; is_self_contained?: boolean | null },
  key: string,
): boolean {
  return propertyTypeKeyOf(l) === key;
}

/** Backwards-compatible alias used by the poster generator. */
export const LISTING_CATEGORIES = PROPERTY_TYPES.map((p) => ({
  key: p.key,
  tab: p.chip,
  title: p.poster,
  match: (l: { room_type: string; is_self_contained?: boolean | null }) =>
    matchesPropertyType(l, p.key),
}));

export type ListingCategoryKey = PropertyTypeKey;

export function roomCategoryLabel(l: { room_type: string; is_self_contained?: boolean }): string {
  return propertyTypeLabel(l);
}

export const PRICE_BANDS = [
  { key: "u150", label: "Under 150k", min: undefined as number | undefined, max: 149_999 },
  { key: "150_200", label: "150k – 200k", min: 150_000, max: 200_000 },
  { key: "200_300", label: "200k – 300k", min: 200_001, max: 300_000 },
  { key: "a300", label: "Above 300k", min: 300_001, max: undefined as number | undefined },
] as const;

export type PriceBandKey = (typeof PRICE_BANDS)[number]["key"];

export const AMENITY_OPTIONS = [
  "water",
  "electricity",
  "wifi",
  "parking",
  "security",
  "fence",
  "furnished",
  "kitchen",
  "hot_shower",
] as const;

export const AMENITY_LABEL: Record<string, string> = {
  water: "Water",
  electricity: "Electricity",
  wifi: "Wi-Fi",
  parking: "Parking",
  security: "Security",
  fence: "Fence",
  furnished: "Furnished",
  kitchen: "Kitchen",
  hot_shower: "Hot Shower",
};
