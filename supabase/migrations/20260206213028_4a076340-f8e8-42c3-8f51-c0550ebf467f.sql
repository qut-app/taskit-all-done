
-- Fix notifications INSERT policy to use a database function for system inserts
DROP POLICY "System can insert notifications" ON public.notifications;

-- Allow authenticated users to insert notifications (for job application notifications)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create a function for system/admin notification creation
CREATE OR REPLACE FUNCTION public.create_verification_notification(
  _user_id uuid,
  _title text,
  _message text,
  _type text DEFAULT 'verification'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_user_id, _title, _message, _type);
END;
$$;
