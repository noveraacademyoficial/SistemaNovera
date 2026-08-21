/* ============================================================================
   MOTOR DE CALCULO
   Reproduz fielmente as formulas da planilha "Analise de aulas - atualizado.xlsx"
   Cada funcao referencia a formula original do Excel em comentario.
   ========================================================================== */

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const FAIXAS_HORARIO = [
  { rotulo: 'Manhã (06h–12h)', de: 6, ate: 12 },
  { rotulo: 'Tarde (12h–18h)', de: 12, ate: 18 },
  { rotulo: 'Noite (18h–23h)', de: 18, ate: 23 },
];
const SITUACOES = ['Em dia', 'Pago com atraso', 'Em atraso', 'A vencer'];

/* ---------------------------------------------------------------- utilitarios */

function hojeISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
function paraData(iso) {
  if (!iso) return null;
  const p = String(iso).slice(0, 10).split('-');
  if (p.length !== 3) return null;
  const d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  return isNaN(d.getTime()) ? null : d;
}
function paraISO(data) {
  if (!data) return '';
  return data.toISOString().slice(0, 10);
}
function diferencaDias(a, b) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}
/** EOMONTH(data;0) -> ultimo dia do mes */
function ultimoDiaDoMes(ano, mes1a12) {
  return new Date(Date.UTC(ano, mes1a12, 0));
}
function diasNoMes(ano, mes1a12) {
  return ultimoDiaDoMes(ano, mes1a12).getUTCDate();
}
function n(valor) {
  const x = Number(valor);
  return Number.isFinite(x) ? x : 0;
}
/** SEARCH() do Excel: busca sem diferenciar maiusculas/minusculas */
function contem(texto, agulha) {
  return String(texto || '').toLowerCase().includes(String(agulha || '').toLowerCase());
}
/** IFERROR(a/b;0) */
function dividir(a, b) {
  return b ? a / b : 0;
}
/** ordenacao decrescente estavel, como SORTBY(...;-1) */
function ordenarDesc(itens, chave) {
  return itens
    .map((item, i) => ({ item, i }))
    .sort((x, y) => (chave(y.item) - chave(x.item)) || (x.i - y.i))
    .map(o => o.item);
}
function vetor12(preenchimento) {
  return Array.from({ length: 12 }, () => preenchimento);
}

/* ------------------------------------------------------- Pagamentos: formulas */

/**
 * Colunas calculadas da tabela tblPagamentos.
 *   Competencia       = SE(Data=""; ""; DATA(ANO(Data);MÊS(Data);1))
 *                       Como no Excel, um valor digitado sobrescreve a formula;
 *                       apagando o valor, a formula volta a valer.
 *   Data de Vencimento= LET(d; PROCX(Aluno; Alunos[Nome]; Alunos[Dia de Vencimento]; "");
 *                        SE(OU(Competencia=""; d=""); "";
 *                           DATA(ANO(Comp);MÊS(Comp);MÍNIMO(d; DIA(FIMMÊS(Comp;0))))))
 *   Dias em Atraso    = SE(Venc=""; ""; MÁXIMO(0; SE(Data=""; HOJE(); Data) - Venc))
 *   Situacao          = SE(Venc=""; "Sem vencimento";
 *                         SE(Data=""; SE(HOJE()>Venc; "Em atraso"; "A vencer");
 *                            SE(Data<=Venc; "Em dia"; "Pago com atraso")))
 */
function calcularPagamento(pagamento, indiceAlunos, hoje) {
  const dataPg = paraData(pagamento.dataPagamento);
  // fórmula da planilha: primeiro dia do mês da Data do Pagamento
  const automatica = dataPg
    ? new Date(Date.UTC(dataPg.getUTCFullYear(), dataPg.getUTCMonth(), 1))
    : null;
  // valor digitado sobrescreve a fórmula, como acontece no Excel
  const manual = pagamento.competenciaManual
    ? paraData(String(pagamento.competenciaManual).slice(0, 7) + '-01')
    : null;
  const competencia = manual || automatica;

  const aluno = indiceAlunos.get(String(pagamento.aluno || '').trim().toLowerCase());
  const diaVenc = aluno && aluno.diaVencimento ? Number(aluno.diaVencimento) : null;

  let vencimento = null;
  if (competencia && diaVenc) {
    const ano = competencia.getUTCFullYear();
    const mes = competencia.getUTCMonth() + 1;
    vencimento = new Date(Date.UTC(ano, mes - 1, Math.min(diaVenc, diasNoMes(ano, mes))));
  }

  let diasAtraso = '';
  let situacao = 'Sem vencimento';
  if (vencimento) {
    const referencia = dataPg || hoje;
    diasAtraso = Math.max(0, diferencaDias(referencia, vencimento));
    if (!dataPg) {
      situacao = diferencaDias(hoje, vencimento) > 0 ? 'Em atraso' : 'A vencer';
    } else {
      situacao = diferencaDias(dataPg, vencimento) <= 0 ? 'Em dia' : 'Pago com atraso';
    }
  }

  return {
    ...pagamento,
    competencia: competencia ? paraISO(competencia) : '',
    competenciaAutomatica: automatica ? paraISO(automatica) : '',
    competenciaSobrescrita: !!manual,
    dataVencimento: vencimento ? paraISO(vencimento) : '',
    diasAtraso,
    situacao,
  };
}

