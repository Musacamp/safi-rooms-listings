/** Pure analytics over stored revenue entries. No fabricated data. */

export type RevenueEntry = {
  id: string;
  entry_date: string;
  amount_ugx: number;
  source: string;
  source_label: string | null;
  notes: string | null;
  transactions: number;
  created_at: string;
};

export const REVENUE_SOURCES = [
  { value: "client_payment", label: "Client payment", group: "Main" },
  { value: "landlord_payment", label: "Landlord payment", group: "Main" },
  { value: "brokerage_fee", label: "Brokerage fee", group: "Fees" },
  { value: "listing_fee", label: "Room listing fee", group: "Fees" },
  { value: "property_management", label: "Property management fee", group: "Fees" },
  { value: "advertising", label: "Advertising", group: "Other services" },
  { value: "premium_listing", label: "Premium listing", group: "Other services" },
  { value: "referral", label: "Referral", group: "Other services" },
  { value: "commission", label: "Commission", group: "Other services" },
  { value: "other", label: "Other", group: "Other services" },
] as const;

export type RevenueSourceValue = (typeof REVENUE_SOURCES)[number]["value"];

export const SOURCE_LABEL: Record<string, string> = Object.fromEntries(
  REVENUE_SOURCES.map((s) => [s.value, s.label]),
);

/* ----------------------------- date helpers ----------------------------- */

export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Monday-based start of week. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function monthKey(s: string): string {
  return s.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export function dayLabel(s: string): string {
  return parseYmd(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

/* ------------------------------ aggregates ------------------------------ */

export type DayBucket = {
  date: string;
  amount: number;
  transactions: number;
  entries: RevenueEntry[];
};

export function byDay(entries: RevenueEntry[]): Map<string, DayBucket> {
  const m = new Map<string, DayBucket>();
  for (const e of entries) {
    const b =
      m.get(e.entry_date) ??
      ({ date: e.entry_date, amount: 0, transactions: 0, entries: [] } as DayBucket);
    b.amount += e.amount_ugx;
    b.transactions += e.transactions;
    b.entries.push(e);
    m.set(e.entry_date, b);
  }
  return m;
}

export function sum(entries: RevenueEntry[]): number {
  return entries.reduce((n, e) => n + e.amount_ugx, 0);
}

function inRange(e: RevenueEntry, from: string, to: string) {
  return e.entry_date >= from && e.entry_date <= to;
}

export function rangeTotal(entries: RevenueEntry[], from: string, to: string): number {
  return sum(entries.filter((e) => inRange(e, from, to)));
}

export type Kpis = {
  total: number;
  month: number;
  prevMonth: number;
  week: number;
  prevWeek: number;
  today: number;
  activeDays: number;
  avgDaily: number;
  growthPct: number | null;
  entryCount: number;
  transactions: number;
};

export function kpis(entries: RevenueEntry[], now = new Date()): Kpis {
  const today = ymd(now);
  const mStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const mEnd = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const pmStart = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const pmEnd = ymd(new Date(now.getFullYear(), now.getMonth(), 0));
  const wStart = startOfWeek(now);
  const pw = addDays(wStart, -7);

  const days = byDay(entries);
  const activeDays = [...days.values()].filter((d) => d.amount > 0).length;
  const total = sum(entries);
  const month = rangeTotal(entries, mStart, mEnd);
  const prevMonth = rangeTotal(entries, pmStart, pmEnd);

  return {
    total,
    month,
    prevMonth,
    week: rangeTotal(entries, ymd(wStart), ymd(addDays(wStart, 6))),
    prevWeek: rangeTotal(entries, ymd(pw), ymd(addDays(pw, 6))),
    today: rangeTotal(entries, today, today),
    activeDays,
    avgDaily: activeDays ? Math.round(total / activeDays) : 0,
    growthPct: prevMonth > 0 ? ((month - prevMonth) / prevMonth) * 100 : null,
    entryCount: entries.length,
    transactions: entries.reduce((n, e) => n + e.transactions, 0),
  };
}

/* -------------------------------- series -------------------------------- */

export type Point = { key: string; label: string; amount: number };

export function dailySeries(entries: RevenueEntry[], days = 60): Point[] {
  const map = byDay(entries);
  const dates = [...map.keys()].sort();
  if (!dates.length) return [];
  const last = parseYmd(dates[dates.length - 1]);
  const out: Point[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(last, -i);
    const k = ymd(d);
    out.push({ key: k, label: dayLabel(k), amount: map.get(k)?.amount ?? 0 });
  }
  return out;
}

export function weeklySeries(entries: RevenueEntry[]): Point[] {
  const m = new Map<string, number>();
  for (const e of entries) {
    const k = ymd(startOfWeek(parseYmd(e.entry_date)));
    m.set(k, (m.get(k) ?? 0) + e.amount_ugx);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, amount]) => ({ key: k, label: `w/c ${dayLabel(k)}`, amount }));
}

export function monthlySeries(entries: RevenueEntry[]): Point[] {
  const m = new Map<string, number>();
  for (const e of entries) {
    const k = monthKey(e.entry_date);
    m.set(k, (m.get(k) ?? 0) + e.amount_ugx);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, amount]) => ({ key: k, label: monthLabel(k), amount }));
}

