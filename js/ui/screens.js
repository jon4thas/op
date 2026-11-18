// ======================================================
// screens.js — orquestrador (missão única: missao01)
// ======================================================
import { flow, FASE } from '../game/flow.js';
import { state }      from '../game/state.js';

import { overlay, setHTML, setDisplay } from './screens/helpers.js';
import {
  renderWorkshop,
  renderBoasVindas,
  renderMenu,
  renderRecepcao,
  renderDesafio,
  renderResultado,
} from './screens/flow-screens.js';
import { atualizarPainelLateral } from './screens/panel-lateral.js';
import { renderLoja, destruirViewerLoja, iniciarViewerLoja } from './screens/loja.js';
import { abrirScanner }           from './screens/scanner.js';
import { animarConclusao }        from './screens/conclusao.js';
import { instalarListeners }      from './screens/listeners.js';

// ======================================================
// RENDER PRINCIPAL
// ======================================================
function render() {
  destruirViewerLoja();
  setHTML('screens-overlay', '');

  const fase = flow.fase;

  setDisplay('workshop-hud', 'none');
  setDisplay('btn-help',     'none');
  setDisplay('shop-hud',     'none');

  if (fase === FASE.WORKSHOP) {
    renderWorkshop();
    return;
  }

  if (fase === FASE.MENU) {
    if (!state.boasVindasVistas) renderBoasVindas();
    else                          renderMenu();
  } else {
    setDisplay('btn-help', 'block');
    if      (fase === FASE.RECEPCAO)  renderRecepcao();
    else if (fase === FASE.DESAFIO)   renderDesafio();
    else if (fase === FASE.RESULTADO) renderResultado();
    else if (fase === FASE.LOJA) {
      renderLoja();
      iniciarViewerLoja();
    }
  }

  atualizarPainelLateral();
}

// ======================================================
// LISTENERS GLOBAIS (uma vez)
// ======================================================
instalarListeners();

// ======================================================
// EXPORTS (mantém compatibilidade com main.js)
// ======================================================
export { render as renderScreens, abrirScanner, animarConclusao };
