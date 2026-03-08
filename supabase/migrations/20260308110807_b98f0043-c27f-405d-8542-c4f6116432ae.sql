-- Create timetable_entries table
CREATE TABLE public.timetable_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  lecturer_id uuid REFERENCES public.lecturers(id) ON DELETE SET NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 1=Monday, etc.
  start_time time NOT NULL,
  end_time time NOT NULL,
  room_location text,
  module_id uuid REFERENCES public.course_modules(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- Admins can manage all timetable entries
CREATE POLICY "Admins can manage timetable"
ON public.timetable_entries FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Lecturers can manage entries for their courses
CREATE POLICY "Lecturers can manage own course timetables"
ON public.timetable_entries FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = timetable_entries.course_id
    AND c.lecturer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = timetable_entries.course_id
    AND c.lecturer_id = auth.uid()
  )
);

-- Students can view timetable entries for their enrolled courses
CREATE POLICY "Students can view enrolled course timetables"
ON public.timetable_entries FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    WHERE e.course_id = timetable_entries.course_id
    AND s.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.course_id = timetable_entries.course_id
    AND s.user_id = auth.uid()
  )
);

-- Lecturers can view all timetable entries
CREATE POLICY "Lecturers can view all timetables"
ON public.timetable_entries FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'lecturer'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_timetable_entries_updated_at
  BEFORE UPDATE ON public.timetable_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();