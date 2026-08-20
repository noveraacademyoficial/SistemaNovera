/* ============================================================================
   TELAS DOS PROFESSORES
   Uma tela por professor, com as sub-abas Aulas, Remarcações,
   Aula experimental (só Olivia) e Dados das Aulas.
   Os dados do aluno vêm do Cadastro de alunos; valores de mensalidade não.
   ========================================================================== */

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Exam'];
const SIM_NAO = ['Sim', 'Não'];
const VERSOES_SCRIPT = ['1.0', '2.0'];
const PROFESSOR_COM_EXPERIMENTAL = 'Olivia';
const PROFESSOR_COM_CONTADOR_MENSAL = 'Olivia';

const PROFESSOR_COM_BANCO_DADOS = 'Davi';

const SUBABAS_PROFESSOR = [
  { id: 'aulas', rotulo: 'Aulas' },
  { id: 'remarcacoes', rotulo: 'Remarcações' },
  { id: 'experimental', rotulo: 'Aula experimental', apenas: PROFESSOR_COM_EXPERIMENTAL },
  { id: 'dadosAulas', rotulo: 'Dados das Aulas', apenas: PROFESSOR_COM_BANCO_DADOS },
  { id: 'bancoDados', rotulo: 'Banco de Dados', apenas: PROFESSOR_COM_BANCO_DADOS },
];

function subabasDe(professor) {
  return SUBABAS_PROFESSOR.filter(s => !s.apenas || s.apenas === professor);
}

/* ------------------------------------------------------ campos de cada aba */

/**
 * Aulas: todas as colunas são do professor. O cadastro só dá o valor inicial.
 * O campo Status usa `listaGlobal: 'status'` — em vez de uma lista fixa, ele lê
 * `opcoes.status` (a mesma lista da aba Listas e opções), então as duas telas
 * de professor e o Cadastro de alunos compartilham as mesmas opções.
 * Os dois professores têm colunas ligeiramente diferentes: o Davi mantém
 * Qtd. Aula (livre) e ganhou Valor Mês Seguinte; a Olivia perdeu Qtd. Aula —
 * o lugar dela agora é o gráfico + contador mensal (ver aulasMensaisDoProfessor).
 */
function camposAulaPara(professor) {
  const base = [
    { chave: 'aluno', rotulo: 'Nomes', largura: 170 },
    { chave: 'level', rotulo: 'Level', lista: LEVELS, largura: 90 },
    { chave: 'dia', rotulo: 'Dia', diasMultiplos: true, largura: 175 },
    { chave: 'horario', rotulo: 'Horário', hora: true, largura: 100 },
    { chave: 'status', rotulo: 'Status', listaGlobal: 'status', largura: 110 },
    { chave: 'observacao', rotulo: 'Observação', largura: 200 },
    { chave: 'nApresentacao', rotulo: 'N Apresentação', numero: true, largura: 120 },
    { chave: 'pagSlide', rotulo: 'Pag. Slide', numero: true, largura: 100 },
  ];
  if (professor !== PROFESSOR_COM_CONTADOR_MENSAL) {
    base.push({ chave: 'qtdAula', rotulo: 'Qtd. Aula', numero: true, largura: 100 });
  }
  base.push(
    { chave: 'scriptFeito', rotulo: 'Script Feito', lista: SIM_NAO, largura: 105 },
    { chave: 'scriptModelo', rotulo: 'Script Modelo', lista: VERSOES_SCRIPT, largura: 110 },
    { chave: 'aulaFeita', rotulo: 'Aula feita', lista: SIM_NAO, largura: 100 },
  );
  if (professor === 'Davi') {
    base.push({ chave: 'valorMesSeguinte', rotulo: 'Valor Mês Seguinte', numero: true, largura: 135 });
  }
  return base;
}

/** Remarcações — campos exatamente como na planilha "Remarcação dos alunos". */
const CAMPOS_REMARCACAO = [
  { chave: 'aluno', rotulo: 'Name', autocompleteAlunos: true, largura: 170 },
  { chave: 'ativa', rotulo: 'Aula feita', lista: SIM_NAO, largura: 90 },
  { chave: 'avisou24h', rotulo: 'Avisou 24h', lista: SIM_NAO, largura: 105 },
  { chave: 'data', rotulo: 'Data', data: true, largura: 140 },
  { chave: 'diaSemana', rotulo: 'Dia da semana', lista: DIAS_SEMANA, largura: 130 },
  { chave: 'horario', rotulo: 'Horário', hora: true, largura: 100 },
  { chave: 'marcacaoOlivia', rotulo: 'Marcação Olivia', lista: SIM_NAO, largura: 130 },
  { chave: 'mes', rotulo: 'Mês', lista: MESES, largura: 115 },
  { chave: 'observacao', rotulo: 'Observação', largura: 200 },
];

