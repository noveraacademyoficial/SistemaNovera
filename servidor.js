/**
 * Sistema Financeiro - Novera Academy
 * Servidor local sem dependencias externas (apenas Node.js).
 * Todos os dados sao lidos e gravados em ./dados/*.json
 *
 * Acesso: a separacao entre a gestao financeira e as telas dos professores e
 * feita AQUI, no servidor. O navegador nunca recebe o que o perfil nao pode ver.
 * E um controle de acesso local, para uso na propria maquina — nao substitui
 * as protecoes necessarias caso o sistema seja publicado na internet.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = __dirname;
const PASTA_DADOS = path.join(RAIZ, 'dados');
const PASTA_PUBLICO = path.join(RAIZ, 'publico');
const PASTA_BACKUP = path.join(PASTA_DADOS, 'backups');
const PORTA = Number(process.env.PORTA) || 3300;

const ARQUIVOS = {
  opcoes: 'opcoes.json',
  alunos: 'alunos.json',
  pagamentos: 'pagamentos.json',
  financeiro2026: 'financeiro2026.json',
  contaPessoal2026: 'contaPessoal2026.json',
  financeiro2027: 'financeiro2027.json',
  aulas: 'aulas.json',
  remarcacoes: 'remarcacoes.json',
  dadosAulas: 'dadosAulas.json',
  experimentais: 'experimentais.json',
  bancoDados: 'bancoDados.json',
  contagemAulas: 'contagemAulas.json',
};

/** Conjuntos que um professor enxerga. O resto nem sai do servidor. */
const CONJUNTOS_DO_PROFESSOR = ['opcoes', 'alunos', 'aulas', 'remarcacoes', 'dadosAulas', 'experimentais', 'bancoDados', 'contagemAulas'];
/** Conjuntos por professor: cada linha tem um campo `professor`. Usado para filtrar a leitura de todos eles. */
const CONJUNTOS_POR_PROFESSOR = ['aulas', 'remarcacoes', 'dadosAulas', 'experimentais', 'bancoDados', 'contagemAulas'];
/**
 * `contagemAulas` fica de fora daqui de propósito: é o total mensal de aulas
 * da Olivia, e só pode ser alterado com a senha do Davi (endpoint próprio,
 * /api/contagem-aulas) — a sessão da Olivia sozinha nunca grava nele, mesmo
 * sendo um conjunto "dela" para fins de leitura.
 */
const CONJUNTOS_GRAVAVEIS_PELO_PROFESSOR = ['aulas', 'remarcacoes', 'dadosAulas', 'experimentais', 'bancoDados'];
/** Campos do aluno que o professor nao recebe. */
const CAMPOS_OCULTOS_DO_ALUNO = ['valorMensal', 'diaVencimento'];

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

fs.mkdirSync(PASTA_DADOS, { recursive: true });
fs.mkdirSync(PASTA_BACKUP, { recursive: true });

/* ------------------------------------------------------------------ dados */

function lerJson(arquivo, padrao) {
  try { return JSON.parse(fs.readFileSync(path.join(PASTA_DADOS, arquivo), 'utf8')); }
  catch (e) { return padrao; }
}

function gravarJson(arquivo, dados) {
  const alvo = path.join(PASTA_DADOS, arquivo);
  if (fs.existsSync(alvo)) {
    const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(alvo, path.join(PASTA_BACKUP, carimbo + '_' + arquivo));
  }
  const temporario = alvo + '.tmp';
  fs.writeFileSync(temporario, JSON.stringify(dados, null, 2), 'utf8');
  fs.renameSync(temporario, alvo);
  limparBackups();
}

function limparBackups() {
  try {
    const itens = fs.readdirSync(PASTA_BACKUP).sort();
    for (let i = 0; i < itens.length - 200; i++) fs.unlinkSync(path.join(PASTA_BACKUP, itens[i]));
  } catch (e) { /* backup nunca derruba o servidor */ }
}

/* ------------------------------------------------------------- sessoes */

