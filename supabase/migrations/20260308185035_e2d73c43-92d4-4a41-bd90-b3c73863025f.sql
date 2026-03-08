
ALTER TABLE receipt_extractions 
  ADD COLUMN IF NOT EXISTS student_class text,
  ADD COLUMN IF NOT EXISTS channel_depositor text,
  ADD COLUMN IF NOT EXISTS channel_memo text,
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS trans_type text,
  ADD COLUMN IF NOT EXISTS amount_in_words text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS validation_flags jsonb DEFAULT '{}';
