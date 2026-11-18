import { state }               from '../../game/state.js';
import { flow, FASE }          from '../../game/flow.js';
import { BLOCOS_DISPONIVEIS }  from '../../game/evaluator.js';
import { getMissao }           from '../../game/missoes/index.js';
import { overlay, setHTML, setText, setDisplay } from './helpers.js';

// ======================================================
// WORKSHOP
// ======================================================
export function renderWorkshop() {
  setDisplay('workshop-hud', 'block');
  setDisplay('btn-help', 'block');
  setDisplay('shop-hud', 'block');

  setText('panel-title', 'Oficina Central');
  setText('panel-sub', 'Exploração');

  const desafios = [
    { id: 'missao01', titulo: 'Operação Sentinel', desc: 'Manutenção, diagnóstico e recuperação de sistemas' }
  ];

  setHTML('panel-content', `
    <h3 style="font-size:13px; color:var(--accent); margin:16px 0 8px; text-transform:uppercase; letter-spacing:1px;">
      Desafios
    </h3>

    ${desafios.map(d => {
      const done = state.desafiosConcluidos.includes(d.id);
      return `
        <div style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border);">
          <div style="width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; flex-shrink:0; background:${done ? 'var(--ok)' : 'transparent'}; border:1.5px solid ${done ? 'var(--ok)' : 'var(--border)'}; color:${done ? '#fff' : 'var(--muted)'};">
            ${done ? '✓' : ''}
          </div>
          <div style="flex:1;">
            <div style="font-size:14px; color:${done ? 'var(--ok)' : 'var(--text)'}; font-weight:600;">${d.titulo}</div>
            <div style="font-size:12px; color:var(--muted);">${d.desc}</div>
          </div>
        </div>
      `;
    }).join('')}

    <hr style="margin:16px 0;border-color:var(--border);">

    <div style="display:flex;justify-content:space-between;padding:6px 0;">
      <span style="color:var(--muted);font-size:14px;">💰 Dinheiro</span>
      <strong style="color:var(--ok);font-size:16px;">R$ ${state.dinheiro}</strong>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;">
      <span style="color:var(--muted);font-size:14px;">⭐ XP</span>
      <strong style="color:var(--accent);font-size:16px;">${state.xp} XP</strong>
    </div>
    <div style="display:flex;justify-content:space-between;padding:6px 0;">
      <span style="color:var(--muted);font-size:14px;">🏆 Desafios</span>
      <strong style="color:var(--warn);font-size:16px;">${state.desafiosConcluidos.length}/${desafios.length}</strong>
    </div>
  `);
}

