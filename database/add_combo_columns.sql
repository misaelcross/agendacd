-- Adiciona colunas de combo na tabela services
-- Execute no Supabase SQL Editor

ALTER TABLE services ADD COLUMN IF NOT EXISTS is_combo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS combo_service_ids UUID[];
