
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Anyone can log events" ON public.listing_events;
CREATE POLICY "Anyone can log events for existing listings"
  ON public.listing_events FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_id AND is_archived = false));
