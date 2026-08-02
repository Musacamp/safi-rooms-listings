import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, X } from "lucide-react";
import { getLocationSuggestions } from "@/lib/listings.functions";
import { splitLocations } from "@/lib/search-parse";

export function LocationSearch({
  value,
  onChange,
}: {
  value: string[];
  onChange: (locations: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const { data } = useQuery({
    queryKey: ["locations"],
    queryFn: () => getLocationSuggestions(),
    staleTime: 5 * 60_000,
  });

  const all = data ?? [];
  const term = text.split(/[,+]/).pop()?.trim().toLowerCase() ?? "";
  const suggestions = useMemo(() => {
    const pool = term
      ? all.filter((l) => l.location.toLowerCase().includes(term))
      : all.slice(0, 6);
    return pool.filter((l) => !value.some((v) => v.toLowerCase() === l.location.toLowerCase())).slice(0, 6);
  }, [all, term, value]);

  const add = (names: string[]) => {
    const next = [...value];
    for (const n of names) {
      if (n && !next.some((v) => v.toLowerCase() === n.toLowerCase())) next.push(n);
    }
    onChange(next.slice(0, 8));
    setText("");
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-card px-2.5 py-2 ring-1 ring-border">
        <MapPin className="size-4 shrink-0 text-brand-blue" />
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-2 py-0.5 text-[11px] font-semibold text-brand-blue"
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={() => onChange(value.filter((x) => x !== v))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(splitLocations(text));
            }
            if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          placeholder={value.length ? "Add another area" : "Search area — Pamba, Oderai…"}
          className="min-w-[8rem] flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
        />
        {(value.length > 0 || text) && (
          <button
            type="button"
            onClick={() => {
              setText("");
              onChange([]);
            }}
            aria-label="Clear locations"
            className="grid size-5 place-items-center rounded-full bg-secondary text-secondary-foreground"
          >
            <X className="size-3" />
          </button>
        )}
      </div>

      {focused && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl bg-card shadow-lg ring-1 ring-border">
          {!term && (
            <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Popular areas
            </div>
          )}
          {suggestions.map((s) => (
            <button
              key={s.location}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add([s.location])}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-foreground hover:bg-secondary"
            >
              <span className="truncate">{s.location}</span>
              <span className="text-[10px] text-muted-foreground">{s.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
