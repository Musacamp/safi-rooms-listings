import type { MarketInsights } from "./insights.functions";

/** Trim, collapse spaces, uppercase — matches the server-side area grouping. */
export function normalizeLocation(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").toUpperCase();
}

/** Average whole days from posted to taken; null when there is nothing to average. */
export function averageDays(pairs: { postedAt: string; takenAt: string }[]): number | null {
  const days = pairs
    .map((p) => (new Date(p.takenAt).getTime() - new Date(p.postedAt).getTime()) / 86_400_000)
    .filter((d) => Number.isFinite(d) && d >= 0);
  if (days.length === 0) return null;
  return Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10;
}

const CATEGORY_LABELS: Record<string, string> = {
  single_ordinary: "Single ordinary rooms",
  single_self_contained: "Single self-contained rooms",
  double_ordinary: "Double ordinary rooms",
  double_self_contained: "Double self-contained rooms",
  two_bedroom: "Two bedroom houses",
  other: "Other properties",
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

/** 4–6 plain-language sentences generated from the aggregated payload. */
export function buildQuickInsights(data: MarketInsights): string[] {
  const sentences: string[] = [];
  const topVacant = data.vacantByArea[0];
  if (topVacant) {
    sentences.push(
      `${topVacant.area} has ${topVacant.vacant} vacant room${topVacant.vacant === 1 ? "" : "s"}, the oldest listed ${topVacant.oldestDays} day${topVacant.oldestDays === 1 ? "" : "s"} ago.`,
    );
  }
  const fastest = data.fastestAreas[0];
  if (fastest) {
    sentences.push(
      `Rooms in ${fastest.area} are taken in about ${fastest.avgDays} day${fastest.avgDays === 1 ? "" : "s"} on average${fastest.estimated ? " (estimated)" : ""}.`,
    );
  }
  const fastestType = data.byType
    .filter((t) => t.avgDaysToTake != null && t.takenInRange > 0)
    .sort((a, b) => (a.avgDaysToTake ?? 0) - (b.avgDaysToTake ?? 0))[0];
  if (fastestType) {
    sentences.push(
      `${categoryLabel(fastestType.category)} are the fastest to go, taken in about ${fastestType.avgDaysToTake} days on average.`,
    );
  }
  const hot = data.demandByArea.filter((a) => a.views + a.whatsapp + a.calls >= 10 && a.vacant <= 3);
  if (hot.length > 0) {
    sentences.push(`Areas with the most demand but few rooms: ${hot.map((a) => a.area).join(", ")}.`);
  }
  const staleCount = data.staleRooms.reduce((sum, a) => sum + a.rooms.length, 0);
  if (staleCount > 0) {
    sentences.push(`${staleCount} room${staleCount === 1 ? " has" : "s have"} been listed for over 30 days and may need confirming.`);
  }
  if (data.summary.pctTakenWithin7 != null) {
    sentences.push(`${data.summary.pctTakenWithin7}% of rooms taken in this period went within 7 days of posting.`);
  }
  return sentences.slice(0, 6);
}
