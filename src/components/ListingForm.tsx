import { useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { AMENITY_LABEL, AMENITY_OPTIONS, ROOM_TYPES, type RoomTypeValue } from "@/lib/constants";
import { formatUGX } from "@/lib/format";
import { X, Upload, Loader2, ArrowLeft, ArrowRight, Star, ChevronDown } from "lucide-react";


type Listing = Database["public"]["Tables"]["listings"]["Row"];

export type ListingFormValues = {
  title: string;
  description: string;
  location: string;
  room_type: RoomTypeValue;
  rent_ugx: number;
  deposit_ugx: number;
  vacancies: number;
  is_available: boolean;
  is_featured: boolean;
  is_self_contained: boolean;
  is_verified: boolean;
  room_number: string | null;
  distance_from_town: string | null;
  amenities: string[];
  photos: string[];

};


const BUCKET = "listing-photos";

export function ListingForm({
  initial,
  onSubmit,
}: {
  initial?: Listing;
  onSubmit: (v: ListingFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<ListingFormValues>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    location: initial?.location ?? "",
    room_type: (initial?.room_type ?? "single") as RoomTypeValue,
    rent_ugx: initial?.rent_ugx ?? 0,
    deposit_ugx: initial?.deposit_ugx ?? 0,
    vacancies: initial?.vacancies ?? 1,
    is_available: initial?.is_available ?? true,

    is_featured: initial?.is_featured ?? false,
    is_self_contained: initial?.is_self_contained ?? false,
    is_verified: initial?.is_verified ?? true,
    room_number: initial?.room_number ?? null,
    distance_from_town: initial?.distance_from_town ?? null,
    amenities: initial?.amenities ?? [],
    photos: initial?.photos ?? [],

  });
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [customDeposit, setCustomDeposit] = useState("");


  // Resolve preview URLs for storage-path photos
  const ensurePreview = async (paths: string[]) => {
    const need = paths.filter((p) => !/^https?:\/\//.test(p) && !photoUrls[p]);
    if (!need.length) return;
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(need, 3600);
    setPhotoUrls((prev) => {
      const next = { ...prev };
      data?.forEach((d, i) => {
        if (d.signedUrl) next[need[i]] = d.signedUrl;
      });
      return next;
    });
  };
  // fire and forget
  if (values.photos.length) ensurePreview(values.photos);

  const setField = <K extends keyof ListingFormValues>(k: K, v: ListingFormValues[K]) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const toggleAmenity = (a: string) => {
    setValues((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(a)
        ? prev.amenities.filter((x) => x !== a)
        : [...prev.amenities, a],
    }));
  };

  const compressImage = async (file: File): Promise<{ blob: Blob; ext: string; type: string }> => {
    if (!file.type.startsWith("image/")) {
      return { blob: file, ext: file.name.split(".").pop() ?? "bin", type: file.type };
    }
    try {
      const bitmap = await createImageBitmap(file);
      const MAX = 1600;
      const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("compress failed"))), "image/webp", 0.82),
      );
      if (blob.size < file.size) return { blob, ext: "webp", type: "image/webp" };
    } catch {
      // fall through to original
    }
    return { blob: file, ext: file.name.split(".").pop() ?? "jpg", type: file.type };
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const list = Array.from(files);
    try {
      const results = await Promise.all(
        list.map(async (file) => {
          const { blob, ext, type } = await compressImage(file);
          const path = `${crypto.randomUUID()}.${ext}`;
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(path, blob, { contentType: type, cacheControl: "3600" });
          if (error) throw error;
          return path;
        }),
      );
      setValues((prev) => ({ ...prev, photos: [...prev.photos, ...results] }));
      toast.success(`Uploaded ${results.length} photo${results.length > 1 ? "s" : ""}`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (p: string) => {
    setValues((prev) => ({ ...prev, photos: prev.photos.filter((x) => x !== p) }));
  };

  const movePhoto = (idx: number, dir: -1 | 1) => {
    setValues((prev) => {
      const next = [...prev.photos];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...prev, photos: next };
    });
  };

  const makeCover = (idx: number) => {
    setValues((prev) => {
      if (idx === 0) return prev;
      const next = [...prev.photos];
      const [p] = next.splice(idx, 1);
      next.unshift(p);
      return { ...prev, photos: next };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim() || !values.location.trim()) {
      toast.error("Title and location are required");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <Field label="Title">
          <input
            required
            value={values.title}
            onChange={(e) => setField("title", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Location">
          <input
            required
            placeholder="e.g. Ntinda, Kampala"
            value={values.location}
            onChange={(e) => setField("location", e.target.value)}
            className="input"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rent (UGX / mo)">
            <input
              type="number"
              min={0}
              required
              value={values.rent_ugx || ""}
              onChange={(e) => setField("rent_ugx", Number(e.target.value) || 0)}
              className="input"
            />
          </Field>
          <Field label="Deposit (UGX)">
            <button
              type="button"
              onClick={() => setDepositOpen(true)}
              className="input flex items-center justify-between text-left"
            >
              <span className={values.deposit_ugx ? "" : "text-muted-foreground"}>
                {values.deposit_ugx ? formatUGX(values.deposit_ugx) : "Tap to choose deposit"}
              </span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
            {values.deposit_ugx > 0 && values.rent_ugx > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                ≈ {(values.deposit_ugx / values.rent_ugx).toFixed(1)} months rent
              </p>
            )}
          </Field>
        </div>
        <Field label="Vacancies (rooms left in compound)">
          <input
            type="number"
            min={0}
            value={values.vacancies}
            onChange={(e) => setField("vacancies", Math.max(0, Number(e.target.value) || 0))}
            className="input"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setField("vacancies", n)}
                className={
                  "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-border " +
                  (values.vacancies === n
                    ? "bg-brand-blue text-white"
                    : "bg-secondary text-secondary-foreground")
                }
              >
                {n} left
              </button>
            ))}
          </div>
        </Field>

        <Field label="Room type">
          <select
            value={values.room_type}
            onChange={(e) => setField("room_type", e.target.value as RoomTypeValue)}
            className="input"
          >
            {ROOM_TYPES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description">
          <textarea
            rows={5}
            value={values.description}
            onChange={(e) => setField("description", e.target.value)}
            className="input"
          />
        </Field>
      </div>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Amenities
        </div>
        <div className="flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((a) => {
            const on = values.amenities.includes(a);
            return (
              <button
                type="button"
                key={a}
                onClick={() => toggleAmenity(a)}
                className={
                  "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-border " +
                  (on ? "bg-brand-blue text-white" : "bg-secondary text-secondary-foreground")
                }
              >
                {AMENITY_LABEL[a] ?? a}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Photos
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white">
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {uploading ? "Uploading..." : "Add photos"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => uploadFiles(e.target.files)}
            />
          </label>
        </div>
        {values.photos.length === 0 ? (
          <p className="text-xs text-muted-foreground">No photos yet.</p>
        ) : (
          <>
            <p className="mb-2 text-[11px] text-muted-foreground">
              First photo is the cover. Use arrows to reorder or ★ to set cover.
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {values.photos.map((p, idx) => {
                const src = /^https?:\/\//.test(p) ? p : photoUrls[p];
                const isCover = idx === 0;
                return (
                  <div
                    key={p}
                    className="relative aspect-square overflow-hidden rounded-lg bg-muted ring-1 ring-border"
                  >
                    {src ? (
                      <img src={src} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="grid size-full place-items-center text-[10px] text-muted-foreground">
                        Loading...
                      </div>
                    )}
                    {isCover && (
                      <span className="absolute left-1 top-1 rounded-full bg-brand-green px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(p)}
                      aria-label="Remove"
                      className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X className="size-3" />
                    </button>
                    <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={() => movePhoto(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Move left"
                        className="grid size-6 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30"
                      >
                        <ArrowLeft className="size-3" />
                      </button>
                      {!isCover && (
                        <button
                          type="button"
                          onClick={() => makeCover(idx)}
                          aria-label="Set as cover"
                          className="grid size-6 place-items-center rounded-full bg-black/60 text-white"
                        >
                          <Star className="size-3" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => movePhoto(idx, 1)}
                        disabled={idx === values.photos.length - 1}
                        aria-label="Move right"
                        className="grid size-6 place-items-center rounded-full bg-black/60 text-white disabled:opacity-30"
                      >
                        <ArrowRight className="size-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <label className="flex items-center justify-between py-1">
          <span className="text-sm text-foreground">Available</span>
          <input
            type="checkbox"
            checked={values.is_available}
            onChange={(e) => setField("is_available", e.target.checked)}
            className="size-4 accent-brand-blue"
          />
        </label>
        <label className="flex items-center justify-between py-1">
          <span className="text-sm text-foreground">Featured (show on home)</span>
          <input
            type="checkbox"
            checked={values.is_featured}
            onChange={(e) => setField("is_featured", e.target.checked)}
            className="size-4 accent-brand-blue"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-action py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Saving..." : "Save listing"}
      </button>

      {depositOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          onClick={() => setDepositOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl bg-card p-4 ring-1 ring-border sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Choose deposit</h3>
              <button
                type="button"
                onClick={() => setDepositOpen(false)}
                className="grid size-8 place-items-center rounded-lg bg-secondary text-secondary-foreground"
                aria-label="Close"
              >
                <X className="size-4" />
              </button>
            </div>
            {values.rent_ugx > 0 ? (
              <div className="flex flex-col gap-2">
                {[3, 4, 5, 6].map((n) => {
                  const amount = values.rent_ugx * n;
                  const active = values.deposit_ugx === amount;
                  return (
                    <button
                      type="button"
                      key={n}
                      onClick={() => {
                        setField("deposit_ugx", amount);
                        setDepositOpen(false);
                      }}
                      className={
                        "flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium ring-1 ring-border " +
                        (active
                          ? "bg-brand-blue text-white"
                          : "bg-secondary text-secondary-foreground")
                      }
                    >
                      <span>{n} months</span>
                      <span className="font-semibold">{formatUGX(amount)}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter the monthly rent first, then choose a deposit.
              </p>
            )}
            <div className="mt-3 border-t border-border pt-3">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Custom amount (UGX)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={customDeposit}
                  onChange={(e) => setCustomDeposit(e.target.value)}
                  className="input"
                />
                <button
                  type="button"
                  onClick={() => {
                    setField("deposit_ugx", Math.max(0, Number(customDeposit) || 0));
                    setCustomDeposit("");
                    setDepositOpen(false);
                  }}
                  className="shrink-0 rounded-lg bg-brand-blue px-3 py-2 text-sm font-semibold text-white"
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          background: var(--secondary);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--foreground);
          outline: none;
          border: 1px solid var(--border);
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
