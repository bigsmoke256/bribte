
-- Drop and recreate the upload policy with correct conditions
DROP POLICY IF EXISTS "Students can upload receipts" ON storage.objects;

CREATE POLICY "Students can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] IS NOT NULL);
