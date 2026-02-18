import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { trackEvent } from './useAnalytics';

export interface FeedPost {
  id: string;
  user_id: string;
  content: string | null;
  image_url: string | null;
  video_url: string | null;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_avatar: string | null;
  author_account_type: string;
  author_verification: string;
  author_location: string | null;
  author_categories: string[];
  is_subscriber: boolean;
  like_count: number;
  comment_count: number;
  repost_count: number;
  is_liked: boolean;
  is_saved: boolean;
  is_edited: boolean;
  // Repost fields
  repost_of: string | null;
  repost_caption: string | null;
  original_post?: FeedPost | null;
  // Personalization score (internal)
  _score?: number;
}

const ENGAGEMENT_WEIGHTS = {
  like: 3,
  comment: 5,
  profile_view: 1,
  post_view: 0.5,
  save: 7,
  share: 4,
};

interface UserInterestProfile {
  likedUserIds: Set<string>;
  engagedCategories: Map<string, number>;
  engagedUserIds: Map<string, number>;
  userLat: number | null;
  userLng: number | null;
}

async function buildInterestProfile(userId: string): Promise<UserInterestProfile> {
  const profile: UserInterestProfile = {
    likedUserIds: new Set(),
    engagedCategories: new Map(),
    engagedUserIds: new Map(),
    userLat: null,
    userLng: null,
  };

  try {
    const { data: events } = await supabase
      .from('analytics_events')
      .select('event_type, category, target_id, metadata')
      .eq('user_id', userId)
      .in('event_type', ['feed_like', 'feed_comment', 'feed_view', 'feed_share', 'feed_save', 'profile_view', 'job_view', 'category_click'])
      .order('created_at', { ascending: false })
      .limit(500);

    if (events) {
      for (const event of events as any[]) {
        const weight = ENGAGEMENT_WEIGHTS[event.event_type?.replace('feed_', '') as keyof typeof ENGAGEMENT_WEIGHTS] || 1;
        if (event.target_id) {
          const current = profile.engagedUserIds.get(event.target_id) || 0;
          profile.engagedUserIds.set(event.target_id, current + weight);
          if (event.event_type === 'feed_like') profile.likedUserIds.add(event.target_id);
        }
        if (event.category) {
          const current = profile.engagedCategories.get(event.category) || 0;
          profile.engagedCategories.set(event.category, current + weight);
        }
        const meta = event.metadata as any;
        if (meta?.categories && Array.isArray(meta.categories)) {
          for (const cat of meta.categories) {
            const current = profile.engagedCategories.get(cat) || 0;
            profile.engagedCategories.set(cat, current + weight * 0.5);
          }
        }
      }
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('latitude, longitude')
      .eq('user_id', userId)
      .single();

    if (userProfile) {
      profile.userLat = userProfile.latitude;
      profile.userLng = userProfile.longitude;
    }
  } catch {
    // Silent fail
  }

  return profile;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scorePost(post: FeedPost, interests: UserInterestProfile, maxEngagement: number): number {
  let score = 0;
  if (maxEngagement > 0) {
    const engagement = post.like_count + post.comment_count * 1.5 + post.repost_count * 2;
    score += (engagement / maxEngagement) * 25;
  }
  const authorAffinity = interests.engagedUserIds.get(post.user_id) || 0;
  const maxAffinity = Math.max(1, ...Array.from(interests.engagedUserIds.values()));
  score += (Math.min(authorAffinity / maxAffinity, 1)) * 15;
  if (post.author_categories?.length > 0) {
    let categoryScore = 0;
    for (const cat of post.author_categories) categoryScore += interests.engagedCategories.get(cat) || 0;
    const maxCatScore = Math.max(1, ...Array.from(interests.engagedCategories.values()));
    score += (Math.min(categoryScore / maxCatScore, 1)) * 15;
  }
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  if (ageHours < 1) score += 15;
  else if (ageHours < 6) score += 13;
  else if (ageHours < 24) score += 10;
  else if (ageHours < 72) score += 6;
  else if (ageHours < 168) score += 3;
  else score += 1;
  if (post.is_subscriber) score += 10;
  if (post.author_verification === 'verified') score += 5;
  if (post.is_liked) score -= 2;
  return Math.max(0, score);
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
      const { data: rawPosts, error } = await supabase
        .from('posts')
        .select('*')
        .or('is_boosted.is.null,is_boosted.eq.false,and(is_boosted.eq.true,ad_status.eq.approved)')
        .order('created_at', { ascending: false })
        .limit(80);

      if (error) throw error;
      if (!rawPosts || rawPosts.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(rawPosts.map((p) => p.user_id))];
      const postIds = rawPosts.map((p) => p.id);

      // Collect original post IDs for reposts
      const repostOfIds = rawPosts
        .map((p: any) => p.repost_of)
        .filter((id: any) => id != null) as string[];

      const [
        profilesResult, subsResult, myLikesResult, likeCountsResult,
        commentCountsResult, providerProfilesResult, interestProfile,
        mySavesResult, repostCountsResult, originalPostsResult,
      ] = await Promise.all([
        supabase.rpc('get_public_profiles', { user_ids: userIds }),
        supabase.from('subscriptions').select('user_id, status').in('user_id', userIds).eq('status', 'active'),
        supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
        supabase.from('post_likes').select('post_id').in('post_id', postIds),
        supabase.from('post_comments').select('post_id').in('post_id', postIds),
        supabase.from('provider_profiles').select('user_id, service_categories').in('user_id', userIds),
        buildInterestProfile(user.id),
        supabase.from('post_saves' as any).select('post_id').eq('user_id', user.id).in('post_id', postIds),
        // Count reposts for each post
        supabase.from('posts' as any).select('repost_of').in('repost_of', postIds).not('repost_of', 'is', null),
        // Fetch original posts for reposts
        repostOfIds.length > 0
          ? supabase.from('posts').select('*').in('id', repostOfIds)
          : Promise.resolve({ data: [] }),
      ]);

      const profileMap: Record<string, any> = {};
      (profilesResult.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      const subSet = new Set((subsResult.data || []).map((s: any) => s.user_id));
      const likedSet = new Set((myLikesResult.data || []).map((l: any) => l.post_id));
      const savedSet = new Set((mySavesResult.data || []).map((s: any) => s.post_id));

      const likeCountMap: Record<string, number> = {};
      (likeCountsResult.data || []).forEach((l: any) => { likeCountMap[l.post_id] = (likeCountMap[l.post_id] || 0) + 1; });

      const commentCountMap: Record<string, number> = {};
      (commentCountsResult.data || []).forEach((c: any) => { commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1; });

      const repostCountMap: Record<string, number> = {};
      ((repostCountsResult as any).data || []).forEach((r: any) => { repostCountMap[r.repost_of] = (repostCountMap[r.repost_of] || 0) + 1; });

      const providerCatMap: Record<string, string[]> = {};
      (providerProfilesResult.data || []).forEach((pp: any) => { providerCatMap[pp.user_id] = pp.service_categories || []; });

      // Build original posts map
      const originalPostsMap: Record<string, any> = {};
      ((originalPostsResult as any).data || []).forEach((op: any) => { originalPostsMap[op.id] = op; });

      // Get profiles for original post authors if needed
      const originalAuthorIds = Object.values(originalPostsMap)
        .map((op: any) => op.user_id)
        .filter((id: string) => !profileMap[id]);
      if (originalAuthorIds.length > 0) {
        const { data: extraProfiles } = await supabase.rpc('get_public_profiles', { user_ids: originalAuthorIds });
        (extraProfiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      }

      const enrichPost = (p: any): FeedPost => {
        const prof = profileMap[p.user_id] || {};
        return {
          id: p.id,
          user_id: p.user_id,
          content: p.content,
          image_url: p.image_url,
          video_url: p.video_url,
          created_at: p.created_at,
          updated_at: p.updated_at,
          author_name: prof.company_name || prof.full_name || 'User',
          author_avatar: prof.avatar_url,
          author_account_type: prof.account_type || 'individual',
          author_verification: prof.verification_status || 'unverified',
          author_location: prof.location || null,
          author_categories: providerCatMap[p.user_id] || [],
          is_subscriber: subSet.has(p.user_id),
          like_count: likeCountMap[p.id] || 0,
          comment_count: commentCountMap[p.id] || 0,
          repost_count: repostCountMap[p.id] || 0,
          is_liked: likedSet.has(p.id),
          is_saved: savedSet.has(p.id),
          is_edited: p.updated_at !== p.created_at,
          repost_of: p.repost_of || null,
          repost_caption: p.repost_caption || null,
          original_post: null,
        };
      };

      const enriched: FeedPost[] = rawPosts.map((p) => {
        const post = enrichPost(p);
        if ((p as any).repost_of && originalPostsMap[(p as any).repost_of]) {
          post.original_post = enrichPost(originalPostsMap[(p as any).repost_of]);
        }
        return post;
      });

      const maxEngagement = Math.max(1, ...enriched.map(p => p.like_count + p.comment_count * 1.5 + p.repost_count * 2));
      for (const post of enriched) {
        post._score = scorePost(post, interestProfile, maxEngagement);
      }
      enriched.sort((a, b) => (b._score || 0) - (a._score || 0));

      setPosts(enriched);
    } catch (err) {
      console.error('Feed error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  useEffect(() => {
    const channel = supabase
      .channel('posts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => { fetchPosts(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  const createPost = async (data: { content?: string; image_url?: string; video_url?: string }) => {
    if (!user) return;
    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      content: data.content || null,
      image_url: data.image_url || null,
      video_url: data.video_url || null,
    });
    if (error) {
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
    } else {
      toast({ title: 'Posted!', description: 'Your post is now live.' });
      trackEvent('feed_post_created', { category: 'feed' });
      fetchPosts();
    }
  };

  const editPost = async (postId: string, data: { content?: string; image_url?: string | null; video_url?: string | null }) => {
    if (!user) return;
    const { error } = await supabase
      .from('posts')
      .update({
        content: data.content ?? null,
        image_url: data.image_url ?? null,
        video_url: data.video_url ?? null,
      })
      .eq('id', postId)
      .eq('user_id', user.id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to edit post', variant: 'destructive' });
    } else {
      toast({ title: 'Post updated!' });
      fetchPosts();
    }
  };

  const repost = async (originalPostId: string, caption?: string) => {
    if (!user) return;
    const { error } = await supabase.from('posts' as any).insert({
      user_id: user.id,
      repost_of: originalPostId,
      repost_caption: caption || null,
      content: null,
      image_url: null,
      video_url: null,
    });
    if (error) {
      toast({ title: 'Error', description: 'Failed to repost', variant: 'destructive' });
    } else {
      toast({ title: 'Reposted!' });
      trackEvent('feed_repost', { target_id: originalPostId, category: 'feed' });
      fetchPosts();
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.is_liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      trackEvent('feed_like', { target_id: post.user_id, category: 'feed', metadata: { post_id: postId, categories: post.author_categories } });
    }
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 } : p
    ));
  };

  const toggleSave = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    if (post.is_saved) {
      await supabase.from('post_saves' as any).delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_saves' as any).insert({ post_id: postId, user_id: user.id });
      trackEvent('feed_save', { target_id: post.user_id, category: 'feed', metadata: { post_id: postId } });
    }
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, is_saved: !p.is_saved } : p
    ));
  };

  const deletePost = async (postId: string) => {
    if (!user) return;
    await supabase.from('posts').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return { posts, loading, createPost, editPost, repost, toggleLike, toggleSave, deletePost, refetch: fetchPosts };
}

