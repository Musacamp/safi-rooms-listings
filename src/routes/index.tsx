import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";
import { ShieldCheck, Phone, MessageCircle, Lock } from "lucide-react";
import { getFeaturedListings, getPublicStats, listListings } from "@/lib/listings.functions";
import { logSiteVisitOnce } from "@/lib/track";
import { ListingCard } from "@/components/ListingCard";
import { FeaturedCard } from "@/components/FeaturedCard";
import { FilterBar } from "@/components/FilterBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CONTACT_PHONE_DISPLAY, TEL_URL, WHATSAPP_URL } from "@/lib/constants";

const searchSchema = z.object({
  type: z.string().optional(),
  q: z.string().optional(),
  location: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  recent: z.boolean().optional(),
});

const featuredOpts = queryOptions({
  queryKey: ["featured"],
  queryFn: () => getFeaturedListings(),
});
const statsOpts = queryOptions({
  queryKey: ["stats"],
  queryFn: () => getPublicStats(),
});
const listingsOpts = (params: z.infer<typeof searchSchema>) =>
  queryOptions({
    queryKey: ["listings", params],
    queryFn: () => listListings({ data: params }),
  });

export const Route = createFileRoute("/")({
  validateSearch: (s) => searchSchema.parse(s),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.ensureQueryData(featuredOpts);
    context.queryClient.ensureQueryData(statsOpts);
    context.queryClient.ensureQueryData(listingsOpts(deps));
  },
  head: () => ({
    meta: [
      { title: "SafiRooms — Safi Verified rooms in Uganda" },
      {
        name: "description",
        content:
          "Browse trusted rental listings across Uganda. Filter by room type, location, and rent. Call or WhatsApp to book instantly.",
      },
      { property: "og:title", content: "SafiRooms — Safi Verified rooms in Uganda" },
      {
        property: "og:description",
        content:
          "Browse trusted rental listings across Uganda. Filter by room type, location, and rent. Call or WhatsApp to book instantly.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const { data: featured } = useSuspenseQuery(featuredOpts);
  const { data: stats } = useSuspenseQuery(statsOpts);
  const { data: listings } = useQuery(listingsOpts(search));

  useEffect(() => {
    logSiteVisitOnce();
  }, []);

  const rows = listings ?? [];

  return (
    <div className="min-h-screen bg-surface pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-brand-blue text-sm font-bold text-white">
                S
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-bold text-foreground">SafiRooms</div>
                <div className="flex items-center gap-1 text-[10px] font-medium text-brand-green">
                  <ShieldCheck className="size-3" /> Safi Verified rentals
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/admin"
              aria-label="Admin sign in"
              className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium text-secondary-foreground ring-1 ring-border"
            >
              <Lock className="size-3.5" /> Admin
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl">
        <section className="px-4 pt-4">
          <div className="rounded-2xl bg-gradient-to-br from-brand-blue to-brand-blue/80 p-4 text-white">
            <h1 className="text-lg font-bold leading-tight">Find your next home in Uganda</h1>
            <p className="mt-1 text-xs text-white/80">
              {stats.total} listings · {stats.available} available now
            </p>
            <div className="mt-3 flex gap-2">
              <a
                href={TEL_URL}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium text-white backdrop-blur"
              >
                <Phone className="size-3.5" /> {CONTACT_PHONE_DISPLAY}
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-green px-3 py-2 text-xs font-semibold text-white"
              >
                <MessageCircle className="size-3.5" /> WhatsApp
              </a>
            </div>
          </div>
        </section>

        <FilterBar />

        {featured.length > 0 && !search.type && !search.q && !search.recent && (
          <section className="mb-3">
            <div className="mb-2 flex items-center justify-between px-4">
              <h2 className="text-sm font-semibold text-foreground">Featured</h2>
              <span className="text-[10px] text-muted-foreground">Handpicked by our team</span>
            </div>
            <div className="flex gap-3 overflow-x-auto px-4 pb-3 no-scrollbar">
              {featured.map((l) => (
                <FeaturedCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}

        <section className="px-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              {search.recent ? "Newly Added · " : ""}
              {rows.length} {rows.length === 1 ? "listing" : "listings"}
              {search.recent ? " in the last 5 days" : ""}
            </h2>
          </div>
          {rows.length === 0 ? (
            <div className="rounded-2xl bg-card p-8 text-center ring-1 ring-border">
              <p className="text-sm text-muted-foreground">
                No listings match your filters. Try clearing them.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rows.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-2 backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-3xl gap-2">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-green px-3 py-2.5 text-sm font-semibold text-white"
          >
            <MessageCircle className="size-4" /> WhatsApp
          </a>
          <a
            href={TEL_URL}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-action px-3 py-2.5 text-sm font-semibold text-white"
          >
            <Phone className="size-4" /> Call agent
          </a>
        </div>
      </div>
    </div>
  );
}
