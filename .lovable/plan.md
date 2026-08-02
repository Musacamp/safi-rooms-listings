## SafiRooms: Density + Search + Share Redesign

Scope: sections 1–8. Section 9 extras deferred (favourites, map, trending, search analytics). Natural-language search is a fast rule-based parser (no AI call). Apartment stays as a type.

### 1. Property types (data)

Today the database has 5 types: `single`, `double`, `self_contained`, `apartment`, `business`, plus an `is_self_contained` flag added for the generator. `shop` does not exist yet.

One migration:
- Add `shop` to the property-type list.
- Any remaining `self_contained` rows become Single + self-contained flag.

The 7 admin choices become: Single Room · Double Room · Single Self-contained · Double Self-contained · Apartment · Business Room · Shop. The New/Edit form gets a single "Property type" picker covering all seven (self-contained is stored as the flag behind the scenes, never shown as its own generic bucket).

### 2. Compact listing card

Rebuild `ListingCard` to a fixed, short height:

```text
[ 88px  ] UGX 200,000/month            ✅ Verified
[ photo ] 📍 Pamba · Single Self-contained
[  1 left] Deposit UGX 600,000 • Available
          ✅ Water • ✅ Electricity • ✅ Parking   [📞][WA]
```

- Rent large/bold, one meta line, one deposit+availability line, one amenity line (truncates with `+2` when it overflows).
- Tighter padding, thinner dividers, smaller badges; vacancy "N left" stays on the photo corner.
- Call and WhatsApp become small icon buttons on the same row as amenities, so no extra footer row.
- Target: 6–10 cards visible per phone screen.

### 3. Client portal search area

Below the search bar:
- **Quick chips**: All · Newly Added · Single · Double · Single Self-contained · Double Self-contained · Apartment · Business · Shops.
- **Location search** (own input): type "Pamba" to get all Pamba rooms; supports multiple via `+` or comma ("Pamba + Oderai", "Pamba, Oderai, Campswahili"). Autocomplete suggests real locations pulled from the database; popular locations (most listings) show as chips before typing.
- **Filters sheet**: property type, price band (Under 150k / 150–200k / 200–300k / Above 300k) or custom, amenities (multi-select), availability (Available now / Occupied), and "Safi Verified only".

All filters live in the URL so results are shareable and update instantly with no page reload.

### 4. Share system

- Replace the WhatsApp-only button with the device share sheet (`navigator.share` with a file) — one tap reaches WhatsApp Business, Messenger, Telegram, Instagram, X, Gmail, SMS, Bluetooth, Nearby Share, anything installed. Desktop falls back to download + copy link.
- Share is **image-only** (no text body), as requested.

### 5. Single-listing share image

Redesign the generated card: SafiRooms branding, rent, location, deposit, availability, amenity ticks, Safi Verified badge, phone number, short site link, and a QR code that opens that room on the portal. Sized for WhatsApp Status / Instagram Story (1080×1920 safe layout). Rendered and cached in-memory per listing so repeat shares are instant.

### 6. Smart generator (admin)

The Generator page gains a natural-language box above the category tabs. Rule-based parsing handles:
- locations: "in Pamba", "Pamba and Oderai", "Pamba, Oderai and Campswahili"
- budget: "below 300k", "under UGX 250,000", "between 150,000 and 250,000"
- type: single / double / single self-contained / double self-contained / business / shop / apartment
- any combination: "Single Self-contained in Pamba below 250k"

It filters live available rooms and produces the matching poster:
- Title from the query — `🏡 Rooms Available in Pamba & Oderai`, `💰 Rooms Below UGX 300,000`, `🏡 Double Self-contained in Oderai`
- Date, count of available rooms, compact per-room rows (rent, location, deposit, amenities, Verified badge)
- Footer with branding, tagline, brokerage reminder, phone, short link, and a **QR code that opens the client portal already filtered to that exact search**
- Existing six category tabs remain as one-tap presets.

Posters paginate into multiple images when a search returns more rooms than fit one page. Generated posters are cached by query so repeat generation is instant.

### 7. Performance

- Listing feed paginates/lazy-loads in pages of 20 with infinite scroll instead of one big fetch.
- Filtering and search are client-instant (cached query results, debounced input, no refetch when narrowing).
- Images: explicit sizes, `loading="lazy"`, `decoding="async"`, small thumbnails on cards.
- Poster/share images cached; canvas work off the critical path.

### Technical notes

- Migration: extend `room_type` enum with `shop`; normalise legacy `self_contained` rows.
- `src/lib/constants.ts`: single source of truth for the 7 property types + price bands, replacing the split `ROOM_TYPES` / `LISTING_CATEGORIES` mismatch.
- `listListings` gains `locations: string[]`, `amenities: string[]`, `available`, `verified`, `selfContained`, `limit/offset`; location matching uses an OR of `ilike` per location. Select strings typed as plain `string` with `.returns<Listing[]>()` to keep typecheck fast.
- New `getLocationSuggestions` server function for autocomplete/popular locations.
- `ListingCard`, `FilterBar` rebuilt; new `LocationSearch` component.
- `src/lib/share-card.ts` reworked for the new single-room design + QR; `src/lib/poster-card.ts` gains query titles, pagination and QR; a tiny QR encoder is added (no heavy dependency).
- New `src/lib/search-parse.ts` for the rule-based query parser, unit-testable.
- `ShareListingButton` switched to generic share-sheet, image-only.
