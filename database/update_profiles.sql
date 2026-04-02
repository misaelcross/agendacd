-- Instruções: Execute esta query no SQL Editor do seu Supabase para adicionar o suporte aos perfis de empresa.

ALTER TABLE settings ADD COLUMN IF NOT EXISTS company_profiles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS company_profile JSONB;
