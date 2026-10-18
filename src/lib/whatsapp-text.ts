import { CONTACT_PHONE_DISPLAY, SITE_URL } from "./constants";

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
  const blocks = rooms.map((room, index) =>
    `${index + 1}. ${room.rent_ugx.toLocaleString("en-UG")}UGX  *${clean(room.location).toUpperCase()}*`
  );
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