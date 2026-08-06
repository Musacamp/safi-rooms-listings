export function formatUGX(n: number | null | undefined): string {
  if (n == null) return "—";
  return "UGX " + Math.round(n).toLocaleString("en-US");
}

export function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.round((now - then) / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 7) return `${diffD}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

/** Whole days since a timestamp (0 = today). */
export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

/** Listings posted within the last 5 days count as "Newly Added". */
export const NEW_WINDOW_DAYS = 5;

export function isNewListing(iso: string): boolean {
  return daysSince(iso) < NEW_WINDOW_DAYS;
}

/** "12 Feb 2026" — stable, short date for cards and detail pages. */
export function formatDateAdded(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "Today", "Yesterday", "3 days ago". */
export function daysAgoLabel(iso: string): string {
  const d = daysSince(iso);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}
