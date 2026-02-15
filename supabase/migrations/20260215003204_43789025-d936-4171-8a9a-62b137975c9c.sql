
-- Add notification preference columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sound_notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;

-- Add email tracking columns to notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS delivery_method text DEFAULT 'in_app',
ADD COLUMN IF NOT EXISTS is_email_sent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_sent_at timestamp with time zone;
