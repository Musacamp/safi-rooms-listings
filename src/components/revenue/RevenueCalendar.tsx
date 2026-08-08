import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatUGX } from "@/lib/format";
import {
  SOURCE_LABEL,
  TONE_CLASS,
  byDay,
  dayTone,
  domPatterns,
  parseYmd,
  sum,
  ymd,
  type RevenueEntry,
} from "@/lib/revenue-analytics";

/** Month calendar coloured by each day's earning performance. */
export function RevenueCalendar({
  entries,
  onPickDate,
}: {
  entries: RevenueEntry[];
  onPickDate?: (date: string) => void;
}) {
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [selected, setSelected] = useState<string | null>(null);

  const days = useMemo(() => byDay(entries), [entries]);
  const stats = useMemo(() => {
    const active = [...days.values()].filter((d) => d.amount > 0);
    const avg = active.length ? sum(entries) / active.length : 0;
    const record = Math.max(0, ...active.map((d) => d.amount));
    return { avg, record };
  }, [days, entries]);
  const strongDoms = useMemo(() => {
    const p = domPatterns(entries);
    return p.enough ? new Set(p.strong.map((s) => s.dom)) : new Set<number>();
  }, [entries]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const monthTotal = [...days.values()]
    .filter((d) => d.date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .reduce((n, d) => n + d.amount, 0);

  const picked = selected ? days.get(selected) : null;

  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="mb-3 flex items-center justify-between">
        <button
          aria-label="Previous month"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="text-center">
          <div className="text-sm font-bold text-foreground">
            {first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </div>
          <div className="text-[11px] text-muted-foreground">{formatUGX(monthTotal)}</div>
        </div>
        <button
          aria-label="Next month"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[9px] font-semibold uppercase text-muted-foreground">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: total }).map((_, i) => {
          const dnum = i + 1;
          const key = ymd(new Date(year, month, dnum));
          const bucket = days.get(key);
          const tone = dayTone(bucket?.amount ?? 0, stats.avg, stats.record);
          return (
            <button
              key={key}
              onClick={() => setSelected(key === selected ? null : key)}
              className={
                "relative aspect-square rounded-lg text-[11px] font-semibold ring-1 ring-border " +
                TONE_CLASS[tone] +
                (selected === key ? " outline outline-2 outline-brand-blue" : "")
              }
            >
              {dnum}
              {strongDoms.has(dnum) && (
                <span className="absolute right-1 top-0.5 text-[8px] leading-none">★</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[9px] text-muted-foreground">
        {(
          [
            ["none", "No income"],
            ["low", "Low"],
            ["average", "Average"],
            ["high", "High"],
            ["record", "Record"],
          ] as const
        ).map(([tone, label]) => (
          <span key={tone} className="inline-flex items-center gap-1">
            <span className={"size-2.5 rounded " + TONE_CLASS[tone]} /> {label}
          </span>
        ))}
        <span>★ historically strong date</span>
      </div>

      {selected && (
        <div className="mt-3 rounded-xl bg-secondary p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-foreground">
              {parseYmd(selected).toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
            {onPickDate && (
              <button
                onClick={() => onPickDate(selected)}
                className="rounded-lg bg-brand-green px-2.5 py-1 text-[11px] font-semibold text-white"
              >
                Add earning
              </button>
            )}
          </div>
          {picked ? (
            <>
              <div className="mt-1 text-lg font-extrabold text-brand-blue">
                {formatUGX(picked.amount)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {picked.transactions} transaction{picked.transactions === 1 ? "" : "s"} ·{" "}
                {picked.entries.length} entr{picked.entries.length === 1 ? "y" : "ies"}
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {picked.entries.map((e) => (
                  <div key={e.id} className="rounded-lg bg-card p-2 text-[11px] ring-1 ring-border">
                    <span className="font-semibold text-foreground">
                      {formatUGX(e.amount_ugx)}
                    </span>{" "}
                    · {e.source === "other" ? (e.source_label ?? "Other") : SOURCE_LABEL[e.source]}
                    {e.notes ? <div className="text-muted-foreground">{e.notes}</div> : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-1 text-[11px] text-muted-foreground">No earnings recorded this day.</p>
          )}
        </div>
      )}
    </div>
  );
}
