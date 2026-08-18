/**
 * Camada de acesso a dados — Supabase (Postgres) no lugar dos arquivos
 * dados/*.json. Mantém a MESMA forma de objeto (campos em camelCase) que o
 * resto do sistema (servidor.js, publico/app.js, publico/motor.js) sempre
 * usou, para não precisar mexer em nada além de quem lê/grava.
 *
 * Nenhuma credencial fica escrita aqui: vem só de variáveis de ambiente
 * (arquivo .env local, nunca versionado, ou variáveis do host em produção).
 */
const { createClient } = require('@supabase/supabase-js');

const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const CHAVE_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!URL_SUPABASE || !CHAVE_SUPABASE) {
  throw new Error(
    'Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
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
 * Este processo Node é a única instância rodando (arquitetura exige isso,
 * ver LEIA-ME) e o único escritor com essa chave — por isso um contador em
 * memória, incrementado a cada gravação, já é um jeito barato e correto de
 * o cliente saber "algo mudou, vale recarregar", sem round-trip ao banco
 * a cada consulta de /api/versao.
 */
let versaoContador = 0;
function bump() { versaoContador++; }
function versaoAtual() { return String(versaoContador); }

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

module.exports = {
  supabase, lerConjunto, gravarConjunto, versaoAtual, bump,
  buscarConta, gravarConta, contarContas,
};
