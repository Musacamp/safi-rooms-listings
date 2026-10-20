import { supabase } from "@/integrations/supabase/browser";
import { isAdminClient } from "./track";

const seen = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;

/** Debounced (800ms), skips empty values and exact repeats within this page session. */
export function logSearch(input: { term?: string; location?: string; room_type?: string }) {
  if (typeof window === "undefined") return;
  const term = input.term?.trim().slice(0, 200) || null;
  const location = input.location?.trim().slice(0, 300) || null;
  if (!term && !location) return;
  const room_type = input.room_type?.trim().slice(0, 40) || null;
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    const key = JSON.stringify([term, location, room_type]);
    if (seen.has(key)) return;
    seen.add(key);
    try {
      if (await isAdminClient()) return;
      await supabase.from("search_events").insert({ term, location, room_type });
    } catch {
      /* ignore */
    }
  }, 800);
}
