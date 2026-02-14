
-- Create role_switch_logs table
CREATE TABLE public.role_switch_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  previous_role text NOT NULL,
  new_role text NOT NULL,
  ip_address text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.role_switch_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all role switch logs"
ON public.role_switch_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own logs"
ON public.role_switch_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own logs"
ON public.role_switch_logs FOR SELECT
USING (auth.uid() = user_id);

-- Add index for abuse detection queries
CREATE INDEX idx_role_switch_logs_user_created ON public.role_switch_logs(user_id, created_at DESC);
CREATE INDEX idx_reports_reported_user_created ON public.reports(reported_user_id, created_at DESC);
CREATE INDEX idx_reports_status ON public.reports(status);
