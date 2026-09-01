# SafiRooms crash-on-open: diagnosis and minimal fix

## What I verified

- The backend is up and the data is intact (99 listings, 58 available). No schema work is needed or planned.
- The sandbox app loads correctly: home page renders listings with zero console errors.
- The **published site** renders listings but logs a repeated browser error:
  `[Supabase] Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY`.
  The local `.env` does have `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`, so the live bundle was built **before** the backend keys were re-bound. Any browser-side backend call in that stale build throws.
- The "Something went wrong" screen is the app's single root error boundary. There is no per-route error handling: `errorComponent` exists only on the root route.
- The home page reads all three of its data sets with `useSuspenseQuery` / `useSuspenseInfiniteQuery`, and the listing page does the same. If **one** call fails (stale keys, or the backend momentarily unavailable during restore), the throw travels up to the root boundary and replaces the whole page — exactly the "loads for ~2s, then error" behaviour.

## Root cause

Two things combined:

1. The live build carries stale backend credentials, so browser-side calls fail.
2. Nothing catches that failure at route level, so a single failed request escalates into a full-page fatal error instead of a local empty/retry state.

## The fix (small, no schema, no redesign)

1. **Republish** so the current backend keys are baked into the browser bundle. This alone removes the failing calls.
2. **Add route-level error handling** to `src/routes/index.tsx` and `src/routes/listing.$id.tsx`: an `errorComponent` that keeps the SafiRooms shell and shows a short "couldn't load listings — Retry" message wired to router invalidate, instead of bubbling to the root boundary.
3. **Downgrade the non-essential home queries** (`featured`, `stats`) from suspense to plain `useQuery`, so a failure there renders the section empty rather than killing the page. The main listing feed keeps its current behaviour and is covered by the new `errorComponent`.
4. **Make the home loader non-fatal**: wrap its prefetch so a backend hiccup during SSR does not fail the route; the component then fetches and shows the retry state if needed.

No mock data, no fake loading screens, no hidden errors — failures still log to the console and are surfaced to the user as a retry state.

## Verification

- Load the home page and a listing page in a real browser; confirm rendering and a clean console.
- Simulate a failing backend request (blocked server-function response) and confirm the page shows the inline retry state, not the fatal screen.
- Confirm the existing UI, filters, share buttons, photo viewer, and admin routes are unchanged.

## Files touched

- `src/routes/index.tsx` — add `errorComponent`, soften loader, `useQuery` for featured/stats.
- `src/routes/listing.$id.tsx` — add `errorComponent`.

Nothing else; no database, storage, or migration changes.
