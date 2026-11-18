import { state }         from '../state.js';
import { renderScreens } from '../../ui/screens.js';
import { rodarTestes }   from '../evaluator.js';
import { getMissao }     from '../missoes/index.js';

export function addBloco(id, label) {
  if (!state.blocos) state.blocos = [];
  state.blocos.push({ id, label });
  state.avaliacao = null;
  renderScreens();
}

export function removeBloco(i) {
  if (state.blocos) state.blocos.splice(i, 1);
  state.avaliacao = null;
  renderScreens();
}

export function limparBlocos() {
  state.blocos    = [];
  state.testes    = null;
  state.avaliacao = null;
  renderScreens();
}

export function rodarTestesMissao() {
  const m = getMissao(state.desafioAtual);
  if (!m) return;
  state.expressao = 'return ' + (state.blocos || []).map(b => b.label).join(' ');
  state.testes    = rodarTestes(state.expressao, m.tabela);
  renderScreens();
}
