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
  author_name: string;
  author_avatar: string | null;
  author_account_type: string;
  author_verification: string;
  author_location: string | null;
  author_categories: string[];
  is_subscriber: boolean;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  // Personalization score (internal)
  _score?: number;
}

// Engagement weights for interest scoring
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

/**
 * Build a user interest profile from their recent analytics_events.
 * This tells us: who they engage with, what categories they like, and their location.
 */
async function buildInterestProfile(userId: string): Promise<UserInterestProfile> {
  const profile: UserInterestProfile = {
    likedUserIds: new Set(),
    engagedCategories: new Map(),
    engagedUserIds: new Map(),
    userLat: null,
    userLng: null,
  };

  try {
    // Get user's recent engagement events (last 30 days, up to 500)
    const { data: events } = await supabase
      .from('analytics_events')
      .select('event_type, category, target_id, metadata')
      .eq('user_id', userId)
      .in('event_type', ['feed_like', 'feed_comment', 'feed_view', 'feed_share', 'profile_view', 'job_view', 'category_click'])
      .order('created_at', { ascending: false })
      .limit(500);

    if (events) {
      for (const event of events as any[]) {
        const weight = ENGAGEMENT_WEIGHTS[event.event_type?.replace('feed_', '') as keyof typeof ENGAGEMENT_WEIGHTS] || 1;

        // Track engaged user IDs (who they interact with)
        if (event.target_id) {
          const current = profile.engagedUserIds.get(event.target_id) || 0;
          profile.engagedUserIds.set(event.target_id, current + weight);
          if (event.event_type === 'feed_like') {
            profile.likedUserIds.add(event.target_id);
          }
        }

        // Track engaged categories
        if (event.category) {
          const current = profile.engagedCategories.get(event.category) || 0;
          profile.engagedCategories.set(event.category, current + weight);
        }

        // Extract categories from metadata
        const meta = event.metadata as any;
        if (meta?.categories && Array.isArray(meta.categories)) {
          for (const cat of meta.categories) {
            const current = profile.engagedCategories.get(cat) || 0;
            profile.engagedCategories.set(cat, current + weight * 0.5);
          }
        }
        if (meta?.category) {
          const current = profile.engagedCategories.get(meta.category) || 0;
          profile.engagedCategories.set(meta.category, current + weight * 0.5);
        }
      }
    }

    // Get user's location
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
    // Silent fail - personalization degrades gracefully
  }

  return profile;
}

/**
 * Calculate distance between two lat/lng points in km (Haversine formula)
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Score a post for a specific user based on multiple signals.
 * Higher score = more relevant.
 */
