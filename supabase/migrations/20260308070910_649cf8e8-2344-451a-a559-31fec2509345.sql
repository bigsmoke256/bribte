
-- Add published flag to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

-- Course modules table
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage modules" ON public.course_modules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view modules" ON public.course_modules FOR SELECT USING (true);

-- Course lessons table
CREATE TABLE public.course_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage lessons" ON public.course_lessons FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view lessons" ON public.course_lessons FOR SELECT USING (true);

-- Course materials table
CREATE TABLE public.course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage materials" ON public.course_materials FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view materials" ON public.course_materials FOR SELECT USING (true);

-- Storage bucket for course materials
INSERT INTO storage.buckets (id, name, public) VALUES ('course-materials', 'course-materials', true) ON CONFLICT DO NOTHING;

-- Storage policies for course-materials bucket
CREATE POLICY "Admins can upload course materials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'course-materials' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete course materials" ON storage.objects FOR DELETE USING (bucket_id = 'course-materials' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view course materials" ON storage.objects FOR SELECT USING (bucket_id = 'course-materials');

-- Add realtime for modules
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_modules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_lessons;
