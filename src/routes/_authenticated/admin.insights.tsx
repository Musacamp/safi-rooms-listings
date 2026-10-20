import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, MapPin, ImageOff, Pencil } from "lucide-react";
import { getMarketInsights, type InsightRoom, type MarketInsights } from "@/lib/insights.functions";
import { buildQuickInsights, categoryLabel } from "@/lib/insights-utils";
import { formatUGX } from "@/lib/format";
import { supabase } from "@/integrations/supabase/browser";
import { WhatsAppPosts } from "@/components/WhatsAppPosts";

export const Route = createFileRoute("/_authenticated/admin/insights")({
  head: () => ({
    meta: [
      { title: "Market Insights · SafiRooms Admin" },
      { name: "description", content: "Vacancy, demand and speed-to-take insights for SafiRooms listings." },
      { property: "og:title", content: "Market Insights · SafiRooms Admin" },
      { property: "og:description", content: "Vacancy, demand and speed-to-take insights for SafiRooms listings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminInsights,
});

const RANGES = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All time", days: null },
] as const;

function AdminInsights() {
  const [days, setDays] = useState<number | null>(90);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["market-insights", days],
    queryFn: () => getMarketInsights({ data: { days } }),
  });

  return (
    <div className="space-y-4 pb-10">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-foreground">Market Insights</h1>
        <div className="flex gap-1 rounded-lg bg-secondary p-1 ring-1 ring-border">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setDays(r.days)}
              className={`min-h-10 rounded-md px-3 text-sm font-medium ${
                days === r.days ? "bg-brand-blue text-white" : "text-secondary-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <WhatsAppPosts />

      {isLoading && <Skeleton />}
      {isError && <Empty text="Couldn't load insights right now. Please try again." />}
      {data && <InsightsBody data={data} />}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-secondary ring-1 ring-border" />
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">{text}</div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function RoomRow({ room }: { room: InsightRoom }) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    if (!room.photo) return;
    let active = true;
    supabase.storage.from("listing-photos").createSignedUrl(room.photo, 300).then(({ data }) => {
      if (active && data?.signedUrl) setThumb(data.signedUrl);
    });
    return () => {
      active = false;
    };
  }, [room.photo]);
  return (
    <div className="flex min-h-14 items-center gap-3 rounded-lg bg-background p-2 ring-1 ring-border">
      {thumb ? (
        <img src={thumb} alt="" className="size-11 rounded-md object-cover" loading="lazy" />
      ) : (
        <div className="grid size-11 place-items-center rounded-md bg-secondary text-muted-foreground">
          <ImageOff className="size-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{categoryLabel(room.roomType)}</div>
        <div className="text-xs text-muted-foreground">
          {formatUGX(room.rent)} · {room.daysListed}d listed
        </div>
      </div>
      <Link
        to="/admin/edit/$id"
        params={{ id: room.id }}
        className="grid min-h-11 min-w-11 place-items-center rounded-lg bg-secondary text-secondary-foreground ring-1 ring-border"
        aria-label="Edit listing"
      >
        <Pencil className="size-4" />
      </Link>
    </div>
  );
}

function Expandable({ label, meta, children }: { label: string; meta: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-card ring-1 ring-border">
      <button onClick={() => setOpen(!open)} className="flex min-h-12 w-full items-center gap-2 px-3 py-2 text-left">
        <MapPin className="size-4 shrink-0 text-brand-blue" />
        <span className="flex-1 text-sm font-semibold text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{meta}</span>
        {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {open && <div className="space-y-1.5 px-3 pb-3">{children}</div>}
    </div>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
      <div className="h-full rounded-full bg-brand-blue" style={{ width: `${pct}%` }} />
    </div>
  );
}

function InsightsBody({ data }: { data: MarketInsights }) {
  const { summary } = data;
  const insights = buildQuickInsights(data);
  const maxDemand = Math.max(1, ...data.demandByArea.map((a) => a.views + a.whatsapp + a.calls));
  const maxAvgDays = Math.max(1, ...data.fastestAreas.map((a) => a.avgDays));

  return (
    <div className="space-y-5">
      <Section title="Summary">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Vacant now", value: String(summary.vacantNow) },
            { label: "Taken in range", value: String(summary.takenInRange) },
            { label: "Avg days to take", value: summary.avgDaysToTake != null ? `${summary.avgDaysToTake}d` : "—" },
            { label: "Taken within 7 days", value: summary.pctTakenWithin7 != null ? `${summary.pctTakenWithin7}%` : "—" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl bg-card p-3 ring-1 ring-border">
              <div className="text-xl font-bold text-foreground">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Areas with most vacant rooms">
        {data.vacantByArea.length === 0 ? (
          <Empty text="Not enough data yet" />
        ) : (
          <div className="space-y-2">
            {data.vacantByArea.map((a) => (
              <Expandable
                key={a.area}
                label={a.area}
                meta={`${a.vacant} vacant · avg ${formatUGX(a.avgRent)} · oldest ${a.oldestDays}d`}
              >
                {a.rooms.map((r) => (
                  <RoomRow key={r.id} room={r} />
                ))}
              </Expandable>
            ))}
          </div>
        )}
      </Section>

      <Section title="Fastest-moving areas">
        {data.fastestAreas.length === 0 ? (
          <Empty text="Not enough data yet" />
        ) : (
          <div className="space-y-2">
            {data.fastestAreas.map((a) => (
              <div key={a.area} className="flex min-h-12 items-center gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-border">
                <div className="w-24 shrink-0">
                  <div className="text-sm font-semibold text-foreground">{a.area}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.taken} taken{a.estimated ? " (estimated)" : ""}
                  </div>
                </div>
                <Bar value={maxAvgDays - a.avgDays + 1} max={maxAvgDays} />
                <div className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                  avg {a.avgDays}d · med {a.medianDays}d
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Slow or stale rooms (listed 30+ days)">
        {data.staleRooms.length === 0 ? (
          <Empty text="Not enough data yet" />
        ) : (
          <div className="space-y-2">
            {data.staleRooms.map((a) => (
              <Expandable key={a.area} label={a.area} meta={`${a.rooms.length} stale`}>
                {a.rooms.map((r) => (
                  <RoomRow key={r.id} room={r} />
                ))}
              </Expandable>
            ))}
          </div>
        )}
      </Section>

      <Section title="Demand by area">
        {data.demandByArea.length === 0 ? (
          <Empty text="Not enough data yet" />
        ) : (
          <div className="space-y-2">
            {data.demandByArea.map((a) => {
              const total = a.views + a.whatsapp + a.calls;
              const hot = total >= 10 && a.vacant <= 3;
              return (
                <div key={a.area} className="flex min-h-12 items-center gap-3 rounded-xl bg-card px-3 py-2 ring-1 ring-border">
                  <div className="w-24 shrink-0">
                    <div className="text-sm font-semibold text-foreground">
                      {a.area} {hot && <span className="text-xs font-bold text-brand-blue">· hot</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">{a.vacant} vacant</div>
                  </div>
                  <Bar value={total} max={maxDemand} />
                  <div className="w-28 shrink-0 text-right text-xs text-muted-foreground">
                    {a.views} views · {a.whatsapp} WA · {a.calls} calls
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section title="By room type">
        {data.byType.length === 0 ? (
          <Empty text="Not enough data yet" />
        ) : (
          <div className="space-y-2">
            {data.byType.map((t) => (
              <div key={t.category} className="rounded-xl bg-card px-3 py-2 ring-1 ring-border">
                <div className="text-sm font-semibold text-foreground">{categoryLabel(t.category)}</div>
                <div className="text-xs text-muted-foreground">
                  {t.vacant} vacant · {t.takenInRange} taken · avg{" "}
                  {t.avgDaysToTake != null ? `${t.avgDaysToTake}d to take` : "—"} · avg {formatUGX(t.avgRent)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Quick insights">
        {insights.length === 0 ? (
          <Empty text="Not enough data yet" />
        ) : (
          <ul className="space-y-1.5 rounded-xl bg-card p-3 ring-1 ring-border">
            {insights.map((s, i) => (
              <li key={i} className="text-sm text-foreground">• {s}</li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
