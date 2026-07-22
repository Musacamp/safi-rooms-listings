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
  const listings = useQuery({ queryKey: ["admin-listings"], queryFn: () => adminListListings() });
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

  const rows = (listings.data ?? []).filter((l) => {
    if (filter === "active") return !l.is_archived;
    if (filter === "archived") return l.is_archived;
    return true;
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
