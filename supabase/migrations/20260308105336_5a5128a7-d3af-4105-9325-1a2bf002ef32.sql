
-- Make submissions bucket public so files can be accessed directly
UPDATE storage.buckets 
SET public = true 
WHERE id = 'submissions';
