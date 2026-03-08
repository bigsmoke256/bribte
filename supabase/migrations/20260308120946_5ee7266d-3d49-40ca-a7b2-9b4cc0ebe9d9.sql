
-- Receipt uploads table
CREATE TABLE public.receipt_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id),
  file_url TEXT NOT NULL,
  file_hash TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Receipt extractions table (OCR results)
CREATE TABLE public.receipt_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.receipt_uploads(id) ON DELETE CASCADE,
  amount NUMERIC,
  transaction_id TEXT,
  payment_date DATE,
  sender_name TEXT,
  payment_provider TEXT,
  raw_text TEXT,
  confidence_score REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment transactions for duplicate detection
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id),
  transaction_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  receipt_id UUID REFERENCES public.receipt_uploads(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(transaction_id)
);

-- Enable RLS
ALTER TABLE public.receipt_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for receipt_uploads
CREATE POLICY "Students can insert own receipts" ON public.receipt_uploads
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM students s WHERE s.id = receipt_uploads.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Students can view own receipts" ON public.receipt_uploads
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = receipt_uploads.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins can manage all receipts" ON public.receipt_uploads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for receipt_extractions
CREATE POLICY "Students can view own extractions" ON public.receipt_extractions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM receipt_uploads ru 
    JOIN students s ON s.id = ru.student_id 
    WHERE ru.id = receipt_extractions.receipt_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all extractions" ON public.receipt_extractions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for payment_transactions
CREATE POLICY "Students can view own transactions" ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM students s WHERE s.id = payment_transactions.student_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins can manage all transactions" ON public.payment_transactions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Enable realtime for receipt_uploads so students see status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.receipt_uploads;
