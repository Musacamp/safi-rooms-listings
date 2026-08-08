CREATE INDEX IF NOT EXISTS revenue_entries_entry_date_idx ON public.revenue_entries (entry_date DESC);
CREATE INDEX IF NOT EXISTS revenue_entries_source_idx ON public.revenue_entries (source);

CREATE TYPE public.revenue_period AS ENUM ('daily','weekly','monthly','yearly');

CREATE TABLE public.revenue_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period public.revenue_period NOT NULL,
  period_key text NOT NULL DEFAULT '',
  amount_ugx bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period, period_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_targets TO authenticated;
GRANT ALL ON public.revenue_targets TO service_role;
ALTER TABLE public.revenue_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read targets" ON public.revenue_targets FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert targets" ON public.revenue_targets FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update targets" ON public.revenue_targets FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins can delete targets" ON public.revenue_targets FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_revenue_targets_updated_at BEFORE UPDATE ON public.revenue_targets FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.revenue_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid,
  action text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX revenue_audit_created_at_idx ON public.revenue_audit (created_at DESC);
GRANT SELECT, INSERT ON public.revenue_audit TO authenticated;
GRANT ALL ON public.revenue_audit TO service_role;
ALTER TABLE public.revenue_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit" ON public.revenue_audit FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can insert audit" ON public.revenue_audit FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));