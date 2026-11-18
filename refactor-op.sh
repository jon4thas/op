#!/usr/bin/env bash
#
# refactor-op.sh — divide js/main.js em módulos (missão 01 apenas)
#
# Uso:
#   chmod +x refactor-op.sh
#   ./refactor-op.sh .
#
set -euo pipefail

ROOT="${1:-.}"
JS="$ROOT/js"
TS="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/backup_refactor_$TS"

# ---------- validações ----------
[ -d "$JS" ]                        || { echo "❌ js/ não encontrado em: $ROOT"; exit 1; }
[ -f "$JS/main.js" ]                || { echo "❌ js/main.js não encontrado"; exit 1; }
[ -f "$JS/game/missoes/index.js" ]  || { echo "❌ js/game/missoes/index.js não encontrado"; exit 1; }

for f in "$JS/game/player.js" "$JS/game/flow.js" "$JS/game/state.js" \
         "$JS/ui/screens.js" "$JS/world/scene.js" "$JS/game/stations.js"; do
  [ -f "$f" ] || echo "⚠️  Aviso: $f não existe — o refactor pode falhar em runtime"
done

echo "📁 Projeto: $ROOT"
echo "📦 Backup  : $BACKUP"
echo
read -r -p "⚠️  Continuar com o refactor? [s/N] " ans
[[ "$ans" =~ ^[sSyY]$ ]] || { echo "Cancelado."; exit 0; }

# ---------- backup ----------
mkdir -p "$BACKUP"
cp -a "$JS" "$BACKUP/js"
echo "✅ Backup criado: $BACKUP/js"
echo "   Reverter com: rm -rf js && cp -a $BACKUP/js js"
echo

# ---------- estrutura ----------
mkdir -p "$JS/core" "$JS/game/oz"

write() {
  local path="$1"
  local tag=""
  [ -f "$path" ] && tag=" (sobrescrito — antigo no backup)"
  cat > "$path"
  if [ -s "$path" ]; then echo "📄 $path$tag"; else echo "❌ Falha ao escrever $path"; exit 1; fi
}

# =====================================================================
# UI
# =====================================================================

write "$JS/ui/toast.js" <<'EOF'
export function mostrarToast(msg, duration = 2500) {
  const el = document.getElementById('hint');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), duration);
}
EOF

write "$JS/ui/help.js" <<'EOF'
export function setupHelpHUD() {
  const btnHelp    = document.getElementById('btn-help');
  const helpModal  = document.getElementById('help-modal');
  const btnClose   = document.getElementById('btn-close-help');

  if (!btnHelp || !helpModal) return;

  btnHelp.addEventListener('click', () => { helpModal.style.display = 'block'; });
  if (btnClose) btnClose.addEventListener('click', () => { helpModal.style.display = 'none'; });
}
EOF

write "$JS/ui/panel.js" <<'EOF'
export function setupPanelToggle() {
  const app      = document.getElementById('app');
  const btnToggle = document.getElementById('btn-toggle-panel');
  const btnShow   = document.getElementById('btn-show-panel');

  if (!app || !btnToggle || !btnShow) {
    console.warn('[PANEL] Elementos do painel não encontrados.');
    return;
  }

  const STORAGE_KEY = 'panel-collapsed';
  let storageWarningShown = false;

  function readPanelState() {
    try { return window.localStorage.getItem(STORAGE_KEY) === 'true'; }
    catch (error) {
      if (!storageWarningShown) console.warn('[PANEL] Storage indisponível:', error.name);
      storageWarningShown = true;
      return false;
    }
  }

  function savePanelState(value) {
    try { window.localStorage.setItem(STORAGE_KEY, String(value)); return true; }
    catch (error) {
      if (!storageWarningShown) console.warn('[PANEL] Não foi possível salvar:', error.name);
      storageWarningShown = true;
      return false;
    }
  }

  function updatePanel(collapsed) {
    app.classList.toggle('panel-collapsed', collapsed);
    btnToggle.title    = collapsed ? 'Mostrar painel' : 'Ocultar painel';
    btnToggle.textContent = collapsed ? '▶' : '◀';
  }

  updatePanel(readPanelState());

  btnToggle.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const collapsed = !app.classList.contains('panel-collapsed');
    updatePanel(collapsed);
    savePanelState(collapsed);
  });

  btnShow.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    updatePanel(false);
    savePanelState(false);
  });

  console.log('[PANEL] Inicializado.');
}
EOF

