import { state } from '../state.js';

export function resetMissionState() {
  state.hipotese        = null;
  state.evidencias      = [];
  state.tabela          = null;
  state.tabelaResultado = null;
  state.blocos          = null;
  state.testes          = null;
  state.avaliacao       = null;
  state.expressao       = '';
  state.procedimento    = {};
  state._ultimaRecompensa = null;
  state._missaoFinalizada = false;
}
