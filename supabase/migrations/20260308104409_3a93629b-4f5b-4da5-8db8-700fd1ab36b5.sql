
-- Drop existing restrictive storage policies for submissions and recreate as permissive
DROP POLICY IF EXISTS "Students can upload submissions" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read submissions storage" ON storage.objects;

-- Recreate as permissive (explicitly)
CREATE POLICY "Allow upload to submissions bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'submissions');

CREATE POLICY "Allow read from submissions bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'submissions');

CREATE POLICY "Allow update in submissions bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'submissions');
