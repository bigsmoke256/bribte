
CREATE TABLE public.fee_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  frequency text NOT NULL DEFAULT 'once',
  category text NOT NULL DEFAULT 'general',
  applies_to text NOT NULL DEFAULT 'all',
  is_optional boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fee items" ON public.fee_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view fee items" ON public.fee_items FOR SELECT TO authenticated USING (true);