/** Aula experimental — campos exatamente como na planilha "Aula experimental". */
const CAMPOS_EXPERIMENTAL = [
  { chave: 'aluno', rotulo: 'Name', largura: 170 },
  { chave: 'data', rotulo: 'Data', data: true, largura: 140 },
  { chave: 'diaSemana', rotulo: 'Dia Semana', lista: DIAS_SEMANA, largura: 130 },
  { chave: 'feito', rotulo: 'Feito', lista: SIM_NAO, largura: 90 },
  { chave: 'horario', rotulo: 'Horário', hora: true, largura: 100 },
  { chave: 'level', rotulo: 'Level', lista: LEVELS, largura: 90 },
  { chave: 'msgAntes', rotulo: 'Msg. Antes da Aula', lista: SIM_NAO, largura: 145 },
  { chave: 'msgContatoRecebido', rotulo: 'Msg. Contato Recebido', lista: SIM_NAO, largura: 165 },
  { chave: 'observacao', rotulo: 'Observação', largura: 200 },
  { chave: 'qtdAulas', rotulo: 'Qtd Aulas', numero: true, largura: 100 },
];

const CAMPOS_DADOS_AULAS = [
  { chave: 'mes', rotulo: 'Selecionar mês', lista: MESES, largura: 140 },
  { chave: 'ano', rotulo: 'Ano', numero: true, largura: 90 },
  { chave: 'bancoHoras', rotulo: 'Banco de horas', numero: true, largura: 125 },
  { chave: 'mensalidade', rotulo: 'Mensalidade', numero: true, largura: 125 },
  { chave: 'pago', rotulo: 'Pago', lista: SIM_NAO, largura: 90 },
  { chave: 'dataRelatorio', rotulo: 'Data relatório', data: true, largura: 145 },
  { chave: 'relatorioEntregue', rotulo: 'Relatório Entregue', lista: SIM_NAO, largura: 145 },
  { chave: 'observacao', rotulo: 'Observação', largura: 220 },
  { chave: 'professor', rotulo: 'Professor(a)', largura: 120 },
];

/**
 * Banco de Dados (só Davi) — tabela livre, à espera dos dados reais do Excel
 * dele. Enquanto o arquivo não é confirmado, fica com colunas genéricas,
 * todas editáveis, para já poder ser usada e depois ajustada sem perder nada.
 */
const CAMPOS_BANCO_DADOS = [
  { chave: 'titulo', rotulo: 'Título', largura: 190 },
  { chave: 'categoria', rotulo: 'Categoria', largura: 150 },
  { chave: 'data', rotulo: 'Data', data: true, largura: 140 },
  { chave: 'valor', rotulo: 'Valor', numero: true, largura: 110 },
  { chave: 'observacao', rotulo: 'Observação', largura: 260 },
];

function camposDaSubaba(subaba, professor) {
  if (subaba === 'aulas') return camposAulaPara(professor);
  return {
    remarcacoes: CAMPOS_REMARCACAO, experimental: CAMPOS_EXPERIMENTAL,
    dadosAulas: CAMPOS_DADOS_AULAS, bancoDados: CAMPOS_BANCO_DADOS,
  }[subaba] || [];
}

const CONJUNTO_DA_SUBABA = { aulas: 'aulas', remarcacoes: 'remarcacoes', experimental: 'experimentais', dadosAulas: 'dadosAulas', bancoDados: 'bancoDados' };

/* --------------------------------------------------------- aulas x cadastro

   Cada professor tem a SUA lista de aulas, guardada com o campo `professor`.
   O Cadastro de alunos só fornece o valor inicial de uma linha nova; depois
   disso a linha é do professor e editar aqui não mexe no cadastro nem na tela
   do outro professor.                                                        */

