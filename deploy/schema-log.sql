-- Log de atividades da tela da Profa. Olivia (Aulas, Remarcações, Aula
-- experimental): toda criação, edição e exclusão de linha fica registrada
-- aqui, com data/hora do servidor (nunca do navegador) e quem fez.
-- Tabela só de inserção — ninguém edita nem apaga uma linha existente daqui
-- pela aplicação.

create table if not exists log_atividades (
  id text primary key,
  professor text not null,
  conjunto text not null,           -- 'aulas' | 'remarcacoes' | 'experimentais'
  acao text not null,               -- 'criar' | 'editar' | 'excluir'
  aluno text,
  campo text,                       -- só em 'editar': qual coluna mudou
  valor_anterior text,
  valor_novo text,
  usuario text not null,            -- login de quem fez (ex.: "davi", "olivia")
  nome_usuario text,                -- nome de exibição (ex.: "Davi", "Olivia")
  criado_em timestamptz not null default now()
);

create index if not exists log_atividades_professor_criado_em_idx
  on log_atividades (professor, criado_em desc);

-- Mesma trava de RLS de todas as outras tabelas: só o service_role (usado
-- só pelo servidor) consegue ler ou gravar; anon/authenticated ficam de fora
-- mesmo se a tabela algum dia for exposta sem querer via API pública.
alter table log_atividades enable row level security;
revoke all on log_atividades from anon, authenticated;
