-- Create RPCs to get Proposal and Contract by Short UUID

-- 1. Get Proposal by short ID (first segment of UUID)
CREATE OR REPLACE FUNCTION get_proposal_by_short_id(p_short_id TEXT)
RETURNS SETOF proposals AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM proposals
  WHERE CAST(id AS TEXT) LIKE (p_short_id || '-%')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 2. Get Contract by short ID (first segment of UUID)
CREATE OR REPLACE FUNCTION get_contract_by_short_id(p_short_id TEXT)
RETURNS SETOF contracts AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM contracts
  WHERE CAST(id AS TEXT) LIKE (p_short_id || '-%')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
