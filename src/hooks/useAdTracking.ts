import { supabase } from '@/integrations/supabase/client';

/**
 * Track an ad event (impression, click, engagement, etc.)
 * Call this wherever ads are displayed or interacted with.
 */
export const trackAdEvent = async (
  adId: string,
  eventType: 'impression' | 'click' | 'like' | 'save' | 'repost' | 'profile_visit' | 'message' | 'job_request',
  metadata?: Record<string, any>
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('ad_events' as any).insert({
      ad_id: adId,
      user_id: user.id,
      event_type: eventType,
      metadata: metadata || {},
    });

    // Also update the cached counters on the ads table for quick reads
    if (eventType === 'impression') {
      await supabase.rpc('increment_ad_counter' as any, { _ad_id: adId, _field: 'impressions' }).maybeSingle();
    } else if (eventType === 'click') {
      await supabase.rpc('increment_ad_counter' as any, { _ad_id: adId, _field: 'clicks' }).maybeSingle();
    }
  } catch {
    // Silent fail - tracking should never break UX
  }
};
