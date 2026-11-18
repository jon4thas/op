import { state, salvarProgresso } from '../state.js';
import { flow, FASE }             from '../flow.js';
import { renderScreens }          from '../../ui/screens.js';

export function mostrarBoasVindas() {
  state.boasVindasVistas = false;
  flow.ir(FASE.MENU);
  renderScreens();
}

export function marcarBoasVindasVistas() {
  state.boasVindasVistas = true;
  salvarProgresso();
  renderScreens();
}

export function entrarOficina() {
  state.boasVindasVistas = true;
  salvarProgresso();
  flow.ir(FASE.WORKSHOP);
  renderScreens();
}

export function irPara(fase) { flow.ir(fase);    renderScreens(); }
export function voltar()     { flow.voltar();    renderScreens(); }
