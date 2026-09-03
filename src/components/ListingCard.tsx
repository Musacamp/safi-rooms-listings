import { Link } from "@tanstack/react-router";
import { Phone, MessageCircle, MapPin, BadgeCheck, Bell } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { addedAgoLabel, formatUGX, isNewlyAdded, shortDate } from "@/lib/format";
import { AMENITY_LABEL, TEL_URL, WHATSAPP_URL, propertyTypeLabel } from "@/lib/constants";
import { useHydrated } from "@/hooks/use-hydrated";
import { ShareListingButton } from "@/components/ShareListingButton";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

export function ListingCard({ listing }: { listing: Listing }) {
  const cover = listing.photos?.[0];
  const amenities = listing.amenities ?? [];
  const shown = amenities.slice(0, 3);
  const extra = amenities.length - shown.length;
  const hydrated = useHydrated();
  const isNew = hydrated && isNewlyAdded(listing.posted_at);
  const occupied = !listing.is_available;

  return (
    <div className="relative flex gap-2.5 rounded-xl bg-card p-2 ring-1 ring-border">
      <Link
        to="/listing/$id"
        params={{ id: listing.id }}
        className="min-w-0 flex flex-1 gap-2.5"
      >
        <div className="relative size-[74px] shrink-0 overflow-hidden rounded-lg bg-muted">
          {cover ? (
            <img
              suppressHydrationWarning
              src={cover}
              alt={listing.title}
              width={74}
              height={74}
              loading="lazy"
              decoding="async"
              className={"size-full object-cover " + (occupied ? "opacity-75 saturate-50" : "")}
            />
          ) : (
            <div className="grid size-full place-items-center text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
              No photo
            </div>
          )}
          {occupied ? (
            <span className="absolute left-0.5 top-0.5 rounded bg-red-600 px-1 py-px text-[9px] font-bold uppercase leading-tight tracking-wide text-white">
              Taken
            </span>
          ) : (
            listing.vacancies > 0 && (
              <span className="absolute left-0.5 top-0.5 rounded bg-brand-green px-1 py-px text-[9px] font-semibold leading-tight text-white">
                {listing.vacancies} left
              </span>
            )
          )}
        </div>

        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-baseline justify-between gap-2">
            <div className="truncate text-[15px] font-extrabold text-foreground">
              <span className={occupied ? "text-muted-foreground line-through decoration-red-500 decoration-2" : ""}>
                {formatUGX(listing.rent_ugx)}
              </span>
              <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">/month</span>
            </div>
            {listing.is_verified && (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[9px] font-semibold uppercase text-brand-green">
                <BadgeCheck className="size-3" /> Verified
              </span>
            )}
          </div>

          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{listing.location}</span>
            <span className="shrink-0">· {propertyTypeLabel(listing)}</span>
          </p>

          <p className="truncate text-[11px] text-muted-foreground">
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
            <p className="truncate text-[11px] text-foreground/80">
              {shown.map((a) => `✅ ${AMENITY_LABEL[a] ?? a}`).join(" • ")}
              {extra > 0 && <span className="text-muted-foreground"> +{extra}</span>}
            </p>
          )}
          {isNew && (
            <p className="truncate text-[10px] text-muted-foreground">
              Uploaded {shortDate(listing.posted_at)}
            </p>
          )}
        </div>
      </Link>

      <div className="flex shrink-0 flex-col justify-center gap-1">
        {!occupied ? (
          <>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              onClick={() => track({ listing_id: listing.id, kind: "whatsapp" })}
              aria-label={`WhatsApp about ${listing.title}`}
              className="grid size-8 place-items-center rounded-lg bg-brand-green text-white"
            >
              <MessageCircle className="size-4" />
            </a>
            <a
              href={TEL_URL}
              onClick={() => track({ listing_id: listing.id, kind: "call" })}
              aria-label={`Call about ${listing.title}`}
              className="grid size-8 place-items-center rounded-lg bg-action text-white"
            >
              <Phone className="size-4" />
            </a>
          </>
        ) : (
          <Link
            to="/listing/$id"
            params={{ id: listing.id }}
            aria-label="Notify me when available"
            className="grid size-8 place-items-center rounded-lg bg-secondary text-secondary-foreground ring-1 ring-border"
          >
            <Bell className="size-4" />
          </Link>
        )}
        <ShareListingButton listing={listing} iconOnly />
      </div>
    </div>
  );
}
