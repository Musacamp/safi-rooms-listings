import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ListPlus, LogOut, Home, Sparkles, Wallet, MoreVertical, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/browser";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { EdgeSwipeNav } from "@/components/EdgeSwipeNav";

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
            <MoreMenu />
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
      <EdgeSwipeNav direction="toPortal" />
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

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid size-11 place-items-center rounded-lg bg-secondary text-secondary-foreground ring-1 ring-border"
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-30 min-w-48 rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-border">
          <Link
            to="/admin/insights"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-secondary"
          >
            <BarChart3 className="size-4" /> Market Insights
          </Link>
        </div>
      )}
    </div>
  );
}
