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

/** Rooms posted within this many days count as "newly added". */
export const NEW_DAYS = 5;

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function isNewlyAdded(iso: string): boolean {
  return daysSince(iso) < NEW_DAYS;
}

/** "Added today" / "Added 3 days ago" */
export function addedAgoLabel(iso: string): string {
  const d = daysSince(iso);
  if (d <= 0) return "Added today";
  if (d === 1) return "Added yesterday";
  return `Added ${d} days ago`;
}

/** 7 Aug 2026 */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** UGX 1.2M / UGX 340k for compact chart labels. */
export function compactUGX(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (Math.abs(n) >= 1_000) return `UGX ${Math.round(n / 1_000)}k`;
  return `UGX ${Math.round(n)}`;
}
