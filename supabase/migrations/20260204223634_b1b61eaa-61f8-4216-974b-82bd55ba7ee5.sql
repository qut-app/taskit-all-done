-- Add account type and company fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_type TEXT DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS cac_number TEXT,
ADD COLUMN IF NOT EXISTS cac_document_url TEXT,
ADD COLUMN IF NOT EXISTS company_address TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.account_type IS 'individual or company';
COMMENT ON COLUMN public.profiles.cac_number IS 'Corporate Affairs Commission registration number';
COMMENT ON COLUMN public.profiles.cac_document_url IS 'URL to uploaded CAC certificate';