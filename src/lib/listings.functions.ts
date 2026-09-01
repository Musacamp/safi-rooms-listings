import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

const BUCKET = "listing-photos";

function isNewKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

function makePublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (isNewKey(key) && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// Resolve photo entries: pass through absolute URLs, sign storage paths.
async function resolvePhotos(
  supabase: ReturnType<typeof makePublicClient>,
  photos: string[],
): Promise<string[]> {
  const out: string[] = [];
  const toSign: string[] = [];
  const indices: number[] = [];
  photos.forEach((p, i) => {
    if (!p) return;
    if (/^https?:\/\//.test(p)) {
      out[i] = p;
    } else {
      toSign.push(p);
      indices.push(i);
      out[i] = "";
    }
  });
  if (toSign.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(toSign, 60 * 60 * 24 * 7);
    data?.forEach((d, k) => {
      if (d.signedUrl) out[indices[k]] = d.signedUrl;
    });
  }
  return out.filter(Boolean);
}

async function resolveListing(
  supabase: ReturnType<typeof makePublicClient>,
  row: Listing,
): Promise<Listing> {
  return { ...row, photos: await resolvePhotos(supabase, row.photos ?? []) };
}

async function resolveListings(
  supabase: ReturnType<typeof makePublicClient>,
  rows: Listing[],
): Promise<Listing[]> {
  return Promise.all(rows.map((r) => resolveListing(supabase, r)));
}

const PROPERTY_TYPE_MAP: Record<string, { room_type: string; self: boolean | null }> = {
  single: { room_type: "single", self: false },
  single_self: { room_type: "single", self: true },
  double: { room_type: "double", self: false },
  double_self: { room_type: "double", self: true },
  apartment: { room_type: "apartment", self: null },
  business: { room_type: "business", self: null },
  shop: { room_type: "shop", self: null },
};

const filtersSchema = z
  .object({
    type: z.string().optional(),
    location: z.string().optional(),
    locations: z.array(z.string()).optional(),
    amenities: z.array(z.string()).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    q: z.string().optional(),
    recent: z.boolean().optional(),
    available: z.boolean().optional(),
    verified: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .default({});

const sel = (s: string): string => s;

// PostgREST parses .or()/ilike filter strings, so any character with meaning in
// that grammar (commas, dots, parens, quotes, operators) must be stripped before
// interpolation. Wildcards are also removed so a search can't widen the match.
function safeFilterText(input: string): string {
  return input
    .replace(/[,.()"'\\%*:{}[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export const listListings = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => filtersSchema.parse(d ?? {}))
  .handler(async ({ data }) => {
    const sb = makePublicClient();
    const limit = data.limit ?? 20;
    const offset = data.offset ?? 0;
    let q = sb
      .from("listings")
      .select(sel("*"))
      .eq("is_archived", false)
      .order("posted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const pt = data.type ? PROPERTY_TYPE_MAP[data.type] : undefined;
    if (pt) {
      q = q.eq("room_type", pt.room_type as Database["public"]["Enums"]["room_type"]);
      if (pt.self !== null) q = q.eq("is_self_contained", pt.self);
    }

    const locs = (data.locations ?? [])
      .concat(data.location ? [data.location] : [])
      .map(safeFilterText)
      .filter(Boolean);
    if (locs.length === 1) q = q.ilike("location", `%${locs[0]}%`);
    else if (locs.length > 1) {
      q = q.or(locs.map((l) => `location.ilike.%${l}%`).join(","));
    }

    if (typeof data.min === "number") q = q.gte("rent_ugx", data.min);
    if (typeof data.max === "number") q = q.lte("rent_ugx", data.max);
    if (data.amenities?.length) q = q.contains("amenities", data.amenities);
    if (typeof data.available === "boolean") q = q.eq("is_available", data.available);
    if (data.verified) q = q.eq("is_verified", true);
    const term = data.q ? safeFilterText(data.q) : "";
    if (term)
      q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%,location.ilike.%${term}%`);
    if (data.recent) {
      const since = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
      q = q.gte("posted_at", since);
    }
    const { data: rows, error } = await q.returns<Listing[]>();
    if (error) throw new Error(error.message);
    return resolveListings(sb, rows ?? []);
  });

export const getLocationSuggestions = createServerFn({ method: "GET" }).handler(async () => {
  const sb = makePublicClient();
  const { data, error } = await sb
    .from("listings")
    .select(sel("location"))
    .eq("is_archived", false)
    .returns<{ location: string }[]>();
  if (error) throw new Error(error.message);
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    const name = (r.location ?? "").trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location));
});

export const getFeaturedListings = createServerFn({ method: "GET" }).handler(async () => {
  const sb = makePublicClient();
  const { data, error } = await sb
    .from("listings")
    .select("*")
    .eq("is_archived", false)
    .eq("is_featured", true)
    .order("posted_at", { ascending: false })
    .limit(6);
  if (error) throw new Error(error.message);
  return resolveListings(sb, data ?? []);
});

export const getListing = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = makePublicClient();
    const { data: row, error } = await sb
      .from("listings")
      .select("*")
      .eq("id", data.id)
      .eq("is_archived", false)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    return resolveListing(sb, row);
  });

export const getSimilarListings = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const sb = makePublicClient();
    const { data: base } = await sb.from("listings").select("*").eq("id", data.id).maybeSingle();
    if (!base) return [];
    const { data: rows } = await sb
      .from("listings")
      .select("*")
      .eq("is_archived", false)
      .eq("room_type", base.room_type)
      .neq("id", base.id)
      .limit(4);
    return resolveListings(sb, rows ?? []);
  });

export const getPublicStats = createServerFn({ method: "GET" }).handler(async () => {
  const sb = makePublicClient();
  const { data, error } = await sb
    .from("listings")
    .select("id, is_available, is_featured")
    .eq("is_archived", false);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return {
    total: rows.length,
    available: rows.filter((r) => r.is_available).length,
    featured: rows.filter((r) => r.is_featured).length,
  };
});

export const trackListingEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        listing_id: z.string().uuid(),
        kind: z.enum(["view", "call", "whatsapp"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = makePublicClient();
    await sb.from("listing_events").insert({ listing_id: data.listing_id, kind: data.kind });
    return { ok: true };
  });
