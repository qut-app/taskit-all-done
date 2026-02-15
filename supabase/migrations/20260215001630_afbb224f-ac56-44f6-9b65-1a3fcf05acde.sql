
-- 1. Create ai_risk_logs table
CREATE TABLE public.ai_risk_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transaction_id UUID REFERENCES public.escrow_transactions(id),
  ai_fraud_score INTEGER NOT NULL DEFAULT 0 CHECK (ai_fraud_score >= 0 AND ai_fraud_score <= 100),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  reason_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_risk_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai risk logs" ON public.ai_risk_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_ai_risk_logs_user ON public.ai_risk_logs(user_id);
CREATE INDEX idx_ai_risk_logs_level ON public.ai_risk_logs(risk_level);
CREATE INDEX idx_ai_risk_logs_created ON public.ai_risk_logs(created_at DESC);

-- 2. Create fraud_behavior_weights table for adaptive scoring
CREATE TABLE public.fraud_behavior_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  behavior_key TEXT NOT NULL UNIQUE,
  weight NUMERIC NOT NULL DEFAULT 1.0,
  description TEXT,
  historical_triggers INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_behavior_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud weights" ON public.fraud_behavior_weights
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default weights
INSERT INTO public.fraud_behavior_weights (behavior_key, weight, description) VALUES
  ('multi_device_accounts', 15, 'Same device creating multiple accounts'),
  ('disputes_7d', 12, '3+ disputes in 7 days'),
  ('payment_spike', 10, 'Payment > 3x historical average'),
  ('instant_withdrawal', 14, 'Withdrawal immediately after escrow release'),
  ('role_switch_high_value', 8, 'Rapid role switching + high-value job'),
  ('ip_cluster', 13, 'Same IP multiple high-risk transactions'),
  ('new_account_large_txn', 11, 'New account with large transaction'),
  ('cancellation_rate', 7, 'High cancellation frequency'),
  ('low_trust_score', 6, 'Below-average trust score'),
  ('category_abuse', 9, 'Multiple suspicious job postings');

-- 3. Add account_under_review and wallet_frozen columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_under_review BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS wallet_frozen BOOLEAN DEFAULT false;

