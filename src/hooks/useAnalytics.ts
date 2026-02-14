import { supabase } from '@/integrations/supabase/client';

// Silent event tracking - users never see this
export const trackEvent = async (
  event_type: string,
  options?: { category?: string; location?: string; target_id?: string; metadata?: Record<string, any> }
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('analytics_events' as any).insert({
      event_type,
      category: options?.category || null,
      location: options?.location || null,
      user_id: user.id,
      target_id: options?.target_id || null,
      metadata: options?.metadata || {},
    });
  } catch {
    // Silent fail - tracking should never break UX
  }
};
