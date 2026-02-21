-- Criar tabela de configurações para armazenar o logo e outras preferências
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    logo_url TEXT,
    company_name TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir registro padrão se não existir
INSERT INTO settings (id, logo_url)
SELECT '550e8400-e29b-41d4-a716-446655440000', 'https://via.placeholder.com/150'
WHERE NOT EXISTS (SELECT 1 FROM settings WHERE id = '550e8400-e29b-41d4-a716-446655440000');

-- Habilitar RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público (ajustar conforme necessário)
CREATE POLICY "Allow public select on settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow public update on settings" ON settings FOR UPDATE USING (true);
CREATE POLICY "Allow public insert on settings" ON settings FOR INSERT WITH CHECK (true);
