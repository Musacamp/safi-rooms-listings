import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getListing, getSimilarListings } from "@/lib/listings.functions";
import { track } from "@/lib/track";
import { ListingCard } from "@/components/ListingCard";
import { NotifyMeButton } from "@/components/NotifyMeButton";
import { formatUGX, relativeDate } from "@/lib/format";
import {
  AMENITY_LABEL,
  ROOM_TYPE_LABEL,
  TEL_URL,
  WHATSAPP_URL,
  CONTACT_PHONE_DISPLAY,
} from "@/lib/constants";
import { ThemeToggle } from "@/components/ThemeToggle";

const listingOpts = (id: string) =>
  queryOptions({
    queryKey: ["listing", id],
    queryFn: () => getListing({ data: { id } }),
  });
const similarOpts = (id: string) =>
  queryOptions({
    queryKey: ["similar", id],
    queryFn: () => getSimilarListings({ data: { id } }),
  });

export const Route = createFileRoute("/listing/$id")({
  params: {
    parse: (p) => z.object({ id: z.string().uuid() }).parse(p),
    stringify: (p) => ({ id: p.id }),
  },
  loader: async ({ context, params }) => {
    const l = await context.queryClient.ensureQueryData(listingOpts(params.id));
    if (!l) throw notFound();
    context.queryClient.ensureQueryData(similarOpts(params.id));
  },
  head: ({ loaderData }) => {
    void loaderData;
    return {
      meta: [
        { title: `Listing · SafiRooms` },
        { name: "description", content: `View this Safi Verified listing on SafiRooms.` },
        { property: "og:title", content: "SafiRooms Listing" },
      ],
    };
  },
  component: ListingPage,
});

function ListingPage() {
  const { id } = Route.useParams();
  const { data: listing } = useSuspenseQuery(listingOpts(id));
  const { data: similar } = useQuery(similarOpts(id));
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    track({ listing_id: id, kind: "view" });
  }, [id]);

  if (!listing) return null;
  const photos = listing.photos ?? [];
  const currentPhoto = photos[photoIdx];
  const occupied = !listing.is_available;

  return (
    <div className="min-h-screen bg-surface pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-1 text-sm font-medium text-foreground"
          >
            <ArrowLeft className="size-4" /> Back
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-3xl">
        <div className="relative aspect-[4/3] w-full bg-muted sm:mt-4 sm:rounded-2xl sm:mx-4 sm:aspect-[16/9] overflow-hidden">
          {currentPhoto ? (
            <img src={currentPhoto} alt={listing.title} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-xs text-muted-foreground">
              No photos available
            </div>
          )}
          {photos.length > 1 && (
            <>
              <button
                aria-label="Previous"
                onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute left-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                aria-label="Next"
                onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white"
              >
                <ChevronRight className="size-5" />
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {photos.map((_, i) => (
                  <span
                    key={i}
                    className={
                      "size-1.5 rounded-full " +
                      (i === photoIdx ? "bg-white" : "bg-white/50")
                    }
                  />
                ))}
              </div>
            </>
          )}
          {listing.is_available && listing.vacancies > 0 && (
            <span className="absolute left-3 top-3 rounded-lg bg-brand-green px-2.5 py-1 text-xs font-semibold text-white shadow">
              {listing.vacancies} left
            </span>
          )}
        </div>


        <section className="px-4 pt-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-brand-green" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-green">
              Safi Verified
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-foreground">{listing.title}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {listing.location}
          </p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-blue">{formatUGX(listing.rent_ugx)}</span>
            <span className="text-sm text-muted-foreground">/ month</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Deposit: {formatUGX(listing.deposit_ugx)} · Posted {relativeDate(listing.posted_at)}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-brand-blue/10 px-2.5 py-1 text-xs font-medium text-brand-blue">
              {ROOM_TYPE_LABEL[listing.room_type]}
            </span>
            {listing.is_available ? (
              <span className="rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-medium text-brand-green">
                Available now
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                Occupied
              </span>
            )}
          </div>

        </section>


        <section className="px-4 pt-6">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Description</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {listing.description || "No description provided."}
          </p>
        </section>

        {listing.amenities?.length > 0 && (
          <section className="px-4 pt-6">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Amenities</h2>
            <div className="grid grid-cols-2 gap-2">
              {listing.amenities.map((a) => (
                <div
                  key={a}
                  className="rounded-lg bg-card p-2.5 text-sm text-foreground ring-1 ring-border"
                >
                  {AMENITY_LABEL[a] ?? a}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="px-4 pt-6">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            {occupied ? "This room is occupied" : "Contact agent"}
          </h2>
          <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
            {occupied ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Get notified as soon as this room becomes available again.
                </p>
                <div className="mt-3">
                  <NotifyMeButton listingId={listing.id} className="w-full justify-center" />
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-muted-foreground">SafiRooms agent</div>
                <div className="text-base font-semibold text-foreground">{CONTACT_PHONE_DISPLAY}</div>
                <div className="mt-3 flex gap-2">
                  <a
                    href={TEL_URL}
                    onClick={() => track({ listing_id: id, kind: "call" })}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-action px-3 py-2.5 text-sm font-semibold text-white"
                  >
                    <Phone className="size-4" /> Call now
                  </a>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => track({ listing_id: id, kind: "whatsapp" })}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-green px-3 py-2.5 text-sm font-semibold text-white"
                  >
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                </div>
              </>
            )}
          </div>
        </section>

        {similar && similar.length > 0 && (
          <section className="px-4 pt-6">
            <h2 className="mb-2 text-sm font-semibold text-foreground">Similar listings</h2>
            <div className="flex flex-col gap-3">
              {similar.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-2 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2">
          {occupied ? (
            <NotifyMeButton listingId={listing.id} className="flex-1 justify-center" />
          ) : (
            <>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => track({ listing_id: id, kind: "whatsapp" })}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-green px-3 py-2.5 text-sm font-semibold text-white"
              >
                <MessageCircle className="size-4" /> WhatsApp
              </a>
              <a
                href={TEL_URL}
                onClick={() => track({ listing_id: id, kind: "call" })}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-action px-3 py-2.5 text-sm font-semibold text-white"
              >
                <Phone className="size-4" /> Call agent
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
