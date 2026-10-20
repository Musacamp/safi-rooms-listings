import { CONTACT_PHONE_DISPLAY, SITE_URL, propertyTypeLabel } from "./constants";
import { normalizeLocation } from "./insights-utils";
import { detectRoomCategory, detectSellingPoints, type RoomCategory, type WhatsAppRoom } from "./whatsapp-text";

export type PostRoom = WhatsAppRoom & { room_type: string; posted_at: string; score: number };

export type PostData = {
  searchCount: number;
  searchAreas: { area: string; count: number }[];
  viewAreas: { area: string; views: number }[];
  taken: { area: string; estimated: boolean; taken: number; avgDays: number }[];
  takenWeek: { area: string; estimated: boolean; taken: number }[];
  available: PostRoom[];
  rentByArea: { area: string; listings: number; avgRent: number }[];
  vacantNow: number;
};

export type Audience = "tenants" | "landlords" | "both";
export type PostResult = { ok: true; parts: string[] } | { ok: false };
export type PostContext = { period: string; now: Date };

export const MAX_LINES = 40;
const CATEGORIES: { key: RoomCategory; label: string }[] = [
  { key: "single_ordinary", label: "SINGLE ORDINARY" },
  { key: "single_self_contained", label: "SINGLE SELF-CONTAINED" },
  { key: "double_ordinary", label: "DOUBLE ORDINARY" },
  { key: "double_self_contained", label: "DOUBLE SELF-CONTAINED" },
  { key: "two_bedroom", label: "TWO BEDROOM" },
];

