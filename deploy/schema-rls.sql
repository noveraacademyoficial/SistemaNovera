-- Liga o RLS de verdade e tira o acesso da chave publicavel (anon) a todas
-- as tabelas do sistema. Dai em diante, SO a chave service_role (que ignora
-- RLS por definicao) consegue ler/gravar -- e essa chave nunca sai do
-- servidor, nunca vai pro navegador, nunca vai pro git.
--
-- Depois de rodar isto, a chave publicavel (a que apareceu no chat) fica
-- inutil sozinha: com RLS ligada e sem nenhuma politica para anon/authenticated,
-- toda tentativa de leitura ou escrita dela e recusada, nao importa o que
-- ela tente. Rode no SQL Editor do Supabase.

alter table usuarios         enable row level security;
alter table alunos           enable row level security;
alter table aulas             enable row level security;
alter table pagamentos       enable row level security;
alter table remarcacoes      enable row level security;
alter table experimentais    enable row level security;
alter table dados_aulas      enable row level security;
alter table contagem_aulas   enable row level security;
alter table banco_dados      enable row level security;
alter table configuracoes    enable row level security;
alter table sessoes          enable row level security;
alter table tentativas_login enable row level security;
alter table metadados        enable row level security;

-- nenhuma "create policy" de proposito: RLS ligada + zero politicas = zero
-- acesso para anon/authenticated. So service_role (que ignora RLS) passa.

revoke all on
  usuarios, alunos, aulas, pagamentos, remarcacoes, experimentais,
  dados_aulas, contagem_aulas, banco_dados, configuracoes,
  sessoes, tentativas_login, metadados
  from anon, authenticated;
