import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

type ProviderProfile = Tables<'provider_profiles'>;
type Profile = Tables<'profiles'>;

export interface RecommendedProvider extends ProviderProfile {
  profile?: Profile | null;
}

export function useRecommendedProviders() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<RecommendedProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        // Get categories from user's past jobs
        let userCategories: string[] = [];
        if (user) {
          const { data: userJobs } = await supabase
            .from('jobs')
            .select('category')
            .eq('requester_id', user.id);
          userCategories = [...new Set((userJobs || []).map(j => j.category))];
        }

        // Fetch top-rated, high on-time providers
        const { data: providerData } = await supabase
          .from('provider_profiles')
          .select('*')
          .gte('rating', 3)
          .gte('on_time_delivery_score', 70)
          .order('rating', { ascending: false })
          .order('on_time_delivery_score', { ascending: false })
          .limit(20);

        if (!providerData?.length) {
          setProviders([]);
          return;
        }

        const userIds = providerData.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        let results: RecommendedProvider[] = providerData
          .map(p => ({ ...p, profile: profileMap.get(p.user_id) || null }))
          .filter(p => p.profile?.verification_status === 'verified');

        // Prioritize providers matching user's job categories
        if (userCategories.length > 0) {
          results.sort((a, b) => {
            const aMatch = a.service_categories?.some(c => userCategories.includes(c)) ? 1 : 0;
            const bMatch = b.service_categories?.some(c => userCategories.includes(c)) ? 1 : 0;
            return bMatch - aMatch;
          });
        }

        setProviders(results.slice(0, 10));
      } catch (err) {
        console.error('Error fetching recommended providers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [user]);

  return { providers, loading };
}
