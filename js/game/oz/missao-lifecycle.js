import { flow, FASE } from '../flow.js';
import { state, salvarProgresso, marcarDesafioConcluido } from '../state.js';
import { renderScreens, animarConclusao } from '../../ui/screens.js';
import { avaliarMissaoEspecifica }         from '../evaluator.js';
import { getMissao }                       from '../missoes/index.js';
import { mostrarToast }                    from '../../ui/toast.js';
import { resetMissionState }               from './state-reset.js';

let verificarDesbloqueios = () => false;
let playerRef             = null;

export function setVerificarDesbloqueios(fn) { verificarDesbloqueios = fn; }
export function setPlayerRef(p)              { playerRef = p; }

export function iniciarMissao(id) {
  const m = getMissao(id);
  if (!m) { alert(`Desafio desconhecido: ${id}`); return; }

  resetMissionState();
  state.desafioAtual = id;

  (m.procedimentos || []).forEach(p => { state.procedimento[p.id] = false; });

  flow.ir(FASE.RECEPCAO);
  renderScreens();
}

export function voltarOficina() {
  const limpar = () => {
    resetMissionState();
    state.desafioAtual = null;
    salvarProgresso();
    renderScreens();
  };

  if (state.desafioAtual) {
    playerRef?.playOneShot?.('disappointed', 1500);
    setTimeout(() => { flow.ir(FASE.WORKSHOP); limpar(); }, 1500);
    return;
  }
  flow.ir(FASE.WORKSHOP);
  limpar();
}

export function concluirMissao() {
  const m = getMissao(state.desafioAtual);
  if (!m || state._missaoFinalizada) return;

  if (m.id === 'missao01') {
    state.expressao = 'return ' + (state.blocos || []).map(b => b.label).join(' ');
  }

  const resultado = avaliarMissaoEspecifica(state);
  if (!resultado) { console.error('[OZ] Avaliador não retornou resultado.'); return; }

  state.avaliacao = resultado;
  const aprovado  = resultado.aprovado === true;

  if (aprovado) {
    state._missaoFinalizada = true;
    const r = resultado.recompensa || m.recompensa || { xp: 100, dinheiro: 250 };
    state.xp       = (state.xp || 0)       + r.xp;
    state.dinheiro = (state.dinheiro || 0) + r.dinheiro;
    state.score    = (state.score || 0)    + 100;
    state._ultimaRecompensa = { ...r };

    if (state.desafioAtual) marcarDesafioConcluido(state.desafioAtual);
    if (verificarDesbloqueios()) {
      setTimeout(() => mostrarToast('🎉 Novo local desbloqueado na oficina!', 4000), 3500);
    }
    salvarProgresso();
  } else {
    state._ultimaRecompensa = { xp: 0, dinheiro: 0 };
  }

  if (playerRef?.playOneShot) {
    if (aprovado) playerRef.playOneShot('excited', 2000);
    else {
      const reacao = Math.random() < 0.5 ? 'disappointed' : 'kickGroin';
      playerRef.playOneShot(reacao, 1500);
    }
  }

  const delay = aprovado ? 100 : 1500;
  setTimeout(() => {
    flow.ir(FASE.RESULTADO);
    renderScreens();
    if (aprovado) setTimeout(() => animarConclusao(), 100);
  }, delay);
}

export function resetProgresso() {
  state.xp = 0;
  state.dinheiro = 0;
  state.score = 0;
  state.desafiosConcluidos = [];
  state._ultimaRecompensa  = null;
  state._missaoFinalizada  = false;
  salvarProgresso();
  renderScreens();
}
