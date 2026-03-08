
-- Add capacity to courses and status to enrollments
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS max_capacity integer DEFAULT 50;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';
