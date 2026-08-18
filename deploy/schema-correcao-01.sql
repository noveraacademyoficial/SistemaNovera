-- Correção do schema.sql original — rode no SQL Editor do Supabase.
--
-- 1) Alguns caminhos do PostgREST continuam bloqueando escrita mesmo com RLS
--    desligada ("new row violates row-level security policy") — provável
--    resíduo de RLS/GRANT padrão do projeto. Reforça o desligamento e garante
--    explicitamente que o papel usado pela chave publicável (anon) pode ler
--    e escrever nas tabelas da aplicação.
-- 2) Faltou a coluna atualizado_em em algumas tabelas no schema.sql original
--    (peguei só criado_em nelas por engano) — o código do servidor grava essa
--    coluna em todas, então adiciono onde faltava.

alter table usuarios       disable row level security;
alter table alunos         disable row level security;
alter table aulas          disable row level security;
alter table pagamentos     disable row level security;
alter table remarcacoes    disable row level security;
alter table experimentais  disable row level security;
alter table dados_aulas    disable row level security;
alter table contagem_aulas disable row level security;
alter table banco_dados    disable row level security;
alter table configuracoes  disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  usuarios, alunos, aulas, pagamentos, remarcacoes, experimentais,
  dados_aulas, contagem_aulas, banco_dados, configuracoes
  to anon, authenticated;

alter table pagamentos    add column if not exists atualizado_em timestamptz not null default now();
alter table remarcacoes   add column if not exists atualizado_em timestamptz not null default now();
alter table experimentais add column if not exists atualizado_em timestamptz not null default now();
alter table dados_aulas   add column if not exists atualizado_em timestamptz not null default now();
alter table banco_dados   add column if not exists atualizado_em timestamptz not null default now();