// ======================================================
// BOAS-VINDAS
// ======================================================
export function renderBoasVindas() {
  overlay().innerHTML = `
    <div class="screen wide boot-screen">
      <div class="boot-topbar">
        <div class="boot-brand">
          <span class="boot-brand-icon">◈</span>
          MUNDO LÓGICO
          <span class="boot-version">SYS v2.6.0</span>
        </div>
        <div class="boot-status">
          <span class="boot-status-dot"></span>
          USER INITIALIZATION
        </div>
      </div>

      <div class="screen-body boot-welcome-body">
        <div class="welcome-hero">
          <div class="boot-kicker"><span></span> ACCESS GRANTED / NEW OPERATOR</div>
          <div class="welcome-hero-title">
            <div class="welcome-symbol">◈</div>
            <h1>BEM-VINDO<span>.</span><br><strong>OPERADOR<span class="boot-cursor">_</span></strong></h1>
          </div>
          <p class="boot-description">
            Seu próximo universo começa com uma linha de código.
            <br><span>Explore. Experimente. Construa possibilidades.</span>
          </p>
          <div class="welcome-terminal">
            <div class="boot-terminal-header">
              <div class="boot-terminal-dots"><i></i><i></i><i></i></div>
              <span>root@mundologico:~/welcome</span>
              <span class="boot-terminal-live">CONNECTED</span>
            </div>
            <div class="welcome-terminal-content">
              <div class="welcome-terminal-line"><span class="log-pink">01 //</span><span>Você acaba de entrar em um laboratório de ideias.</span></div>
              <div class="welcome-terminal-line"><span class="log-blue">02 //</span><span>Investigue problemas e desenvolva soluções.</span></div>
              <div class="welcome-terminal-line"><span class="log-pink">03 //</span><span>Transforme lógica em sistemas funcionais.</span></div>
              <div class="welcome-terminal-line"><span class="log-blue">04 //</span><span>Conquiste experiência e desbloqueie recompensas.</span></div>
              <div class="welcome-terminal-command">
                <span>operator@mundologico:~$</span>
                <strong>start_learning<span class="boot-cursor">_</span></strong>
              </div>
            </div>
          </div>
        </div>

        <div class="welcome-content">
          <div class="welcome-section-label"><span>01</span> / SUA MISSÃO</div>
          <h2>O conhecimento é sua ferramenta.</h2>
          <p>
            Aqui você não aprende apenas observando.
            Você experimenta, erra, corrige e constrói.
            Cada desafio representa um novo problema para resolver.
          </p>
          <div class="welcome-feature"><div class="welcome-feature-icon blue">⌘</div><div><strong>RESOLVA DESAFIOS</strong><span>Investigue situações e desenvolva soluções lógicas.</span></div></div>
          <div class="welcome-feature"><div class="welcome-feature-icon pink">⌁</div><div><strong>EVOLUA SEU SISTEMA</strong><span>Ganhe XP, dinheiro e desbloqueie personagens.</span></div></div>
          <div class="welcome-feature"><div class="welcome-feature-icon blue">◈</div><div><strong>EXPLORE POSSIBILIDADES</strong><span>Programe, experimente e descubra novas tecnologias.</span></div></div>
          <div class="welcome-progress">
            <div class="welcome-section-label"><span>02</span> / SEU PROGRESSO</div>
            <div class="welcome-stats">
              <div><span>WALLET</span><strong>R$ ${state.dinheiro}</strong></div>
              <div><span>EXPERIENCE</span><strong>${state.xp} XP</strong></div>
              <div><span>MISSIONS</span><strong>${state.desafiosConcluidos.length}/1</strong></div>
            </div>
          </div>
        </div>
      </div>

      <div class="boot-footer welcome-footer">
        <button class="welcome-reset" onclick="window.OZ.resetProgresso()"><span>⚠</span> RESETAR PROGRESSO</button>
        <span>LEARN / CODE / EXPLORE</span>
        <button class="boot-enter" onclick="window.OZ.entrarOficina()">ENTRAR NA OFICINA <span>→</span></button>
      </div>
    </div>
  `;
}

// ======================================================
// MENU
// ======================================================
export function renderMenu() {
  overlay().innerHTML = `
    <div class="screen wide boot-screen">
      <div class="boot-topbar">
        <div class="boot-brand"><span class="boot-brand-icon">◈</span> MUNDO LÓGICO<span class="boot-version">SYS v2.6.0</span></div>
        <div class="boot-status"><span class="boot-status-dot"></span> SYSTEM ONLINE</div>
      </div>
      <div class="screen-body boot-body">
        <div class="boot-main">
          <div class="boot-kicker"><span></span> INITIALIZING ENVIRONMENT</div>
          <h1 class="boot-title">THINK<span>.</span><br>BUILD<span>.</span><br><strong>HACK<span>_</span></strong></h1>
          <p class="boot-description">Um universo de lógica, tecnologia e possibilidades.<br><span>O próximo comando está em suas mãos.</span></p>
          <div class="boot-terminal">
            <div class="boot-terminal-header"><div class="boot-terminal-dots"><i></i><i></i><i></i></div><span>root@mundologico:~</span><span class="boot-terminal-live">LIVE</span></div>
            <div class="boot-terminal-content">
              <div class="boot-ascii"><pre>
       <span class="ascii-blue">    .------.</span>
       <span class="ascii-blue">   / .----. \\</span>
       <span class="ascii-pink">  | |  ◈  | |</span>
       <span class="ascii-pink">  | |     | |</span>
       <span class="ascii-blue">   \\ '----' /</span>
       <span class="ascii-blue">    '------'</span>
                </pre></div>
              <div class="boot-logs">
                <div><span class="log-ok">[ OK ]</span> Kernel initialized</div>
                <div><span class="log-ok">[ OK ]</span> Logic engine loaded</div>
                <div><span class="log-blue">[ SYS ]</span> JavaScript environment ready</div>
                <div><span class="log-pink">[ SEC ]</span> Sandbox protocol active</div>
                <div><span class="log-blue">[ XP ]</span> ${state.xp} experience points detected</div>
                <div><span class="log-pink">[ USER ]</span> Welcome, operator<span class="boot-cursor">_</span></div>
              </div>
            </div>
            <div class="boot-progress">
              <div class="boot-progress-info"><span>INITIALIZATION</span><span class="boot-progress-percent">100%</span></div>
              <div class="boot-progress-track"><div class="boot-progress-fill"></div></div>
            </div>
          </div>
          <div class="boot-actions">
            <button class="boot-enter" onclick="window.OZ.entrarOficina()"><span>▶</span> INICIAR SISTEMA</button>
            <button class="boot-welcome" onclick="window.OZ.mostrarBoasVindas()">DOCUMENTAÇÃO</button>
          </div>
        </div>
        <div class="boot-aside">
          <div class="boot-aside-label">ASCII / ART</div>
          <pre class="boot-big-ascii">
<span class="ascii-blue">      _   _</span>
<span class="ascii-blue">     | | | |</span>
<span class="ascii-pink">     | |_| |</span>
<span class="ascii-pink">      \\__, |</span>
<span class="ascii-blue">       __/ |</span>
<span class="ascii-blue">      |___/</span>
<span class="ascii-pink">   L O G I C</span>
<span class="ascii-blue">   IS POWER</span>
          </pre>
          <div class="boot-aside-line"></div>
          <div class="boot-stat"><span>WALLET</span><strong>R$ ${state.dinheiro}</strong></div>
          <div class="boot-stat"><span>EXPERIENCE</span><strong>${state.xp} XP</strong></div>
          <div class="boot-stat"><span>MISSIONS</span><strong>${state.desafiosConcluidos.length}/1</strong></div>
          <div class="boot-aside-footer"><span class="boot-status-dot"></span> CONNECTION ESTABLISHED</div>
        </div>
      </div>
      <div class="boot-footer"><span>© MUNDO LÓGICO · 2026</span><span>LEARN / CODE / EXPLORE</span><span>BASED ON JAVASCRIPT</span></div>
    </div>
  `;
}

