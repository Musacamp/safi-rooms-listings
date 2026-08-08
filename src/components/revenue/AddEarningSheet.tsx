import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, X, Check } from "lucide-react";
import { REVENUE_SOURCES, ymd, type RevenueEntry } from "@/lib/revenue-analytics";

export type EarningDraft = {
  entry_date: string;
  amount_ugx: number;
  source: string;
  source_label: string | null;
  notes: string | null;
  transactions: number;
};

/**
 * Fast add/edit sheet: date -> amount -> source popup -> optional note.
 */
export function AddEarningSheet({
  open,
  onClose,
  onSave,
  editing,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (draft: EarningDraft) => Promise<void> | void;
  editing?: RevenueEntry | null;
  saving?: boolean;
}) {
  const [date, setDate] = useState(ymd(new Date()));
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [notes, setNotes] = useState("");
  const [tx, setTx] = useState("1");
  const [askSource, setAskSource] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.entry_date);
      setAmount(String(editing.amount_ugx));
      setSource(editing.source);
      setCustom(editing.source_label ?? "");
      setNotes(editing.notes ?? "");
      setTx(String(editing.transactions));
    } else {
      setDate(ymd(new Date()));
      setAmount("");
      setSource(null);
      setCustom("");
      setNotes("");
      setTx("1");
    }
    setAskSource(false);
  }, [open, editing]);

  if (!open) return null;

  const amountNum = Math.round(Number(amount.replace(/[^0-9.]/g, "")) || 0);

  const submit = async () => {
    if (!date) return toast.error("Pick a date");
    if (amountNum <= 0) return toast.error("Enter the amount received");
    if (!source) {
      setAskSource(true);
      return;
    }
    if (source === "other" && !custom.trim()) {
      setAskSource(true);
      return toast.error("Describe the source");
    }
    await onSave({
      entry_date: date,
      amount_ugx: amountNum,
      source,
      source_label: source === "other" ? custom.trim() : null,
      notes: notes.trim() || null,
      transactions: Math.max(1, Number(tx) || 1),
    });
  };

  const sourceLabel = source
    ? source === "other"
      ? custom.trim() || "Other"
      : REVENUE_SOURCES.find((s) => s.value === source)?.label
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <button aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="max-h-[92vh] overflow-y-auto rounded-t-2xl bg-background p-4 pb-6 ring-1 ring-border">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground">
            {editing ? "Edit earning" : "Add earning"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Date</span>
            <input
              type="date"
              value={date}
              max={ymd(new Date())}
              onChange={(e) => setDate(e.target.value)}
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Amount (UGX)
            </span>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              placeholder="40000"
              onChange={(e) => setAmount(e.target.value)}
              className="input text-lg font-bold"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {[20000, 40000, 50000, 80000, 100000, 150000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className="rounded-full bg-secondary px-3 py-1.5 text-[11px] font-medium text-secondary-foreground ring-1 ring-border"
              >
                {v.toLocaleString("en-US")}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setAskSource(true)}
            className="flex items-center justify-between rounded-xl bg-card px-3 py-3 text-sm ring-1 ring-border"
          >
            <span className="text-muted-foreground">Payment source</span>
            <span className="font-semibold text-foreground">{sourceLabel ?? "Tap to choose"}</span>
          </button>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Transactions on this entry
            </span>
            <input
              type="number"
              min={1}
              value={tx}
              onChange={(e) => setTx(e.target.value)}
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-muted-foreground">
              Notes (optional)
            </span>
            <textarea
              value={notes}
              rows={2}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Room 4 brokerage, Pamba"
              className="input"
            />
          </label>

          <button
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green py-3.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {editing ? "Save changes" : "Save earning"}
          </button>
        </div>
      </div>

      {askSource && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60 p-0 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-background p-4 pb-6 ring-1 ring-border">
            <h3 className="text-sm font-bold text-foreground">
              Where was this payment received from?
            </h3>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Stored with the transaction for revenue-source analytics.
            </p>
            <div className="flex flex-col gap-1.5">
              {REVENUE_SOURCES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => {
                    setSource(s.value);
                    if (s.value !== "other") setAskSource(false);
                  }}
                  className={
                    "flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium ring-1 ring-border " +
                    (source === s.value
                      ? "bg-brand-blue text-white"
                      : "bg-card text-foreground")
                  }
                >
                  {s.label}
                  <span className="text-[10px] opacity-70">{s.group}</span>
                </button>
              ))}
            </div>
            {source === "other" && (
              <div className="mt-3">
                <input
                  autoFocus
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Describe the source"
                  className="input"
                />
                <button
                  onClick={() => custom.trim() && setAskSource(false)}
                  className="mt-2 w-full rounded-xl bg-brand-green py-3 text-sm font-semibold text-white"
                >
                  Use this source
                </button>
              </div>
            )}
            <button
              onClick={() => setAskSource(false)}
              className="mt-3 w-full rounded-xl bg-secondary py-3 text-sm font-medium text-secondary-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
