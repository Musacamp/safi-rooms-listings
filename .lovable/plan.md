## Written Listings Generator (Admin Portal)

A new admin page that turns your live available rooms into a clean, branded poster you can share to WhatsApp with one tap.

### 1. Data additions (one migration)

Add to listings:
- `is_self_contained` (yes/no) — existing rooms of type "Self-Contained" become Single + self-contained, so the six categories work.
- `room_number` (optional text)
- `distance_from_town` (optional text, e.g. "1.2 km from town")
- `is_verified` (yes/no, default yes) — drives the Safi Verified badge.

The New/Edit listing form gets fields for all four: a Self-contained toggle, Room number, Distance from town, and a Verified switch. Room type list stays Single / Double / Apartment / Business (self-contained becomes a flag).

### 2. Category tabs

Six tabs, each generating its own listing:
Ordinary Single · Self-Contained Single · Ordinary Double · Self-Contained Double · Apartments · Business Rooms

Only rooms that are Available and not archived are ever included — nothing is invented. Duplicates (same location + rent + type) are collapsed.

### 3. Generate / Regenerate

"Generate Listings" and "Regenerate" re-read the database, drop occupied/hidden rooms, pick up new ones, refresh prices, and re-sort. Sorting defaults to lowest rent first, with optional toggles for Newest first and Location A–Z.

### 4. Filters and search

Filters: location, rent range, deposit, amenities, date added, verified only.
Search box matches location, room type, price, amenities, and contact.

### 5. Poster output

Each generated listing renders as a poster:
- Header: category name + current date (e.g. `SINGLE ROOMS ORDINARY — 📅 28 July 2026`)
- Rows: room number (if set), location, monthly rent, deposit, amenities with ✅ marks, distance from town, availability, Safi Verified badge
- Missing values are simply omitted, never shown blank
- Transparent SafiRooms logo watermark behind the content, low opacity so text stays readable
- Footer: SafiRooms logo, "🏡 SafiRooms — Let there be space for everyone.", brokerage-fee reminder, thank-you line, contact number

Brand navy/green colours, clean dividers, mobile-first card layout consistent with the rest of the admin portal.

### 6. Share to WhatsApp

One tap: admin controls are excluded from the render, the poster is drawn to a high-resolution image, and the device share sheet opens with the PNG attached and no extra text — image only. On desktop it downloads the PNG and opens WhatsApp Web. Export in v1 is image (PNG) only; PDF/print can come later.

### Technical notes

- New route `src/routes/_authenticated/admin.generator.tsx` plus a nav link in the admin layout.
- Reuses the existing canvas approach from `src/lib/share-card.ts`; a new `src/lib/poster-card.ts` draws multi-row category posters at high DPI (fast, no server round-trip, well under 3s).
- New admin server function `adminListAvailableListings` filters available/non-archived rows server-side; results cached by react-query so tab switching is instant and thousands of rows stay fast (poster paginates into multiple images if a category exceeds one page).
- Sharing uses `navigator.share` with a `File`, mirroring `ShareListingButton`'s fallback logic.
