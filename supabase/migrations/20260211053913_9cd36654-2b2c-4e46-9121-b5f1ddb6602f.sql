
-- Add columns to ads table for full ad creation flow
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS target_audience text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS location_targeting text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS budget numeric DEFAULT 0;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending_approval';
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS reject_reason text;
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS paystack_reference text;

-- Fix RLS policies for ads
DROP POLICY IF EXISTS "Users can view their own ads" ON public.ads;
DROP POLICY IF EXISTS "Users can create their own ads" ON public.ads;
DROP POLICY IF EXISTS "Anyone can view active ads" ON public.ads;
DROP POLICY IF EXISTS "Admins can manage ads" ON public.ads;

-- Admins full access
CREATE POLICY "Admins can manage ads"
ON public.ads FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view approved active ads
CREATE POLICY "Anyone can view active approved ads"
ON public.ads FOR SELECT
USING (is_active = true AND approval_status = 'approved');

-- Users can create their own ads
CREATE POLICY "Users can create own ads"
ON public.ads FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own ads (any status)
CREATE POLICY "Users can view own ads"
ON public.ads FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own pending ads
CREATE POLICY "Users can update own ads"
ON public.ads FOR UPDATE
USING (auth.uid() = user_id);
