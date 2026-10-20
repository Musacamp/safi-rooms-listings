CREATE TABLE public.search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text,
  location text,
  room_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.search_events TO anon, authenticated;
GRANT SELECT ON public.search_events TO authenticated;
GRANT ALL ON public.search_events TO service_role;
ALTER TABLE public.search_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can log searches" ON public.search_events FOR INSERT TO anon, authenticated
  WITH CHECK (coalesce(length(term),0) <= 200 AND coalesce(length(location),0) <= 300 AND coalesce(length(room_type),0) <= 40);
CREATE POLICY "Admins can read searches" ON public.search_events FOR SELECT TO authenticated
  USING (private.is_admin(auth.uid()));
CREATE INDEX search_events_created_at_idx ON public.search_events (created_at);

CREATE OR REPLACE FUNCTION public.admin_post_data(p_start timestamptz, p_end timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT private.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN jsonb_build_object(
    'searchCount', (SELECT count(*)::int FROM search_events WHERE created_at >= p_start AND created_at < p_end),
    'searchAreas', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT upper(regexp_replace(btrim(l), '\s+', ' ', 'g')) AS area, count(*)::int AS count
        FROM search_events s, unnest(string_to_array(s.location, ',')) AS l
        WHERE s.created_at >= p_start AND s.created_at < p_end AND btrim(l) <> ''
        GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 5) x), '[]'::jsonb),
    'viewAreas', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT upper(regexp_replace(btrim(l.location), '\s+', ' ', 'g')) AS area, count(*)::int AS views
        FROM listing_events e JOIN listings l ON l.id = e.listing_id
        WHERE e.kind = 'view' AND e.created_at >= p_start AND e.created_at < p_end
        GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT 5) x), '[]'::jsonb),
    'taken', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT upper(regexp_replace(btrim(location), '\s+', ' ', 'g')) AS area, taken_at_estimated AS estimated,
               count(*)::int AS taken,
               round(avg(greatest(extract(epoch FROM taken_at - posted_at), 0) / 86400)::numeric, 1)::float AS "avgDays"
        FROM listings WHERE NOT is_archived AND taken_at IS NOT NULL AND taken_at >= p_start AND taken_at < p_end
        GROUP BY 1, 2) x), '[]'::jsonb),
    'takenWeek', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT upper(regexp_replace(btrim(location), '\s+', ' ', 'g')) AS area, taken_at_estimated AS estimated, count(*)::int AS taken
        FROM listings WHERE NOT is_archived AND taken_at IS NOT NULL AND taken_at >= now() - interval '7 days'
        GROUP BY 1, 2) x), '[]'::jsonb),
    'available', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT l.id, l.location, l.rent_ugx, l.title, l.description, l.amenities, l.room_type, l.is_self_contained,
               l.distance_from_town, l.posted_at,
               coalesce((SELECT sum(CASE e.kind WHEN 'view' THEN 1 ELSE 5 END) FROM listing_events e
                 WHERE e.listing_id = l.id AND e.created_at >= p_start AND e.created_at < p_end), 0)::int AS score
        FROM listings l WHERE NOT l.is_archived AND l.is_available) x), '[]'::jsonb),
    'rentByArea', coalesce((SELECT jsonb_agg(x) FROM (
        SELECT upper(regexp_replace(btrim(location), '\s+', ' ', 'g')) AS area, count(*)::int AS listings,
               round(avg(rent_ugx))::int AS "avgRent"
        FROM listings WHERE NOT is_archived GROUP BY 1 HAVING count(*) >= 3) x), '[]'::jsonb),
    'vacantNow', (SELECT count(*)::int FROM listings WHERE NOT is_archived AND is_available)
  );
END $$;
REVOKE ALL ON FUNCTION public.admin_post_data(timestamptz, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_post_data(timestamptz, timestamptz) TO authenticated;