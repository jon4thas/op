import { state }               from '../../game/state.js';
import { flow, FASE }          from '../../game/flow.js';
import { getMissao }           from '../../game/missoes/index.js';
import { setHTML, setText }    from './helpers.js';

export function atualizarPainelLateral() {
  const fase = flow.fase;
  if (fase === FASE.WORKSHOP || fase === FASE.LOJA) return;

  const m = getMissao(state.desafioAtual);
  if (!m) {
    setText('panel-title', 'Missão');
    setText('panel-sub', '—');
    setHTML('panel-content', '');
    return;
  }

  setText('panel-title', m.titulo);
  setText('panel-sub', m.subtitulo || '—');

  const proc = state.procedimento || {};
  const procHTML = (m.procedimentos || []).map(p => {
    const done = !!proc[p.id];
    return `<div class="checklist-item ${done ? 'done' : ''}"><div class="check">${done ? '✓' : ''}</div>${p.label}</div>`;
  }).join('');

  const testesOK    = state.testes?.total > 0 && state.testes.pass === state.testes.total;
  const totalTestes = m.tabela?.length || 0;

  setHTML('panel-content', `
    <div class="checklist-item ${state.hipotese ? 'done' : ''}"><div class="check">${state.hipotese ? '✓' : ''}</div>Hipótese escolhida</div>
    ${procHTML}
    <div class="checklist-item ${testesOK ? 'done' : ''}"><div class="check">${testesOK ? '✓' : ''}</div>Testes ${state.testes?.pass || 0}/${totalTestes}</div>
    <hr style="margin:16px 0;border-color:var(--border);">
    <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="color:var(--muted);font-size:14px;">💰 Dinheiro</span><strong style="color:var(--ok);font-size:16px;">R$ ${state.dinheiro}</strong></div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="color:var(--muted);font-size:14px;">⭐ XP</span><strong style="color:var(--accent);font-size:16px;">${state.xp} XP</strong></div>
  `);
}
