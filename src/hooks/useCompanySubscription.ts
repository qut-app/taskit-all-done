import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';

export type CompanySubStatus = 'active' | 'trial' | 'expired' | 'none';

interface CompanySubscription {
  status: CompanySubStatus;
  plan: string | null;
  trialEndsAt: Date | null;
  isGated: boolean; // true = block access
  loading: boolean;
}

export function useCompanySubscription(): CompanySubscription {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [status, setStatus] = useState<CompanySubStatus>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileLoading || !user || !profile) {
      setLoading(profileLoading);
      return;
    }

    const accountType = (profile as any).account_type;
    if (accountType !== 'company') {
      // Not a company — no gate needed
      setStatus('active');
      setLoading(false);
      return;
    }

    const companyPlan = (profile as any).company_plan;
    const trialEnds = (profile as any).company_trial_ends_at;

    // Check if they have an active subscription in subscriptions table
    const checkSubscription = async () => {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        setStatus('active');
      } else if (trialEnds && new Date(trialEnds) > new Date()) {
        setStatus('trial');
      } else if (companyPlan) {
        // Plan exists but subscription expired
        setStatus('expired');
      } else {
        setStatus('none');
      }
      setLoading(false);
    };

    checkSubscription();
  }, [user, profile, profileLoading]);

  const companyPlan = (profile as any)?.company_plan || null;
  const trialEndsAt = (profile as any)?.company_trial_ends_at
    ? new Date((profile as any).company_trial_ends_at)
    : null;

  const isGated = status === 'none' || status === 'expired';

  return { status, plan: companyPlan, trialEndsAt, isGated, loading };
}
