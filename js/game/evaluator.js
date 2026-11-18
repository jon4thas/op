
import { getMissao } from './missoes/index.js';

// ======================================================
// AVALIADOR DE EXPRESSÕES LÓGICAS
// MISSÃO 01 — OPERAÇÃO SENTINEL
// ======================================================

export function avaliar(expr, env = {}) {

  try {

    if (!expr || typeof expr !== 'string') {
      return false;
    }

    if (!env || typeof env !== 'object') {
      return false;
    }

    const exprLimpa = expr
      .trim()
      .replace(/^return\s+/, '')
      .replace(/;$/, '')
      .trim();

    if (!exprLimpa) return false;

    // --------------------------------------------------
    // VALIDAÇÃO DA EXPRESSÃO
    // --------------------------------------------------

    // Permite apenas operadores e caracteres necessários
    // para expressões booleanas da missão.

    if (!/^[\w\s!&|()]+$/.test(exprLimpa)) {
      throw new Error('Expressão contém caracteres não permitidos.');
    }

    // Identifica os nomes utilizados na expressão
    const identificadores = exprLimpa.match(/[a-zA-Z_$][\w$]*/g) || [];

    const permitidos = new Set([
      ...Object.keys(env),
      'true',
      'false'
    ]);

    for (const nome of identificadores) {

      if (!permitidos.has(nome)) {
        throw new Error(`Identificador não permitido: ${nome}`);
      }

    }

    // Impede operadores isolados
    if (
      /(?<!&)&(?!&)|(?<!\|)\|(?!\|)/.test(exprLimpa)
    ) {
      throw new Error('Operador lógico inválido.');
    }

    // --------------------------------------------------
    // EXECUÇÃO CONTROLADA
    // --------------------------------------------------

    const keys = Object.keys(env);
    const values = Object.values(env);

    const fn = new Function(
      ...keys,
      `"use strict"; return (${exprLimpa});`
    );

    return Boolean(fn(...values));

  } catch (e) {

    console.warn(
      '[evaluator] Erro ao avaliar:',
      e.message,
      '| Expressão:',
      expr
    );

    return false;
  }
}


// ======================================================
// BLOCOS DISPONÍVEIS
// OPERAÇÃO SENTINEL
// ======================================================

export const BLOCOS_DISPONIVEIS = [

  // Condições do sistema
  {
    id: 'autenticado',
    label: 'autenticado'
  },

  {
    id: 'estoque',
    label: 'estoque'
  },

  {
    id: 'pagamento',
    label: 'pagamento'
  },

  {
    id: 'bloqueado',
    label: 'bloqueado'
  },

  // Operadores lógicos
  {
    id: 'AND',
    label: '&&'
  },

  {
    id: 'OR',
    label: '||'
  },

  {
    id: 'NOT',
    label: '!'
  },

  // Agrupamento
  {
    id: 'ABRE',
    label: '('
  },

  {
    id: 'FECHA',
    label: ')'
  }

];


// ======================================================
// TABELA-VERDADE PADRÃO
// OPERAÇÃO SENTINEL
// ======================================================

export const TABELA_VERDADE = [

  {
    autenticado: true,
    estoque: true,
    pagamento: true,
    bloqueado: false,
    expected: true
  },

  {
    autenticado: false,
    estoque: true,
    pagamento: true,
    bloqueado: false,
    expected: false
  },

  {
    autenticado: true,
    estoque: false,
    pagamento: true,
    bloqueado: false,
    expected: false
  },

  {
    autenticado: true,
    estoque: true,
    pagamento: false,
    bloqueado: false,
    expected: false
  },

  {
    autenticado: true,
    estoque: true,
    pagamento: true,
    bloqueado: true,
    expected: false
  },

  {
    autenticado: false,
    estoque: false,
    pagamento: true,
    bloqueado: false,
    expected: false
  },

  {
    autenticado: true,
    estoque: false,
    pagamento: false,
    bloqueado: true,
    expected: false
  },

  {
    autenticado: false,
    estoque: true,
    pagamento: false,
    bloqueado: true,
    expected: false
  }

];


// ======================================================
// AVALIAR TABELA
// ======================================================

