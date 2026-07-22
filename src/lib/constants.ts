export const CONTACT_PHONE_E164 = "+256765597471";
export const CONTACT_PHONE_DIGITS = "256765597471";
export const CONTACT_PHONE_DISPLAY = "+256 765 597 471";
export const WHATSAPP_URL = `https://wa.me/${CONTACT_PHONE_DIGITS}`;
export const TEL_URL = `tel:${CONTACT_PHONE_E164}`;

export const ROOM_TYPES = [
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "self_contained", label: "Self-Contained" },
  { value: "apartment", label: "Apartment" },
  { value: "business", label: "Business" },
] as const;

export type RoomTypeValue = (typeof ROOM_TYPES)[number]["value"];

export const ROOM_TYPE_LABEL: Record<RoomTypeValue, string> = {
  single: "Single Room",
  double: "Double Room",
  self_contained: "Self-Contained",
  apartment: "Apartment",
  business: "Business Room",
};

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