# =====================================================================
# CORE (infra)
# =====================================================================

write "$JS/core/world.js" <<'EOF'
import * as THREE from 'three';
import { createScene, buildFloor } from '../world/scene.js';
import { carregarCeuHDRI }         from '../world/sky.js';
import { setupLighting }           from '../world/lighting.js';

export function setupWorld() {
  const { scene, camera, renderer } = createScene();
  setupLighting(scene);
  buildFloor(scene);

  renderer.outputColorSpace   = THREE.SRGBColorSpace;
  renderer.toneMapping        = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  carregarCeuHDRI(scene, renderer).catch(() => {
    console.warn('[cenario] rodando sem HDRI, usando fallback');
  });

  return { scene, camera, renderer };
}
EOF

write "$JS/core/player.js" <<'EOF'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Player }        from '../game/player.js';

export function setupPlayer({ scene, camera, renderer }, input) {
  const player = new Player(camera, renderer.domElement, input);
  player.loadModel();
  scene.add(player.mesh);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(player.cameraTarget);
  controls.enablePan      = false;
  controls.maxPolarAngle  = Math.PI / 2 - 0.05;
  controls.minDistance    = 2;
  controls.maxDistance    = 15;
  controls.enableDamping  = true;
  controls.dampingFactor  = 0.08;

  player.controls = controls;
  return player;
}
EOF

write "$JS/core/collision.js" <<'EOF'
import * as THREE from 'three';

export const CONFIG = {
  playerRadius:        0.45,
  playerHeight:        0.9,
  interactionDistance: 10,
  cameraFollowSpeed:   0.2,
};

export function createColliders() {
  return [];
}

export function colide(posicao, colliders) {
  const centro = posicao.clone();
  centro.y += CONFIG.playerHeight;
  const esfera = new THREE.Sphere(centro, CONFIG.playerRadius);
  return colliders.some(c => c.intersectsSphere(esfera));
}

export function resolverColisao(posAnterior, posDesejada, colliders) {
  const r  = posAnterior.clone();
  const tx = r.clone(); tx.x = posDesejada.x;
  if (!colide(tx, colliders)) r.x = tx.x;
  const tz = r.clone(); tz.z = posDesejada.z;
  if (!colide(tz, colliders)) r.z = tz.z;
  return r;
}
EOF

write "$JS/core/interaction.js" <<'EOF'
import { flow, FASE }  from '../game/flow.js';
import { getMissao }   from '../game/missoes/index.js';
import { mostrarToast } from '../ui/toast.js';

export function setupInteraction({ player, stations, interactionDistance = 10 }) {
  const prompt = document.getElementById('interaction-prompt');
  let stationFocada = null;

  function atualizar() {
    const p = player.mesh.position;
    let maisProxima = null;
    let menorDist   = Infinity;

    for (const st of stations) {
      if (!st.userData?.id || !st.visible) continue;
      const dx = st.position.x - p.x;
      const dz = st.position.z - p.z;
      const d  = Math.sqrt(dx * dx + dz * dz);
      if (d < interactionDistance && d < menorDist) {
        menorDist   = d;
        maisProxima = st;
      }
    }

    stationFocada = maisProxima;

    if (prompt) {
      if (stationFocada) {
        prompt.style.display = 'block';
        prompt.innerText = `[E] Iniciar: ${stationFocada.userData.title || 'Missão'}`;
      } else {
        prompt.style.display = 'none';
      }
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.code !== 'KeyE' || e.repeat) return;
    if (flow.fase !== FASE.WORKSHOP) return;
    if (!stationFocada?.userData?.id) return;

    const m = getMissao(stationFocada.userData.id);
    if (!m) { mostrarToast(`🏆 ${stationFocada.userData.subtitle}`, 3000); return; }
    window.OZ.iniciarMissao(stationFocada.userData.id);
  });

  return { atualizar, getStationFocada: () => stationFocada };
}
EOF

write "$JS/core/loop.js" <<'EOF'
import { FASE }                    from '../game/flow.js';
import { CONFIG, resolverColisao } from './collision.js';

