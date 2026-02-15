
-- Update the central commission resolver: process_escrow_release
-- FREE providers: 12% commission, PAID providers: 5% commission
CREATE OR REPLACE FUNCTION public.process_escrow_release(_escrow_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Check subscription status at PAYOUT TIME for provider (payee)
  SELECT EXISTS(
    SELECT 1 FROM subscriptions
    WHERE user_id = v_escrow.payee_id
      AND status = 'active'
      AND expires_at > now()
  ) INTO v_is_subscribed;

  -- CENTRAL COMMISSION RESOLVER: 5% for paid, 12% for free
  IF v_is_subscribed THEN
    v_commission_rate := 0.05;
  ELSE
    v_commission_rate := 0.12;
  END IF;

  v_commission := ROUND(v_escrow.amount * v_commission_rate, 2);
  v_provider_payout := v_escrow.amount - v_commission;
  v_month_year := to_char(now(), 'YYYY-MM');

  -- Update escrow with actual rates at payout time
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

  -- Platform revenue record (logs rate + subscription status for audit)
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
    jsonb_build_object(
      'escrow_id', _escrow_id,
      'amount', v_provider_payout,
      'commission', v_commission,
      'commission_rate', v_commission_rate,
      'subscription_status', CASE WHEN v_is_subscribed THEN 'paid' ELSE 'free' END
    ));

  RETURN jsonb_build_object(
    'success', true,
    'provider_payout', v_provider_payout,
    'commission', v_commission,
    'commission_rate', v_commission_rate,
    'subscription_status', CASE WHEN v_is_subscribed THEN 'paid' ELSE 'free' END
  );
END;
$function$;

-- Also update the default commission_rate on escrow_transactions table
ALTER TABLE public.escrow_transactions ALTER COLUMN commission_rate SET DEFAULT 0.12;