export function yearlySeries(entries: RevenueEntry[]): Point[] {
  const m = new Map<string, number>();
  for (const e of entries) {
    const k = e.entry_date.slice(0, 4);
    m.set(k, (m.get(k) ?? 0) + e.amount_ugx);
  }
  return [...m.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, amount]) => ({ key: k, label: k, amount }));
}

/* -------------------------------- records ------------------------------- */

export type Record0 = { label: string; amount: number } | null;
export type Records = {
  day: Record0;
  prevDay: Record0;
  week: Record0;
  prevWeek: Record0;
  month: Record0;
  prevMonth: Record0;
  year: Record0;
  prevYear: Record0;
};

function topTwo(points: { label: string; amount: number }[]): [Record0, Record0] {
  const sorted = [...points].filter((p) => p.amount > 0).sort((a, b) => b.amount - a.amount);
  return [sorted[0] ?? null, sorted[1] ?? null];
}

/** Best rolling 7-day window across the recorded range. */
export function bestRollingWeek(entries: RevenueEntry[]): { label: string; amount: number }[] {
  const map = byDay(entries);
  const dates = [...map.keys()].sort();
  if (!dates.length) return [];
  const first = parseYmd(dates[0]);
  const last = parseYmd(dates[dates.length - 1]);
  const out: { label: string; amount: number }[] = [];
  for (let d = new Date(first); d <= last; d = addDays(d, 1)) {
    let amount = 0;
    for (let i = 0; i < 7; i++) amount += map.get(ymd(addDays(d, i)))?.amount ?? 0;
    out.push({ label: `${dayLabel(ymd(d))} – ${dayLabel(ymd(addDays(d, 6)))}`, amount });
  }
  return out;
}

