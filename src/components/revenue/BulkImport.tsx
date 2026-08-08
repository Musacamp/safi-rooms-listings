import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { formatUGX } from "@/lib/format";
import { REVENUE_SOURCES } from "@/lib/revenue-analytics";
import type { EarningDraft } from "@/components/revenue/AddEarningSheet";

const ALIASES: Record<string, string> = {
  client: "client_payment",
  "client payment": "client_payment",
  landlord: "landlord_payment",
  "landlord payment": "landlord_payment",
  brokerage: "brokerage_fee",
  "brokerage fee": "brokerage_fee",
  listing: "listing_fee",
  "listing fee": "listing_fee",
  management: "property_management",
  "property management": "property_management",
  advertising: "advertising",
  premium: "premium_listing",
  "premium listing": "premium_listing",
  referral: "referral",
  commission: "commission",
  other: "other",
};

type Parsed = { row: EarningDraft | null; raw: string; problem?: string };

function normDate(s: string): string | null {
  const t = s.trim();
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(`${t} ${new Date().getFullYear()}`);
  if (!Number.isNaN(d.getTime()) && /[a-z]/i.test(t))
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return null;
}

export function parseBulk(text: string): Parsed[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((raw) => {
      const parts = raw.split(/[,;\t]|\s{2,}|\s+->\s+|\s+→\s+/).map((p) => p.trim());
      const date = normDate(parts[0] ?? "");
      if (!date) return { row: null, raw, problem: "Could not read the date" };
      const amount = Math.round(Number((parts[1] ?? "").replace(/[^0-9.]/g, "")) || 0);
      if (amount <= 0) return { row: null, raw, problem: "Could not read the amount" };
      const srcRaw = (parts[2] ?? "client payment").toLowerCase();
      const source =
        REVENUE_SOURCES.find((s) => s.value === srcRaw)?.value ??
        ALIASES[srcRaw] ??
        (srcRaw ? "other" : "client_payment");
      return {
        raw,
        row: {
          entry_date: date,
          amount_ugx: amount,
          source,
          source_label: source === "other" ? (parts[2] ?? "Other") : null,
          notes: parts[3]?.trim() || null,
          transactions: 1,
        },
      };
    });
}

/** Paste box for filling January-onward history in one pass. */
export function BulkImport({
  onImport,
  saving,
}: {
  onImport: (rows: EarningDraft[]) => Promise<void> | void;
  saving?: boolean;
}) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseBulk(text), [text]);
  const good = parsed.filter((p) => p.row).map((p) => p.row!) as EarningDraft[];
  const bad = parsed.filter((p) => !p.row);
  const total = good.reduce((n, r) => n + r.amount_ugx, 0);

  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <h2 className="text-sm font-semibold text-foreground">Bulk history entry</h2>
      <p className="mb-2 text-[11px] text-muted-foreground">
        One line per entry: <code>date, amount, source, note</code> — e.g.{" "}
        <code>2026-01-05, 40000, client, Pamba brokerage</code>
      </p>
      <textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"2026-01-05, 40000, client\n2026-01-06, 80000, landlord\n12/01/2026, 150000, brokerage"}
        className="input font-mono text-[12px]"
      />
      {text.trim() && (
        <div className="mt-2 rounded-xl bg-secondary p-3 text-[11px]">
          <div className="font-semibold text-foreground">
            {good.length} row{good.length === 1 ? "" : "s"} ready · {formatUGX(total)}
          </div>
          {bad.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-amber-700 dark:text-amber-300">
              {bad.slice(0, 6).map((b, i) => (
                <li key={i}>
                  {b.problem}: <span className="font-mono">{b.raw}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <button
        onClick={async () => {
          if (!good.length) return toast.error("Nothing to import yet");
          await onImport(good);
          setText("");
        }}
        disabled={saving || good.length === 0}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        Import {good.length || ""} entries
      </button>
    </div>
  );
}