export function avaliarTabela(respostas, tabela = null) {

  const base = tabela || TABELA_VERDADE;

  if (!Array.isArray(respostas) || respostas.length !== base.length) {

    return {
      ok: false,
      erro: 'Preencha todas as linhas.'
    };

  }

  const resultados = base.map((linha, i) => ({

    linha: i + 1,

    esperado: linha.expected,

    marcado: respostas[i],

    ok: respostas[i] === linha.expected

  }));

  const acertos = resultados.filter(r => r.ok).length;

  return {

    ok: acertos === base.length,

    acertos,

    total: base.length,

    resultados

  };

}


// ======================================================
// RODAR TESTES AUTOMATIZADOS
// OPERAÇÃO SENTINEL
// ======================================================

export function rodarTestes(expressao, tabela = null) {

  const base = tabela || TABELA_VERDADE;

  const resultados = base.map((sc, index) => {

    const env = {

      autenticado: Boolean(sc.autenticado),

      estoque: Boolean(sc.estoque),

      pagamento: Boolean(sc.pagamento),

      bloqueado: Boolean(sc.bloqueado)

    };

    const got = avaliar(expressao, env);

    return {

      linha: index + 1,

      desc:
        `Autenticado: ${env.autenticado} | ` +
        `Estoque: ${env.estoque} | ` +
        `Pagamento: ${env.pagamento} | ` +
        `Bloqueado: ${env.bloqueado}`,

      expected: sc.expected,

      got,

      ok: got === sc.expected

    };

  });

  const pass = resultados.filter(r => r.ok).length;

  return {

    resultados,

    pass,

    total: resultados.length,

    aprovado: pass === resultados.length

  };

}


// ======================================================
// AVALIADOR PRINCIPAL
// EXCLUSIVO — OPERAÇÃO SENTINEL
// ======================================================

export function avaliarMissaoEspecifica(state) {

  const m = getMissao(state.desafioAtual);

  if (!m || m.id !== 'missao01') {

    return {

      aprovado: false,

      detalhes: {
        erro: 'Missão não encontrada ou não suportada.'
      },

      recompensa: {
        xp: 0,
        dinheiro: 0
      }

    };

  }

  // --------------------------------------------------
  // 1. VALIDAR HIPÓTESE
  // --------------------------------------------------

  const hipoteseOK =
    state.hipotese?.id === m.hipoteseCorreta;


  // --------------------------------------------------
  // 2. VALIDAR PROCEDIMENTOS
  // --------------------------------------------------

  const procedimentos = m.procedimentos || [];

  const correcoesOK =
    procedimentos.length > 0 &&
    procedimentos.every(p => state.procedimento?.[p.id] === true);


  // --------------------------------------------------
  // 3. VALIDAR TESTES AUTOMATIZADOS
  // --------------------------------------------------

  const testesOK =
    Array.isArray(state.testes?.resultados) &&
    state.testes.total > 0 &&
    state.testes.pass === state.testes.total;


  // --------------------------------------------------
  // 4. VALIDAR EXPRESSÃO DE REFERÊNCIA
  // --------------------------------------------------

  const expressaoOK = (() => {

    if (!state.expressao || !m.expressaoReferencia) {
      return false;
    }

    const tabela = m.tabela || TABELA_VERDADE;

    const testesReferencia = rodarTestes(
      m.expressaoReferencia,
      tabela
    );

    const testesAluno = rodarTestes(
      state.expressao,
      tabela
    );

    return (
      testesReferencia.pass === testesReferencia.total &&
      testesAluno.pass === testesAluno.total
    );

  })();


  // --------------------------------------------------
  // 5. RESULTADO FINAL
  // --------------------------------------------------

  const aprovado =
    hipoteseOK &&
    correcoesOK &&
    testesOK &&
    expressaoOK;


  const detalhes = {

    hipoteseOK,

    correcoesOK,

    testesOK,

    expressaoOK,

    procedimentosConcluidos:
      procedimentos.filter(p => state.procedimento?.[p.id]).length,

    procedimentosTotal:
      procedimentos.length,

    testesAprovados:
      state.testes?.pass || 0,

    testesTotal:
      state.testes?.total || 0

  };


  // --------------------------------------------------
  // 6. RECOMPENSA
  // --------------------------------------------------

  const recompensaBase =
    m.recompensa || {
      xp: 100,
      dinheiro: 250
    };

  const recompensa = {
    ...recompensaBase
  };


  return {

    aprovado,

    detalhes,

    missao: m,

    recompensa

  };

}