function calcularPagamentos(pagamentos, alunos, hoje) {
  const indice = new Map();
  alunos.forEach(a => indice.set(String(a.nome || '').trim().toLowerCase(), a));
  return pagamentos.map(p => calcularPagamento(p, indice, hoje));
}

/* -------------------------------------------------------- Financeiro: formulas */

/** SOMASES(Pagamentos[Valor]; Data; ">="&inicio; Data; "<"&inicio+1mes) */
function receitaRecebidaPorMes(pagamentos, ano) {
  const soma = vetor12(0);
  pagamentos.forEach(p => {
    const d = paraData(p.dataPagamento);
    if (d && d.getUTCFullYear() === ano) soma[d.getUTCMonth()] += n(p.valor);
  });
  return soma;
}

/** CONT.SES(Alunos[Status];"Ativo"; Alunos[Data Matricula];"<="&FIMMÊS(mes;0)) */
function alunosAtivosPorMes(alunos, ano) {
  return MESES.map((_, i) => {
    const limite = ultimoDiaDoMes(ano, i + 1);
    return alunos.filter(a => {
      if (String(a.status || '') !== 'Ativo') return false;
      const dm = paraData(a.dataMatricula);
      return dm && diferencaDias(dm, limite) <= 0;
    }).length;
  });
}

/** MÉDIA($B$7:$H$7) - media dos meses de Janeiro a Julho preenchidos */
function mediaBaseJanJul(receitaBase) {
  const preenchidos = receitaBase.slice(0, 7).filter(v => v !== null && v !== undefined && v !== '');
  if (!preenchidos.length) return 0;
  return preenchidos.reduce((s, v) => s + n(v), 0) / preenchidos.length;
}

/**
 * Financeiro 2026 completo.
 *   Receita base       : valor digitado; meses vazios usam MÉDIA(Jan:Jul)
 *   RECEITA CONSIDERADA: =SE(Recebido>0; Recebido; Base) + Outras receitas
 *   Simples Nacional   : =RECEITA CONSIDERADA * premissa
 *   DESPESA TOTAL      : =SOMA(linhas de despesa)
 *   LUCRO / PREJUIZO   : =RECEITA CONSIDERADA - DESPESA TOTAL
 *   MARGEM LIQUIDA     : =SEERRO(LUCRO/RECEITA;0)
 *   PONTO DE EQUILIBRIO: =DESPESA TOTAL
 */
function calcularFinanceiro2026(fin, alunos, pagamentos) {
  const ano = fin.ano || 2026;
  const media = mediaBaseJanJul(fin.receitaBase || vetor12(null));

  const recebido = receitaRecebidaPorMes(pagamentos, ano);
  const receitaBase = MESES.map((_, i) => {
    const v = (fin.receitaBase || [])[i];
    return (v === null || v === undefined || v === '') ? media : n(v);
  });
  const outrasReceitas = MESES.map((_, i) => n((fin.outrasReceitas || [])[i]));
  const receitaConsiderada = MESES.map((_, i) =>
    (recebido[i] > 0 ? recebido[i] : receitaBase[i]) + outrasReceitas[i]);

  const premissa = n(fin.premissas && fin.premissas.simplesNacional);
  const despesas = (fin.despesas || []).map(d => ({
    ...d,
    valoresCalculados: MESES.map((_, i) => d.calculada
      ? receitaConsiderada[i] * premissa
      : n(d.valores[i])),
  }));

  const despesaTotal = MESES.map((_, i) =>
    despesas.reduce((s, d) => s + d.valoresCalculados[i], 0));
  const lucro = MESES.map((_, i) => receitaConsiderada[i] - despesaTotal[i]);
  const margem = MESES.map((_, i) => dividir(lucro[i], receitaConsiderada[i]));

  return {
    ano,
    alunosAtivos: alunosAtivosPorMes(alunos, ano),
    recebido,
    receitaBase,
    receitaBaseAutomatica: MESES.map((_, i) => {
      const v = (fin.receitaBase || [])[i];
      return (v === null || v === undefined || v === '');
    }),
    mediaBase: media,
    outrasReceitas,
    receitaConsiderada,
    despesas,
    despesaTotal,
    lucro,
    margem,
    pontoEquilibrio: despesaTotal.slice(),
  };
}

