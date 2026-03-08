-- Allow students to view profiles of lecturers (needed for timetable, assignments, etc.)
CREATE POLICY "Students can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'student'::app_role)
);