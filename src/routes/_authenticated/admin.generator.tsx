import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Share2,
  RefreshCw,
  Loader2,
  Search,
  X,
  SlidersHorizontal,
  BadgeCheck,
  Sparkles,
} from "lucide-react";
import { adminListAvailableListings } from "@/lib/admin-listings.functions";
import { buildPosterImage, formatPosterDate, type PosterRoom } from "@/lib/poster-card";
import { formatUGX } from "@/lib/format";
import {
  AMENITY_LABEL,
  AMENITY_OPTIONS,
  CONTACT_PHONE_DISPLAY,
  LISTING_CATEGORIES,
  type ListingCategoryKey,
} from "@/lib/constants";
import markAsset from "@/assets/safirooms-mark.png.asset.json";

export const Route = createFileRoute("/_authenticated/admin/generator")({
  component: Generator,
});

type Sort = "rent" | "newest" | "location";

function Generator() {
  const rooms = useQuery({
    queryKey: ["admin-available-listings"],
    queryFn: () => adminListAvailableListings(),
    refetchInterval: 60_000,
  });

  const [cat, setCat] = useState<ListingCategoryKey>("single_ordinary");
  const [sort, setSort] = useState<Sort>("rent");
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [location, setLocation] = useState("");
  const [minRent, setMinRent] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [maxDeposit, setMaxDeposit] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [addedDays, setAddedDays] = useState<0 | 5 | 30>(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [generated, setGenerated] = useState(true);
  const [sharing, setSharing] = useState(false);

  const category = LISTING_CATEGORIES.find((c) => c.key === cat)!;

  const list = useMemo(() => {
    const all = rooms.data ?? [];
    const term = q.trim().toLowerCase();
    const min = Number(minRent) || 0;
    const max = Number(maxRent) || Infinity;
    const dep = Number(maxDeposit) || Infinity;
    const since = addedDays ? Date.now() - addedDays * 86400000 : 0;

    let out = all.filter((l) => {
      if (l.is_archived || !l.is_available) return false;
      if (!category.match(l)) return false;
      if (location && !l.location.toLowerCase().includes(location.toLowerCase())) return false;
      if (l.rent_ugx < min || l.rent_ugx > max) return false;
      if (l.deposit_ugx > dep) return false;
      if (verifiedOnly && !l.is_verified) return false;
      if (since && new Date(l.posted_at).getTime() < since) return false;
      if (amenities.length && !amenities.every((a) => (l.amenities ?? []).includes(a))) return false;
      if (term) {
        const hay = [
          l.title,
          l.location,
          l.room_number ?? "",
          String(l.rent_ugx),
          formatUGX(l.rent_ugx),
          CONTACT_PHONE_DISPLAY,
          (l.amenities ?? []).map((a) => AMENITY_LABEL[a] ?? a).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!term.split(/\s+/).every((t) => hay.includes(t))) return false;
      }
      return true;
    });

    // de-duplicate: same location + rent + deposit
    const seen = new Set<string>();
    out = out.filter((l) => {
      const key = `${l.location.trim().toLowerCase()}|${l.rent_ugx}|${l.deposit_ugx}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    out.sort((a, b) => {
      if (sort === "newest") return +new Date(b.posted_at) - +new Date(a.posted_at);
      if (sort === "location") return a.location.localeCompare(b.location);
      return a.rent_ugx - b.rent_ugx;
    });
    return out;
  }, [
    rooms.data,
    category,
    q,
    location,
    minRent,
    maxRent,
    maxDeposit,
    amenities,
    addedDays,
    verifiedOnly,
    sort,
  ]);

  const posterRooms: PosterRoom[] = list.map((l) => ({
    room_number: l.room_number,
    location: l.location,
    rent_ugx: l.rent_ugx,
    deposit_ugx: l.deposit_ugx,
    amenities: l.amenities,
    distance_from_town: l.distance_from_town,
    is_available: l.is_available,
    is_verified: l.is_verified,
  }));

  const share = async () => {
    if (!posterRooms.length) {
      toast.error("No available rooms in this category");
      return;
    }
    setSharing(true);
    try {
      const blob = await buildPosterImage({ title: category.title, rooms: posterRooms });
      if (!blob) throw new Error("Could not render poster");
      const file = new File([blob], `safirooms-${category.key}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Poster saved — attach it in WhatsApp");
      window.open("https://web.whatsapp.com/", "_blank", "noreferrer");
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e?.message ?? "Could not share the poster");
    } finally {
      setSharing(false);
    }
  };

  const regenerate = async () => {
    await rooms.refetch();
    setGenerated(true);
    toast.success("Listings refreshed from the client portal");
  };

  const toggleAmenity = (a: string) =>
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-foreground">Written Listings Generator</h1>
          <p className="text-xs text-muted-foreground">
            Built only from rooms marked Available on the client portal.
          </p>
        </div>
        <button
          onClick={regenerate}
          disabled={rooms.isFetching}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {rooms.isFetching ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Regenerate
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {LISTING_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-border " +
              (cat === c.key ? "bg-brand-green text-white" : "bg-card text-muted-foreground")
            }
          >
            {c.tab}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search location, price, amenities, contact"
          className="w-full rounded-xl bg-card py-2.5 pl-9 pr-9 text-sm text-foreground ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-brand-blue"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQ("")}
            className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-secondary text-secondary-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ["rent", "Lowest rent"],
            ["newest", "Newest first"],
            ["location", "Location A–Z"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setSort(v)}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-border " +
              (sort === v ? "bg-brand-blue text-white" : "bg-card text-muted-foreground")
            }
          >
            {label}
          </button>
        ))}
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="inline-flex items-center gap-1 rounded-lg bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground ring-1 ring-border"
        >
          <SlidersHorizontal className="size-3.5" /> Filters
        </button>
        <button
          onClick={() => setVerifiedOnly((v) => !v)}
          className={
            "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-border " +
            (verifiedOnly ? "bg-brand-green text-white" : "bg-card text-muted-foreground")
          }
        >
          <BadgeCheck className="size-3.5" /> Verified only
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="Location" value={location} onChange={setLocation} placeholder="e.g. Pamba" />
            <LabeledInput label="Max deposit (UGX)" value={maxDeposit} onChange={setMaxDeposit} type="number" />
            <LabeledInput label="Min rent (UGX)" value={minRent} onChange={setMinRent} type="number" />
            <LabeledInput label="Max rent (UGX)" value={maxRent} onChange={setMaxRent} type="number" />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Date added</p>
            <div className="flex gap-1.5">
              {(
                [
                  [0, "Any time"],
                  [5, "Last 5 days"],
                  [30, "Last 30 days"],
                ] as const
              ).map(([d, label]) => (
                <button
                  key={d}
                  onClick={() => setAddedDays(d)}
                  className={
                    "rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 ring-border " +
                    (addedDays === d
                      ? "bg-brand-blue text-white"
                      : "bg-secondary text-secondary-foreground")
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Amenities</p>
            <div className="flex flex-wrap gap-1.5">
              {AMENITY_OPTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleAmenity(a)}
                  className={
                    "rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 ring-border " +
                    (amenities.includes(a)
                      ? "bg-brand-blue text-white"
                      : "bg-secondary text-secondary-foreground")
                  }
                >
                  {AMENITY_LABEL[a] ?? a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {!generated ? (
        <button
          onClick={() => setGenerated(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-action py-3 text-sm font-semibold text-white"
        >
          <Sparkles className="size-4" /> Generate Listings
        </button>
      ) : null}

      {/* Poster preview */}
      <div className="overflow-hidden rounded-2xl ring-1 ring-border">
        <div className="relative bg-brand-blue px-4 py-4 text-white">
          <h2 className="text-base font-extrabold uppercase tracking-wide">{category.title}</h2>
          <p className="text-xs opacity-85">📅 {formatPosterDate()}</p>
          <p className="text-xs opacity-85">{list.length} available</p>
        </div>
        <div className="relative bg-surface p-3">
          <img
            src={markAsset.url}
            alt=""
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 w-2/3 -translate-x-1/2 -translate-y-1/2 opacity-[0.06]"
          />
          {rooms.isLoading ? (
            <p className="relative py-8 text-center text-sm text-muted-foreground">Loading rooms…</p>
          ) : list.length === 0 ? (
            <p className="relative py-8 text-center text-sm text-muted-foreground">
              No available rooms match this category and filters.
            </p>
          ) : (
            <div className="relative flex flex-col gap-2">
              {list.map((l) => (
                <div key={l.id} className="rounded-xl bg-card/95 p-3 ring-1 ring-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-base font-extrabold text-brand-blue">
                      {formatUGX(l.rent_ugx)}
                      <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                        /month
                      </span>
                    </div>
                    {l.is_verified && (
                      <span className="shrink-0 rounded-full bg-brand-green px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Safi Verified
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    📍 {l.location}
                    {l.room_number ? ` · Room ${l.room_number}` : ""}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {[
                      l.deposit_ugx > 0 ? `Deposit ${formatUGX(l.deposit_ugx)}` : null,
                      l.distance_from_town ? `${l.distance_from_town} from town` : null,
                      "Available",
                    ]
                      .filter(Boolean)
                      .join("  ·  ")}
                  </div>
                  {(l.amenities ?? []).length > 0 && (
                    <div className="mt-1 text-[11px] font-medium text-brand-green">
                      {(l.amenities ?? [])
                        .slice(0, 4)
                        .map((a) => `${AMENITY_LABEL[a] ?? a} ✅`)
                        .join("  ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-brand-blue px-4 py-4 text-white">
          <p className="text-sm font-extrabold">🏡 SafiRooms</p>
          <p className="text-xs opacity-85">"Let there be space for everyone."</p>
          <p className="mt-1 text-xs font-semibold opacity-90">
            Call / WhatsApp {CONTACT_PHONE_DISPLAY}
          </p>
          <p className="mt-1 text-[10px] opacity-70">
            Brokerage fees apply when securing a room through SafiRooms. Thank you for trusting
            SafiRooms.
          </p>
        </div>
      </div>

      <button
        onClick={share}
        disabled={sharing || list.length === 0}
        className="sticky bottom-4 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-green py-3.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
      >
        {sharing ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
        {sharing ? "Rendering poster…" : "Share to WhatsApp (image only)"}
      </button>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    </label>
  );
}
