-- Correção 3: mesma causa das correções 1 e 2 — RLS continuando ativa nas
-- tabelas novas de sessão/login (sessoes, tentativas_login, metadados),
-- mesmo com "disable row level security" no schema-vercel.sql original.
-- Reforça o desligamento + garante explicitamente os GRANTs para o papel
-- usado pela chave publicável (anon). Rode no SQL Editor do Supabase.

alter table sessoes          disable row level security;
alter table tentativas_login disable row level security;
alter table metadados        disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on sessoes, tentativas_login, metadados to anon, authenticated;
