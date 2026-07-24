import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const logVisit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ session_id: z.string().min(4).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const sb = makePublicClient();
    await sb.from("site_visits").insert({ session_id: data.session_id });
    return { ok: true };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin access required");
}

export const getVisitorStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    const { data, error } = await context.supabase
      .from("site_visits")
      .select("created_at, session_id")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = data ?? [];

    // Bucket into 24 hourly slots ending at current hour.
    const now = new Date();
    now.setMinutes(0, 0, 0);
    const buckets: { hour: string; visits: number; uniques: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const start = new Date(now.getTime() - i * 3600 * 1000);
      buckets.push({
        hour: start.toISOString(),
        visits: 0,
        uniques: 0,
      });
    }
    const uniqueSets: Set<string>[] = buckets.map(() => new Set());
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      const idx = Math.floor((t - (now.getTime() - 23 * 3600 * 1000)) / 3600000);
      if (idx >= 0 && idx < 24) {
        buckets[idx].visits += 1;
        uniqueSets[idx].add(r.session_id);
      }
    }
    buckets.forEach((b, i) => (b.uniques = uniqueSets[i].size));

    // Totals
    const totalVisits = rows.length;
    const allSessions = new Set(rows.map((r) => r.session_id));

    // All-time total (separate query, count only)
    const { count: allTime } = await context.supabase
      .from("site_visits")
      .select("id", { count: "exact", head: true });

    return {
      hourly: buckets,
      last24hVisits: totalVisits,
      last24hUniques: allSessions.size,
      allTimeVisits: allTime ?? 0,
    };
  });