const sessoes = new Map();   // token -> { usuario, expira }
const DURACAO_SESSAO = 12 * 60 * 60 * 1000;

function autenticar(usuario, senha) {
  const conta = lerJson('usuarios.json', []).find(u => u.usuario === String(usuario || '').trim().toLowerCase());
  if (!conta) return null;
  let calculado;
  try { calculado = crypto.scryptSync(String(senha || ''), conta.salt, 64).toString('hex'); }
  catch (e) { return null; }
  const a = Buffer.from(calculado, 'hex');
  const b = Buffer.from(conta.hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { usuario: conta.usuario, nome: conta.nome, perfil: conta.perfil, professor: conta.professor };
}

function criarSessao(conta) {
  const token = crypto.randomBytes(24).toString('hex');
  sessoes.set(token, { conta, expira: Date.now() + DURACAO_SESSAO });
  return token;
}

function sessaoDe(req) {
  const bruto = req.headers.cookie || '';
  const par = bruto.split(';').map(s => s.trim()).find(s => s.startsWith('novera_sessao='));
  if (!par) return null;
  const token = par.slice('novera_sessao='.length);
  const sessao = sessoes.get(token);
  if (!sessao) return null;
  if (sessao.expira < Date.now()) { sessoes.delete(token); return null; }
  return { token, ...sessao.conta };
}

/* --------------------------------------------------- recorte por perfil */

const ehAdmin = conta => conta && conta.perfil === 'admin';

/** O pacote de dados que este perfil pode receber. */
function pacoteVisivel(conta) {
  const pacote = {};
  const chaves = ehAdmin(conta) ? Object.keys(ARQUIVOS) : CONJUNTOS_DO_PROFESSOR;

  chaves.forEach(chave => {
    let dados = lerJson(ARQUIVOS[chave], null);
    if (!ehAdmin(conta) && Array.isArray(dados)) {
      if (chave === 'alunos') {
        dados = dados
          .filter(a => String(a.professor || '') === conta.professor)
          .map(a => { const copia = { ...a }; CAMPOS_OCULTOS_DO_ALUNO.forEach(c => delete copia[c]); return copia; });
      } else if (CONJUNTOS_POR_PROFESSOR.includes(chave)) {
        dados = dados.filter(x => String(x.professor || '') === conta.professor);
      }
    }
    pacote[chave] = dados;
  });
  return pacote;
}

/** O professor so grava as proprias linhas; as dos outros ficam intactas. */
function podeGravar(conta, chave) {
  if (ehAdmin(conta)) return true;
  return CONJUNTOS_GRAVAVEIS_PELO_PROFESSOR.includes(chave);
}

function mesclarDoProfessor(conta, chave, recebido) {
  const atual = lerJson(ARQUIVOS[chave], []);
  if (!Array.isArray(atual) || !Array.isArray(recebido)) return recebido;
  const deOutros = atual.filter(x => String(x.professor || '') !== conta.professor);
  const meus = recebido.map(x => ({ ...x, professor: conta.professor }));   // professor sempre carimbado
  return [...deOutros, ...meus];
}

/* ---------------------------------------------------------------- http */

function responderJson(res, status, corpo, cabecalhosExtras) {
  const texto = JSON.stringify(corpo);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(texto),
  }, cabecalhosExtras || {}));
  res.end(texto);
}

