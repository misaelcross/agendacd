# Database Migrations - Sistema de Contratos

## SQL para executar no Supabase

Execute o seguinte SQL no SQL Editor do Supabase:

```sql
-- =====================================================
-- MIGRATION: Sistema de Contratos
-- Data: 2026-02-23
-- Descrição: Cria tabelas para contratos e tokens,
--            adiciona status nas propostas
-- =====================================================

-- =====================================================
-- TABELA: contracts
-- Armazena os contratos gerados a partir de propostas
-- =====================================================
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    
    -- Dados do Contratante (preenchidos no formulário)
    contractor_type TEXT NOT NULL CHECK (contractor_type IN ('pf', 'pj')),
    contractor_name TEXT NOT NULL,                    -- Nome completo ou Razão Social
    contractor_document TEXT NOT NULL,                -- CPF ou CNPJ
    contractor_address TEXT NOT NULL,                 -- Endereço completo
    contractor_cep TEXT NOT NULL,                     -- CEP
    contractor_city TEXT NOT NULL,                    -- Cidade
    contractor_state TEXT NOT NULL,                   -- Estado (UF)
    contractor_email TEXT NOT NULL,                   -- Email
    contractor_phone TEXT NOT NULL,                   -- Telefone
    
    -- Dados do Responsável (apenas para PJ)
    responsible_name TEXT,                            -- Nome do responsável
    responsible_cpf TEXT,                             -- CPF do responsável
    
    -- Status do Contrato
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    
    -- Assinatura
    signature_token TEXT,                             -- Token de autorização
    signature_token_expires_at TIMESTAMP WITH TIME ZONE,  -- Expiração do token
    signed_at TIMESTAMP WITH TIME ZONE,               -- Data da assinatura
    signature_ip TEXT,                                -- IP usado na assinatura
    signed_pdf_url TEXT,                              -- URL do PDF assinado no Storage
    
    -- Dados do Projeto (copiados da proposta)
    project_description TEXT,                         -- Descrição do projeto
    project_value DECIMAL(10,2),                      -- Valor total
    project_deadline_days INTEGER,                    -- Prazo em dias
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_contracts_proposal_id ON contracts(proposal_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_signature_token ON contracts(signature_token);

-- =====================================================
-- TABELA: contract_tokens
-- Tokens temporários para validação de assinatura
-- =====================================================
CREATE TABLE IF NOT EXISTS contract_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,                       -- Token de 6 dígitos
    email TEXT NOT NULL,                              -- Email destinatário
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,     -- Expiração (15 min)
    used_at TIMESTAMP WITH TIME ZONE,                 -- Quando foi usado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para busca rápida por token
CREATE INDEX IF NOT EXISTS idx_contract_tokens_token ON contract_tokens(token);
CREATE INDEX IF NOT EXISTS idx_contract_tokens_contract_id ON contract_tokens(contract_id);

-- =====================================================
-- ADICIONAR: Campo status na tabela proposals
-- =====================================================
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'active', 'completed'));

-- Atualizar propostas existentes (se houver)
UPDATE proposals SET status = 'pending' WHERE status IS NULL;

-- =====================================================
-- RLS - Row Level Security
-- =====================================================

-- Habilitar RLS nas novas tabelas
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas para contracts
-- Leitura pública baseada no UUID (imprevisível) para o cliente ver e assinar
CREATE POLICY "Public can view contracts" ON contracts
    FOR SELECT USING (true);

-- Permite inserção pública (pois o cliente sem login preenche os dados)
CREATE POLICY "Public can insert contracts" ON contracts
    FOR INSERT WITH CHECK (true);

-- Atualização pública permitida apenas se o contrato estiver pendente
CREATE POLICY "Public can update pending contracts" ON contracts
    FOR UPDATE USING (status = 'pending');

-- Políticas para contract_tokens
CREATE POLICY "Users can view tokens" ON contract_tokens
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert tokens" ON contract_tokens
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update tokens" ON contract_tokens
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- =====================================================
-- FUNÇÃO: Limpar tokens expirados (executar periodicamente)
-- =====================================================
CREATE OR REPLACE FUNCTION clean_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM contract_tokens 
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNÇÃO: Validar token de assinatura e ativar contrato
-- =====================================================
CREATE OR REPLACE FUNCTION validate_signature_token(
    p_contract_id UUID,
    p_token TEXT,
    p_ip_address TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_token_id UUID;
BEGIN
    -- Busca token válido
    SELECT id INTO v_token_id
    FROM contract_tokens
    WHERE contract_id = p_contract_id 
      AND token = p_token 
      AND expires_at > NOW() 
      AND used_at IS NULL;

    IF v_token_id IS NOT NULL THEN
        -- Marca token como usado
        UPDATE contract_tokens SET used_at = NOW() WHERE id = v_token_id;
        
        -- Atualiza contrato para 'active' e salva IP/Data
        UPDATE contracts 
        SET status = 'active', 
            signed_at = NOW(), 
            signature_ip = p_ip_address
        WHERE id = p_contract_id;
        
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Atualizar updated_at automaticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMENTÁRIOS NAS TABELAS
-- =====================================================
COMMENT ON TABLE contracts IS 'Contratos gerados a partir de propostas';
COMMENT ON TABLE contract_tokens IS 'Tokens temporários para validação de assinatura de contratos';

COMMENT ON COLUMN contracts.contractor_type IS 'Tipo de pessoa: pf (física) ou pj (jurídica)';
COMMENT ON COLUMN contracts.status IS 'Status do contrato: pending, active, completed, cancelled';
COMMENT ON COLUMN contracts.signature_token IS 'Token de 6 dígitos para validação da assinatura';
```

