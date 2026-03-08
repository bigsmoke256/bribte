
-- Allow lecturers to view profiles (needed to see student names)
CREATE POLICY "Lecturers can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'lecturer'::app_role));
