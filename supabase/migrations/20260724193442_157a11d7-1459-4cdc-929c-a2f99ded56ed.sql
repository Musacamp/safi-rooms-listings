
-- site_visits: track unique visitors
CREATE TABLE public.site_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX site_visits_created_at_idx ON public.site_visits(created_at DESC);
CREATE INDEX site_visits_session_idx ON public.site_visits(session_id);

GRANT INSERT ON public.site_visits TO anon, authenticated;
GRANT SELECT ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log visits" ON public.site_visits
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read visits" ON public.site_visits
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- waitlist: notify-me signups on occupied listings
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX waitlist_listing_idx ON public.waitlist(listing_id);

GRANT INSERT ON public.waitlist TO anon, authenticated;
GRANT SELECT, DELETE ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist for occupied listings" ON public.waitlist
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.listings
    WHERE listings.id = waitlist.listing_id AND listings.is_archived = false
  ));
CREATE POLICY "Admins can read waitlist" ON public.waitlist
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete waitlist" ON public.waitlist
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
