/**
 * Camada de acesso a dados — Supabase (Postgres) no lugar dos arquivos
 * dados/*.json. Mantém a MESMA forma de objeto (campos em camelCase) que o
 * resto do sistema (servidor.js, publico/app.js, publico/motor.js) sempre
 * usou, para não precisar mexer em nada além de quem lê/grava.
 *
 * Usa a chave "service_role" (não a publicável): as tabelas têm Row Level
 * Security ligada e sem nenhuma política para os papéis anon/authenticated
 * (ver deploy/schema-rls.sql) — só service_role, que ignora RLS por
 * definição, consegue ler ou gravar. Isso é o que faz a chave que o
 * servidor usa não servir pra nada se um dia vazar sozinha, sem o resto do
 * sistema: sem ela, ninguém entra no banco. Por isso é ainda mais crítico
 * que NUNCA vá para o navegador, para o git, ou para fora do servidor —
 * bem mais sensível que a antiga chave publicável.
 *
 * Nenhuma credencial fica escrita aqui: vem só de variáveis de ambiente
 * (arquivo .env local, nunca versionado, ou variáveis do host em produção).
 */
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_SUPABASE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_SUPABASE || !CHAVE_SUPABASE) {
  throw new Error(
    'Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ' +
    '(arquivo .env local, ou variável de ambiente do host em produção).'
  );
}

const supabase = createClient(URL_SUPABASE, CHAVE_SUPABASE, {
  auth: { persistSession: false }, // este processo nunca faz login de usuário no Supabase Auth
});

/** Conjuntos guardados como linhas de tabela — nome do conjunto → nome da tabela. */
const TABELAS = {
  alunos: 'alunos',
  pagamentos: 'pagamentos',
  aulas: 'aulas',
  remarcacoes: 'remarcacoes',
  dadosAulas: 'dados_aulas',
  experimentais: 'experimentais',
  bancoDados: 'banco_dados',
  contagemAulas: 'contagem_aulas',
};
/** Conjuntos guardados como um documento único (JSONB) na tabela "configuracoes". */
const DOCUMENTOS = ['opcoes', 'financeiro2026', 'contaPessoal2026', 'financeiro2027'];
/** Colunas técnicas que existem no banco mas não faziam parte do JSON original. */
const COLUNAS_TECNICAS = ['criado_em', 'atualizado_em'];

function paraSnake(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}
function paraCamel(s) {
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}
function linhaParaCamel(linha) {
  const saida = {};
  Object.keys(linha).forEach(k => {
    if (COLUNAS_TECNICAS.includes(k)) return;
    saida[paraCamel(k)] = linha[k];
  });
  return saida;
}
function linhaParaSnake(obj) {
  const saida = {};
  Object.keys(obj).forEach(k => { saida[paraSnake(k)] = obj[k] === undefined ? null : obj[k]; });
  return saida;
}

/**
 * Lê um conjunto inteiro (equivalente ao antigo `lerJson(ARQUIVOS[chave], padrao)`).
 * Documentos voltam como objeto; tabelas voltam como array, na mesma forma
 * (camelCase) que o resto do sistema espera.
 */
async function lerConjunto(chave, padrao) {
  if (DOCUMENTOS.includes(chave)) {
    const { data, error } = await supabase.from('configuracoes').select('valor').eq('chave', chave).maybeSingle();
    if (error) throw new Error('Falha ao ler "' + chave + '": ' + error.message);
    return data ? data.valor : padrao;
  }
  const tabela = TABELAS[chave];
  if (!tabela) throw new Error('Conjunto desconhecido: ' + chave);
  const { data, error } = await supabase.from(tabela).select('*');
  if (error) throw new Error('Falha ao ler "' + chave + '": ' + error.message);
  return (data || []).map(linhaParaCamel);
}

/**
 * Grava um conjunto inteiro (equivalente ao antigo `gravarJson`): o array/objeto
 * recebido passa a ser o estado completo daquele conjunto. Para tabelas, isso
 * significa apagar as linhas que saíram e fazer upsert das que continuam/entraram
 * — preserva o `id` e o `criado_em` originais de cada linha existente.
 */
