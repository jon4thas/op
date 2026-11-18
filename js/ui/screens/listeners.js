import { BLOCOS_DISPONIVEIS } from '../../game/evaluator.js';
import { renderScreens }      from '../screens.js';
import {
  carregarModeloLoja,
  setCategoriaLojaAtiva,
  setItemLojaSelecionado,
  getItemLojaSelecionado,
} from './loja.js';

export function instalarListeners() {
  document.addEventListener('click', e => {
    const target = e.target; if (!(target instanceof Element)) return;

    const itemBtn = target.closest('[data-item-loja]');
    if (itemBtn) {
      const id = itemBtn.dataset.itemLoja;
      setItemLojaSelecionado(id);
      document.querySelectorAll('[data-item-loja]').forEach(card => {
        card.style.borderColor = card.dataset.itemLoja === id ? 'var(--accent)' : 'var(--border)';
      });
      carregarModeloLoja(id);
      return;
    }

    const categoriaBtn = target.closest('[data-categoria-loja]');
    if (categoriaBtn) {
      setCategoriaLojaAtiva(categoriaBtn.dataset.categoriaLoja);
      renderScreens();
      return;
    }

    const blocoBtn = target.closest('[data-bloco-index]');
    if (blocoBtn) {
      const idx = parseInt(blocoBtn.dataset.blocoIndex, 10);
      const b = BLOCOS_DISPONIVEIS[idx];
      if (b) window.OZ.addBloco(b.id, b.label);
      blocoBtn.blur();
      return;
    }

    const removeBtn = target.closest('[data-remove-index]');
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.removeIndex, 10);
      window.OZ.removeBloco(idx);
      removeBtn.blur();
      return;
    }
  });
}
