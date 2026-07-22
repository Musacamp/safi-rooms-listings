# SafiRooms MVP Plan

Mobile-first rentals portal with a public client portal and a private admin dashboard. Built on the existing TanStack Start stack + Lovable Cloud (Postgres, Auth, Storage). Design follows the selected "Compact Utility List" direction (green #16a34a action, navy #1e3a8a brand, Inter, white surfaces on zinc-50).

## Enable backend

Enable Lovable Cloud (Supabase under the hood) for auth, database, and photo storage.

## Data model (migration)

Tables in `public`, all with GRANTs + RLS:

- `listings`
  - `id uuid pk`, `created_at`, `updated_at`, `posted_at`
  - `title text`, `description text`, `location text`, `room_type` (enum: single, double, self_contained, apartment, business)
  - `rent_ugx int`, `deposit_ugx int`
  - `is_available bool`, `is_featured bool`, `is_archived bool`
  - `amenities text[]` (water, electricity, parking, security, wifi, etc.)
  - `photos text[]` (public storage URLs, first = cover)
  - `views_count int`, `calls_count int`, `whatsapp_count int`
- `admins` (single-admin gate): `user_id uuid pk references auth.users`
- Optional `listing_events` for tracking (view/call/whatsapp) — logged via public server fn

RLS:
- `listings`: anon + authenticated SELECT where `is_archived = false`; admins full CRUD via `is_admin(auth.uid())` security-definer function.
- `admins`: only self-select; writes via service role only.
- Storage bucket `listing-photos` (public read, admin-only write).

## Server functions (`src/lib/*.functions.ts`)

- Public (publishable-key client): `listListings({ filters })`, `getListing(id)`, `getFeatured()`, `getNewToday()`, `getSimilar(id)`, `getStats()` (public counts), `trackEvent({ listing_id, kind })`.
- Admin (requireSupabaseAuth + is_admin check): `createListing`, `updateListing`, `deleteListing`, `toggleAvailability`, `toggleFeatured`, `archiveListing`, `uploadPhotoUrl` (returns signed upload) OR use client-side storage upload with RLS.
- `getAdminStats()` — totals, available, occupied, featured, today's views, calls, whatsapp.

## Routes

Public:
- `/` — Client portal: sticky search + filter chips (All / Single / Double / Self-Contained / Apartment / Business), Featured strip, New Today, full listing feed. URL search params drive filters (`type`, `location`, `min`, `max`, `q`).
- `/listing/$id` — Detail: photo gallery, full description, amenities, availability, big green Call Now + WhatsApp buttons calling `+256765597471`. Similar rooms below.
- `/auth` — Admin sign-in (email + password only; no public signup UI).

Admin (under `_authenticated/admin/`):
- `/admin` — Stats dashboard (7 metric cards)
- `/admin/listings` — Table with filters, status toggles, feature/archive/delete
- `/admin/listings/new` — Create form (photos upload to storage bucket)
- `/admin/listings/$id/edit` — Edit form

If the signed-in user isn't in `admins`, redirect back to `/` with a message.

## Design system (`src/styles.css`)

Add tokens matching the chosen direction:
- `--brand-green: oklch(...) /* #15803d */`, `--brand-blue: /* #1e3a8a */`, `--action: /* #16a34a */`
- Inter via `<link>` in `__root.tsx` head; `--font-sans: Inter`.
- Keep existing shadcn tokens; add semantic classes `bg-brand-green`, `bg-brand-blue`, `bg-action` through `@theme inline`.
- Add `.dark` overrides for dark mode toggle (persist in localStorage, apply in `useEffect`).

## Components

- `ListingCard` (compact, matches prototype exactly: 96px thumb, verified dot, availability chip, price/deposit, amenity dots row, green Call Now button)
- `FeaturedCard` (280px horizontal scroll)
- `FilterBar` (chips + search input, syncs with URL search params)
- `PriceRangeSheet` (bottom sheet for min/max UGX)
- `CallButton` (tel:) and `WhatsAppButton` (wa.me link), both fire `trackEvent` before navigating
- `PhotoUploader` (admin) — multi-file to `listing-photos` bucket
- `AdminNav`, `StatCard`, `ListingForm`
- `ThemeToggle`

## SEO / head

Unique `head()` per route: `/` ("Safi Verified rental rooms in Uganda"), `/listing/$id` (derives title/desc/og:image from the listing cover). og:type, twitter:card set. Semantic H1s.

## Content

Seed 6 sample listings in the schema migration so the client portal isn't empty on first load (mix of room types, locations Kampala/Soroti/Bukoto).

## Verification

Playwright screenshot at 390×844 of `/` (list + filters), `/listing/$id` (with Call Now visible), `/admin` (after sign-in). Confirm Call button opens `tel:+256765597471` and WhatsApp opens `https://wa.me/256765597471`.

## Out of scope for v1 (documented for later)

Multiple agents, landlord accounts, referrers, favourites, bookings, Google Maps, SMS notifications, expiry reminders — schema left extensible (agent_id nullable FK ready to add).

## Admin bootstrap

After you sign up once at `/auth`, I'll insert your user id into the `admins` table via the insert tool so you get dashboard access. You'll tell me the email you used.
