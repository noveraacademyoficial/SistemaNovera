/* ============================================================================
   INTERFACE DO SISTEMA
   Regra de edicao herdada da planilha:
     - LINHAS/CAMPOS PRETOS  -> editaveis, com inclusao e exclusao
     - LINHAS/CAMPOS COLORIDOS (azul de formula, cabecalhos, totais) -> bloqueados
   ========================================================================== */

const estado = {
  dados: null,
  calc: null,
  cidades: [],
  aba: 'dashboard',
  busca: '',
  pendentes: new Set(),
  relatorio: { tipo: 'lancamentos', filtros: { ...FILTROS_PADRAO }, expandido: '' },
  conta: null,
  subaba: 'aulas',
  diaFiltro: '',
  mesFiltroProfessor: '',
  diaFiltroRemarcacao: '',
  mostrarRemovidos: false,
  gruposAbertos: [],   // por padrão, os grupos do menu vêm todos fechados
  menuRecolhido: false,
  versaoDados: '',
  dashboardProfessorAulas: 'Olivia',
};

const ABAS_PROFESSOR = [
  { id: 'profDavi', professor: 'Davi', ico: '📘', nome: 'Prof. Davi', titulo: 'Professor Davi', sub: 'Aulas, remarcações e dados das aulas dos alunos do Davi.' },
  { id: 'profOlivia', professor: 'Olivia', ico: '📗', nome: 'Profa. Olivia', titulo: 'Professora Olivia', sub: 'Aulas, remarcações, aulas experimentais e dados das aulas da Olivia.' },
];

const ABAS = [
  { id: 'dashboard', ico: '📊', nome: 'Visão geral', titulo: 'Dashboard', sub: 'Visão integrada de receitas, despesas, resultado, alunos e projeções financeiras.' },
  { id: 'alunos', ico: '🎓', nome: 'Cadastro de alunos', titulo: 'Alunos', sub: 'Uma linha por aluno. Informe também o dia preferencial de vencimento (1 a 31) para acompanhar pontualidade.' },
  { id: 'pagamentos', ico: '💵', nome: 'Pagamentos', titulo: 'Pagamentos', sub: 'Rotina: confira o comprovante, registre a data real, selecione o tipo e guarde a referência usada para localizar o arquivo.' },
  { id: 'fin2026', ico: '🏫', nome: 'Financeiro 2026', titulo: 'Financeiro 2026', sub: 'Recebimentos vêm de Pagamentos; quando não há lançamentos, a base histórica mantém o planejamento.' },
  { id: 'contaPessoal', ico: '👤', nome: 'Conta Pessoal 2026', titulo: 'Conta pessoal', sub: 'O salário é o pró-labore da escola; acompanhe sobra mensal e taxa de poupança.' },
  { id: 'fin2027', ico: '📈', nome: 'Financeiro 2027', titulo: 'Financeiro 2027', sub: 'Projeção sobre 2026 usando as premissas de crescimento de receita e inflação de custos.' },
  { id: 'relatorios', ico: '📋', nome: 'Relatórios', titulo: 'Relatórios', sub: 'Filtre por período, ano, aluno, professor, situação e valor — e acompanhe quem atrasa.' },
  ...ABAS_PROFESSOR,
  { id: 'listas', ico: '⚙️', nome: 'Listas e opções', titulo: 'Listas de seleção', sub: 'Edite ou acrescente opções; as caixas de seleção do sistema são atualizadas automaticamente.' },
];

/** Abas que este perfil pode abrir. Professor só enxerga a própria tela. */
function abasPermitidas() {
  const conta = estado.conta;
  if (!conta) return [];
  if (conta.perfil === 'admin') return ABAS;
  return ABAS_PROFESSOR.filter(a => a.professor === conta.professor);
}

/** O menu é dividido em Financeiro e Professores. */
const GRUPOS_MENU = [
  { id: 'financeiro', rotulo: 'Financeiro', ico: '💼' },
  { id: 'professores', rotulo: 'Professores', ico: '🎓' },
];
const grupoDaAba = aba => (aba.professor ? 'professores' : 'financeiro');

function gruposVisiveis() {
  const permitidas = abasPermitidas();
  return GRUPOS_MENU
    .map(g => ({ ...g, abas: permitidas.filter(a => grupoDaAba(a) === g.id) }))
    .filter(g => g.abas.length);
}

/* ------------------------------------------------------------------- apoio */

const $ = sel => document.querySelector(sel);
const esc = v => String(v === null || v === undefined ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parseNumero(texto) {
  if (texto === null || texto === undefined) return null;
  let t = String(texto).trim().replace(/[R$\s]/g, '');
  if (!t) return null;
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}
function paraEntrada(v) {
  if (v === null || v === undefined || v === '') return '';
  return String(v).replace('.', ',');
}
function classeSinal(v) { return v < 0 ? 'negativo' : (v > 0 ? 'positivo' : 'calc'); }
function novoId(prefixo) { return prefixo + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
/** minúsculas e sem acento, para a busca aceitar "tubarao" e "Tubarão" */
function semAcento(texto) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/* ------------------------------------------------------------------ tema */

function temaAtual() {
  return document.documentElement.getAttribute('data-tema') === 'escuro' ? 'escuro' : 'claro';
}
function aplicarTema(tema) {
  document.documentElement.setAttribute('data-tema', tema);
  try { localStorage.setItem('novera-tema', tema); } catch (e) { /* sem persistência */ }
  const escuro = tema === 'escuro';
  $('#iconeTema').textContent = escuro ? '☀️' : '🌙';
  $('#rotuloTema').textContent = escuro ? 'Modo claro' : 'Modo escuro';
  $('#tema').title = escuro ? 'Voltar ao tema claro' : 'Mudar para o tema escuro';
}
function alternarTema() {
  aplicarTema(temaAtual() === 'escuro' ? 'claro' : 'escuro');
}

/* ------------------------------------------------------------ menu lateral */

function menuRecolhidoAtual() {
  return document.documentElement.getAttribute('data-menu') === 'recolhido';
}
function aplicarMenuRecolhido(recolhido) {
  if (recolhido) document.documentElement.setAttribute('data-menu', 'recolhido');
  else document.documentElement.removeAttribute('data-menu');
  try { localStorage.setItem('novera-menu-recolhido', recolhido ? '1' : '0'); } catch (e) { /* sem persistência */ }
  const botao = $('#recolherMenu');
  if (botao) {
    botao.textContent = recolhido ? '»' : '«';
    botao.title = recolhido ? 'Expandir o menu lateral' : 'Recolher o menu lateral';
  }
}
function alternarMenuRecolhido() {
  aplicarMenuRecolhido(!menuRecolhidoAtual());
}

/* --------------------------------------------------- janela de confirmação
   Substitui confirm()/alert() do navegador por um pop-up dentro do sistema. */

let fecharJanela = null;

function abrirJanela({ titulo, texto, icone = '🗑️', rotuloConfirmar = 'Excluir',
                       rotuloCancelar = 'Cancelar', perigo = true, somenteAviso = false }) {
  return new Promise(resolve => {
    const fundo = document.createElement('div');
    fundo.className = 'janela-fundo';
    fundo.innerHTML = `
      <div class="janela" role="dialog" aria-modal="true" aria-labelledby="janelaTitulo">
        <div class="janela-icone ${perigo ? 'perigo' : ''}">${icone}</div>
        <h3 id="janelaTitulo">${esc(titulo)}</h3>
        <p>${texto}</p>
        <div class="janela-acoes">
          ${somenteAviso ? '' : `<button class="botao claro" data-janela="cancelar">${esc(rotuloCancelar)}</button>`}
          <button class="botao ${perigo ? 'excluir' : ''}" data-janela="confirmar">${esc(somenteAviso ? 'Entendi' : rotuloConfirmar)}</button>
        </div>
      </div>`;
    document.body.appendChild(fundo);
    requestAnimationFrame(() => fundo.classList.add('visivel'));

    const encerrar = valor => {
      document.removeEventListener('keydown', aoTeclar);
      fundo.classList.remove('visivel');
      setTimeout(() => fundo.remove(), 180);
      fecharJanela = null;
      resolve(valor);
    };
    const aoTeclar = ev => {
      if (ev.key === 'Escape') encerrar(false);
      if (ev.key === 'Enter') encerrar(true);
    };

    fundo.addEventListener('click', ev => {
      if (ev.target === fundo) return encerrar(false);
      const b = ev.target.closest('[data-janela]');
      if (b) encerrar(b.dataset.janela === 'confirmar');
    });
    document.addEventListener('keydown', aoTeclar);
    fecharJanela = () => encerrar(false);

    const foco = fundo.querySelector(somenteAviso ? '[data-janela="confirmar"]' : '[data-janela="cancelar"]');
    if (foco) foco.focus();
  });
}

const confirmarExclusao = (titulo, texto) => abrirJanela({ titulo, texto });
const avisarUsuario = (titulo, texto) =>
  abrirJanela({ titulo, texto, icone: '⚠️', perigo: false, somenteAviso: true });

/**
 * Janela com campos de formulário (não só texto). Usada para editar a
 * contagem mensal de aulas: pede o valor e, quando quem está logado não é
 * admin, também pede usuário e senha do Davi para confirmar a alteração.
 *
 * `aoConfirmar(dadosDoFormulario)`, se informado, roda antes de fechar: se ele
 * lançar um erro (ex.: senha errada), a mensagem aparece dentro da própria
 * janela e ela continua aberta para tentar de novo — só fecha quando
 * `aoConfirmar` termina sem erro (ou quando não há `aoConfirmar`).
 * Devolve os valores do formulário, ou null se cancelado.
 */
function abrirJanelaFormulario({ titulo, icone = '✎', camposHtml, rotuloConfirmar = 'Salvar', aoConfirmar }) {
  return new Promise(resolve => {
    const fundo = document.createElement('div');
    fundo.className = 'janela-fundo';
    fundo.innerHTML = `
      <div class="janela" role="dialog" aria-modal="true" aria-labelledby="janelaFormTitulo">
        <div class="janela-icone">${icone}</div>
        <h3 id="janelaFormTitulo">${esc(titulo)}</h3>
        <form class="janela-formulario">${camposHtml}</form>
        <p class="erro-login" id="erroJanelaForm" hidden></p>
        <div class="janela-acoes">
          <button type="button" class="botao claro" data-janela="cancelar">Cancelar</button>
          <button type="button" class="botao" data-janela="confirmar">${esc(rotuloConfirmar)}</button>
        </div>
      </div>`;
    document.body.appendChild(fundo);
    requestAnimationFrame(() => fundo.classList.add('visivel'));

    const form = fundo.querySelector('.janela-formulario');
    const elErro = fundo.querySelector('#erroJanelaForm');
    const botaoConfirmar = fundo.querySelector('[data-janela="confirmar"]');

    const coletar = () => {
      const dados = {};
      form.querySelectorAll('[name]').forEach(c => { dados[c.name] = c.value; });
      return dados;
    };
    const encerrar = valor => {
      document.removeEventListener('keydown', aoTeclar);
      fundo.classList.remove('visivel');
      setTimeout(() => fundo.remove(), 180);
      fecharJanela = null;
      resolve(valor);
    };
    const confirmar = async () => {
      const dados = coletar();
      if (!aoConfirmar) return encerrar(dados);
      botaoConfirmar.disabled = true;
      elErro.hidden = true;
      try {
        await aoConfirmar(dados);
        encerrar(dados);
      } catch (erro) {
        elErro.textContent = erro.message || 'Não foi possível confirmar.';
        elErro.hidden = false;
        botaoConfirmar.disabled = false;
      }
    };
    const aoTeclar = ev => { if (ev.key === 'Escape') encerrar(null); };

    fundo.addEventListener('click', ev => {
      if (ev.target === fundo) return encerrar(null);
      const b = ev.target.closest('[data-janela]');
      if (!b) return;
      if (b.dataset.janela === 'cancelar') encerrar(null); else confirmar();
    });
    form.addEventListener('submit', ev => { ev.preventDefault(); confirmar(); });
    document.addEventListener('keydown', aoTeclar);
    fecharJanela = () => encerrar(null);

    const foco = form.querySelector('input');
    if (foco) foco.focus();
  });
}

function aviso(texto, erro) {
  const el = $('#aviso');
  el.textContent = texto;
  el.classList.toggle('erro', !!erro);
  el.classList.add('visivel');
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => el.classList.remove('visivel'), 2200);
}

/* ---------------------------------------------------------- carga e gravacao */

async function carregar() {
  const [resposta, cidades] = await Promise.all([
    fetch('/api/dados'),
    fetch('cidades.json').then(r => r.json()).catch(() => []),
  ]);
  if (resposta.status === 401) { const e = new Error('sem sessão'); e.semSessao = true; throw e; }
  if (!resposta.ok) throw new Error('Falha ao ler os dados');
  estado.dados = await resposta.json();
  estado.conta = estado.dados.conta || null;
  // o professor não recebe os conjuntos financeiros; o motor precisa de bases vazias
  estado.dados.pagamentos = estado.dados.pagamentos || [];
  estado.dados.financeiro2026 = estado.dados.financeiro2026 || { ano: 2026, premissas: {}, receitaBase: [], outrasReceitas: [], despesas: [] };
  estado.dados.contaPessoal2026 = estado.dados.contaPessoal2026 || { ano: 2026, rendaOrigem: [], despesas: [] };
  estado.dados.financeiro2027 = estado.dados.financeiro2027 || { ano: 2027, premissas: {}, outrasReceitas: [] };
  ['aulas', 'remarcacoes', 'dadosAulas', 'experimentais', 'bancoDados', 'contagemAulas'].forEach(c => { estado.dados[c] = estado.dados[c] || []; });

  const permitidas = abasPermitidas();
  if (!permitidas.some(a => a.id === estado.aba)) estado.aba = (permitidas[0] || {}).id || 'dashboard';
  // [["Tubarão","SC"], …] -> opções do seletor de cidade
  estado.cidades = cidades.map(([nome, uf]) => ({
    valor: nome + '|' + uf,
    rotulo: nome,
    extra: uf,
    busca: semAcento(nome + ' ' + uf),
  }));
  recalcular();
}

function recalcular() {
  estado.calc = calcularTudo(estado.dados, hojeISO());
}

let temporizador = null;
function agendarGravacao(chave) {
  estado.pendentes.add(chave);
  clearTimeout(temporizador);
  temporizador = setTimeout(gravar, 450);
}

async function gravar() {
  const chaves = [...estado.pendentes];
  estado.pendentes.clear();
  if (!chaves.length) return;
  try {
    for (const chave of chaves) {
      const r = await fetch('/api/dados/' + chave, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(estado.dados[chave]),
      });
      if (!r.ok) throw new Error((await r.json()).erro || 'erro');
    }
    aviso('Salvo na pasta Sistema Financeiro');
  } catch (e) {
    aviso('Não foi possível salvar: ' + e.message, true);
  }
}

/** Altera um dado, recalcula tudo e regrava o arquivo correspondente. */
function alterar(chave, mutacao, redesenhar = true) {
  mutacao(estado.dados[chave]);
  recalcular();
  agendarGravacao(chave);
  if (redesenhar) desenhar();
}

/* ------------------------------------------------------------ componentes */

/* ---------------------------------------------------------------- seletor
   Campo com lupa: abre uma lista pesquisável (cidades) ou de marcação
   múltipla (dias da semana), posicionada junto ao botão que a chamou.      */

let seletorAberto = null;

function fecharSeletor() {
  if (!seletorAberto) return;
  const { elemento, aoTeclar, aoFechar } = seletorAberto;
  elemento.remove();
  document.removeEventListener('keydown', aoTeclar, true);
  seletorAberto = null;
  if (aoFechar) aoFechar();
}

function abrirSeletor(gatilho, config) {
  fecharSeletor();
  const multiplo = !!config.multiplo;
  const selecionados = new Set(config.selecionados || []);

  const caixa = document.createElement('div');
  caixa.className = 'seletor';
  caixa.innerHTML = `
    <div class="seletor-topo">
      <span class="seletor-lupa">🔍</span>
      <input class="seletor-busca" placeholder="${esc(config.textoBusca || 'Pesquisar…')}" autocomplete="off">
    </div>
    <div class="seletor-lista"></div>
    ${multiplo ? '<div class="seletor-rodape"><button class="botao mini" data-seletor="pronto">Pronto</button><button class="botao claro mini" data-seletor="limpar">Limpar</button></div>' : ''}`;
  document.body.appendChild(caixa);

  const campoBusca = caixa.querySelector('.seletor-busca');
  const lista = caixa.querySelector('.seletor-lista');

  const desenharLista = () => {
    const termo = semAcento(campoBusca.value.trim());
    // quem começa com o termo aparece primeiro ("tuba" -> Tubarão antes de Abaetetuba)
    const achados = termo
      ? config.opcoes
          .filter(o => o.busca.includes(termo))
          .map(o => ({ o, peso: o.busca.startsWith(termo) ? 0 : 1 }))
          .sort((a, b) => a.peso - b.peso)
          .map(x => x.o)
      : config.opcoes;
    const limite = achados.slice(0, config.limite || 200);

    if (!limite.length) {
      lista.innerHTML = termo
        ? `<button class="seletor-item novo" data-valor="${esc(campoBusca.value.trim())}">
             <span>Usar “<strong>${esc(campoBusca.value.trim())}</strong>”</span>
             <span class="seletor-extra">não está na lista</span>
           </button>`
        : '<p class="seletor-vazio">Nada encontrado.</p>';
      return;
    }
    lista.innerHTML = limite.map(o => `
      <button class="seletor-item ${selecionados.has(o.valor) ? 'marcado' : ''}" data-valor="${esc(o.valor)}">
        ${multiplo ? `<span class="seletor-marca">${selecionados.has(o.valor) ? '✓' : ''}</span>` : ''}
        <span>${esc(o.rotulo)}</span>
        ${o.extra ? `<span class="seletor-extra">${esc(o.extra)}</span>` : ''}
      </button>`).join('')
      + (achados.length > limite.length
        ? `<p class="seletor-vazio">+${achados.length - limite.length} resultado(s). Refine a busca.</p>` : '');
  };

  // posiciona junto ao gatilho, sem sair da tela
  const caixaGatilho = gatilho.getBoundingClientRect();
  caixa.style.visibility = 'hidden';
  requestAnimationFrame(() => {
    const altura = caixa.offsetHeight;
    const largura = Math.max(caixa.offsetWidth, caixaGatilho.width);
    const abaixo = caixaGatilho.bottom + 6;
    const cabeAbaixo = abaixo + altura <= window.innerHeight - 8;
    caixa.style.top = (window.scrollY + (cabeAbaixo ? abaixo : Math.max(8, caixaGatilho.top - altura - 6))) + 'px';
    caixa.style.left = (window.scrollX + Math.min(caixaGatilho.left, window.innerWidth - largura - 12)) + 'px';
    caixa.style.visibility = 'visible';
    campoBusca.focus();
  });

  const aoTeclar = ev => { if (ev.key === 'Escape') { ev.stopPropagation(); fecharSeletor(); } };
  document.addEventListener('keydown', aoTeclar, true);

  campoBusca.addEventListener('input', desenharLista);
  caixa.addEventListener('click', ev => {
    const acao = ev.target.closest('[data-seletor]');
    if (acao) {
      if (acao.dataset.seletor === 'limpar') { selecionados.clear(); config.aoEscolher([]); desenharLista(); }
      else fecharSeletor();
      return;
    }
    const item = ev.target.closest('[data-valor]');
    if (!item) return;
    const valor = item.dataset.valor;
    if (multiplo) {
      if (selecionados.has(valor)) selecionados.delete(valor); else selecionados.add(valor);
      config.aoEscolher([...selecionados]);
      desenharLista();
    } else {
      const escolhido = config.opcoes.find(o => o.valor === valor);
      config.aoEscolher(valor, escolhido);
      fecharSeletor();
    }
  });

  desenharLista();
  seletorAberto = { elemento: caixa, aoTeclar, aoFechar: config.aoFechar };
}

