
-- Function to atomically increment ad impression/click counters
CREATE OR REPLACE FUNCTION public.increment_ad_counter(_ad_id uuid, _field text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _field = 'impressions' THEN
    UPDATE ads SET impressions = COALESCE(impressions, 0) + 1 WHERE id = _ad_id;
    -- Also update reach (unique users) from ad_events
    UPDATE ads SET reach = (
      SELECT COUNT(DISTINCT user_id) FROM ad_events WHERE ad_id = _ad_id AND event_type = 'impression' AND user_id IS NOT NULL
    ) WHERE id = _ad_id;
  ELSIF _field = 'clicks' THEN
    UPDATE ads SET clicks = COALESCE(clicks, 0) + 1 WHERE id = _ad_id;
  END IF;
END;
$$;