/** Primeiro dia da semana citado no campo (0 = Segunda). 99 quando não há dia. */
function indiceDoDia(texto) {
  const i = DIAS_SEMANA.findIndex(d => contem(texto, d));
  return i < 0 ? 99 : i;
}
/** Horário em minutos, para ordenar. 9999 quando não há horário. */
function minutosDoHorario(texto) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(texto || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : 9999;
}
/** Ordena do primeiro dia da semana para o último e, dentro do dia, pelo horário. */
function ordenarPorDiaEHorario(lista, campoDia = 'dia', campoHora = 'horario') {
  return lista.slice().sort((a, b) =>
    (indiceDoDia(a[campoDia]) - indiceDoDia(b[campoDia])) ||
    (minutosDoHorario(a[campoHora]) - minutosDoHorario(b[campoHora])) ||
    String(a.aluno || '').localeCompare(String(b.aluno || ''), 'pt-BR'));
}
/** Ordena só pelo horário (sem considerar o dia) — usado em Aula experimental. */
function ordenarPorHorario(lista, campoHora = 'horario') {
  return lista.slice().sort((a, b) =>
    (minutosDoHorario(a[campoHora]) - minutosDoHorario(b[campoHora])) ||
    String(a.aluno || '').localeCompare(String(b.aluno || ''), 'pt-BR'));
}
/**
 * Ordena por data (crescente) e, dentro do mesmo dia, por horário — usado em
 * Remarcações, onde cada linha é um encontro numa data específica (a data em
 * si é "aaaa-mm-dd", então comparar como texto já ordena certo). Sem data
 * preenchida fica no início.
 */
function ordenarPorDataEHorario(lista, campoData = 'data', campoHora = 'horario') {
  return lista.slice().sort((a, b) =>
    String(a[campoData] || '').localeCompare(String(b[campoData] || '')) ||
    (minutosDoHorario(a[campoHora]) - minutosDoHorario(b[campoHora])) ||
    String(a.aluno || '').localeCompare(String(b.aluno || ''), 'pt-BR'));
}

/**
 * Mês (1-12) de um registro de Remarcações ou Aula experimental, para o filtro
 * de mês dessas duas abas. Remarcações já tem o campo "Mês" (nome por extenso,
 * igual à planilha); Aula experimental só tem "Data" (aaaa-mm-dd), então o mês
 * é extraído dali. 0 quando não dá para saber (sem Data preenchida).
 */
function mesDoRegistroProfessor(subaba, registro) {
  if (subaba === 'remarcacoes') return MESES.indexOf(registro.mes) + 1;
  if (subaba === 'experimental') {
    const iso = String(registro.data || '');
    return /^\d{4}-\d{2}-\d{2}/.test(iso) ? Number(iso.slice(5, 7)) : 0;
  }
  return 0;
}

/**
 * Monta a lista de Aulas do professor.
 * `incluirRemovidos` traz de volta as linhas que o professor excluiu (para a
 * tela de "alunos removidos"); por padrão elas ficam de fora.
 */
function aulasDoProfessor(alunos, aulas, professor, incluirRemovidos) {
  const minhas = aulas.filter(x => String(x.professor || '') === professor);
  const porAlunoId = new Map(minhas.filter(x => x.alunoId).map(x => [x.alunoId, x]));

  // uma linha por aluno do professor no cadastro
  const linhas = alunos
    .filter(a => String(a.professor || '') === professor)
    .map(aluno => {
      const registro = porAlunoId.get(aluno.id);
      if (registro) return { ...registro, alunoId: aluno.id, novo: false };
      // ainda não existe registro: mostra os valores do cadastro como ponto de partida
      return {
        id: null, novo: true, professor, alunoId: aluno.id, removida: false,
        aluno: aluno.nome, dia: aluno.dias || '', horario: aluno.horario || '',
        status: aluno.status || '', level: '', observacao: '',
        nApresentacao: null, pagSlide: null, qtdAula: null, valorMesSeguinte: null,
        scriptFeito: '', scriptModelo: '', aulaFeita: '',
      };
    });

  // linhas criadas à mão pelo professor (sem vínculo com o cadastro)
  const avulsas = minhas.filter(x => !x.alunoId).map(x => ({ ...x, novo: false }));

  const todas = ordenarPorDiaEHorario([...linhas, ...avulsas]);
  return incluirRemovidos ? todas : todas.filter(a => !a.removida);
}

/** Filtra a lista de aulas por dia da semana ("" = todos). */
function filtrarPorDia(lista, dia) {
  if (!dia) return lista;
  return lista.filter(a => contem(a.dia, dia));
}

/* ---------------------------------------------------------- indicadores */

function resumoDoProfessor(lista) {
  const total = lista.length;
  const ativos = lista.filter(a => a.status === 'Ativo').length;
  const aulasSemana = lista.reduce((s, a) => s + contarDiasSemana(a.dia), 0);
  const feitas = lista.filter(a => a.aulaFeita === 'Sim').length;
  const scripts = lista.filter(a => a.scriptFeito === 'Sim').length;
  return { total, ativos, aulasSemana, feitas, scripts };
}

