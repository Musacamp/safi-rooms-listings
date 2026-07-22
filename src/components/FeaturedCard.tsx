import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { formatUGX } from "@/lib/format";
import { ROOM_TYPE_LABEL } from "@/lib/constants";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

export function FeaturedCard({ listing }: { listing: Listing }) {
  const cover = listing.photos?.[0];
  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className="block min-w-[260px] overflow-hidden rounded-2xl bg-card p-2 ring-1 ring-border"
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border">
        {cover ? (
          <img src={cover} alt={listing.title} loading="lazy" className="size-full object-cover" />
        ) : null}
      </div>
      <div className="p-2">
        <div className="mb-1 flex items-center gap-1.5">
          <ShieldCheck className="size-3 text-brand-green" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-green">
            Safi Verified
          </span>
        </div>
        <div className="truncate text-sm font-medium text-foreground">{listing.title}</div>
        <div className="text-base font-semibold text-brand-blue">
          {formatUGX(listing.rent_ugx)}
          <span className="text-xs font-normal text-muted-foreground">/mo</span>
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {ROOM_TYPE_LABEL[listing.room_type]} · {listing.location}
        </div>
      </div>
    </Link>
  );
}
