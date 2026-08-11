import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trophy,
  Flame,
  Lightbulb,
  Target,
  FileDown,
  FileSpreadsheet,
  FileText,
  Pencil,
  Trash2,
  TrendingUp,
  History,
  ShieldAlert,
} from "lucide-react";
import {
  bulkCreateRevenueEntries,
  createRevenueEntry,
  deleteRevenueEntry,
  listRevenueAudit,
  listRevenueEntries,
  listRevenueTargets,
  setDailyCollection,
  setRevenueTarget,
  updateRevenueEntry,
} from "@/lib/revenue.functions";
import { checkIsAdmin } from "@/lib/admin-listings.functions";
import { formatUGX } from "@/lib/format";
import {
  MIN_PATTERN_DAYS,
  REVENUE_SOURCES,
  SOURCE_LABEL,
  domPatterns,
  dowPatterns,
  insights,
  kpis,
  monthComparison,
  ordinal,
  records,
  streaks,
  type RevenueEntry,
} from "@/lib/revenue-analytics";
import { AddEarningSheet, type EarningDraft } from "@/components/revenue/AddEarningSheet";
import { RevenueCalendar } from "@/components/revenue/RevenueCalendar";
import { RevenueCharts } from "@/components/revenue/RevenueCharts";
import { BulkImport } from "@/components/revenue/BulkImport";
import { DailyCollection } from "@/components/revenue/DailyCollection";
import { exportCsv, exportExcel, exportPdf, filterEntries } from "@/lib/revenue-export";

export const Route = createFileRoute("/_authenticated/admin/revenue")({
  component: RevenuePage,
});

