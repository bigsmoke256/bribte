-- Course Schedules (weekly recurring patterns)
CREATE TABLE public.course_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  lecturer_id UUID REFERENCES public.lecturers(id) ON DELETE SET NULL,
  meeting_link_or_room TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Class Sessions (generated actual sessions)
CREATE TYPE public.session_status AS ENUM ('scheduled', 'live', 'completed', 'cancelled');

CREATE TABLE public.class_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.course_schedules(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  end_time TIME WITHOUT TIME ZONE NOT NULL,
  lecturer_id UUID REFERENCES public.lecturers(id) ON DELETE SET NULL,
  meeting_link TEXT,
  status public.session_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Attendance tracking
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');

CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'absent',
  time_joined TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, session_id)
);

-- Enable RLS
ALTER TABLE public.course_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Course Schedules RLS
CREATE POLICY "Admins can manage course schedules" ON public.course_schedules FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Lecturers can view course schedules" ON public.course_schedules FOR SELECT
  USING (has_role(auth.uid(), 'lecturer'::app_role));

CREATE POLICY "Students can view enrolled course schedules" ON public.course_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = auth.uid() AND s.course_id = course_schedules.course_id
    )
    OR EXISTS (
      SELECT 1 FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE s.user_id = auth.uid() AND e.course_id = course_schedules.course_id
    )
  );

-- Class Sessions RLS
CREATE POLICY "Admins can manage class sessions" ON public.class_sessions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Lecturers can view class sessions" ON public.class_sessions FOR SELECT
  USING (has_role(auth.uid(), 'lecturer'::app_role));

CREATE POLICY "Lecturers can update own class sessions" ON public.class_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lecturers l
      WHERE l.user_id = auth.uid() AND l.id = class_sessions.lecturer_id
    )
  );

CREATE POLICY "Students can view enrolled course sessions" ON public.class_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.user_id = auth.uid() AND s.course_id = class_sessions.course_id
    )
    OR EXISTS (
      SELECT 1 FROM enrollments e
      JOIN students s ON s.id = e.student_id
      WHERE s.user_id = auth.uid() AND e.course_id = class_sessions.course_id
    )
  );

-- Attendance RLS
CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Lecturers can manage attendance" ON public.attendance FOR ALL
  USING (has_role(auth.uid(), 'lecturer'::app_role))
  WITH CHECK (has_role(auth.uid(), 'lecturer'::app_role));

CREATE POLICY "Students can view own attendance" ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = attendance.student_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own attendance" ON public.attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = attendance.student_id AND s.user_id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_course_schedules_updated_at
  BEFORE UPDATE ON public.course_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_sessions_updated_at
  BEFORE UPDATE ON public.class_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate class sessions from schedule
CREATE OR REPLACE FUNCTION public.generate_class_sessions(
  p_course_id UUID,
  p_start_date DATE,
  p_weeks INTEGER DEFAULT 12
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_count INTEGER := 0;
BEGIN
  v_end_date := p_start_date + (p_weeks * 7);
  
  FOR v_schedule IN 
    SELECT * FROM course_schedules WHERE course_id = p_course_id
  LOOP
    v_current_date := p_start_date;
    
    -- Find first occurrence of this day of week
    WHILE EXTRACT(DOW FROM v_current_date) != v_schedule.day_of_week AND v_current_date < v_end_date LOOP
      v_current_date := v_current_date + 1;
    END LOOP;
    
    -- Generate sessions for each week
    WHILE v_current_date < v_end_date LOOP
      INSERT INTO class_sessions (
        course_id, schedule_id, session_date, start_time, end_time, 
        lecturer_id, meeting_link, status
      ) VALUES (
        p_course_id, v_schedule.id, v_current_date, v_schedule.start_time, 
        v_schedule.end_time, v_schedule.lecturer_id, v_schedule.meeting_link_or_room, 'scheduled'
      )
      ON CONFLICT DO NOTHING;
      
      v_count := v_count + 1;
      v_current_date := v_current_date + 7;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Function to check lecturer conflicts
CREATE OR REPLACE FUNCTION public.check_schedule_conflicts(
  p_course_id UUID,
  p_day_of_week INTEGER,
  p_start_time TIME,
  p_end_time TIME,
  p_lecturer_id UUID DEFAULT NULL,
  p_meeting_room TEXT DEFAULT NULL,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE(conflict_type TEXT, conflict_details TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check lecturer conflicts
  IF p_lecturer_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 'lecturer'::TEXT, 
           'Lecturer already has a class at this time: ' || c.course_name
    FROM course_schedules cs
    JOIN courses c ON c.id = cs.course_id
    WHERE cs.lecturer_id = p_lecturer_id
      AND cs.day_of_week = p_day_of_week
      AND cs.start_time < p_end_time
      AND cs.end_time > p_start_time
      AND (p_exclude_id IS NULL OR cs.id != p_exclude_id);
  END IF;
  
  -- Check room conflicts
  IF p_meeting_room IS NOT NULL AND p_meeting_room != '' THEN
    RETURN QUERY
    SELECT 'room'::TEXT,
           'Room is already booked: ' || c.course_name
    FROM course_schedules cs
    JOIN courses c ON c.id = cs.course_id
    WHERE cs.meeting_link_or_room = p_meeting_room
      AND cs.day_of_week = p_day_of_week
      AND cs.start_time < p_end_time
      AND cs.end_time > p_start_time
      AND (p_exclude_id IS NULL OR cs.id != p_exclude_id);
  END IF;
END;
$$;