export const state = {
  fisico:     { bateria: 11.8, freio: true, marcha: 'P' },
  eletronico: { freio: false, marcha: 'P', alarme: true },
  evidencias: [],
  hipotese: null,
  expressao: '',
  testes: null,
  tabela: null,
  tabelaResultado: null,
  blocos: null,
  avaliacao: null,
  procedimento: { reconectar_sensor: false, desligar_alarme: false },

  score: 0,
  xp: 0,
  dinheiro: 0,

  desafiosConcluidos: [],
  desafioAtual: null,
  boasVindasVistas: false,

  personagensDesbloqueados: ['default'],
  personagemAtual: 'default'
};

const SAVE_KEY = 'oz-save';

export function carregarProgresso() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    state.xp = data.xp || 0;
    state.dinheiro = data.dinheiro || 0;
    state.score = data.score || 0;
    state.desafiosConcluidos = data.desafiosConcluidos || [];
    state.boasVindasVistas = data.boasVindasVistas || false;
    state.personagensDesbloqueados = data.personagensDesbloqueados || ['default'];
    state.personagemAtual = data.personagemAtual || 'default';
  } catch (e) {
    console.warn('[state] erro ao carregar:', e);
  }
}

export function salvarProgresso() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      xp: state.xp,
      dinheiro: state.dinheiro,
      score: state.score,
      desafiosConcluidos: state.desafiosConcluidos,
      boasVindasVistas: state.boasVindasVistas,
      personagensDesbloqueados: state.personagensDesbloqueados,
      personagemAtual: state.personagemAtual
    }));
  } catch (e) {
    console.warn('[state] erro ao salvar:', e);
  }
}

export function resetarProgresso() {
  state.xp = 0;
  state.dinheiro = 0;
  state.score = 0;
  state.desafiosConcluidos = [];
  state.boasVindasVistas = false;
  state.personagensDesbloqueados = ['default'];
  state.personagemAtual = 'default';
  localStorage.removeItem(SAVE_KEY);
}

carregarProgresso();

export function registrarEvidencia(ev) {
  if (!state.evidencias.find(e => e.label === ev.label)) {
    state.evidencias.push(ev);
  }
}

export function temEvidencia(label, valor) {
  return state.evidencias.some(e => e.label === label && (valor === undefined || e.valor === valor));
}

export function desafioConcluido(id) {
  return state.desafiosConcluidos.includes(id);
}

export function marcarDesafioConcluido(id) {
  if (id && !state.desafiosConcluidos.includes(id)) {
    state.desafiosConcluidos.push(id);
    salvarProgresso();
  }
}

export function totalDesafiosConcluidos() {
  return state.desafiosConcluidos.length;
}
