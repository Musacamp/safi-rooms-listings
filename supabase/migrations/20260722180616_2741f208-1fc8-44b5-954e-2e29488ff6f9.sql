
-- Enums
CREATE TYPE public.room_type AS ENUM ('single', 'double', 'self_contained', 'apartment', 'business');
CREATE TYPE public.event_kind AS ENUM ('view', 'call', 'whatsapp');

-- Listings
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL,
  room_type public.room_type NOT NULL,
  rent_ugx INTEGER NOT NULL CHECK (rent_ugx >= 0),
  deposit_ugx INTEGER NOT NULL DEFAULT 0 CHECK (deposit_ugx >= 0),
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  amenities TEXT[] NOT NULL DEFAULT '{}',
  photos TEXT[] NOT NULL DEFAULT '{}',
  views_count INTEGER NOT NULL DEFAULT 0,
  calls_count INTEGER NOT NULL DEFAULT 0,
  whatsapp_count INTEGER NOT NULL DEFAULT 0
);

GRANT SELECT ON public.listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Admins
CREATE TABLE public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can see admins list"
  ON public.admins FOR SELECT TO authenticated USING (true);

-- is_admin helper
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(SELECT 1 FROM public.admins WHERE user_id = _user_id);
$$;

-- Listings policies
CREATE POLICY "Anyone can view non-archived listings"
  ON public.listings FOR SELECT
  USING (is_archived = false OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert listings"
  ON public.listings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update listings"
  ON public.listings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete listings"
  ON public.listings FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Listing events (tracking)
CREATE TABLE public.listing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  kind public.event_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.listing_events (created_at DESC);
CREATE INDEX ON public.listing_events (listing_id, kind);

GRANT INSERT ON public.listing_events TO anon, authenticated;
GRANT SELECT ON public.listing_events TO authenticated;
GRANT ALL ON public.listing_events TO service_role;
ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log events"
  ON public.listing_events FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins can read events"
  ON public.listing_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Increment counter trigger from listing_events
CREATE OR REPLACE FUNCTION public.tg_bump_listing_counter()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
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
$$;

CREATE TRIGGER trg_listing_events_bump
  AFTER INSERT ON public.listing_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_bump_listing_counter();

-- Seed listings
INSERT INTO public.listings (title, description, location, room_type, rent_ugx, deposit_ugx, is_available, is_featured, amenities, photos, posted_at) VALUES
('Modern Self-Contained Room', 'Newly built self-contained room with tiled floors, spacious wardrobe, and a private bathroom. Quiet neighborhood, walking distance to shops.', 'Kiwatule, Kampala', 'self_contained', 600000, 300000, true, true, ARRAY['water','electricity','security','parking'], ARRAY['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'], now() - interval '1 hour'),
('Cozy Single Room', 'Compact single room ideal for a student or young professional. Includes shared kitchen and clean shared bathrooms.', 'Bukoto, Kampala', 'single', 350000, 100000, true, false, ARRAY['water','electricity','security'], ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'], now() - interval '3 hours'),
('Spacious Double Room', 'Two-room unit with a small sitting area. Perfect for couples or shared occupancy. Ample natural light.', 'Ntinda, Kampala', 'double', 550000, 250000, true, true, ARRAY['water','electricity','parking','wifi'], ARRAY['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'], now() - interval '5 hours'),
('1-Bedroom Apartment', 'Modern one-bedroom apartment with fitted kitchen, hot shower, and secure parking. 24/7 security.', 'Naalya, Kampala', 'apartment', 850000, 850000, true, true, ARRAY['water','electricity','wifi','parking','security'], ARRAY['https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'], now() - interval '1 day'),
('Business Space, Central Soroti', 'Ground-floor commercial room facing main road. Ideal for a small shop, salon, or office.', 'Soroti Town', 'business', 400000, 400000, true, false, ARRAY['electricity','security'], ARRAY['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'], now() - interval '2 days'),
('Affordable Single Room', 'Budget-friendly single room in a family compound. Water and lights included.', 'Soroti', 'single', 180000, 100000, false, false, ARRAY['water','electricity'], ARRAY['https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800'], now() - interval '4 days');
