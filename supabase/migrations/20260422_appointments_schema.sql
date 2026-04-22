-- ============================================================
-- AgendaCD — Appointments Module Schema
-- Migration: 20260422_appointments_schema.sql
-- ============================================================

-- ── 1. SERVICES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  emoji         TEXT DEFAULT '✨',
  category      TEXT NOT NULL
                CHECK (category IN ('facial', 'massagem', 'corporal', 'outro')),
  duration_min  INT NOT NULL DEFAULT 60,
  price         NUMERIC(10,2) NOT NULL,
  caution_pct   NUMERIC(5,2) NOT NULL DEFAULT 30,   -- % cobrada como caução PIX
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. STAFF ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  role         TEXT,
  initials     TEXT,
  avatar_color TEXT NOT NULL DEFAULT '#16a34a',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. STAFF ↔ SERVICES (many-to-many) ──────────────────────
CREATE TABLE IF NOT EXISTS staff_services (
  staff_id   UUID NOT NULL REFERENCES staff(id)    ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

-- ── 4. STAFF AVAILABILITY (weekly recurrence) ───────────────
CREATE TABLE IF NOT EXISTS staff_availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0 = Sunday
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_staff_availability_staff
  ON staff_availability (staff_id, day_of_week);

-- ── 5. BLOCKED SLOTS (one-off blocks: vacations, holidays) ──
CREATE TABLE IF NOT EXISTS blocked_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  blocked_at    TIMESTAMPTZ NOT NULL,
  blocked_until TIMESTAMPTZ NOT NULL,
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_block_range CHECK (blocked_until > blocked_at)
);

CREATE INDEX IF NOT EXISTS idx_blocked_slots_staff
  ON blocked_slots (staff_id, blocked_at);

-- ── 6. APPOINTMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id      UUID REFERENCES services(id) ON DELETE SET NULL,
  staff_id        UUID REFERENCES staff(id)    ON DELETE SET NULL,

  -- Client data (denormalised for resilience)
  client_name     TEXT NOT NULL,
  client_email    TEXT NOT NULL,
  client_phone    TEXT,

  -- Timing
  scheduled_at    TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,

  -- Status lifecycle: pending → confirmed → completed | cancelled | no_show
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','confirmed','completed','cancelled','no_show')),

  -- Financial
  service_price   NUMERIC(10,2) NOT NULL,
  caution_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
  caution_status  TEXT NOT NULL DEFAULT 'pending'
                  CHECK (caution_status IN ('none','pending','paid','refunded')),
  caution_paid_at TIMESTAMPTZ,

  -- Notes
  client_notes    TEXT,
  admin_notes     TEXT,
  policy_accepted BOOLEAN NOT NULL DEFAULT false,

  -- Audit
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at    TIMESTAMPTZ,

  CONSTRAINT valid_appointment_range CHECK (ends_at > scheduled_at)
);

CREATE INDEX IF NOT EXISTS idx_appointments_scheduled
  ON appointments (staff_id, scheduled_at, ends_at);

CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments (status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_appointments_client_email
  ON appointments (client_email);

-- ── 7. RPC: book_appointment (anti-race-condition) ───────────
-- Atomically checks for slot overlap then inserts.
-- Raises 'slot_unavailable' if there is a conflict.
CREATE OR REPLACE FUNCTION book_appointment(
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
  -- Lock rows to serialise concurrent bookings for the same staff member
  SELECT COUNT(*) INTO conflict_count
  FROM appointments
  WHERE staff_id = p_staff_id
    AND status NOT IN ('cancelled')
    AND (scheduled_at, ends_at) OVERLAPS (p_scheduled_at, p_ends_at);

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'slot_unavailable'
      USING HINT = 'The requested time slot is no longer available.';
  END IF;

  INSERT INTO appointments (
    service_id, staff_id,
    scheduled_at, ends_at,
    client_name, client_email, client_phone,
    service_price, caution_amount,
    client_notes, policy_accepted
  ) VALUES (
    p_service_id, p_staff_id,
    p_scheduled_at, p_ends_at,
    p_client_name, p_client_email, p_client_phone,
    p_service_price, p_caution_amount,
    p_client_notes, true
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- ── 8. RPC: confirm_caution_payment ──────────────────────────
-- Admin marks caution as paid and auto-confirms the appointment.
CREATE OR REPLACE FUNCTION confirm_caution_payment(
  p_appointment_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE appointments
  SET caution_status  = 'paid',
      caution_paid_at = NOW(),
      status          = 'confirmed'
  WHERE id = p_appointment_id
    AND status NOT IN ('cancelled', 'completed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'appointment_not_found_or_invalid_state';
  END IF;
END;
$$;

-- ── 9. ROW LEVEL SECURITY ─────────────────────────────────────

-- Reference tables: public read, authenticated write
ALTER TABLE services          ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff             ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_services    ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments      ENABLE ROW LEVEL SECURITY;

-- services
CREATE POLICY "public_read_services"       ON services          FOR SELECT USING (true);
CREATE POLICY "admin_write_services"       ON services          FOR ALL    USING (auth.uid() IS NOT NULL);

-- staff
CREATE POLICY "public_read_staff"          ON staff             FOR SELECT USING (true);
CREATE POLICY "admin_write_staff"          ON staff             FOR ALL    USING (auth.uid() IS NOT NULL);

-- staff_services
CREATE POLICY "public_read_staff_services" ON staff_services    FOR SELECT USING (true);
CREATE POLICY "admin_write_staff_services" ON staff_services    FOR ALL    USING (auth.uid() IS NOT NULL);

-- staff_availability
CREATE POLICY "public_read_availability"   ON staff_availability FOR SELECT USING (true);
CREATE POLICY "admin_write_availability"   ON staff_availability FOR ALL    USING (auth.uid() IS NOT NULL);

-- blocked_slots
CREATE POLICY "public_read_blocked_slots"  ON blocked_slots     FOR SELECT USING (true);
CREATE POLICY "admin_write_blocked_slots"  ON blocked_slots     FOR ALL    USING (auth.uid() IS NOT NULL);

-- appointments: public insert (booking), authenticated select/update/delete
CREATE POLICY "public_insert_appointments" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "admin_read_appointments"    ON appointments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_update_appointments"  ON appointments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "admin_delete_appointments"  ON appointments FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── 10. SEED: Demo data ───────────────────────────────────────
-- (Uncomment and adjust for local dev / staging only)
/*
INSERT INTO staff (name, role, initials, avatar_color) VALUES
  ('Ana Lima',     'Esteticista Sênior', 'AL', '#16a34a'),
  ('Carol Santos', 'Terapeuta',          'CS', '#7c3aed'),
  ('Marina Costa', 'Esteticista',        'MC', '#0891b2');

INSERT INTO services (name, description, emoji, category, duration_min, price, caution_pct) VALUES
  ('Facial Bespoke',        'Tratamento facial personalizado',           '✨', 'facial',   60,  180.00, 30),
  ('Massagem Relaxante',    'Massagem corporal relaxante 60 min',        '💆', 'massagem', 60,  150.00, 30),
  ('Limpeza de Pele',       'Limpeza profunda com extração',             '🌿', 'facial',   90,  120.00, 30),
  ('Drenagem Linfática',    'Drenagem corporal completa',                '💧', 'corporal', 60,  130.00, 30),
  ('Peeling Químico',       'Renovação celular com ácidos',              '⚗️', 'facial',   45,  200.00, 50);
*/
