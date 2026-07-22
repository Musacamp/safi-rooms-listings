import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Forbidden: admin access required");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { isAdmin: !!data, userId: context.userId };
  });

const listingInput = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(4000).default(""),
  location: z.string().min(2).max(200),
  room_type: z.enum(["single", "double", "self_contained", "apartment", "business"]),
  rent_ugx: z.number().int().nonnegative(),
  deposit_ugx: z.number().int().nonnegative().default(0),
  is_available: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  amenities: z.array(z.string()).default([]),
  photos: z.array(z.string()).default([]),
});

export const adminListListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminGetListing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row } = await context.supabase
      .from("listings")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    return row;
  });

export const createListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => listingInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const insert: ListingInsert = { ...data, posted_at: new Date().toISOString() };
    const { data: row, error } = await context.supabase
      .from("listings")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: listingInput.partial() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("listings")
      .update(data.patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("listings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setListingFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        is_available: z.boolean().optional(),
        is_featured: z.boolean().optional(),
        is_archived: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("listings").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: listings } = await context.supabase
      .from("listings")
      .select("id, is_available, is_featured, is_archived");
    const rows = listings ?? [];
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data: events } = await context.supabase
      .from("listing_events")
      .select("kind, created_at")
      .gte("created_at", startOfDay.toISOString());
    const ev = events ?? [];
    return {
      total: rows.length,
      available: rows.filter((r) => r.is_available && !r.is_archived).length,
      occupied: rows.filter((r) => !r.is_available && !r.is_archived).length,
      featured: rows.filter((r) => r.is_featured && !r.is_archived).length,
      archived: rows.filter((r) => r.is_archived).length,
      todayViews: ev.filter((e) => e.kind === "view").length,
      todayCalls: ev.filter((e) => e.kind === "call").length,
      todayWhatsapp: ev.filter((e) => e.kind === "whatsapp").length,
    };
  });
