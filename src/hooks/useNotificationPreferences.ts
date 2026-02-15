import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from('profiles')
      .select('sound_notifications_enabled, email_notifications_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSoundEnabled((data as any).sound_notifications_enabled ?? true);
          setEmailEnabled((data as any).email_notifications_enabled ?? true);
        }
        setLoading(false);
      });
  }, [user]);

  const updatePreference = useCallback(async (key: 'sound_notifications_enabled' | 'email_notifications_enabled', value: boolean) => {
    if (!user) return;
    if (key === 'sound_notifications_enabled') setSoundEnabled(value);
    else setEmailEnabled(value);
    await supabase
      .from('profiles')
      .update({ [key]: value } as any)
      .eq('user_id', user.id);
  }, [user]);

  return { soundEnabled, emailEnabled, updatePreference, loading };
}