/* ---------------------------------------------- contador mensal (Olivia)

   "Qtd. Aula" deixou de ser um número por aluno: agora é um total por mês.
   Sem data (a Aulas é um por-aluno, não um por-encontro), a única contagem
   automática possível é um retrato do momento — quantos alunos estão com
   "Aula feita = Sim" agora. Esse retrato só faz sentido para o MÊS CORRENTE;
   os demais meses do gráfico só têm valor se alguém preencheu manualmente.   */

/** Quantos alunos do professor estão com "Aula feita = Sim" agora mesmo. */
function contarAulasFeitas(lista) {
  return lista.filter(a => a.aulaFeita === 'Sim').length;
}

/**
 * Série de 12 meses (Jan..Dez) para o gráfico de aulas mensais.
 * `overrides` é a lista de contagemAulas.json já filtrada para o professor;
 * cada item tem {ano, mes (1-12), valor, remarcacao}. O valor de cada mês,
 * inclusive o corrente, é sempre o que está gravado: marcar "Aula feita" como
 * Sim numa linha normal soma 1 no total (origem "normal"); marcar "Aula feita"
 * (chave "ativa") como Sim numa linha de Remarcações também soma 1, mas fica registrado à
 * parte em `remarcacao` — é o que aparece destacado na barra, mostrando
 * quanto do mês veio de aula normal e quanto veio de remarcação. O botão
 * "Editar quantidade" (com senha do Davi) grava direto o total e zera esse
 * destaque, tratando como um ajuste manual "normal". Meses sem registro
 * ficam em branco (0).
 */
function aulasMensaisDoProfessor(overrides, ano) {
  const porMes = new Map((overrides || []).filter(o => Number(o.ano) === ano).map(o => [Number(o.mes), o]));
  return MESES.map((nome, i) => {
    const mes1a12 = i + 1;
    const registro = porMes.get(mes1a12);
    return {
      rotulo: nome.slice(0, 3),
      valor: registro ? Number(registro.valor) || 0 : 0,
      segmentoValor: registro ? Number(registro.remarcacao) || 0 : 0,
    };
  });
}

/** Distribuição dos alunos do professor por dia da semana. */
function alunosPorDia(lista) {
  return DIAS_SEMANA.map(dia => ({ rotulo: dia, valor: lista.filter(a => contem(a.dia, dia)).length }));
}

/** Distribuição das remarcações do professor por dia da semana (campo "Dia da semana"). */
function remarcacoesPorDia(lista) {
  return DIAS_SEMANA.map(dia => ({ rotulo: dia, valor: lista.filter(r => r.diaSemana === dia).length }));
}

/** Distribuição das aulas experimentais (só Olivia) pelo campo "Feito". */
function experimentaisPorStatus(lista) {
  const feitas = lista.filter(e => e.feito === 'Sim').length;
  const naoFeitas = lista.filter(e => e.feito === 'Não').length;
  const semStatus = lista.length - feitas - naoFeitas;
  const itens = [{ rotulo: 'Feito', valor: feitas }, { rotulo: 'Não feito', valor: naoFeitas }];
  if (semStatus > 0) itens.push({ rotulo: 'Aguardando', valor: semStatus });
  return itens;
}

/** Distribuição por faixa de horário. */
function alunosPorHorario(lista) {
  return FAIXAS_HORARIO.map(faixa => ({
    rotulo: faixa.rotulo,
    valor: lista.filter(a => {
      const h = String(a.horario || '');
      if (!/^\d{1,2}:\d{2}/.test(h)) return false;
      const hora = Number(h.split(':')[0]);
      return hora >= faixa.de && hora < faixa.ate;
    }).length,
  }));
}

/** Distribuição por level informado pelo professor. */
function alunosPorLevel(lista) {
  const usados = LEVELS.filter(l => lista.some(a => a.level === l));
  const semLevel = lista.filter(a => !a.level).length;
  const itens = usados.map(l => ({ rotulo: l, valor: lista.filter(a => a.level === l).length }));
  if (semLevel) itens.push({ rotulo: 'Sem level', valor: semLevel });
  return itens;
}

/**
 * Alunos do Davi com "Valor Mês Seguinte" preenchido — um sinal de possível
 * upgrade de plano, informado à mão pelo professor e sem vínculo com nenhuma
 * outra coluna (não é a mensalidade nem qualquer valor do Cadastro).
 */
function valoresMesSeguinte(aulasDoDavi) {
  return aulasDoDavi
    .filter(a => Number(a.valorMesSeguinte) > 0)
    .map(a => ({ rotulo: a.aluno, valor: Number(a.valorMesSeguinte) }))
    .sort((a, b) => b.valor - a.valor);
}
