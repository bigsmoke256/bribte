
-- Function to recalculate a student's fee balance
-- fee_balance = course_tuition (based on study_mode) - sum(approved payments)
CREATE OR REPLACE FUNCTION public.recalculate_fee_balance(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tuition numeric := 0;
  v_paid numeric := 0;
  v_study_mode text;
  v_course_id uuid;
BEGIN
  SELECT study_mode, course_id INTO v_study_mode, v_course_id
  FROM students WHERE id = p_student_id;

  IF v_course_id IS NOT NULL THEN
    SELECT
      CASE v_study_mode
        WHEN 'Day' THEN COALESCE(tuition_day, 0)
        WHEN 'Evening' THEN COALESCE(tuition_evening, 0)
        WHEN 'Weekend' THEN COALESCE(tuition_weekend, 0)
        ELSE COALESCE(tuition_day, 0)
      END INTO v_tuition
    FROM courses WHERE id = v_course_id;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
  FROM payments
  WHERE student_id = p_student_id AND payment_status = 'approved';

  UPDATE students SET fee_balance = GREATEST(v_tuition - v_paid, 0)
  WHERE id = p_student_id;
END;
$$;

-- Trigger: recalculate when payment is inserted, updated, or deleted
CREATE OR REPLACE FUNCTION public.trigger_recalc_fee_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_fee_balance(OLD.student_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_fee_balance(NEW.student_id);
    RETURN NEW;
  END IF;
END;
$$;

CREATE TRIGGER trg_recalc_fee_on_payment
AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION trigger_recalc_fee_on_payment();

-- Trigger: recalculate when student's course or study_mode changes
CREATE OR REPLACE FUNCTION public.trigger_recalc_fee_on_student_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.course_id IS DISTINCT FROM NEW.course_id OR OLD.study_mode IS DISTINCT FROM NEW.study_mode THEN
    PERFORM recalculate_fee_balance(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_recalc_fee_on_student_change
AFTER UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION trigger_recalc_fee_on_student_change();
