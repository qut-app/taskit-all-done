import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;
type ProviderProfile = Tables<'provider_profiles'>;

interface UseProfileReturn {
  profile: Profile | null;
  providerProfile: ProviderProfile | null;
  loading: boolean;
  error: Error | null;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: Error | null }>;
  updateProviderProfile: (data: Partial<ProviderProfile>) => Promise<{ error: Error | null }>;
  createProviderProfile: (data: Partial<ProviderProfile>) => Promise<{ error: Error | null }>;
  refetch: () => void;
}

export function useProfile(): UseProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      setProviderProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch provider profile if exists
      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (providerError && providerError.code !== 'PGRST116') throw providerError;
      setProviderProfile(providerData);

    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchProfile();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const updateProviderProfile = async (data: Partial<ProviderProfile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update(data)
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchProfile();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const createProviderProfile = async (data: Partial<ProviderProfile>) => {
    if (!user) return { error: new Error('Not authenticated') };

    try {
      const { error } = await supabase
        .from('provider_profiles')
        .insert({
          user_id: user.id,
          ...data,
        });

      if (error) throw error;
      
      await fetchProfile();
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  return {
    profile,
    providerProfile,
    loading,
    error,
    updateProfile,
    updateProviderProfile,
    createProviderProfile,
    refetch: fetchProfile,
  };
}
