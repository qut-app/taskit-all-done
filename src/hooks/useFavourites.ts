import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Favourite {
  id: string;
  user_id: string;
  favourite_user_id: string;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    account_type: string | null;
    company_name: string | null;
    location: string | null;
    verification_status: string;
  };
}

export function useFavourites() {
  const { user } = useAuth();
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavourites = async () => {
    if (!user) {
      setFavourites([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('favourites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for favourite users
      const userIds = (data || []).map(f => f.favourite_user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.rpc('get_public_profiles', { user_ids: userIds });

        const profileMap: Record<string, any> = {};
        (profiles || []).forEach((p: any) => {
          profileMap[p.user_id] = p;
        });

        setFavourites((data || []).map(f => ({
          ...f,
          profile: profileMap[f.favourite_user_id],
        })));
      } else {
        setFavourites([]);
      }
    } catch (err) {
      console.error('Error fetching favourites:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavourites();
  }, [user]);

  const addFavourite = async (favouriteUserId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('favourites')
      .insert({ user_id: user.id, favourite_user_id: favouriteUserId });

    if (!error) await fetchFavourites();
    return { error };
  };

  const removeFavourite = async (favouriteUserId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('favourites')
      .delete()
      .eq('user_id', user.id)
      .eq('favourite_user_id', favouriteUserId);

    if (!error) await fetchFavourites();
    return { error };
  };

  const isFavourite = (userId: string) => {
    return favourites.some(f => f.favourite_user_id === userId);
  };

  return {
    favourites,
    loading,
    addFavourite,
    removeFavourite,
    isFavourite,
    refetch: fetchFavourites,
  };
}
