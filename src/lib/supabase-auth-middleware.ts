import { createMiddleware } from "@tanstack/react-start";
import { getSupabase } from "@/integrations/supabase/browser";

/**
 * Project-specific replacement for the generated `attachSupabaseAuth`.
 *
 * Same behaviour (attach the bearer token to serverFn RPCs), but resolved via
 * the resilient browser client so a deployment built without inlined
 * VITE_SUPABASE_* values does not throw on every server-function call.
 */
export const attachSupabaseAuthSafe = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    try {
      const client = getSupabase();
      if (!client) return next({ headers: {} });
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
    } catch {
      return next({ headers: {} });
    }
  },
);