export function usePostComments(postId: string) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    const { data } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      setComments(data.map((c) => ({
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

  // Realtime: auto-refresh comments
  useEffect(() => {
    const channel = supabase
      .channel(`comments-realtime-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` }, () => { fetchComments(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId, fetchComments]);

  const addComment = async (content: string) => {
    if (!user || !content.trim()) return;
    await supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, content: content.trim() });
    trackEvent('feed_comment', { target_id: postId, category: 'feed', metadata: { post_id: postId } });
    fetchComments();
  };

  return { comments, loading, addComment };
}

export function useSavedPosts() {
  const { user } = useAuth();
  const [savedPosts, setSavedPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: saves } = await supabase
        .from('post_saves' as any)
        .select('post_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!saves || saves.length === 0) {
        setSavedPosts([]);
        setLoading(false);
        return;
      }

      const postIds = (saves as any[]).map((s: any) => s.post_id);
      const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .in('id', postIds);

      if (!posts || posts.length === 0) {
        setSavedPosts([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(posts.map(p => p.user_id))];
      const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      const enriched: FeedPost[] = posts.map(p => {
        const prof = profileMap[p.user_id] || {};
        return {
          id: p.id,
          user_id: p.user_id,
          content: p.content,
          image_url: p.image_url,
          video_url: p.video_url,
          created_at: p.created_at,
          updated_at: p.updated_at,
          author_name: prof.company_name || prof.full_name || 'User',
          author_avatar: prof.avatar_url,
          author_account_type: prof.account_type || 'individual',
          author_verification: prof.verification_status || 'unverified',
          author_location: prof.location || null,
          author_categories: [],
          is_subscriber: false,
          like_count: 0,
          comment_count: 0,
          repost_count: 0,
          is_liked: false,
          is_saved: true,
          is_edited: p.updated_at !== p.created_at,
          repost_of: null,
          repost_caption: null,
          original_post: null,
        };
      });

      // Maintain save order
      const orderMap = new Map(postIds.map((id: string, i: number) => [id, i]));
      enriched.sort((a, b) => (orderMap.get(a.id) || 0) - (orderMap.get(b.id) || 0));

      setSavedPosts(enriched);
    } catch (err) {
      console.error('Saved posts error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSavedPosts(); }, [fetchSavedPosts]);

  const unsave = async (postId: string) => {
    if (!user) return;
    await supabase.from('post_saves' as any).delete().eq('post_id', postId).eq('user_id', user.id);
    setSavedPosts(prev => prev.filter(p => p.id !== postId));
  };

  return { savedPosts, loading, unsave, refetch: fetchSavedPosts };
}
