ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS contractor_number TEXT,
ADD COLUMN IF NOT EXISTS contractor_neighborhood TEXT;
