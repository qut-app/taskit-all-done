
-- Create wallet_transactions table for tracking all money movements
CREATE TABLE public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  source TEXT NOT NULL CHECK (source IN ('escrow_release', 'refund', 'withdrawal', 'escrow_hold', 'commission')),
  amount NUMERIC NOT NULL,
  reference TEXT,
  escrow_transaction_id UUID REFERENCES public.escrow_transactions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own wallet transactions
CREATE POLICY "Users can view own wallet transactions"
ON public.wallet_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Only system (via edge functions with service role) should insert
-- But allow authenticated users to view; inserts happen server-side
CREATE POLICY "Admins can manage wallet transactions"
ON public.wallet_transactions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add wallet_balance column to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0;

-- Create index for faster lookups
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_escrow_id ON public.wallet_transactions(escrow_transaction_id);
