ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS taken_at timestamptz;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS taken_at_estimated boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.tg_set_taken_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.is_available IS DISTINCT FROM NEW.is_available THEN
    IF NEW.is_available = false AND NEW.taken_at IS NULL THEN
      NEW.taken_at = now();
      NEW.taken_at_estimated = false;
    ELSIF NEW.is_available = true THEN
      NEW.taken_at = NULL;
      NEW.taken_at_estimated = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listings_taken_at
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION tg_set_taken_at();

UPDATE public.listings
SET taken_at = updated_at, taken_at_estimated = true
WHERE is_available = false AND taken_at IS NULL;

CREATE OR REPLACE FUNCTION public.admin_market_insights(p_days integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_since timestamptz := CASE WHEN p_days IS NULL OR p_days <= 0 THEN '-infinity'::timestamptz ELSE now() - make_interval(days => p_days) END;
  v_result jsonb;
BEGIN
  IF NOT private.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  WITH l AS (
    SELECT id, title, room_type, rent_ugx, is_available, posted_at, taken_at, taken_at_estimated,
           photos,
           upper(regexp_replace(btrim(location), '\s+', ' ', 'g')) AS area,
           CASE
             WHEN (coalesce(title,'') || ' ' || coalesce(description,'')) ~* '\m(2|two)[ -]?bedrooms?\M' THEN 'two_bedroom'
             WHEN room_type = 'double' AND is_self_contained THEN 'double_self_contained'
             WHEN room_type = 'double' THEN 'double_ordinary'
             WHEN room_type = 'single' AND is_self_contained THEN 'single_self_contained'
             WHEN room_type = 'single' THEN 'single_ordinary'
             ELSE 'other'
           END AS cat
    FROM listings
    WHERE NOT is_archived
  ),
  taken AS (SELECT * FROM l WHERE taken_at IS NOT NULL AND taken_at >= v_since),
  vacant AS (SELECT * FROM l WHERE is_available),
  ev AS (SELECT e.listing_id, e.kind FROM listing_events e WHERE e.created_at >= v_since),
  demand AS (
    SELECT l.area,
           count(*) FILTER (WHERE ev.kind = 'view') AS views,
           count(*) FILTER (WHERE ev.kind = 'whatsapp') AS whatsapp,
           count(*) FILTER (WHERE ev.kind = 'call') AS calls
    FROM ev JOIN l ON l.id = ev.listing_id
    GROUP BY l.area
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'vacantNow', (SELECT count(*) FROM vacant),
      'takenInRange', (SELECT count(*) FROM taken),
      'avgDaysToTake', (SELECT round(avg(extract(epoch FROM taken_at - posted_at)/86400.0)::numeric, 1) FROM taken),
      'pctTakenWithin7', (SELECT round(100.0 * count(*) FILTER (WHERE taken_at - posted_at <= interval '7 days') / nullif(count(*), 0), 1) FROM taken)
    ),
    'vacantByArea', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'area', area, 'vacant', cnt, 'avgRent', avg_rent, 'oldestDays', oldest_days, 'rooms', rooms
      ) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT area, count(*) AS cnt, round(avg(rent_ugx)) AS avg_rent,
               floor(max(extract(epoch FROM now() - posted_at)/86400.0)) AS oldest_days,
               jsonb_agg(jsonb_build_object(
                 'id', id, 'roomType', room_type, 'rent', rent_ugx,
                 'daysListed', floor(extract(epoch FROM now() - posted_at)/86400.0),
                 'photo', photos[1]
               ) ORDER BY posted_at) AS rooms
        FROM vacant GROUP BY area
      ) v),
    'fastestAreas', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'area', area, 'avgDays', avg_days, 'medianDays', med_days, 'taken', cnt, 'estimated', est
      ) ORDER BY avg_days), '[]'::jsonb)
      FROM (
        SELECT area,
               round(avg(extract(epoch FROM taken_at - posted_at)/86400.0)::numeric, 1) AS avg_days,
               round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM taken_at - posted_at)/86400.0))::numeric, 1) AS med_days,
               count(*) AS cnt,
               bool_or(taken_at_estimated) AS est
        FROM taken GROUP BY area HAVING count(*) >= 3
      ) f),
    'staleRooms', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'area', area, 'rooms', rooms
      ) ORDER BY area), '[]'::jsonb)
      FROM (
        SELECT area,
               jsonb_agg(jsonb_build_object(
                 'id', id, 'roomType', room_type, 'rent', rent_ugx,
                 'daysListed', floor(extract(epoch FROM now() - posted_at)/86400.0),
                 'photo', photos[1]
               ) ORDER BY posted_at) AS rooms
        FROM vacant WHERE posted_at < now() - interval '30 days' GROUP BY area
      ) s),
    'demandByArea', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'area', a.area, 'views', coalesce(d.views, 0), 'whatsapp', coalesce(d.whatsapp, 0),
        'calls', coalesce(d.calls, 0), 'vacant', a.vacant
      ) ORDER BY (coalesce(d.views, 0) + coalesce(d.whatsapp, 0) + coalesce(d.calls, 0)) DESC), '[]'::jsonb)
      FROM (SELECT area, count(*) FILTER (WHERE is_available) AS vacant FROM l GROUP BY area) a
      LEFT JOIN demand d ON d.area = a.area),
    'byType', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'category', cat,
        'vacant', count(*) FILTER (WHERE is_available),
        'takenInRange', count(*) FILTER (WHERE taken_at IS NOT NULL AND taken_at >= v_since),
        'avgDaysToTake', round((avg(extract(epoch FROM taken_at - posted_at)/86400.0) FILTER (WHERE taken_at IS NOT NULL AND taken_at >= v_since))::numeric, 1),
        'avgRent', round(avg(rent_ugx))
      ) ORDER BY cat), '[]'::jsonb)
      FROM l)
  ) INTO v_result;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_market_insights(integer) TO authenticated;