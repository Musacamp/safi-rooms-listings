import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ListPlus, LogOut, Home, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  };
  return (
    <div className="min-h-screen bg-surface pb-20">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link to="/admin" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-brand-blue text-sm font-bold text-white">
              S
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">SafiRooms Admin</div>
              <div className="text-[10px] text-muted-foreground">Manage listings</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground ring-1 ring-border"
            >
              <Home className="size-3.5" /> View site
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground ring-1 ring-border"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-2">
          <NavLink to="/admin" icon={<LayoutDashboard className="size-3.5" />} label="Dashboard" />
          <NavLink
            to="/admin/listings"
            icon={<ListPlus className="size-3.5" />}
            label="Listings"
          />
          <NavLink to="/admin/new" icon={<ListPlus className="size-3.5" />} label="New" />
          <NavLink
            to="/admin/generator"
            icon={<Sparkles className="size-3.5" />}
            label="Generator"
          />
          <NavLink
            to="/admin/revenue"
            icon={<Wallet className="size-3.5" />}
            label="Revenue"
          />


        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <Outlet />
      </div>
    </div>
  );
}

function NavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: to === "/admin" }}
      activeProps={{ className: "bg-brand-blue text-white" }}
      inactiveProps={{ className: "bg-secondary text-secondary-foreground" }}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-border"
    >
      {icon}
      {label}
    </Link>
  );
}
