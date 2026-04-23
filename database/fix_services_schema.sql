-- Run this in the Supabase SQL Editor

-- 1. Remove hardcoded category constraint so categories can be dynamic
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_category_check;

-- 2. Add is_featured column (replaces sort_order in the UI)
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Add image_url column
ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. Create storage bucket for service images
INSERT INTO storage.buckets (id, name, public)
VALUES ('service-images', 'service-images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Combo columns
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_combo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS combo_service_ids UUID[];

-- 6. Storage RLS policies
-- (DROP + CREATE porque PostgreSQL não suporta CREATE POLICY IF NOT EXISTS)

DROP POLICY IF EXISTS "Public read service images" ON storage.objects;
CREATE POLICY "Public read service images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'service-images');

DROP POLICY IF EXISTS "Authenticated upload service images" ON storage.objects;
CREATE POLICY "Authenticated upload service images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'service-images' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated delete service images" ON storage.objects;
CREATE POLICY "Authenticated delete service images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'service-images' AND auth.uid() IS NOT NULL);
