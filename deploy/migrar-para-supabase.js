/**
 * Migração única: lê os arquivos dados/*.json e grava tudo no Supabase,
 * usando a mesma camada (banco.js) que o servidor usa em produção — garante
 * que o formato gravado é exatamente o que o sistema espera ler depois.
 *
 * Idempotente: pode rodar mais de uma vez sem duplicar nada (upsert por id).
 * Não apaga nem altera os arquivos dados/*.json — eles continuam no disco
 * como backup histórico de antes da migração.
 *
 * Uso:  node deploy/migrar-para-supabase.js
 *
 * A saída é só um relatório técnico (contagens, ids duplicados, erros) —
 * nunca imprime nome, telefone, e-mail, senha ou valor de aluno/pagamento.
 */
require('../carregarEnv');
const fs = require('fs');
const path = require('path');
const banco = require('../banco');

const PASTA_DADOS = path.join(__dirname, '..', 'dados');

const CONJUNTOS_TABELA = {
  alunos: 'alunos.json',
  aulas: 'aulas.json',
  pagamentos: 'pagamentos.json',
  remarcacoes: 'remarcacoes.json',
  experimentais: 'experimentais.json',
  dadosAulas: 'dadosAulas.json',
  bancoDados: 'bancoDados.json',
  contagemAulas: 'contagemAulas.json',
};
const CONJUNTOS_DOCUMENTO = {
  opcoes: 'opcoes.json',
  financeiro2026: 'financeiro2026.json',
  contaPessoal2026: 'contaPessoal2026.json',
  financeiro2027: 'financeiro2027.json',
};

function lerJsonLocal(arquivo, padrao) {
  try { return JSON.parse(fs.readFileSync(path.join(PASTA_DADOS, arquivo), 'utf8')); }
  catch (e) { return padrao; }
}

async function migrarUsuarios(relatorio) {
  const lista = lerJsonLocal('usuarios.json', []);
  relatorio.usuarios = { encontrados: lista.length, migrados: 0, erros: 0 };
  for (const conta of lista) {
    try {
      // migra o hash/salt como estao — a senha original nunca e lida nem recalculada
      await banco.gravarConta(conta);
      relatorio.usuarios.migrados++;
    } catch (e) {
      relatorio.usuarios.erros++;
      console.error('Erro ao migrar uma conta de usuario:', e.message);
    }
  }
}

async function migrarConjuntoTabela(chave, arquivo, relatorio) {
  const lista = lerJsonLocal(arquivo, []);
  const ids = lista.map(x => x && x.id).filter(id => id !== undefined && id !== null);
  const idsUnicos = new Set(ids);
  const duplicados = ids.length - idsUnicos.size;

  relatorio[chave] = { encontrados: lista.length, migrados: 0, duplicidades: duplicados, erros: 0 };
  if (!lista.length) return;

  try {
    await banco.gravarConjunto(chave, lista);
    relatorio[chave].migrados = lista.length;
  } catch (e) {
    relatorio[chave].erros = lista.length;
    console.error('Erro ao migrar "' + chave + '":', e.message);
  }
}

async function migrarConjuntoDocumento(chave, arquivo, relatorio) {
  const conteudo = lerJsonLocal(arquivo, null);
  relatorio[chave] = { encontrado: conteudo !== null, migrado: false, erros: 0 };
  if (conteudo === null) return;
  try {
    await banco.gravarConjunto(chave, conteudo);
    relatorio[chave].migrado = true;
  } catch (e) {
    relatorio[chave].erros = 1;
    console.error('Erro ao migrar "' + chave + '":', e.message);
  }
}

(async () => {
  const relatorio = {};

  await migrarUsuarios(relatorio);
  for (const [chave, arquivo] of Object.entries(CONJUNTOS_TABELA)) {
    await migrarConjuntoTabela(chave, arquivo, relatorio);
  }
  for (const [chave, arquivo] of Object.entries(CONJUNTOS_DOCUMENTO)) {
    await migrarConjuntoDocumento(chave, arquivo, relatorio);
  }

  console.log('');
  console.log('=== Relatório de migração (sem dados pessoais) ===');
  console.log(JSON.stringify(relatorio, null, 2));

  const totalErros = Object.values(relatorio).reduce((s, r) => s + (r.erros || 0), 0);
  const totalDuplicidades = Object.values(relatorio).reduce((s, r) => s + (r.duplicidades || 0), 0);
  console.log('');
  console.log(totalErros === 0 ? 'Sem erros.' : ('ATENÇÃO: ' + totalErros + ' erro(s) — ver mensagens acima.'));
  console.log(totalDuplicidades === 0 ? 'Sem duplicidades de id.' : ('ATENÇÃO: ' + totalDuplicidades + ' id(s) duplicado(s) no arquivo de origem.'));
  process.exit(totalErros === 0 ? 0 : 1);
})();