export function records(entries: RevenueEntry[]): Records {
  const days = [...byDay(entries).values()].map((d) => ({
    label: parseYmd(d.date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    amount: d.amount,
  }));
  const [day, prevDay] = topTwo(days);
  const [week, prevWeek] = topTwo(bestRollingWeek(entries));
  const [month, prevMonth] = topTwo(monthlySeries(entries));
  const [year, prevYear] = topTwo(yearlySeries(entries));
  return { day, prevDay, week, prevWeek, month, prevMonth, year, prevYear };
}

/* -------------------------------- streaks ------------------------------- */

export type Streaks = {
  current: number;
  best: number;
  activeDays: number;
  zeroDays: number;
};

export function streaks(entries: RevenueEntry[], now = new Date()): Streaks {
  const map = byDay(entries);
  const dates = [...map.keys()].filter((k) => (map.get(k)?.amount ?? 0) > 0).sort();
  if (!dates.length) return { current: 0, best: 0, activeDays: 0, zeroDays: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = parseYmd(dates[i - 1]);
    const cur = parseYmd(dates[i]);
    run = ymd(addDays(prev, 1)) === ymd(cur) ? run + 1 : 1;
    best = Math.max(best, run);
  }

  // current streak counts back from today (or yesterday, if today has no entry yet)
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!(map.get(ymd(cursor))?.amount ?? 0)) cursor = addDays(cursor, -1);
  let current = 0;
  while ((map.get(ymd(cursor))?.amount ?? 0) > 0) {
    current++;
    cursor = addDays(cursor, -1);
  }

  const first = parseYmd(dates[0]);
  const last = parseYmd(dates[dates.length - 1]);
  const span = Math.round((last.getTime() - first.getTime()) / 86_400_000) + 1;
  return { current, best, activeDays: dates.length, zeroDays: Math.max(0, span - dates.length) };
}

/* ------------------------------- sources -------------------------------- */

export type SourceSlice = { source: string; label: string; amount: number; pct: number };

