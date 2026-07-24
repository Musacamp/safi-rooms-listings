import { useNavigate, useSearch } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X, Sparkles } from "lucide-react";
import { useState } from "react";
import { ROOM_TYPES } from "@/lib/constants";

export function FilterBar() {
  const nav = useNavigate({ from: "/" });
  const search = useSearch({ from: "/" }) as {
    type?: string;
    q?: string;
    location?: string;
    min?: number;
    max?: number;
    recent?: boolean;
  };
  const [open, setOpen] = useState(false);
  const [loc, setLoc] = useState(search.location ?? "");
  const [min, setMin] = useState(search.min?.toString() ?? "");
  const [max, setMax] = useState(search.max?.toString() ?? "");

  const setChip = (type: string | undefined) => {
    nav({
      search: (prev: Record<string, unknown>) =>
        ({ ...prev, type, recent: undefined }) as never,
    });
  };
  const setRecent = () => {
    nav({
      search: (prev: Record<string, unknown>) =>
        ({ ...prev, recent: true, type: undefined }) as never,
    });
  };
  const setQ = (q: string) => {
    nav({ search: (prev: Record<string, unknown>) => ({ ...prev, q: q || undefined }) as never });
  };
  const applyAdvanced = () => {
    nav({
      search: (prev: Record<string, unknown>) =>
        ({
          ...prev,
          location: loc || undefined,
          min: min ? Number(min) : undefined,
          max: max ? Number(max) : undefined,
        }) as never,
    });
    setOpen(false);
  };
  const clearAll = () => {
    setLoc("");
    setMin("");
    setMax("");
    nav({ search: {} as never });
  };

  const activeType = search.type;
  const isRecent = !!search.recent;
  const hasAdvanced = !!(search.location || search.min || search.max || search.q || search.recent);

  return (
    <>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary px-3 py-2 ring-1 ring-border">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search location or keyword..."
              defaultValue={search.q ?? ""}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Filters"
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-blue text-white ring-1 ring-brand-blue"
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>
        {hasAdvanced && (
          <button
            type="button"
            onClick={clearAll}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-blue"
          >
            <X className="size-3" /> Clear filters
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        <Chip active={!activeType && !isRecent} onClick={() => setChip(undefined)}>
          All Rooms
        </Chip>
        <Chip active={isRecent} onClick={setRecent}>
          <span className="inline-flex items-center gap-1">
            <Sparkles className="size-3.5" /> Newly Added
          </span>
        </Chip>
        {ROOM_TYPES.map((t) => (
          <Chip key={t.value} active={activeType === t.value} onClick={() => setChip(t.value)}>
            {t.label}
          </Chip>
        ))}
      </div>
      {open && (
        <div className="mx-4 mb-3 rounded-2xl bg-card p-4 ring-1 ring-border">
          <label className="mb-2 block text-xs font-medium text-muted-foreground">Location</label>
          <input
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            placeholder="e.g. Kampala, Soroti, Ntinda"
            className="w-full rounded-lg bg-secondary px-3 py-2 text-sm outline-none ring-1 ring-border"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Min rent (UGX)
              </label>
              <input
                inputMode="numeric"
                value={min}
                onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))}
                placeholder="100000"
                className="w-full rounded-lg bg-secondary px-3 py-2 text-sm outline-none ring-1 ring-border"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Max rent (UGX)
              </label>
              <input
                inputMode="numeric"
                value={max}
                onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))}
                placeholder="500000"
                className="w-full rounded-lg bg-secondary px-3 py-2 text-sm outline-none ring-1 ring-border"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={applyAdvanced}
            className="mt-4 w-full rounded-lg bg-action py-2.5 text-sm font-semibold text-white"
          >
            Apply filters
          </button>
        </div>
      )}
    </>
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
        "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors " +
        (active
          ? "bg-brand-blue text-white"
          : "bg-card text-muted-foreground ring-1 ring-border")
      }
    >
      {children}
    </button>
  );
}