document.addEventListener('mousedown', ev => {
  if (seletorAberto && !ev.target.closest('.seletor') && !ev.target.closest('[data-acao="abrir-seletor"]')) fecharSeletor();
});
window.addEventListener('resize', fecharSeletor);

function kpi(cor, titulo, valor, nota, sinal, grafico) {
  const classe = sinal === undefined ? '' : (sinal < 0 ? 'negativo' : (sinal > 0 ? 'positivo' : ''));
  return `<div class="kpi ${cor}">
    <div class="titulo">${esc(titulo)}</div>
    <div class="valor ${classe}">${valor}</div>
    ${nota ? `<div class="nota">${esc(nota)}</div>` : ''}
    ${grafico || ''}
  </div>`;
}

/* ---------------------------------------------------------- mini-gráficos
   SVG gerados a partir das séries mensais já calculadas pelo motor.
   As cores vêm de variáveis CSS, então acompanham o tema claro/escuro.     */

let seqGrafico = 0;
const LARG_SVG = 240, ALT_SVG = 50;

/** Série acumulada mês a mês (usada nos indicadores "acumulado"). */
function acumular(valores, ate) {
  let soma = 0;
  return valores.slice(0, ate === undefined ? valores.length : ate).map(v => (soma += Number(v) || 0));
}

/** Gráfico de área com linha — bom para curvas acumuladas. */
function miniArea(valores, opcoes = {}) {
  const v = valores.map(x => Number(x) || 0);
  if (v.length < 2) return '';
  const cor = opcoes.cor || 'var(--roxo)';
  const formatar = opcoes.formatar || moeda;
  const rotulos = opcoes.rotulos || MESES_CURTOS;

  const minimo = Math.min(...v, 0);
  const maximo = Math.max(...v, 0);
  const amplitude = (maximo - minimo) || 1;
  const px = i => (i / (v.length - 1)) * LARG_SVG;
  const py = x => ALT_SVG - 4 - ((x - minimo) / amplitude) * (ALT_SVG - 10);

  const pontos = v.map((x, i) => `${px(i).toFixed(1)},${py(x).toFixed(1)}`);
  const id = 'grad' + (++seqGrafico);
  const passo = LARG_SVG / v.length;

  // faixas invisíveis para o tooltip de cada mês
  const alvos = v.map((x, i) => `<rect x="${(px(i) - passo / 2).toFixed(1)}" y="0" width="${passo.toFixed(1)}" height="${ALT_SVG}" fill="transparent"><title>${esc(rotulos[i] || '')}: ${esc(formatar(x))}</title></rect>`).join('');

  return `<div class="mini"><svg viewBox="0 0 ${LARG_SVG} ${ALT_SVG}" preserveAspectRatio="none" role="img">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" style="stop-color:${cor};stop-opacity:.38"/>
      <stop offset="100%" style="stop-color:${cor};stop-opacity:0"/>
    </linearGradient></defs>
    <path d="M0,${ALT_SVG} L${pontos.join(' L')} L${LARG_SVG},${ALT_SVG} Z" style="fill:url(#${id})"/>
    <polyline points="${pontos.join(' ')}" style="fill:none;stroke:${cor}" stroke-width="2.4"
              stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    ${alvos}
  </svg></div>`;
}

/** Gráfico de barras — bom para valores mês a mês, inclusive negativos. */
function miniBarras(valores, opcoes = {}) {
  const v = valores.map(x => Number(x) || 0);
  if (!v.length) return '';
  const cor = opcoes.cor || 'var(--roxo)';
  const corFuturo = opcoes.corFuturo || 'var(--realce-2)';
  const formatar = opcoes.formatar || moeda;
  const rotulos = opcoes.rotulos || MESES_CURTOS;
  const ativoAte = opcoes.ativoAte === undefined ? v.length : opcoes.ativoAte;

  const temNegativo = v.some(x => x < 0);
  // escalas independentes para cada lado: um mês muito negativo não achata os demais
  const maxPositivo = Math.max(...v.filter(x => x >= 0), 0) || 1;
  const maxNegativo = Math.max(...v.filter(x => x < 0).map(Math.abs), 0) || 1;
  const base = temNegativo ? ALT_SVG * 0.66 : ALT_SVG - 1;
  const alturaPositiva = base - 3;
  const alturaNegativa = ALT_SVG - base - 3;

  const passo = LARG_SVG / v.length;
  const largura = passo * 0.6;

  const barras = v.map((x, i) => {
    const proporcao = Math.abs(x) / (x < 0 ? maxNegativo : maxPositivo);
    const altura = Math.max(2, proporcao * (x < 0 ? alturaNegativa : alturaPositiva));
    const y = x < 0 ? base : base - altura;
    const preenchimento = x < 0 ? 'var(--negativo-cor)' : (i < ativoAte ? cor : corFuturo);
    return `<rect x="${(i * passo + (passo - largura) / 2).toFixed(1)}" y="${y.toFixed(1)}"
      width="${largura.toFixed(1)}" height="${altura.toFixed(1)}" rx="2" style="fill:${preenchimento}"
      ><title>${esc(rotulos[i] || '')}: ${esc(formatar(x))}</title></rect>`;
  }).join('');

  const linhaZero = temNegativo
    ? `<line x1="0" y1="${base}" x2="${LARG_SVG}" y2="${base}" style="stroke:var(--borda)" stroke-width="1" vector-effect="non-scaling-stroke"/>`
    : '';

  return `<div class="mini"><svg viewBox="0 0 ${LARG_SVG} ${ALT_SVG}" preserveAspectRatio="none" role="img">
    ${linhaZero}${barras}
  </svg></div>`;
}

function graficoBarras(titulo, itens, opcoes = {}) {
  const formatar = opcoes.formatar || inteiro;
  const cor = opcoes.cor || 'var(--azul)';
  const maximo = Math.max(1, ...itens.map(i => Math.abs(i.valor)));
  const corpo = itens.length && itens.some(i => i.valor !== 0 || opcoes.mostrarZeros)
    ? `<div class="barras">${itens.map(i => `
        <div class="barra-item">
          <span class="rotulo" title="${esc(i.rotulo)}">${esc(i.rotulo)}</span>
          <span class="trilho"><span class="preenchimento" style="width:${(Math.abs(i.valor) / maximo * 100).toFixed(1)}%;background:${cor}"></span></span>
          <span class="quantia">${formatar(i.valor)}</span>
        </div>`).join('')}</div>`
    : `<p class="vazio">Sem dados para exibir. Registre alunos e pagamentos para alimentar este painel.</p>`;
  return `<section class="cartao">
    <header class="escuro">${esc(titulo)}</header>
    <div class="corpo">${corpo}</div>
  </section>`;
}

/* ------------------------------------------------------- gráfico de rosca
   Composição de um todo, no máximo 6 fatias. A legenda sempre traz rótulo e
   valor, então a identidade nunca depende só da cor.                        */
function graficoRosca(titulo, itens, opcoes = {}) {
  const formatar = opcoes.formatar || inteiro;
  const cores = opcoes.cores || ['var(--plano-1)', 'var(--plano-2)', 'var(--plano-3)', 'var(--plano-4)', 'var(--plano-5)'];
  const total = itens.reduce((s, i) => s + Math.max(0, n(i.valor)), 0);

  if (!total) {
    return `<section class="cartao"><header class="escuro">${esc(titulo)}</header>
      <div class="corpo"><p class="vazio">Sem dados para exibir. Registre alunos e pagamentos para alimentar este painel.</p></div></section>`;
  }

  const RAIO = 45, ESPESSURA = 17;
  const CIRC = 2 * Math.PI * RAIO;
  const comFatia = itens.filter(i => n(i.valor) > 0).length;
  const vao = comFatia > 1 ? 2 : 0;            // 2px de respiro entre as fatias

  let acumulado = 0;
  const fatias = itens.map((item, i) => {
    const valor = Math.max(0, n(item.valor));
    if (!valor) return '';
    const comprimento = Math.max(1, (valor / total) * CIRC - vao);
    const traco = `<circle class="fatia" cx="60" cy="60" r="${RAIO}" fill="none"
        style="stroke:${cores[i % cores.length]}" stroke-width="${ESPESSURA}"
        stroke-dasharray="${comprimento.toFixed(2)} ${(CIRC - comprimento).toFixed(2)}"
        stroke-dashoffset="${(-acumulado).toFixed(2)}"
      ><title>${esc(item.rotulo)}: ${esc(formatar(valor))} (${(valor / total * 100).toFixed(1).replace('.', ',')}%)</title></circle>`;
    acumulado += (valor / total) * CIRC;
    return traco;
  }).join('');

  const legenda = itens.map((item, i) => `
    <li>
      <span class="ponto" style="background:${cores[i % cores.length]}"></span>
      <span class="leg-rotulo">${esc(item.rotulo)}</span>
      <span class="leg-valor">${esc(formatar(item.valor))}</span>
      <span class="leg-pct">${(n(item.valor) / total * 100).toFixed(0)}%</span>
    </li>`).join('');

  return `<section class="cartao">
    <header class="escuro">${esc(titulo)}</header>
    <div class="corpo">
      <div class="rosca">
        <svg viewBox="0 0 120 120" role="img" aria-label="${esc(titulo)}">
          <g transform="rotate(-90 60 60)">${fatias}</g>
          <text class="rosca-total" x="60" y="58" text-anchor="middle">${esc(opcoes.centro || formatar(total))}</text>
          <text class="rosca-legenda" x="60" y="72" text-anchor="middle">${esc(opcoes.centroRotulo || 'total')}</text>
        </svg>
        <ul class="rosca-legenda-lista">${legenda}</ul>
      </div>
    </div>
  </section>`;
}

/* --------------------------------------------------- gráfico de colunas
   Categorias com ordem natural (dias da semana, faixas de horário).
   Uma série, uma cor — a altura já codifica o valor.                       */
function graficoColunas(titulo, itens, opcoes = {}) {
  const formatar = opcoes.formatar || inteiro;
  const cor = opcoes.cor || 'var(--roxo)';
  const maximo = Math.max(...itens.map(i => n(i.valor)), 1);
  const temDado = itens.some(i => n(i.valor) > 0);
  const cabecalho = `<header class="escuro">${esc(titulo)}${opcoes.acoesHeader ? `<span class="acoes-relatorio nao-imprimir">${opcoes.acoesHeader}</span>` : ''}</header>`;

  if (!temDado && !opcoes.mostrarMesmoVazio) {
    return `<section class="cartao">${cabecalho}
      <div class="corpo"><p class="vazio">Sem dados para exibir. Registre alunos e pagamentos para alimentar este painel.</p></div></section>`;
  }

  // `opcoes.empilhado`: cada barra pode mostrar uma segunda origem sobreposta
  // (ex.: quanto do total do mês veio de remarcação) usando `item.segmentoValor`.
  const corSegmento = opcoes.corSegmento || 'var(--amarelo)';
  const colunas = itens.map(item => {
    const valor = n(item.valor);
    const segmento = opcoes.empilhado ? Math.min(valor, n(item.segmentoValor)) : 0;
    const destaque = item.automatico ? ' col-automatica' : '';
    const dicaSegmento = segmento ? `, sendo ${esc(formatar(segmento))} de ${esc(opcoes.legendaSegmento || 'remarcação').toLowerCase()}` : '';
    const barraSegmento = segmento
      ? `<div class="col-barra-segmento" style="height:${(segmento / valor * 100).toFixed(1)}%;background:${corSegmento}"></div>` : '';
    return `<div class="coluna${destaque}" title="${esc(item.rotulo)}: ${esc(formatar(valor))}${dicaSegmento}${item.automatico ? ' (calculado agora)' : ''}">
      <span class="col-valor">${esc(formatar(valor))}</span>
      <div class="col-trilho">
        <div class="col-barra" style="height:${(valor / maximo * 100).toFixed(1)}%;background:${valor ? cor : 'var(--realce)'};position:relative;overflow:hidden">${barraSegmento}</div>
      </div>
      <span class="col-rotulo">${esc(item.rotulo)}</span>
    </div>`;
  }).join('');

  const legendaOrigem = opcoes.empilhado ? `<p class="legenda" style="margin-top:10px;display:flex;gap:16px">
    <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${cor};margin-right:6px;vertical-align:-1px"></span>Aula normal</span>
    <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${corSegmento};margin-right:6px;vertical-align:-1px"></span>${esc(opcoes.legendaSegmento || 'Remarcação')}</span>
  </p>` : '';

  return `<section class="cartao">
    ${cabecalho}
    <div class="corpo"><div class="colunas">${colunas}</div>${legendaOrigem}</div>
  </section>`;
}

/** Linha de meses somente leitura (formula da planilha). */
function linhaCalculada(rotulo, valores, formatar, classeLinha, dica) {
  return `<tr class="${classeLinha || ''} linha-calculada">
    <th>${esc(rotulo)}${dica ? `<span class="cadeado" title="${esc(dica)}">🔒</span>` : '<span class="cadeado" title="Calculado pela fórmula da planilha">🔒</span>'}</th>
    ${valores.map(v => `<td class="num ${classeSinal(v)}">${formatar(v)}</td>`).join('')}
  </tr>`;
}

/** Linha de meses editavel (linha preta da planilha). */
function linhaEditavel(rotulo, valores, contexto, opcoes = {}) {
  const remover = opcoes.removivel
    ? `<button class="botao perigo mini" data-acao="remover-linha" data-ctx="${esc(contexto)}" data-id="${esc(opcoes.id)}" title="Excluir esta linha">✕</button>`
    : '';
  const nomeEditavel = opcoes.renomeavel
    ? `<input value="${esc(rotulo)}" data-acao="renomear" data-ctx="${esc(contexto)}" data-id="${esc(opcoes.id)}" style="min-width:180px">`
    : esc(rotulo);
  return `<tr>
    <th><div style="display:flex;gap:6px;align-items:center">${nomeEditavel}${remover}</div></th>
    ${valores.map((v, i) => `<td class="num">
      <input class="num" value="${esc(paraEntrada(v))}"
             data-acao="${esc(opcoes.acao)}" data-ctx="${esc(contexto)}" data-id="${esc(opcoes.id || '')}" data-mes="${i}"
             ${opcoes.dicaCelula ? `title="${esc(opcoes.dicaCelula)}"` : ''}></td>`).join('')}
    ${opcoes.totalAno !== undefined ? `<td class="num calc">${moeda(opcoes.totalAno)}</td>` : ''}
  </tr>`;
}

function cabecalhoMeses(ultimaColuna) {
  return `<thead><tr>
    <th style="min-width:230px">Categoria / Indicador</th>
    ${MESES.map(m => `<th class="num">${m}</th>`).join('')}
    ${ultimaColuna ? `<th class="num">${esc(ultimaColuna)}</th>` : ''}
  </tr></thead>`;
}

const LEGENDA_CORES = `<p class="legenda">
  <span class="chip"><span class="amostra" style="background:var(--superficie)"></span> Linha preta — editável, permite incluir e excluir</span>
  <span class="chip"><span class="amostra" style="background:var(--superficie-2);border-color:var(--roxo-suave)"></span> <span class="calc">Roxo</span> — resultado de fórmula, bloqueado</span>
  <span class="chip"><span class="amostra" style="background:var(--roxo)"></span> Cabeçalho / total — bloqueado</span>
</p>`;

/* ================================================================ DASHBOARD */

