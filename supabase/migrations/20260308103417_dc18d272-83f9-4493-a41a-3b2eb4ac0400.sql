
-- Add read policy for submissions storage
CREATE POLICY "Authenticated can read submissions storage"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'submissions');
