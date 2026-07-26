## What I found first (verified)

Your click counters really are broken, and not in the UI. The database has **520 view events, 7 call events, 10 WhatsApp events** logged — but every listing still shows `views 0 · calls 0 · wa 0`. Reason: the counter-bumping trigger runs with the *visitor's* permissions, and visitors aren't allowed to update listings, so the increment is silently dropped every time. The events are all safely stored, so nothing is lost — the totals can be rebuilt exactly.

## 1. Admin portal

**Real click totals (root fix)**
- Make the counter trigger run with elevated rights so every view/call/WhatsApp event increments the listing counters again.
- Rebuild the existing counters from the 537 stored events so today's numbers are correct immediately, not starting from zero.
- Admin listings + dashboard refresh their numbers automatically (auto-refetch every ~30s and on window focus), so counts stay effectively live while you're watching.

**Deposit — no typing**
- The deposit field becomes read-only in New/Edit. Tapping it opens a popup sheet with **3 months / 4 months / 5 months / 6 months** (each showing the computed UGX from the rent), plus a "custom amount" option for edge cases. Tapping an option fills the deposit and closes the popup.

**Top performing listings**
- Rank by **total engagement = views + calls + WhatsApp** (descending), instead of views only. Each row shows the three numbers plus the total.

## 2. Client portal

**Remove analytics from public view**
- Delete the 👁 / 📞 / 💬 counter row from the public listing cards and from the listing detail page. Tracking keeps recording silently in the background; only admins see numbers.

**"N left" vacancy badge**
- New field on listings: **vacancies** (how many rooms are still free in the compound), editable by the admin in New/Edit with a number input and quick chips (1–5).
- Shows as a small badge on the **top-left corner of the photo** on listing cards, featured cards, and the detail page carousel — rendered as "1 left", "3 left". Hidden when the room is occupied or vacancies is 0.

## Technical notes

- Migration: `ALTER FUNCTION`/recreate `tg_bump_listing_counter()` as `SECURITY DEFINER` with `search_path = public`; one-time backfill `UPDATE listings SET views_count = (…count from listing_events…)` per kind; `ALTER TABLE listings ADD COLUMN vacancies integer NOT NULL DEFAULT 1` with a `>= 0` check.
- `src/lib/admin-listings.functions.ts` + `ListingFormValues`/zod input gain `vacancies`.
- Files touched: `ListingForm.tsx` (deposit popup, vacancies field), `ListingCard.tsx`, `FeaturedCard.tsx`, `listing.$id.tsx` (remove counters, add badge), `admin.index.tsx` (ranking + refetch), `admin.listings.tsx` (refetch interval).