export function startLoop({ world, player, colliders, interaction, flow }) {
  const { scene, camera, renderer } = world;
  let last = performance.now();

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt  = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (flow.fase === FASE.WORKSHOP) {
      const disp    = player.computeDesiredDisplacement(dt);
      const oldPos  = player.mesh.position.clone();
      const desired = oldPos.clone().add(disp);
      player.mesh.position.copy(resolverColisao(oldPos, desired, colliders));

      player.applyRotation(dt);
      player.syncCameraTarget();
      player.controls.target.lerp(player.cameraTarget, CONFIG.cameraFollowSpeed);
      player.controls.update();

      interaction.atualizar();
    }
    renderer.render(scene, camera);
  }
  animate();
}
EOF

# =====================================================================
# OZ — API GLOBAL (dividida)
# =====================================================================

write "$JS/game/oz/state-reset.js" <<'EOF'
import { state } from '../state.js';

export function resetMissionState() {
  state.hipotese        = null;
  state.evidencias      = [];
  state.tabela          = null;
  state.tabelaResultado = null;
  state.blocos          = null;
  state.testes          = null;
  state.avaliacao       = null;
  state.expressao       = '';
  state.procedimento    = {};
  state._ultimaRecompensa = null;
  state._missaoFinalizada = false;
}
EOF

write "$JS/game/oz/navigation.js" <<'EOF'
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
EOF

write "$JS/game/oz/missao-lifecycle.js" <<'EOF'
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
EOF

write "$JS/game/oz/missao-01.js" <<'EOF'
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
EOF

write "$JS/game/oz/genericos.js" <<'EOF'
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
EOF

write "$JS/game/oz/loja.js" <<'EOF'
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
EOF

write "$JS/game/oz/index.js" <<'EOF'
import * as nav   from './navigation.js';
import * as life  from './missao-lifecycle.js';
import * as m01   from './missao-01.js';
import * as gen   from './genericos.js';
import * as loja  from './loja.js';

export function instalarOZ({ verificarDesbloqueios, player }) {
  life.setVerificarDesbloqueios(verificarDesbloqueios);
  life.setPlayerRef(player);

  window.OZ = {
    // navegação
    mostrarBoasVindas:      nav.mostrarBoasVindas,
    marcarBoasVindasVistas: nav.marcarBoasVindasVistas,
    entrarOficina:          nav.entrarOficina,
    irPara:                 nav.irPara,
    voltar:                 nav.voltar,

    // ciclo de missão
    iniciarMissao:          life.iniciarMissao,
    voltarOficina:          life.voltarOficina,
    concluirMissao:         life.concluirMissao,
    resetProgresso:         life.resetProgresso,

    // missão 01
    addBloco:               m01.addBloco,
    removeBloco:            m01.removeBloco,
    limparBlocos:           m01.limparBlocos,
    rodarTestes:            m01.rodarTestesMissao,

    // genéricos
    escolherHipotese:       gen.escolherHipotese,
    executarProcedimento:   gen.executarProcedimento,
    marcarTabela:           gen.marcarTabela,
    validarTabela:          gen.validarTabela,

    // loja
    abrirLoja:              loja.abrirLoja,
    fecharLoja:             loja.fecharLoja,
    comprarPersonagem:      loja.comprarPersonagemOZ,
    equiparPersonagem:      loja.equiparPersonagemOZ,
  };
}
EOF

# =====================================================================
# DEBUG
# =====================================================================

write "$JS/debug.js" <<'EOF'
export function instalarDebug({ THREE, colliders, player, stations, scene, camera, renderer, flow, interaction }) {
  window.__debug = {
    get THREE()     { return THREE; },
    get colliders() { return colliders; },
    get player()    { return player; },
    get stations()  { return stations; },
    get scene()     { return scene; },
    get controls()  { return player.controls; },
    get camera()    { return camera; },
    get renderer()  { return renderer; },
    get flow()      { return flow; },
    get stationFocada() { return interaction.getStationFocada(); },
  };
  console.log('[debug] window.__debug exposto ✅');
}
EOF

# =====================================================================
# MAIN — só orquestra
# =====================================================================

