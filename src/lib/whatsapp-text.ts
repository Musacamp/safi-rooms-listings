import { AMENITY_LABEL, CONTACT_PHONE_DISPLAY, SITE_URL } from "./constants";
import { formatUGX } from "./format";

export type WhatsAppRoom = {
  id: string;
  location: string;
  rent_ugx: number;
  deposit_ugx: number | null;
  amenities: string[] | null;
};

const clean = (value: string) => value.replace(/[\r\n*_~`]/g, " ").replace(/\s+/g, " ").trim();

export function buildWhatsAppText(rooms: WhatsAppRoom[], heading: string, date = new Date()): string[] {
  const dateLabel = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Kampala" });
  const blocks = rooms.map((room, index) => [
    `${index + 1}. *${clean(room.location)}*`,
    `${formatUGX(room.rent_ugx)}/month`,
    ...(room.deposit_ugx && room.deposit_ugx > 0 ? [`Deposit: ${formatUGX(room.deposit_ugx)}`] : []),
    ...(room.amenities?.length ? [room.amenities.slice(0, 4).map((a) => clean(AMENITY_LABEL[a] ?? a)).join(" · ")] : []),
    `${SITE_URL}/listing/${encodeURIComponent(room.id)}`,
  ].join("\n"));
  const parts: string[][] = [];
  // Eight rooms per part; also split unusually long blocks sooner.
  for (const block of blocks) {
    const current = parts[parts.length - 1];
    if (!current || current.length >= 8 || current.join("\n\n").length + block.length > 6000) parts.push([block]);
    else current.push(block);
  }
  return parts.map((part, index) => [
    `*SafiRooms · ${clean(heading)}*`,
    dateLabel,
    ...(parts.length > 1 ? [`Part ${index + 1}/${parts.length}`] : []),
    "",
    part.join("\n\n"),
    "",
    `Book a viewing: WhatsApp ${CONTACT_PHONE_DISPLAY}`,
  ].join("\n"));
}

export function whatsappTextUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}