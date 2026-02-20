
-- Create ad_events table for granular tracking of impressions, clicks, engagement
CREATE TABLE public.ad_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id uuid,
  event_type text NOT NULL, -- 'impression', 'click', 'like', 'save', 'repost', 'profile_visit', 'message', 'job_request'
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast aggregation queries
CREATE INDEX idx_ad_events_ad_id ON public.ad_events(ad_id);
CREATE INDEX idx_ad_events_event_type ON public.ad_events(ad_id, event_type);
CREATE INDEX idx_ad_events_user_unique ON public.ad_events(ad_id, user_id, event_type);

-- Enable RLS
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users can log ad events (impressions, clicks)
CREATE POLICY "Authenticated users can log ad events"
ON public.ad_events
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Ad owners can view their own ad events
CREATE POLICY "Ad owners can view own ad events"
ON public.ad_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ads WHERE ads.id = ad_events.ad_id AND ads.user_id = auth.uid()
  )
);

-- Admins can manage all ad events
CREATE POLICY "Admins can manage ad events"
ON public.ad_events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add reach column to ads table for cached unique impression count
ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS reach integer DEFAULT 0;

-- Enable realtime for ad_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_events;
