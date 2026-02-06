import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Showcase {
  id: string;
  provider_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  display_order: number | null;
  is_approved: boolean | null;
  created_at: string;
  like_count?: number;
  is_liked?: boolean;
}

export function useShowcases(providerProfileId?: string) {
  const { user } = useAuth();
  const [showcases, setShowcases] = useState<Showcase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShowcases = async () => {
    if (!providerProfileId) {
      setShowcases([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_showcases')
        .select('*')
        .eq('provider_id', providerProfileId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Get likes count for each showcase
      const showcaseIds = (data || []).map(s => s.id);
      let likeCounts: Record<string, number> = {};
      let userLikes: Set<string> = new Set();

      if (showcaseIds.length > 0) {
        const { data: likes } = await supabase
          .from('showcase_likes')
          .select('showcase_id, user_id')
          .in('showcase_id', showcaseIds);

        (likes || []).forEach(like => {
          likeCounts[like.showcase_id] = (likeCounts[like.showcase_id] || 0) + 1;
          if (like.user_id === user?.id) userLikes.add(like.showcase_id);
        });
      }

      setShowcases((data || []).map(s => ({
        ...s,
        like_count: likeCounts[s.id] || 0,
        is_liked: userLikes.has(s.id),
      })));
    } catch (err) {
      console.error('Error fetching showcases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShowcases();
  }, [providerProfileId, user]);

  const uploadShowcase = async (file: File, caption: string, mediaType: string) => {
    if (!user || !providerProfileId) return { error: new Error('Not authenticated') };

    const fileExt = file.name.split('.').pop();
    const filePath = `showcases/${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('user-media')
      .upload(filePath, file);

    if (uploadError) return { error: uploadError };

    const { data: { publicUrl } } = supabase.storage
      .from('user-media')
      .getPublicUrl(filePath);

    const { error } = await supabase
      .from('work_showcases')
      .insert({
        provider_id: providerProfileId,
        media_url: publicUrl,
        media_type: mediaType,
        caption,
        display_order: showcases.length,
      });

    if (!error) await fetchShowcases();
    return { error };
  };

  const deleteShowcase = async (showcaseId: string) => {
    const { error } = await supabase
      .from('work_showcases')
      .delete()
      .eq('id', showcaseId);

    if (!error) await fetchShowcases();
    return { error };
  };

  const toggleLike = async (showcaseId: string) => {
    if (!user) return;

    const showcase = showcases.find(s => s.id === showcaseId);
    if (!showcase) return;

    if (showcase.is_liked) {
      await supabase
        .from('showcase_likes')
        .delete()
        .eq('showcase_id', showcaseId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('showcase_likes')
        .insert({ showcase_id: showcaseId, user_id: user.id });
    }

    await fetchShowcases();
  };

  return {
    showcases,
    loading,
    uploadShowcase,
    deleteShowcase,
    toggleLike,
    refetch: fetchShowcases,
  };
}