## Migration adicional (log real do Resend)

Execute também a migration abaixo para persistir os eventos reais de envio de e-mail:

`supabase/migrations/20260324_create_resend_email_logs.sql`

## Como Executar

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Cole o SQL acima
4. Clique em **Run**

## Verificação

Após executar, verifique se as tabelas foram criadas:

```sql
-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('contracts', 'contract_tokens');

-- Verificar coluna status em proposals
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'proposals' AND column_name = 'status';
```

## Estrutura das Tabelas

### contracts
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Primary Key |
| proposal_id | UUID | FK para proposals |
| contractor_type | TEXT | 'pf' ou 'pj' |
| contractor_name | TEXT | Nome/Razão Social |
| contractor_document | TEXT | CPF/CNPJ |
| contractor_address | TEXT | Endereço |
| contractor_cep | TEXT | CEP |
| contractor_city | TEXT | Cidade |
| contractor_state | TEXT | Estado (UF) |
| contractor_email | TEXT | Email |
| contractor_phone | TEXT | Telefone |
| responsible_name | TEXT | Nome do responsável (PJ) |
| responsible_cpf | TEXT | CPF do responsável (PJ) |
| status | TEXT | pending/active/completed/cancelled |
| signature_token | TEXT | Token de assinatura |
| signature_token_expires_at | TIMESTAMP | Expiração do token |
| signed_at | TIMESTAMP | Data da assinatura |
| signature_ip | TEXT | IP da assinatura |
| signed_pdf_url | TEXT | URL do PDF assinado |
| project_description | TEXT | Descrição do projeto |
| project_value | DECIMAL | Valor total |
| project_deadline_days | INTEGER | Prazo em dias |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

### contract_tokens
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID | Primary Key |
| contract_id | UUID | FK para contracts |
| token | TEXT | Token de 6 dígitos |
| email | TEXT | Email destinatário |
| expires_at | TIMESTAMP | Expiração (15 min) |
| used_at | TIMESTAMP | Quando foi usado |
| created_at | TIMESTAMP | Data de criação |
