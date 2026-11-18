import { state } from '../../game/state.js';

export function animarConclusao() {
  const dinheiroEl = document.getElementById('dinheiro-counter');
  const xpEl       = document.getElementById('xp-counter');
  const canvas     = document.getElementById('confetti-canvas');
  if (!dinheiroEl || !xpEl) return;

  const alvoDinheiro = state.dinheiro;
  const alvoXp       = state.xp;
  const recompensa   = state._ultimaRecompensa || { xp: 100, dinheiro: 250 };
  const atualDinheiroInicio = Math.max(0, alvoDinheiro - recompensa.dinheiro);
  const atualXpInicio       = Math.max(0, alvoXp       - recompensa.xp);
  const duracao = 1500;
  const inicio  = performance.now();

  function tick(now) {
    const t    = Math.min((now - inicio) / duracao, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const d    = Math.round(atualDinheiroInicio + (alvoDinheiro - atualDinheiroInicio) * ease);
    const x    = Math.round(atualXpInicio       + (alvoXp       - atualXpInicio)       * ease);
    dinheiroEl.textContent = `R$ ${d}`;
    xpEl.textContent       = `${x} XP`;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  if (canvas) {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx   = canvas.getContext('2d');
    const cores = ['#3fb950', '#58a6ff', '#ffd700', '#ff6b9d', '#a371f7'];
    const confetes = [];
    for (let i = 0; i < 150; i++) {
      confetes.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height,
        w: 6 + Math.random() * 8, h: 8 + Math.random() * 10,
        vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.3,
        cor: cores[Math.floor(Math.random() * cores.length)]
      });
    }
    let ativo = true;
    function tickConfete() {
      if (!ativo || !canvas.isConnected) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const c of confetes) {
        c.x += c.vx; c.y += c.vy; c.rot += c.vrot; c.vy += 0.05;
        if (c.y > canvas.height + 20) {
          c.y = -20; c.x = Math.random() * canvas.width; c.vy = 2 + Math.random() * 4;
        }
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot);
        ctx.fillStyle = c.cor; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      }
      requestAnimationFrame(tickConfete);
    }
    tickConfete();
    setTimeout(() => { ativo = false; if (canvas.parentNode) canvas.parentNode.removeChild(canvas); }, 6000);
  }
}
