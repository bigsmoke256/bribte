
-- 1. EXAMS table
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  exam_type TEXT NOT NULL DEFAULT 'final',
  exam_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  venue TEXT,
  semester INT NOT NULL DEFAULT 1,
  academic_year TEXT NOT NULL,
  max_marks NUMERIC NOT NULL DEFAULT 100,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. EXAM_RESULTS table
CREATE TABLE public.exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks_obtained NUMERIC,
  grade TEXT,
  grade_points NUMERIC,
  remarks TEXT,
  entered_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- 3. CLEARANCE_REQUESTS table
CREATE TABLE public.clearance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  clearance_type TEXT NOT NULL DEFAULT 'end_semester',
  academic_year TEXT NOT NULL,
  semester INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. CLEARANCE_STEPS table
CREATE TABLE public.clearance_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clearance_id UUID NOT NULL REFERENCES public.clearance_requests(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  step_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  notes TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. ACADEMIC_CALENDAR table
CREATE TABLE public.academic_calendar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'general',
  start_date DATE NOT NULL,
  end_date DATE,
  semester INT,
  academic_year TEXT,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ALUMNI table
CREATE TABLE public.alumni (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  student_id UUID REFERENCES public.students(id),
  graduation_date DATE NOT NULL,
  course_completed TEXT NOT NULL,
  degree_classification TEXT,
  final_gpa NUMERIC,
  contact_email TEXT,
  contact_phone TEXT,
  current_employer TEXT,
  job_title TEXT,
  linkedin_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. AUDIT_LOGS table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  user_email TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  old_values JSONB,
  new_values JSONB,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clearance_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- EXAMS RLS
CREATE POLICY "Admins can manage exams" ON public.exams FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Lecturers can manage own exams" ON public.exams FOR ALL TO authenticated USING (has_role(auth.uid(), 'lecturer') AND created_by = auth.uid()) WITH CHECK (has_role(auth.uid(), 'lecturer') AND created_by = auth.uid());
CREATE POLICY "Authenticated can view exams" ON public.exams FOR SELECT TO authenticated USING (true);

-- EXAM_RESULTS RLS
CREATE POLICY "Admins can manage exam results" ON public.exam_results FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Lecturers can manage exam results" ON public.exam_results FOR ALL TO authenticated USING (has_role(auth.uid(), 'lecturer')) WITH CHECK (has_role(auth.uid(), 'lecturer'));
CREATE POLICY "Students can view own results" ON public.exam_results FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM students s WHERE s.id = exam_results.student_id AND s.user_id = auth.uid()));

-- CLEARANCE RLS
CREATE POLICY "Admins can manage clearance requests" ON public.clearance_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can view own clearance" ON public.clearance_requests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM students s WHERE s.id = clearance_requests.student_id AND s.user_id = auth.uid()));
CREATE POLICY "Students can insert own clearance" ON public.clearance_requests FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM students s WHERE s.id = clearance_requests.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins can manage clearance steps" ON public.clearance_steps FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view clearance steps" ON public.clearance_steps FOR SELECT TO authenticated USING (true);

-- ACADEMIC CALENDAR RLS
CREATE POLICY "Admins can manage calendar" ON public.academic_calendar FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view calendar" ON public.academic_calendar FOR SELECT TO authenticated USING (true);

-- ALUMNI RLS
CREATE POLICY "Admins can manage alumni" ON public.alumni FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Alumni can view and update own record" ON public.alumni FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Authenticated can view alumni" ON public.alumni FOR SELECT TO authenticated USING (true);

-- AUDIT LOGS RLS (admin only)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.clearance_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clearance_steps;
