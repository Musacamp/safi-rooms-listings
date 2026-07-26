import { Link } from "@tanstack/react-router";
import { Phone, MessageCircle, MapPin, ShieldCheck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { formatUGX, relativeDate } from "@/lib/format";
import { ROOM_TYPE_LABEL, AMENITY_LABEL, TEL_URL, WHATSAPP_URL } from "@/lib/constants";
import { track } from "@/lib/track";
import { NotifyMeButton } from "./NotifyMeButton";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

export function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.photos?.[0];
  const amenityKeys = (listing.amenities ?? []).slice(0, 4);
  const statusChip = listing.is_available ? (
    <span className="rounded bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-blue">
      Available
    </span>
  ) : (
    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
      Occupied
    </span>
  );
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card p-3 ring-1 ring-border">
      <Link
        to="/listing/$id"
        params={{ id: listing.id }}
        className="flex min-w-0 gap-3"
        onClick={() => {
          track({ listing_id: listing.id, kind: "view" });
        }}
      >
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border">
          {cover ? (
            <img src={cover} alt={listing.title} loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              No photo
            </div>
          )}
          {listing.is_available && listing.vacancies > 0 && (
            <span className="absolute left-1 top-1 rounded-md bg-brand-green px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
              {listing.vacancies} left
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3 text-brand-green" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-green">
                Safi Verified
              </span>
            </div>
            {statusChip}
          </div>
          <h3 className="truncate text-sm font-medium text-foreground">{listing.title}</h3>
          <p className="mb-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {listing.location}
          </p>
          <div className="text-sm font-semibold text-foreground">{formatUGX(listing.rent_ugx)}</div>
          <div className="text-[10px] text-muted-foreground">
            Deposit: {formatUGX(listing.deposit_ugx)} · {ROOM_TYPE_LABEL[listing.room_type]} ·{" "}
            {relativeDate(listing.posted_at)}
          </div>
        </div>

        </div>
      </Link>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex flex-wrap gap-1">
          {amenityKeys.map((a) => (
            <span
              key={a}
              className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
            >
              {AMENITY_LABEL[a] ?? a}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          {listing.is_available ? (
            <>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => track({ listing_id: listing.id, kind: "whatsapp" })}
                aria-label="WhatsApp"
                className="grid size-9 place-items-center rounded-lg bg-brand-green text-white ring-1 ring-brand-green"
              >
                <MessageCircle className="size-4" />
              </a>
              <a
                href={TEL_URL}
                onClick={() => track({ listing_id: listing.id, kind: "call" })}
                className="flex items-center gap-2 rounded-lg bg-action px-3 py-2 text-sm font-medium text-white ring-1 ring-action"
              >
                <Phone className="size-4" /> Call Now
              </a>
            </>
          ) : (
            <NotifyMeButton listingId={listing.id} compact />
          )}
        </div>
      </div>
    </div>
  );
}
