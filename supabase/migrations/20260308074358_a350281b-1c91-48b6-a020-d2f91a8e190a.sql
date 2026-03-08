
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON public.system_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view settings" ON public.system_settings
  FOR SELECT TO authenticated
  USING (true);

-- Seed default settings
INSERT INTO public.system_settings (key, value, category) VALUES
  ('institution_name', 'BRIBTE', 'general'),
  ('institution_email', 'info@bribte.ac.ke', 'general'),
  ('institution_phone', '+254 700 000 000', 'general'),
  ('institution_address', 'Nairobi, Kenya', 'general'),
  ('current_academic_year', '2025/2026', 'academic'),
  ('current_semester', '1', 'academic'),
  ('semester_start_date', '2025-09-01', 'academic'),
  ('semester_end_date', '2026-01-15', 'academic'),
  ('late_fee_penalty', '5', 'fees'),
  ('payment_deadline_days', '30', 'fees'),
  ('currency', 'KES', 'fees'),
  ('max_enrollment_per_student', '8', 'enrollment'),
  ('allow_late_enrollment', 'true', 'enrollment'),
  ('auto_approve_enrollment', 'false', 'enrollment');
