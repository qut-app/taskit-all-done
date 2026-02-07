import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type ProviderProfile = Tables<'provider_profiles'>;

export interface FeedItem {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  provider_id: string;
  provider_user_id: string;
  provider_name: string;
  provider_avatar: string | null;
  provider_category: string;
  is_verified: boolean;
  account_type: string;
  like_count: number;
  is_liked: boolean;
}

export function useShowcaseFeed() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const { data: showcases } = await supabase
        .from('work_showcases')
        .select('*')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!showcases?.length) {
        setItems([]);
        return;
      }

      const providerIds = [...new Set(showcases.map(s => s.provider_id))];
      const { data: providerProfiles } = await supabase
        .from('provider_profiles')
        .select('*')
        .in('id', providerIds);

      const providerMap = new Map((providerProfiles || []).map(p => [p.id, p]));
      const userIds = (providerProfiles || []).map(p => p.user_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Get likes
      const showcaseIds = showcases.map(s => s.id);
      const { data: likes } = await supabase
        .from('showcase_likes')
        .select('showcase_id, user_id')
        .in('showcase_id', showcaseIds);

      const likeCounts: Record<string, number> = {};
      const userLikes = new Set<string>();
      (likes || []).forEach(l => {
        likeCounts[l.showcase_id] = (likeCounts[l.showcase_id] || 0) + 1;
        if (l.user_id === user?.id) userLikes.add(l.showcase_id);
      });

      const feedItems: FeedItem[] = showcases.map(s => {
        const provider = providerMap.get(s.provider_id);
        const prof = provider ? profileMap.get(provider.user_id) : null;
        return {
          id: s.id,
          media_url: s.media_url,
          media_type: s.media_type,
          caption: s.caption,
          created_at: s.created_at,
          provider_id: s.provider_id,
          provider_user_id: provider?.user_id || '',
          provider_name: prof?.full_name || 'Provider',
          provider_avatar: prof?.avatar_url || null,
          provider_category: provider?.service_categories?.[0] || 'Services',
          is_verified: prof?.verification_status === 'verified',
          account_type: prof?.account_type || 'individual',
          like_count: likeCounts[s.id] || 0,
          is_liked: userLikes.has(s.id),
        };
      });

      setItems(feedItems);
    } catch (err) {
      console.error('Error fetching showcase feed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [user]);

  const toggleLike = async (showcaseId: string) => {
    if (!user) return;
    const item = items.find(i => i.id === showcaseId);
    if (!item) return;

    if (item.is_liked) {
      await supabase.from('showcase_likes').delete()
        .eq('showcase_id', showcaseId).eq('user_id', user.id);
    } else {
      await supabase.from('showcase_likes').insert({ showcase_id: showcaseId, user_id: user.id });
    }
    await fetchFeed();
  };

  return { items, loading, toggleLike, refetch: fetchFeed };
}
