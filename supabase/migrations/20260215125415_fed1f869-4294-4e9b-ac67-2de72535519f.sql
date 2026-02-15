
-- Add boosted post columns to posts table
ALTER TABLE public.posts
  ADD COLUMN is_boosted boolean DEFAULT false,
  ADD COLUMN ad_status text DEFAULT 'none',
  ADD COLUMN boost_expires_at timestamp with time zone,
  ADD COLUMN boost_reject_reason text;

-- Index for efficient feed queries on boosted posts
CREATE INDEX idx_posts_boosted_status ON public.posts (is_boosted, ad_status, boost_expires_at)
  WHERE is_boosted = true;
