import { PROPERTY_TYPES, type PropertyTypeKey } from "@/lib/constants";

export type ParsedQuery = {
  locations: string[];
  min?: number;
  max?: number;
  type?: PropertyTypeKey;
  rest: string;
};

const TYPE_PATTERNS: { key: PropertyTypeKey; re: RegExp }[] = [
  { key: "single_self", re: /\bsingle[\s-]*(room[s]?)?[\s-]*self[\s-]?contained\b|\bself[\s-]?contained\s+single\b/i },
  { key: "double_self", re: /\bdouble[\s-]*(room[s]?)?[\s-]*self[\s-]?contained\b|\bself[\s-]?contained\s+double\b/i },
  { key: "shop", re: /\bshops?\b/i },
  { key: "business", re: /\bbusiness\s*(room[s]?)?\b/i },
  { key: "apartment", re: /\bapartments?\b|\bflats?\b/i },
  { key: "single", re: /\bsingle\s*(room[s]?)?\b/i },
  { key: "double", re: /\bdouble\s*(room[s]?)?\b/i },
];

const STOP_WORDS = new Set([
  "rooms",
  "room",
  "available",
  "availability",
  "in",
  "at",
  "the",
  "town",
  "with",
  "and",
  "for",
  "rent",
  "show",
  "me",
  "all",
  "please",
  "vacant",
  "self",
  "contained",
  "self-contained",
  "single",
  "double",
  "apartment",
  "apartments",
  "business",
  "shop",
  "shops",
  "flat",
  "flats",
  "ugx",
  "shillings",
]);

function parseMoney(raw: string): number | undefined {
  const s = raw.replace(/[,\s]/g, "").toLowerCase();
  const m = /^(?:ugx)?([0-9]+(?:\.[0-9]+)?)(k|m)?$/.exec(s);
  if (!m) return undefined;
  let n = parseFloat(m[1]);
  if (m[2] === "k") n *= 1_000;
  else if (m[2] === "m") n *= 1_000_000;
  return Math.round(n);
}

const MONEY = "(?:ugx\\s*)?[0-9][0-9,\\.]*\\s*[km]?";

/** Rule-based natural language search: locations, budget, property type. */
export function parseSearchQuery(input: string): ParsedQuery {
  let text = ` ${input.replace(/\s+/g, " ").trim()} `;
  const out: ParsedQuery = { locations: [], rest: "" };

  // between X and Y
  const between = new RegExp(`between\\s+(${MONEY})\\s+(?:and|to|-)\\s+(${MONEY})`, "i").exec(text);
  if (between) {
    const a = parseMoney(between[1]);
    const b = parseMoney(between[2]);
    if (a && b) {
      out.min = Math.min(a, b);
      out.max = Math.max(a, b);
    }
    text = text.replace(between[0], " ");
  }

  // below / under / max
  const below = new RegExp(`(?:below|under|less than|up to|max(?:imum)?|cheaper than)\\s+(${MONEY})`, "i").exec(text);
  if (below) {
    const v = parseMoney(below[1]);
    if (v) out.max = v;
    text = text.replace(below[0], " ");
  }

  // above / from / min
  const above = new RegExp(`(?:above|over|more than|from|min(?:imum)?|starting at)\\s+(${MONEY})`, "i").exec(text);
  if (above) {
    const v = parseMoney(above[1]);
    if (v) out.min = v;
    text = text.replace(above[0], " ");
  }

  // property type
  for (const t of TYPE_PATTERNS) {
    if (t.re.test(text)) {
      out.type = t.key;
      text = text.replace(t.re, " ");
      break;
    }
  }

  // locations: prefer explicit "in <places>" clause
  const inClause = /\b(?:in|at|around|near)\s+(.+)$/i.exec(text);
  const source = inClause ? inClause[1] : text;
  out.locations = splitLocations(source);
  if (inClause) text = text.replace(inClause[0], " ");

  out.rest = text
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w.toLowerCase()))
    .join(" ")
    .trim();

  return out;
}

/** "Pamba + Oderai", "Pamba, Oderai and Campswahili" -> ["Pamba","Oderai","Campswahili"] */
export function splitLocations(raw: string): string[] {
  return raw
    .split(/[,+/&]|\band\b|\bor\b/i)
    .map((s) => s.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 1 && !STOP_WORDS.has(s.toLowerCase()))
    .slice(0, 8);
}

/** Human title for a generated poster / results header. */
export function describeQuery(p: ParsedQuery): string {
  const typeLabel = p.type ? PROPERTY_TYPES.find((t) => t.key === p.type)?.label : undefined;
  const plural = typeLabel ? `${typeLabel}s` : "Rooms";
  const where = p.locations.length
    ? ` in ${p.locations.slice(0, 3).join(" & ")}${p.locations.length > 3 ? " +more" : ""}`
    : "";
  const money = (n: number) => `UGX ${n.toLocaleString("en-US")}`;

  if (p.min && p.max) return `💰 ${plural}${where} · ${money(p.min)} – ${money(p.max)}`;
  if (p.max) return `💰 ${plural}${where} Below ${money(p.max)}`;
  if (p.min) return `💰 ${plural}${where} Above ${money(p.min)}`;
  if (where) return `🏡 ${plural} Available${where}`;
  return `🏡 ${plural} Available`;
}