/**
 * Conta Pessoal 2026.
 *   Renda            = 'Financeiro 2026'!Pró-labore + 'Financeiro 2026'!Professor Davi
 *   TOTAL DESPESAS   = SOMA(linhas)
 *   SOBRA            = Renda - Total
 *   TAXA DE POUPANCA = SEERRO(Sobra/Renda;0)
 *   Coluna Total Ano = SOMA(Jan:Dez)
 */
function calcularContaPessoal(conta, calc2026) {
  const origens = conta.rendaOrigem || [];
  const renda = MESES.map((_, i) =>
    origens.reduce((s, id) => {
      const d = calc2026.despesas.find(x => x.id === id);
      return s + (d ? d.valoresCalculados[i] : 0);
    }, 0));

  const despesas = (conta.despesas || []).map(d => ({
    ...d,
    valoresCalculados: MESES.map((_, i) => n(d.valores[i])),
    totalAno: MESES.reduce((s, _, i) => s + n(d.valores[i]), 0),
  }));

  const totalDespesas = MESES.map((_, i) =>
    despesas.reduce((s, d) => s + d.valoresCalculados[i], 0));
  const sobra = MESES.map((_, i) => renda[i] - totalDespesas[i]);
  const somar = v => v.reduce((s, x) => s + x, 0);

  return {
    renda,
    despesas,
    totalDespesas,
    sobra,
    taxaPoupanca: MESES.map((_, i) => dividir(sobra[i], renda[i])),
    totais: {
      renda: somar(renda),
      totalDespesas: somar(totalDespesas),
      sobra: somar(sobra),
      taxaPoupanca: dividir(somar(sobra), somar(renda)),
    },
  };
}

/**
 * Financeiro 2027 (orcamento projetado).
 *   Receita base    = 'Financeiro 2026'!RECEITA CONSIDERADA * (1 + crescimento)
 *   Despesas        = despesa equivalente de 2026 * (1 + inflacao)
 *   Simples Nacional= RECEITA CONSIDERADA 2027 * premissa
 *   Demais linhas iguais a 2026.
 */
function calcularFinanceiro2027(fin27, calc2026, fin26, pagamentos) {
  const ano = fin27.ano || 2027;
  const crescimento = n(fin27.premissas && fin27.premissas.crescimentoReceita);
  const inflacao = n(fin27.premissas && fin27.premissas.inflacaoCustos);
  const premissaSimples = n(fin27.premissas && fin27.premissas.simplesNacional);

  const recebido = receitaRecebidaPorMes(pagamentos, ano);
  const receitaBase = MESES.map((_, i) => calc2026.receitaConsiderada[i] * (1 + crescimento));
  const outrasReceitas = MESES.map((_, i) => n((fin27.outrasReceitas || [])[i]));
  const receitaConsiderada = MESES.map((_, i) =>
    (recebido[i] > 0 ? recebido[i] : receitaBase[i]) + outrasReceitas[i]);

  const despesas = calc2026.despesas
    .filter(d => d.em2027 !== false)
    .map(d => ({
      id: d.id,
      nome: d.nome,
      calculada: !!d.calculada,
      origem: d.calculada ? null : d.id,
      valoresCalculados: MESES.map((_, i) => d.calculada
        ? receitaConsiderada[i] * premissaSimples
        : d.valoresCalculados[i] * (1 + inflacao)),
    }));

  const despesaTotal = MESES.map((_, i) => despesas.reduce((s, d) => s + d.valoresCalculados[i], 0));
  const lucro = MESES.map((_, i) => receitaConsiderada[i] - despesaTotal[i]);

  return {
    ano,
    alunosAtivos: null, // preenchido por quem chama (precisa da lista de alunos)
    recebido,
    receitaBase,
    outrasReceitas,
    receitaConsiderada,
    despesas,
    despesaTotal,
    lucro,
    margem: MESES.map((_, i) => dividir(lucro[i], receitaConsiderada[i])),
    pontoEquilibrio: despesaTotal.slice(),
  };
}

