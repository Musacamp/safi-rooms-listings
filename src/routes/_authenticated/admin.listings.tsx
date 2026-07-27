import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import {
  adminListListings,
  deleteListing,
  setListingFlags,
} from "@/lib/admin-listings.functions";
import { formatUGX } from "@/lib/format";
import { ROOM_TYPE_LABEL } from "@/lib/constants";
import { Pencil, Trash2, Star, Archive, ArchiveRestore, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/listings")({
  component: AdminListings,
});

function AdminListings() {
  const qc = useQueryClient();
  const listings = useQuery({
    queryKey: ["admin-listings"],
    queryFn: () => adminListListings(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-listings"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    qc.invalidateQueries({ queryKey: ["listings"] });
    qc.invalidateQueries({ queryKey: ["featured"] });
  };

  const toggle = async (
    id: string,
    patch: { is_available?: boolean; is_featured?: boolean; is_archived?: boolean },
  ) => {
    try {
      await setListingFlags({ data: { id, ...patch } });
      toast.success("Updated");
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    try {
      await deleteListing({ data: { id } });
      toast.success("Deleted");
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const term = q.trim().toLowerCase();
  const rows = (listings.data ?? []).filter((l) => {
    if (filter === "active" && l.is_archived) return false;
    if (filter === "archived" && !l.is_archived) return false;
    if (type !== "all" && l.room_type !== type) return false;
    if (!term) return true;
    const haystack = [
      l.title,
      l.location,
      l.description ?? "",
      ROOM_TYPE_LABEL[l.room_type],
      l.room_type.replace("_", " "),
      String(l.rent_ugx),
      formatUGX(l.rent_ugx),
      String(l.deposit_ugx),
      (l.amenities ?? []).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return term.split(/\s+/).every((t) => haystack.includes(t));
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">All listings</h1>
        <Link
          to="/admin/new"
          className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white"
        >
          + New listing
        </Link>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, location, type (single, double, self-contained…), price"
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

      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {(["all", ...ROOM_TYPES.map((r) => r.value)] as const).map((t) => (
          <button
            key={t}
            onClick={() => setType(t as typeof type)}
            className={
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-border " +
              (type === t ? "bg-brand-green text-white" : "bg-card text-muted-foreground")
            }
          >
            {t === "all" ? "All types" : ROOM_TYPE_LABEL[t as RoomTypeValue]}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {(["all", "active", "archived"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-medium capitalize ring-1 ring-border " +
              (filter === f ? "bg-brand-blue text-white" : "bg-card text-muted-foreground")
            }
          >
            {f}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {rows.length} {rows.length === 1 ? "result" : "results"}
      </p>

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No listings.</p>
        ) : (
          rows.map((l) => (
            <div
              key={l.id}
              className="flex flex-col gap-3 border-b border-border p-3 last:border-none sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-foreground">{l.title}</span>
                  {l.is_featured && (
                    <span className="rounded bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-blue">
                      Featured
                    </span>
                  )}
                  {l.is_archived && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Archived
                    </span>
                  )}
                  {!l.is_available && !l.is_archived && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                      Occupied
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {ROOM_TYPE_LABEL[l.room_type]} · {l.location} · {formatUGX(l.rent_ugx)} · views{" "}
                  {l.views_count} · calls {l.calls_count} · wa {l.whatsapp_count}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <IconBtn
                  title={l.is_available ? "Mark occupied" : "Mark available"}
                  onClick={() => toggle(l.id, { is_available: !l.is_available })}
                >
                  {l.is_available ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </IconBtn>
                <IconBtn
                  title={l.is_featured ? "Unfeature" : "Feature"}
                  onClick={() => toggle(l.id, { is_featured: !l.is_featured })}
                >
                  <Star
                    className={"size-4 " + (l.is_featured ? "fill-brand-blue text-brand-blue" : "")}
                  />
                </IconBtn>
                <IconBtn
                  title={l.is_archived ? "Restore" : "Archive"}
                  onClick={() => toggle(l.id, { is_archived: !l.is_archived })}
                >
                  {l.is_archived ? (
                    <ArchiveRestore className="size-4" />
                  ) : (
                    <Archive className="size-4" />
                  )}
                </IconBtn>
                <Link
                  to="/admin/edit/$id"
                  params={{ id: l.id }}
                  title="Edit"
                  className="grid size-8 place-items-center rounded-lg bg-secondary text-secondary-foreground ring-1 ring-border"
                >
                  <Pencil className="size-4" />
                </Link>
                <IconBtn title="Delete" onClick={() => remove(l.id)} destructive>
                  <Trash2 className="size-4" />
                </IconBtn>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  children,
  title,
  destructive,
}: {
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={
        "grid size-8 place-items-center rounded-lg ring-1 ring-border " +
        (destructive
          ? "bg-destructive/10 text-destructive"
          : "bg-secondary text-secondary-foreground")
      }
    >
      {children}
    </button>
  );
}
