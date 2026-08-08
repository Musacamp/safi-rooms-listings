import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactUGX, formatUGX } from "@/lib/format";
import {
  dailySeries,
  monthlySeries,
  sourceBreakdown,
  weeklySeries,
  yearlySeries,
  type RevenueEntry,
} from "@/lib/revenue-analytics";

type Grain = "daily" | "weekly" | "monthly" | "yearly";

const PIE_COLORS = [
  "#0f2a52",
  "#16803c",
  "#d4af37",
  "#2563eb",
  "#c1121f",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#4d7c0f",
  "#64748b",
];

export function RevenueCharts({ entries }: { entries: RevenueEntry[] }) {
  const [grain, setGrain] = useState<Grain>("monthly");

  const data = useMemo(() => {
    if (grain === "daily") return dailySeries(entries, 45);
    if (grain === "weekly") return weeklySeries(entries);
    if (grain === "yearly") return yearlySeries(entries);
    return monthlySeries(entries);
  }, [entries, grain]);

  const sources = useMemo(() => sourceBreakdown(entries), [entries]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Revenue over time</h2>
          <div className="flex gap-1">
            {(["daily", "weekly", "monthly", "yearly"] as Grain[]).map((g) => (
              <button
                key={g}
                onClick={() => setGrain(g)}
                className={
                  "rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize ring-1 ring-border " +
                  (grain === g ? "bg-brand-blue text-white" : "bg-secondary text-muted-foreground")
                }
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        {data.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">
            No revenue recorded yet.
          </p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {grain === "daily" ? (
                <AreaChart data={data} margin={{ left: 4, right: 4, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => compactUGX(Number(v))} />
                  <Tooltip formatter={(v) => formatUGX(Number(v))} />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#0f2a52"
                    fill="#0f2a52"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              ) : (
                <BarChart data={data} margin={{ left: 4, right: 4, top: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => compactUGX(Number(v))} />
                  <Tooltip formatter={(v) => formatUGX(Number(v))} />
                  <Bar dataKey="amount" fill="#16803c" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Where the money comes from</h2>
        {sources.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No sources recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="h-40 w-full sm:w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sources} dataKey="amount" nameKey="label" innerRadius={30} outerRadius={62}>
                    {sources.map((s, i) => (
                      <Cell key={s.source} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatUGX(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex-col gap-1.5">
              {sources.map((s, i) => (
                <div key={s.source} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="size-2.5 shrink-0 rounded"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="flex-1 truncate text-foreground">{s.label}</span>
                  <span className="font-semibold text-muted-foreground">
                    {s.pct.toFixed(1)}% · {formatUGX(s.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
