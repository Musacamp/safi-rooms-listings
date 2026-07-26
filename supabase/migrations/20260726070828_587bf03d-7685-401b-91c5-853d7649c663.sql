CREATE OR REPLACE FUNCTION public.tg_bump_listing_counter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.kind = 'view' THEN
    UPDATE public.listings SET views_count = views_count + 1 WHERE id = NEW.listing_id;
  ELSIF NEW.kind = 'call' THEN
    UPDATE public.listings SET calls_count = calls_count + 1 WHERE id = NEW.listing_id;
  ELSIF NEW.kind = 'whatsapp' THEN
    UPDATE public.listings SET whatsapp_count = whatsapp_count + 1 WHERE id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.listings l SET
  views_count = COALESCE(e.v, 0),
  calls_count = COALESCE(e.c, 0),
  whatsapp_count = COALESCE(e.w, 0)
FROM (
  SELECT listing_id,
    count(*) FILTER (WHERE kind = 'view') AS v,
    count(*) FILTER (WHERE kind = 'call') AS c,
    count(*) FILTER (WHERE kind = 'whatsapp') AS w
  FROM public.listing_events GROUP BY listing_id
) e
WHERE e.listing_id = l.id;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS vacancies integer NOT NULL DEFAULT 1;

ALTER TABLE public.listings
  ADD CONSTRAINT listings_vacancies_nonneg CHECK (vacancies >= 0);