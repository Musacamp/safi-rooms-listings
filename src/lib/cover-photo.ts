export const PHOTO_DAY_MS = 86_400_000;

/** UTC date, not local timezone or time since opening the page. */
export function photoDay(date = new Date()): number {
  return Math.floor(date.getTime() / PHOTO_DAY_MS);
}

export function dailyCoverIndex(photos: readonly string[] | null | undefined, day = photoDay()): number {
  const count = photos?.length ?? 0;
  return count < 2 ? 0 : ((day % count) + count) % count;
}

/** Display-only copy for consumers that expect the cover first. Saved photos remain untouched. */
export function coverFirstPhotos(photos: readonly string[] | null | undefined, index: number): string[] {
  if (!photos?.length) return [];
  return [...photos.slice(index), ...photos.slice(0, index)];
}

/**
 * Index (into `photos`) of today's cover. Rotates only through hand-picked covers that
 * still exist in `photos`; with no picks the first photo is used and nothing rotates.
 */
export function pickedCoverIndex(
  photos: readonly string[] | null | undefined,
  covers: readonly string[] | null | undefined,
  day = photoDay(),
): number {
  const list = photos ?? [];
  const allowed = list.map((p, i) => (covers?.includes(p) ? i : -1)).filter((i) => i >= 0);
  if (!allowed.length) return 0;
  return allowed[dailyCoverIndex(allowed.map(String), day)];
}
