
-- 1. Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- 2. Showcase likes table
CREATE TABLE public.showcase_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  showcase_id uuid NOT NULL REFERENCES public.work_showcases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(showcase_id, user_id)
);

ALTER TABLE public.showcase_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes"
ON public.showcase_likes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can like"
ON public.showcase_likes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unlike"
ON public.showcase_likes FOR DELETE
USING (user_id = auth.uid());

-- 3. Add requester rating fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS requester_rating numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS requester_review_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS requester_completed_jobs integer DEFAULT 0;

-- 4. Add requester_slots tracking columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS requester_active_slots integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS requester_max_slots integer DEFAULT 3;

-- 5. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
