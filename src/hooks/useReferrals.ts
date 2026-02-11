import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ReferralStats {
  referredProviders: number;
  referredRequesters: number;
  totalRewardsEarned: number;
  referralLink: string;
  loading: boolean;
}

export function useReferrals(): ReferralStats {
  const { user } = useAuth();
  const [referredProviders, setReferredProviders] = useState(0);
  const [referredRequesters, setReferredRequesters] = useState(0);
  const [totalRewardsEarned, setTotalRewardsEarned] = useState(0);
  const [loading, setLoading] = useState(true);

  const referralLink = user
    ? `https://taskit-all-done.lovable.app/auth?ref=${user.id}`
    : '';

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        setLoading(true);

        // Fetch all completed referrals where this user is the referrer
        const { data: referrals } = await supabase
          .from('referrals')
          .select('*')
          .eq('referrer_id', user.id)
          .eq('status', 'completed');

        if (!referrals || referrals.length === 0) {
          setReferredProviders(0);
          setReferredRequesters(0);
          setTotalRewardsEarned(0);
          setLoading(false);
          return;
        }

        // Get referred user profiles to determine their roles
        const referredIds = referrals
          .map(r => r.referred_user_id)
          .filter(Boolean) as string[];

        if (referredIds.length === 0) {
          setLoading(false);
          return;
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, active_role')
          .in('user_id', referredIds);

        const providerCount = (profiles || []).filter(p => p.active_role === 'provider').length;
        const requesterCount = (profiles || []).filter(p => p.active_role === 'requester').length;

        // Calculate rewards: 4 providers = +1 slot reward, 3 requesters = +1 slot reward
        const providerRewards = Math.floor(providerCount / 4);
        const requesterRewards = Math.floor(requesterCount / 3);

        setReferredProviders(providerCount);
        setReferredRequesters(requesterCount);
        setTotalRewardsEarned(providerRewards + requesterRewards);
      } catch (err) {
        console.error('Error fetching referral stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return {
    referredProviders,
    referredRequesters,
    totalRewardsEarned,
    referralLink,
    loading,
  };
}
