import { flow, FASE }       from '../flow.js';
import { renderScreens }    from '../../ui/screens.js';
import { comprarPersonagem, equiparPersonagem } from '../shop.js';

export function abrirLoja()  { flow.ir(FASE.LOJA);     renderScreens(); }
export function fecharLoja() { flow.ir(FASE.WORKSHOP); renderScreens(); }

export function comprarPersonagemOZ(id) {
  const r = comprarPersonagem(id);
  alert(r.ok ? `✅ ${r.personagem.nome} comprado por R$ ${r.personagem.preco}!` : r.erro);
  renderScreens();
}

export function equiparPersonagemOZ(id) {
  const r = equiparPersonagem(id);
  alert(r.ok ? `✅ ${r.personagem.nome} equipado!` : r.erro);
  renderScreens();
}
