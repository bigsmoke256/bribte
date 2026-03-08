
CREATE OR REPLACE FUNCTION public.submit_clearance_request(
  p_student_id uuid,
  p_clearance_type text,
  p_academic_year text,
  p_semester integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req_id uuid;
  v_user_id uuid;
BEGIN
  -- Verify the student belongs to the calling user
  SELECT user_id INTO v_user_id FROM students WHERE id = p_student_id;
  IF v_user_id IS NULL OR v_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Create the clearance request
  INSERT INTO clearance_requests (student_id, clearance_type, academic_year, semester, status)
  VALUES (p_student_id, p_clearance_type, p_academic_year, p_semester, 'pending')
  RETURNING id INTO v_req_id;

  -- Create the 4 clearance steps
  INSERT INTO clearance_steps (clearance_id, step_name, step_order, status) VALUES
    (v_req_id, 'Finance Office', 0, 'pending'),
    (v_req_id, 'Library', 1, 'pending'),
    (v_req_id, 'Department Head', 2, 'pending'),
    (v_req_id, 'Final Admin Approval', 3, 'pending');

  RETURN v_req_id;
END;
$$;
