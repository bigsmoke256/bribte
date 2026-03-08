
-- Update submissions bucket to allow files up to 100MB and all MIME types
UPDATE storage.buckets 
SET file_size_limit = 104857600,
    allowed_mime_types = NULL
WHERE id = 'submissions';
