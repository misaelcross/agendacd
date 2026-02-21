-- Habilitar acesso para usuários não autenticados (anon) na tabela proposals
-- Isso garante que as ações de excluir e editar funcionem se o RLS estiver ativado.

-- Desabilitar RLS (Opção mais simples se não houver dados sensíveis)
ALTER TABLE proposals DISABLE ROW LEVEL SECURITY;

-- OU, se preferir manter o RLS ativado, execute as políticas abaixo:
/*
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select" ON proposals FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON proposals FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON proposals FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON proposals FOR DELETE USING (true);
*/
