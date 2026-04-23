-- ============================================================
-- AgendaCD — Multi-Tenant Migration
-- ============================================================

-- ── 1. BUSINESSES TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS businesses (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  owner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug   ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_businesses_owner         ON businesses(owner_id);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_read_business"  ON businesses FOR SELECT USING (true);
CREATE POLICY "owner_write_business" ON businesses FOR ALL    USING (owner_id = auth.uid());

-- ── 2. ADD business_id TO ALL TABLES (nullable first) ──────────
ALTER TABLE services            ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE staff               ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE staff_services      ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE staff_availability  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE blocked_slots       ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE appointments        ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- settings table may not have a migration file, so handle gracefully
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'business_id') THEN
      ALTER TABLE settings ADD COLUMN business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- ── 3. HELPER FUNCTION: auth.user_business_id() ────────────────
CREATE OR REPLACE FUNCTION public.user_business_id()
RETURNS UUID
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM businesses WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- ── 4. TRIGGER: auto-create business on signup ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_slug    TEXT;
  final_slug   TEXT;
  biz_id       UUID;
  suffix        INT := 0;
  biz_name      TEXT;
BEGIN
  -- Get business_name from user metadata, fallback to 'Minha Empresa'
  biz_name := COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    NEW.raw_user_meta_data->>'full_name',
    'Minha Empresa'
  );

  -- Generate base slug from business name
  base_slug := lower(regexp_replace(biz_name, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN base_slug := 'minha-empresa'; END IF;

  -- Ensure uniqueness
  final_slug := base_slug;
  LOOP
    EXIT WHEN NOT EXISTS (SELECT 1 FROM businesses WHERE slug = final_slug);
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix;
  END LOOP;

  -- Create business
  INSERT INTO businesses (name, slug, owner_id)
  VALUES (biz_name, final_slug, NEW.id)
  RETURNING id INTO biz_id;

  -- Create default settings row
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    INSERT INTO settings (business_id, system_name)
    VALUES (biz_id, biz_name)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if any, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 5. MIGRATE EXISTING DATA ───────────────────────────────────
-- Assign all existing data to the first user's business
DO $$
DECLARE
  first_user_id UUID;
  biz_id        UUID;
BEGIN
  -- Find the earliest user
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at LIMIT 1;

  IF first_user_id IS NOT NULL THEN
    -- Create business for the first user (skip if trigger already did it)
    INSERT INTO businesses (name, slug, owner_id)
    VALUES ('Minha Empresa', 'minha-empresa', first_user_id)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO biz_id;

    -- Assign business_id to all existing rows
    UPDATE services            SET business_id = biz_id WHERE business_id IS NULL;
    UPDATE staff               SET business_id = biz_id WHERE business_id IS NULL;
    UPDATE staff_services      SET business_id = biz_id WHERE business_id IS NULL;
    UPDATE staff_availability  SET business_id = biz_id WHERE business_id IS NULL;
    UPDATE blocked_slots       SET business_id = biz_id WHERE business_id IS NULL;
    UPDATE appointments        SET business_id = biz_id WHERE business_id IS NULL;

    -- settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
      UPDATE settings SET business_id = biz_id WHERE business_id IS NULL;
    END IF;
  END IF;
END $$;

-- ── 6. MAKE business_id NOT NULL ───────────────────────────────
-- (only for rows that have data; in a fresh project there may be no users yet,
--  so we delete orphaned rows before enforcing NOT NULL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    DELETE FROM settings WHERE business_id IS NULL;
  END IF;
END $$;

ALTER TABLE services            ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE staff               ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE staff_services      ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE staff_availability  ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE blocked_slots       ALTER COLUMN business_id SET NOT NULL;
ALTER TABLE appointments        ALTER COLUMN business_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    ALTER TABLE settings ALTER COLUMN business_id SET NOT NULL;
  END IF;
END $$;

-- Create indexes for business_id
CREATE INDEX IF NOT EXISTS idx_services_business        ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_business           ON staff(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_services_business  ON staff_services(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_avail_business     ON staff_availability(business_id);
CREATE INDEX IF NOT EXISTS idx_blocked_slots_business   ON blocked_slots(business_id);
CREATE INDEX IF NOT EXISTS idx_appointments_business    ON appointments(business_id);

-- ── 7. UPDATE RLS POLICIES ─────────────────────────────────────

-- services
DROP POLICY IF EXISTS "public_read_services"   ON services;
DROP POLICY IF EXISTS "admin_write_services"   ON services;
CREATE POLICY "public_read_services"  ON services FOR SELECT USING (true);
CREATE POLICY "admin_write_services"  ON services FOR ALL    USING (business_id = public.user_business_id());

-- staff
DROP POLICY IF EXISTS "public_read_staff"   ON staff;
DROP POLICY IF EXISTS "admin_write_staff"   ON staff;
CREATE POLICY "public_read_staff"  ON staff FOR SELECT USING (true);
CREATE POLICY "admin_write_staff"  ON staff FOR ALL    USING (business_id = public.user_business_id());

-- staff_services
DROP POLICY IF EXISTS "public_read_staff_services"   ON staff_services;
DROP POLICY IF EXISTS "admin_write_staff_services"   ON staff_services;
CREATE POLICY "public_read_staff_services"  ON staff_services FOR SELECT USING (true);
CREATE POLICY "admin_write_staff_services"  ON staff_services FOR ALL    USING (business_id = public.user_business_id());

-- staff_availability
DROP POLICY IF EXISTS "public_read_availability"   ON staff_availability;
DROP POLICY IF EXISTS "admin_write_availability"   ON staff_availability;
CREATE POLICY "public_read_availability"  ON staff_availability FOR SELECT USING (true);
CREATE POLICY "admin_write_availability"  ON staff_availability FOR ALL    USING (business_id = public.user_business_id());

-- blocked_slots
DROP POLICY IF EXISTS "public_read_blocked_slots"   ON blocked_slots;
DROP POLICY IF EXISTS "admin_write_blocked_slots"   ON blocked_slots;
CREATE POLICY "public_read_blocked_slots"  ON blocked_slots FOR SELECT USING (true);
CREATE POLICY "admin_write_blocked_slots"  ON blocked_slots FOR ALL    USING (business_id = public.user_business_id());

-- appointments
DROP POLICY IF EXISTS "public_insert_appointments"  ON appointments;
DROP POLICY IF EXISTS "admin_read_appointments"     ON appointments;
DROP POLICY IF EXISTS "admin_update_appointments"   ON appointments;
DROP POLICY IF EXISTS "admin_delete_appointments"   ON appointments;
CREATE POLICY "public_insert_appointments" ON appointments FOR INSERT  WITH CHECK (true);
CREATE POLICY "admin_read_appointments"    ON appointments FOR SELECT USING (business_id = public.user_business_id());
CREATE POLICY "admin_update_appointments"  ON appointments FOR UPDATE USING (business_id = public.user_business_id());
CREATE POLICY "admin_delete_appointments"  ON appointments FOR DELETE USING (business_id = public.user_business_id());

-- settings (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'settings') THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'settings') THEN
      -- Drop existing policies dynamically
      EXECUTE format('DROP POLICY IF EXISTS "public_read_settings" ON settings');
      EXECUTE format('DROP POLICY IF EXISTS "admin_write_settings" ON settings');
    END IF;
    CREATE POLICY "public_read_settings"  ON settings FOR SELECT USING (true);
    CREATE POLICY "admin_write_settings"  ON settings FOR ALL    USING (business_id = public.user_business_id());
  END IF;
END $$;

-- ── 8. UPDATE RPCs ─────────────────────────────────────────────

-- book_appointment: now requires p_business_id
CREATE OR REPLACE FUNCTION book_appointment(
  p_business_id    UUID,
  p_service_id     UUID,
  p_staff_id       UUID,
  p_scheduled_at   TIMESTAMPTZ,
  p_ends_at        TIMESTAMPTZ,
  p_client_name    TEXT,
  p_client_email   TEXT,
  p_client_phone   TEXT,
  p_service_price  NUMERIC,
  p_caution_amount NUMERIC,
  p_client_notes   TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conflict_count INT;
  new_id         UUID;
BEGIN
  -- Verify service belongs to the business
  IF NOT EXISTS (SELECT 1 FROM services WHERE id = p_service_id AND business_id = p_business_id) THEN
    RAISE EXCEPTION 'service_not_found'
      USING HINT = 'Service does not belong to this business.';
  END IF;

  -- Lock rows to serialise concurrent bookings for the same staff member
  SELECT COUNT(*) INTO conflict_count
  FROM appointments
  WHERE staff_id = p_staff_id
    AND business_id = p_business_id
    AND status NOT IN ('cancelled')
    AND (scheduled_at, ends_at) OVERLAPS (p_scheduled_at, p_ends_at);

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'slot_unavailable'
      USING HINT = 'The requested time slot is no longer available.';
  END IF;

  INSERT INTO appointments (
    business_id, service_id, staff_id,
    scheduled_at, ends_at,
    client_name, client_email, client_phone,
    service_price, caution_amount,
    client_notes, policy_accepted
  ) VALUES (
    p_business_id, p_service_id, p_staff_id,
    p_scheduled_at, p_ends_at,
    p_client_name, p_client_email, p_client_phone,
    p_service_price, p_caution_amount,
    p_client_notes, true
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- confirm_caution_payment: verify appointment belongs to user's business
CREATE OR REPLACE FUNCTION confirm_caution_payment(
  p_appointment_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  biz_id UUID;
BEGIN
  biz_id := public.user_business_id();

  UPDATE appointments
  SET caution_status  = 'paid',
      caution_paid_at = NOW(),
      status          = 'confirmed'
  WHERE id = p_appointment_id
    AND business_id = biz_id
    AND status NOT IN ('cancelled', 'completed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_not_found_or_invalid_state';
  END IF;
END;
$$;
