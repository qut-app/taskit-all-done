-- Add rejection reason column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_rejection_reason text;

-- Add 'rejected' to verification_status enum
ALTER TYPE public.verification_status ADD VALUE IF NOT EXISTS 'rejected';
