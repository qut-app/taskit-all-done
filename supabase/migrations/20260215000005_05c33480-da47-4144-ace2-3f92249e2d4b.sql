
-- 1. Create wallets table for dual-balance tracking
CREATE TABLE public.wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  escrow_balance NUMERIC NOT NULL DEFAULT 0,
  pending_withdrawal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet" ON public.wallets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert wallets" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all wallets" ON public.wallets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-create wallet for new users via trigger
CREATE OR REPLACE FUNCTION public.handle_new_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_create_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_wallet();

-- 2. Create platform_revenue table
CREATE TABLE public.platform_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escrow_transaction_id UUID REFERENCES public.escrow_transactions(id),
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  commission_rate NUMERIC NOT NULL DEFAULT 0,
  provider_id UUID NOT NULL,
  job_id UUID NOT NULL,
  month_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage platform revenue" ON public.platform_revenue
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create platform_revenue_summary view-like table for monthly breakdown
CREATE TABLE public.platform_revenue_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  month_year TEXT NOT NULL UNIQUE,
  total_commission NUMERIC NOT NULL DEFAULT 0,
  total_transactions INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_revenue_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage revenue summary" ON public.platform_revenue_summary
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Add escrow release delay column
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS release_eligible_at TIMESTAMP WITH TIME ZONE;

-- 5. Create secure escrow release function
CREATE OR REPLACE FUNCTION public.process_escrow_release(_escrow_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_escrow RECORD;
  v_commission_rate NUMERIC;
  v_commission NUMERIC;
  v_provider_payout NUMERIC;
  v_month_year TEXT;
  v_is_subscribed BOOLEAN;
BEGIN
  -- Get escrow
  SELECT * INTO v_escrow FROM escrow_transactions WHERE id = _escrow_id AND status = 'held';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Escrow not found or not in held status');
  END IF;

  -- Check 24-hour delay
  IF v_escrow.release_eligible_at IS NOT NULL AND now() < v_escrow.release_eligible_at THEN
    RETURN jsonb_build_object('error', 'Release not yet eligible (24-hour delay)');
  END IF;

  -- Check subscription status for commission rate
  SELECT EXISTS(
    SELECT 1 FROM subscriptions
    WHERE user_id = v_escrow.payee_id
      AND status = 'active'
      AND expires_at > now()
  ) INTO v_is_subscribed;

  IF v_is_subscribed THEN
    v_commission_rate := 0.09;
  ELSE
    v_commission_rate := 0.20;
  END IF;

  v_commission := ROUND(v_escrow.amount * v_commission_rate, 2);
  v_provider_payout := v_escrow.amount - v_commission;
  v_month_year := to_char(now(), 'YYYY-MM');

  -- Update escrow
  UPDATE escrow_transactions
  SET status = 'released',
      released_at = now(),
      platform_commission = v_commission,
      provider_earnings = v_provider_payout,
      commission_rate = v_commission_rate
  WHERE id = _escrow_id;

  -- Deduct from payer wallet escrow_balance
  UPDATE wallets
  SET escrow_balance = escrow_balance - v_escrow.amount,
      updated_at = now()
  WHERE user_id = v_escrow.payer_id;

  -- Credit provider available_balance
  UPDATE wallets
  SET available_balance = available_balance + v_provider_payout,
      updated_at = now()
  WHERE user_id = v_escrow.payee_id;

  -- Ledger: escrow release to provider
  INSERT INTO wallet_transactions (user_id, type, source, amount, reference, escrow_transaction_id)
  VALUES (v_escrow.payee_id, 'credit', 'escrow_release', v_provider_payout, v_escrow.paystack_reference, _escrow_id);

  -- Ledger: commission deduction
  INSERT INTO wallet_transactions (user_id, type, source, amount, reference, escrow_transaction_id)
  VALUES (v_escrow.payee_id, 'debit', 'commission', v_commission, 'commission_' || v_escrow.paystack_reference, _escrow_id);

  -- Platform revenue record
  INSERT INTO platform_revenue (escrow_transaction_id, commission_amount, commission_rate, provider_id, job_id, month_year)
  VALUES (_escrow_id, v_commission, v_commission_rate, v_escrow.payee_id, v_escrow.job_id, v_month_year);

  -- Update monthly summary
  INSERT INTO platform_revenue_summary (month_year, total_commission, total_transactions)
  VALUES (v_month_year, v_commission, 1)
  ON CONFLICT (month_year) DO UPDATE
  SET total_commission = platform_revenue_summary.total_commission + v_commission,
      total_transactions = platform_revenue_summary.total_transactions + 1,
      updated_at = now();

  -- Notify provider
  INSERT INTO notifications (user_id, title, message, type, metadata)
  VALUES (v_escrow.payee_id, '💸 Payment Released',
    '₦' || v_provider_payout::TEXT || ' has been released to your wallet.',
    'escrow',
    jsonb_build_object('escrow_id', _escrow_id, 'amount', v_provider_payout, 'commission', v_commission));

  RETURN jsonb_build_object('success', true, 'provider_payout', v_provider_payout, 'commission', v_commission);
END;
$$;

-- 6. Function to hold funds in escrow (called after payment)
CREATE OR REPLACE FUNCTION public.hold_escrow_funds(_escrow_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_escrow RECORD;
BEGIN
  SELECT * INTO v_escrow FROM escrow_transactions WHERE id = _escrow_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Escrow not found or not pending');
  END IF;

  -- Update escrow status with 24-hour release delay
  UPDATE escrow_transactions
  SET status = 'held',
      release_eligible_at = now() + interval '24 hours',
      auto_release_at = now() + interval '3 days'
  WHERE id = _escrow_id;

  -- Add to payer escrow_balance
  UPDATE wallets
  SET escrow_balance = escrow_balance + v_escrow.amount,
      updated_at = now()
  WHERE user_id = v_escrow.payer_id;

  -- Ensure wallet exists for payer
  IF NOT FOUND THEN
    INSERT INTO wallets (user_id, escrow_balance) VALUES (v_escrow.payer_id, v_escrow.amount);
  END IF;

  -- Ensure wallet exists for payee
  INSERT INTO wallets (user_id) VALUES (v_escrow.payee_id) ON CONFLICT (user_id) DO NOTHING;

  -- Ledger entry
  INSERT INTO wallet_transactions (user_id, type, source, amount, reference, escrow_transaction_id)
  VALUES (v_escrow.payer_id, 'debit', 'escrow_hold', v_escrow.amount, v_escrow.paystack_reference, _escrow_id);

  RETURN jsonb_build_object('success', true);
END;
$$;
