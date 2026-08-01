ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_self_contained boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS room_number text,
  ADD COLUMN IF NOT EXISTS distance_from_town text,
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT true;

UPDATE public.listings
SET is_self_contained = true,
    room_type = 'single'
WHERE room_type = 'self_contained';