function abaDashboard() {
  const d = estado.calc.dashboard;
  const o = d.operacional;
  const c26 = estado.calc.calc2026;
  const c27 = estado.calc.calc2027;

  const narrativa = `No acumulado até ${d.nomeMesCorrente.toLowerCase()} de ${c26.ano}, a escola registra
    <strong>${moedaCurta(d.receitaAcumulada)}</strong> de receita considerada e <strong>${moedaCurta(d.despesasAcumuladas)}</strong>
    de despesas, resultando em <strong>${moedaCurta(d.lucroAcumulado)}</strong> de lucro e margem de
    <strong>${percentual(d.margemLiquida)}</strong>. Alunos ativos dependem da Data de Matrícula e do Status;
    pagamentos reais substituem automaticamente o planejamento.`;

  const narrativaOperacional = `A operação possui <strong>${inteiro(o.aulasSemanais)}</strong> aulas semanais estimadas e receita
    mensal contratada de <strong>${moedaCurta(o.receitaContratada)}</strong>. A pontualidade histórica dos pagamentos é
    <strong>${percentual(o.pontualidade)}</strong> e há <strong>${inteiro(o.inadimplentesAtuais)}</strong> inadimplente(s) atual(is).
    Priorize cobrança quando houver alunos em atraso e acompanhe concentração por professor, plano, dia e horário nos painéis abaixo.`;

  // séries dos mini-gráficos de cada indicador
  const mc = d.mesCorrente;
  const rotuloAcum = MESES_CURTOS.slice(0, mc);
  const g = {
    receita: miniArea(acumular(c26.receitaConsiderada, mc), { cor: 'var(--roxo)', rotulos: rotuloAcum }),
    despesas: miniArea(acumular(c26.despesaTotal, mc), { cor: 'var(--roxo-medio)', rotulos: rotuloAcum }),
    lucro: miniArea(acumular(c26.lucro, mc), { cor: 'var(--roxo-suave)', rotulos: rotuloAcum }),
    margem: miniBarras(c26.margem, { formatar: percentual, ativoAte: mc }),
    alunos: miniBarras(c26.alunosAtivos, { formatar: inteiro, ativoAte: mc, cor: 'var(--roxo-medio)' }),
    ticket: miniBarras(d.serieTicketMedio, { formatar: moeda, ativoAte: mc }),
    proLabore: miniBarras(d.serieProLaboreSobreReceita, { formatar: percentual, ativoAte: mc, cor: 'var(--roxo-suave)' }),
    projecao: miniBarras(c27.receitaConsiderada, { formatar: moeda, cor: 'var(--roxo)' }),
  };

  const tabelaAno = (calc, ano) => `
    <section class="cartao">
      <header>${ano} | ${ano === c26.ano ? 'REALIZADO + PLANEJAMENTO' : 'PROJEÇÃO'}</header>
      <div class="corpo sem-espaco"><div class="rolagem"><table>
        <thead><tr><th>Mês</th><th class="num">Receita</th><th class="num">Despesas</th><th class="num">Lucro</th><th class="num">Margem</th></tr></thead>
        <tbody>
          ${MESES.map((m, i) => `<tr>
            <th>${m}</th>
            <td class="num ${classeSinal(calc.receitaConsiderada[i])}">${moeda(calc.receitaConsiderada[i])}</td>
            <td class="num ${calc.despesaTotal[i] < 0 ? 'negativo' : 'calc'}">${moeda(calc.despesaTotal[i])}</td>
            <td class="num ${classeSinal(calc.lucro[i])}">${moeda(calc.lucro[i])}</td>
            <td class="num ${classeSinal(calc.margem[i])}">${percentual(calc.margem[i])}</td>
          </tr>`).join('')}
          <tr class="linha-total">
            <th>Total do ano</th>
            <td class="num">${moeda(calc.receitaConsiderada.reduce((s, x) => s + x, 0))}</td>
            <td class="num">${moeda(calc.despesaTotal.reduce((s, x) => s + x, 0))}</td>
            <td class="num">${moeda(calc.lucro.reduce((s, x) => s + x, 0))}</td>
            <td class="num">${percentual(calc.lucro.reduce((s, x) => s + x, 0) / (calc.receitaConsiderada.reduce((s, x) => s + x, 0) || 1))}</td>
          </tr>
        </tbody>
      </table></div></div>
    </section>`;

  return `
    <div class="kpis">
      ${kpi('azul', 'Receita acumulada ' + c26.ano, moeda(d.receitaAcumulada), 'Acumulado de janeiro até ' + d.nomeMesCorrente.toLowerCase(), d.receitaAcumulada, g.receita)}
      ${kpi('verde', 'Despesas acumuladas ' + c26.ano, moeda(d.despesasAcumuladas), 'Acumulado, já com o Simples Nacional', undefined, g.despesas)}
      ${kpi('amarelo', 'Lucro acumulado ' + c26.ano, moeda(d.lucroAcumulado), 'Curva acumulada de receita − despesa', d.lucroAcumulado, g.lucro)}
      ${kpi('marinho', 'Margem líquida', percentual(d.margemLiquida), 'Margem de cada mês do ano', d.margemLiquida, g.margem)}
    </div>
    <div class="kpis">
      ${kpi('verde', 'Alunos ativos no mês', inteiro(d.alunosAtivosMes), 'Alunos ativos mês a mês em ' + c26.ano, undefined, g.alunos)}
      ${kpi('azul', 'Ticket médio por aluno', moeda(d.ticketMedio), 'Receita ÷ alunos ativos, mês a mês', undefined, g.ticket)}
      ${kpi('amarelo', 'Pró-labore / Receita', percentual(d.proLaboreSobreReceita), 'Peso do pró-labore em cada mês', undefined, g.proLabore)}
      ${kpi('marinho', 'Receita projetada ' + c27.ano, moeda(d.receitaProjetada2027), 'Receita considerada mês a mês em ' + c27.ano, undefined, g.projecao)}
    </div>

    <div class="leitura">${narrativa}</div>

    <div class="grade-2">${tabelaAno(c26, c26.ano)}${tabelaAno(c27, c27.ano)}</div>

    <section class="cartao">
      <header class="escuro">PAINEL OPERACIONAL E COMERCIAL</header>
      <div class="corpo">
        <div class="kpis" style="margin-bottom:14px">
          ${kpi('verde', 'Aulas semanais estimadas', inteiro(o.aulasSemanais), 'Somatório dos dias informados no cadastro')}
          ${kpi('vermelho', 'Inadimplentes atuais', inteiro(o.inadimplentesAtuais), 'Cobranças com situação "Em atraso"')}
          ${kpi('amarelo', 'Pontualidade dos pagamentos', percentual(o.pontualidade), 'Em dia ÷ (Em dia + Pago com atraso)')}
          ${kpi('marinho', 'Receita mensal contratada', moeda(o.receitaContratada), 'Valor mensal dos alunos ativos')}
        </div>
        <div class="leitura" style="margin-bottom:0">${narrativaOperacional}</div>
      </div>
    </section>

    <div class="grade-graficos">
      ${graficoRosca('CARTEIRA POR PLANO', o.carteiraPlano, { centroRotulo: 'alunos' })}
      ${graficoRosca('SITUAÇÃO DOS PAGAMENTOS', o.situacaoPagamentos, {
        centroRotulo: 'cobranças',
        cores: ['var(--sit-emdia)', 'var(--sit-pagoatraso)', 'var(--sit-ematraso)', 'var(--sit-avencer)'],
      })}
      ${graficoColunas('DIAS MAIS CONCORRIDOS', o.diasConcorridos)}
      ${graficoColunas('HORÁRIOS MAIS CONCORRIDOS', o.horarios, { cor: 'var(--roxo-medio)' })}
      ${graficoBarras('CARGA SEMANAL POR PROFESSOR', o.cargaProfessor, { mostrarZeros: true, cor: 'var(--verde)' })}
      ${graficoBarras('OBJETIVOS DE APRENDIZAGEM', o.objetivos, { cor: 'var(--verde)' })}
      ${graficoBarras('RANKING HISTÓRICO DE ATRASOS', o.rankingAtrasos, { mostrarZeros: true, cor: 'var(--amarelo)', formatar: v => inteiro(v) + ' d' })}
      ${graficoBarras('INADIMPLENTES ATUAIS', o.inadimplentes, { mostrarZeros: true, cor: 'var(--vermelho)', formatar: v => inteiro(v) + ' d' })}
      ${graficoBarras('STATUS DA CARTEIRA DE ALUNOS', o.statusCarteira, { mostrarZeros: true })}
      ${graficoBarras('RECEITA POR FORMA DE PAGAMENTO', o.receitaPorForma, { mostrarZeros: true, cor: 'var(--verde)', formatar: moeda })}
    </div>

    <div class="leitura">
      <strong>Leitura operacional —</strong> Aulas por professor são estimadas pelos dias semanais informados no cadastro,
      não por presença realizada. O ranking de atrasos considera o maior atraso histórico por aluno. "Inadimplentes atuais"
      considera apenas cobranças sem pagamento cuja situação esteja "Em atraso"; para identificar ausência de pagamento,
      registre a cobrança deixando a Data do Pagamento vazia. A receita mensal contratada soma o valor mensal dos alunos ativos.
    </div>

    <section class="cartao">
      <header class="escuro">PROFESSORES</header>
      <div class="corpo">
        <div class="filtro-dias" style="margin-bottom:10px">
          <button class="${estado.dashboardProfessorAulas === 'Davi' ? 'ativo' : ''}" data-acao="filtro-dashboard-professor-aulas" data-professor="Davi">Davi</button>
          <button class="${estado.dashboardProfessorAulas === 'Olivia' ? 'ativo' : ''}" data-acao="filtro-dashboard-professor-aulas" data-professor="Olivia">Olivia</button>
        </div>
        <div class="grade-graficos" style="margin-bottom:0">
          ${estado.dashboardProfessorAulas === 'Davi' ? graficoAulasFeitasDavi() : graficoAulasMensais('Olivia')}
          ${graficoBarras('VALOR MÊS SEGUINTE — DAVI', valoresMesSeguinte(estado.dados.aulas.filter(a => a.professor === 'Davi')), { mostrarZeros: true, cor: 'var(--amarelo)', formatar: moeda })}
        </div>
        <p class="legenda" style="margin-bottom:0">
          <strong>Aulas do mês</strong> mostra a Olivia (mesmo gráfico acumulado da tela dela: marcar "Aula feita" como Sim
          soma +1 no mês atual, voltar para Não tira −1; os demais meses só têm valor quando alguém preenche manualmente
          pelo botão) ou o Davi (ele não tem essa contagem acumulada — o mês atual é calculado ao vivo a partir de quantas
          aulas dele estão com "Aula feita = Sim" agora; os demais meses ficam em branco).
          <strong>Valor Mês Seguinte</strong> é um campo livre que o Davi preenche por aluno, sem ligação com a mensalidade
          nem com nenhuma outra coluna — serve só para sinalizar quem pode estar fazendo upgrade de plano.
        </p>
      </div>
    </section>`;
}

/* ================================================================== ALUNOS */

const CAMPOS_ALUNO = [
  { chave: 'nome', rotulo: 'Nome', largura: 160 },
  { chave: 'contato', rotulo: 'Contato', largura: 130 },
  { chave: 'cidade', rotulo: 'Cidade', cidade: true, largura: 175 },
  { chave: 'estado', rotulo: 'Estado', largura: 70 },
  { chave: 'pais', rotulo: 'País', largura: 100 },
  { chave: 'plano', rotulo: 'Plano', lista: 'planos', largura: 120 },
  { chave: 'valorMensal', rotulo: 'Valor Mensal', numero: true, largura: 110 },
  { chave: 'dataMatricula', rotulo: 'Data Matrícula', data: true, largura: 135 },
  { chave: 'objetivo', rotulo: 'Objetivo da Aula', lista: 'objetivos', largura: 175 },
  { chave: 'horario', rotulo: 'Horário', hora: true, largura: 95 },
  { chave: 'dias', rotulo: 'Dia(s) da Semana', dias: true, largura: 185 },
  { chave: 'professor', rotulo: 'Professor', lista: 'professores', largura: 120 },
  { chave: 'status', rotulo: 'Status', lista: 'status', largura: 110 },
  { chave: 'remarcacao', rotulo: 'Remarcação', numero: true, largura: 105 },
  { chave: 'diaVencimento', rotulo: 'Dia de Vencimento', numero: true, largura: 100 },
];

/** campos do aluno que são numéricos */
const CAMPOS_NUMERICOS = ['valorMensal', 'diaVencimento', 'remarcacao'];

/** Dias marcados no texto livre da planilha ("Terça e Quarta", "Quarta-feira"…). */
function diasMarcados(texto) {
  return DIAS_SEMANA.filter(d => contem(texto, d));
}

function campoAluno(aluno, campo) {
  const valor = aluno[campo.chave];
  const base = `data-acao="aluno" data-id="${esc(aluno.id)}" data-campo="${esc(campo.chave)}"`;

  if (campo.cidade) {
    return `<button type="button" class="campo-seletor" data-acao="abrir-seletor" data-tipo="cidade"
              data-id="${esc(aluno.id)}" title="Pesquisar cidade">
        <span class="campo-seletor-texto ${valor ? '' : 'sem-valor'}">${esc(valor || 'Selecionar cidade')}</span>
        <span class="campo-seletor-icone">🔍</span>
      </button>`;
  }
  if (campo.dias) {
    const marcados = diasMarcados(valor);
    return `<button type="button" class="campo-seletor" data-acao="abrir-seletor" data-tipo="dias"
              data-id="${esc(aluno.id)}" title="Escolher os dias da semana">
        <span class="campo-seletor-texto ${marcados.length ? '' : 'sem-valor'}">${esc(marcados.length ? marcados.join(', ') : 'Selecionar dias')}</span>
        <span class="campo-seletor-icone">📅</span>
      </button>`;
  }
  if (campo.lista) {
    const opcoes = estado.dados.opcoes[campo.lista] || [];
    const desconhecido = valor && !opcoes.includes(valor);
    return `<select ${base}>
      <option value=""></option>
      ${opcoes.map(o => `<option${o === valor ? ' selected' : ''}>${esc(o)}</option>`).join('')}
      ${desconhecido ? `<option selected>${esc(valor)}</option>` : ''}
    </select>`;
  }
  if (campo.data) return `<input type="date" ${base} value="${esc(valor || '')}">`;
  if (campo.hora) return `<input type="time" ${base} value="${esc(valor || '')}">`;
  if (campo.numero) return `<input class="num" ${base} value="${esc(paraEntrada(valor))}">`;
  return `<input ${base} value="${esc(valor || '')}">`;
}

function abaAlunos() {
  const termo = estado.busca.toLowerCase();
  const lista = estado.dados.alunos
    .map((a, i) => ({ ...a, numero: i + 1 }))
    .filter(a => !termo || Object.values(a).some(v => String(v).toLowerCase().includes(termo)));

  return `
    <div class="barra-acoes">
      <button class="botao" data-acao="novo-aluno">+ Novo aluno</button>
      <input class="busca" placeholder="Buscar aluno…" data-acao="busca" value="${esc(estado.busca)}">
      <span class="espaco"></span>
      <span style="font-size:12.5px;color:var(--texto-suave)">${estado.dados.alunos.length} aluno(s) cadastrado(s)</span>
    </div>

    <section class="cartao">
      <header class="escuro">CADASTRO DE ALUNOS <span style="font-weight:400;font-size:11.5px">todas as colunas abaixo são editáveis</span></header>
      <div class="corpo sem-espaco"><div class="rolagem"><table>
        <thead><tr>
          <th class="num" style="width:46px">ID</th>
          ${CAMPOS_ALUNO.map(c => `<th style="min-width:${c.largura}px">${c.rotulo}</th>`).join('')}
          <th style="width:60px"></th>
        </tr></thead>
        <tbody>
          ${lista.length ? lista.map(a => `<tr>
            <td class="num calc" title="ID gerado automaticamente pela ordem da tabela">${a.numero}</td>
            ${CAMPOS_ALUNO.map(c => `<td>${campoAluno(a, c)}</td>`).join('')}
            <td><button class="botao perigo mini" data-acao="remover-aluno" data-id="${esc(a.id)}" title="Excluir aluno">✕</button></td>
          </tr>`).join('')
          : `<tr><td colspan="${CAMPOS_ALUNO.length + 2}" class="vazio">Nenhum aluno encontrado.</td></tr>`}
        </tbody>
      </table></div></div>
    </section>
    ${LEGENDA_CORES}
    <p class="legenda">A coluna <strong>ID</strong> reproduz a fórmula da planilha (<code>=LIN()-4</code>): é a posição da linha e não pode ser digitada.
    O <strong>Dia de Vencimento</strong> alimenta o cálculo de atraso na aba Pagamentos.</p>`;
}

/* ============================================================== PAGAMENTOS */

