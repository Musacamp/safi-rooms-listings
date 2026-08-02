ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'shop';

UPDATE public.listings
SET room_type = 'single', is_self_contained = true
WHERE room_type = 'self_contained';