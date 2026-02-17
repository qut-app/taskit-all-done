import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionStatus {
  isPremium: boolean;
  subscriptionType: string | null;
  loading: boolean;
}

export function useSubscriptionStatus(): SubscriptionStatus {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setSubscriptionType(null);
      setLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('subscription_type, status, expires_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setIsPremium(true);
          setSubscriptionType(data.subscription_type);
        } else {
          setIsPremium(false);
          setSubscriptionType(null);
        }
      } catch {
        setIsPremium(false);
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  return { isPremium, subscriptionType, loading };
}
