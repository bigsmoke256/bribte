
-- Recalculate ALL existing students' fee balances to fix incorrect amounts
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM students WHERE course_id IS NOT NULL LOOP
    PERFORM recalculate_fee_balance(r.id);
  END LOOP;
END;
$$;
