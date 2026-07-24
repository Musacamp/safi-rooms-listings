import { useState } from "react";
import { toast } from "sonner";
import { Bell, X } from "lucide-react";
import { joinWaitlist } from "@/lib/waitlist.functions";

export function NotifyMeButton({
  listingId,
  className = "",
  compact = false,
}: {
  listingId: string;
  className?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setSaving(true);
    try {
      await joinWaitlist({ data: { listing_id: listingId, name: name.trim(), phone: phone.trim() } });
      setDone(true);
      toast.success("You're on the list");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={
          "inline-flex items-center gap-1.5 rounded-lg bg-amber-500 font-semibold text-white " +
          (compact ? "px-2.5 py-1.5 text-xs " : "px-3 py-2.5 text-sm ") +
          className
        }
      >
        <Bell className={compact ? "size-3.5" : "size-4"} /> Notify Me
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-card p-5 ring-1 ring-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-full bg-amber-500/20 text-amber-600">
                  <Bell className="size-4" />
                </div>
                <h3 className="text-base font-bold text-foreground">Notify me</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
              >
                <X className="size-4" />
              </button>
            </div>
            {done ? (
              <div className="rounded-xl bg-brand-green/10 p-4 text-sm text-foreground">
                <p className="font-semibold text-brand-green">You're on the list ✓</p>
                <p className="mt-1 text-muted-foreground">
                  We'll notify you as soon as this room becomes available again.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-3 w-full rounded-lg bg-brand-blue py-2 text-sm font-semibold text-white"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-3">
                <p className="text-xs text-muted-foreground">
                  Leave your contact and we'll notify you as soon as this room becomes available
                  again.
                </p>
                <label className="text-xs font-medium text-muted-foreground">
                  Your name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none ring-1 ring-border"
                  />
                </label>
                <label className="text-xs font-medium text-muted-foreground">
                  Phone number
                  <input
                    required
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+256 7XX XXX XXX"
                    className="mt-1 w-full rounded-lg bg-secondary px-3 py-2 text-sm text-foreground outline-none ring-1 ring-border"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-1 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Notify me"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