/* --------------------------------------------- Painel operacional (Apoio Dashboard) */

/** numero de dias da semana citados no campo "Dia(s) da Semana" */
function contarDiasSemana(texto) {
  return DIAS_SEMANA.reduce((s, dia) => s + (contem(texto, dia) ? 1 : 0), 0);
}

function painelOperacional(alunos, pagamentosCalc, opcoes) {
  // Aulas semanais estimadas por professor
  const cargaProfessor = (opcoes.professores || []).map(prof => ({
    rotulo: prof,
    valor: alunos
      .filter(a => String(a.professor || '') === prof)
      .reduce((s, a) => s + contarDiasSemana(a.dias), 0),
  }));

  const carteiraPlano = (opcoes.planos || []).map(plano => ({
    rotulo: plano,
    valor: alunos.filter(a => String(a.plano || '') === plano).length,
  }));

  const diasConcorridos = DIAS_SEMANA.map(dia => ({
    rotulo: dia,
    valor: alunos.filter(a => contem(a.dias, dia)).length,
  }));

  const horarios = FAIXAS_HORARIO.map(faixa => ({
    rotulo: faixa.rotulo,
    valor: alunos.filter(a => {
      const h = String(a.horario || '');
      if (!/^\d{1,2}:\d{2}/.test(h)) return false;
      const hora = Number(h.split(':')[0]);
      return hora >= faixa.de && hora < faixa.ate;
    }).length,
  }));

  // ÚNICO + ORDENARPOR(...;-1) sobre os objetivos informados
  const objetivosUnicos = [...new Set(alunos.map(a => String(a.objetivo || '').trim()).filter(Boolean))];
  const objetivos = ordenarDesc(
    objetivosUnicos.map(o => ({ rotulo: o, valor: alunos.filter(a => String(a.objetivo || '').trim() === o).length })),
    x => x.valor);

  // Ranking historico de atrasos: MÁXIMOSES(Dias em Atraso; Aluno; nome)
  const alunosPagos = [...new Set(pagamentosCalc.map(p => String(p.aluno || '').trim()).filter(Boolean))];
  const rankingAtrasos = ordenarDesc(
    alunosPagos.map(nome => ({
      rotulo: nome,
      valor: Math.max(0, ...pagamentosCalc
        .filter(p => String(p.aluno || '').trim() === nome)
        .map(p => n(p.diasAtraso))),
    })),
    x => x.valor);

  const situacaoPagamentos = SITUACOES.map(s => ({
    rotulo: s,
    valor: pagamentosCalc.filter(p => p.situacao === s).length,
  }));

  const emAtraso = pagamentosCalc.filter(p => p.situacao === 'Em atraso');
  const nomesAtraso = [...new Set(emAtraso.map(p => String(p.aluno || '').trim()).filter(Boolean))];
  const inadimplentes = nomesAtraso.length
    ? ordenarDesc(nomesAtraso.map(nome => ({
        rotulo: nome,
        valor: Math.max(0, ...emAtraso.filter(p => String(p.aluno || '').trim() === nome).map(p => n(p.diasAtraso))),
      })), x => x.valor)
    : [{ rotulo: 'Nenhum em atraso', valor: 0 }];

  const statusCarteira = (opcoes.status || []).map(s => ({
    rotulo: s,
    valor: alunos.filter(a => String(a.status || '') === s).length,
  }));

  const receitaPorForma = (opcoes.formasPagamento || []).map(f => ({
    rotulo: f,
    valor: pagamentosCalc.filter(p => String(p.forma || '') === f).reduce((s, p) => s + n(p.valor), 0),
  }));

  const emDia = pagamentosCalc.filter(p => p.situacao === 'Em dia').length;
  const comAtraso = pagamentosCalc.filter(p => p.situacao === 'Pago com atraso').length;

  return {
    cargaProfessor,
    carteiraPlano,
    diasConcorridos,
    horarios,
    objetivos,
    rankingAtrasos,
    situacaoPagamentos,
    inadimplentes,
    statusCarteira,
    receitaPorForma,
    aulasSemanais: cargaProfessor.reduce((s, x) => s + x.valor, 0),
    inadimplentesAtuais: pagamentosCalc.filter(p => p.situacao === 'Em atraso').length,
    pontualidade: dividir(emDia, emDia + comAtraso),
    receitaContratada: alunos.filter(a => String(a.status || '') === 'Ativo')
      .reduce((s, a) => s + n(a.valorMensal), 0),
  };
}