async function gravarConjunto(chave, dados) {
  if (DOCUMENTOS.includes(chave)) {
    const { error } = await supabase.from('configuracoes')
      .upsert({ chave, valor: dados, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' });
    if (error) throw new Error('Falha ao gravar "' + chave + '": ' + error.message);
    bump();
    return;
  }

  const tabela = TABELAS[chave];
  if (!tabela) throw new Error('Conjunto desconhecido: ' + chave);
  const lista = Array.isArray(dados) ? dados : [];
  const linhas = lista.map(linhaParaSnake).map(l => ({ ...l, atualizado_em: new Date().toISOString() }));
  const ids = linhas.map(l => l.id).filter(id => id !== undefined && id !== null);

  // remove do banco o que não está mais no conjunto recebido (linhas excluídas)
  if (ids.length) {
    const lista_in = '(' + ids.map(id => JSON.stringify(String(id))).join(',') + ')';
    const { error: erroDelete } = await supabase.from(tabela).delete().not('id', 'in', lista_in);
    if (erroDelete) throw new Error('Falha ao limpar "' + chave + '": ' + erroDelete.message);
  } else {
    const { error: erroDelete } = await supabase.from(tabela).delete().not('id', 'is', null);
    if (erroDelete) throw new Error('Falha ao limpar "' + chave + '": ' + erroDelete.message);
  }

  if (linhas.length) {
    const { error: erroUpsert } = await supabase.from(tabela).upsert(linhas, { onConflict: 'id' });
    if (erroUpsert) throw new Error('Falha ao gravar "' + chave + '": ' + erroUpsert.message);
  }
  bump();
}

/* --------------------------------------------------- versão para polling */

/**
 * Carimbo barato de "algo mudou" para o cliente saber quando vale recarregar.
 * Fica numa tabela (não em memória do processo): numa função sem estado
 * (Vercel), cada requisição pode cair numa cópia "sem memória" nenhuma, então
 * um contador local não serviria de nada — precisa ser algo que todo mundo
 * (toda invocação, todo host) enxergue igual.
 */
async function bump() {
  const { error } = await supabase.from('metadados')
    .upsert({ chave: 'versao', atualizado_em: new Date().toISOString() }, { onConflict: 'chave' });
  if (error) console.error('Falha ao atualizar carimbo de versao:', error.message);
}
async function versaoAtual() {
  const { data, error } = await supabase.from('metadados').select('atualizado_em').eq('chave', 'versao').maybeSingle();
  if (error) throw new Error('Falha ao consultar versão: ' + error.message);
  return data ? data.atualizado_em : '0';
}

/* --------------------------------------------------------------- contas */

async function buscarConta(usuario) {
  const { data, error } = await supabase.from('usuarios').select('*')
    .eq('usuario', String(usuario || '').trim().toLowerCase()).maybeSingle();
  if (error) throw new Error('Falha ao consultar usuários: ' + error.message);
  return data;
}

async function gravarConta(conta) {
  const { error } = await supabase.from('usuarios').upsert(conta, { onConflict: 'usuario' });
  if (error) throw new Error('Falha ao gravar usuário: ' + error.message);
}

async function contarContas() {
  const { count, error } = await supabase.from('usuarios').select('*', { count: 'exact', head: true });
  if (error) throw new Error('Falha ao contar usuários: ' + error.message);
  return count || 0;
}

/* -------------------------------------------------------------- sessões
   Guardadas no banco (não em memória do processo): numa função sem estado
   (Vercel), cada requisição pode cair numa cópia nova, sem nenhuma memória
   das anteriores — se a sessão vivesse só num Map local, cada clique
   poderia "deslogar" a pessoa. Aqui, qualquer invocação, em qualquer host,
   enxerga a mesma sessão.                                                */

const DURACAO_SESSAO = 12 * 60 * 60 * 1000;

async function criarSessao(conta) {
  const token = crypto.randomBytes(24).toString('hex');
  const expira = new Date(Date.now() + DURACAO_SESSAO).toISOString();
  const { error } = await supabase.from('sessoes').insert({
    token, usuario: conta.usuario, nome: conta.nome, perfil: conta.perfil, professor: conta.professor, expira,
  });
  if (error) throw new Error('Falha ao criar sessão: ' + error.message);
  return token;
}

async function sessaoDoToken(token) {
  if (!token) return null;
  const { data, error } = await supabase.from('sessoes').select('*').eq('token', token).maybeSingle();
  if (error) throw new Error('Falha ao consultar sessão: ' + error.message);
  if (!data) return null;
  if (new Date(data.expira).getTime() < Date.now()) {
    supabase.from('sessoes').delete().eq('token', token).then(() => {}); // limpeza oportunista, não bloqueia a resposta
    return null;
  }
  return { token, usuario: data.usuario, nome: data.nome, perfil: data.perfil, professor: data.professor };
}

async function destruirSessao(token) {
  const { error } = await supabase.from('sessoes').delete().eq('token', token);
  if (error) throw new Error('Falha ao encerrar sessão: ' + error.message);
}

/* ------------------------------------------- trava de tentativas de login
   Mesma lógica de antes (10 tentativas erradas por IP em 5 minutos), só que
   guardada no banco pelo mesmo motivo das sessões: uma trava só em memória
   não vale nada numa função que reinicia do zero a cada requisição.       */

const JANELA_LOGIN = 5 * 60 * 1000;
const LIMITE_LOGIN = 10;

async function loginBloqueado(ip) {
  const { data, error } = await supabase.from('tentativas_login').select('*').eq('ip', ip).maybeSingle();
  if (error) throw new Error('Falha ao consultar tentativas de login: ' + error.message);
  if (!data) return false;
  if (new Date(data.expira).getTime() < Date.now()) return false;
  return data.contagem >= LIMITE_LOGIN;
}

async function registrarTentativaFalha(ip) {
  const { data } = await supabase.from('tentativas_login').select('*').eq('ip', ip).maybeSingle();
  const expirou = !data || new Date(data.expira).getTime() < Date.now();
  const registro = expirou
    ? { ip, contagem: 1, expira: new Date(Date.now() + JANELA_LOGIN).toISOString() }
    : { ip, contagem: data.contagem + 1, expira: data.expira };
  const { error } = await supabase.from('tentativas_login').upsert(registro, { onConflict: 'ip' });
  if (error) throw new Error('Falha ao registrar tentativa: ' + error.message);
}

async function limparTentativas(ip) {
  const { error } = await supabase.from('tentativas_login').delete().eq('ip', ip);
  if (error) throw new Error('Falha ao limpar tentativas: ' + error.message);
}

module.exports = {
  supabase, lerConjunto, gravarConjunto, versaoAtual, bump,
  buscarConta, gravarConta, contarContas,
  criarSessao, sessaoDoToken, destruirSessao, DURACAO_SESSAO,
  loginBloqueado, registrarTentativaFalha, limparTentativas,
};
