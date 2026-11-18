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
function onFocus(e) {
  if (e.target.closest && e.target.closest('#screens-overlay')) {
    e.target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
}

function onPageHide(event) {
  if (event?.persisted) return;

  document.removeEventListener('focus', onFocus, true);
  window.removeEventListener('pagehide', onPageHide);
}

document.addEventListener('focus', onFocus, true);
window.addEventListener('pagehide', onPageHide);

startLoop({ world, player, colliders, interaction, flow });