// ======================================================
// RECEPÇÃO
// ======================================================
export function renderRecepcao() {
  const m = getMissao(state.desafioAtual);
  if (!m) { overlay().innerHTML = `<div class="screen"><div class="screen-body">Missão não encontrada.</div></div>`; return; }

  const amb = m.ambiente || {};
  const logsHTML = (amb.logs || []).map(l => `
    <div style="display:flex; gap:10px; padding:4px 0; border-bottom:1px solid var(--border);">
      <code style="color:var(--muted); min-width:70px;">${l.horario}</code>
      <span style="color:${l.nivel === 'ERROR' ? 'var(--err)' : l.nivel === 'WARNING' ? 'var(--warn)' : 'var(--ok)'}; min-width:70px; font-weight:600;">[${l.nivel}]</span>
      <span>${l.mensagem}</span>
    </div>
  `).join('');
  const reqsHTML = (amb.requisitos || []).map(r => `<li>${r}</li>`).join('');

  overlay().innerHTML = `
    <div class="screen">
      <div class="screen-header">
        <h1>${m.titulo}</h1>
        <span class="badge">${m.badge || 'Chamado'}</span>
      </div>
      <div class="screen-body" style="max-height:75vh; overflow-y:auto;">
        <h2>Cliente relata</h2>
        <pre style="white-space:pre-wrap; font-family:inherit; margin:0 0 20px;">${(m.cliente || '').trim()}</pre>
        <h2>Objetivo</h2>
        <pre style="white-space:pre-wrap; font-family:inherit; margin:0 0 20px;">${(m.objetivo || '').trim()}</pre>
        ${amb.sistema ? `
          <h2>Ambiente</h2>
          <div style="padding:12px; background:var(--bg); border-radius:8px; border:1px solid var(--border); margin-bottom:16px;">
            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:8px; margin-bottom:12px;">
              <div><span style="color:var(--muted);font-size:12px;">SISTEMA</span><br><strong>${amb.sistema}</strong></div>
              <div><span style="color:var(--muted);font-size:12px;">VERSÃO</span><br><strong>v${amb.versao}</strong></div>
              <div><span style="color:var(--muted);font-size:12px;">MÓDULO</span><br><strong>${amb.modulo}</strong></div>
              <div><span style="color:var(--muted);font-size:12px;">CRITICIDADE</span><br><strong style="color:var(--err);">${amb.criticidade}</strong></div>
            </div>
            ${logsHTML ? `
              <div style="font-family:monospace; font-size:12px; background:#0d1117; padding:10px; border-radius:6px; margin-top:8px;">
                <div style="color:var(--accent); margin-bottom:6px;">// LOGS RECENTES</div>
                ${logsHTML}
              </div>
            ` : ''}
            ${reqsHTML ? `
              <div style="margin-top:12px;">
                <strong style="color:var(--accent);">Requisitos do sistema</strong>
                <ul style="margin:6px 0 0 20px; font-size:14px;">${reqsHTML}</ul>
              </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
      <div class="screen-footer">
        <button class="btn" onclick="window.OZ.voltarOficina()">Abandonar</button>
        <button class="btn primary" onclick="window.OZ.irPara('desafio')">Iniciar Desafio →</button>
      </div>
    </div>
  `;
}

// ======================================================
// DESAFIO (só lógica)
// ======================================================
export function renderDesafio() {
  const m = getMissao(state.desafioAtual);
  if (!m) { overlay().innerHTML = `<div class="screen"><div class="screen-body">Missão não encontrada.</div></div>`; return; }
  overlay().innerHTML = renderDesafioLogica(m, state.blocos || [], state.testes, state.procedimento || {});
}

function renderDesafioLogica(m, blocos, t, proc) {
  const tabelaMissao = m.tabela || [];
  const primeiraLinha = tabelaMissao[0] || {};
  const colunas = Object.keys(primeiraLinha).filter(k => k !== 'alarme' && k !== 'expected');

  const LABELS = {
    autenticado: 'Autenticado',
    estoque:     'Estoque',
    pagamento:   'Pagamento',
    bloqueado:   'Bloqueado',
    batOK: 'Bateria', freio: 'Freio', marcha: 'Marcha',
    s1: 'S1', s2: 'S2', s3: 'S3', s4: 'S4', s5: 'S5'
  };
  const valorCelula = (l, k) => typeof l[k] === 'boolean' ? (l[k] ? '1' : '0') : l[k];
  const headerHTML  = colunas.map(k => `<th>${LABELS[k] || k}</th>`).join('');

  const linhas = tabelaMissao.map((l, i) => {
    const marcado = state.tabela?.[i];
    return `
      <tr>
        <td>${i + 1}</td>
        ${colunas.map(k => `<td>${valorCelula(l, k)}</td>`).join('')}
        <td>
          <button class="tt-btn ${marcado === true  ? 'sel-true'  : ''}" onclick="window.OZ.marcarTabela(${i}, true)">1</button>
          <button class="tt-btn ${marcado === false ? 'sel-false' : ''}" onclick="window.OZ.marcarTabela(${i}, false)">0</button>
        </td>
      </tr>
    `;
  }).join('');

  const hipotesesHTML    = (m.hipoteses    || []).map(h => `<button class="hypothesis ${state.hipotese?.id === h.id ? 'selected' : ''}" onclick="window.OZ.escolherHipotese('${h.id}')">${h.label}</button>`).join('');
  const procedimentosHTML = (m.procedimentos || []).map(p => `<button class="btn" onclick="window.OZ.executarProcedimento('${p.id}')" ${proc[p.id] ? 'disabled' : ''}>${proc[p.id] ? '✓ ' : ''} ${p.label}</button>`).join('');

  const hipoteseOK  = state.hipotese?.id === m.hipoteseCorreta;
  const correcoesOK = (m.procedimentos || []).every(p => !!proc[p.id]);
  const testesOK    = t && t.total > 0 && t.pass === t.total;
  const tudoOk      = hipoteseOK && correcoesOK && testesOK;

  overlay().innerHTML = `
    <div class="screen wide">
      <div class="screen-header">
        <h1>${m.titulo}</h1>
        <span class="badge">${m.badge} · ${m.subtitulo || ''}</span>
      </div>
      <div class="screen-body" style="max-height:75vh;overflow-y:auto;">
        <h2>1. Qual é sua hipótese?</h2>
        <div style="margin-bottom:24px;">${hipotesesHTML}</div>

        <h2>2. Procedimentos técnicos</h2>
        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px;">${procedimentosHTML}</div>

        <h2>3. Monte a regra de negócio</h2>
        <div class="blocos">
          ${BLOCOS_DISPONIVEIS.map((b, i) => `<button class="bloco" data-bloco-index="${i}">${b.label}</button>`).join('')}
        </div>
        <div class="expr-builder">
          ${blocos.map((b, i) => `<span class="chip">${b.label} <button class="chip-x" data-remove-index="${i}">×</button></span>`).join('')}
        </div>
        <button class="btn" style="margin-top:8px" onclick="window.OZ.limparBlocos()">Limpar</button>

        <h2 style="margin-top:24px;">4. Executar testes</h2>
        <button class="btn accent" onclick="window.OZ.rodarTestes()">Executar testes</button>
        ${t ? `
          <div style="margin-top:12px; padding:16px; background:${t.pass === t.total ? 'var(--ok-bg)' : 'var(--err-bg)'}; border-radius:8px; text-align:center; border:1px solid ${t.pass === t.total ? 'var(--ok)' : 'var(--err)'};">
            <strong style="font-size:20px;">${t.pass}/${t.total} testes passaram</strong> ${t.pass === t.total ? ' ✅' : ' ❌'}
          </div>
        ` : ''}

        <h2 style="margin-top:24px;">5. Tabela-verdade (opcional)</h2>
        <table class="tt">
          <thead><tr><th>#</th>${headerHTML}<th>Saída (0/1)</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
        <button class="btn accent" style="margin-top:12px" onclick="window.OZ.validarTabela()">Validar Tabela</button>
      </div>
      <div class="screen-footer">
        <button class="btn" onclick="window.OZ.voltarOficina()">← Sair</button>
        <button class="btn primary" onclick="window.OZ.concluirMissao()" ${!tudoOk ? 'disabled' : ''}>Concluir Missão →</button>
      </div>
    </div>
  `;
}

// ======================================================
// RESULTADO
// ======================================================
export function renderResultado() {
  const m = getMissao(state.desafioAtual);
  const ok = state.avaliacao?.aprovado;
  const recompensa = state._ultimaRecompensa || m?.recompensa || { xp: 0, dinheiro: 0 };
  const xpGanho = ok ? recompensa.xp : 0;
  const dinheiroGanho = ok ? recompensa.dinheiro : 0;

  overlay().innerHTML = `
    <div class="screen" style="position:relative;overflow:hidden;">
      ${ok ? '<canvas id="confetti-canvas"></canvas>' : ''}
      <div class="screen-header" style="position:relative;z-index:2;">
        <h1 style="color:${ok ? 'var(--ok)' : 'var(--err)'}; text-shadow:0 0 20px ${ok ? 'rgba(63,185,80,0.5)' : 'rgba(248,81,73,0.5)'};">
          ${ok ? '🎉 Missão Concluída' : '❌ Missão Falhou'}
        </h1>
      </div>
      <div class="screen-body" style="position:relative;z-index:2;text-align:center;">
        ${ok ? `
          <p style="font-size:18px;margin-bottom:24px;">Você resolveu o problema corretamente!</p>
          <div style="display:inline-flex; flex-direction:column; gap:16px; padding:32px 48px; background:linear-gradient(135deg,var(--ok-bg),var(--accent-bg)); border:2px solid var(--ok); border-radius:16px; box-shadow:0 0 40px rgba(63,185,80,0.3);">
            <div style="font-size:12px; color:var(--muted); text-transform:uppercase; letter-spacing:2px;">Recompensas</div>
            <div style="display:flex; gap:48px; justify-content:center; align-items:center;">
              <div><div style="font-size:36px;">💰</div><div style="font-size:28px;font-weight:bold;color:var(--ok);" id="dinheiro-counter">R$ 0</div></div>
              <div><div style="font-size:36px;">⭐</div><div style="font-size:28px;font-weight:bold;color:var(--accent);" id="xp-counter">0 XP</div></div>
            </div>
            <div style="font-size:12px;color:var(--muted);">+${xpGanho} XP &nbsp;·&nbsp; +R$ ${dinheiroGanho}</div>
          </div>
          <div style="margin-top:24px;font-size:14px;color:var(--muted);">
            Total acumulado: 💰 R$ <strong style="color:var(--ok);">${state.dinheiro}</strong> &nbsp;·&nbsp; ⭐ <strong style="color:var(--accent);">${state.xp} XP</strong>
          </div>
        ` : `
          <p style="font-size:18px;margin-bottom:24px;">A missão não foi concluída. Volte à oficina e tente novamente.</p>
        `}
      </div>
      <div class="screen-footer" style="position:relative;z-index:2;justify-content:center;">
        <button class="btn primary" onclick="window.OZ.voltarOficina()">Voltar para a Oficina</button>
        ${ok ? `<button class="btn" onclick="window.OZ.abrirLoja()">🛒 Ir para a Loja</button>` : ''}
      </div>
    </div>
  `;
}
