import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { formatUGX, isNewListing, daysAgoLabel } from "@/lib/format";
import { ROOM_TYPE_LABEL } from "@/lib/constants";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

export function FeaturedCard({ listing }: { listing: Listing }) {
  const cover = listing.photos?.[0];
  const occupied = !listing.is_available;
  return (
    <Link
      to="/listing/$id"
      params={{ id: listing.id }}
      className="block min-w-[260px] overflow-hidden rounded-2xl bg-card p-2 ring-1 ring-border"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted ring-1 ring-border">
        {cover ? (
          <img
            src={cover}
            alt={listing.title}
            loading="lazy"
            suppressHydrationWarning
            className={"size-full object-cover " + (occupied ? "grayscale-[0.55]" : "")}
          />
        ) : null}
        {occupied ? (
          <span className="absolute left-2 top-2 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white shadow">
            Taken
          </span>
        ) : (
          listing.vacancies > 0 && (
            <span className="absolute left-2 top-2 rounded-md bg-brand-green px-2 py-0.5 text-[11px] font-semibold text-white shadow">
              {listing.vacancies} left
            </span>
          )
        )}
        {isNewListing(listing.posted_at) && (
          <span className="absolute right-2 top-2 rounded-md bg-brand-blue px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            New · {daysAgoLabel(listing.posted_at)}
          </span>
        )}
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
          <span className={occupied ? "line-through decoration-red-500 decoration-2 opacity-70" : ""}>
            {formatUGX(listing.rent_ugx)}
          </span>
          <span className="text-xs font-normal text-muted-foreground">/mo</span>
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {ROOM_TYPE_LABEL[listing.room_type]} · {listing.location}
        </div>
      </div>
    </Link>
  );
}
