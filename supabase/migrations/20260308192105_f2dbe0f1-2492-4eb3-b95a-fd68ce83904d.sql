-- Delete the fake auto-approved payment
DELETE FROM payment_transactions WHERE transaction_id = 'TEST-48392017';
DELETE FROM payments WHERE id = 'cdc351c9-442e-4a82-ad15-29869e039f6c';

-- Recalculate the student's balance after removing fake payment
DO $$
DECLARE
  v_student_id uuid;
BEGIN
  SELECT s.id INTO v_student_id FROM students s 
  JOIN payments p ON p.student_id = s.id 
  WHERE s.registration_number IS NULL 
  LIMIT 1;
  
  -- Recalc all students to be safe
  FOR v_student_id IN SELECT id FROM students LOOP
    PERFORM recalculate_fee_balance(v_student_id);
  END LOOP;
END $$;
