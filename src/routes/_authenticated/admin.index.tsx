import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAdminStats, adminListListings, checkIsAdmin } from "@/lib/admin-listings.functions";
import { getVisitorStats } from "@/lib/visitors.functions";
import { formatUGX, relativeDate } from "@/lib/format";
import { ROOM_TYPE_LABEL } from "@/lib/constants";
import { ShieldAlert, Users, Eye, Phone, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

function AdminHome() {
  const adminCheck = useQuery({ queryKey: ["is-admin"], queryFn: () => checkIsAdmin() });
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => getAdminStats(),
    enabled: !!adminCheck.data?.isAdmin,
  });
  const listings = useQuery({
    queryKey: ["admin-listings"],
    queryFn: () => adminListListings(),
    enabled: !!adminCheck.data?.isAdmin,
  });
  const visitors = useQuery({
    queryKey: ["visitor-stats"],
    queryFn: () => getVisitorStats(),
    enabled: !!adminCheck.data?.isAdmin,
    refetchInterval: 60_000,
  });

  if (adminCheck.isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!adminCheck.data?.isAdmin) {
    return (
      <div className="rounded-2xl bg-card p-6 ring-1 ring-border">
        <div className="flex items-center gap-2 text-amber-600">
          <ShieldAlert className="size-5" />
          <h2 className="text-base font-semibold">Not authorized</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is signed in but is not an admin. Ask the system owner to add your user id
          to the admins table.
        </p>
        <div className="mt-3 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
          User id: <code>{adminCheck.data?.userId}</code>
        </div>
      </div>
    );
  }

  const s = stats.data;
  const v = visitors.data;
  const recent = (listings.data ?? []).slice(0, 5);
  const topListings = [...(listings.data ?? [])]
    .filter((l) => !l.is_archived)
    .sort((a, b) => b.views_count - a.views_count)
    .slice(0, 5);

  const maxHourly = Math.max(1, ...(v?.hourly ?? []).map((h) => h.visits));

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
        <p className="text-xs text-muted-foreground">Today's engagement and listing summary</p>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={s?.total ?? "—"} />
        <Stat label="Available" value={s?.available ?? "—"} tone="green" />
        <Stat label="Occupied" value={s?.occupied ?? "—"} tone="amber" />
        <Stat label="Featured" value={s?.featured ?? "—"} tone="blue" />
        <Stat label="Views today" value={s?.todayViews ?? "—"} />
        <Stat label="Calls today" value={s?.todayCalls ?? "—"} />
        <Stat label="WhatsApp today" value={s?.todayWhatsapp ?? "—"} />
        <Stat label="Archived" value={s?.archived ?? "—"} />
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="size-4" /> Website visitors
          </h2>
          <span className="text-[10px] text-muted-foreground">Last 24 hours · hourly</span>
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <div className="mb-3 grid grid-cols-3 gap-3">
            <MiniStat label="All time" value={v?.allTimeVisits ?? "—"} />
            <MiniStat label="24h visits" value={v?.last24hVisits ?? "—"} />
            <MiniStat label="24h uniques" value={v?.last24hUniques ?? "—"} />
          </div>
          {v?.hourly ? (
            <>
              <div className="flex h-32 items-end gap-1">
                {v.hourly.map((h) => {
                  const pct = (h.visits / maxHourly) * 100;
                  const hour = new Date(h.hour).getHours();
                  return (
                    <div
                      key={h.hour}
                      className="group relative flex flex-1 flex-col items-center"
                      title={`${hour}:00 — ${h.visits} visit${h.visits === 1 ? "" : "s"} (${h.uniques} unique)`}
                    >
                      <div
                        className="w-full rounded-t bg-brand-blue transition-all"
                        style={{ height: `${Math.max(pct, h.visits > 0 ? 6 : 2)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                <span>{new Date(v.hourly[0].hour).getHours()}:00</span>
                <span>{new Date(v.hourly[11].hour).getHours()}:00</span>
                <span>{new Date(v.hourly[23].hour).getHours()}:00</span>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Loading visitor data...</p>
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Top performing listings</h2>
          <Link to="/admin/listings" className="text-xs font-medium text-brand-blue">
            View all
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {topListings.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No listings yet.</p>
          ) : (
            topListings.map((l) => (
              <Link
                to="/admin/edit/$id"
                params={{ id: l.id }}
                key={l.id}
                className="flex items-center justify-between gap-3 border-b border-border p-3 last:border-none hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{l.title}</div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Eye className="size-3" /> {l.views_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3" /> {l.calls_count}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3" /> {l.whatsapp_count}
                    </span>
                  </div>
                </div>
                <div className="text-sm font-semibold text-brand-blue">
                  {formatUGX(l.rent_ugx)}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Recent listings</h2>
          <Link to="/admin/listings" className="text-xs font-medium text-brand-blue">
            View all
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          {recent.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No listings yet.</p>
          ) : (
            recent.map((l) => (
              <Link
                to="/admin/edit/$id"
                params={{ id: l.id }}
                key={l.id}
                className="flex items-center justify-between border-b border-border p-3 last:border-none hover:bg-accent"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{l.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {ROOM_TYPE_LABEL[l.room_type]} · {l.location} · {relativeDate(l.created_at)}
                  </div>
                </div>
                <div className="text-sm font-semibold text-brand-blue">
                  {formatUGX(l.rent_ugx)}
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "green" | "amber" | "blue";
}) {
  const color =
    tone === "green"
      ? "text-brand-green"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "blue"
          ? "text-brand-blue"
          : "text-foreground";
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-border">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={"mt-1 text-xl font-bold " + color}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-secondary p-2 text-center">
      <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}
