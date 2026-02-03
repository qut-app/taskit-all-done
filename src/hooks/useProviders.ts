import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type ProviderProfile = Tables<'provider_profiles'>;
type Profile = Tables<'profiles'>;
type WorkShowcase = Tables<'work_showcases'>;

interface ProviderWithProfile extends ProviderProfile {
  profile?: Profile | null;
  work_showcases?: WorkShowcase[];
}

interface UseProvidersOptions {
  category?: string;
  serviceMode?: string;
  minRating?: number;
  sortBy?: 'rating' | 'on_time_delivery_score' | 'review_count';
}

export function useProviders(options: UseProvidersOptions = {}) {
  const [providers, setProviders] = useState<ProviderWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('provider_profiles')
        .select('*');

      if (options.category) {
        query = query.contains('service_categories', [options.category]);
      }

      if (options.serviceMode && options.serviceMode !== 'both') {
        query = query.or(`service_mode.eq.${options.serviceMode},service_mode.eq.both`);
      }

      if (options.minRating) {
        query = query.gte('rating', options.minRating);
      }

      if (options.sortBy) {
        query = query.order(options.sortBy, { ascending: false });
      } else {
        query = query.order('is_recommended', { ascending: false })
          .order('rating', { ascending: false });
      }

      const { data: providerData, error } = await query;

      if (error) throw error;

      // Fetch profiles for providers
      const userIds = (providerData || []).map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Filter only verified providers
      const providersWithProfiles: ProviderWithProfile[] = (providerData || [])
        .map(p => ({
          ...p,
          profile: profileMap.get(p.user_id) || null
        }))
        .filter(p => p.profile?.verification_status === 'verified');

      setProviders(providersWithProfiles);
    } catch (err) {
      console.error('Error fetching providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [options.category, options.serviceMode, options.minRating, options.sortBy]);

  return { providers, loading, refetch: fetchProviders };
}

export function useProvider(userId: string) {
  const [provider, setProvider] = useState<ProviderWithProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProvider = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch provider profile
        const { data: providerData, error: providerError } = await supabase
          .from('provider_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (providerError) throw providerError;
        
        if (providerData) {
          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

          // Fetch showcases
          const { data: showcasesData } = await supabase
            .from('work_showcases')
            .select('*')
            .eq('provider_id', providerData.id)
            .eq('is_approved', true)
            .order('display_order');

          setProvider({
            ...providerData,
            profile: profileData,
            work_showcases: showcasesData || []
          });
        }
      } catch (err) {
        console.error('Error fetching provider:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [userId]);

  return { provider, loading };
}
