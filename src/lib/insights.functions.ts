import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { PostData } from "./insight-templates";

export type InsightRoom = {
  id: string;
  roomType: string;
  rent: number;
  daysListed: number;
  photo: string | null;
};

export type MarketInsights = {
  summary: {
    vacantNow: number;
    takenInRange: number;
    avgDaysToTake: number | null;
    pctTakenWithin7: number | null;
  };
  vacantByArea: { area: string; vacant: number; avgRent: number; oldestDays: number; rooms: InsightRoom[] }[];
  fastestAreas: { area: string; avgDays: number; medianDays: number; taken: number; estimated: boolean }[];
  staleRooms: { area: string; rooms: InsightRoom[] }[];
  demandByArea: { area: string; views: number; whatsapp: number; calls: number; vacant: number }[];
  byType: { category: string; vacant: number; takenInRange: number; avgDaysToTake: number | null; avgRent: number }[];
};

export const getMarketInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.number().int().positive().nullable() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!admin) throw new Error("Forbidden: admin access required");
    const { data: result, error } = await (context.supabase as any).rpc("admin_market_insights", {
      p_days: data.days,
    });
    if (error) throw new Error(error.message);
    return result as MarketInsights;
  });

export const getPostData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ start: z.string().datetime(), end: z.string().datetime() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: admin } = await context.supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!admin) throw new Error("Forbidden: admin access required");
    const { data: result, error } = await (context.supabase as any).rpc("admin_post_data", {
      p_start: data.start,
      p_end: data.end,
    });
    if (error) throw new Error(error.message);
    return result as PostData;
  });
