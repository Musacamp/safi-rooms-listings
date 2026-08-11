import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SOURCES = [
  "client_payment",
  "landlord_payment",
  "brokerage_fee",
  "listing_fee",
  "property_management",
  "advertising",
  "premium_listing",
  "referral",
  "commission",
  "other",
] as const;

const entryInput = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount_ugx: z.number().int().min(0).max(1_000_000_000),
  source: z.enum(SOURCES),
  source_label: z.string().max(120).nullable().default(null),
  notes: z.string().max(1000).nullable().default(null),
  transactions: z.number().int().min(1).max(999).default(1),
});

/* eslint-disable @typescript-eslint/no-explicit-any */
async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin access required");
}

async function audit(
  supabase: any,
  actor: string,
  action: string,
  entryId: string | null,
  before: unknown,
  after: unknown,
) {
  await supabase.from("revenue_audit").insert({
    entry_id: entryId,
    action,
    before_data: (before ?? null) as any,
    after_data: (after ?? null) as any,
    actor,
  });
}

export const listRevenueEntries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("revenue_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createRevenueEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => entryInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("revenue_entries")
      .insert({ ...data, created_by: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "create", row.id, null, row);
    return row;
  });

export const updateRevenueEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: entryInput.partial() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: before } = await context.supabase
      .from("revenue_entries")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { data: row, error } = await context.supabase
      .from("revenue_entries")
      .update(data.patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "update", data.id, before, row);
    return row;
  });

export const deleteRevenueEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: before } = await context.supabase
      .from("revenue_entries")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("revenue_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "delete", data.id, before, null);
    return { ok: true };
  });

export const bulkCreateRevenueEntries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ rows: z.array(entryInput).min(1).max(500) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const rows = data.rows.map((r) => ({ ...r, created_by: context.userId }));
    const { data: inserted, error } = await context.supabase
      .from("revenue_entries")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "bulk_import", null, null, {
      count: inserted?.length ?? 0,
    });
    return { count: inserted?.length ?? 0 };
  });

export const listRevenueTargets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase.from("revenue_targets").select("*");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setRevenueTarget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        period: z.enum(["daily", "weekly", "monthly", "yearly"]),
        period_key: z.string().max(20).default(""),
        amount_ugx: z.number().int().min(0).max(100_000_000_000),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("revenue_targets")
      .upsert(data, { onConflict: "period,period_key" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listRevenueAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("revenue_audit")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Sequential daily-collection entry: one authoritative total per calendar day.
 * Updates the existing row for that date instead of creating a duplicate.
 */
export const setDailyCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        amount_ugx: z.number().int().min(0).max(1_000_000_000),
        notes: z.string().max(1000).nullable().default(null),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: existing } = await context.supabase
      .from("revenue_entries")
      .select("*")
      .eq("entry_date", data.entry_date)
      .order("created_at", { ascending: true });

    const rows = existing ?? [];
    if (rows.length > 0) {
      const keep = rows[0];
      const { data: row, error } = await context.supabase
        .from("revenue_entries")
        .update({ amount_ugx: data.amount_ugx, notes: data.notes })
        .eq("id", keep.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      await audit(context.supabase, context.userId, "daily_update", keep.id, keep, row);
      return row;
    }

    const { data: row, error } = await context.supabase
      .from("revenue_entries")
      .insert({
        entry_date: data.entry_date,
        amount_ugx: data.amount_ugx,
        source: "client_payment" as const,
        source_label: "Daily collection",
        notes: data.notes,
        transactions: 1,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await audit(context.supabase, context.userId, "daily_create", row.id, null, row);
    return row;
  });
