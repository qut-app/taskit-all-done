
-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawal requests
CREATE POLICY "Users can view own withdrawal requests"
ON public.withdrawal_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create withdrawal requests
CREATE POLICY "Users can create withdrawal requests"
ON public.withdrawal_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can manage all withdrawal requests
CREATE POLICY "Admins can manage withdrawal requests"
ON public.withdrawal_requests
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);
