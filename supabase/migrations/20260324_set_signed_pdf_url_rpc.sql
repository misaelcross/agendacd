-- =====================================================
-- MIGRATION: RPC para salvar URL do PDF assinado
-- Data: 2026-03-24
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_signed_pdf_url(
  p_contract_id UUID,
  p_signed_pdf_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE contracts
  SET signed_pdf_url = p_signed_pdf_url,
      updated_at = NOW()
  WHERE id = p_contract_id
    AND status = 'active';

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_signed_pdf_url(UUID, TEXT) TO anon, authenticated;
