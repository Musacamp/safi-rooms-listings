# SafiRooms: Search, Sharing & Revenue Intelligence

Some of this groundwork already exists (TAKEN/NEW badges, five share templates, template picker sheet, zoom gallery component, edge-swipe component, revenue table). This build finishes wiring it up and adds the full Revenue Intelligence dashboard. Nothing existing is removed.

## 1. Generator: price ranges and combined filters

- Preset range chips: 100k–150k, 150k–200k, 200k–300k, 100k–300k, plus free min/max inputs.
- Typed phrases understood: "between UGX 100,000 and 300,000", "100,000-300,000", "under 250k", "from 200k".
- All filters combine in one query: locations + room type + min/max price + availability + newly added.
- The generated shareable collection uses exactly the rooms currently on screen.

## 2. Newly Added (5 days)

Already computed from upload date with NEW badge, "Added X days ago" and the exact date; rooms leave the category automatically after 5 days. Adding it as a filter in the generator too, and fixing the home page so the badge/photo rendering no longer flickers on load.

## 3. Five share designs

Five templates (Clean/Minimal, Modern Property, Premium, WhatsApp Optimized, Bold Social) already render. Remaining: hook the preview-and-pick sheet into the generator, and remember the last chosen template so future shares default to it.

## 4. Gesture navigation

- Client portal: deliberate swipe from the right edge toward the left → Admin Portal (signed-in admins only; nothing appears for anyone else).
- Admin portal: swipe from the left edge toward the right → Client Portal.
- Requires a long, clearly horizontal drag, so scrolling never triggers it; drag-follow animation with a release hint, and reduced-motion respected.
- Visible fallbacks stay: the header Admin lock icon and the admin "View site" button.

## 5. Room page gallery

Swipeable slider on the room page; tapping opens the full-screen viewer with pinch, double-tap zoom, swipe between photos and swipe-down to close. TAKEN badge and struck-through rent added to the room page too.

## 6. SafiRooms Revenue dashboard

Prominent "SafiRooms Revenue" card on the admin dashboard plus a menu item; admin-only, invisible to clients.

**Add earning** — big `+ ADD EARNING` button. Date (any past date, back to January) → amount → source popup ("Where was this payment received from?": Client, Landlord, Brokerage fee, Room listing fee, Property management fee, Advertising, Premium listing, Referral, Commission, Other + custom text) → optional note and transaction count → save. Multiple entries per day. Edit and delete with a confirmation step on delete. A transaction history list with date-range and source filters.

**Bulk history entry** — paste box for `date, amount, source, note` lines so January onward can be filled in one pass, with a parsed preview before saving.

**KPIs** — Total, This month, This week, Today, Average daily (per active day), Growth vs previous period.

**Graph** — interactive revenue chart with Daily / Weekly / Monthly / Yearly toggles, built only from entered data.

**Calendar** — month grid coloured by that day's performance (no income / low / average / high / record) against your own averages. Tapping a day shows total, transactions, sources and notes; historically strong dates are highlighted.

**Patterns** — "High-Earning Pattern Detected" section computing average per date-of-month, occurrence count and percent above average, worded as historical performance, never as a promise. Shows "Not enough historical data yet." until enough entries exist.

**Records** — Best day, week (any 7-day window), month, year; each shows current record, previous record and percent improvement, with a NEW RECORD flag that stays until beaten.

**Streaks** — current streak, best streak, active earning days, zero-income days.

**Source analytics** — percentage breakdown by source, and a source filter applied across the whole dashboard.

**Month-to-month** — every month compared with plain sentences ("Revenue increased 18% compared with the previous month"), plus best, worst and average month.

**Targets** — set daily, weekly, monthly and yearly targets; progress bars with amount and percentage.

**Insights** — automatically written observations, each one derived from stored numbers only.

**Export** — CSV, Excel and PDF for a chosen date range and source, or a monthly/complete report, including totals, daily and monthly breakdowns, sources, best day/week/month, growth and charts.

**Audit** — a record of revenue edits and deletions with who and when.

Everything refreshes in place after saving — no reload.

## Technical notes

- Database: `revenue_entries` already exists (date, amount UGX, source enum + custom label, notes, transaction count, created_by, timestamps, admin-only access). Adds: date and source indexes, a `revenue_targets` table (period type, period key, amount) and a `revenue_audit` table (entry id, action, before/after snapshot, actor), both admin-only with grants.
- Server functions in `src/lib/revenue.functions.ts` behind `requireSupabaseAuth` + admin check: CRUD, bulk import, aggregates, records, streaks, calendar buckets, date-of-month patterns, source breakdown, targets. Called from components, never from public loaders.
- Route `src/routes/_authenticated/admin.revenue.tsx` with sub-sections in components under `src/components/revenue/`; charts use the already-installed `recharts`; exports use CSV/Excel client-side and PDF from the rendered charts.
- Insights and patterns are pure SQL/TS calculations over stored rows — no fabricated or fake data, no AI-invented numbers.
- Search: `search-parse.ts` gains range and newly-added rules shared by portal and generator.
- Share templates: registry in `share-templates.ts` reused by the generator; selected template persisted locally.
- Schema is left open for later expenses, profit/loss, budgets and property-level profitability (source/category columns and per-entry notes already generalised).
