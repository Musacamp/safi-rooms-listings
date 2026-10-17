/** Applied in the database before pagination or featured/similar limits. */
export function orderPublicListings<T extends { order(column: string, options: { ascending: boolean }): T }>(query: T): T {
  return query
    .order("is_available", { ascending: false })
    .order("has_listing_photos", { ascending: false })
    .order("posted_at", { ascending: false })
    .order("id", { ascending: false });
}