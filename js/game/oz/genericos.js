import { state }                            from '../state.js';
import { renderScreens, abrirScanner }      from '../../ui/screens.js';
import { getMissao }                        from '../missoes/index.js';
import { avaliarTabela }                    from '../evaluator.js';

export function escolherHipotese(id) {
  const m = getMissao(state.desafioAtual);
  if (!m) return;
  if (!(m.hipoteses || []).some(h => h.id === id)) return;

  const h = m.hipoteses.find(h => h.id === id);
  state.hipotese  = { id: h.id, label: h.label };
  state.avaliacao = null;
  renderScreens();
}

export function executarProcedimento(id) {
  const m = getMissao(state.desafioAtual);
  if (!m) return;
  const p = (m.procedimentos || []).find(x => x.id === id);
  if (!p) return;
  if (state.procedimento?.[id]) return;

  if (m.id === 'missao01') {
    if (id === 'reconectar_sensor' && state.eletronico && state.fisico)
      state.eletronico.freio = state.fisico.freio;
    if (id === 'desligar_alarme' && state.eletronico)
      state.eletronico.alarme = false;
    if (id === 'carregar_bateria' && state.fisico)
      state.fisico.bateria = 12.6;
  }

  if (!state.procedimento) state.procedimento = {};
  state.procedimento[id] = true;
  state.avaliacao        = null;
  abrirScanner(id);
}

export function marcarTabela(l, v) {
  if (!state.tabela) state.tabela = [];
  state.tabela[l]         = v;
  state.tabelaResultado   = null;
  state.avaliacao         = null;
  renderScreens();
}

export function validarTabela() {
  const m = getMissao(state.desafioAtual);
  if (!m || !m.tabela) return;
  state.tabelaResultado = avaliarTabela(state.tabela, m.tabela);
  renderScreens();
}