function abaPagamentos() {
  const termo = estado.busca.toLowerCase();
  const calculados = estado.calc.pagamentosCalc;
  const hoje = paraData(estado.calc.hoje);
  const primeiroDoMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const proximoMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 1));

  const doMes = calculados.filter(p => {
    const d = paraData(p.dataPagamento);
    return d && d >= primeiroDoMes && d < proximoMes;
  });
  const totalMes = doMes.reduce((s, p) => s + Number(p.valor || 0), 0);

  const lista = calculados.filter(p => !termo || Object.values(p).some(v => String(v).toLowerCase().includes(termo)));
  const nomes = estado.dados.alunos.map(a => a.nome).filter(Boolean);

  const selecao = (p, campo, opcoes) => {
    const valor = p[campo] || '';
    const desconhecido = valor && !opcoes.includes(valor);
    return `<select data-acao="pagamento" data-id="${esc(p.id)}" data-campo="${esc(campo)}">
      <option value=""></option>
      ${opcoes.map(o => `<option${o === valor ? ' selected' : ''}>${esc(o)}</option>`).join('')}
      ${desconhecido ? `<option selected>${esc(valor)}</option>` : ''}
    </select>`;
  };

  const corSituacao = s => (s === 'Em dia' || s === 'A vencer') ? 'positivo' : ((s === 'Em atraso' || s === 'Pago com atraso') ? 'negativo' : 'calc');

  return `
    <div class="kpis">
      ${kpi('azul', 'Competência selecionada', MESES[hoje.getUTCMonth()] + ' ' + hoje.getUTCFullYear(), 'Mês corrente, conforme a planilha')}
      ${kpi('verde', 'Total recebido', moeda(totalMes), 'Pagamentos com data dentro do mês', totalMes)}
      ${kpi('marinho', 'Nº de pagamentos', inteiro(doMes.length), 'Lançamentos no mês corrente')}
      ${kpi('amarelo', 'Ticket médio', moeda(doMes.length ? totalMes / doMes.length : 0), 'Total recebido ÷ nº de pagamentos')}
    </div>

    <div class="barra-acoes">
      <button class="botao" data-acao="novo-pagamento">+ Novo pagamento</button>
      <input class="busca" placeholder="Buscar pagamento…" data-acao="busca" value="${esc(estado.busca)}">
      <span class="espaco"></span>
      <span style="font-size:12.5px;color:var(--texto-suave)">${estado.dados.pagamentos.length} lançamento(s)</span>
    </div>

    <section class="cartao">
      <header class="escuro">PAGAMENTOS DE MENSALIDADES</header>
      <div class="corpo sem-espaco"><div class="rolagem"><table>
        <thead><tr>
          <th style="min-width:140px">Data do Pagamento</th>
          <th style="min-width:120px">Competência</th>
          <th style="min-width:150px">Aluno</th>
          <th style="min-width:130px">Tipo</th>
          <th style="min-width:110px">Valor</th>
          <th style="min-width:120px">Forma</th>
          <th style="min-width:120px">Professor</th>
          <th style="min-width:180px">Observação</th>
          <th style="min-width:120px">Vencimento 🔒</th>
          <th class="num" style="min-width:100px">Dias em Atraso 🔒</th>
          <th style="min-width:130px">Situação 🔒</th>
          <th style="width:60px"></th>
        </tr></thead>
        <tbody>
          ${lista.length ? lista.map(p => `<tr>
            <td><input type="date" data-acao="pagamento" data-id="${esc(p.id)}" data-campo="dataPagamento" value="${esc(p.dataPagamento || '')}"></td>
            <td><input type="month" data-acao="pagamento" data-id="${esc(p.id)}" data-campo="competenciaManual"
                  class="${p.competenciaSobrescrita ? '' : 'campo-formula'}"
                  value="${esc((p.competencia || '').slice(0, 7))}"
                  title="${p.competenciaSobrescrita
                    ? 'Competência informada por você. Apague para voltar à fórmula da Data do Pagamento.'
                    : '=SE(Data=&quot;&quot;;&quot;&quot;;DATA(ANO(Data);MÊS(Data);1)) — vem da Data do Pagamento. Digite para lançar outra competência.'}"></td>
            <td>${selecao(p, 'aluno', nomes)}</td>
            <td>${selecao(p, 'tipo', estado.dados.opcoes.tiposPagamento || [])}</td>
            <td><input class="num" data-acao="pagamento" data-id="${esc(p.id)}" data-campo="valor" value="${esc(paraEntrada(p.valor))}"></td>
            <td>${selecao(p, 'forma', estado.dados.opcoes.formasPagamento || [])}</td>
            <td>${selecao(p, 'professor', estado.dados.opcoes.professores || [])}</td>
            <td><input data-acao="pagamento" data-id="${esc(p.id)}" data-campo="observacao" value="${esc(p.observacao || '')}"></td>
            <td class="celula-calculada" style="text-align:left" title="Dia de vencimento do aluno aplicado à competência">${esc(dataBR(p.dataVencimento))}</td>
            <td class="num ${Number(p.diasAtraso) > 0 ? 'negativo' : 'calc'}">${p.diasAtraso === '' ? '' : inteiro(p.diasAtraso)}</td>
            <td class="${corSituacao(p.situacao)}">${esc(p.situacao)}</td>
            <td><button class="botao perigo mini" data-acao="remover-pagamento" data-id="${esc(p.id)}" title="Excluir lançamento">✕</button></td>
          </tr>`).join('')
          : `<tr><td colspan="12" class="vazio">Nenhum pagamento encontrado.</td></tr>`}
        </tbody>
      </table></div></div>
    </section>
    ${LEGENDA_CORES}
    <p class="legenda">
      <strong>Vencimento</strong>, <strong>Dias em Atraso</strong> e <strong>Situação</strong> são colunas de fórmula da planilha e permanecem bloqueadas.<br>
      A <strong>Competência</strong> segue a regra do Excel: em <span class="calc">roxo</span> ela vem da fórmula
      <code>=SE(Data=""; ""; DATA(ANO(Data); MÊS(Data); 1))</code>. Digitar um mês/ano sobrescreve a fórmula — útil para lançar
      competências futuras sem data de pagamento; apagar devolve o automático.
    </p>`;
}

/* =========================================================== FINANCEIRO 2026 */

function abaFin2026() {
  const f = estado.dados.financeiro2026;
  const c = estado.calc.calc2026;

  const premissa = (rotulo, chave, valor) => `
    <div class="item">
      <label style="font-size:12.5px;align-self:center">${esc(rotulo)}</label>
      <input class="num" style="max-width:110px" data-acao="premissa26" data-campo="${esc(chave)}"
             value="${esc(paraEntrada((valor * 100).toFixed(2).replace(/\.?0+$/, '')))}" title="Percentual. Digite 6 para 6%.">
    </div>`;

  const linhaReceitaBase = `<tr>
    <th>Receita base / projeção</th>
    ${MESES.map((_, i) => {
      const automatico = c.receitaBaseAutomatica[i];
      return `<td class="num"><input class="num" data-acao="receitaBase" data-mes="${i}"
        value="${esc(automatico ? '' : paraEntrada(f.receitaBase[i]))}"
        placeholder="${esc(paraEntrada(Number(c.mediaBase.toFixed(2))))}"
        style="${automatico ? 'color:var(--calculado);font-weight:600' : ''}"
        title="${automatico ? 'Automático: MÉDIA(Janeiro:Julho) = ' + moeda(c.mediaBase) + '. Digite um valor para sobrescrever.' : 'Valor digitado. Apague para voltar à média automática.'}"></td>`;
    }).join('')}
  </tr>`;

  return `
    <section class="cartao">
      <header>PREMISSAS <span style="font-weight:400;font-size:11.5px">campos pretos da planilha — editáveis</span></header>
      <div class="corpo">
        <div class="lista-opcoes" style="max-width:420px">
          ${premissa('Simples Nacional (% sobre a receita)', 'simplesNacional', f.premissas.simplesNacional)}
          ${premissa('Crescimento de receita 2027 (%)', 'crescimentoReceita2027', f.premissas.crescimentoReceita2027)}
          ${premissa('Inflação de custos 2027 (%)', 'inflacaoCustos2027', f.premissas.inflacaoCustos2027)}
        </div>
      </div>
    </section>

    <div class="barra-acoes">
      <button class="botao" data-acao="nova-despesa26">+ Nova linha de despesa</button>
      <span class="espaco"></span>
    </div>

    <section class="cartao">
      <header class="escuro">FINANCEIRO ${c.ano} | ESCOLA</header>
      <div class="corpo sem-espaco"><div class="rolagem"><table>
        ${cabecalhoMeses()}
        <tbody>
          ${linhaCalculada('Alunos ativos', c.alunosAtivos, inteiro, '', 'CONT.SES(Status;"Ativo"; Data Matrícula;"<="&FIMMÊS(mês;0))')}
          <tr class="linha-secao receita"><td colspan="13">RECEITAS</td></tr>
          ${linhaCalculada('Mensalidades + aulas remarcadas (automático)', c.recebido, moeda, '', 'SOMASES(Pagamentos[Valor]; Data do Pagamento; dentro do mês)')}
          ${linhaReceitaBase}
          ${linhaEditavel('Outras receitas', f.outrasReceitas, 'outrasReceitas26', { acao: 'outrasReceitas26' })}
          ${linhaCalculada('RECEITA CONSIDERADA', c.receitaConsiderada, moeda, 'linha-total', '=SE(Recebido>0; Recebido; Base) + Outras receitas')}
          <tr class="linha-secao"><td colspan="13">DESPESAS</td></tr>
          ${c.despesas.map(d => d.calculada
            ? linhaCalculada(d.nome, d.valoresCalculados, moeda, '', '=RECEITA CONSIDERADA × ' + percentual(f.premissas.simplesNacional))
            : linhaEditavel(d.nome, d.valores, 'despesa26', { acao: 'despesa26', id: d.id, removivel: true, renomeavel: true })
          ).join('')}
          ${linhaCalculada('DESPESA TOTAL', c.despesaTotal, moeda, 'linha-total', '=SOMA das linhas de despesa')}
          ${linhaCalculada('LUCRO / PREJUÍZO', c.lucro, moeda, 'linha-lucro', '=RECEITA CONSIDERADA − DESPESA TOTAL')}
          ${linhaCalculada('MARGEM LÍQUIDA', c.margem, percentual, '', '=SEERRO(Lucro ÷ Receita considerada; 0)')}
          ${linhaCalculada('PONTO DE EQUILÍBRIO', c.pontoEquilibrio, moeda, '', '=DESPESA TOTAL')}
        </tbody>
      </table></div></div>
    </section>
    ${LEGENDA_CORES}
    <p class="legenda">
      <strong>Receita base / projeção</strong> é linha preta (editável). Os meses deixados em branco reproduzem a fórmula original
      <code>=MÉDIA(Janeiro:Julho)</code>, hoje ${moeda(c.mediaBase)}; digitar um valor sobrescreve a média, apagar devolve o automático.<br>
      <strong>Simples Nacional</strong> é linha de fórmula e não aceita digitação — ajuste o percentual em Premissas.
    </p>`;
}

/* ========================================================== CONTA PESSOAL */

function abaContaPessoal() {
  const cp = estado.dados.contaPessoal2026;
  const c = estado.calc.contaPessoal;
  const nomesOrigem = (cp.rendaOrigem || [])
    .map(id => (estado.calc.calc2026.despesas.find(d => d.id === id) || {}).nome)
    .filter(Boolean);

  const somaAno = v => v.reduce((s, x) => s + x, 0);

  return `
    <div class="kpis">
      ${kpi('verde', 'Renda do ano', moeda(c.totais.renda), nomesOrigem.join(' + ') + ' (Financeiro 2026)')}
      ${kpi('azul', 'Despesas do ano', moeda(c.totais.totalDespesas), 'Soma das despesas pessoais')}
      ${kpi('amarelo', 'Sobra do ano', moeda(c.totais.sobra), 'Renda − despesas', c.totais.sobra)}
      ${kpi('marinho', 'Taxa de poupança', percentual(c.totais.taxaPoupanca), 'Sobra ÷ renda', c.totais.taxaPoupanca)}
    </div>

    <div class="barra-acoes">
      <button class="botao" data-acao="nova-despesa-cp">+ Nova despesa pessoal</button>
      <span class="espaco"></span>
    </div>

    <section class="cartao">
      <header class="escuro">CONTA PESSOAL ${cp.ano || 2026}</header>
      <div class="corpo sem-espaco"><div class="rolagem"><table>
        ${cabecalhoMeses('Total Ano')}
        <tbody>
          <tr class="linha-calculada">
            <th>Renda (${esc(nomesOrigem.join(' + '))})<span class="cadeado" title="Vem das linhas correspondentes do Financeiro 2026">🔒</span></th>
            ${c.renda.map(v => `<td class="num ${classeSinal(v)}">${moeda(v)}</td>`).join('')}
            <td class="num calc">${moeda(c.totais.renda)}</td>
          </tr>
          <tr class="linha-secao"><td colspan="14">DESPESAS PESSOAIS</td></tr>
          ${c.despesas.map(d => linhaEditavel(d.nome, d.valores, 'despesaCP', {
            acao: 'despesaCP', id: d.id, removivel: true, renomeavel: true, totalAno: d.totalAno,
          })).join('')}
          <tr class="linha-total linha-calculada">
            <th>TOTAL DESPESAS<span class="cadeado" title="=SOMA das linhas acima">🔒</span></th>
            ${c.totalDespesas.map(v => `<td class="num calc">${moeda(v)}</td>`).join('')}
            <td class="num calc">${moeda(c.totais.totalDespesas)}</td>
          </tr>
          <tr class="linha-lucro linha-calculada">
            <th>SOBRA<span class="cadeado" title="=Renda − Total despesas">🔒</span></th>
            ${c.sobra.map(v => `<td class="num ${classeSinal(v)}">${moeda(v)}</td>`).join('')}
            <td class="num ${classeSinal(c.totais.sobra)}">${moeda(c.totais.sobra)}</td>
          </tr>
          <tr class="linha-calculada">
            <th>TAXA DE POUPANÇA<span class="cadeado" title="=SEERRO(Sobra ÷ Renda; 0)">🔒</span></th>
            ${c.taxaPoupanca.map(v => `<td class="num ${classeSinal(v)}">${percentual(v)}</td>`).join('')}
            <td class="num ${classeSinal(c.totais.taxaPoupanca)}">${percentual(c.totais.taxaPoupanca)}</td>
          </tr>
        </tbody>
      </table></div></div>
    </section>
    ${LEGENDA_CORES}
    <p class="legenda">A linha <strong>Renda</strong> é fórmula: soma as linhas ${esc(nomesOrigem.join(' e '))} do Financeiro 2026. Para alterá-la, edite aquelas linhas na aba Financeiro 2026.</p>`;
}

/* =========================================================== FINANCEIRO 2027 */

function abaFin2027() {
  const f27 = estado.dados.financeiro2027;
  const c = estado.calc.calc2027;
  const c26 = estado.calc.calc2026;

  const premissa = (rotulo, chave, valor) => `
    <div class="item">
      <label style="font-size:12.5px;align-self:center">${esc(rotulo)}</label>
      <input class="num" style="max-width:110px" data-acao="premissa27" data-campo="${esc(chave)}"
             value="${esc(paraEntrada((valor * 100).toFixed(2).replace(/\.?0+$/, '')))}" title="Percentual. Digite 8 para 8%.">
    </div>`;

  const projetadas = c26.despesas.filter(d => !d.calculada).map(d => `
    <label style="display:flex;gap:8px;align-items:center;font-size:12.5px;padding:3px 0">
      <input type="checkbox" style="width:auto" data-acao="projetar2027" data-id="${esc(d.id)}" ${d.em2027 !== false ? 'checked' : ''}>
      ${esc(d.nome)}
    </label>`).join('');

  return `
    <section class="cartao">
      <header>PREMISSAS DA PROJEÇÃO <span style="font-weight:400;font-size:11.5px">campos pretos — editáveis</span></header>
      <div class="corpo">
        <div class="grade-2">
          <div class="lista-opcoes">
            ${premissa('Simples Nacional (%)', 'simplesNacional', f27.premissas.simplesNacional)}
            ${premissa('Crescimento de receita sobre 2026 (%)', 'crescimentoReceita', f27.premissas.crescimentoReceita)}
            ${premissa('Inflação de custos sobre 2026 (%)', 'inflacaoCustos', f27.premissas.inflacaoCustos)}
          </div>
          <div>
            <p style="font-size:12.5px;margin:0 0 6px;color:var(--texto-suave)">Linhas de despesa de 2026 incluídas na projeção de 2027:</p>
            ${projetadas}
          </div>
        </div>
      </div>
    </section>

    <section class="cartao">
      <header class="escuro">FINANCEIRO ${c.ano} | ORÇAMENTO E PROJEÇÃO</header>
      <div class="corpo sem-espaco"><div class="rolagem"><table>
        ${cabecalhoMeses()}
        <tbody>
          ${linhaCalculada('Alunos ativos', c.alunosAtivos, inteiro, '', 'CONT.SES(Status;"Ativo"; Data Matrícula;"<="&FIMMÊS(mês;0))')}
          <tr class="linha-secao receita"><td colspan="13">RECEITAS</td></tr>
          ${linhaCalculada('Mensalidades + aulas remarcadas (automático)', c.recebido, moeda, '', 'SOMASES sobre os pagamentos de ' + c.ano)}
          ${linhaCalculada('Receita base / projeção', c.receitaBase, moeda, '', '=Receita considerada 2026 × (1 + crescimento)')}
          ${linhaEditavel('Outras receitas', f27.outrasReceitas, 'outrasReceitas27', { acao: 'outrasReceitas27' })}
          ${linhaCalculada('RECEITA CONSIDERADA', c.receitaConsiderada, moeda, 'linha-total', '=SE(Recebido>0; Recebido; Base) + Outras receitas')}
          <tr class="linha-secao"><td colspan="13">DESPESAS</td></tr>
          ${c.despesas.map(d => linhaCalculada(
            d.nome, d.valoresCalculados, moeda, '',
            d.calculada ? '=RECEITA CONSIDERADA × ' + percentual(f27.premissas.simplesNacional)
                        : '=' + d.nome + ' de 2026 × (1 + inflação)')).join('')}
          ${linhaCalculada('DESPESA TOTAL', c.despesaTotal, moeda, 'linha-total', '=SOMA das linhas de despesa')}
          ${linhaCalculada('LUCRO / PREJUÍZO', c.lucro, moeda, 'linha-lucro', '=RECEITA CONSIDERADA − DESPESA TOTAL')}
          ${linhaCalculada('MARGEM LÍQUIDA', c.margem, percentual, '', '=SEERRO(Lucro ÷ Receita considerada; 0)')}
          ${linhaCalculada('PONTO DE EQUILÍBRIO', c.pontoEquilibrio, moeda, '', '=DESPESA TOTAL')}
        </tbody>
      </table></div></div>
    </section>
    ${LEGENDA_CORES}
    <p class="legenda">Todas as despesas de 2027 são projetadas a partir de 2026 — por isso aparecem em roxo e bloqueadas, exatamente como na planilha.
    Para alterar um valor de 2027, ajuste a linha correspondente em Financeiro 2026 ou mude as premissas acima.</p>`;
}

/* ============================================================== RELATÓRIOS */