function servirArquivo(res, alvo) {
  fs.readFile(alvo, (erro, conteudo) => {
    if (erro) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Arquivo nao encontrado'); return; }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(conteudo);
  });
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let bruto = '';
    req.on('data', p => { bruto += p; if (bruto.length > 20e6) { req.destroy(); reject(new Error('Corpo muito grande')); } });
    req.on('end', () => { try { resolve(bruto ? JSON.parse(bruto) : null); } catch (e) { reject(new Error('JSON invalido')); } });
    req.on('error', reject);
  });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const rota = decodeURIComponent(url.pathname);

  try {
    /* ---------------- sessao ---------------- */
    if (rota === '/api/entrar' && req.method === 'POST') {
      const corpo = await lerCorpo(req) || {};
      const conta = autenticar(corpo.usuario, corpo.senha);
      if (!conta) return responderJson(res, 401, { erro: 'Usuário ou senha inválidos.' });
      const token = criarSessao(conta);
      return responderJson(res, 200, { ok: true, conta }, {
        'Set-Cookie': `novera_sessao=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${DURACAO_SESSAO / 1000}`,
      });
    }

    if (rota === '/api/sair' && req.method === 'POST') {
      const sessao = sessaoDe(req);
      if (sessao) sessoes.delete(sessao.token);
      return responderJson(res, 200, { ok: true }, {
        'Set-Cookie': 'novera_sessao=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
      });
    }

    if (rota === '/api/sessao' && req.method === 'GET') {
      const sessao = sessaoDe(req);
      if (!sessao) return responderJson(res, 401, { erro: 'Sem sessão' });
      const { token, ...conta } = sessao;
      return responderJson(res, 200, { conta });
    }

    /* ---------------- dados (exigem sessao) ---------------- */
    if (rota.startsWith('/api/')) {
      const conta = sessaoDe(req);
      if (!conta) return responderJson(res, 401, { erro: 'Faça login para continuar.' });

      // carimbo barato: muda sempre que algum arquivo de dados e gravado.
      // O cliente consulta de tempos em tempos e so recarrega quando muda.
      if (rota === '/api/versao' && req.method === 'GET') {
        const carimbo = Object.values(ARQUIVOS).map(arquivo => {
          try { return fs.statSync(path.join(PASTA_DADOS, arquivo)).mtimeMs; }
          catch (e) { return 0; }
        }).join('-');
        return responderJson(res, 200, { versao: carimbo });
      }

      if (rota === '/api/dados' && req.method === 'GET') {
        return responderJson(res, 200, { conta: { usuario: conta.usuario, nome: conta.nome, perfil: conta.perfil, professor: conta.professor }, ...pacoteVisivel(conta) });
      }

      /**
       * Grava a contagem manual de "aulas do mês" — sempre exige usuário e
       * senha de uma conta admin (o Davi) confirmados de novo, mesmo que quem
       * esteja chamando já esteja logado como Davi. Não troca a sessao ativa:
       * quem esta logado continua logado como estava; a senha e conferida a
       * cada chamada, nunca fica "destravada" para as proximas edicoes.
       */
      if (rota === '/api/contagem-aulas' && req.method === 'POST') {
        const corpo = await lerCorpo(req) || {};
        const ano = Number(corpo.ano);
        const mes = Number(corpo.mes);
        const valor = Number(corpo.valor);
        if (!ano || !mes || mes < 1 || mes > 12 || !Number.isFinite(valor) || valor < 0) {
          return responderJson(res, 400, { erro: 'Informe ano, mês (1-12) e um valor válido.' });
        }

        const confirmacao = autenticar(corpo.usuarioConfirmacao, corpo.senhaConfirmacao);
        if (!confirmacao || confirmacao.perfil !== 'admin') {
          return responderJson(res, 401, { erro: 'Usuário ou senha do Davi inválidos.' });
        }
        // quem não é admin só altera a própria contagem, mesmo com a senha do Davi em mãos
        const professorAlvo = ehAdmin(conta) ? (corpo.professor || conta.professor) : conta.professor;

        const lista = lerJson(ARQUIVOS.contagemAulas, []);
        const i = lista.findIndex(x => x.professor === professorAlvo && Number(x.ano) === ano && Number(x.mes) === mes);
        // ajuste manual = tratado como um total "normal" fresco; zera o destaque de remarcação
        const registro = { id: i >= 0 ? lista[i].id : ('ca_' + Date.now().toString(36)), professor: professorAlvo, ano, mes, valor, remarcacao: 0 };
        if (i >= 0) lista[i] = registro; else lista.push(registro);
        gravarJson(ARQUIVOS.contagemAulas, lista);
        return responderJson(res, 200, { ok: true, registro });
      }

      /**
       * Soma ou subtrai 1 da contagem do MÊS ATUAL — chamado sozinho quando o
       * professor marca/desmarca "Aula feita" numa linha de Aulas (origem
       * "normal") ou "Aula feita" (chave "ativa") numa linha de Remarcações
       * (origem "remarcacao").
       * Diferente do endpoint acima, este NÃO pede a senha do Davi: é só o
       * reflexo automático de uma edição que o próprio professor já tem
       * permissão de fazer. Cada professor só ajusta a própria contagem — o
       * valor nunca fica negativo. `remarcacao` guarda separadamente quanto do
       * total veio de remarcação, para o gráfico mostrar a origem.
       */
      if (rota === '/api/contagem-aulas/incrementar' && req.method === 'POST') {
        const corpo = await lerCorpo(req) || {};
        const delta = Number(corpo.delta);
        if (delta !== 1 && delta !== -1) return responderJson(res, 400, { erro: 'delta precisa ser 1 ou -1.' });
        const origem = corpo.origem === 'remarcacao' ? 'remarcacao' : 'normal';

        const professorAlvo = ehAdmin(conta) && corpo.professor ? corpo.professor : conta.professor;
        const agora = new Date();
        const ano = agora.getUTCFullYear();
        const mes = agora.getUTCMonth() + 1;

        const lista = lerJson(ARQUIVOS.contagemAulas, []);
        const i = lista.findIndex(x => x.professor === professorAlvo && Number(x.ano) === ano && Number(x.mes) === mes);
        const anterior = i >= 0 ? lista[i] : null;
        const valorAtual = anterior ? Number(anterior.valor) || 0 : 0;
        const remarcacaoAtual = anterior ? Number(anterior.remarcacao) || 0 : 0;
        const novoValor = Math.max(0, valorAtual + delta);
        const novaRemarcacao = origem === 'remarcacao' ? Math.max(0, Math.min(novoValor, remarcacaoAtual + delta)) : Math.min(novoValor, remarcacaoAtual);
        const registro = { id: anterior ? anterior.id : ('ca_' + Date.now().toString(36)), professor: professorAlvo, ano, mes, valor: novoValor, remarcacao: novaRemarcacao };
        if (i >= 0) lista[i] = registro; else lista.push(registro);
        gravarJson(ARQUIVOS.contagemAulas, lista);
        return responderJson(res, 200, { ok: true, registro });
      }

      if (rota.startsWith('/api/dados/') && req.method === 'PUT') {
        const chave = rota.replace('/api/dados/', '');
        if (!ARQUIVOS[chave]) return responderJson(res, 404, { erro: 'Conjunto desconhecido: ' + chave });
        if (!podeGravar(conta, chave)) return responderJson(res, 403, { erro: 'Seu acesso não permite alterar este conjunto.' });
        const corpo = await lerCorpo(req);
        if (corpo === null || corpo === undefined) return responderJson(res, 400, { erro: 'Corpo vazio' });
        const final = ehAdmin(conta) ? corpo : mesclarDoProfessor(conta, chave, corpo);
        gravarJson(ARQUIVOS[chave], final);
        return responderJson(res, 200, { ok: true });
      }

      return responderJson(res, 404, { erro: 'Rota não encontrada' });
    }

    /* ---------------- estatico ---------------- */
    const alvo = rota === '/' ? '/index.html' : rota;
    const caminho = path.join(PASTA_PUBLICO, path.normalize(alvo).replace(/^(\.\.[/\\])+/, ''));
    if (!caminho.startsWith(PASTA_PUBLICO)) { res.writeHead(403); res.end('Acesso negado'); return; }
    return servirArquivo(res, caminho);
  } catch (erro) {
    return responderJson(res, 500, { erro: String(erro && erro.message || erro) });
  }
});

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log('');
  console.log('  Sistema Financeiro | Novera Academy');
  console.log('  ------------------------------------------------');
  console.log('  Abra no navegador:  http://localhost:' + PORTA);
  console.log('  Dados salvos em:    ' + PASTA_DADOS);
  console.log('  Para encerrar:      Ctrl + C');
  console.log('');
});
