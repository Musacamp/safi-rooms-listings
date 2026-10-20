import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { WhatsAppTextEditor } from "@/components/WhatsAppTextEditor";
import { getPostData } from "@/lib/insights.functions";
import { POST_TEMPLATES, periodRange, type PostData } from "@/lib/insight-templates";

const PERIODS = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "last_30", label: "Last 30 days" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];

const AUDIENCE_LABEL = { tenants: "For tenants", landlords: "For landlords", both: "For tenants & landlords" } as const;

export function WhatsAppPosts() {
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  // Freeze boundaries per selection so the query key stays stable.
  const range = useMemo(() => periodRange(period), [period]);
  const query = useQuery({
    queryKey: ["post-data", period, range.start.toISOString()],
    queryFn: () => getPostData({ data: { start: range.start.toISOString(), end: range.end.toISOString() } }),
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const [parts, setParts] = useState<string[]>([]);

  const ctx = { period: range.label, now: new Date() };
  const results = query.data
    ? POST_TEMPLATES.map((t) => ({ t, r: t.build(query.data as PostData, ctx) }))
    : [];

  const open = (id: string, data: PostData) => {
    const t = POST_TEMPLATES.find((x) => x.id === id);
    const r = t?.build(data, { period: range.label, now: new Date() });
    if (!r || !r.ok) return;
    setParts(r.parts);
    setOpenId(id);
  };

  const regenerate = async () => {
    if (!openId) return;
    const { data } = await query.refetch();
    if (data) open(openId, data);
  };

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">WhatsApp posts</h2>
        <div className="flex gap-1 rounded-lg bg-secondary p-1 ring-1 ring-border">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`min-h-10 rounded-md px-2.5 text-xs font-medium ${
                period === p.key ? "bg-brand-blue text-white" : "text-secondary-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {query.isLoading && <div className="h-24 animate-pulse rounded-xl bg-secondary ring-1 ring-border" />}
      {query.isError && (
        <div className="rounded-xl bg-card p-4 text-center text-sm text-muted-foreground ring-1 ring-border">
          Couldn't load post data right now.
        </div>
      )}
      {query.data && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {results.map(({ t, r }) => (
            <button
              key={t.id}
              disabled={!r.ok}
              onClick={() => open(t.id, query.data as PostData)}
              className="min-h-16 rounded-xl bg-card px-3 py-2 text-left ring-1 ring-border disabled:opacity-50"
            >
              <div className="text-sm font-semibold text-foreground">{t.title}</div>
              <div className="text-xs text-muted-foreground">
                {AUDIENCE_LABEL[t.audience]}
                {!r.ok && " · Not enough data yet"}
              </div>
            </button>
          ))}
        </div>
      )}
      <Sheet open={openId != null} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{POST_TEMPLATES.find((t) => t.id === openId)?.title}</SheetTitle>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-4">
            <Button variant="outline" className="min-h-11" onClick={regenerate} disabled={query.isFetching}>
              <RefreshCw /> Regenerate
            </Button>
            <WhatsAppTextEditor parts={parts} onChange={setParts} />
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
