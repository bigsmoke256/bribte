
-- Update recalculate_fee_balance to include ALL recurring fees (per_semester and per_term) for all students
CREATE OR REPLACE FUNCTION public.recalculate_fee_balance(p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Calculate mandatory fees
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
      -- One-time fees: only year 1 semester 1
      (fi.frequency = 'once' AND v_year_of_study = 1 AND v_semester = 1)
      -- Yearly fees: only semester 1
      OR (fi.frequency = 'yearly' AND v_semester = 1)
      -- Per-semester and per-term: include for ALL students every period
      OR (fi.frequency = 'per_semester')
      OR (fi.frequency = 'per_term')
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

  UPDATE students SET fee_balance = (v_tuition + v_extra_fees) - v_paid
  WHERE id = p_student_id;
END;
$function$;

-- Recalculate all students
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM students WHERE course_id IS NOT NULL LOOP
    PERFORM recalculate_fee_balance(r.id);
  END LOOP;
END;
$$;
