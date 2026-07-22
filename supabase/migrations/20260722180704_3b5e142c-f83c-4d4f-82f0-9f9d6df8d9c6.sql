
CREATE POLICY "Admins can upload listing photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-photos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update listing photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-photos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete listing photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND public.is_admin(auth.uid()));

CREATE POLICY "Anyone can read listing photos"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'listing-photos');