/** Colunas de cada relatório: rótulo, valor na tela e valor no CSV. */
function colunasDoRelatorio(tipo) {
  const dinheiro = campo => ({ num: true, valor: l => moeda(l[campo]), csv: l => (l[campo] ?? 0).toFixed(2).replace('.', ',') });
  const pct = campo => ({ num: true, valor: l => percentual(l[campo]), csv: l => (l[campo] * 100).toFixed(1).replace('.', ',') + '%' });
  const dias = campo => ({ num: true, valor: l => l[campo] ? inteiro(Math.round(l[campo])) + ' d' : '—', csv: l => Math.round(l[campo] || 0) });

  const colunasLancamento = [
    { rotulo: 'Aluno', valor: l => esc(l.aluno || '—'), csv: l => l.aluno || '' },
    { rotulo: 'Competência', valor: l => esc(competenciaBR(l.competencia) || '—'), csv: l => competenciaBR(l.competencia) },
    { rotulo: 'Data do Pagamento', valor: l => esc(dataBR(l.dataPagamento) || '—'), csv: l => dataBR(l.dataPagamento) },
    { rotulo: 'Vencimento', valor: l => esc(dataBR(l.dataVencimento) || '—'), csv: l => dataBR(l.dataVencimento) },
    { rotulo: 'Valor', ...dinheiro('valor') },
    { rotulo: 'Tipo', valor: l => esc(l.tipo || '—'), csv: l => l.tipo || '' },
    { rotulo: 'Forma', valor: l => esc(l.forma || '—'), csv: l => l.forma || '' },
    { rotulo: 'Professor', valor: l => esc(l.professor || '—'), csv: l => l.professor || '' },
    { rotulo: 'Atraso', num: true, valor: l => l.diasAtraso === '' ? '—' : inteiro(l.diasAtraso) + ' d', csv: l => l.diasAtraso === '' ? '' : l.diasAtraso },
    { rotulo: 'Situação', valor: l => `<span class="${corSituacaoTexto(l.situacao)}">${esc(l.situacao)}</span>`, csv: l => l.situacao },
  ];

  const mapa = {
    lancamentos: colunasLancamento,
    aVencer: colunasLancamento,
    emAtraso: colunasLancamento,

    porAluno: [
      { rotulo: 'Aluno', valor: l => esc(l.nome), csv: l => l.nome },
      { rotulo: 'Plano', valor: l => esc(l.plano || '—'), csv: l => l.plano || '' },
      { rotulo: 'Professor', valor: l => esc(l.professor || '—'), csv: l => l.professor || '' },
      { rotulo: 'Status', valor: l => esc(l.status || '—'), csv: l => l.status || '' },
      { rotulo: 'Mensalidade', ...dinheiro('valorMensal') },
      { rotulo: 'Lançamentos', num: true, valor: l => inteiro(l.lancamentos), csv: l => l.lancamentos },
      { rotulo: 'Recebido', ...dinheiro('recebido') },
      { rotulo: 'Em aberto', ...dinheiro('emAberto') },
      { rotulo: 'Em atraso', num: true, valor: l => inteiro(l.emAtraso), csv: l => l.emAtraso },
      { rotulo: 'Pontualidade', ...pct('pontualidade') },
    ],

    mensal: [
      { rotulo: 'Mês', valor: l => esc(rotuloMes(l.mes)), csv: l => rotuloMes(l.mes) },
      { rotulo: 'Lançamentos', num: true, valor: l => inteiro(l.lancamentos), csv: l => l.lancamentos },
      { rotulo: 'Recebido', ...dinheiro('recebido') },
      { rotulo: 'Em aberto', ...dinheiro('emAberto') },
      { rotulo: 'A vencer', num: true, valor: l => inteiro(l.aVencer), csv: l => l.aVencer },
      { rotulo: 'Em atraso', num: true, valor: l => inteiro(l.emAtraso), csv: l => l.emAtraso },
      { rotulo: 'Ticket médio', ...dinheiro('ticketMedio') },
      { rotulo: 'Pontualidade', ...pct('pontualidade') },
    ],

    inadimplencia: [
      { rotulo: 'Aluno', valor: l => `${esc(l.nome)}${atrasaSempre(l) ? ' <span class="selo-atraso">atrasa sempre</span>' : ''}`, csv: l => l.nome },
      { rotulo: 'Professor', valor: l => esc(l.professor || '—'), csv: l => l.professor || '' },
      { rotulo: 'Cobranças', num: true, valor: l => inteiro(l.lancamentos), csv: l => l.lancamentos },
      { rotulo: 'Vezes que atrasou', num: true, valor: l => inteiro(l.vezesAtrasou), csv: l => l.vezesAtrasou },
      { rotulo: 'Recorrência', ...pct('recorrencia') },
      { rotulo: 'Atraso médio', ...dias('atrasoMedio') },
      { rotulo: 'Atraso máximo', ...dias('atrasoMaximo') },
      { rotulo: 'Em aberto', ...dinheiro('emAberto') },
    ],
  };
  return mapa[tipo] || colunasLancamento;
}

const corSituacaoTexto = s =>
  (s === 'Em dia' || s === 'A vencer') ? 'positivo' : (s === 'Em atraso' || s === 'Pago com atraso' ? 'negativo' : 'calc');

function rotuloMes(chave) {
  if (!chave || chave === '(sem data)') return 'Sem data';
  const [ano, mes] = chave.split('-');
  return `${MESES[Number(mes) - 1]} ${ano}`;
}

/** Lista já filtrada e agrupada conforme o relatório escolhido. */
function montarRelatorio() {
  const { tipo, filtros } = estado.relatorio;
  const todos = estado.calc.pagamentosCalc;
  let lista = aplicarFiltros(todos, filtros);

  if (tipo === 'aVencer') lista = lista.filter(p => p.situacao === 'A vencer');
  if (tipo === 'emAtraso') lista = lista.filter(p => p.situacao === 'Em atraso');

  const resumo = resumoDoRecorte(lista);
  let linhas;
  if (tipo === 'porAluno') {
    linhas = consolidarPorAluno(lista, estado.dados.alunos)
      .sort((a, b) => b.recebido - a.recebido || a.nome.localeCompare(b.nome, 'pt-BR'));
  } else if (tipo === 'mensal') {
    linhas = consolidarPorMes(lista, filtros.base);
  } else if (tipo === 'inadimplencia') {
    linhas = rankingInadimplencia(lista, estado.dados.alunos);
  } else {
    linhas = [...lista].sort((a, b) =>
      (b.dataPagamento || b.dataVencimento || '').localeCompare(a.dataPagamento || a.dataVencimento || ''));
  }
  return { lista, linhas, resumo, colunas: colunasDoRelatorio(tipo) };
}

