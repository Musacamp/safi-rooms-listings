CREATE TYPE public.revenue_source AS ENUM (
  'client_payment','landlord_payment','listing_fee','brokerage_fee',
  'property_management','advertising','premium_listing','other'
);

CREATE TABLE public.revenue_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  amount_ugx bigint NOT NULL DEFAULT 0,
  source public.revenue_source NOT NULL DEFAULT 'client_payment',
  source_label text,
  notes text,
  transactions integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_entries TO authenticated;
GRANT ALL ON public.revenue_entries TO service_role;

ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read revenue" ON public.revenue_entries
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert revenue" ON public.revenue_entries
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update revenue" ON public.revenue_entries
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete revenue" ON public.revenue_entries
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_revenue_entries_updated_at
  BEFORE UPDATE ON public.revenue_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE INDEX idx_revenue_entries_date ON public.revenue_entries (entry_date DESC);