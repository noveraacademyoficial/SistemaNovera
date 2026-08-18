/* ============================================================================
   RELATÓRIOS
   Consultas sobre os pagamentos já calculados pelo motor. Nada aqui altera
   dado nem fórmula: só filtra, agrupa e soma.
   ========================================================================== */

const SITUACOES_RELATORIO = ['Em dia', 'Pago com atraso', 'Em atraso', 'A vencer', 'Sem vencimento'];

const BASES_DATA = [
  { id: 'dataPagamento', rotulo: 'Data do Pagamento' },
  { id: 'competencia', rotulo: 'Competência' },
  { id: 'dataVencimento', rotulo: 'Vencimento' },
];

const TIPOS_RELATORIO = [
  { id: 'lancamentos', rotulo: 'Lançamentos', ajuda: 'Todos os pagamentos e cobranças do recorte, linha a linha.' },
  { id: 'porAluno', rotulo: 'Por aluno', ajuda: 'Consolidado de cada aluno: pago, em aberto e pontualidade.' },
  { id: 'mensal', rotulo: 'Por mês', ajuda: 'Totais mês a mês dentro do período escolhido.' },
  { id: 'aVencer', rotulo: 'A vencer', ajuda: 'Cobranças com vencimento à frente, ainda sem pagamento.' },
  { id: 'emAtraso', rotulo: 'Em atraso', ajuda: 'Cobranças vencidas e ainda sem pagamento.' },
  { id: 'inadimplencia', rotulo: 'Histórico de atrasos', ajuda: 'Quem atrasa e com que frequência, com o histórico de cada um.' },
];

const FILTROS_PADRAO = {
  base: 'dataPagamento',
  de: '', ate: '', ano: '',
  aluno: '', professor: '', situacao: '', tipo: '', forma: '',
  valorMin: '', valorMax: '',
};

/* ------------------------------------------------------------------ filtro */

function aplicarFiltros(pagamentos, filtros) {
  const f = { ...FILTROS_PADRAO, ...filtros };
  const num = v => (v === '' || v === null || v === undefined) ? null : Number(String(v).replace(',', '.'));
  const min = num(f.valorMin), max = num(f.valorMax);

  return pagamentos.filter(p => {
    const referencia = p[f.base] || '';

    // ano e período trabalham sobre a mesma data de referência
    if (f.ano && referencia.slice(0, 4) !== f.ano) return false;
    if (f.de && (!referencia || referencia < f.de)) return false;
    if (f.ate && (!referencia || referencia > f.ate)) return false;

    if (f.aluno && String(p.aluno || '') !== f.aluno) return false;
    if (f.professor && String(p.professor || '') !== f.professor) return false;
    if (f.situacao && p.situacao !== f.situacao) return false;
    if (f.tipo && String(p.tipo || '') !== f.tipo) return false;
    if (f.forma && String(p.forma || '') !== f.forma) return false;

    const valor = Number(p.valor) || 0;
    if (min !== null && valor < min) return false;
    if (max !== null && valor > max) return false;

    return true;
  });
}

/** anos presentes na base, para o atalho de ano */
function anosDisponiveis(pagamentos) {
  const anos = new Set();
  pagamentos.forEach(p => {
    BASES_DATA.forEach(b => { const v = p[b.id]; if (v) anos.add(v.slice(0, 4)); });
  });
  return [...anos].sort();
}

/* ------------------------------------------------------------- indicadores */

const ehAtraso = p => p.situacao === 'Pago com atraso' || p.situacao === 'Em atraso';
const foiPago = p => !!p.dataPagamento;

function resumoDoRecorte(lista) {
  const recebido = lista.filter(foiPago).reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const emAberto = lista.filter(p => !foiPago(p)).reduce((s, p) => s + (Number(p.valor) || 0), 0);
  const vencidas = lista.filter(p => p.situacao === 'Em atraso');
  const comVencimento = lista.filter(p => p.situacao !== 'Sem vencimento');
  const pagas = comVencimento.filter(foiPago);
  const pagasEmDia = pagas.filter(p => p.situacao === 'Em dia').length;

  return {
    lancamentos: lista.length,
    recebido,
    emAberto,
    total: recebido + emAberto,
    ticketMedio: lista.length ? (recebido + emAberto) / lista.length : 0,
    emAtraso: vencidas.length,
    valorEmAtraso: vencidas.reduce((s, p) => s + (Number(p.valor) || 0), 0),
    aVencer: lista.filter(p => p.situacao === 'A vencer').length,
    valorAVencer: lista.filter(p => p.situacao === 'A vencer').reduce((s, p) => s + (Number(p.valor) || 0), 0),
    pontualidade: pagas.length ? pagasEmDia / pagas.length : 0,
    atrasoMedio: (() => {
      const dias = lista.filter(ehAtraso).map(p => Number(p.diasAtraso) || 0);
      return dias.length ? dias.reduce((s, d) => s + d, 0) / dias.length : 0;
    })(),
  };
}

