import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck } from "lucide-react";
import { bootstrapAdmin } from "@/lib/admin-bootstrap.functions";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/auth" },
        });
        if (error) throw error;
      }
      // Attempt to bootstrap as first admin (no-op if admins already exist)
      try {
        const res = await bootstrapAdmin();
        if (res.bootstrapped) toast.success("You are now the admin");
      } catch {}
      toast.success(mode === "signin" ? "Signed in" : "Account created");
      nav({ to: "/admin" });
    } catch (e: any) {
      toast.error(e.message ?? "Auth failed");
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
        <div className="mb-3 flex gap-1 rounded-lg bg-secondary p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={
              "flex-1 rounded-md py-1.5 " +
              (mode === "signin" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")
            }
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={
              "flex-1 rounded-md py-1.5 " +
              (mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")
            }
          >
            Create account
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-xs font-medium text-muted-foreground">
            Email
            <input
              type="email"
              required
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
            {loading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : "Create admin account"}
          </button>
        </form>
        {mode === "signup" && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            The first account created becomes the admin automatically.
          </p>
        )}
      </div>
    </div>
  );
}
