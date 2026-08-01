export const CONTACT_PHONE_E164 = "+256765597471";
export const CONTACT_PHONE_DIGITS = "256765597471";
export const CONTACT_PHONE_DISPLAY = "+256 765 597 471";
export const WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE_DIGITS}`;
export const TEL_URL = `tel:${CONTACT_PHONE_E164}`;

export const ROOM_TYPES = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "apartment", label: "Apartment" },
  { value: "business", label: "Business" },
] as const;

export type RoomTypeValue = (typeof ROOM_TYPES)[number]["value"] | "self_contained";

export const ROOM_TYPE_LABEL: Record<string, string> = {
  single: "Single Room",
  double: "Double Room",
  self_contained: "Self-Contained",
  apartment: "Apartment",
  business: "Business Room",
};

/** The six written-listing categories used by the generator. */
export const LISTING_CATEGORIES = [
  {
    key: "single_ordinary",
    tab: "Ordinary Single",
    title: "SINGLE ROOMS ORDINARY",
    match: (l: { room_type: string; is_self_contained: boolean }) =>
      l.room_type === "single" && !l.is_self_contained,
  },
  {
    key: "single_self",
    tab: "Self-Contained Single",
    title: "SINGLE ROOMS SELF-CONTAINED",
    match: (l: { room_type: string; is_self_contained: boolean }) =>
      l.room_type === "single" && l.is_self_contained,
  },
  {
    key: "double_ordinary",
    tab: "Ordinary Double",
    title: "DOUBLE ROOMS ORDINARY",
    match: (l: { room_type: string; is_self_contained: boolean }) =>
      l.room_type === "double" && !l.is_self_contained,
  },
  {
    key: "double_self",
    tab: "Self-Contained Double",
    title: "DOUBLE ROOMS SELF-CONTAINED",
    match: (l: { room_type: string; is_self_contained: boolean }) =>
      l.room_type === "double" && l.is_self_contained,
  },
  {
    key: "apartment",
    tab: "Apartments",
    title: "APARTMENTS",
    match: (l: { room_type: string; is_self_contained: boolean }) => l.room_type === "apartment",
  },
  {
    key: "business",
    tab: "Business Rooms",
    title: "BUSINESS ROOMS",
    match: (l: { room_type: string; is_self_contained: boolean }) => l.room_type === "business",
  },
] as const;

export type ListingCategoryKey = (typeof LISTING_CATEGORIES)[number]["key"];

export function roomCategoryLabel(l: { room_type: string; is_self_contained?: boolean }): string {
  const base = ROOM_TYPE_LABEL[l.room_type] ?? l.room_type;
  if (l.is_self_contained && (l.room_type === "single" || l.room_type === "double")) {
    return `Self-Contained ${base}`;
  }
  return base;
}


export const AMENITY_OPTIONS = [
  "water",
  "electricity",
  "wifi",
  "parking",
  "security",
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
  furnished: "Furnished",
  kitchen: "Kitchen",
  hot_shower: "Hot Shower",
};
