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

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin access required");
}

const PHONE_RE = /^[+0-9][0-9 ()/+.-]{5,29}$/;

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        listing_id: z.string().uuid(),
        name: z
          .string()
          .transform((v) => v.trim())
          .refine((v) => v.length >= 2 && v.length <= 120, "Enter your name"),
        phone: z
          .string()
          .transform((v) => v.trim())
          .refine(
            (v) => PHONE_RE.test(v) && v.replace(/\D/g, "").length >= 7,
            "Enter a valid phone number",
          ),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const sb = makePublicClient();
    const { error } = await sb.from("waitlist").insert(data);
    if (error) {
      // Duplicate = same phone already on this listing's waitlist. Treat as success
      // so repeated submissions can't be used to bulk-fill the table.
      if (error.code === "23505") return { ok: true, alreadyJoined: true };
      console.error("[waitlist] insert failed", error);
      throw new Error("Could not save your request. Please try again.");
    }
    return { ok: true, alreadyJoined: false };
  });

export const adminListWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("waitlist")
      .select("id, listing_id, name, phone, created_at, listings(title)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });
