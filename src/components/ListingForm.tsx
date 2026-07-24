import { useState } from "react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { AMENITY_LABEL, AMENITY_OPTIONS, ROOM_TYPES, type RoomTypeValue } from "@/lib/constants";
import { X, Upload, Loader2, ArrowLeft, ArrowRight, Star } from "lucide-react";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

export type ListingFormValues = {
  title: string;
  description: string;
  location: string;
  room_type: RoomTypeValue;
  rent_ugx: number;
  deposit_ugx: number;
  is_available: boolean;
  is_featured: boolean;
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
    is_available: initial?.is_available ?? true,
    is_featured: initial?.is_featured ?? false,
    amenities: initial?.amenities ?? [],
    photos: initial?.photos ?? [],
  });
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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
            <input
              type="number"
              min={0}
              value={values.deposit_ugx || ""}
              onChange={(e) => setField("deposit_ugx", Number(e.target.value) || 0)}
              className="input"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[3, 4, 5, 6].map((n) => {
                const amount = (values.rent_ugx || 0) * n;
                const active = amount > 0 && values.deposit_ugx === amount;
                return (
                  <button
                    type="button"
                    key={n}
                    onClick={() => setField("deposit_ugx", amount)}
                    disabled={!values.rent_ugx}
                    className={
                      "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-border disabled:opacity-40 " +
                      (active
                        ? "bg-brand-blue text-white"
                        : "bg-secondary text-secondary-foreground")
                    }
                  >
                    {n} months
                  </button>
                );
              })}
            </div>
          </Field>
        </div>
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
