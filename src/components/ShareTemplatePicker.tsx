import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Share2, X, Check } from "lucide-react";
import { SHARE_TEMPLATES, type ShareTemplateKey } from "@/lib/share-templates";

/**
 * Bottom sheet that previews the five share templates and shares the chosen
 * one through the native share sheet (falling back to a download).
 */
export function ShareTemplatePicker({
  open,
  onClose,
  render,
  filename,
  caption,
  title,
}: {
  open: boolean;
  onClose: () => void;
  render: (key: ShareTemplateKey) => Promise<Blob | null>;
  filename: string;
  caption?: string;
  title?: string;
}) {
  const [previews, setPreviews] = useState<Partial<Record<ShareTemplateKey, string>>>({});
  const [selected, setSelected] = useState<ShareTemplateKey>("minimal");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const urls: string[] = [];
    setLoading(true);
    (async () => {
      for (const t of SHARE_TEMPLATES) {
        const blob = await render(t.key);
        if (cancelled) break;
        if (!blob) continue;
        const url = URL.createObjectURL(blob);
        urls.push(url);
        setPreviews((p) => ({ ...p, [t.key]: url }));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
      setPreviews({});
      setLoading(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const share = async () => {
    setBusy(true);
    try {
      const blob = await render(selected);
      if (!blob) throw new Error("Could not render the image");
      const file = new File([blob], `${filename}-${selected}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], ...(caption ? { text: caption } : {}), ...(title ? { title } : {}) });
        onClose();
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Image saved — attach it in any app");
      onClose();
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string };
      if (err?.name !== "AbortError") toast.error(err?.message ?? "Could not create the image");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <button aria-label="Close" className="flex-1" onClick={onClose} />
      <div className="max-h-[86vh] overflow-y-auto rounded-t-2xl bg-background p-4 pb-6 ring-1 ring-border">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Choose a design</h2>
            <p className="text-[11px] text-muted-foreground">
              Tap a template, then share it anywhere
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {SHARE_TEMPLATES.map((t) => {
            const active = selected === t.key;
            const src = previews[t.key];
            return (
              <button
                key={t.key}
                onClick={() => setSelected(t.key)}
                className={
                  "relative w-[132px] shrink-0 overflow-hidden rounded-xl bg-card text-left ring-1 transition-all " +
                  (active ? "ring-2 ring-brand-blue" : "ring-border")
                }
              >
                <div className="grid aspect-[3/4] place-items-center bg-muted">
                  {src ? (
                    <img src={src} alt={`${t.label} template preview`} className="size-full object-cover" />
                  ) : (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {active && (
                  <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-brand-blue text-white">
                    <Check className="size-3" />
                  </span>
                )}
                <div className="p-2">
                  <div className="text-[12px] font-semibold text-foreground">{t.label}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{t.hint}</div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={share}
          disabled={busy || loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
          {busy ? "Preparing…" : loading ? "Rendering previews…" : "Share this design"}
        </button>
      </div>
    </div>
  );
}
