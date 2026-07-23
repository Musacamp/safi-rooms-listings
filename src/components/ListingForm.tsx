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

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, cacheControl: "3600" });
        if (error) throw error;
        uploaded.push(path);
      }
      setValues((prev) => ({ ...prev, photos: [...prev.photos, ...uploaded] }));
      toast.success(`Uploaded ${uploaded.length} photo${uploaded.length > 1 ? "s" : ""}`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (p: string) => {
    setValues((prev) => ({ ...prev, photos: prev.photos.filter((x) => x !== p) }));
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
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {values.photos.map((p) => {
              const src = /^https?:\/\//.test(p) ? p : photoUrls[p];
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
                  <button
                    type="button"
                    onClick={() => removePhoto(p)}
                    aria-label="Remove"
                    className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              );
            })}
          </div>
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