function RevenuePage() {
  const qc = useQueryClient();
  const adminCheck = useQuery({ queryKey: ["is-admin"], queryFn: () => checkIsAdmin() });
  const isAdmin = !!adminCheck.data?.isAdmin;

  const entriesQ = useQuery({
    queryKey: ["revenue-entries"],
    queryFn: () => listRevenueEntries(),
    enabled: isAdmin,
  });
  const targetsQ = useQuery({
    queryKey: ["revenue-targets"],
    queryFn: () => listRevenueTargets(),
    enabled: isAdmin,
  });
  const auditQ = useQuery({
    queryKey: ["revenue-audit"],
    queryFn: () => listRevenueAudit(),
    enabled: isAdmin,
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<RevenueEntry | null>(null);
  const [presetDate, setPresetDate] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [expFrom, setExpFrom] = useState("");
  const [expTo, setExpTo] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["revenue-entries"] });
    qc.invalidateQueries({ queryKey: ["revenue-audit"] });
  };

  const save = useMutation({
    mutationFn: async (d: EarningDraft) =>
      editing
        ? updateRevenueEntry({ data: { id: editing.id, patch: d } })
        : createRevenueEntry({ data: d }),
    onSuccess: () => {
      toast.success(editing ? "Earning updated" : "Earning recorded");
      setSheetOpen(false);
      setEditing(null);
      setPresetDate(null);
      refresh();
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? "Could not save"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteRevenueEntry({ data: { id } }),
    onSuccess: () => {
      toast.success("Entry deleted");
      refresh();
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? "Could not delete"),
  });

  const bulk = useMutation({
    mutationFn: async (rows: EarningDraft[]) => bulkCreateRevenueEntries({ data: { rows } }),
    onSuccess: (r) => {
      toast.success(`${r.count} entries imported`);
      refresh();
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? "Could not import"),
  });

  const daily = useMutation({
    mutationFn: async (d: { entry_date: string; amount_ugx: number }) =>
      setDailyCollection({ data: { ...d, notes: null } }),
    onSuccess: () => refresh(),
  });

  const target = useMutation({
    mutationFn: async (v: { period: "daily" | "weekly" | "monthly" | "yearly"; amount: number }) =>
      setRevenueTarget({ data: { period: v.period, period_key: "", amount_ugx: v.amount } }),
    onSuccess: () => {
      toast.success("Target saved");
      qc.invalidateQueries({ queryKey: ["revenue-targets"] });
    },
  });

  const all = (entriesQ.data ?? []) as RevenueEntry[];
  const entries = useMemo(
    () => (sourceFilter ? all.filter((e) => e.source === sourceFilter) : all),
    [all, sourceFilter],
  );
  const targets = (targetsQ.data ?? []) as { period: string; amount_ugx: number }[];

  const k = useMemo(() => kpis(entries), [entries]);
  const rec = useMemo(() => records(entries), [entries]);
  const st = useMemo(() => streaks(entries), [entries]);
  const months = useMemo(() => monthComparison(entries), [entries]);
  const dom = useMemo(() => domPatterns(entries), [entries]);
  const dow = useMemo(() => dowPatterns(entries), [entries]);
  const tips = useMemo(() => insights(entries, targets), [entries, targets]);

  if (adminCheck.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!isAdmin)
    return (
      <div className="rounded-2xl bg-card p-6 ring-1 ring-border">
        <div className="flex items-center gap-2 text-amber-600">
          <ShieldAlert className="size-5" />
          <h2 className="text-base font-semibold">Not authorized</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Revenue data is restricted to SafiRooms administrators.
        </p>
      </div>
    );

  const openAdd = (date?: string) => {
    setEditing(null);
    setPresetDate(date ?? null);
    setSheetOpen(true);
  };

  const bestMonth = [...months].sort((a, b) => b.amount - a.amount)[0];
  const worstMonth = [...months].sort((a, b) => a.amount - b.amount)[0];
  const avgMonth = months.length ? months.reduce((n, m) => n + m.amount, 0) / months.length : 0;
  const exportSet = filterEntries(all, {
    from: expFrom || undefined,
    to: expTo || undefined,
    source: sourceFilter || undefined,
  });

  return (
    <div className="flex flex-col gap-5 pb-10">
      <section className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">💰 SafiRooms Revenue</h1>
          <p className="text-xs text-muted-foreground">
            Private revenue intelligence · {k.entryCount} entries · {k.transactions} transactions
          </p>
        </div>
        <button
          onClick={() => openAdd()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-green px-3.5 py-2.5 text-sm font-bold text-white shadow"
        >
          <Plus className="size-4" /> ADD EARNING
        </button>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi label="Total revenue" value={formatUGX(k.total)} tone="blue" />
        <Kpi label="This month" value={formatUGX(k.month)} tone="green" />
        <Kpi label="This week" value={formatUGX(k.week)} />
        <Kpi label="Today" value={formatUGX(k.today)} />
        <Kpi label="Average daily" value={formatUGX(k.avgDaily)} />
        <Kpi
          label="Growth vs last month"
          value={k.growthPct == null ? "—" : `${k.growthPct >= 0 ? "+" : ""}${k.growthPct.toFixed(1)}%`}
          tone={k.growthPct != null && k.growthPct < 0 ? "amber" : "green"}
        />
      </section>

      {/* source filter */}
      <section className="flex gap-1.5 overflow-x-auto no-scrollbar">
        <FilterChip active={!sourceFilter} onClick={() => setSourceFilter("")} label="All sources" />
        {REVENUE_SOURCES.map((s) => (
          <FilterChip
            key={s.value}
            active={sourceFilter === s.value}
            onClick={() => setSourceFilter(s.value)}
            label={s.label}
          />
        ))}
      </section>

      <RevenueCharts entries={entries} />

      {/* records */}
      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Trophy className="size-4 text-brand-green" /> Best earning records
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <RecordCard title="🏆 Best day" cur={rec.day} prev={rec.prevDay} />
          <RecordCard title="🏆 Best week" cur={rec.week} prev={rec.prevWeek} />
          <RecordCard title="🏆 Best month" cur={rec.month} prev={rec.prevMonth} />
          <RecordCard title="🏆 Best year" cur={rec.year} prev={rec.prevYear} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="🔥 Current streak" value={`${st.current} day${st.current === 1 ? "" : "s"}`} />
          <Mini label="🏆 Best streak" value={`${st.best} day${st.best === 1 ? "" : "s"}`} />
          <Mini label="Earning days" value={String(st.activeDays)} />
          <Mini label="Zero-income days" value={String(st.zeroDays)} />
        </div>
      </section>

      {/* calendar */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Revenue calendar</h2>
        <RevenueCalendar entries={entries} onPickDate={(d) => openAdd(d)} />
      </section>

      {/* patterns */}
      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Flame className="size-4 text-amber-500" /> High-earning pattern detection
        </h2>
        {!dom.enough ? (
          <p className="text-xs text-muted-foreground">
            Not enough historical data yet — {dom.activeDays} of {MIN_PATTERN_DAYS} earning days
            recorded. Patterns appear automatically as you add more history.
          </p>
        ) : dom.strong.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No date of the month stands out above your average yet.
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              Based on your recorded history, these dates have performed above your average of{" "}
              {formatUGX(dom.overallAvg)} per earning day.
            </p>
            <div className="flex flex-col gap-1.5">
              {dom.strong.slice(0, 6).map((p) => (
                <div
                  key={p.dom}
                  className="flex items-center justify-between rounded-xl bg-secondary p-2.5 text-[11px]"
                >
                  <span className="font-semibold text-foreground">
                    {ordinal(p.dom)} — historically strong
                  </span>
                  <span className="text-muted-foreground">
                    Avg {formatUGX(p.avg)} · {p.occurrences}× · {p.vsAvgPct.toFixed(0)}% above
                    average
                  </span>
                </div>
              ))}
            </div>
            {dow.length > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {dow[0].label}s have historically performed {dow[0].vsAvgPct.toFixed(0)}% above your
                average.
              </p>
            )}
          </>
        )}
      </section>

      {/* month comparison */}
      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp className="size-4 text-brand-blue" /> Month-to-month comparison
        </h2>
        {months.length === 0 ? (
          <p className="text-xs text-muted-foreground">No months recorded yet.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              {months.map((m) => (
                <div key={m.key} className="flex items-center justify-between text-[12px]">
                  <span className="text-foreground">{m.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{formatUGX(m.amount)}</span>
                    {m.changePct != null && (
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                          (m.changePct >= 0
                            ? "bg-brand-green/15 text-brand-green"
                            : "bg-amber-500/20 text-amber-700 dark:text-amber-300")
                        }
                      >
                        {m.changePct >= 0 ? "+" : ""}
                        {m.changePct.toFixed(1)}%
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Mini label="Best month" value={bestMonth ? bestMonth.label : "—"} />
              <Mini label="Weakest month" value={worstMonth ? worstMonth.label : "—"} />
              <Mini label="Average month" value={formatUGX(avgMonth)} />
            </div>
          </>
        )}
      </section>

      {/* targets */}
      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="size-4 text-brand-blue" /> Revenue targets
        </h2>
        <div className="flex flex-col gap-3">
          {(
            [
              ["daily", "Daily", k.today],
              ["weekly", "Weekly", k.week],
              ["monthly", "Monthly", k.month],
              ["yearly", "Yearly", k.total],
            ] as const
          ).map(([period, label, current]) => {
            const amount = targets.find((t) => t.period === period)?.amount_ugx ?? 0;
            const pct = amount > 0 ? Math.min(100, (current / amount) * 100) : 0;
            return (
              <div key={period}>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-foreground">{label} target</span>
                  <span className="text-muted-foreground">
                    {formatUGX(current)} {amount > 0 ? `of ${formatUGX(amount)} · ${pct.toFixed(1)}%` : ""}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-brand-green" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    defaultValue={amount || ""}
                    placeholder="Set target (UGX)"
                    onBlur={(e) => {
                      const v = Math.round(Number(e.target.value) || 0);
                      if (v !== amount) target.mutate({ period, amount: v });
                    }}
                    className="input py-1.5 text-[12px]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* insights */}
      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Lightbulb className="size-4 text-amber-500" /> Smart insights
        </h2>
        <ul className="flex flex-col gap-1.5">
          {tips.map((t, i) => (
            <li key={i} className="rounded-xl bg-secondary p-2.5 text-[12px] text-foreground">
              {t}
            </li>
          ))}
        </ul>
      </section>

      <DailyCollection
        entries={all}
        onSave={(d) => daily.mutateAsync(d)}
        saving={daily.isPending}
      />

      <BulkImport onImport={(rows) => bulk.mutateAsync(rows).then(() => undefined)} saving={bulk.isPending} />

      {/* export */}
      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Export reports</h2>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">From</span>
            <input type="date" value={expFrom} onChange={(e) => setExpFrom(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">To</span>
            <input type="date" value={expTo} onChange={(e) => setExpTo(e.target.value)} className="input" />
          </label>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {exportSet.length} entries selected{sourceFilter ? ` · ${SOURCE_LABEL[sourceFilter]}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={() => exportCsv(exportSet)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground ring-1 ring-border"
          >
            <FileDown className="size-3.5" /> CSV
          </button>
          <button
            onClick={() => exportExcel(exportSet)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground ring-1 ring-border"
          >
            <FileSpreadsheet className="size-3.5" /> Excel
          </button>
          <button
            onClick={() => {
              if (!exportPdf(exportSet)) toast.error("Allow pop-ups to export the PDF report");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground ring-1 ring-border"
          >
            <FileText className="size-3.5" /> PDF
          </button>
        </div>
      </section>

      {/* transaction history */}
      <section className="rounded-2xl bg-card ring-1 ring-border">
        <div className="flex items-center justify-between p-4">
          <h2 className="text-sm font-semibold text-foreground">Transaction history</h2>
          <span className="text-[11px] text-muted-foreground">{entries.length} entries</span>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {entries.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">No earnings recorded yet.</p>
          ) : (
            entries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-2 border-t border-border p-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {formatUGX(e.amount_ugx)}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {e.entry_date} ·{" "}
                    {e.source === "other" ? (e.source_label ?? "Other") : SOURCE_LABEL[e.source]}
                    {e.transactions > 1 ? ` · ${e.transactions} tx` : ""}
                    {e.notes ? ` · ${e.notes}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    aria-label="Edit entry"
                    onClick={() => {
                      setEditing(e);
                      setSheetOpen(true);
                    }}
                    className="grid size-8 place-items-center rounded-lg bg-secondary text-secondary-foreground ring-1 ring-border"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    aria-label="Delete entry"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete this financial record?\n${e.entry_date} · ${formatUGX(e.amount_ugx)}\nThis cannot be undone.`,
                        )
                      )
                        remove.mutate(e.id);
                    }}
                    className="grid size-8 place-items-center rounded-lg bg-secondary text-red-600 ring-1 ring-border"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* activity history */}
      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
        >
          <span className="flex items-center gap-2">
            <History className="size-4" /> Revenue activity history
          </span>
          <span className="text-[11px] text-muted-foreground">
            {showHistory ? "Hide" : "Show"}
          </span>
        </button>
        {showHistory && (
          <div className="mt-2 flex flex-col gap-1">
            {(auditQ.data ?? []).length === 0 ? (
              <p className="text-[11px] text-muted-foreground">No changes recorded yet.</p>
            ) : (
              (auditQ.data ?? []).map((a) => (
                <div key={a.id} className="rounded-lg bg-secondary p-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold uppercase text-foreground">{a.action}</span>{" "}
                  {new Date(a.created_at).toLocaleString("en-GB")}
                </div>
              ))
            )}
          </div>
        )}
      </section>

      <AddEarningSheet
        open={sheetOpen}
        editing={
          editing ??
          (presetDate
            ? ({
                id: "",
                entry_date: presetDate,
                amount_ugx: 0,
                source: "client_payment",
                source_label: null,
                notes: null,
                transactions: 1,
                created_at: "",
              } as RevenueEntry)
            : null)
        }
        saving={save.isPending}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
          setPresetDate(null);
        }}
        onSave={async (d) => {
          await save.mutateAsync(d);
        }}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "green" | "blue" | "amber";
}) {
  const color =
    tone === "green"
      ? "text-brand-green"
      : tone === "blue"
        ? "text-brand-blue"
        : tone === "amber"
          ? "text-amber-600"
          : "text-foreground";
  return (
    <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={"mt-1 text-base font-extrabold " + color}>{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary p-2 text-center">
      <div className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-[12px] font-bold text-foreground">{value}</div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 ring-border " +
        (active ? "bg-brand-blue text-white" : "bg-card text-muted-foreground")
      }
    >
      {label}
    </button>
  );
}

function RecordCard({
  title,
  cur,
  prev,
}: {
  title: string;
  cur: { label: string; amount: number } | null;
  prev: { label: string; amount: number } | null;
}) {
  const improve = cur && prev && prev.amount > 0 ? ((cur.amount - prev.amount) / prev.amount) * 100 : null;
  return (
    <div className="rounded-xl bg-secondary p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {cur ? (
        <>
          <div className="mt-0.5 text-sm font-extrabold text-foreground">
            {formatUGX(cur.amount)}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">{cur.label}</div>
          {prev && (
            <div className="mt-1 text-[10px] text-muted-foreground">
              Previous {formatUGX(prev.amount)}
              {improve != null && (
                <span className="ml-1 font-semibold text-brand-green">
                  🔥 +{improve.toFixed(0)}%
                </span>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="mt-1 text-[11px] text-muted-foreground">No record yet</div>
      )}
    </div>
  );
}
