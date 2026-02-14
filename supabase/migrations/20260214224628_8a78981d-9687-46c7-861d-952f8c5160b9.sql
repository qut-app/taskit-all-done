
-- ==========================================
-- 1. Analytics Events (Hidden tracking for admin intelligence)
-- ==========================================
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL, -- 'job_view', 'profile_view', 'hire', 'transaction', 'category_click'
  category text,
  location text,
  user_id uuid,
  target_id uuid, -- job_id, profile_id, etc.
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read analytics
CREATE POLICY "Admins can view analytics" ON public.analytics_events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Any authenticated user can insert (tracking is silent)
CREATE POLICY "Authenticated users can log events" ON public.analytics_events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Index for fast queries
CREATE INDEX idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_category ON public.analytics_events(category);
CREATE INDEX idx_analytics_location ON public.analytics_events(location);
CREATE INDEX idx_analytics_created_at ON public.analytics_events(created_at);

-- ==========================================
-- 2. Posts table (Social feed - unlimited posting)
-- ==========================================
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text,
  image_url text,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view posts" ON public.posts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create own posts" ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON public.posts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all posts" ON public.posts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_posts_user_id ON public.posts(user_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);

-- ==========================================
-- 3. Post Likes
-- ==========================================
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view post likes" ON public.post_likes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can like posts" ON public.post_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts" ON public.post_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ==========================================
-- 4. Post Comments
-- ==========================================
CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view comments" ON public.post_comments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create comments" ON public.post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.post_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage comments" ON public.post_comments
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);

-- Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
