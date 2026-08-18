-- Para rodar na Vercel (funções sem estado): sessão de login e a trava de
-- tentativas de senha saem da memória do processo e vão para o banco —
-- senão cada requisição poderia cair numa cópia "sem memória" da função e
-- ninguém ficaria logado de verdade. Rode no SQL Editor do Supabase.

create table if not exists sessoes (
  token       text primary key,
  usuario     text not null,
  nome        text not null,
  perfil      text not null,
  professor   text not null,
  expira      timestamptz not null
);
create index if not exists idx_sessoes_expira on sessoes (expira);

create table if not exists tentativas_login (
  ip         text primary key,
  contagem   integer not null default 1,
  expira     timestamptz not null
);

-- carimbo barato de "algo mudou" para o polling do cliente — substitui o
-- contador em memória, que não sobreviveria entre invocações na Vercel.
create table if not exists metadados (
  chave          text primary key,
  atualizado_em  timestamptz not null default now()
);
insert into metadados (chave) values ('versao') on conflict (chave) do nothing;

alter table sessoes          disable row level security;
alter table tentativas_login disable row level security;
alter table metadados        disable row level security;

grant select, insert, update, delete on sessoes, tentativas_login, metadados to anon, authenticated;