export const ugx = (n: number) => `${Math.round(n).toLocaleString("en-US")}UGX`;
const area = (loc: string) => `*${normalizeLocation(loc).replace(/[*_~`]/g, "")}*`;
const points = (r: WhatsAppRoom) => {
  const f = detectSellingPoints(r);
  return f.length ? ` - ${f.join(", ")}` : "";
};
const roomLine = (r: PostRoom) => `${ugx(r.rent_ugx)} ${area(r.location)}${points(r)}`;
const number = (lines: string[]) => lines.map((l, i) => `${i + 1}. ${l}`);

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function closing(audience: Audience): string {
  const what = audience === "landlords" ? "List your room with us" : audience === "both" ? "Book a viewing or list your room" : "Book a viewing";
  return `${what}: WhatsApp ${CONTACT_PHONE_DISPLAY} · ${SITE_URL}`;
}

/** Heading + body lines + closing, split into parts of up to MAX_LINES body lines. */
export function splitPost(heading: string, lines: string[], audience: Audience): string[] {
  const chunks: string[][] = [];
  for (let i = 0; i < lines.length; i += MAX_LINES) chunks.push(lines.slice(i, i + MAX_LINES));
  if (chunks.length === 0) chunks.push([]);
  return chunks.map((chunk, i) => [
    heading,
    ...(chunks.length > 1 ? [`Part ${i + 1}/${chunks.length}`] : []),
    "",
    ...chunk,
    "",
    closing(audience),
  ].join("\n"));
}

const head = (emoji: string, title: string, ctx: PostContext) => `*${emoji} ${title} - ${ctx.period}*`;
const byCategory = (rooms: PostRoom[], key: RoomCategory) => rooms.filter((r) => detectRoomCategory(r) === key);

export function hotAreas(d: PostData, ctx: PostContext): PostResult {
  const useSearch = d.searchCount >= 30 && d.searchAreas.length > 0;
  const rows = useSearch
    ? d.searchAreas.slice(0, 5).map((a) => `${area(a.area)} - ${a.count} searches`)
    : d.viewAreas.slice(0, 5).map((a) => `${area(a.area)} - ${a.views} views`);
  if (!rows.length) return { ok: false };
  return { ok: true, parts: splitPost(head("🔥", useSearch ? "HOT AREAS" : "MOST VIEWED AREAS", ctx), number(rows), "tenants") };
}

export function fastAreas(d: PostData) {
  return d.taken.filter((t) => !t.estimated && t.taken >= 3).sort((a, b) => a.avgDays - b.avgDays).slice(0, 5);
}

export function takenFast(d: PostData, ctx: PostContext): PostResult {
  const rows = fastAreas(d);
  if (rows.length < 3) return { ok: false };
  const lines = rows.map((a) => `${area(a.area)} - taken in about ${Math.round(a.avgDays)} day${Math.round(a.avgDays) === 1 ? "" : "s"}`);
  return { ok: true, parts: splitPost(head("⚡", "ROOMS TAKEN FAST", ctx), number(lines), "both") };
}

export function roomsOfMonth(d: PostData, ctx: PostContext): PostResult {
  const lines: string[] = [];
  for (const c of CATEGORIES) {
    const best = byCategory(d.available, c.key).sort((a, b) => b.score - a.score || b.posted_at.localeCompare(a.posted_at))[0];
    if (best) lines.push(`*${c.label}*: ${roomLine(best)}`);
  }
  if (!lines.length) return { ok: false };
  return { ok: true, parts: splitPost(head("⭐", "ROOMS OF THE MONTH", ctx), number(lines), "tenants") };
}

export function expensiveRooms(d: PostData, ctx: PostContext): PostResult {
  const top = [...d.available].sort((a, b) => b.rent_ugx - a.rent_ugx).slice(0, 5);
  if (!top.length) return { ok: false };
  const lines = top.map((r) => `${propertyTypeLabel(r).toUpperCase()} · ${roomLine(r)}`);
  return { ok: true, parts: splitPost(head("💎", "MOST EXPENSIVE ROOMS", ctx), number(lines), "tenants") };
}

export function budgetPicks(d: PostData, ctx: PostContext): PostResult {
  const lines: string[] = [];
  for (const c of CATEGORIES) {
    for (const r of byCategory(d.available, c.key).sort((a, b) => a.rent_ugx - b.rent_ugx).slice(0, 3)) {
      lines.push(`*${c.label}*: ${roomLine(r)}`);
    }
  }
  if (!lines.length) return { ok: false };
  return { ok: true, parts: splitPost(head("💰", "BUDGET PICKS", ctx), number(lines), "tenants") };
}

export function availableNow(d: PostData, ctx: PostContext): PostResult {
  const map = new Map<string, { count: number; min: number }>();
  for (const r of d.available) {
    const k = normalizeLocation(r.location);
    if (!k) continue;
    const cur = map.get(k) ?? { count: 0, min: Infinity };
    map.set(k, { count: cur.count + 1, min: Math.min(cur.min, r.rent_ugx) });
  }
  const rows = [...map].sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0])).slice(0, 8);
  if (!rows.length) return { ok: false };
  const lines = rows.map(([k, v]) => `${area(k)} - ${v.count} room${v.count === 1 ? "" : "s"}, from ${ugx(v.min)}`);
  return { ok: true, parts: splitPost(head("📍", "WHERE ROOMS ARE AVAILABLE", ctx), number(lines), "tenants") };
}

export function newThisWeek(d: PostData, ctx: PostContext): PostResult {
  const since = ctx.now.getTime() - 7 * 86_400_000;
  const rooms = d.available.filter((r) => new Date(r.posted_at).getTime() >= since)
    .sort((a, b) => b.posted_at.localeCompare(a.posted_at));
  if (!rooms.length) return { ok: false };
  return { ok: true, parts: splitPost(`*🆕 NEW ROOMS - LAST 7 DAYS*`, number(rooms.map(roomLine)), "tenants") };
}

export function takenThisWeek(d: PostData): PostResult {
  const rows = d.takenWeek.filter((t) => !t.estimated);
  const total = rows.reduce((s, t) => s + t.taken, 0);
  if (total < 3) return { ok: false };
  const top = [...rows].sort((a, b) => b.taken - a.taken || a.area.localeCompare(b.area)).slice(0, 3);
  const lines = [`${total} rooms were taken in the last 7 days.`, "Top areas:", ...number(top.map((t) => `${area(t.area)} - ${t.taken} taken`))];
  return { ok: true, parts: splitPost(`*✅ TAKEN THIS WEEK - LAST 7 DAYS*`, lines, "both") };
}

export function priceGuide(d: PostData, ctx: PostContext): PostResult {
  const lines: string[] = [];
  for (const c of CATEGORIES) {
    const rents = byCategory(d.available, c.key).map((r) => r.rent_ugx);
    if (rents.length < 3) continue;
    lines.push(`*${c.label}* (${rents.length} rooms): lowest ${ugx(Math.min(...rents))}, typical ${ugx(median(rents))}, highest ${ugx(Math.max(...rents))}`);
  }
  if (!lines.length) return { ok: false };
  return { ok: true, parts: splitPost(head("📊", "RENT PRICE GUIDE", ctx), number(lines), "both") };
}

export function rentByArea(d: PostData, ctx: PostContext): PostResult {
  const rows = d.rentByArea.filter((a) => a.listings >= 3).sort((a, b) => b.avgRent - a.avgRent).slice(0, 8);
  if (!rows.length) return { ok: false };
  const lines = rows.map((a) => `${area(a.area)} - average ${ugx(a.avgRent)} (${a.listings} listings)`);
  return { ok: true, parts: splitPost(head("🏘️", "AVERAGE RENT BY AREA", ctx), number(lines), "landlords") };
}

export function landlordSummary(d: PostData, ctx: PostContext): PostResult {
  const lines: string[] = [];
  if (d.vacantNow > 0) lines.push(`Vacant rooms now: ${d.vacantNow}`);
  const taken = d.taken.filter((t) => !t.estimated).reduce((s, t) => s + t.taken, 0);
  if (taken > 0) lines.push(`Rooms taken: ${taken}`);
  const hot = d.searchCount >= 30 && d.searchAreas[0] ? d.searchAreas[0].area : d.viewAreas[0]?.area;
  if (hot) lines.push(`Hottest area: ${area(hot)}`);
  const fast = fastAreas(d)[0];
  if (fast) lines.push(`Fastest area: ${area(fast.area)} - taken in about ${Math.round(fast.avgDays)} days`);
  if (!lines.length) return { ok: false };
  lines.push("", "Have an empty room? Message us to list it.");
  return { ok: true, parts: splitPost(head("📈", "LANDLORD MARKET SUMMARY", ctx), lines, "landlords") };
}

export const POST_TEMPLATES: { id: string; title: string; audience: Audience; build: (d: PostData, ctx: PostContext) => PostResult }[] = [
  { id: "hot", title: "Hot areas (most searched)", audience: "tenants", build: hotAreas },
  { id: "fast", title: "Areas where rooms get taken fast", audience: "both", build: takenFast },
  { id: "month", title: "Rooms of the month by category", audience: "tenants", build: roomsOfMonth },
  { id: "expensive", title: "Most expensive rooms of the month", audience: "tenants", build: expensiveRooms },
  { id: "budget", title: "Budget picks of the month", audience: "tenants", build: budgetPicks },
  { id: "available", title: "Where rooms are available now", audience: "tenants", build: availableNow },
  { id: "new", title: "New rooms this week", audience: "tenants", build: newThisWeek },
  { id: "takenweek", title: "Taken this week", audience: "both", build: (d) => takenThisWeek(d) },
  { id: "guide", title: "Rent price guide", audience: "both", build: priceGuide },
  { id: "rentarea", title: "Average rent by area", audience: "landlords", build: rentByArea },
  { id: "summary", title: "Landlord market summary of the month", audience: "landlords", build: landlordSummary },
];

/** Period boundaries in Kampala time (UTC+3). */
export function periodRange(kind: "this_month" | "last_month" | "last_30", now = new Date()) {
  const KLA = 3 * 3_600_000;
  const local = new Date(now.getTime() + KLA);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const monthStart = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 1) - KLA);
  const label = (d: Date) => new Date(d.getTime() + KLA).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).toUpperCase();
  if (kind === "last_30") return { start: new Date(now.getTime() - 30 * 86_400_000), end: now, label: "LAST 30 DAYS" };
  if (kind === "last_month") {
    const start = monthStart(y, m - 1);
    return { start, end: monthStart(y, m), label: label(start) };
  }
  const start = monthStart(y, m);
  return { start, end: now, label: label(start) };
}
