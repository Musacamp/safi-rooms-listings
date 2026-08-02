import { useNavigate, useSearch } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X, Sparkles, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { AMENITY_LABEL, AMENITY_OPTIONS, PRICE_BANDS, PROPERTY_TYPES } from "@/lib/constants";
import { LocationSearch } from "./LocationSearch";

type HomeSearch = {
  type?: string;
  q?: string;
  loc?: string;
  band?: string;
  am?: string;
  avail?: string;
  verified?: boolean;
  recent?: boolean;
};

export function FilterBar() {
  const nav = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" }) as HomeSearch;
  const [open, setOpen] = useState(false);

  const patch = (next: Partial<HomeSearch>) =>
    nav({ search: (prev: Record<string, unknown>) => ({ ...prev, ...next }) as never });

  const locations = search.loc ? search.loc.split(",").filter(Boolean) : [];
  const amenities = search.am ? search.am.split(",").filter(Boolean) : [];

  const setType = (type: string | undefined) => patch({ type, recent: undefined });
  const toggleAmenity = (a: string) => {
    const next = amenities.includes(a) ? amenities.filter((x) => x !== a) : [...amenities, a];
    patch({ am: next.length ? next.join(",") : undefined });
  };

  const activeCount =
    (search.type ? 1 : 0) +
    (locations.length ? 1 : 0) +
    (search.band ? 1 : 0) +
    amenities.length +
    (search.avail ? 1 : 0) +
    (search.verified ? 1 : 0) +
    (search.q ? 1 : 0) +
    (search.recent ? 1 : 0);

  return (
    <div className="px-3 pb-2 pt-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-card px-2.5 py-2 ring-1 ring-border">
          <Search className="size-4 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search rooms, keyword…"
            defaultValue={search.q ?? ""}
            onChange={(e) => patch({ q: e.target.value || undefined })}
            className="w-full bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Filters"
          className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-brand-blue text-white"
        >
          <SlidersHorizontal className="size-4" />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-brand-green text-[9px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <div className="mt-2">
        <LocationSearch
          value={locations}
          onChange={(next) => patch({ loc: next.length ? next.join(",") : undefined })}
        />
      </div>

      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        <Chip active={!search.type && !search.recent} onClick={() => setType(undefined)}>
          All
        </Chip>
        <Chip active={!!search.recent} onClick={() => patch({ recent: true, type: undefined })}>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3" /> New
          </span>
        </Chip>
        {PROPERTY_TYPES.map((t) => (
          <Chip key={t.key} active={search.type === t.key} onClick={() => setType(t.key)}>
            {t.chip}
          </Chip>
        ))}
      </div>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => nav({ search: {} as never })}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-brand-blue"
        >
          <X className="size-3" /> Clear all filters
        </button>
      )}

      {open && (
        <div className="mt-2 rounded-xl bg-card p-3 ring-1 ring-border">
          <Group label="Price">
            <div className="flex flex-wrap gap-1.5">
              {PRICE_BANDS.map((b) => (
                <Pill
                  key={b.key}
                  active={search.band === b.key}
                  onClick={() => patch({ band: search.band === b.key ? undefined : b.key })}
                >
                  {b.label}
                </Pill>
              ))}
            </div>
          </Group>

          <Group label="Amenities">
            <div className="flex flex-wrap gap-1.5">
              {AMENITY_OPTIONS.map((a) => (
                <Pill key={a} active={amenities.includes(a)} onClick={() => toggleAmenity(a)}>
                  {AMENITY_LABEL[a] ?? a}
                </Pill>
              ))}
            </div>
          </Group>

          <Group label="Availability">
            <div className="flex flex-wrap gap-1.5">
              {[
                { k: "available", l: "Available now" },
                { k: "occupied", l: "Reserved / Occupied" },
              ].map((o) => (
                <Pill
                  key={o.k}
                  active={search.avail === o.k}
                  onClick={() => patch({ avail: search.avail === o.k ? undefined : o.k })}
                >
                  {o.l}
                </Pill>
              ))}
            </div>
          </Group>

          <Group label="Verification">
            <Pill
              active={!!search.verified}
              onClick={() => patch({ verified: search.verified ? undefined : true })}
            >
              <span className="inline-flex items-center gap-1">
                <BadgeCheck className="size-3" /> Safi Verified only
              </span>
            </Pill>
          </Group>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full rounded-lg bg-action py-2 text-[13px] font-semibold text-white"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-border " +
        (active ? "bg-brand-blue text-white" : "bg-secondary text-secondary-foreground")
      }
    >
      {children}
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[12px] font-medium transition-colors " +
        (active ? "bg-brand-blue text-white" : "bg-card text-muted-foreground ring-1 ring-border")
      }
    >
      {children}
    </button>
  );
}