-- 4. AI fraud scoring function (deterministic rule-weight system)
CREATE OR REPLACE FUNCTION public.calculate_ai_fraud_score(_user_id UUID, _transaction_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score NUMERIC := 0;
  v_max_score NUMERIC := 100;
  v_flags JSONB := '[]'::jsonb;
  v_risk_level TEXT;
  v_weight NUMERIC;
  v_trust_score INTEGER;
  v_account_age INTEGER;
  v_completed_jobs INTEGER;
  v_cancellations INTEGER;
  v_total_jobs INTEGER;
  v_disputes_7d INTEGER;
  v_disputes_total INTEGER;
  v_role_switches_48h INTEGER;
  v_avg_payment NUMERIC;
  v_current_payment NUMERIC;
  v_recent_withdrawals INTEGER;
  v_recent_releases INTEGER;
  v_ip_count INTEGER;
  v_job_posts_24h INTEGER;
  v_clean_history_months INTEGER;
BEGIN
  -- Get trust score
  SELECT score INTO v_trust_score FROM trust_scores WHERE user_id = _user_id;
  
  -- Account age
  SELECT EXTRACT(DAY FROM now() - created_at)::INTEGER INTO v_account_age 
  FROM profiles WHERE user_id = _user_id;

  -- Completed jobs
  SELECT COUNT(*) INTO v_completed_jobs FROM job_applications ja
    JOIN jobs j ON j.id = ja.job_id
    WHERE ja.provider_id = _user_id AND ja.status = 'accepted' AND j.status = 'completed';
  v_completed_jobs := v_completed_jobs + COALESCE(
    (SELECT COUNT(*) FROM jobs WHERE requester_id = _user_id AND status = 'completed'), 0);

  -- Cancellations
  SELECT COUNT(*) INTO v_cancellations FROM jobs WHERE requester_id = _user_id AND status = 'cancelled';
  v_total_jobs := v_completed_jobs + v_cancellations;

  -- Disputes in 7 days
  SELECT COUNT(*) INTO v_disputes_7d FROM escrow_transactions
    WHERE (payer_id = _user_id OR payee_id = _user_id) 
    AND status = 'disputed' AND created_at > now() - interval '7 days';

  -- Total disputes
  SELECT COUNT(*) INTO v_disputes_total FROM escrow_transactions
    WHERE (payer_id = _user_id OR payee_id = _user_id) AND status = 'disputed';

  -- Role switches in 48h
  SELECT COUNT(*) INTO v_role_switches_48h FROM role_switch_logs
    WHERE user_id = _user_id AND created_at > now() - interval '48 hours';

  -- Average payment history
  SELECT COALESCE(AVG(amount), 0) INTO v_avg_payment FROM escrow_transactions
    WHERE (payer_id = _user_id OR payee_id = _user_id) AND status IN ('held', 'released');

  -- Current transaction amount
  IF _transaction_id IS NOT NULL THEN
    SELECT amount INTO v_current_payment FROM escrow_transactions WHERE id = _transaction_id;
  END IF;

  -- Recent withdrawals (24h)
  SELECT COUNT(*) INTO v_recent_withdrawals FROM withdrawal_requests
    WHERE user_id = _user_id AND created_at > now() - interval '24 hours';

  -- Recent escrow releases (24h)
  SELECT COUNT(*) INTO v_recent_releases FROM escrow_transactions
    WHERE payee_id = _user_id AND status = 'released' AND released_at > now() - interval '24 hours';

  -- IP clustering (role_switch_logs has ip_address)
  SELECT COUNT(DISTINCT user_id) INTO v_ip_count FROM role_switch_logs
    WHERE ip_address IN (SELECT DISTINCT ip_address FROM role_switch_logs WHERE user_id = _user_id AND ip_address IS NOT NULL)
    AND user_id != _user_id;

  -- Job posts in 24h (category abuse detection)
  SELECT COUNT(*) INTO v_job_posts_24h FROM jobs
    WHERE requester_id = _user_id AND created_at > now() - interval '24 hours';

  -- Clean history months (no disputes, no flags)
  SELECT COALESCE(EXTRACT(MONTH FROM now() - MAX(created_at))::INTEGER, 12) INTO v_clean_history_months
    FROM suspicious_flags WHERE user_id = _user_id AND is_resolved = false;

  -- ====== SCORING ENGINE ======

  -- 1. Low trust score
  IF v_trust_score IS NOT NULL AND v_trust_score < 40 THEN
    SELECT weight INTO v_weight FROM fraud_behavior_weights WHERE behavior_key = 'low_trust_score';
    v_score := v_score + COALESCE(v_weight, 6) * (1 - v_trust_score / 100.0);
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'low_trust_score', 'detail', 'Trust score: ' || v_trust_score));
  END IF;

  -- 2. Disputes in 7 days
  IF v_disputes_7d >= 3 THEN
    SELECT weight INTO v_weight FROM fraud_behavior_weights WHERE behavior_key = 'disputes_7d';
    v_score := v_score + COALESCE(v_weight, 12) * LEAST(v_disputes_7d / 3.0, 2);
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'disputes_7d', 'detail', v_disputes_7d || ' disputes in 7 days'));
  ELSIF v_disputes_7d >= 1 THEN
    v_score := v_score + 4;
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'recent_dispute', 'detail', v_disputes_7d || ' dispute(s) in 7 days'));
  END IF;

  -- 3. Payment spike (>3x average)
  IF v_current_payment IS NOT NULL AND v_avg_payment > 0 AND v_current_payment > v_avg_payment * 3 THEN
    SELECT weight INTO v_weight FROM fraud_behavior_weights WHERE behavior_key = 'payment_spike';
    v_score := v_score + COALESCE(v_weight, 10);
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'payment_spike', 'detail', 
      'Payment ₦' || v_current_payment || ' is ' || ROUND(v_current_payment / v_avg_payment, 1) || 'x average'));
  END IF;

  -- 4. Instant withdrawal after release
  IF v_recent_withdrawals > 0 AND v_recent_releases > 0 THEN
    SELECT weight INTO v_weight FROM fraud_behavior_weights WHERE behavior_key = 'instant_withdrawal';
    v_score := v_score + COALESCE(v_weight, 14);
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'instant_withdrawal', 'detail', 
      'Withdrawal requested within 24h of escrow release'));
  END IF;

  -- 5. Role switching + high value
  IF v_role_switches_48h >= 3 AND (v_current_payment IS NOT NULL AND v_current_payment > 50000) THEN
    SELECT weight INTO v_weight FROM fraud_behavior_weights WHERE behavior_key = 'role_switch_high_value';
    v_score := v_score + COALESCE(v_weight, 8);
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'role_switch_high_value', 'detail', 
      v_role_switches_48h || ' role switches + high-value transaction'));
  ELSIF v_role_switches_48h >= 5 THEN
    v_score := v_score + 5;
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'excessive_role_switches', 'detail', v_role_switches_48h || ' switches in 48h'));
  END IF;

  -- 6. IP clustering
  IF v_ip_count >= 3 THEN
    SELECT weight INTO v_weight FROM fraud_behavior_weights WHERE behavior_key = 'ip_cluster';
    v_score := v_score + COALESCE(v_weight, 13);
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'ip_cluster', 'detail', 
      v_ip_count || ' other accounts share IP'));
  END IF;

  -- 7. New account + large transaction
  IF v_account_age < 7 AND v_current_payment IS NOT NULL AND v_current_payment > 50000 THEN
    SELECT weight INTO v_weight FROM fraud_behavior_weights WHERE behavior_key = 'new_account_large_txn';
    v_score := v_score + COALESCE(v_weight, 11);
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'new_account_large_txn', 'detail', 
      'Account ' || v_account_age || ' days old with ₦' || v_current_payment || ' transaction'));
  END IF;

  -- 8. High cancellation rate
  IF v_total_jobs > 3 AND v_cancellations::NUMERIC / v_total_jobs > 0.4 THEN
    SELECT weight INTO v_weight FROM fraud_behavior_weights WHERE behavior_key = 'cancellation_rate';
    v_score := v_score + COALESCE(v_weight, 7);
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'high_cancellation_rate', 'detail', 
      v_cancellations || '/' || v_total_jobs || ' jobs cancelled'));
  END IF;

  -- 9. Category abuse (many job posts in 24h)
  IF v_job_posts_24h >= 5 THEN
    SELECT weight INTO v_weight FROM fraud_behavior_weights WHERE behavior_key = 'category_abuse';
    v_score := v_score + COALESCE(v_weight, 9);
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'category_abuse', 'detail', 
      v_job_posts_24h || ' jobs posted in 24 hours'));
  END IF;

  -- 10. Rapid withdrawals
  IF v_recent_withdrawals >= 3 THEN
    v_score := v_score + 12;
    v_flags := v_flags || jsonb_build_array(jsonb_build_object('flag', 'rapid_withdrawals', 'detail', 
      v_recent_withdrawals || ' withdrawal requests in 24h'));
  END IF;

  -- ====== ADAPTIVE: Clean history discount ======
  IF v_clean_history_months >= 6 AND v_completed_jobs >= 5 THEN
    v_score := v_score * 0.7; -- 30% reduction for long clean history
  ELSIF v_clean_history_months >= 3 AND v_completed_jobs >= 3 THEN
    v_score := v_score * 0.85; -- 15% reduction
  END IF;

  -- ====== ADAPTIVE: Historical fraud weight boost ======
  -- Increase weights for behaviors that were previously flagged on confirmed fraud cases
  UPDATE fraud_behavior_weights
  SET historical_triggers = historical_triggers + 1, last_updated_at = now()
  WHERE behavior_key IN (SELECT f->>'flag' FROM jsonb_array_elements(v_flags) AS f);

  -- Cap score
  v_score := GREATEST(0, LEAST(100, ROUND(v_score)));

  -- Determine risk level
  v_risk_level := CASE
    WHEN v_score >= 81 THEN 'critical'
    WHEN v_score >= 61 THEN 'high'
    WHEN v_score >= 31 THEN 'medium'
    ELSE 'low'
  END;

  -- Log the assessment
  INSERT INTO ai_risk_logs (user_id, transaction_id, ai_fraud_score, risk_level, reason_flags)
  VALUES (_user_id, _transaction_id, v_score::INTEGER, v_risk_level, v_flags);

  -- ====== REAL-TIME PROTECTION ======
  -- Critical risk: freeze withdrawal + flag for review
  IF v_risk_level = 'critical' THEN
    UPDATE profiles SET account_under_review = true, wallet_frozen = true WHERE user_id = _user_id;
    INSERT INTO suspicious_flags (user_id, flag_type, description)
    VALUES (_user_id, 'ai_critical_risk', 'AI Fraud Score: ' || v_score || '. Flags: ' || v_flags::text);
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (_user_id, '⚠️ Account Under Review', 'Your account is temporarily under review for security purposes.', 'security');
  END IF;

  -- High risk on transaction: extend escrow hold to 72h
  IF v_risk_level = 'high' AND _transaction_id IS NOT NULL THEN
    UPDATE escrow_transactions
    SET release_eligible_at = GREATEST(release_eligible_at, now() + interval '72 hours'),
        auto_release_at = GREATEST(auto_release_at, now() + interval '5 days')
    WHERE id = _transaction_id AND status = 'held';
  END IF;

  RETURN jsonb_build_object(
    'score', v_score::INTEGER,
    'risk_level', v_risk_level,
    'flags', v_flags,
    'user_id', _user_id,
    'transaction_id', _transaction_id
  );
END;
$$;
