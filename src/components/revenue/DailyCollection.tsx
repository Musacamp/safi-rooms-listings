import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SkipForward,
} from "lucide-react";
import { formatUGX } from "@/lib/format";

type Entry = { entry_date: string; amount_ugx: number };

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Every day of `year` from Jan 1 up to today (leap years handled by Date). */
function daysOfYear(year: number): string[] {
  const out: string[] = [];
  const today = new Date();
  const end = today.getFullYear() === year ? today : new Date(year, 11, 31);
  const d = new Date(year, 0, 1);
  while (d <= end) {
    out.push(iso(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function prettyDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
}

/**
 * Sequential daily collection entry. Starts at January 1 of the current year,
 * jumps to the first day that has no amount saved yet, and advances one day at
 * a time. Saving a day that already has a record updates it in place.
 */
export function DailyCollection({
  entries,
  onSave,
  saving,
}: {
  entries: Entry[];
  onSave: (input: { entry_date: string; amount_ugx: number }) => Promise<unknown>;
  saving?: boolean;
}) {
  const year = new Date().getFullYear();
  const days = useMemo(() => daysOfYear(year), [year]);

  const byDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entries) m.set(e.entry_date, (m.get(e.entry_date) ?? 0) + e.amount_ugx);
    return m;
  }, [entries]);

  const yearEntries = useMemo(
    () => [...byDate.entries()].filter(([d]) => d.startsWith(String(year))),
    [byDate, year],
  );

  const firstGap = useMemo(() => {
    const i = days.findIndex((d) => !byDate.has(d));
    return i === -1 ? days.length - 1 : i;
  }, [days, byDate]);

  const [idx, setIdx] = useState(firstGap);
  const [touched, setTouched] = useState(false);
  const [amount, setAmount] = useState("");

  // Land on the first uncompleted day until the admin starts navigating.
  useEffect(() => {
    if (!touched) setIdx(firstGap);
  }, [firstGap, touched]);

  const date = days[Math.min(idx, days.length - 1)] ?? iso(new Date());
  const savedFor = byDate.get(date);

  // Load the saved amount for the day being shown (no duplicate creation).
  useEffect(() => {
    setAmount(savedFor != null ? String(savedFor) : "");
  }, [date, savedFor]);

  const totalYear = yearEntries.reduce((n, [, v]) => n + v, 0);
  const recorded = yearEntries.length;
  const avg = recorded ? Math.round(totalYear / recorded) : 0;

  const monthTotals = useMemo(() => {
    const t = Array.from({ length: 12 }, () => 0);
    for (const [d, v] of yearEntries) {
      const m = Number(d.slice(5, 7)) - 1;
      if (m >= 0 && m < 12) t[m] += v;
    }
    return t;
  }, [yearEntries]);

  const go = (delta: number) => {
    setTouched(true);
    setIdx((i) => Math.max(0, Math.min(days.length - 1, i + delta)));
  };

  const save = async (advance: boolean) => {
    const value = Math.round(Number(amount.replace(/[^0-9.]/g, "")) || 0);
    if (amount.trim() === "") return toast.error("Enter the amount collected (0 is allowed)");
    try {
      await onSave({ entry_date: date, amount_ugx: value });
      toast.success(`${prettyDate(date)} saved`);
      if (advance) go(1);
    } catch (e) {
      toast.error((e as { message?: string })?.message ?? "Could not save that day");
    }
  };

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <CalendarDays className="size-4 text-brand-blue" /> Daily collection
        </h2>
        <span className="text-[11px] text-muted-foreground">
          Day {idx + 1} of {days.length} · {year}
        </span>
      </div>

      <div className="mt-3 rounded-xl bg-secondary p-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => go(-1)}
            disabled={idx === 0}
            aria-label="Previous day"
            className="grid size-9 place-items-center rounded-lg bg-background text-foreground ring-1 ring-border disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="text-center">
            <div className="text-base font-bold text-foreground">{prettyDate(date)}</div>
            <div className="text-[11px] text-muted-foreground">
              {savedFor != null ? (
                <span className="inline-flex items-center gap-1 font-semibold text-brand-green">
                  <Check className="size-3" /> Saved {formatUGX(savedFor)}
                </span>
              ) : (
                "Not recorded yet"
              )}
            </div>
          </div>
          <button
            onClick={() => go(1)}
            disabled={idx >= days.length - 1}
            aria-label="Next day"
            className="grid size-9 place-items-center rounded-lg bg-background text-foreground ring-1 ring-border disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
            Total collected on this day (UGX)
          </label>
          <input
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save(true);
            }}
            placeholder="0"
            className="input text-lg font-bold"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[20000, 50000, 100000, 200000, 500000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(String((Number(amount) || 0) + v))}
                className="rounded-lg bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground ring-1 ring-border"
              >
                +{v / 1000}k
              </button>
            ))}
            <button
              onClick={() => setAmount("0")}
              className="rounded-lg bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border"
            >
              Nothing
            </button>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => void save(true)}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Save &amp; next
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Skip this day"
            className="inline-flex items-center gap-1.5 rounded-xl bg-background px-3 py-3 text-sm font-medium text-foreground ring-1 ring-border"
          >
            <SkipForward className="size-4" /> Skip
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Year to date" value={formatUGX(totalYear)} />
        <Stat label="Days recorded" value={`${recorded} / ${days.length}`} />
        <Stat label="Average / day" value={formatUGX(avg)} />
        <Stat label="This day" value={formatUGX(savedFor ?? 0)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {monthTotals.map((v, i) => (
          <button
            key={i}
            onClick={() => {
              setTouched(true);
              const target = days.findIndex((d) => Number(d.slice(5, 7)) === i + 1);
              if (target >= 0) setIdx(target);
            }}
            className="rounded-lg bg-secondary px-2 py-1.5 text-left"
          >
            <div className="text-[10px] font-medium text-muted-foreground">{MONTHS[i]}</div>
            <div className="text-[12px] font-bold text-foreground">{formatUGX(v)}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-secondary px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-[13px] font-bold text-foreground">{value}</div>
    </div>
  );
}
