
-- Table to track which optional fee items a student has selected
CREATE TABLE public.student_fee_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  fee_item_id uuid NOT NULL REFERENCES public.fee_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, fee_item_id)
);

ALTER TABLE public.student_fee_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own selections" ON public.student_fee_selections
  FOR SELECT USING (EXISTS (SELECT 1 FROM students s WHERE s.id = student_fee_selections.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Students can manage own selections" ON public.student_fee_selections
  FOR ALL USING (EXISTS (SELECT 1 FROM students s WHERE s.id = student_fee_selections.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins can manage all selections" ON public.student_fee_selections
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Update recalculate_fee_balance to include fee_items
CREATE OR REPLACE FUNCTION public.recalculate_fee_balance(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tuition numeric := 0;
  v_paid numeric := 0;
  v_extra_fees numeric := 0;
  v_study_mode text;
  v_course_id uuid;
  v_year_of_study int;
  v_semester int;
  v_is_diploma boolean;
  v_is_semester_basis boolean;
  v_program_level text;
BEGIN
  SELECT study_mode, course_id, year_of_study, semester
  INTO v_study_mode, v_course_id, v_year_of_study, v_semester
  FROM students WHERE id = p_student_id;

  IF v_course_id IS NOT NULL THEN
    SELECT
      CASE v_study_mode
        WHEN 'Day' THEN COALESCE(tuition_day, 0)
        WHEN 'Evening' THEN COALESCE(tuition_evening, 0)
        WHEN 'Weekend' THEN COALESCE(tuition_weekend, 0)
        ELSE COALESCE(tuition_day, 0)
      END,
      program_level
    INTO v_tuition, v_program_level
    FROM courses WHERE id = v_course_id;
  END IF;

  v_is_diploma := v_program_level IS NOT NULL AND lower(v_program_level) LIKE '%diploma%';
  v_is_semester_basis := v_program_level IN ('Diploma', 'National Diploma', 'Higher National Diploma');

  -- Calculate applicable non-optional fees
  SELECT COALESCE(SUM(amount), 0) INTO v_extra_fees
  FROM fee_items fi
  WHERE fi.is_optional = false
    AND (
      (fi.applies_to = 'all')
      OR (fi.applies_to = 'diploma_only' AND v_is_diploma)
      OR (fi.applies_to = 'semester_basis' AND v_is_semester_basis)
      OR (fi.applies_to = 'term_basis' AND NOT v_is_semester_basis)
    )
    AND (
      (fi.frequency = 'once' AND v_year_of_study = 1 AND v_semester = 1)
      OR (fi.frequency = 'yearly' AND v_semester = 1)
      OR (fi.frequency = 'per_semester' AND v_is_semester_basis)
      OR (fi.frequency = 'per_term' AND NOT v_is_semester_basis)
    );

  -- Add selected optional fees
  v_extra_fees := v_extra_fees + COALESCE((
    SELECT SUM(fi.amount)
    FROM student_fee_selections sfs
    JOIN fee_items fi ON fi.id = sfs.fee_item_id
    WHERE sfs.student_id = p_student_id
      AND (
        (fi.applies_to = 'all')
        OR (fi.applies_to = 'semester_basis' AND v_is_semester_basis)
        OR (fi.applies_to = 'term_basis' AND NOT v_is_semester_basis)
      )
  ), 0);

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM payments
  WHERE student_id = p_student_id AND payment_status = 'approved';

  UPDATE students SET fee_balance = GREATEST((v_tuition + v_extra_fees) - v_paid, 0)
  WHERE id = p_student_id;
END;
$$;
