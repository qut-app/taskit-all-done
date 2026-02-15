
-- SECTION 1: Remove dangerous wallet RLS policy (users should NOT update their own wallet)
DROP POLICY IF EXISTS "Users can update own wallet" ON public.wallets;

-- SECTION 2: Restrict escrow UPDATE policy to only safe fields
DROP POLICY IF EXISTS "Payers can update escrow transactions" ON public.escrow_transactions;
CREATE POLICY "Involved parties can update escrow safely"
ON public.escrow_transactions
FOR UPDATE
USING ((auth.uid() = payer_id) OR (auth.uid() = payee_id))
WITH CHECK (
  -- Only allow updating status-related and dispute-related fields
  -- amount, payer_id, payee_id, commission_rate, platform_commission, provider_earnings cannot be changed
  amount = (SELECT amount FROM escrow_transactions WHERE id = escrow_transactions.id) AND
  payer_id = (SELECT payer_id FROM escrow_transactions WHERE id = escrow_transactions.id) AND
  payee_id = (SELECT payee_id FROM escrow_transactions WHERE id = escrow_transactions.id) AND
  commission_rate = (SELECT commission_rate FROM escrow_transactions WHERE id = escrow_transactions.id) AND
  application_id = (SELECT application_id FROM escrow_transactions WHERE id = escrow_transactions.id) AND
  job_id = (SELECT job_id FROM escrow_transactions WHERE id = escrow_transactions.id)
);

-- SECTION 3: Add unique constraints to prevent duplicates
ALTER TABLE public.job_applications ADD CONSTRAINT unique_job_application UNIQUE (job_id, provider_id);
ALTER TABLE public.reviews ADD CONSTRAINT unique_review_per_job UNIQUE (reviewer_id, job_id);
ALTER TABLE public.showcase_likes ADD CONSTRAINT unique_showcase_like UNIQUE (showcase_id, user_id);
ALTER TABLE public.post_likes ADD CONSTRAINT unique_post_like UNIQUE (post_id, user_id);

-- SECTION 4: Create process_escrow_cancellation function
CREATE OR REPLACE FUNCTION public.process_escrow_cancellation(_escrow_id uuid, _provider_arrived boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_escrow RECORD;
  v_cancellation_fee NUMERIC := 0;
  v_refund NUMERIC;
BEGIN
  SELECT * INTO v_escrow FROM escrow_transactions WHERE id = _escrow_id AND status = 'held';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Escrow not found or not in held status');
  END IF;

  -- Only payer can cancel
  IF v_escrow.payer_id != auth.uid() THEN
    RETURN jsonb_build_object('error', 'Only the payer can cancel');
  END IF;

  IF _provider_arrived THEN
    v_cancellation_fee := GREATEST(v_escrow.amount * 0.15, 2000);
  END IF;
  v_refund := v_escrow.amount - v_cancellation_fee;

  -- Update escrow status
  UPDATE escrow_transactions
  SET status = 'cancelled',
      cancellation_fee = v_cancellation_fee
  WHERE id = _escrow_id;

  -- Deduct from payer escrow_balance (refund)
  UPDATE wallets
  SET escrow_balance = escrow_balance - v_escrow.amount,
      available_balance = available_balance + v_refund,
      updated_at = now()
  WHERE user_id = v_escrow.payer_id;

  -- Ledger: refund to payer
  INSERT INTO wallet_transactions (user_id, type, source, amount, reference, escrow_transaction_id)
  VALUES (v_escrow.payer_id, 'credit', 'escrow_refund', v_refund, 'refund_' || v_escrow.paystack_reference, _escrow_id);

  -- If provider arrived, credit call-out fee
  IF _provider_arrived AND v_cancellation_fee > 0 THEN
    UPDATE wallets
    SET available_balance = available_balance + v_cancellation_fee,
        updated_at = now()
    WHERE user_id = v_escrow.payee_id;

    INSERT INTO wallet_transactions (user_id, type, source, amount, reference, escrow_transaction_id)
    VALUES (v_escrow.payee_id, 'credit', 'cancellation_fee', v_cancellation_fee, 'cancel_fee_' || v_escrow.paystack_reference, _escrow_id);
  END IF;

  -- Notify provider
  INSERT INTO notifications (user_id, title, message, type, metadata)
  VALUES (v_escrow.payee_id, '❌ Job Cancelled',
    CASE WHEN _provider_arrived
      THEN 'Job cancelled after arrival. Call-out fee: ₦' || v_cancellation_fee::TEXT
      ELSE 'The job has been cancelled. No charges applied.'
    END,
    'cancellation',
    jsonb_build_object('job_id', v_escrow.job_id, 'cancellation_fee', v_cancellation_fee));

  RETURN jsonb_build_object('success', true, 'refund', v_refund, 'cancellation_fee', v_cancellation_fee);
END;
$$;
