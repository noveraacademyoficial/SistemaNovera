-- Sistema Financeiro (Novera Academy) — schema inicial para o Supabase.
-- Rode este arquivo inteiro no painel do Supabase: SQL Editor → New query → colar → Run.
--
-- Decisões de design:
--   * IDs continuam como TEXT (mesmo formato curto já usado nos JSON, ex. "au_msxny89"),
--     em vez de trocar para UUID — preserva os IDs existentes sem precisar remapear nada
--     na hora da migração.
--   * `financeiro2026`, `financeiro2027`, `contaPessoal2026` e `opcoes` viram uma tabela
--     única `configuracoes` (chave + JSONB) em vez de tabelas relacionais: são a réplica
--     das fórmulas do Excel (arrays de 12 meses, premissas, fórmulas por linha) — ninguém
--     busca/filtra dentro deles, e normalizar cada mês em linha arriscaria quebrar
--     sutilmente o motor de cálculo (publico/motor.js) sem ganho nenhum.
--   * RLS fica DESLIGADA em todas as tabelas. Quem decide o que cada pessoa pode ver ou
--     gravar é o servidor Node (login por sessão, mesmo controle de acesso de sempre) —
--     a chave do Supabase usada aqui nunca chega ao navegador, só o próprio servidor a usa.
--     Se um dia o Supabase Auth entrar em cena, essa decisão precisa ser revisitada.

create table if not exists usuarios (
  usuario    text primary key,
  nome       text not null,
  perfil     text not null check (perfil in ('admin', 'professor')),
  professor  text not null,
  salt       text not null,
  hash       text not null,
  criado_em  timestamptz not null default now()
);

create table if not exists alunos (
  id               text primary key,
  nome             text not null,
  contato          text,
  cidade           text,
  estado           text,
  pais             text,
  plano            text,
  valor_mensal     numeric,
  data_matricula   text,
  objetivo         text,
  horario          text,
  dias             text,
  professor        text,
  status           text,
  dia_vencimento   integer,
  remarcacao       integer,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
create index if not exists idx_alunos_professor on alunos (professor);

create table if not exists aulas (
  id                  text primary key,
  professor           text not null,
  aluno_id            text references alunos (id) on delete set null,
  aluno               text,
  dia                 text,
  horario             text,
  status              text,
  aula_feita          text,
  removida            boolean not null default false,
  valor_mes_seguinte  numeric,
  level               text,
  observacao          text,
  n_apresentacao      integer,
  pag_slide           integer,
  qtd_aula            integer,
  script_feito        text,
  script_modelo       text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);
create index if not exists idx_aulas_professor on aulas (professor);
create index if not exists idx_aulas_aluno_id on aulas (aluno_id);

create table if not exists pagamentos (
  id                    text primary key,
  data_pagamento        text,
  aluno                 text,
  tipo                  text,
  valor                 numeric,
  forma                 text,
  professor             text,
  observacao            text,
  competencia_manual    text,
  criado_em             timestamptz not null default now()
);
create index if not exists idx_pagamentos_professor on pagamentos (professor);

create table if not exists remarcacoes (
  id                 text primary key,
  professor          text not null,
  aluno              text,
  ativa              text,
  avisou24h          text,
  data               text,
  dia_semana         text,
  horario            text,
  marcacao_olivia    text,
  mes                text,
  observacao         text,
  criado_em          timestamptz not null default now()
);
create index if not exists idx_remarcacoes_professor on remarcacoes (professor);

create table if not exists experimentais (
  id                     text primary key,
  professor              text not null,
  aluno                  text,
  data                   text,
  dia_semana             text,
  feito                  text,
  horario                text,
  level                  text,
  msg_antes              text,
  msg_contato_recebido   text,
  observacao             text,
  qtd_aulas              integer,
  criado_em              timestamptz not null default now()
);
create index if not exists idx_experimentais_professor on experimentais (professor);

create table if not exists dados_aulas (
  id                    text primary key,
  professor             text not null,
  mes                   text,
  ano                   integer,
  banco_horas           integer,
  mensalidade           numeric,
  pago                  text,
  data_relatorio        text,
  relatorio_entregue    text,
  observacao            text,
  criado_em             timestamptz not null default now()
);
create index if not exists idx_dados_aulas_professor on dados_aulas (professor);

create table if not exists contagem_aulas (
  id            text primary key,
  professor     text not null,
  ano           integer not null,
  mes           integer not null,
  valor         integer not null default 0,
  remarcacao    integer not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (professor, ano, mes)
);

create table if not exists banco_dados (
  id            text primary key,
  professor     text,
  titulo        text,
  categoria     text,
  data          text,
  valor         numeric,
  observacao    text,
  criado_em     timestamptz not null default now()
);

-- financeiro2026, financeiro2027, contaPessoal2026, opcoes — um documento JSONB por chave.
create table if not exists configuracoes (
  chave          text primary key,
  valor          jsonb not null,
  atualizado_em  timestamptz not null default now()
);

-- RLS explicitamente desligada (ver decisão de design no topo do arquivo).
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
