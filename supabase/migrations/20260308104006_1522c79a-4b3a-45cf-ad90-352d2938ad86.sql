
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Lecturers can manage submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can insert own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Students can view own submissions" ON public.submissions;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Lecturers can manage submissions"
ON public.submissions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'lecturer'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'lecturer'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can insert own submissions"
ON public.submissions FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM students s
  WHERE s.id = submissions.student_id AND s.user_id = auth.uid()
));

CREATE POLICY "Students can view own submissions"
ON public.submissions FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM students s
  WHERE s.id = submissions.student_id AND s.user_id = auth.uid()
));
