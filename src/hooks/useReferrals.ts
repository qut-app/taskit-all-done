import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string | null;
  referral_code: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export function useReferrals() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCode, setReferralCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchReferrals = async () => {
    if (!user) {
      setReferrals([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReferrals((data || []) as unknown as Referral[]);
    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, [user]);

  useEffect(() => {
    // Generate referral code from user id
    if (user?.id) {
      setReferralCode(user.id.substring(0, 8).toUpperCase());
    }
  }, [user]);

  return {
    referrals,
    referralCode,
    loading,
    completedCount: referrals.filter(r => r.status === 'completed').length,
    pendingCount: referrals.filter(r => r.status === 'pending').length,
    refetch: fetchReferrals,
  };
}
