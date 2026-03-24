-- =====================================================
-- MIGRATION: Logs reais de envio de emails via Resend
-- Data: 2026-03-24
-- =====================================================

CREATE TABLE IF NOT EXISTS resend_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'resend',
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('token', 'signed_pdf')),
  resend_email_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('accepted', 'failed')),
  error_message TEXT,
  provider_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resend_email_logs_contract_id
  ON resend_email_logs(contract_id);

CREATE INDEX IF NOT EXISTS idx_resend_email_logs_created_at
  ON resend_email_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resend_email_logs_status
  ON resend_email_logs(status);

ALTER TABLE resend_email_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'resend_email_logs'
      AND policyname = 'Authenticated users can view resend logs'
  ) THEN
    CREATE POLICY "Authenticated users can view resend logs"
      ON resend_email_logs
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END
$$;
