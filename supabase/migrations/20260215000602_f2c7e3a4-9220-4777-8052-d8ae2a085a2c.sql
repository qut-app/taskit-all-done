
-- 1. Create trust_scores table
CREATE TABLE public.trust_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  completed_jobs_factor INTEGER NOT NULL DEFAULT 0,
  review_factor INTEGER NOT NULL DEFAULT 0,
  on_time_factor INTEGER NOT NULL DEFAULT 0,
  account_age_factor INTEGER NOT NULL DEFAULT 0,
  dispute_penalty INTEGER NOT NULL DEFAULT 0,
  cancellation_penalty INTEGER NOT NULL DEFAULT 0,
  report_penalty INTEGER NOT NULL DEFAULT 0,
  role_switch_penalty INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trust score" ON public.trust_scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all trust scores" ON public.trust_scores
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Create transaction_risk_assessments table
CREATE TABLE public.transaction_risk_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  escrow_transaction_id UUID REFERENCES public.escrow_transactions(id),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  auto_hold BOOLEAN NOT NULL DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transaction_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage risk assessments" ON public.transaction_risk_assessments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Trust score calculation function
CREATE OR REPLACE FUNCTION public.calculate_trust_score(_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score INTEGER := 50;
  v_completed_jobs INTEGER;
  v_avg_rating NUMERIC;
  v_on_time_pct INTEGER;
  v_account_age_days INTEGER;
  v_disputes INTEGER;
  v_cancellations INTEGER;
  v_reports INTEGER;
  v_role_switches INTEGER;
  v_completed_factor INTEGER := 0;
  v_review_factor INTEGER := 0;
  v_ontime_factor INTEGER := 0;
  v_age_factor INTEGER := 0;
  v_dispute_pen INTEGER := 0;
  v_cancel_pen INTEGER := 0;
  v_report_pen INTEGER := 0;
  v_switch_pen INTEGER := 0;
BEGIN
  -- Completed jobs (as provider or requester)
  SELECT COUNT(*) INTO v_completed_jobs FROM jobs
    WHERE (requester_id = _user_id) AND status = 'completed';
  SELECT v_completed_jobs + COALESCE((
    SELECT COUNT(*) FROM job_applications ja JOIN jobs j ON j.id = ja.job_id
    WHERE ja.provider_id = _user_id AND ja.status = 'accepted' AND j.status = 'completed'
  ), 0) INTO v_completed_jobs;
  v_completed_factor := LEAST(v_completed_jobs * 2, 15);

  -- Average review rating
  SELECT COALESCE(AVG(overall_rating), 0) INTO v_avg_rating FROM reviews WHERE reviewee_id = _user_id;
  v_review_factor := CASE WHEN v_avg_rating >= 4.5 THEN 15 WHEN v_avg_rating >= 4.0 THEN 10 WHEN v_avg_rating >= 3.0 THEN 5 ELSE 0 END;

  -- On-time delivery
  SELECT COALESCE(on_time_delivery_score, 100) INTO v_on_time_pct FROM provider_profiles WHERE user_id = _user_id;
  v_ontime_factor := CASE WHEN v_on_time_pct >= 95 THEN 10 WHEN v_on_time_pct >= 80 THEN 5 ELSE 0 END;

  -- Account age
  SELECT EXTRACT(DAY FROM now() - created_at)::INTEGER INTO v_account_age_days FROM profiles WHERE user_id = _user_id;
  v_age_factor := CASE WHEN v_account_age_days >= 365 THEN 10 WHEN v_account_age_days >= 180 THEN 7 WHEN v_account_age_days >= 30 THEN 3 ELSE 0 END;

  -- Disputes
  SELECT COUNT(*) INTO v_disputes FROM escrow_transactions WHERE (payer_id = _user_id OR payee_id = _user_id) AND status = 'disputed';
  v_dispute_pen := LEAST(v_disputes * 10, 30);

  -- Cancellations
  SELECT COUNT(*) INTO v_cancellations FROM jobs WHERE requester_id = _user_id AND status = 'cancelled';
  v_cancel_pen := LEAST(v_cancellations * 5, 20);

  -- Reports (received)
  SELECT COUNT(*) INTO v_reports FROM reports WHERE reported_user_id = _user_id AND status != 'dismissed';
  v_report_pen := LEAST(v_reports * 5, 20);

  -- Role switches in 48h
  SELECT COUNT(*) INTO v_role_switches FROM role_switch_logs
    WHERE user_id = _user_id AND created_at > now() - interval '48 hours';
  v_switch_pen := CASE WHEN v_role_switches >= 5 THEN 10 WHEN v_role_switches >= 3 THEN 5 ELSE 0 END;

  v_score := 50 + v_completed_factor + v_review_factor + v_ontime_factor + v_age_factor
             - v_dispute_pen - v_cancel_pen - v_report_pen - v_switch_pen;
  v_score := GREATEST(0, LEAST(100, v_score));

  -- Upsert trust score
  INSERT INTO trust_scores (user_id, score, completed_jobs_factor, review_factor, on_time_factor,
    account_age_factor, dispute_penalty, cancellation_penalty, report_penalty, role_switch_penalty, last_calculated_at)
  VALUES (_user_id, v_score, v_completed_factor, v_review_factor, v_ontime_factor,
    v_age_factor, v_dispute_pen, v_cancel_pen, v_report_pen, v_switch_pen, now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = v_score, completed_jobs_factor = v_completed_factor, review_factor = v_review_factor,
    on_time_factor = v_ontime_factor, account_age_factor = v_age_factor, dispute_penalty = v_dispute_pen,
    cancellation_penalty = v_cancel_pen, report_penalty = v_report_pen, role_switch_penalty = v_switch_pen,
    last_calculated_at = now();

  RETURN v_score;
END;
$$;

-- 4. Risk assessment function for transactions
CREATE OR REPLACE FUNCTION public.assess_transaction_risk(_escrow_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_escrow RECORD;
  v_risk_level TEXT := 'low';
  v_factors JSONB := '[]'::jsonb;
  v_account_age INTEGER;
  v_disputes INTEGER;
  v_withdrawals INTEGER;
  v_trust_score INTEGER;
BEGIN
  SELECT * INTO v_escrow FROM escrow_transactions WHERE id = _escrow_id;
  IF NOT FOUND THEN RETURN 'low'; END IF;

  -- Check account age (new account + large payment)
  SELECT EXTRACT(DAY FROM now() - created_at)::INTEGER INTO v_account_age FROM profiles WHERE user_id = v_escrow.payer_id;
  IF v_account_age < 7 AND v_escrow.amount > 50000 THEN
    v_risk_level := 'high';
    v_factors := v_factors || jsonb_build_array('New account with large payment');
  ELSIF v_account_age < 30 AND v_escrow.amount > 100000 THEN
    v_risk_level := CASE WHEN v_risk_level = 'high' THEN 'high' ELSE 'medium' END;
    v_factors := v_factors || jsonb_build_array('Young account with significant payment');
  END IF;

  -- Check disputes history
  SELECT COUNT(*) INTO v_disputes FROM escrow_transactions
    WHERE (payer_id = v_escrow.payer_id OR payee_id = v_escrow.payee_id) AND status = 'disputed';
  IF v_disputes >= 3 THEN
    v_risk_level := 'high';
    v_factors := v_factors || jsonb_build_array('Multiple disputes: ' || v_disputes);
  ELSIF v_disputes >= 1 THEN
    v_risk_level := CASE WHEN v_risk_level = 'high' THEN 'high' ELSE 'medium' END;
    v_factors := v_factors || jsonb_build_array('Has dispute history');
  END IF;

  -- Rapid withdrawals
  SELECT COUNT(*) INTO v_withdrawals FROM withdrawal_requests
    WHERE user_id = v_escrow.payee_id AND created_at > now() - interval '24 hours';
  IF v_withdrawals >= 3 THEN
    v_risk_level := 'high';
    v_factors := v_factors || jsonb_build_array('Rapid withdrawal requests: ' || v_withdrawals);
  END IF;

  -- Trust score check
  SELECT score INTO v_trust_score FROM trust_scores WHERE user_id = v_escrow.payee_id;
  IF v_trust_score IS NOT NULL AND v_trust_score < 30 THEN
    v_risk_level := 'high';
    v_factors := v_factors || jsonb_build_array('Low trust score: ' || v_trust_score);
  ELSIF v_trust_score IS NOT NULL AND v_trust_score < 50 THEN
    v_risk_level := CASE WHEN v_risk_level = 'high' THEN 'high' ELSE 'medium' END;
    v_factors := v_factors || jsonb_build_array('Below average trust score: ' || v_trust_score);
  END IF;

  -- Insert risk assessment
  INSERT INTO transaction_risk_assessments (user_id, escrow_transaction_id, risk_level, risk_factors, auto_hold)
  VALUES (v_escrow.payee_id, _escrow_id, v_risk_level, v_factors, v_risk_level = 'high');

  -- If high risk, flag the account
  IF v_risk_level = 'high' THEN
    INSERT INTO suspicious_flags (user_id, flag_type, description)
    VALUES (v_escrow.payee_id, 'high_risk_transaction', 'Auto-flagged: ' || v_factors::text)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_risk_level;
END;
$$;
