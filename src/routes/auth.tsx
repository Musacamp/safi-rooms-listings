import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/browser";
import { ShieldCheck, Lock } from "lucide-react";
import { resetAdminCache } from "@/lib/track";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin sign in — SafiRooms" },
      { name: "description", content: "SafiRooms admin sign in." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) nav({ to: "/admin" });
    });
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Verify this user is an admin; otherwise sign out.
      const uid = data.user?.id;
      if (uid) {
        const { data: adminRow } = await supabase
          .from("admins")
          .select("user_id")
          .eq("user_id", uid)
          .maybeSingle();
        if (!adminRow) {
          await supabase.auth.signOut();
          throw new Error("This account is not authorized for admin access.");
        }
      }
      resetAdminCache();
      toast.success("Signed in");
      nav({ to: "/admin" });
    } catch (e: any) {
      toast.error(e.message ?? "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 ring-1 ring-border">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-lg bg-brand-blue text-sm font-bold text-white">
            S
          </div>
          <div>
            <div className="text-base font-bold text-foreground">SafiRooms Admin</div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-brand-green">
              <ShieldCheck className="size-3" /> Secure sign in
            </div>
          </div>
        </div>
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          <Lock className="size-3.5" /> Authorized admins only
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-medium text-muted-foreground">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none ring-1 ring-border"
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            Password
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none ring-1 ring-border"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-brand-blue py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Please wait..." : "Sign in"}
          </button>
        </form>
        <p className="mt-3 text-[11px] text-muted-foreground">
          New admin accounts can only be provisioned by the system owner.
        </p>
      </div>
    </div>
  );
}