/* ---------------------------------------------------------- por aluno */

function consolidarPorAluno(lista, alunos) {
  const porNome = new Map();
  lista.forEach(p => {
    const nome = String(p.aluno || '').trim() || '(sem aluno)';
    if (!porNome.has(nome)) porNome.set(nome, []);
    porNome.get(nome).push(p);
  });

  const indice = new Map(alunos.map(a => [String(a.nome || '').trim(), a]));

  return [...porNome.entries()].map(([nome, itens]) => {
    const cadastro = indice.get(nome) || {};
    const pagos = itens.filter(foiPago);
    const comVenc = itens.filter(p => p.situacao !== 'Sem vencimento');
    const pagosComVenc = comVenc.filter(foiPago);
    const atrasados = itens.filter(ehAtraso);
    const dias = atrasados.map(p => Number(p.diasAtraso) || 0);

    return {
      nome,
      plano: cadastro.plano || '',
      professor: cadastro.professor || (itens.find(p => p.professor) || {}).professor || '',
      status: cadastro.status || '',
      valorMensal: Number(cadastro.valorMensal) || 0,
      diaVencimento: cadastro.diaVencimento ?? null,
      lancamentos: itens.length,
      recebido: pagos.reduce((s, p) => s + (Number(p.valor) || 0), 0),
      emAberto: itens.filter(p => !foiPago(p)).reduce((s, p) => s + (Number(p.valor) || 0), 0),
      emAtraso: itens.filter(p => p.situacao === 'Em atraso').length,
      aVencer: itens.filter(p => p.situacao === 'A vencer').length,
      vezesAtrasou: atrasados.length,
      recorrencia: comVenc.length ? atrasados.length / comVenc.length : 0,
      atrasoMaximo: dias.length ? Math.max(...dias) : 0,
      atrasoMedio: dias.length ? dias.reduce((s, d) => s + d, 0) / dias.length : 0,
      pontualidade: pagosComVenc.length
        ? pagosComVenc.filter(p => p.situacao === 'Em dia').length / pagosComVenc.length : 0,
      itens,
    };
  });
}

/** Ranking de quem atrasa: recorrência primeiro, depois o tamanho do atraso. */
function rankingInadimplencia(lista, alunos) {
  return consolidarPorAluno(lista, alunos)
    .filter(a => a.vezesAtrasou > 0 || a.emAtraso > 0)
    .sort((a, b) =>
      (b.recorrencia - a.recorrencia) ||
      (b.atrasoMedio - a.atrasoMedio) ||
      (b.emAberto - a.emAberto) ||
      a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Marca quem atrasa de forma recorrente (metade ou mais das cobranças, com histórico). */
function atrasaSempre(aluno) {
  return aluno.recorrencia >= 0.5 && aluno.vezesAtrasou >= 2;
}

/* ------------------------------------------------------------- por mês */

function consolidarPorMes(lista, base) {
  const porMes = new Map();
  lista.forEach(p => {
    const ref = p[base] || '';
    const chave = ref ? ref.slice(0, 7) : '(sem data)';
    if (!porMes.has(chave)) porMes.set(chave, []);
    porMes.get(chave).push(p);
  });

  return [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, itens]) => {
      const resumo = resumoDoRecorte(itens);
      return { mes, ...resumo };
    });
}

/* --------------------------------------------------------------- exportação */

function paraCSV(colunas, linhas) {
  const escapar = v => {
    const t = v === null || v === undefined ? '' : String(v);
    return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  const cabecalho = colunas.map(c => escapar(c.rotulo)).join(';');
  const corpo = linhas.map(l => colunas.map(c => escapar(c.csv ? c.csv(l) : c.valor(l))).join(';'));
  return '﻿' + [cabecalho, ...corpo].join('\r\n');   // BOM: Excel abre com acento correto
}

function baixarCSV(nomeArquivo, conteudo) {
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
