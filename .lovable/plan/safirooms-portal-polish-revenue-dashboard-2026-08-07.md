# SafiRooms: Portal Polish + Revenue Dashboard

Everything below ships in one build, in this order.

## 1. Occupied rooms marked clearly

- Red **TAKEN** badge on the top-left of the listing photo (card, featured card, detail page).
- Rent price stays visible with a single line struck through it, plus the "Occupied" label.
- Occupied rooms remain in search results and are never hidden — just visually marked, with the Notify Me action instead of Call/WhatsApp.

## 2. Smarter generator search

The generator's natural-language box gains:

- Price ranges: "between 100k and 300k", "100,000-300,000", "under 250k", "from 200k".
- Combined filters in one phrase: location list + property type + price range + newly added.
  Example: "Self-contained rooms in Pamba between UGX 100,000-300,000".
- Explicit control chips next to the box (location, type, min/max price, newly added) that stay in sync with what was typed, so you can fine-tune without retyping.

## 3. Newly added category (5 days)

- A "Newly Added" category in both the client portal filter and the generator, driven by upload date.
- Each new listing shows a NEW badge, "Added X days ago", and the exact date.
- Rooms drop out automatically once they pass 5 days — no manual cleanup.

## 4. Five share image templates

When sharing a single room or a generated list, you get five designs to preview and pick from before sharing:

1. Minimal — white, lots of space, one strong photo.
2. Premium — dark navy with gold accents.
3. Social — bold color blocks, big type, story-sized.
4. WhatsApp — compact, high-contrast, readable as a thumbnail.
5. Luxury — full-bleed photo, elegant serif overlay.

All five keep the SafiRooms mark, rent, location, amenities, verified badge, brokerage-fee reminder and the scannable QR/deep link back to the filtered portal. A picker shows thumbnails; tap one, then share to any app via the native share sheet.

## 5. Full-screen photo gallery

On a room page: swipeable image slider. Tapping a photo opens a full-screen viewer with pinch-to-zoom, double-tap zoom, swipe between photos, swipe-down to close, and chrome hidden while viewing (only a counter and close button).

## 6. Gesture navigation

- Client portal: swipe in from the left edge opens the admin portal (signed-in admins only; others see nothing).
- Admin portal: swipe in from the right edge returns to the client portal.
- Both animate smoothly with a drag-follow reveal and respect reduced-motion settings.

## 7. SafiRooms Revenue dashboard

New "Revenue" item in the admin menu opening a dedicated dashboard.

**Recording**
- Add an entry: pick a date, amount, and a required source popup (Client payments, Landlord payments, Listing fees, Brokerage fees, Property management, Advertising, Premium listings, Other with custom text), plus optional notes and transaction count.
- Edit and delete any past entry.
- Multiple entries per day allowed; each source is stored separately.

**Bulk import for your January-onward history**
- A paste box that accepts lines or CSV (`date, amount, source, notes`), previews the parsed rows with any problems flagged, then saves them all at once.

**Analytics and graphs**
- KPI cards: today, this week, this month, this year, lifetime.
- Charts: daily line, weekly bars, monthly bars, yearly totals, and a growth-trend line.
- Source breakdown showing which source earns most.

**Records board**
- Best day, week, month and year, each showing the current record, the previous record, and the percentage improvement. Records stay highlighted until beaten.

**Revenue calendar**
- Month calendar with each day colored green (excellent) / blue (good) / yellow (average) / red (low) against your own averages. Tapping a day shows amount, sources, notes and transaction count. Historically strong days are highlighted.

**AI revenue intelligence**
- Computed predictions: highest-earning days of week, weeks and months, phrased plainly, e.g. "This Tuesday historically performs 82% better than average." Accuracy improves as more months accumulate.
- Plus an AI-written business brief on top of the numbers covering: best locations, most profitable room categories, top revenue source, average daily income, average monthly growth, slowest periods, fastest-growing month, month-over-month and year-over-year comparisons, longest earning streak, zero-income days, a suggested monthly target, and an end-of-month projection at the current pace.

**Exports**
- PDF (charts + summary), Excel, and CSV downloads for any date range.

**Notifications**
- In-app alerts when today beats last week's same weekday, when a weekly or monthly record falls, when revenue drops sharply, and when the day has no entry yet.
- Matching daily email digests / record alerts to your address.

**Design**
- KPI cards, responsive charts, subtle animations, professional business palette matched to the existing SafiRooms tokens, mobile-first and fast.

---

## Technical notes

- **Database**: new `revenue_entries` table (date, amount UGX, source enum + custom label, notes, transaction count, created_by) with admin-only RLS and grants; a source enum covering the eight options. Records/streaks/averages are computed server-side in SQL views or aggregate queries so the dashboard loads fast.
- **Server functions**: `revenue.functions.ts` for CRUD, bulk import, aggregates, records, calendar buckets, predictions; all behind `requireSupabaseAuth` + `assertAdmin`, called from components (not public loaders).
- **AI brief**: Lovable AI (`google/gemini-3.6-flash`) called from a server function with the aggregated stats as input — never raw table dumps — and cached per day.
- **Charts**: `recharts` (already installed).
- **Exports**: CSV/Excel generated client-side; PDF rendered from the dashboard's chart canvases.
- **Email alerts**: requires a verified sender domain for SafiRooms. If none is configured yet, the in-app alerts ship immediately and email setup runs as a prerequisite step before the digests turn on.
- **Share templates**: `share-card.ts`/`poster-card.ts` refactored into a renderer registry with one draw function per template, shared QR/branding helpers, and a preview picker component.
- **Gallery / gestures**: pointer-event based, no new dependency; gallery is a portal overlay with `touch-action: none`.
- **Search parsing**: `search-parse.ts` extended with price-range and newly-added rules, plus combined-filter output shared by the client portal and generator.
- Existing SSR hydration mismatches on the home page (time-based "New" flag and signed photo URLs) get fixed as part of this work.
