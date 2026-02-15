
-- Add bio column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;

-- Add provider delivery tracking to escrow_transactions
ALTER TABLE public.escrow_transactions 
  ADD COLUMN IF NOT EXISTS cancellation_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS dispute_evidence_urls text[];

-- Create achievements table
CREATE TABLE public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  photo_url text,
  year_achieved integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Users can view achievements of any user (public display)
CREATE POLICY "Anyone authenticated can view achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can create own achievements
CREATE POLICY "Users can create own achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update own achievements
CREATE POLICY "Users can update own achievements"
  ON public.achievements FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own achievements
CREATE POLICY "Users can delete own achievements"
  ON public.achievements FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can manage all achievements (for removing fake ones)
CREATE POLICY "Admins can manage all achievements"
  ON public.achievements FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
