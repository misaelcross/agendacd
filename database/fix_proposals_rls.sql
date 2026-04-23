-- Fix: Add owner_id to proposals and enforce row-level security
-- Run this in the Supabase SQL Editor

-- 1. Add owner_id column
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 2. Enable RLS
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- 3. Drop any old permissive policies
DROP POLICY IF EXISTS "Allow public select" ON proposals;
DROP POLICY IF EXISTS "Allow public insert" ON proposals;
DROP POLICY IF EXISTS "Allow public update" ON proposals;
DROP POLICY IF EXISTS "Allow public delete" ON proposals;

-- 4. Create per-user policies
CREATE POLICY "Users can select own proposals"
    ON proposals FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own proposals"
    ON proposals FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own proposals"
    ON proposals FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own proposals"
    ON proposals FOR DELETE
    USING (auth.uid() = owner_id);