/* ------------------------------------------------------------------ Dashboard */

/**
 * Indicadores do topo do Dashboard.
 *   Receita acumulada = SOMA(RECEITA CONSIDERADA de Janeiro ate MÊS(HOJE()))
 *   Ticket medio      = Receita acumulada / SOMA(Alunos ativos no periodo)
 *   Pro-labore/Receita= SOMA(Pró-labore no periodo) / Receita acumulada
 */
function calcularDashboard(calc2026, calc2027, operacional, fin26, hoje) {
  const mesCorrente = Math.min(paraData(hoje).getUTCMonth() + 1, 12);
  const ate = v => v.slice(0, mesCorrente).reduce((s, x) => s + x, 0);

  const receitaAcumulada = ate(calc2026.receitaConsiderada);
  const despesasAcumuladas = ate(calc2026.despesaTotal);
  const lucroAcumulado = ate(calc2026.lucro);

  const idProLabore = fin26.proLaboreId
    || (calc2026.despesas.find(d => d.nome === 'Pró-labore') || {}).id
    || (calc2026.despesas[0] || {}).id;
  const proLabore = calc2026.despesas.find(d => d.id === idProLabore);

  return {
    mesCorrente,
    nomeMesCorrente: MESES[mesCorrente - 1],
    receitaAcumulada,
    despesasAcumuladas,
    lucroAcumulado,
    margemLiquida: dividir(lucroAcumulado, receitaAcumulada),
    alunosAtivosMes: calc2026.alunosAtivos[mesCorrente - 1],
    ticketMedio: dividir(receitaAcumulada, ate(calc2026.alunosAtivos)),
    proLaboreSobreReceita: dividir(proLabore ? ate(proLabore.valoresCalculados) : 0, receitaAcumulada),
    receitaProjetada2027: calc2027.receitaConsiderada.reduce((s, x) => s + x, 0),
    // séries mensais usadas pelos mini-gráficos dos indicadores
    serieProLaboreSobreReceita: MESES.map((_, i) =>
      dividir(proLabore ? proLabore.valoresCalculados[i] : 0, calc2026.receitaConsiderada[i])),
    serieTicketMedio: MESES.map((_, i) =>
      dividir(calc2026.receitaConsiderada[i], calc2026.alunosAtivos[i])),
    operacional,
  };
}

/** Motor completo: recebe os dados brutos e devolve tudo calculado. */
function calcularTudo(dados, hoje) {
  const referencia = hoje || hojeISO();
  const alunos = dados.alunos || [];
  const pagamentosCalc = calcularPagamentos(dados.pagamentos || [], alunos, paraData(referencia));

  const calc2026 = calcularFinanceiro2026(dados.financeiro2026, alunos, pagamentosCalc);
  const contaPessoal = calcularContaPessoal(dados.contaPessoal2026, calc2026);
  const calc2027 = calcularFinanceiro2027(dados.financeiro2027, calc2026, dados.financeiro2026, pagamentosCalc);
  calc2027.alunosAtivos = alunosAtivosPorMes(alunos, calc2027.ano);

  const operacional = painelOperacional(alunos, pagamentosCalc, dados.opcoes || {});
  const dashboard = calcularDashboard(calc2026, calc2027, operacional, dados.financeiro2026, referencia);

  return { hoje: referencia, pagamentosCalc, calc2026, contaPessoal, calc2027, operacional, dashboard };
}

/* ------------------------------------------------------------- formatacao */

const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtMoedaCurta = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

function moeda(v) { return fmtMoeda.format(n(v)); }
function moedaCurta(v) { return fmtMoedaCurta.format(n(v)); }
function percentual(v) { return (n(v) * 100).toFixed(1).replace('.', ',') + '%'; }
function inteiro(v) { return fmtNumero.format(n(v)); }
function dataBR(iso) {
  if (!iso) return '';
  const p = String(iso).slice(0, 10).split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : String(iso);
}
/** Data e hora (timestamp completo, ex.: "2026-08-21T14:32:10.123Z") no horário local do navegador. */
function dataHoraBR(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function competenciaBR(iso) {
  const d = paraData(iso);
  return d ? `${MESES_CURTOS[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}` : '';
}