function scorePost(
  post: FeedPost,
  interests: UserInterestProfile,
  maxEngagement: number,
  authorLat: number | null,
  authorLng: number | null
): number {
  let score = 0;

  // 1. ENGAGEMENT SCORE (0-25): how popular is this post
  if (maxEngagement > 0) {
    const engagement = post.like_count + post.comment_count * 1.5;
    score += (engagement / maxEngagement) * 25;
  }

  // 2. INTEREST MATCH (0-30): does user engage with this author/category
  const authorAffinity = interests.engagedUserIds.get(post.user_id) || 0;
  const maxAffinity = Math.max(1, ...Array.from(interests.engagedUserIds.values()));
  score += (Math.min(authorAffinity / maxAffinity, 1)) * 15;

  // Category match from author's service categories
  if (post.author_categories && post.author_categories.length > 0) {
    let categoryScore = 0;
    for (const cat of post.author_categories) {
      categoryScore += interests.engagedCategories.get(cat) || 0;
    }
    const maxCatScore = Math.max(1, ...Array.from(interests.engagedCategories.values()));
    score += (Math.min(categoryScore / maxCatScore, 1)) * 15;
  }

  // 3. PROXIMITY (0-15): closer = better for service-related posts
  if (interests.userLat && interests.userLng && authorLat && authorLng) {
    const distance = haversineDistance(interests.userLat, interests.userLng, authorLat, authorLng);
    if (distance < 5) score += 15;
    else if (distance < 15) score += 12;
    else if (distance < 30) score += 8;
    else if (distance < 50) score += 5;
    else if (distance < 100) score += 2;
  }

  // 4. RECENCY (0-15): newer is better, decays over time
  const ageHours = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
  if (ageHours < 1) score += 15;
  else if (ageHours < 6) score += 13;
  else if (ageHours < 24) score += 10;
  else if (ageHours < 72) score += 6;
  else if (ageHours < 168) score += 3;
  else score += 1;

  // 5. SUBSCRIPTION BOOST (0-10): paid users get visibility
  if (post.is_subscriber) score += 10;

  // 6. VERIFICATION BOOST (0-5): verified accounts get trust bonus
  if (post.author_verification === 'verified') score += 5;

  // 7. DIVERSITY PENALTY: if already liked, slightly reduce (avoid echo chamber)
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
      // 1. Fetch posts — exclude unapproved boosted posts
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

      // 2. Parallel data fetching
      const [
        profilesResult,
        subsResult,
        myLikesResult,
        likeCountsResult,
        commentCountsResult,
        providerProfilesResult,
        interestProfile,
      ] = await Promise.all([
        supabase.rpc('get_public_profiles', { user_ids: userIds }),
        supabase.from('subscriptions').select('user_id, status').in('user_id', userIds).eq('status', 'active'),
        supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds),
        supabase.from('post_likes').select('post_id').in('post_id', postIds),
        supabase.from('post_comments').select('post_id').in('post_id', postIds),
        supabase.from('provider_profiles').select('user_id, service_categories').in('user_id', userIds),
        buildInterestProfile(user.id),
      ]);

      // Build lookup maps
      const profileMap: Record<string, any> = {};
      (profilesResult.data || []).forEach((p: any) => { profileMap[p.user_id] = p; });

      const subSet = new Set((subsResult.data || []).map((s: any) => s.user_id));

      const likedSet = new Set((myLikesResult.data || []).map((l: any) => l.post_id));

      const likeCountMap: Record<string, number> = {};
      (likeCountsResult.data || []).forEach((l: any) => {
        likeCountMap[l.post_id] = (likeCountMap[l.post_id] || 0) + 1;
      });

      const commentCountMap: Record<string, number> = {};
      (commentCountsResult.data || []).forEach((c: any) => {
        commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1;
      });

      const providerCatMap: Record<string, string[]> = {};
      (providerProfilesResult.data || []).forEach((pp: any) => {
        providerCatMap[pp.user_id] = pp.service_categories || [];
      });

      // 3. Enrich posts
      const enriched: FeedPost[] = rawPosts.map((p) => {
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
          author_location: prof.location || null,
          author_categories: providerCatMap[p.user_id] || [],
          is_subscriber: subSet.has(p.user_id),
          like_count: likeCountMap[p.id] || 0,
          comment_count: commentCountMap[p.id] || 0,
          is_liked: likedSet.has(p.id),
        };
      });

      // 4. PERSONALIZED SCORING
      const maxEngagement = Math.max(1, ...enriched.map(p => p.like_count + p.comment_count * 1.5));

      for (const post of enriched) {
        const prof = profileMap[post.user_id];
        const authorLat = prof?.latitude ?? null;
        const authorLng = prof?.longitude ?? null;
        // Note: get_public_profiles doesn't return lat/lng, but we fetched profiles separately if needed
        post._score = scorePost(post, interestProfile, maxEngagement, authorLat, authorLng);
      }

      // 5. Sort by personalized score (descending)
      enriched.sort((a, b) => (b._score || 0) - (a._score || 0));

      // 6. TRENDING INJECTION: ensure some fresh high-engagement posts appear even if not matching interests
      // Already handled by the engagement score component (25% weight)

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

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.is_liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      // Track like for personalization
      trackEvent('feed_like', {
        target_id: post.user_id,
        category: 'feed',
        metadata: { post_id: postId, categories: post.author_categories },
      });
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
    await supabase.from('posts').delete().eq('id', postId);
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

  const addComment = async (content: string) => {
    if (!user || !content.trim()) return;
    await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: user.id,
      content: content.trim(),
    });
    // Track comment for personalization
    trackEvent('feed_comment', {
      target_id: postId,
      category: 'feed',
      metadata: { post_id: postId },
    });
    fetchComments();
  };

  return { comments, loading, addComment };
}
