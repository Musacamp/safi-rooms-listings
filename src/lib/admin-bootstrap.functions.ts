import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("admins")
      .select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      const { data } = await context.supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", context.userId)
        .maybeSingle();
      return { isAdmin: !!data, bootstrapped: false };
    }
    // No admins yet — promote current user
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("admins")
      .insert({ user_id: context.userId });
    if (error) throw new Error(error.message);
    return { isAdmin: true, bootstrapped: true };
  });