export function sourceBreakdown(entries: RevenueEntry[]): SourceSlice[] {
  const total = sum(entries) || 1;
  const m = new Map<string, number>();
  for (const e of entries) {
    const key = e.source === "other" && e.source_label ? `other:${e.source_label}` : e.source;
    m.set(key, (m.get(key) ?? 0) + e.amount_ugx);
  }
  return [...m.entries()]
    .map(([key, amount]) => ({
      source: key,
      label: key.startsWith("other:") ? key.slice(6) : (SOURCE_LABEL[key] ?? key),
      amount,
      pct: (amount / total) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/* ---------------------- month-over-month comparison --------------------- */

export type MonthRow = { key: string; label: string; amount: number; changePct: number | null };

export function monthComparison(entries: RevenueEntry[]): MonthRow[] {
  const series = monthlySeries(entries);
  return series.map((p, i) => {
    const prev = series[i - 1]?.amount ?? 0;
    return {
      ...p,
      changePct: i > 0 && prev > 0 ? ((p.amount - prev) / prev) * 100 : null,
    };
  });
}

/* -------------------- date-of-month performance patterns ---------------- */

export type DomPattern = {
  dom: number;
  avg: number;
  occurrences: number;
  vsAvgPct: number;
};

export const MIN_PATTERN_DAYS = 20;

export function domPatterns(entries: RevenueEntry[]): {
  enough: boolean;
  activeDays: number;
  overallAvg: number;
  strong: DomPattern[];
} {
  const days = [...byDay(entries).values()].filter((d) => d.amount > 0);
  const overallAvg = days.length ? sum(entries) / days.length : 0;
  const groups = new Map<number, number[]>();
  for (const d of days) {
    const dom = parseYmd(d.date).getDate();
    groups.set(dom, [...(groups.get(dom) ?? []), d.amount]);
  }
  const strong = [...groups.entries()]
    .map(([dom, amounts]) => {
      const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      return {
        dom,
        avg: Math.round(avg),
        occurrences: amounts.length,
        vsAvgPct: overallAvg ? ((avg - overallAvg) / overallAvg) * 100 : 0,
      };
    })
    .filter((p) => p.occurrences >= 2 && p.vsAvgPct >= 15)
    .sort((a, b) => b.vsAvgPct - a.vsAvgPct);

  return {
    enough: days.length >= MIN_PATTERN_DAYS,
    activeDays: days.length,
    overallAvg: Math.round(overallAvg),
    strong,
  };
}

/** Days of week that historically perform above average. */
export function dowPatterns(entries: RevenueEntry[]): { label: string; vsAvgPct: number }[] {
  const days = [...byDay(entries).values()].filter((d) => d.amount > 0);
  if (days.length < MIN_PATTERN_DAYS) return [];
  const overall = days.reduce((n, d) => n + d.amount, 0) / days.length;
  const groups = new Map<number, number[]>();
  for (const d of days) {
    const k = parseYmd(d.date).getDay();
    groups.set(k, [...(groups.get(k) ?? []), d.amount]);
  }
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return [...groups.entries()]
    .map(([k, a]) => ({
      label: names[k],
      vsAvgPct: overall ? ((a.reduce((x, y) => x + y, 0) / a.length - overall) / overall) * 100 : 0,
    }))
    .filter((p) => p.vsAvgPct >= 10)
    .sort((a, b) => b.vsAvgPct - a.vsAvgPct);
}

/* -------------------------- calendar performance ------------------------ */

export type DayTone = "none" | "low" | "average" | "high" | "record";

export function dayTone(amount: number, avg: number, record: number): DayTone {
  if (amount <= 0) return "none";
  if (record > 0 && amount >= record) return "record";
  if (amount >= avg * 1.5) return "high";
  if (amount >= avg * 0.75) return "average";
  return "low";
}

export const TONE_CLASS: Record<DayTone, string> = {
  none: "bg-secondary text-muted-foreground",
  low: "bg-amber-500/25 text-amber-900 dark:text-amber-200",
  average: "bg-brand-blue/25 text-brand-blue",
  high: "bg-brand-green/30 text-brand-green",
  record: "bg-brand-green text-white",
};

/* ------------------------------- insights ------------------------------- */

export function insights(
  entries: RevenueEntry[],
  targets: { period: string; amount_ugx: number }[],
  now = new Date(),
): string[] {
  const out: string[] = [];
  if (!entries.length) return ["No revenue recorded yet — add your first earning to see insights."];

  const money = (n: number) => `UGX ${Math.round(n).toLocaleString("en-US")}`;
  const k = kpis(entries, now);
  const months = monthlySeries(entries);
  const best = [...months].sort((a, b) => b.amount - a.amount)[0];
  const srcs = sourceBreakdown(entries);
  const st = streaks(entries, now);
  const r = records(entries);

  if (best) out.push(`Your strongest month so far is ${best.label} at ${money(best.amount)}.`);
  if (srcs[0])
    out.push(
      `${srcs[0].label} is your largest revenue source at ${srcs[0].pct.toFixed(1)}% of all recorded income.`,
    );
  if (k.growthPct != null)
    out.push(
      k.growthPct >= 0
        ? `This month is ${k.growthPct.toFixed(1)}% above last month.`
        : `This month is ${Math.abs(k.growthPct).toFixed(1)}% below last month.`,
    );
  out.push(`You have recorded ${k.activeDays} earning days, averaging ${money(k.avgDaily)} each.`);
  if (st.current > 1) out.push(`You are on a ${st.current}-day earning streak (best: ${st.best}).`);
  if (r.day) out.push(`Your best single day remains ${money(r.day.amount)} on ${r.day.label}.`);

  const monthTarget = targets.find((t) => t.period === "monthly")?.amount_ugx ?? 0;
  if (monthTarget > 0) {
    const pct = (k.month / monthTarget) * 100;
    out.push(
      pct >= 100
        ? `You have passed this month's target of ${money(monthTarget)}.`
        : `This month is at ${pct.toFixed(1)}% of your ${money(monthTarget)} target.`,
    );
  }

  const dom = domPatterns(entries);
  if (dom.enough && dom.strong[0])
    out.push(
      `The ${ordinal(dom.strong[0].dom)} has historically performed ${dom.strong[0].vsAvgPct.toFixed(0)}% above your average.`,
    );

  const halves = entries.reduce(
    (acc, e) => {
      const d = parseYmd(e.entry_date).getDate();
      if (d <= 15) acc.first += e.amount_ugx;
      else acc.second += e.amount_ugx;
      return acc;
    },
    { first: 0, second: 0 },
  );
  if (halves.first || halves.second)
    out.push(
      halves.second > halves.first
        ? "You have historically earned more in the second half of the month."
        : "You have historically earned more in the first half of the month.",
    );

  return out;
}
