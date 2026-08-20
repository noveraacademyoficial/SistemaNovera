# Sistema Financeiro — Novera Academy

Sistema visual construído sobre a base **`Análise de aulas - atualizado.xlsx`**.
Todas as abas, regras e fórmulas da planilha foram reproduzidas; os dados ficam
gravados nesta mesma pasta.

---

## Como usar

Clique duas vezes em **`INICIAR.bat`**.
O navegador abre em `http://localhost:3300`. Para encerrar, feche a janela preta
(ou pressione `Ctrl + C` nela).

Requisito: Node.js instalado (https://nodejs.org). Nenhuma outra instalação é necessária.

---

## Entrar no sistema

| Usuário | Senha | O que enxerga |
|---|---|---|
| `davi` | `tellme1@` | tudo: gestão financeira + as telas dos dois professores |
| `olivia` | `olivia1@` | apenas a tela **Professora Olivia** |

O botão de sair fica no rodapé do menu, junto ao nome de quem está logado. A sessão
dura 12 horas.

O menu é dividido em dois grupos, que abrem e fecham no clique: **Financeiro** (visão
geral, alunos, pagamentos, financeiro 2026 e 2027, conta pessoal, relatórios e listas)
e **Professores** (Prof. Davi e Profa. Olivia). A Olivia só enxerga o grupo Professores,
com a tela dela. **Os grupos vêm sempre fechados ao entrar** — clique no nome do grupo
para abrir e ver as opções dele.

No topo da página, ao lado do botão de voltar, o ícone **«** recolhe o menu lateral
para uma faixa só de ícones (útil em telas menores ou para ganhar espaço nas tabelas
largas); clique de novo (**»**) para expandir. A preferência fica salva no navegador.

**A separação é feita no servidor, não na tela.** Quando a Olivia entra, o navegador
dela nem chega a receber o financeiro, os pagamentos ou os alunos do Davi — e o valor
da mensalidade é removido dos alunos antes do envio. Tentar gravar em um conjunto que
não é dela é recusado (403). As senhas ficam guardadas como hash (scrypt com sal) em
`dados\usuarios.json`, nunca em texto puro.

> Dois pontos honestos sobre isso: o servidor escuta apenas em `localhost`, então hoje
> a Olivia só consegue entrar **no computador onde o sistema está rodando**. E é um
> controle de acesso para uso local — publicar isso na internet exigiria HTTPS e outras
> proteções. Para trocar uma senha, me peça: o hash precisa ser gerado de novo.

---

## Telas dos professores

Uma tela por professor, com sub-abas:

| Sub-aba | Davi | Olivia |
|---|---|---|
| **Aulas** | sim | sim |
| **Remarcações** | sim | sim |
| **Aula experimental** | — | sim |
| **Dados das Aulas** | sim | — |
| **Banco de Dados** | sim | — |

**As duas telas são independentes.** Cada professor tem a própria lista, guardada com
o nome dele em cada linha; editar em uma tela nunca alcança a outra, e nada do que se
faz aqui altera o Cadastro de alunos ou o financeiro. Quando a Olivia grava, o servidor
preserva as linhas do Davi, e vice-versa — inclusive quando as duas telas são usadas ao
mesmo tempo, em computadores diferentes.

**Aulas** — **todas as colunas são editáveis**: Nomes, Level, Dia, Horário, Status,
Observação, N Apresentação, Pag. Slide, Script Feito, Script Modelo, Aula feita — e,
só para o Davi, também **Qtd. Aula** e **Valor Mês Seguinte**. **Valores de mensalidade
não aparecem aqui.**

- **Status** agora é a mesma lista da aba *Listas e opções* (não uma lista fixa
  separada): editar as opções lá atualiza as duas telas de professor e o Cadastro de
  alunos juntos.
- **Script Modelo** é uma lista com **1.0** e **2.0**, para os dois professores.
- **Valor Mês Seguinte** (só Davi) é um número livre, **sem ligação com nenhuma outra
  coluna** — nem a mensalidade, nem qualquer valor do Cadastro. Serve só para marcar
  quem parece estar caminhando para um upgrade de plano, e alimenta um gráfico na
  Visão Geral (ver abaixo).
- **Excluir uma linha** agora tira o aluno só **desta lista** — o Cadastro de alunos
  não muda, mas essa remoção não tem mais um botão de desfazer dentro da tela (o botão
  **"Mostrar removidos"** foi retirado); para trazer o aluno de volta é preciso usar
  **+ Nova linha** de novo.

A lista traz uma linha por aluno do professor: o Cadastro de alunos fornece o **valor
inicial** de nome, dia, horário e status e, a partir da primeira edição, valem os
valores desta tela. Use **+ Nova linha** (ou **+ Nova remarcação** / **+ Nova aula
experimental**, conforme a aba) para uma aula que não está no cadastro — o clique abre
uma **janela flutuante** para preencher os campos, sem precisar rolar a tabela até o
fim para ver a linha nova depois de criada.

Tudo vem **ordenado do primeiro dia da semana para o último** e, dentro do dia, do
primeiro horário — nas Aulas, nas Remarcações e nas Aulas experimentais. Há um filtro
por **dia da semana**, um campo de **busca por aluno** (nome, level, dia, horário,
status ou observação — os dois filtros se combinam) e gráficos: alunos por dia, por
level e por faixa de horário (e, só na tela da Olivia, o gráfico de aulas do mês).

**Atualização em tempo real** — as telas se atualizam sozinhas a cada 5 segundos.
Se a Olivia mudar algo na tela dela, quem estiver logado como `davi` vê a alteração
aparecer sem precisar recarregar. A atualização nunca acontece enquanto você está
digitando ou com uma janela aberta, para não atropelar a edição.

**Remarcações** — Name (campo de texto livre — digite o nome à mão; a lista de
alunos já cadastrados aparece como sugestão de autocompletar, mas não é
obrigatório escolher um deles), Aula feita (era "Ativa" na planilha original —
renomeei para bater com o campo de mesmo nome da aba Aulas), Avisou 24h, Data,
Dia da semana, Horário, Marcação Olivia, Mês e Observação: os campos exatamente
como na planilha "Remarcação dos alunos" que você mandou, todos editáveis.
Ordenada só por **horário** (não mais por dia da semana primeiro, já que cada
linha é um encontro numa data específica), com filtro de **mês** e de **dia da
semana** no topo da tela — os dois se combinam (ex.: Agosto + Quinta mostra só
as remarcações de quinta-feira de agosto, da mais cedo para a mais tarde).

**Aula experimental** (só Olivia) — Name, Data, Dia Semana, Feito, Horário, Level,
Msg. Antes da Aula, Msg. Contato Recebido, Observação e Qtd Aulas: os campos da
planilha "Aula experimental", também todos editáveis. Mesma ordenação por
horário e o mesmo filtro de mês (aqui, como não existe um campo "Mês" pronto,
o mês é lido a partir da Data).

**Dados das Aulas** (só Davi) — um registro por mês: mês, ano, banco de horas,
mensalidade, pago, data do relatório, relatório entregue, observação e
professor(a). Essa aba saiu da tela da Olivia (os registros dela continuam
guardados em `dados\dadosAulas.json`, só não aparecem mais em nenhuma tela —
me avise se quiser que eles voltem a aparecer em algum lugar).

**Banco de Dados** (só Davi) — aba nova, ainda **provisória**: como eu não tinha a
planilha exata que deveria alimentá-la, ela veio com colunas genéricas (Título,
Categoria, Data, Valor, Observação), totalmente editáveis, para já dar para usar.
Assim que você mandar (ou indicar) o arquivo certo, eu troco as colunas para bater
com ele, sem perder o que já estiver preenchido.

### Aulas do mês (só Olivia) e o botão protegido pela senha do Davi

O campo **Qtd. Aula** saiu da tela da Olivia. No lugar, a aba Aulas dela ganhou um
gráfico **"Aulas do mês"** com uma barra por mês do ano, que funciona como um
contador acumulado com duas origens possíveis:

- Marcar a coluna **Aula feita** de uma linha normal como **Sim** soma **+1** no
  total do mês atual (origem "aula normal", verde); voltar para **Não** tira **−1**.
  Deixar o campo **em branco** (nem Sim, nem Não) **nunca** soma nem tira do total,
  não importa qual era o valor anterior — é só um jeito de marcar "ainda sem resposta"
  sem mexer no gráfico.
- Quando o **Status** de uma linha é **Remarcação**, o campo "Aula feita" dessa
  linha fica **travado** (nem aparece mais como editável) — quem conta como feita
  ali é a linha correspondente na aba **Remarcações**: marcar o campo **Aula feita**
  dela (era "Ativa" na planilha original) como **Sim** também soma **+1** no mesmo
  total do mês (origem "remarcação"), e volta **−1** ao desmarcar — e, do mesmo jeito,
  deixar **em branco** nunca altera o total. Essa parte da
  barra aparece destacada em **amarelo**, com legenda "Aula normal / Remarcação"
  abaixo do gráfico, para mostrar de onde veio cada aula.
- Nenhuma das duas somas pede senha — é só o reflexo automático de uma edição que a
  própria Olivia já pode fazer. Os demais meses (passados ou futuros) só têm valor
  quando alguém preenche manualmente pelo botão abaixo.

O botão **"✎ Editar quantidade do mês"**, no cabeçalho do gráfico, corrige esse número
manualmente — e **sempre** pede confirmação, mesmo que quem esteja logado já seja o
próprio Davi:

- O formulário sempre pede **usuário e senha do Davi**, não importa quem esteja com a
  tela aberta. A senha é conferida no servidor **a cada tentativa**; ela não fica
  "destravada" depois de usada uma vez, e a sessão de quem está logado **nunca muda**
  — a pessoa continua logada como estava, só aquela edição específica fica autorizada.
- Esse ajuste manual grava o total como um número "normal" fresco e **zera** o
  destaque amarelo de remarcação do mês (a próxima marcação de "Aula feita" em
  qualquer uma das duas abas volta a somar normalmente por cima dele).
- Tecnicamente, essa contagem (`dados\contagemAulas.json`) tem dois jeitos de ser
  alterada, e só esses dois: o botão manual acima (sempre com a senha do Davi,
  conferida de novo a cada chamada num endpoint próprio) e o ajuste automático de
  ±1 quando alguém muda "Aula feita" — na aba Aulas ou na aba Remarcações — (um
  segundo endpoint, sem senha, mas que só ajusta a própria contagem de quem está
  editando a linha). Gravação genérica desse conjunto por qualquer outro caminho
  o servidor recusa — não é só uma trava visual.

Logo abaixo, a aba Aulas da Olivia também ganhou o gráfico **"Remarcações por dia"**,
contando quantas remarcações existem em cada dia da semana (campo "Dia da semana"
da aba Remarcações) — para visualizar rapidamente onde as remarcações se concentram.
A contagem é sempre restrita ao **mês atual** (campo "Mês" da linha de remarcação):
o gráfico não soma o histórico inteiro, só o mês corrente — passa a virar do zero
quando o mês vira.

O gráfico "Aulas do mês" aparece copiado na **Visão Geral** (ver abaixo), junto com uma
versão só para o Davi. O KPI "Aulas marcadas como feitas" saiu da tela da Olivia
(o gráfico acima já cobre essa informação de um jeito mais útil); ele continua
existindo na tela do Davi, sem mudança.

> Sobre o campo **Mensalidade** em *Dados das Aulas*: entendi como a remuneração do
> professor no mês, não a mensalidade do aluno — é o único lugar do sistema onde um
> professor vê um valor, e ele é o dele. Se a intenção era outra, me diga.

---

## Onde ficam os dados

**Desde 18/08/2026, os dados ficam no Supabase (Postgres), não mais em arquivos.**
Toda leitura e gravação passa por `banco.js`, que fala com o banco pela
biblioteca `@supabase/supabase-js`. A pasta `dados\*.json` que existia antes
**continua no disco como backup histórico** de como tudo estava até a
migração — o sistema não lê nem grava mais nela.

```
Sistema Financeiro\
├─ Análise de aulas - atualizado.xlsx   planilha original (nunca é alterada)
├─ INICIAR.bat                          abre o sistema (uso local)
├─ package.json                         dependências (@supabase/*) e "npm start"
├─ carregarEnv.js                       lê o .env local para dentro do processo
├─ banco.js                             camada de acesso ao Supabase (único lugar que fala com o banco)
├─ servidor.js                          o handler HTTP (usado local e pela função da Vercel)
├─ vercel.json                          diz pra Vercel onde estão a função e os arquivos estáticos
├─ api\
│  └─ manipulador.js                    função da Vercel — só chama o handler de servidor.js
├─ deploy\                              scripts de publicação e o schema do banco
│  ├─ schema.sql                        schema original (Supabase SQL Editor)
│  ├─ schema-vercel.sql                 tabelas de sessão/login para rodar na Vercel
│  ├─ schema-correcao-*.sql             correções aplicadas depois (histórico)
│  └─ migrar-para-supabase.js           script que moveu dados\*.json pro banco
├─ dados\                               >>> BACKUP HISTÓRICO, não é mais a fonte ativa <<<
│  └─ (os mesmos arquivos de antes, congelados na migração)
└─ publico\                             a interface (html, css, motor de cálculo)
```

**Tabelas no Supabase**: `usuarios`, `alunos`, `aulas`, `pagamentos`,
`remarcacoes`, `experimentais`, `dados_aulas`, `contagem_aulas`, `banco_dados`
— uma linha por registro. `financeiro2026`, `financeiro2027`,
`conta_pessoal_2026` e `opcoes` ficam como documento (JSONB) numa tabela
`configuracoes`, porque são a réplica das fórmulas do Excel (arrays de 12
meses, premissas) — não fazem sentido virar linha de tabela.

**Segurança do banco**: a chave usada (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
fica só no servidor, nunca é enviada ao navegador — quem decide o que cada
pessoa vê ou grava continua sendo o login por sessão de sempre, exatamente
como quando os dados estavam em arquivo. Row Level Security está desligada
de propósito nas tabelas (ver comentário no topo de `deploy/schema.sql`): não
tem Supabase Auth nesta etapa, então uma política de RLS baseada em usuário
autenticado do Supabase não faria sentido aqui.

**Variáveis de ambiente necessárias**: `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — em desenvolvimento local, num arquivo
`.env` na raiz (nunca commitado, já está no `.gitignore`); em produção, como
variável de ambiente do host escolhido.

---

## Publicar na internet

**Atualização (18/08/2026): o sistema agora roda na Vercel também.** Os dados,
a sessão de login e a trava de tentativas de senha ficam todos no Supabase —
nada mais depende de arquivo em disco nem de memória do processo do servidor,
que eram os dois motivos originais de a Vercel não servir para este sistema.

- `servidor.js` exporta um único handler (`tratarRequisicao`) usado tanto pelo
  servidor de processo único (Railway/Render/Oracle/local — sobe um
  `http.createServer` de verdade) quanto por `api/manipulador.js` (a função
  da Vercel — só repassa a requisição para o mesmo handler). `vercel.json`
  manda `/api/*` para essa função e o resto (`/`, `app.js`, `estilo.css` etc.)
  direto para os arquivos estáticos em `publico/`.
- Sessão de login e a trava de tentativas de senha (10 erradas por IP em 5
  minutos) ficam em tabelas do Supabase (`sessoes`, `tentativas_login`), não
  mais em memória — por isso agora tanto faz qual "cópia" da função atende
  cada requisição, exatamente o que a Vercel precisa.

**Configurar na Vercel** (painel do projeto → Settings → Environment
Variables — isso eu não consigo fazer por aqui, precisa ser você): adicione
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` com os
mesmos valores do seu `.env` local. Sem isso a função falha logo de cara (o
`banco.js` recusa subir sem essas duas). Depois de salvar, redeploy o projeto
(a Vercel não aplica variável nova em um deploy já existente sozinha).

Isso não muda nada para quem já estava usando Railway/Render/Oracle Cloud —
continuam funcionando exatamente como nas instruções abaixo, que eu mantive
como alternativa (ex.: se um dia quiser um domínio próprio mais simples de
configurar, ou não gostar do modelo de cobrança da Vercel).

### Opção gratuita para sempre: Oracle Cloud "Always Free"

A Oracle mantém um plano de verdade gratuito para sempre: uma VM (máquina
virtual) que roda o servidor continuamente — os dados já estão no Supabase,
então essa VM não precisa mais de disco próprio para os dados, só para rodar
o processo do Node.js. É mais manual que um Railway, mas os arquivos em
`deploy\` deste repositório automatizam quase tudo.

**Passo 1 — criar a conta e a VM** (no navegador, em [cloud.oracle.com](https://cloud.oracle.com)):

1. Crie a conta (pede cartão de crédito só para confirmar identidade — não
   cobra nada enquanto você ficar dentro do plano Always Free).
2. Escolha uma região perto do Brasil (ex.: São Paulo). Se aparecer "capacidade
   esgotada" ao criar a VM, é um problema conhecido da Oracle com a região —
   tente de novo mais tarde ou escolha outra região próxima.
3. **Compute → Instances → Create Instance**:
   - **Image**: Ubuntu (a versão LTS mais recente disponível).
   - **Shape**: troque para "Ampere" → `VM.Standard.A1.Flex` → pode deixar no
     máximo permitido pelo Always Free (hoje, 2 OCPUs / 12 GB — bem mais do
     que este sistema precisa, mas não custa nada usar).
   - **Add SSH keys**: deixe a Oracle gerar um par de chaves e baixe a chave
     privada (arquivo `.key` ou `.pem`) — é como você vai entrar na VM depois.
   - Confirme que "Assign a public IPv4 address" está marcado.
   - Create.
4. Anote o **endereço IP público** da instância, que aparece na página dela
   depois de criada.
5. **Networking → Virtual Cloud Networks** → (a rede da sua instância) →
   **Security Lists** → a lista padrão → **Add Ingress Rules** → adicione duas
   regras liberando `0.0.0.0/0` nas portas **80** e **443** (TCP). Sem isso o
   site não abre, mesmo com tudo certo dentro da VM.

**Passo 2 — um domínio para o HTTPS.** O Caddy (que cuida do HTTPS automático) precisa
de um nome, não só do IP. Se você já tem um domínio, aponte um registro **A**
dele para o IP público da VM. Se não tem, o [DuckDNS](https://www.duckdns.org)
dá um subdomínio grátis (ex.: `noveraacademy.duckdns.org`) — entre com
Google/GitHub, crie o subdomínio e aponte para o mesmo IP público.

**Passo 3 — entrar na VM e rodar o script de configuração:**

```bash
ssh -i caminho/para/sua-chave.key ubuntu@SEU_IP_PUBLICO
curl -fsSL https://raw.githubusercontent.com/noveraacademyoficial/SistemaNovera/main/deploy/setup.sh -o setup.sh
sudo bash setup.sh
```

Na primeira vez, ele cria um arquivo de configuração e para, pedindo para você
preenchê-lo:

```bash
nano /opt/sistema-financeiro/.env
```

Preencha `DOMINIO` (o domínio do passo 2) e `NEXT_PUBLIC_SUPABASE_URL` /
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (os mesmos valores do `.env` local,
em Project Settings → API no painel do Supabase). `ADMIN_SENHA`/`PROF_SENHA`
só são necessárias se um dia a tabela `usuarios` estiver vazia — como as
contas já existem no banco, pode deixar em branco. Salve (`Ctrl+O`, Enter,
`Ctrl+X`) e rode de novo:

```bash
sudo bash setup.sh
```

Dessa vez ele instala o Node.js, baixa o código, cria o serviço que mantém o
sistema sempre ligado (reinicia sozinho se cair ou se a VM reiniciar), instala
o Caddy com HTTPS automático para o seu domínio, e libera as portas no
firewall da própria VM. No final, mostra o endereço para acessar.

**Passo 4 — testar.** Acesse `https://SEU_DOMINIO`, entre com o usuário/senha de
sempre. Como os dados já estão no Supabase (não em arquivo local), **não
precisa recadastrar nada** — o servidor publicado enxerga exatamente os
mesmos alunos, pagamentos etc. que você vê rodando localmente, porque os
dois falam com o mesmo banco.

**Atualizações futuras**: sempre que eu (ou você) alterar o código e enviar
para o GitHub, é só entrar na VM de novo e rodar:

```bash
sudo bash /opt/sistema-financeiro/deploy/atualizar.sh
```

Isso baixa a versão mais nova e reinicia o serviço.

### Alternativa mais simples (paga): Railway ou Render

Se preferir trocar o trabalho manual acima por um clique de "conectar o
GitHub", o Railway (ou Render) fazem isso — por um valor pequeno por mês.
Como os dados já estão no Supabase, **não precisa mais de Volume/disco
persistente** — só das variáveis de ambiente:

1. **New Project → Deploy from GitHub repo** → escolha
   `noveraacademyoficial/SistemaNovera`. Ele detecta o `package.json` e roda
   `npm start` sozinho.
2. **Variables**: `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (os mesmos do `.env` local).
   `PORT` já vem definida automaticamente pela plataforma.
3. Deploy. Entrar no site publicado e conferir o login — os dados já estão
   todos lá, vindos do mesmo Supabase.

Isso vale tanto para o Railway quanto para o Render (o plano gratuito de
ambos passa a servir, já que não precisam mais de disco).

---

## A regra das cores

A regra que você pediu está aplicada em todas as telas:

| Na planilha | No sistema | Comportamento |
|---|---|---|
| **Linha / texto preto** | campo branco editável | pode digitar, **incluir** e **excluir** linhas |
| **Texto azul (`#0070C0`)** | célula lilás com número em **roxo** e 🔒 | resultado de fórmula — bloqueado |
| **Faixas coloridas** (cabeçalhos, totais, seções) | faixa roxa ou grafite | bloqueado |

> O sistema usa a identidade visual roxa: roxo `#5B4BE8` para fórmulas, ações e
> destaques; grafite `#17162B` nos títulos de painel; verde e vermelho apenas nos
> números positivos e negativos, reproduzindo a formatação condicional da planilha.

---

## Tema claro e escuro

O botão no rodapé do menu lateral alterna entre os dois temas. A escolha fica
guardada no navegador e vale para as próximas aberturas. Na primeira vez, o
sistema segue a preferência do Windows.

## Mini-gráficos da visão geral

Cada um dos oito indicadores do Dashboard traz um gráfico próprio, montado a
partir das mesmas séries mensais que alimentam as tabelas — passe o mouse sobre
uma barra ou sobre o gráfico para ver o mês e o valor exato.

| Indicador | Gráfico |
|---|---|
| Receita acumulada 2026 | curva acumulada de janeiro até o mês corrente |
| Despesas acumuladas 2026 | curva acumulada da despesa total |
| Lucro acumulado 2026 | curva acumulada de receita − despesa |
| Margem líquida | margem de cada mês (barra vermelha quando negativa) |
| Alunos ativos no mês | alunos ativos mês a mês |
| Ticket médio por aluno | receita ÷ alunos ativos, mês a mês |
| Pró-labore / Receita | peso do pró-labore em cada mês |
| Receita projetada 2027 | receita considerada mês a mês em 2027 |

Nas barras, o tom cheio marca os meses já realizados (até o mês corrente) e o
tom claro, os meses ainda planejados. Quando há meses positivos e negativos,
cada lado usa a própria escala, para que um mês fora da curva — como agosto de
2026 — não achate a leitura dos demais; o valor exato continua no tooltip.

O rodapé de cada tela repete essa legenda.

Logo abaixo dos gráficos operacionais, um card **PROFESSORES** traz mais três,
copiados/derivados das telas de professor: o gráfico **Aulas do mês**,
**Valor Mês Seguinte — Davi** (com os alunos dele que têm esse campo preenchido) e
**Aula experimental — Olivia** — uma rosca com a distribuição das aulas experimentais
dela pelo campo "Feito" (Feito / Não feito / Aguardando, esse último para quando o
campo ainda está em branco).

O gráfico **Aulas do mês** tem um filtro **Davi / Olivia** no próprio card:

- **Olivia** mostra o mesmo gráfico acumulado da tela dela, com o botão
  "✎ Editar quantidade do mês" (ver seção abaixo).
- **Davi** mostra uma versão mais simples, sem esse botão: como ele não tem a
  contagem acumulada por senha, o mês atual é calculado **ao vivo** a partir de
  quantas aulas dele estão com "Aula feita = Sim" agora — a mesma base do KPI
  "Aulas marcadas como feitas" da tela dele. Os demais meses ficam em branco.

---

## O que é editável em cada aba

**Cadastro de alunos** — todas as colunas, exceto o **ID** (fórmula `=LIN()-4`, é a
posição da linha). Botão *Novo aluno* e ✕ para excluir. Três colunas deixaram de ser
digitação livre:

- **Cidade** — botão com lupa 🔍 que abre a busca em 1.849 municípios brasileiros
  (cobertura reforçada em SC e RS). Escolher a cidade preenche a **UF** junto. Se a
  cidade não estiver na lista, digite o nome e clique em *Usar "…"*.
- **Dia(s) da Semana** — botão 📅 com os sete dias em caixas de marcação. O texto que
  já existia na planilha ("Terça e Quarta", "Quarta-feira") é lido corretamente e
  aparece marcado.
- **Objetivo da Aula** — lista de seleção: Viagem, Empresarial, Leitura, Falar,
  Gramática, Escola, Reservado, Remarcação de aula, Trabalho e Experimental. A lista é
  editável na aba *Listas e opções*.
- **Remarcação** — número de remarcações do aluno, migrado da coluna `Remarcacao`
  do sistema antigo (`0x`, `1x`, `2x` viraram 0, 1 e 2). Campo livre para edição.

## Navegar nas tabelas largas

As tabelas com muitas colunas (Alunos, Pagamentos, Financeiro 2026 e 2027, Conta
Pessoal) trazem uma barra de navegação **no topo**, para não ser preciso descer até o
rodapé da tabela atrás da rolagem horizontal:

- **⇤ Início** e **Fim ⇥** — vão de uma vez para a primeira ou a última coluna
- **←** e **→** — avançam um trecho por vez
- a barra de rolagem do meio é espelhada e anda junto com a tabela
- com o foco na tabela, as teclas **Home** e **End** fazem o mesmo

Os botões das pontas ficam apagados quando já se está no começo ou no fim. Ao editar
um campo a tabela mantém a posição — não volta para a primeira coluna.

## Excluir sempre pede confirmação

Todo ✕ do sistema (aluno, pagamento, linha de despesa, despesa pessoal e opção de
lista) abre um pop-up dentro da própria tela, com o nome do que será excluído e o
efeito da exclusão — por exemplo, quantos pagamentos usam aquele aluno ou se a linha
também sai da projeção de 2027. `Esc` cancela e `Enter` confirma.

As linhas que alimentam a fórmula da **Renda** na Conta Pessoal 2026 (Pró-labore e
Professor Davi) são protegidas: o sistema avisa e não deixa excluir.

**Pagamentos** — Data do Pagamento, Aluno, Tipo, Valor, Forma, Professor e Observação.
Bloqueadas: **Competência**, **Vencimento**, **Dias em Atraso** e **Situação**.

**Financeiro 2026** — Premissas (Simples Nacional, crescimento 2027, inflação 2027),
*Receita base / projeção*, *Outras receitas* e todas as linhas de despesa (que podem
ser renomeadas, incluídas e excluídas). Bloqueadas: Alunos ativos, Mensalidades
automático, Receita considerada, Simples Nacional, Despesa total, Lucro, Margem e
Ponto de equilíbrio.

**Conta Pessoal 2026** — as despesas pessoais. A **Renda** é fórmula (Pró-labore +
Professor Davi, vindos do Financeiro 2026); para mudá-la, edite aquelas linhas lá.

**Financeiro 2027** — apenas as premissas, *Outras receitas* e quais linhas de 2026
entram na projeção. O restante é derivado de 2026, como na planilha.

**Relatórios** — só consulta, não altera nada.

**Listas e opções** — reproduz a aba *Início*: planos, status, tipos de recebimento,
formas de pagamento e professores. Incluir aqui já atualiza todas as caixas de seleção.

---

## Relatórios

Uma barra de filtros no topo vale para todos os relatórios:

- **Data de referência** — escolhe se o período filtra por *Data do Pagamento*,
  *Competência* ou *Vencimento*. É o filtro mais importante: o mesmo lançamento
  cai em meses diferentes conforme a data usada.
- **Ano**, **De** e **Até** — período sobre a data de referência escolhida
- **Aluno**, **Professor**, **Situação**, **Tipo**, **Forma**
- **Valor mínimo** e **máximo**

Seis relatórios:

| Relatório | O que mostra |
|---|---|
| **Lançamentos** | cada pagamento/cobrança do recorte, linha a linha |
| **Por aluno** | consolidado por aluno: recebido, em aberto, atrasos e pontualidade |
| **Por mês** | totais mês a mês: recebido, em aberto, ticket médio, pontualidade |
| **A vencer** | cobranças com vencimento à frente, ainda sem pagamento |
| **Em atraso** | cobranças vencidas e ainda sem pagamento |
| **Histórico de atrasos** | quem atrasa e com que frequência |

No **Por aluno** e no **Histórico de atrasos**, clicar na linha abre o **histórico
completo** daquele aluno — competência, vencimento, pagamento, valor, dias de atraso,
situação e observação de cada cobrança.

A **recorrência** é a proporção de cobranças com vencimento em que o aluno atrasou.
O selo **"atrasa sempre"** marca quem atrasou em metade ou mais delas, com pelo menos
duas ocorrências — é o filtro para separar quem teve um deslize de quem atrasa por hábito.

Cada relatório tem **Baixar CSV** (separado por `;` e com números em vírgula, abre
direto no Excel em português) e **Imprimir**, que gera uma versão limpa, sem menu nem
filtros, boa para salvar em PDF.

Uma observação de leitura: **Recebido** conta só lançamentos com Data do Pagamento;
**em aberto** são os que ainda não têm data.

---

## Fórmulas reproduzidas

Pagamentos:
- `Competência = SE(Data=""; ""; DATA(ANO(Data); MÊS(Data); 1))`
- `Vencimento = DATA(ANO(Comp); MÊS(Comp); MÍNIMO(Dia de Vencimento do aluno; último dia do mês))`
- `Dias em Atraso = MÁXIMO(0; SE(Data=""; HOJE(); Data) − Vencimento)`
- `Situação = Em dia / Pago com atraso / A vencer / Em atraso / Sem vencimento`

Financeiro 2026:
- `Alunos ativos = CONT.SES(Status;"Ativo"; Data Matrícula;"<="&FIMMÊS(mês;0))`
- `Mensalidades (automático) = SOMASES(Pagamentos[Valor]; data dentro do mês)`
- `Receita base — meses em branco = MÉDIA(Janeiro:Julho)`
- `RECEITA CONSIDERADA = SE(Recebido>0; Recebido; Base) + Outras receitas`
- `Simples Nacional = RECEITA CONSIDERADA × premissa`
- `DESPESA TOTAL = SOMA(linhas)` · `LUCRO = Receita − Despesa` · `MARGEM = Lucro ÷ Receita` · `PONTO DE EQUILÍBRIO = Despesa total`

Conta Pessoal 2026:
- `Renda = Pró-labore + Professor Davi (Financeiro 2026)`
- `SOBRA = Renda − Total despesas` · `TAXA DE POUPANÇA = Sobra ÷ Renda`

Financeiro 2027:
- `Receita base = Receita considerada 2026 × (1 + crescimento)`
- `Despesas = despesa equivalente de 2026 × (1 + inflação)`

Dashboard: acumulados de Janeiro até o mês corrente, ticket médio, pró-labore sobre
receita, receita projetada de 2027, carga semanal por professor, carteira por plano,
dias e horários mais concorridos, objetivos, ranking de atrasos, situação dos
pagamentos, inadimplentes, status da carteira e receita por forma de pagamento —
todos com o mesmo critério da aba oculta *Apoio Dashboard*.

Os valores foram conferidos um a um contra os resultados que o próprio Excel havia
calculado (55 verificações, todas idênticas, incluindo casas decimais).

---

## Dois pontos que precisam da sua atenção

**1. Receita base / projeção (Financeiro 2026).** Na planilha essa linha é preta
(editável), mas os meses de Agosto a Dezembro contêm a fórmula `=MÉDIA(B7:H7)`.
No sistema ela continua editável: os meses deixados em branco usam a média de
Janeiro a Julho (hoje R$ 12.803,60); digitar um valor sobrescreve, apagar devolve
o automático.

**2. Competência (aba Pagamentos).** Funciona como no Excel: a célula traz a fórmula
`=SE(Data=""; ""; DATA(ANO(Data); MÊS(Data); 1))` e um valor digitado a sobrescreve.
No sistema, quando o valor vem da fórmula ele aparece em **roxo**; ao digitar um
mês/ano, o campo fica preto — e apagar devolve o automático. É assim que se lançam
competências futuras (uma mensalidade de março/2027, por exemplo) sem precisar de
data de pagamento: o vencimento e a situação passam a ser calculados na hora,
enquanto a receita só entra no Financeiro quando a **Data do Pagamento** for
preenchida.

---

## Migração do sistema antigo (Notion) — 17/08/2026

O CSV exportado do Notion tinha **uma linha por aula**; o cadastro novo tem **uma
linha por aluno**. As 46 aulas foram consolidadas em 37 alunos, somando 39 com os
dois que já estavam no sistema.

Regras aplicadas:

| Coluna do CSV | Campo no sistema novo |
|---|---|
| Nomes | Nome (espaços normalizados) |
| sufixo do nome (`- USA`, `- Germany`, `- Suiça`) | País — o nome fica limpo |
| Data (dia da semana) | Dia(s) da Semana — os dias de todas as aulas do aluno, juntos |
| Horario | Horário — hora de início da primeira aula da semana |
| Planos | Plano |
| Professor | Professor (`Olivia Gomes`→`Olivia`, `Davi Cancelier`→`Davi`) |
| Objetivo da Aula | Objetivo (Travel→Viagem, Business→Empresarial, Read→Leitura, Speak→Falar, Grammar→Gramática, School→Escola) |
| Valores mes atual | Valor Mensal — mensalidade do aluno, contada **uma vez** por aluno |
| Valores mes seguinte | usado só quando o mês atual está vazio |
| Pago = Yes | Status = Ativo |

Definidos na migração por não existirem no CSV: **Data de Matrícula = 01/01/2026**
(sem ela o Dashboard não conta ninguém como ativo) e **Dia de Vencimento em branco**
(enquanto estiver vazio, os pagamentos ficam com situação "Sem vencimento").
Contato, Cidade e Estado também ficaram em branco.

Ignoradas por não terem campo correspondente: ID antigo da aula, Level, N
Apresentacao, Pag. Slide, Pré/Pós Pago, Remarcacao e Vezes por semana (esta última
foi usada só para conferir a contagem de dias).

Pontos que ficaram para conferência manual:

- **Alex Lopes** entrou como dois cadastros (Davi/Sexta e Olivia/Quarta), porque o
  sistema guarda um professor por aluno. Os dois somam R$ 600 na receita contratada.
- **Carlos Gabriel Boesh**: o CSV traz R$ 749,86 no mês atual e R$ 437,95 no seguinte;
  ficou com R$ 749,86. O CSV diz "1x semana" mas tem 2 aulas (Segunda e Quinta).
- **Igor Almeida** e **Carlos Gabriel Boesh** têm aulas em horários diferentes; ficou o
  horário da primeira aula da semana.
- **Gabrielli** não tinha horário no CSV.
- **Gleizi Wilt** ficou com Objetivo em branco: o valor original era "Word", que não
  existe na lista nova.
- **Maiara Mota** foi renomeada para **Mayara Mota** (grafia do CSV); o pagamento de
  R$ 400 vinculado a ela foi ajustado junto, para não perder o cálculo de vencimento.
- Objetivos com mais de um tema viraram um valor combinado ("Empresarial, Falar").
  Eles aparecem como categoria própria no painel de objetivos do Dashboard.

O backup de antes da migração está em `dados\backups` com o prefixo `pre-migracao_`.

---

## Migração das planilhas da Olivia (Notion) — 18/08/2026

Quatro planilhas ("Análise de alunos", "Remarcação dos alunos", "Aula experimental" e
"Horas") foram importadas para as sub-abas da tela da Olivia. Antes de rodar a
migração, **12 registros de Aulas já existiam** — você tinha digitado boa parte à mão.
O script casou cada linha da planilha com o que já estava na tela (por aluno vinculado
ou por nome + dia/horário) e só **acrescentou o que faltava**, sem duplicar nada; os 2
registros do Davi (Igor Almeida e Isis May, sem relação com essas planilhas) ficaram
intocados.

Resultado: **25 linhas em Aulas** (12 já existentes + 13 novas), **35 em Remarcações**,
**10 em Aula experimental** e **10 em Dados das Aulas** (essas três abas estavam vazias).

Pontos que pedem sua conferência:

- **Alex Lopes** aparece na planilha de Aulas da Olivia (Terça 11h), mas hoje ele só
  está cadastrado com o Davi. Mantive a linha avulsa na tela da Olivia — confirme se
  ele ainda faz aula com ela ou se é um resquício de uma grade antiga.
- **Sabrina Valgas** e **Luana (Influencer)** aparecem na planilha de Aulas mas não
  estão no Cadastro de alunos — entraram como linhas avulsas.
- **Gilmara Guimarães** (Aula experimental) não foi ligada à **Gilmara da Silva**
  (Cadastro) — os sobrenomes são diferentes e prefiro não arriscar unir duas pessoas
  que podem ser distintas. Se for a mesma pessoa, me avise.
- A coluna **Status** da planilha antiga de Aulas trazia valores como "Remarcação" e
  "Reservado" (um tipo de encontro, não um status de matrícula) — como o Status da
  tela agora é a mesma lista Ativo/Pausado/Inativo do Cadastro, preservei essa
  informação como nota em **Observação** ("Tipo (planilha antiga): …") em vez de
  forçá-la na lista nova.
- **Jessica Sales** tinha 3 linhas na planilha; a mais completa (Segunda, com
  progresso registrado) ficou vinculada ao Cadastro, e as outras duas (Terça e
  Quarta) foram somadas num único registro avulso multi-dia — mesmo padrão que já
  estava sendo usado para a **Yasmim Rocha** (Segunda, Quarta e Sexta mescladas).
- **Mayara Mota**: mantive a nota "Vai começar dia 19/08/2026" na Observação.
- Datas em português por extenso ("16 de julho de 2026") foram convertidas para
  o formato do sistema; valores em inglês (Yes/No, nas Remarcações) viraram Sim/Não.

O backup de antes desta migração está em `dados\backups` com o prefixo
`pre-migracao-olivia_`.

## Os gráficos do painel operacional

Cada painel usa a forma que corresponde ao trabalho que o leitor precisa fazer:

| Painel | Forma | Por quê |
|---|---|---|
| Carteira por plano | **rosca (pizza)** | composição de um todo, 3 fatias, com o total no centro |
| Situação dos pagamentos | **rosca (pizza)** | composição das cobranças, com cores de estado |
| Dias mais concorridos | **colunas** | categorias com ordem natural (segunda → domingo) |
| Horários mais concorridos | **colunas** | faixas em ordem (manhã → noite) |
| Objetivos, ranking de atrasos, inadimplentes, receita por forma | **barras horizontais** | ranking e nomes longos |
| Carga por professor, status da carteira | **barras horizontais** | poucos itens; uma rosca de 2 fatias não diz mais que uma barra |

Cores: os planos usam uma rampa roxa de um só tom (mais escuro = plano mais alto) e a
situação dos pagamentos usa a paleta de estado (verde em dia, âmbar pago com atraso,
vermelho em atraso, roxo a vencer), reservada só para isso. Cada tema tem os seus
passos próprios, e todas as paletas foram conferidas com o validador de contraste e
daltonismo — as legendas sempre mostram rótulo e valor, então nenhuma informação
depende só da cor.

## Observação sobre a base

A planilha original permanece intacta nesta pasta. O sistema não a lê nem a escreve
durante o uso — os dados foram importados uma vez para `dados\` e é lá que a operação
acontece a partir de agora.