write "$JS/main.js" <<'EOF'
import * as THREE from 'three';

import { setupWorld }         from './core/world.js';
import { setupPlayer }        from './core/player.js';
import { createColliders, CONFIG } from './core/collision.js';
import { setupInteraction }   from './core/interaction.js';
import { startLoop }          from './core/loop.js';

import { setupHelpHUD }       from './ui/help.js';
import { setupPanelToggle }   from './ui/panel.js';
import { renderScreens }      from './ui/screens.js';

import { setupInput }         from './game/input.js';
import { criarEstacoes }      from './game/stations.js';
import { flow }               from './game/flow.js';
import { state }              from './game/state.js';
import { instalarOZ }         from './game/oz/index.js';
import { instalarDebug }      from './debug.js';

// ---------------------------------------------------------------------
// Mundo / jogador / colisores
// ---------------------------------------------------------------------
const world  = setupWorld();
const input  = setupInput(world.renderer.domElement);
const player = setupPlayer(world, input);

const colliders = createColliders();

// ---------------------------------------------------------------------
// Estações
// ---------------------------------------------------------------------
const stations              = criarEstacoes(world.scene, colliders);
const verificarDesbloqueios = stations.verificarDesbloqueios || (() => false);

// ---------------------------------------------------------------------
// UI / fluxo
// ---------------------------------------------------------------------
setupHelpHUD();
setupPanelToggle();

state.score = 0;
flow.onChange(() => renderScreens());
renderScreens();

// ---------------------------------------------------------------------
// API global (window.OZ)
// ---------------------------------------------------------------------
instalarOZ({ verificarDesbloqueios, player });

// ---------------------------------------------------------------------
// Interação + debug + loop
// ---------------------------------------------------------------------
const interaction = setupInteraction({
  player,
  stations,
  interactionDistance: CONFIG.interactionDistance,
});

instalarDebug({
  THREE, colliders, player, stations,
  scene: world.scene,
  camera: world.camera,
  renderer: world.renderer,
  flow, interaction,
});

// fix de scroll do overlay
document.addEventListener('focus', (e) => {
  if (e.target.closest && e.target.closest('#screens-overlay')) {
    e.target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
}, true);

startLoop({ world, player, colliders, interaction, flow });
EOF

# ---------- verificação básica ----------
echo
echo "🔎 Sanity-check..."
fail=0
for f in "$JS/main.js" "$JS/debug.js" \
         "$JS/core/world.js" "$JS/core/player.js" "$JS/core/collision.js" \
         "$JS/core/interaction.js" "$JS/core/loop.js" \
         "$JS/ui/toast.js" "$JS/ui/help.js" "$JS/ui/panel.js" \
         "$JS/game/oz/state-reset.js" "$JS/game/oz/navigation.js" \
         "$JS/game/oz/missao-lifecycle.js" "$JS/game/oz/missao-01.js" \
         "$JS/game/oz/genericos.js" "$JS/game/oz/loja.js" \
         "$JS/game/oz/index.js"; do
  if [ ! -s "$f" ]; then echo "  ❌ vazio: $f"; fail=1
  else                   echo "  ✓ $f"
  fi
done

echo
if [ "$fail" -eq 0 ]; then
  echo "✅ Refactor concluído com sucesso."
else
  echo "⚠️  Alguns arquivos ficaram vazios. Reverta com:"
  echo "   rm -rf js && cp -a $BACKUP/js js"
  exit 2
fi

cat <<MSG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Próximos passos
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Abra o jogo no navegador e teste:
     • Movimento + câmera
     • Aproximar de uma estação e ver prompt [E]
     • Iniciar missão 01, executar procedimentos, montar
       blocos, validar tabela e concluir
     • Painel recolhível, help modal, toast
     • Loja (abrir / comprar / equipar)

2. Se tudo estiver OK, apague os arquivos agora mortos:
     rm js/game/interactions.js
   (ele existia mas nunca era importado — o main antigo
    tinha a lógica inline; a nova versão está em
    js/core/interaction.js)

3. Se algo quebrar, veja o console. Reverter:
     rm -rf js && cp -a $BACKUP/js js

4. Backup antigo de ui/panel.js e js/main.js está em:
     $BACKUP/js/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MSG