function abaRelatorios() {
  const { tipo, filtros, expandido } = estado.relatorio;
  const { linhas, resumo, colunas } = montarRelatorio();
  const definicao = TIPOS_RELATORIO.find(t => t.id === tipo) || TIPOS_RELATORIO[0];

  const seletor = (campo, rotulo, opcoes, vazio) => `
    <label class="filtro">
      <span>${esc(rotulo)}</span>
      <select data-acao="filtro-relatorio" data-campo="${campo}">
        <option value="">${esc(vazio)}</option>
        ${opcoes.map(o => `<option value="${esc(o)}"${filtros[campo] === o ? ' selected' : ''}>${esc(o)}</option>`).join('')}
      </select>
    </label>`;

  const nomesAlunos = [...new Set(estado.dados.alunos.map(a => a.nome).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const filtrosAtivos = Object.entries(filtros).filter(([k, v]) => v && v !== FILTROS_PADRAO[k]).length;

  const permiteExpandir = tipo === 'inadimplencia' || tipo === 'porAluno';

  const corpo = linhas.length
    ? linhas.map(l => {
        const chave = l.nome || l.id || '';
        const aberto = permiteExpandir && expandido === chave;
        const principal = `<tr class="${aberto ? 'linha-aberta' : ''}${permiteExpandir ? ' clicavel' : ''}"
             ${permiteExpandir ? `data-acao="expandir-relatorio" data-chave="${esc(chave)}"` : ''}>
          ${colunas.map((c, i) => `<td class="${c.num ? 'num' : ''}">${i === 0 && permiteExpandir ? `<span class="seta-expandir">${aberto ? '▾' : '▸'}</span>` : ''}${c.valor(l)}</td>`).join('')}
        </tr>`;
        if (!aberto) return principal;
        const historico = (l.itens || []).slice().sort((a, b) =>
          (b.competencia || b.dataVencimento || '').localeCompare(a.competencia || a.dataVencimento || ''));
        return principal + `<tr class="linha-historico"><td colspan="${colunas.length}">
          <div class="historico">
            <strong>Histórico de ${esc(l.nome)}</strong>
            <table>
              <thead><tr><th>Competência</th><th>Vencimento</th><th>Pagamento</th><th class="num">Valor</th><th class="num">Atraso</th><th>Situação</th><th>Observação</th></tr></thead>
              <tbody>${historico.map(h => `<tr>
                <td>${esc(competenciaBR(h.competencia) || '—')}</td>
                <td>${esc(dataBR(h.dataVencimento) || '—')}</td>
                <td>${esc(dataBR(h.dataPagamento) || '—')}</td>
                <td class="num">${moeda(h.valor)}</td>
                <td class="num ${Number(h.diasAtraso) > 0 ? 'negativo' : ''}">${h.diasAtraso === '' ? '—' : inteiro(h.diasAtraso) + ' d'}</td>
                <td class="${corSituacaoTexto(h.situacao)}">${esc(h.situacao)}</td>
                <td>${esc(h.observacao || '')}</td>
              </tr>`).join('')}</tbody>
            </table>
          </div></td></tr>`;
      }).join('')
    : `<tr><td colspan="${colunas.length}" class="vazio">Nenhum registro para os filtros escolhidos.</td></tr>`;

  return `
    <section class="cartao nao-imprimir">
      <header>FILTROS ${filtrosAtivos ? `<span class="marcador">${filtrosAtivos} ativo(s)</span>` : ''}</header>
      <div class="corpo">
        <div class="grade-filtros">
          <label class="filtro">
            <span>Data de referência</span>
            <select data-acao="filtro-relatorio" data-campo="base">
              ${BASES_DATA.map(b => `<option value="${b.id}"${filtros.base === b.id ? ' selected' : ''}>${esc(b.rotulo)}</option>`).join('')}
            </select>
          </label>
          ${seletor('ano', 'Ano', anosDisponiveis(estado.calc.pagamentosCalc), 'Todos')}
          <label class="filtro"><span>De</span><input type="date" data-acao="filtro-relatorio" data-campo="de" value="${esc(filtros.de)}"></label>
          <label class="filtro"><span>Até</span><input type="date" data-acao="filtro-relatorio" data-campo="ate" value="${esc(filtros.ate)}"></label>
          ${seletor('aluno', 'Aluno', nomesAlunos, 'Todos')}
          ${seletor('professor', 'Professor', estado.dados.opcoes.professores || [], 'Todos')}
          ${seletor('situacao', 'Situação', SITUACOES_RELATORIO, 'Todas')}
          ${seletor('tipo', 'Tipo', estado.dados.opcoes.tiposPagamento || [], 'Todos')}
          ${seletor('forma', 'Forma', estado.dados.opcoes.formasPagamento || [], 'Todas')}
          <label class="filtro"><span>Valor mínimo</span><input class="num" data-acao="filtro-relatorio" data-campo="valorMin" value="${esc(filtros.valorMin)}" placeholder="0,00"></label>
          <label class="filtro"><span>Valor máximo</span><input class="num" data-acao="filtro-relatorio" data-campo="valorMax" value="${esc(filtros.valorMax)}" placeholder="0,00"></label>
          <div class="filtro"><span>&nbsp;</span><button class="botao claro" data-acao="limpar-filtros">Limpar filtros</button></div>
        </div>
      </div>
    </section>

    <div class="tipos-relatorio nao-imprimir">
      ${TIPOS_RELATORIO.map(t => `<button class="${t.id === tipo ? 'ativo' : ''}" data-acao="tipo-relatorio" data-tipo="${t.id}" title="${esc(t.ajuda)}">${esc(t.rotulo)}</button>`).join('')}
    </div>

    <div class="kpis">
      ${kpi('azul', 'Lançamentos no recorte', inteiro(resumo.lancamentos), definicao.ajuda)}
      ${kpi('verde', 'Recebido', moeda(resumo.recebido), 'Lançamentos com data de pagamento', resumo.recebido)}
      ${kpi('amarelo', 'Em aberto', moeda(resumo.emAberto), inteiro(resumo.aVencer) + ' a vencer · ' + inteiro(resumo.emAtraso) + ' em atraso')}
      ${kpi('vermelho', 'Em atraso', moeda(resumo.valorEmAtraso), 'Atraso médio de ' + inteiro(Math.round(resumo.atrasoMedio)) + ' dia(s)', -resumo.valorEmAtraso || 0)}
    </div>

    <section class="cartao">
      <header class="escuro">
        ${esc(definicao.rotulo.toUpperCase())} — ${inteiro(linhas.length)} LINHA(S)
        <span class="acoes-relatorio nao-imprimir">
          <button class="botao claro mini" data-acao="exportar-csv">⭳ Baixar CSV</button>
          <button class="botao claro mini" data-acao="imprimir">🖨 Imprimir</button>
        </span>
      </header>
      <div class="corpo sem-espaco"><div class="rolagem"><table>
        <thead><tr>${colunas.map(c => `<th class="${c.num ? 'num' : ''}">${esc(c.rotulo)}</th>`).join('')}</tr></thead>
        <tbody>${corpo}</tbody>
      </table></div></div>
    </section>

    <p class="legenda">
      ${esc(definicao.ajuda)}
      ${permiteExpandir ? ' Clique em uma linha para abrir o histórico completo do aluno.' : ''}<br>
      <strong>Recebido</strong> conta apenas lançamentos com Data do Pagamento; <strong>em aberto</strong> são os que ainda não têm data.
      A <strong>recorrência</strong> é a proporção de cobranças com vencimento em que o aluno atrasou, e o selo
      <span class="selo-atraso">atrasa sempre</span> marca quem atrasou em metade ou mais delas, com pelo menos duas ocorrências.
    </p>`;
}

/* ========================================================= TELA DO PROFESSOR */

/** Campo de uma linha de aula/remarcação/experimental/dados das aulas. */
function campoProfessor(registro, campo, conjunto, id) {
  const valor = registro[campo.chave];
  const base = `data-acao="campo-professor" data-conjunto="${esc(conjunto)}" data-id="${esc(id)}" data-campo="${esc(campo.chave)}"`;
  // Linha marcada como Status = Remarcação: "Aula feita" fica travado — quem conta como
  // feita ali é a linha correspondente na aba Remarcações (campo "Aula feita", chave "ativa").
  if (conjunto === 'aulas' && campo.chave === 'aulaFeita' && registro.status === 'Remarcação' && professorDaAba() === PROFESSOR_COM_CONTADOR_MENSAL) {
    return `<select disabled title="Marcada como Remarcação — para contar como aula feita, marque Aula feita = Sim na aba Remarcações">
      <option>${esc(valor || 'Não')}</option>
    </select>`;
  }
  if (campo.diasMultiplos) {
    const marcados = diasMarcados(valor);
    return `<button type="button" class="campo-seletor" data-acao="abrir-seletor" data-tipo="diasAula"
              data-conjunto="${esc(conjunto)}" data-id="${esc(id)}" data-campo="${esc(campo.chave)}" title="Escolher os dias da semana">
        <span class="campo-seletor-texto ${marcados.length ? '' : 'sem-valor'}">${esc(marcados.length ? marcados.join(', ') : 'Selecionar dias')}</span>
        <span class="campo-seletor-icone">📅</span>
      </button>`;
  }
  if (campo.listaAlunos) {
    const nomes = alunosDoProfessorAtual().map(a => a.nome);
    const desconhecido = valor && !nomes.includes(valor);
    return `<select ${base}><option value=""></option>
      ${nomes.map(nm => `<option${nm === valor ? ' selected' : ''}>${esc(nm)}</option>`).join('')}
      ${desconhecido ? `<option selected>${esc(valor)}</option>` : ''}</select>`;
  }
  // Texto livre (digita o nome à mão), com sugestão dos alunos já cadastrados
  // — diferente de listaAlunos, aqui não é obrigatório escolher um da lista.
  if (campo.autocompleteAlunos) {
    return `<input ${base} list="lista-nomes-alunos-professor" value="${esc(valor || '')}" autocomplete="off" placeholder="Digite o nome">`;
  }
  if (campo.lista || campo.listaGlobal) {
    // listaGlobal lê a lista de Listas e opções (ex.: Status), em vez de uma lista fixa —
    // assim o Cadastro de alunos e as telas de professor sempre mostram as mesmas opções
    const opcoesLista = campo.listaGlobal ? (estado.dados.opcoes[campo.listaGlobal] || []) : campo.lista;
    const desconhecido = valor && !opcoesLista.includes(valor);
    return `<select ${base}><option value=""></option>
      ${opcoesLista.map(o => `<option${o === valor ? ' selected' : ''}>${esc(o)}</option>`).join('')}
      ${desconhecido ? `<option selected>${esc(valor)}</option>` : ''}</select>`;
  }
  if (campo.data) return `<input type="date" ${base} value="${esc(valor || '')}">`;
  if (campo.hora) return `<input type="time" ${base} value="${esc(valor || '')}">`;
  if (campo.mes) return `<input type="month" ${base} value="${esc((valor || '').slice(0, 7))}">`;
  if (campo.numero) return `<input class="num" ${base} value="${esc(paraEntrada(valor))}">`;
  return `<input ${base} value="${esc(valor || '')}">`;
}

function professorDaAba() {
  return (ABAS_PROFESSOR.find(a => a.id === estado.aba) || {}).professor || '';
}

const CAMPOS_NUMERICOS_PROFESSOR = ['valor', 'nApresentacao', 'pagSlide', 'qtdAula', 'qtdAulas', 'bancoHoras', 'mensalidade', 'ano', 'valorMesSeguinte'];

/**
 * Grava um campo de uma linha da tela do professor.
 * A linha só existe de verdade a partir da primeira edição: até lá ela é
 * apenas o aluno do cadastro sendo mostrado. Como cada registro carrega o
 * campo `professor`, uma tela nunca alcança a linha da outra.
 */
function gravarCampoProfessor(conjunto, chave, campo, valor, redesenhar = true) {
  const conteudo = CAMPOS_NUMERICOS_PROFESSOR.includes(campo) ? parseNumero(valor) : valor;
  const professor = professorDaAba();
  let valorAnterior;

  alterar(conjunto, lista => {
    if (chave.startsWith('aluno:')) {
      const alunoId = chave.slice('aluno:'.length);
      let registro = lista.find(x => x.alunoId === alunoId && String(x.professor || '') === professor);
      if (!registro) {
        const cadastro = estado.dados.alunos.find(a => a.id === alunoId) || {};
        registro = {
          id: novoId('au'), professor, alunoId,
          aluno: cadastro.nome || '', dia: cadastro.dias || '',
          horario: cadastro.horario || '', status: cadastro.status || '',
        };
        lista.push(registro);
      }
      valorAnterior = registro[campo];
      registro[campo] = conteudo;
    } else {
      // só alcança linhas do professor desta tela
      const registro = lista.find(x => x.id === chave && String(x.professor || '') === professor);
      if (registro) {
        valorAnterior = registro[campo];
        registro[campo] = conteudo;
      }
    }
  }, redesenhar);

  // "Aulas do mês" (só Olivia): marcar/desmarcar "Aula feita" numa linha normal soma
  // ou tira 1 do total do mês corrente (origem "normal"); marcar/desmarcar "Aula feita"
  // (chave "ativa") numa linha de Remarcações faz o mesmo, mas com origem "remarcacao" —
  // nenhum dos dois pede senha, é só o reflexo automático de uma edição que o(a)
  // próprio(a) professor(a) já pode fazer.
  if (conjunto === 'aulas' && campo === 'aulaFeita' && professor === PROFESSOR_COM_CONTADOR_MENSAL) {
    const eraFeita = valorAnterior === 'Sim';
    const ficouFeita = conteudo === 'Sim';
    if (eraFeita !== ficouFeita) ajustarContagemMensal(professor, ficouFeita ? 1 : -1, 'normal');
  }
  else if (conjunto === 'remarcacoes' && campo === 'ativa' && professor === PROFESSOR_COM_CONTADOR_MENSAL) {
    const eraAtiva = valorAnterior === 'Sim';
    const ficouAtiva = conteudo === 'Sim';
    if (eraAtiva !== ficouAtiva) ajustarContagemMensal(professor, ficouAtiva ? 1 : -1, 'remarcacao');
  }
}

async function ajustarContagemMensal(professor, delta, origem) {
  try {
    const r = await fetch('/api/contagem-aulas/incrementar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professor, delta, origem }),
    });
    if (!r.ok) return;
    const resposta = await r.json().catch(() => ({}));
    if (resposta && resposta.registro) {
      const lista = estado.dados.contagemAulas || (estado.dados.contagemAulas = []);
      const i = lista.findIndex(x => x.professor === resposta.registro.professor && Number(x.ano) === Number(resposta.registro.ano) && Number(x.mes) === Number(resposta.registro.mes));
      if (i >= 0) lista[i] = resposta.registro; else lista.push(resposta.registro);
      desenhar();
    }
  } catch (e) {
    // silencioso: o polling de atualização eventualmente sincroniza mesmo se a chamada falhar agora
  }
}
function alunosDoProfessorAtual() {
  return estado.dados.alunos.filter(a => String(a.professor || '') === professorDaAba());
}

function abaProfessor(professor) {
  const subabas = subabasDe(professor);
  if (!subabas.some(s => s.id === estado.subaba)) estado.subaba = subabas[0].id;
  const subaba = estado.subaba;
  const campos = camposDaSubaba(subaba, professor);
  const conjunto = CONJUNTO_DA_SUBABA[subaba];

  const navegacao = `<div class="tipos-relatorio">
    ${subabas.map(s => `<button class="${s.id === subaba ? 'ativo' : ''}" data-acao="subaba-professor" data-subaba="${s.id}">${esc(s.rotulo)}</button>`).join('')}
  </div>`;

  if (subaba === 'aulas') return navegacao + telaAulas(professor, campos);

  // Remarcações e Aula experimental: ordenadas só por horário (não por dia da semana,
  // já que aqui cada linha é um encontro numa data específica) e com filtro de mês.
  // Remarcações também tem filtro de dia da semana — os dois se combinam (ex.: Agosto + Quinta).
  const temFiltroMes = subaba === 'remarcacoes' || subaba === 'experimental';
  const temFiltroDia = subaba === 'remarcacoes';
  let linhas = estado.dados[conjunto].filter(x => String(x.professor || '') === professor);
  if (temFiltroMes && estado.mesFiltroProfessor) {
    linhas = linhas.filter(r => mesDoRegistroProfessor(subaba, r) === estado.mesFiltroProfessor);
  }
  if (temFiltroDia && estado.diaFiltroRemarcacao) {
    linhas = linhas.filter(r => r.diaSemana === estado.diaFiltroRemarcacao);
  }
  linhas = temFiltroMes ? ordenarPorHorario(linhas, 'horario') : ordenarPorDiaEHorario(linhas, 'diaSemana', 'horario');

  const filtroMes = temFiltroMes ? `<div class="filtro-dias" style="margin-bottom:14px">
    <button class="${estado.mesFiltroProfessor === '' ? 'ativo' : ''}" data-acao="filtro-mes-professor" data-mes="">Todos os meses</button>
    ${MESES.map((m, i) => `<button class="${estado.mesFiltroProfessor === i + 1 ? 'ativo' : ''}" data-acao="filtro-mes-professor" data-mes="${i + 1}">${esc(m.slice(0, 3))}</button>`).join('')}
  </div>` : '';

  const filtroDiaSemana = temFiltroDia ? `<div class="filtro-dias" style="margin-bottom:14px">
    <button class="${estado.diaFiltroRemarcacao === '' ? 'ativo' : ''}" data-acao="filtro-dia-remarcacao" data-dia="">Todos os dias</button>
    ${DIAS_SEMANA.map(d => `<button class="${estado.diaFiltroRemarcacao === d ? 'ativo' : ''}" data-acao="filtro-dia-remarcacao" data-dia="${esc(d)}">${esc(d)}</button>`).join('')}
  </div>` : '';

  const rotuloNovo = { remarcacoes: '+ Nova remarcação', experimental: '+ Nova aula experimental', dadosAulas: '+ Novo mês', bancoDados: '+ Novo registro' }[subaba];
  // Sugestões para o campo Nome (texto livre) — só existe onde algum campo usa autocompleteAlunos.
  const temCampoAutocomplete = campos.some(c => c.autocompleteAlunos);
  const listaSugestoesNomes = temCampoAutocomplete
    ? `<datalist id="lista-nomes-alunos-professor">${alunosDoProfessorAtual().map(a => `<option value="${esc(a.nome)}"></option>`).join('')}</datalist>` : '';

  return navegacao + filtroMes + filtroDiaSemana + listaSugestoesNomes + `
    <div class="barra-acoes">
      <button class="botao" data-acao="novo-registro-professor" data-conjunto="${conjunto}">${esc(rotuloNovo)}</button>
      <span class="espaco"></span>
      <span style="font-size:12.5px;color:var(--texto-suave)">${linhas.length} registro(s)</span>
    </div>
    <section class="cartao">
      <header class="escuro">${esc(subabas.find(s => s.id === subaba).rotulo.toUpperCase())} — ${esc(professor)}</header>
      <div class="corpo sem-espaco"><div class="rolagem"><table>
        <thead><tr>${campos.map(c => `<th style="min-width:${c.largura}px">${esc(c.rotulo)}</th>`).join('')}<th style="width:60px"></th></tr></thead>
        <tbody>
          ${linhas.length ? linhas.map(l => `<tr>
            ${campos.map(c => `<td>${campoProfessor(l, c, conjunto, l.id)}</td>`).join('')}
            <td><button class="botao perigo mini" data-acao="remover-registro-professor" data-conjunto="${conjunto}" data-id="${esc(l.id)}" title="Excluir registro">✕</button></td>
          </tr>`).join('')
          : `<tr><td colspan="${campos.length + 1}" class="vazio">Nenhum registro ainda. Use o botão acima para incluir.</td></tr>`}
        </tbody>
      </table></div></div>
    </section>
    ${LEGENDA_CORES}
    ${subaba === 'bancoDados' ? `<p class="legenda">
      <strong>Aba provisória.</strong> Ainda não recebi a planilha que deveria alimentar este Banco de Dados —
      as colunas acima são genéricas só para você já poder usar a tela. Assim que me mandar o arquivo (ou disser
      qual das outras planilhas é essa), eu troco as colunas para bater exatamente com as dela, sem perder o que
      já estiver preenchido aqui.
    </p>` : ''}`;
}

function telaAulas(professor, campos) {
  const todasDoProfessor = aulasDoProfessor(estado.dados.alunos, estado.dados.aulas, professor);
  const removidas = aulasDoProfessor(estado.dados.alunos, estado.dados.aulas, professor, true)
    .filter(a => a.removida);

  const termo = estado.busca.trim().toLowerCase();
  const CAMPOS_BUSCAVEIS = ['aluno', 'level', 'dia', 'horario', 'status', 'observacao'];
  const todas = termo
    ? todasDoProfessor.filter(a => CAMPOS_BUSCAVEIS.some(c => String(a[c] || '').toLowerCase().includes(termo)))
    : todasDoProfessor;

  const lista = filtrarPorDia(todas, estado.diaFiltro);
  const resumo = resumoDoProfessor(lista);

  const filtroDias = `<div class="filtro-dias">
    <button class="${estado.diaFiltro === '' ? 'ativo' : ''}" data-acao="filtro-dia" data-dia="">Todos os dias</button>
    ${DIAS_SEMANA.map(d => `<button class="${estado.diaFiltro === d ? 'ativo' : ''}" data-acao="filtro-dia" data-dia="${esc(d)}">${esc(d)}</button>`).join('')}
  </div>`;

  const comContadorMensal = professor === PROFESSOR_COM_CONTADOR_MENSAL;
  const graficoMensal = comContadorMensal ? graficoAulasMensais(professor) : '';
  const remarcacoesDoProfessor = comContadorMensal
    ? estado.dados.remarcacoes.filter(r => String(r.professor || '') === professor) : [];
  const graficoRemarcacoes = comContadorMensal
    ? graficoColunas('REMARCAÇÕES POR DIA', remarcacoesPorDia(remarcacoesDoProfessor), { cor: 'var(--amarelo)' }) : '';

  return `
    ${filtroDias}
    <div class="kpis">
      ${comContadorMensal ? '' : kpi('azul', 'Alunos no recorte', inteiro(resumo.total), estado.diaFiltro ? 'Filtrado por ' + estado.diaFiltro : 'Todos os alunos do professor')}
      ${kpi('verde', 'Alunos ativos', inteiro(resumo.ativos), 'Status Ativo no cadastro')}
      ${kpi('amarelo', 'Aulas na semana', inteiro(resumo.aulasSemana), 'Somatório dos dias informados no cadastro')}
      ${comContadorMensal ? '' : kpi('marinho', 'Aulas marcadas como feitas', inteiro(resumo.feitas), inteiro(resumo.scripts) + ' com script feito')}
    </div>

    <div class="grade-graficos" style="margin-bottom:20px">
      ${graficoColunas('ALUNOS POR DIA DA SEMANA', alunosPorDia(todas))}
      ${graficoRosca('ALUNOS POR LEVEL', alunosPorLevel(lista), { centroRotulo: 'alunos' })}
      ${graficoColunas('ALUNOS POR HORÁRIO', alunosPorHorario(lista), { cor: 'var(--roxo-medio)' })}
      ${graficoMensal}
      ${graficoRemarcacoes}
    </div>

    <div class="barra-acoes">
      <button class="botao" data-acao="nova-aula-avulsa">+ Nova linha</button>
      <input class="busca" placeholder="Buscar aluno…" data-acao="busca" value="${esc(estado.busca)}">
      <span class="espaco"></span>
      ${removidas.length ? `<button class="botao claro mini" data-acao="alternar-removidos">${estado.mostrarRemovidos ? 'Ocultar' : 'Mostrar'} removidos (${removidas.length})</button>` : ''}
      <span style="font-size:12.5px;color:var(--texto-suave)">ordenado por dia da semana e horário</span>
    </div>

    <section class="cartao">
      <header class="escuro">AULAS — ${esc(professor)}${estado.diaFiltro ? ' · ' + esc(estado.diaFiltro) : ''} (${inteiro(lista.length)} aluno(s))</header>
      <div class="corpo sem-espaco"><div class="rolagem"><table>
        <thead><tr>${campos.map(c => `<th style="min-width:${c.largura}px">${esc(c.rotulo)}</th>`).join('')}<th style="width:60px"></th></tr></thead>
        <tbody>
          ${lista.length ? lista.map(l => `<tr>
            ${campos.map(c => `<td>${campoProfessor(l, c, 'aulas', l.id || 'aluno:' + l.alunoId)}</td>`).join('')}
            <td><button class="botao perigo mini" data-acao="remover-aluno-professor" data-id="${esc(l.id || 'aluno:' + l.alunoId)}" title="Excluir esta linha da sua lista">✕</button></td>
          </tr>`).join('')
          : `<tr><td colspan="${campos.length + 1}" class="vazio">Nenhum aluno para este filtro.</td></tr>`}
        </tbody>
      </table></div></div>
    </section>

    ${estado.mostrarRemovidos && removidas.length ? `
    <section class="cartao">
      <header>ALUNOS REMOVIDOS DESTA LISTA <span style="font-weight:400;font-size:11.5px">saíram só daqui — o Cadastro de alunos não foi alterado</span></header>
      <div class="corpo sem-espaco"><div class="rolagem"><table>
        <thead><tr><th>Aluno</th><th style="width:110px"></th></tr></thead>
        <tbody>
          ${removidas.map(l => `<tr>
            <td>${esc(l.aluno)}</td>
            <td><button class="botao claro mini" data-acao="restaurar-aluno-professor" data-id="${esc(l.id)}">↺ Restaurar</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div></div>
    </section>` : ''}

    <p class="legenda">
      <strong>Todas as colunas são editáveis e pertencem só a esta tela.</strong> Cada professor tem a própria lista:
      alterar aqui não muda o Cadastro de alunos nem a tela do outro professor.<br>
      As linhas nascem do Cadastro de alunos com nome, dia, horário e status como ponto de partida; a partir da primeira edição
      valem os valores desta tela. Excluir uma linha só a tira <strong>desta lista</strong> — o aluno continua no Cadastro e
      pode ser restaurado a qualquer momento. Use <strong>+ Nova linha</strong> para uma aula que não está no cadastro.
      Valores de mensalidade não aparecem nesta tela.
      ${comContadorMensal ? `<br><strong>Aulas do mês</strong> — marcar "Aula feita" como Sim soma +1 no mês atual (verde);
      voltar para Não tira −1. Quando o Status de uma linha é <strong>Remarcação</strong>, o campo "Aula feita" fica travado —
      quem conta como feita ali é a linha correspondente na aba <strong>Remarcações</strong>, marcando "Aula feita" como Sim
      (some +1 também, mas destacado em amarelo na barra, para diferenciar de onde veio a aula). Os demais meses só têm
      valor quando alguém preenche manualmente. "Editar quantidade do mês" sempre pede usuário e senha do Davi, mesmo que
      quem esteja na tela já seja ele — a sessão de quem está logado não muda, a senha só autoriza aquela correção
      (e reinicia o destaque de remarcação do mês, tratando o valor como um ajuste normal).` : ''}
    </p>`;
}

/**
 * Gráfico "Aulas do mês" (só Olivia): 12 barras, uma por mês. Cada mês soma
 * ou subtrai 1 automaticamente quando uma linha de Aulas muda "Aula feita"
 * (origem normal, verde) ou uma linha de Remarcações muda "Aula feita" (chave
 * "ativa"; origem remarcação, destacada em amarelo dentro da mesma barra);
 * o botão de editar sempre pede login e senha do Davi, mesmo que quem esteja
 * na tela já seja ele.
 */
function graficoAulasMensais(professor) {
  const hoje = paraData(estado.calc.hoje);
  const ano = hoje.getUTCFullYear();
  const overrides = (estado.dados.contagemAulas || []).filter(o => o.professor === professor);
  const serie = aulasMensaisDoProfessor(overrides, ano);

  const botao = `<button class="botao claro mini" data-acao="editar-contagem-mensal" data-professor="${esc(professor)}">✎ Editar quantidade do mês</button>`;
  return graficoColunas(`AULAS DO MÊS — ${ano}`, serie, {
    cor: 'var(--verde)', mostrarMesmoVazio: true, acoesHeader: botao,
    empilhado: true, corSegmento: 'var(--amarelo)', legendaSegmento: 'Remarcação',
  });
}

/**
 * Versão do gráfico "Aulas do mês" para o Davi, usado só no filtro da Visão
 * Geral: ele não tem a contagem acumulada por senha, então o mês corrente é
 * calculado ao vivo a partir de "Aula feita = Sim" nas aulas dele (mesma base
 * do KPI "Aulas marcadas como feitas"); os demais meses ficam em branco.
 */
function graficoAulasFeitasDavi() {
  const hoje = paraData(estado.calc.hoje);
  const ano = hoje.getUTCFullYear();
  const mesCorrente = hoje.getUTCMonth() + 1;
  const listaAulas = aulasDoProfessor(estado.dados.alunos, estado.dados.aulas, 'Davi');
  const aoVivo = contarAulasFeitas(listaAulas);
  const serie = MESES.map((nome, i) => ({
    rotulo: nome.slice(0, 3),
    valor: (i + 1) === mesCorrente ? aoVivo : 0,
  }));
  return graficoColunas(`AULAS DO MÊS — ${ano}`, serie, { cor: 'var(--verde)', mostrarMesmoVazio: true });
}

/**
 * Abre o popup para corrigir manualmente a contagem de aulas de um mês.
 * Quando quem está logado já é admin (o Davi), edita direto. Quando é a
 * própria Olivia, o formulário também pede usuário e senha do Davi — a
 * confirmação é conferida no servidor a cada tentativa, sem trocar a sessão
 * dela: ela continua logada como Olivia o tempo todo.
 */
async function editarContagemMensal(professor) {
  const hoje = paraData(estado.calc.hoje);
  const ano = hoje.getUTCFullYear();
  const mesCorrente = hoje.getUTCMonth() + 1;
  const listaAulas = aulasDoProfessor(estado.dados.alunos, estado.dados.aulas, professor);
  const overrides = (estado.dados.contagemAulas || []).filter(o => o.professor === professor);
  const atual = overrides.find(o => Number(o.ano) === ano && Number(o.mes) === mesCorrente);
  const valorAtual = atual ? atual.valor : contarAulasFeitas(listaAulas);

  const campos = `
    <label class="filtro"><span>Mês</span>
      <select name="mes">${MESES.map((m, i) => `<option value="${i + 1}"${i + 1 === mesCorrente ? ' selected' : ''}>${m} ${ano}</option>`).join('')}</select>
    </label>
    <label class="filtro" style="margin-top:10px"><span>Quantidade de aulas do mês</span>
      <input class="num" name="valor" type="number" min="0" step="1" value="${esc(valorAtual)}" required>
    </label>
    <p style="font-size:11.5px;color:var(--texto-suave);margin:12px 0 4px">Confirme com o login do Davi:</p>
    <label class="filtro"><span>Usuário</span><input name="usuarioConfirmacao" autocomplete="off" required></label>
    <label class="filtro" style="margin-top:10px"><span>Senha</span><input name="senhaConfirmacao" type="password" required></label>
  `;

  await abrirJanelaFormulario({
    titulo: 'Editar quantidade de aulas do mês',
    icone: '✎',
    camposHtml: campos,
    rotuloConfirmar: 'Salvar',
    aoConfirmar: async dados => {
      const corpo = {
        ano, mes: Number(dados.mes), valor: Number(dados.valor), professor,
        usuarioConfirmacao: dados.usuarioConfirmacao,
        senhaConfirmacao: dados.senhaConfirmacao,
      };
      const r = await fetch('/api/contagem-aulas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
      });
      const resposta = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(resposta.erro || 'Não foi possível salvar.');
      await carregar();
      desenhar();
      aviso('Quantidade de aulas do mês atualizada');
    },
  });
}

/* ================================================================== LISTAS */

const LISTAS = [
  { chave: 'planos', titulo: 'Planos', ajuda: 'Usado na coluna Plano do cadastro de alunos.' },
  { chave: 'objetivos', titulo: 'Objetivos da aula', ajuda: 'Usado na coluna Objetivo da Aula e no painel de objetivos do Dashboard.' },
  { chave: 'status', titulo: 'Status do aluno', ajuda: 'Usado na coluna Status. "Ativo" alimenta os indicadores do Dashboard.' },
  { chave: 'tiposPagamento', titulo: 'Tipos de recebimento', ajuda: 'Usado na coluna Tipo dos pagamentos.' },
  { chave: 'formasPagamento', titulo: 'Formas de pagamento', ajuda: 'Usado na coluna Forma e no painel de receita por forma.' },
  { chave: 'professores', titulo: 'Professores', ajuda: 'Usado nas abas de alunos e pagamentos e na carga semanal.' },
];

function abaListas() {
  return `<div class="grade-2">
    ${LISTAS.map(l => `
      <section class="cartao">
        <header>${esc(l.titulo.toUpperCase())}</header>
        <div class="corpo">
          <div class="lista-opcoes">
            ${(estado.dados.opcoes[l.chave] || []).map((v, i) => `
              <div class="item">
                <input value="${esc(v)}" data-acao="opcao" data-lista="${esc(l.chave)}" data-indice="${i}">
                <button class="botao perigo mini" data-acao="remover-opcao" data-lista="${esc(l.chave)}" data-indice="${i}">✕</button>
              </div>`).join('')}
          </div>
          <button class="botao claro mini" style="margin-top:10px" data-acao="nova-opcao" data-lista="${esc(l.chave)}">+ Incluir</button>
          <p class="legenda">${esc(l.ajuda)}</p>
        </div>
      </section>`).join('')}
  </div>
  <p class="legenda">Estas listas reproduzem a aba <strong>Início</strong> da planilha. Todas são pretas: podem ser editadas, incluídas e excluídas.</p>`;
}

/* ------------------------------------------------- navegação das tabelas largas
   Tabela larga ganha, no topo: botões para ir ao início e ao fim de uma vez,
   setas de passo e uma barra de rolagem espelhada — assim não é preciso descer
   até o rodapé da tabela para achar a rolagem horizontal.                    */

const PASSO_ROLAGEM = 320;

function prepararRolagens() {
  document.querySelectorAll('#painel .rolagem').forEach(caixa => {
    if (caixa.dataset.pronta === '1') return;
    if (caixa.scrollWidth <= caixa.clientWidth + 4) return;   // não rola: nada a fazer
    caixa.dataset.pronta = '1';

    const controle = document.createElement('div');
    controle.className = 'controle-rolagem';
    controle.innerHTML = `
      <button type="button" class="botao-rolar" data-rolar="inicio" title="Ir para o início da tabela (Home)">⇤ Início</button>
      <button type="button" class="botao-rolar seta" data-rolar="esquerda" title="Voltar um trecho">←</button>
      <div class="rolagem-espelho"><div></div></div>
      <button type="button" class="botao-rolar seta" data-rolar="direita" title="Avançar um trecho">→</button>
      <button type="button" class="botao-rolar" data-rolar="fim" title="Ir para o fim da tabela (End)">Fim ⇥</button>`;
    caixa.parentNode.insertBefore(controle, caixa);

    const espelho = controle.querySelector('.rolagem-espelho');
    const trilho = espelho.firstElementChild;
    trilho.style.width = caixa.scrollWidth + 'px';

    // A barra espelhada é mais estreita que a tabela (fica ao lado dos botões),
    // então os dois elementos têm um scrollWidth igual mas um clientWidth
    // diferente — o curso máximo de rolagem de cada um não é o mesmo pixel a
    // pixel. Sincronizar em valor absoluto fazia o cursor "descolar" da barra
    // perto do fim do arrasto: um chegava ao limite antes do outro. Sincronizar
    // pela POSIÇÃO RELATIVA (0 a 1) faz os dois chegarem ao início e ao fim
    // exatamente juntos, então o arrasto acompanha o mouse até a borda.
    const posicaoRelativa = el => {
      const maximo = el.scrollWidth - el.clientWidth;
      return maximo > 0 ? el.scrollLeft / maximo : 0;
    };
    // só escreve quando o valor realmente difere: escrever scrollLeft durante uma
    // rolagem suave a cancela, e o eco entre os dois elementos faria exatamente isso
    const espelhar = (de, para) => {
      const maximoPara = para.scrollWidth - para.clientWidth;
      const novo = Math.round(posicaoRelativa(de) * maximoPara);
      if (Math.abs(para.scrollLeft - novo) < 1) return;
      para.scrollLeft = novo;
    };

    const atualizarBotoes = () => {
      const fim = caixa.scrollWidth - caixa.clientWidth;
      controle.querySelectorAll('[data-rolar="inicio"],[data-rolar="esquerda"]')
        .forEach(b => b.disabled = caixa.scrollLeft <= 1);
      controle.querySelectorAll('[data-rolar="fim"],[data-rolar="direita"]')
        .forEach(b => b.disabled = caixa.scrollLeft >= fim - 1);
    };

    const rolarPara = destino =>
      caixa.scrollTo({ left: destino, behavior: 'smooth' });

    controle.addEventListener('click', ev => {
      const b = ev.target.closest('[data-rolar]');
      if (!b) return;
      const fim = caixa.scrollWidth - caixa.clientWidth;
      const destinos = {
        inicio: 0,
        fim,
        esquerda: caixa.scrollLeft - PASSO_ROLAGEM,
        direita: caixa.scrollLeft + PASSO_ROLAGEM,
      };
      rolarPara(Math.max(0, Math.min(fim, destinos[b.dataset.rolar])));
    });

    caixa.addEventListener('scroll', () => { espelhar(caixa, espelho); atualizarBotoes(); });
    espelho.addEventListener('scroll', () => espelhar(espelho, caixa));

    // Home / End quando o foco está dentro da tabela
    caixa.addEventListener('keydown', ev => {
      if (ev.target.matches('input, select, textarea')) return;
      if (ev.key === 'Home') { ev.preventDefault(); rolarPara(0); }
      if (ev.key === 'End') { ev.preventDefault(); rolarPara(caixa.scrollWidth - caixa.clientWidth); }
    });

    atualizarBotoes();
  });
}

/* ================================================================= desenho */

/** posição horizontal das tabelas, para não voltar ao início a cada edição */
function guardarRolagem() {
  if (estado.abaDesenhada !== estado.aba) return null;
  return [...document.querySelectorAll('#painel .rolagem')].map(c => c.scrollLeft);
}
function restaurarRolagem(posicoes) {
  if (!posicoes) return;
  document.querySelectorAll('#painel .rolagem').forEach((c, i) => {
    if (posicoes[i]) c.scrollLeft = posicoes[i];
  });
}

function desenhar() {
  const permitidas = abasPermitidas();
  const aba = permitidas.find(a => a.id === estado.aba) || permitidas[0];
  if (!aba) return;
  estado.aba = aba.id;
  const rolagemAnterior = guardarRolagem();
  $('#tituloAba').textContent = aba.titulo;
  $('#subtituloAba').textContent = aba.sub;
  $('#menu').innerHTML = gruposVisiveis().map(g => {
    const aberto = estado.gruposAbertos.includes(g.id);
    return `<div class="grupo-menu ${aberto ? '' : 'fechado'}">
      <button class="titulo-grupo" data-acao="grupo-menu" data-grupo="${g.id}" title="${esc(g.rotulo)}">
        <span class="ico">${g.ico}</span><span class="rotulo-menu">${esc(g.rotulo)}</span>
        <span class="seta">${aberto ? '▾' : '▸'}</span>
      </button>
      <div class="itens-grupo">
        ${g.abas.map(a => `<button data-aba="${a.id}" class="${a.id === estado.aba ? 'ativo' : ''}" title="${esc(a.nome)}"><span class="ico">${a.ico}</span><span class="rotulo-menu">${esc(a.nome)}</span></button>`).join('')}
      </div>
    </div>`;
  }).join('');

  const desenhos = {
    dashboard: abaDashboard, alunos: abaAlunos, pagamentos: abaPagamentos,
    fin2026: abaFin2026, contaPessoal: abaContaPessoal, fin2027: abaFin2027,
    relatorios: abaRelatorios, listas: abaListas,
  };
  $('#painel').innerHTML = aba.professor ? abaProfessor(aba.professor) : desenhos[aba.id]();
  mostrarConta();
  $('#rodapeInfo').innerHTML = `Hoje ${dataBR(estado.calc.hoje)}<br>Dados em <code>dados/</code> — salvo automaticamente`;
  $('#voltar').style.visibility = (aba.id === permitidas[0].id) ? 'hidden' : 'visible';
  prepararRolagens();
  restaurarRolagem(rolagemAnterior);
  estado.abaDesenhada = aba.id;
}

/* ================================================================== eventos */

document.addEventListener('click', ev => { tratarClique(ev); });

async function tratarClique(ev) {
  if (ev.target.closest('#tema')) { alternarTema(); return; }
  if (ev.target.closest('#recolherMenu')) { alternarMenuRecolhido(); return; }
  if (ev.target.closest('#sair')) { await sair(); return; }
  if (ev.target.closest('#voltar')) { estado.aba = 'dashboard'; estado.busca = ''; desenhar(); return; }

  const botaoAba = ev.target.closest('[data-aba]');
  if (botaoAba) { estado.aba = botaoAba.dataset.aba; estado.busca = ''; estado.mostrarRemovidos = false; desenhar(); return; }

  const alvo = ev.target.closest('[data-acao]');
  if (!alvo) return;
  const acao = alvo.dataset.acao;

  if (acao === 'abrir-seletor' && alvo.dataset.tipo === 'diasAula') {
    // dias da semana de uma linha da tela do professor
    const { conjunto, id, campo } = alvo.dataset;
    const atual = (estado.dados[conjunto].find(x => x.id === id) || {}).dia
      || (aulasDoProfessor(estado.dados.alunos, estado.dados.aulas, professorDaAba())
          .find(l => (l.id || 'aluno:' + l.alunoId) === id) || {}).dia || '';
    const rotulo = alvo.querySelector('.campo-seletor-texto');
    abrirSeletor(alvo, {
      multiplo: true,
      textoBusca: 'Filtrar dias…',
      opcoes: DIAS_SEMANA.map(d => ({ valor: d, rotulo: d, busca: semAcento(d) })),
      selecionados: diasMarcados(atual),
      aoEscolher: escolhidos => {
        const texto = DIAS_SEMANA.filter(d => escolhidos.includes(d)).join(', ');
        gravarCampoProfessor(conjunto, id, campo, texto, false);
        if (rotulo) { rotulo.textContent = texto || 'Selecionar dias'; rotulo.classList.toggle('sem-valor', !texto); }
      },
      aoFechar: () => desenhar(),
    });
    return;
  }

  if (acao === 'abrir-seletor') {
    const id = alvo.dataset.id;
    const aluno = estado.dados.alunos.find(a => a.id === id);
    if (!aluno) return;

    if (alvo.dataset.tipo === 'cidade') {
      abrirSeletor(alvo, {
        textoBusca: 'Buscar cidade ou UF…',
        limite: 80,
        opcoes: estado.cidades,
        aoEscolher: (valor, item) => alterar('alunos', lista => {
          const a = lista.find(x => x.id === id);
          if (!a) return;
          a.cidade = item ? item.rotulo : valor;
          if (item && item.extra) a.estado = item.extra;   // preenche a UF junto
        }),
      });
      return;
    }

    // dias da semana: marcação múltipla, sem redesenhar enquanto está aberto
    const rotulo = alvo.querySelector('.campo-seletor-texto');
    abrirSeletor(alvo, {
      multiplo: true,
      textoBusca: 'Filtrar dias…',
      opcoes: DIAS_SEMANA.map(d => ({ valor: d, rotulo: d, busca: semAcento(d) })),
      selecionados: diasMarcados(aluno.dias),
      aoEscolher: escolhidos => {
        const texto = DIAS_SEMANA.filter(d => escolhidos.includes(d)).join(', ');
        alterar('alunos', lista => {
          const a = lista.find(x => x.id === id);
          if (a) a.dias = texto;
        }, false);
        if (rotulo) {
          rotulo.textContent = texto || 'Selecionar dias';
          rotulo.classList.toggle('sem-valor', !texto);
        }
      },
      aoFechar: () => desenhar(),
    });
    return;
  }

  if (acao === 'novo-aluno') {
    alterar('alunos', lista => lista.push({
      id: novoId('a'), nome: '', contato: '', cidade: '', estado: '', pais: 'Brasil',
      plano: '', valorMensal: 0, dataMatricula: hojeISO(), objetivo: '', horario: '',
      dias: '', professor: '', status: 'Ativo', diaVencimento: null, remarcacao: 0,
    }));
  }
  else if (acao === 'remover-aluno') {
    const a = estado.dados.alunos.find(x => x.id === alvo.dataset.id);
    const nome = a && a.nome ? a.nome : 'sem nome';
    const pagamentos = estado.dados.pagamentos.filter(p => String(p.aluno || '').trim() === String(a && a.nome || '').trim()).length;
    const ok = await confirmarExclusao('Excluir aluno',
      `Você está excluindo <strong>${esc(nome)}</strong> do cadastro.` +
      (pagamentos ? `<br>Há <strong>${pagamentos}</strong> pagamento(s) lançado(s) com esse nome; eles continuam na aba Pagamentos, mas ficarão sem vencimento calculado.` : '') +
      '<br>Esta ação não pode ser desfeita pelo sistema.');
    if (!ok) return;
    alterar('alunos', lista => {
      const i = lista.findIndex(x => x.id === alvo.dataset.id);
      if (i >= 0) lista.splice(i, 1);
    });
  }
  else if (acao === 'novo-pagamento') {
    alterar('pagamentos', lista => lista.push({
      id: novoId('p'), dataPagamento: hojeISO(), competenciaManual: '', aluno: '', tipo: 'Mensalidade',
      valor: 0, forma: '', professor: '', observacao: '',
    }));
  }
  else if (acao === 'remover-pagamento') {
    const p = estado.dados.pagamentos.find(x => x.id === alvo.dataset.id);
    const ok = await confirmarExclusao('Excluir lançamento',
      `Você está excluindo o pagamento de <strong>${esc(p && p.aluno || 'aluno não informado')}</strong>` +
      `${p && p.valor ? ' no valor de <strong>' + moeda(p.valor) + '</strong>' : ''}` +
      `${p && p.dataPagamento ? ' em ' + dataBR(p.dataPagamento) : ''}.` +
      '<br>O valor sai do Financeiro e do Dashboard imediatamente.');
    if (!ok) return;
    alterar('pagamentos', lista => {
      const i = lista.findIndex(x => x.id === alvo.dataset.id);
      if (i >= 0) lista.splice(i, 1);
    });
  }
  else if (acao === 'nova-despesa26') {
    alterar('financeiro2026', f => f.despesas.push({
      id: novoId('d'), nome: 'Nova despesa', calculada: false, formula: null,
      valores: Array(12).fill(0), em2027: true,
    }));
  }
  else if (acao === 'nova-despesa-cp') {
    alterar('contaPessoal2026', cp => cp.despesas.push({
      id: novoId('cp'), nome: 'Nova despesa', valores: Array(12).fill(0),
    }));
  }
  else if (acao === 'remover-linha') {
    const ctx = alvo.dataset.ctx;
    const chave = ctx === 'despesa26' ? 'financeiro2026' : 'contaPessoal2026';
    const colecao = ctx === 'despesa26' ? 'despesas' : 'despesas';
    const alvoLinha = estado.dados[chave][colecao].find(d => d.id === alvo.dataset.id);
    if (!alvoLinha) return;

    if (ctx === 'despesa26' && (estado.dados.contaPessoal2026.rendaOrigem || []).includes(alvoLinha.id)) {
      await avisarUsuario('Linha protegida',
        `A linha <strong>${esc(alvoLinha.nome)}</strong> alimenta a fórmula da <strong>Renda</strong> na Conta Pessoal 2026 e não pode ser excluída.` +
        '<br>Se realmente precisar removê-la, zere os valores dos meses.');
      return;
    }

    const usadaEm2027 = ctx === 'despesa26' && alvoLinha.em2027 !== false;
    const ok = await confirmarExclusao('Excluir linha',
      `Você está excluindo a linha <strong>${esc(alvoLinha.nome)}</strong> e os 12 meses de valores dela.` +
      (usadaEm2027 ? '<br>Ela também sai da projeção de <strong>2027</strong>.' : '') +
      '<br>Os totais, o lucro e a margem serão recalculados na hora.');
    if (!ok) return;
    alterar(chave, obj => {
      const i = obj[colecao].findIndex(d => d.id === alvo.dataset.id);
      if (i >= 0) obj[colecao].splice(i, 1);
    });
  }
  else if (acao === 'grupo-menu') {
    const g = alvo.dataset.grupo;
    const i = estado.gruposAbertos.indexOf(g);
    if (i < 0) estado.gruposAbertos.push(g); else estado.gruposAbertos.splice(i, 1);
    desenhar();
  }
  else if (acao === 'subaba-professor') { estado.subaba = alvo.dataset.subaba; desenhar(); }
  else if (acao === 'filtro-dia') { estado.diaFiltro = alvo.dataset.dia; desenhar(); }
  else if (acao === 'filtro-mes-professor') { estado.mesFiltroProfessor = alvo.dataset.mes ? Number(alvo.dataset.mes) : ''; desenhar(); }
  else if (acao === 'filtro-dia-remarcacao') { estado.diaFiltroRemarcacao = alvo.dataset.dia; desenhar(); }
  else if (acao === 'filtro-dashboard-professor-aulas') { estado.dashboardProfessorAulas = alvo.dataset.professor; desenhar(); }
  else if (acao === 'nova-aula-avulsa') {
    alterar('aulas', lista => lista.push({
      id: novoId('au'), professor: professorDaAba(), alunoId: null, removida: false,
      aluno: '', level: '', dia: '', horario: '', status: 'Ativo', observacao: '',
      nApresentacao: null, pagSlide: null, qtdAula: null, valorMesSeguinte: null,
      scriptFeito: '', scriptModelo: '', aulaFeita: '',
    }));
  }
  else if (acao === 'novo-registro-professor') {
    const conjunto = alvo.dataset.conjunto;
    const professor = professorDaAba();
    const hoje = paraData(estado.calc.hoje);
    const base = { id: novoId('r'), professor, observacao: '' };
    const iniciais = {
      remarcacoes: { aluno: '', ativa: 'Não', avisou24h: 'Não', data: hojeISO(), diaSemana: '', horario: '', marcacaoOlivia: 'Não', mes: MESES[hoje.getUTCMonth()] },
      experimentais: { aluno: '', data: hojeISO(), diaSemana: '', feito: 'Não', horario: '', level: '', msgAntes: 'Não', msgContatoRecebido: 'Não', qtdAulas: 0 },
      dadosAulas: { mes: MESES[hoje.getUTCMonth()], ano: hoje.getUTCFullYear(), bancoHoras: 0, mensalidade: 0, pago: 'Não', dataRelatorio: '', relatorioEntregue: 'Não' },
      bancoDados: { titulo: '', categoria: '', data: hojeISO(), valor: 0 },
    }[conjunto] || {};
    alterar(conjunto, lista => lista.push({ ...base, ...iniciais }));
  }
  else if (acao === 'remover-registro-professor') {
    const conjunto = alvo.dataset.conjunto;
    const registro = estado.dados[conjunto].find(x => x.id === alvo.dataset.id);
    const ok = await confirmarExclusao('Excluir registro',
      `Você está excluindo este registro de <strong>${esc({ remarcacoes: 'remarcação', experimentais: 'aula experimental', dadosAulas: 'dados das aulas' }[conjunto] || 'registro')}</strong>` +
      `${registro && registro.aluno ? ' de <strong>' + esc(registro.aluno) + '</strong>' : ''}.<br>Esta ação não pode ser desfeita pelo sistema.`);
    if (!ok) return;
    alterar(conjunto, lista => {
      const i = lista.findIndex(x => x.id === alvo.dataset.id);
      if (i >= 0) lista.splice(i, 1);
    });
  }
  else if (acao === 'alternar-removidos') {
    estado.mostrarRemovidos = !estado.mostrarRemovidos;
    desenhar();
  }
  else if (acao === 'remover-aluno-professor') {
    const chave = alvo.dataset.id;
    const professor = professorDaAba();
    const linha = aulasDoProfessor(estado.dados.alunos, estado.dados.aulas, professor)
      .find(l => (l.id || 'aluno:' + l.alunoId) === chave);
    const ok = await confirmarExclusao('Excluir desta lista',
      `Você está excluindo <strong>${esc(linha ? linha.aluno : 'este aluno')}</strong> só da sua lista de Aulas.` +
      '<br>O Cadastro de alunos não é alterado, e você pode restaurar essa linha depois em "Mostrar removidos".');
    if (!ok) return;
    alterar('aulas', lista => {
      if (chave.startsWith('aluno:')) {
        // linha ainda não materializada: cria já marcada como removida
        const alunoId = chave.slice('aluno:'.length);
        const cadastro = estado.dados.alunos.find(a => a.id === alunoId) || {};
        lista.push({
          id: novoId('au'), professor, alunoId, removida: true,
          aluno: cadastro.nome || '', dia: cadastro.dias || '',
          horario: cadastro.horario || '', status: cadastro.status || '',
        });
      } else {
        const registro = lista.find(x => x.id === chave && String(x.professor || '') === professor);
        if (registro) registro.removida = true;
      }
    });
  }
  else if (acao === 'restaurar-aluno-professor') {
    alterar('aulas', lista => {
      const registro = lista.find(x => x.id === alvo.dataset.id);
      if (registro) registro.removida = false;
    });
  }
  else if (acao === 'editar-contagem-mensal') {
    await editarContagemMensal(alvo.dataset.professor);
  }
  else if (acao === 'tipo-relatorio') {
    estado.relatorio.tipo = alvo.dataset.tipo;
    estado.relatorio.expandido = '';
    desenhar();
  }
  else if (acao === 'expandir-relatorio') {
    const chave = alvo.dataset.chave;
    estado.relatorio.expandido = estado.relatorio.expandido === chave ? '' : chave;
    desenhar();
  }
  else if (acao === 'limpar-filtros') {
    estado.relatorio.filtros = { ...FILTROS_PADRAO };
    estado.relatorio.expandido = '';
    desenhar();
  }
  else if (acao === 'exportar-csv') {
    const { linhas, colunas } = montarRelatorio();
    if (!linhas.length) { await avisarUsuario('Nada para exportar', 'O recorte atual não tem nenhuma linha.'); return; }
    const nome = `relatorio-${estado.relatorio.tipo}-${estado.calc.hoje}.csv`;
    baixarCSV(nome, paraCSV(colunas, linhas));
    aviso(`${nome} baixado`);
  }
  else if (acao === 'imprimir') {
    window.print();
  }
  else if (acao === 'nova-opcao') {
    alterar('opcoes', o => { (o[alvo.dataset.lista] = o[alvo.dataset.lista] || []).push(''); });
  }
  else if (acao === 'remover-opcao') {
    const lista = alvo.dataset.lista;
    const indice = Number(alvo.dataset.indice);
    const valor = (estado.dados.opcoes[lista] || [])[indice];
    const titulo = (LISTAS.find(l => l.chave === lista) || {}).titulo || 'lista';
    const emUso = contarUsoDaOpcao(lista, valor);
    const ok = await confirmarExclusao('Excluir opção',
      `Você está excluindo <strong>${esc(valor || '(vazio)')}</strong> da lista <strong>${esc(titulo)}</strong>.` +
      (emUso ? `<br>Há <strong>${emUso}</strong> registro(s) usando essa opção; eles mantêm o valor atual, mas ela deixa de aparecer nas caixas de seleção.` : ''));
    if (!ok) return;
    alterar('opcoes', o => o[lista].splice(indice, 1));
  }
}

/** Quantos registros usam determinada opção — mostrado no pop-up de exclusão. */
function contarUsoDaOpcao(lista, valor) {
  if (!valor) return 0;
  const alunos = estado.dados.alunos || [];
  const pagamentos = estado.dados.pagamentos || [];
  const conta = (colecao, campo) => colecao.filter(x => String(x[campo] || '') === valor).length;
  switch (lista) {
    case 'planos': return conta(alunos, 'plano');
    case 'status': return conta(alunos, 'status');
    case 'objetivos': return conta(alunos, 'objetivo');
    case 'professores': return conta(alunos, 'professor') + conta(pagamentos, 'professor');
    case 'tiposPagamento': return conta(pagamentos, 'tipo');
    case 'formasPagamento': return conta(pagamentos, 'forma');
    default: return 0;
  }
}

/** Alteracoes de conteudo: campos de texto, numero, data e selecao. */
function tratarEntrada(ev, imediato) {
  const alvo = ev.target.closest('[data-acao]');
  if (!alvo) return;
  const acao = alvo.dataset.acao;
  const valor = alvo.type === 'checkbox' ? alvo.checked : alvo.value;
  const ehSelecao = alvo.tagName === 'SELECT' || alvo.type === 'date' || alvo.type === 'time' || alvo.type === 'checkbox';
  if (!imediato && !ehSelecao) return;      // texto/numero so aplica no 'change' (blur)

  const redesenhar = acao !== 'busca';

  switch (acao) {
    case 'busca':
      estado.busca = valor;
      desenhar();
      // devolve o foco ao campo de busca
      const campo = document.querySelector('[data-acao="busca"]');
      if (campo) { campo.focus(); campo.setSelectionRange(valor.length, valor.length); }
      return;

    case 'aluno': {
      const campo = alvo.dataset.campo;
      const numerico = CAMPOS_NUMERICOS.includes(campo);
      alterar('alunos', lista => {
        const a = lista.find(x => x.id === alvo.dataset.id);
        if (a) a[campo] = numerico ? parseNumero(valor) : valor;
      });
      return;
    }
    case 'pagamento': {
      const campo = alvo.dataset.campo;
      alterar('pagamentos', lista => {
        const p = lista.find(x => x.id === alvo.dataset.id);
        if (p) p[campo] = campo === 'valor' ? (parseNumero(valor) ?? 0) : valor;
      });
      return;
    }
    case 'premissa26':
      alterar('financeiro2026', f => { f.premissas[alvo.dataset.campo] = (parseNumero(valor) ?? 0) / 100; });
      return;
    case 'premissa27':
      alterar('financeiro2027', f => { f.premissas[alvo.dataset.campo] = (parseNumero(valor) ?? 0) / 100; });
      return;
    case 'receitaBase':
      alterar('financeiro2026', f => { f.receitaBase[Number(alvo.dataset.mes)] = parseNumero(valor); });
      return;
    case 'outrasReceitas26':
      alterar('financeiro2026', f => { f.outrasReceitas[Number(alvo.dataset.mes)] = parseNumero(valor) ?? 0; });
      return;
    case 'outrasReceitas27':
      alterar('financeiro2027', f => { f.outrasReceitas[Number(alvo.dataset.mes)] = parseNumero(valor) ?? 0; });
      return;
    case 'despesa26':
      alterar('financeiro2026', f => {
        const d = f.despesas.find(x => x.id === alvo.dataset.id);
        if (d) d.valores[Number(alvo.dataset.mes)] = parseNumero(valor);
      });
      return;
    case 'despesaCP':
      alterar('contaPessoal2026', cp => {
        const d = cp.despesas.find(x => x.id === alvo.dataset.id);
        if (d) d.valores[Number(alvo.dataset.mes)] = parseNumero(valor);
      });
      return;
    case 'renomear': {
      const chave = alvo.dataset.ctx === 'despesa26' ? 'financeiro2026' : 'contaPessoal2026';
      alterar(chave, obj => {
        const d = obj.despesas.find(x => x.id === alvo.dataset.id);
        if (d) d.nome = valor;
      });
      return;
    }
    case 'projetar2027':
      alterar('financeiro2026', f => {
        const d = f.despesas.find(x => x.id === alvo.dataset.id);
        if (d) d.em2027 = !!valor;
      });
      return;
    case 'opcao':
      alterar('opcoes', o => { o[alvo.dataset.lista][Number(alvo.dataset.indice)] = valor; });
      return;
    case 'campo-professor':
      gravarCampoProfessor(alvo.dataset.conjunto, alvo.dataset.id, alvo.dataset.campo, valor);
      return;
    case 'filtro-relatorio':
      estado.relatorio.filtros[alvo.dataset.campo] = valor;
      estado.relatorio.expandido = '';
      desenhar();
      return;
    default:
      if (redesenhar) desenhar();
  }
}

document.addEventListener('change', ev => tratarEntrada(ev, true));
document.addEventListener('input', ev => {
  if (ev.target.dataset && ev.target.dataset.acao === 'busca') tratarEntrada(ev, true);
});

/* ------------------------------------------------------------------ inicio */

/* ------------------------------------------------------------------ acesso */

function mostrarConta() {
  const conta = estado.conta;
  const caixa = $('#contaAtiva');
  if (!conta) { caixa.hidden = true; return; }
  caixa.hidden = false;
  $('#contaInicial').textContent = (conta.nome || conta.usuario || '?').slice(0, 1).toUpperCase();
  $('#contaNome').textContent = conta.nome || conta.usuario;
  $('#contaPerfil').textContent = conta.perfil === 'admin' ? 'Acesso total' : 'Professora ' + conta.professor;
}

function mostrarLogin(mensagem) {
  $('#telaLogin').hidden = false;
  $('#erroLogin').hidden = !mensagem;
  $('#erroLogin').textContent = mensagem || '';
  $('#loginUsuario').focus();
}

async function entrar(ev) {
  ev.preventDefault();
  const botao = $('#botaoEntrar');
  botao.disabled = true;
  try {
    const resposta = await fetch('/api/entrar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: $('#loginUsuario').value, senha: $('#loginSenha').value }),
    });
    const corpo = await resposta.json();
    if (!resposta.ok) { mostrarLogin(corpo.erro || 'Não foi possível entrar.'); return; }
    $('#loginSenha').value = '';
    $('#telaLogin').hidden = true;
    await iniciar();
  } catch (e) {
    mostrarLogin('Servidor indisponível. Confira se o INICIAR.bat está aberto.');
  } finally {
    botao.disabled = false;
  }
}

async function sair() {
  const ok = await abrirJanela({
    titulo: 'Sair do sistema', texto: 'Você será desconectado e voltará para a tela de login.',
    icone: '⏻', rotuloConfirmar: 'Sair', perigo: false,
  });
  if (!ok) return;
  await fetch('/api/sair', { method: 'POST' });
  estado.conta = null;
  estado.dados = null;
  $('#painel').innerHTML = '';
  $('#menu').innerHTML = '';
  mostrarConta();
  mostrarLogin('');
}

/* --------------------------------------------------- atualização em tempo real
   Consulta um carimbo barato a cada poucos segundos. Quando outro usuário grava
   algo (a Olivia na tela dela, por exemplo), esta tela recarrega sozinha.
   Nunca recarrega enquanto há edição em andamento, para não atropelar quem digita. */

const INTERVALO_ATUALIZACAO = 5000;
let relogioAtualizacao = null;

function editandoAgora() {
  const foco = document.activeElement;
  return !!(foco && foco.matches && foco.matches('input, select, textarea'))
    || estado.pendentes.size > 0
    || !!document.querySelector('.janela-fundo, .seletor');
}

async function verificarAtualizacoes() {
  if (!estado.conta || editandoAgora()) return;
  try {
    const r = await fetch('/api/versao');
    if (r.status === 401) { estado.conta = null; mostrarLogin('Sua sessão expirou. Entre novamente.'); return; }
    if (!r.ok) return;
    const { versao } = await r.json();
    if (!estado.versaoDados) { estado.versaoDados = versao; return; }
    if (versao === estado.versaoDados) return;
    estado.versaoDados = versao;
    await carregar();
    desenhar();
    aviso('Dados atualizados');
  } catch (e) { /* servidor fora do ar: tenta de novo no próximo ciclo */ }
}

function ligarAtualizacaoAutomatica() {
  clearInterval(relogioAtualizacao);
  relogioAtualizacao = setInterval(verificarAtualizacoes, INTERVALO_ATUALIZACAO);
}

async function iniciar() {
  try {
    await carregar();
    desenhar();
    estado.versaoDados = '';
    ligarAtualizacaoAutomatica();
  } catch (erro) {
    if (erro.semSessao) { mostrarLogin(''); return; }
    $('#painel').innerHTML = `<div class="leitura" style="border-left-color:var(--vermelho)">
      <strong>Não foi possível carregar os dados.</strong><br>${esc(erro.message)}<br>
      Confirme que o servidor está em execução (INICIAR.bat) e que a pasta <code>dados</code> existe.</div>`;
  }
}

aplicarTema(temaAtual());
aplicarMenuRecolhido(menuRecolhidoAtual());
$('#formLogin').addEventListener('submit', entrar);
iniciar();
