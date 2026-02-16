
-- Add repost support to posts table
ALTER TABLE public.posts ADD COLUMN repost_of UUID REFERENCES public.posts(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN repost_caption TEXT;

-- Create post_saves table (bookmarks/favorites)
CREATE TABLE public.post_saves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS on post_saves
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_saves
CREATE POLICY "Users can save posts" ON public.post_saves
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own saves" ON public.post_saves
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts" ON public.post_saves
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for post_saves
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_saves;
