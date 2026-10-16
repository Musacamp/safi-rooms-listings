import { Link } from "@tanstack/react-router";
import { Phone, MessageCircle, MapPin, BadgeCheck, Bell } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { addedAgoLabel, formatUGX, isNewlyAdded, shortDate } from "@/lib/format";
import { AMENITY_LABEL, TEL_URL, WHATSAPP_URL, propertyTypeLabel } from "@/lib/constants";
import { useHydrated } from "@/hooks/use-hydrated";
import { ShareListingButton } from "@/components/ShareListingButton";
import { track } from "@/lib/track";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

export function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.photos?.[0];
  const amenities = listing.amenities ?? [];
  const shown = amenities.slice(0, 3);
  const extra = amenities.length - shown.length;
  const hydrated = useHydrated();
  const isNew = hydrated && isNewlyAdded(listing.posted_at);
  const occupied = !listing.is_available;

  const photoCount = listing.photos?.length ?? 0;

  return (
    <div className="relative overflow-hidden rounded-xl bg-card ring-1 ring-border">
      <Link to="/listing/$id" params={{ id: listing.id }} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-muted">
          {cover ? (
            <img
              suppressHydrationWarning
              src={cover}
              alt={listing.title}
              loading="lazy"
              decoding="async"
              className={"size-full object-cover " + (occupied ? "opacity-75 saturate-50" : "")}
            />
          ) : (
            <div className="grid size-full place-items-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              No photo
            </div>
          )}
          {occupied ? (
            <span className="absolute inset-x-0 top-3 bg-red-600/90 py-1 text-center text-sm font-bold uppercase tracking-widest text-white">
              Taken
            </span>
          ) : (
            listing.vacancies > 0 && (
              <span className="absolute left-2 top-2 rounded-md bg-brand-green px-2 py-0.5 text-xs font-semibold text-white">
                {listing.vacancies} left
              </span>
            )
          )}
          {photoCount > 1 && (
            <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
              1/{photoCount}
            </span>
          )}
        </div>

        <div className="px-3 pt-2.5 leading-snug">
          <div className="flex items-baseline justify-between gap-2">
            <div className="truncate text-lg font-extrabold text-foreground">
              <span className={occupied ? "text-muted-foreground line-through decoration-red-500 decoration-2" : ""}>
                {formatUGX(listing.rent_ugx)}
              </span>
              <span className="ml-0.5 text-xs font-medium text-muted-foreground">/month</span>
            </div>
            {listing.is_verified && (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold uppercase text-brand-green">
                <BadgeCheck className="size-3.5" /> Verified
              </span>
            )}
          </div>

          <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{listing.location}</span>
            <span className="shrink-0">· {propertyTypeLabel(listing)}</span>
          </p>

          <p className="truncate text-[13px] text-muted-foreground">
            Deposit {formatUGX(listing.deposit_ugx)} ·{" "}
            <span className={occupied ? "font-semibold text-red-600" : "font-semibold text-brand-green"}>
              {occupied ? "Taken" : "Available"}
            </span>
            {isNew && (
              <span className="ml-1 font-semibold text-brand-blue">
                · NEW {addedAgoLabel(listing.posted_at).replace("Added ", "· ")}
              </span>
            )}
          </p>

          {shown.length > 0 && (
            <p className="truncate text-[13px] text-foreground/80">
              {shown.map((a) => `✅ ${AMENITY_LABEL[a] ?? a}`).join(" • ")}
              {extra > 0 && <span className="text-muted-foreground"> +{extra}</span>}
            </p>
          )}
          {isNew && (
            <p className="truncate text-xs text-muted-foreground">
              Uploaded {shortDate(listing.posted_at)}
            </p>
          )}
        </div>
      </Link>

      <div className="flex gap-2 p-3">
        {!occupied ? (
          <>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => track({ listing_id: listing.id, kind: "whatsapp" })}
              aria-label={`WhatsApp about ${listing.title}`}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-green text-sm font-semibold text-white"
            >
              <MessageCircle className="size-4" /> WhatsApp
            </a>
            <a
              href={TEL_URL}
              onClick={() => track({ listing_id: listing.id, kind: "call" })}
              aria-label={`Call about ${listing.title}`}
              className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-action text-sm font-semibold text-white"
            >
              <Phone className="size-4" /> Call
            </a>
          </>
        ) : (
          <Link
            to="/listing/$id"
            params={{ id: listing.id }}
            aria-label="Notify me when available"
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground ring-1 ring-border"
          >
            <Bell className="size-4" /> Notify me
          </Link>
        )}
        <ShareListingButton listing={listing} className="min-h-11 !rounded-lg !bg-brand-blue !py-0" />
      </div>
    </div>
  );
}
