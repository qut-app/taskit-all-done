import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface FeedPost {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  // joined fields
  author_name: string;
  author_avatar: string | null;
  author_account_type: string;
  author_verification: string;
  is_subscriber: boolean;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
}

export function useSocialFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch posts
      const { data: rawPosts, error } = await supabase
        .from('posts' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!rawPosts || rawPosts.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set((rawPosts as any[]).map((p: any) => p.user_id))];
      
      // Get profiles
      const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      // Get subscriptions for ranking
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('user_id, status')
        .in('user_id', userIds)
        .eq('status', 'active');
      const subSet = new Set((subs || []).map((s: any) => s.user_id));

      // Get likes for current user
      const postIds = (rawPosts as any[]).map((p: any) => p.id);
      const { data: myLikes } = await supabase
        .from('post_likes' as any)
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);
      const likedSet = new Set((myLikes || []).map((l: any) => l.post_id));

      // Get like counts
      const { data: likeCounts } = await supabase
        .from('post_likes' as any)
        .select('post_id')
        .in('post_id', postIds);

      const likeCountMap: Record<string, number> = {};
      (likeCounts || []).forEach((l: any) => {
        likeCountMap[l.post_id] = (likeCountMap[l.post_id] || 0) + 1;
      });

      // Get comment counts
      const { data: commentCounts } = await supabase
        .from('post_comments' as any)
        .select('post_id')
        .in('post_id', postIds);

      const commentCountMap: Record<string, number> = {};
      (commentCounts || []).forEach((c: any) => {
        commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1;
      });

      const enriched: FeedPost[] = (rawPosts as any[]).map((p: any) => {
        const prof = profileMap[p.user_id] || {};
        return {
          id: p.id,
          user_id: p.user_id,
          content: p.content,
          image_url: p.image_url,
          video_url: p.video_url,
          created_at: p.created_at,
          author_name: prof.company_name || prof.full_name || 'User',
          author_avatar: prof.avatar_url,
          author_account_type: prof.account_type || 'individual',
          author_verification: prof.verification_status || 'unverified',
          is_subscriber: subSet.has(p.user_id),
          like_count: likeCountMap[p.id] || 0,
          comment_count: commentCountMap[p.id] || 0,
          is_liked: likedSet.has(p.id),
        };
      });

      // Ranking: paid subscribers first, verified next, then by recency (already sorted)
      enriched.sort((a, b) => {
        if (a.is_subscriber && !b.is_subscriber) return -1;
        if (!a.is_subscriber && b.is_subscriber) return 1;
        if (a.author_verification === 'verified' && b.author_verification !== 'verified') return -1;
        if (a.author_verification !== 'verified' && b.author_verification === 'verified') return 1;
        // High engagement
        const engA = a.like_count + a.comment_count;
        const engB = b.like_count + b.comment_count;
        if (engA !== engB) return engB - engA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setPosts(enriched);
    } catch (err) {
      console.error('Feed error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  const createPost = async (data: { content?: string; image_url?: string; video_url?: string }) => {
    if (!user) return;
    const { error } = await supabase.from('posts' as any).insert({
      user_id: user.id,
      content: data.content || null,
      image_url: data.image_url || null,
      video_url: data.video_url || null,
    });
    if (error) {
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
    } else {
      toast({ title: 'Posted!', description: 'Your post is now live.' });
      fetchPosts();
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.is_liked) {
      await supabase.from('post_likes' as any).delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes' as any).insert({ post_id: postId, user_id: user.id });
    }
    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 }
        : p
    ));
  };

  const deletePost = async (postId: string) => {
    if (!user) return;
    await supabase.from('posts' as any).delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return { posts, loading, createPost, toggleLike, deletePost, refetch: fetchPosts };
}

export function usePostComments(postId: string) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('post_comments' as any)
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set((data as any[]).map((c: any) => c.user_id))];
      const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      setComments((data as any[]).map((c: any) => ({
        ...c,
        author_name: profileMap[c.user_id]?.full_name || 'User',
        author_avatar: profileMap[c.user_id]?.avatar_url,
      })));
    } else {
      setComments([]);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const addComment = async (content: string) => {
    if (!user || !content.trim()) return;
    await supabase.from('post_comments' as any).insert({
      post_id: postId,
      user_id: user.id,
      content: content.trim(),
    });
    fetchComments();
  };

  return { comments, loading, addComment };
}
