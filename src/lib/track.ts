import { supabase } from "@/integrations/supabase/client";
import { trackListingEvent } from "./listings.functions";
import { logVisit } from "./visitors.functions";

let adminPromise: Promise<boolean> | null = null;

export function isAdminClient(): Promise<boolean> {
  if (adminPromise) return adminPromise;
  adminPromise = (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return false;
      const { data: row } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", data.user.id)
        .maybeSingle();
      return !!row;
    } catch {
      return false;
    }
  })();
  return adminPromise;
}

export function resetAdminCache() {
  adminPromise = null;
}

export async function track(input: {
  listing_id: string;
  kind: "view" | "call" | "whatsapp";
}) {
  if (await isAdminClient()) return;
  try {
    await trackListingEvent({ data: input });
  } catch {
    /* ignore */
  }
}

const VISIT_KEY = "sr_visit_session";

export async function logSiteVisitOnce() {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(VISIT_KEY)) return;
    if (await isAdminClient()) return;
    let sid = localStorage.getItem(VISIT_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem(VISIT_KEY, sid);
    }
    sessionStorage.setItem(VISIT_KEY, "1");
    await logVisit({ data: { session_id: sid } });
  } catch {
    /* ignore */
  }
}
