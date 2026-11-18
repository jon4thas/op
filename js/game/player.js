
// ======================================================
// js/game/player.js
// Player híbrido — Mixamo FBX + GLB / GLTF
// ======================================================

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

import {
  carregarModeloPersonagem,
  carregarAnimacoes,
  mapearAnimacoes,
  liberarRecursos
} from './character-loader.js';

// ======================================================
// CLASSIFICAÇÃO DAS ANIMAÇÕES
// ======================================================

const ONESHOT_ANIMS = new Set([
  'jump',
  'joyfulJump',
  'pickup'
]);

const POSE_ANIMS = new Set([
  'sitting',
  'laying'
]);

const HOLDING_ANIMS = new Set([
  'falling'
]);

const STRIP_ROOT_MOTION = new Set([
  'walk',
  'run',
  'strafeLeft',
  'strafeRight',
  'falling',
  'sillyDancing',
  'climbing',
  'skateboarding',
  'guitar',
  'drums',
  'pickup',
  'excited'
]);

// ======================================================
// REQUISITOS DE CONTEXTO
// ======================================================

const ANIM_REQUIREMENTS = {
  climbing: {
    type: 'climbing',
    hint: '🧗 Você precisa estar perto de algo para escalar'
  },

  skateboarding: {
    type: 'skateboarding',
    hint: '🛹 Você precisa estar perto de um skate'
  },

  guitar: {
    type: 'guitar',
    hint: '🎸 Você precisa estar perto de uma guitarra'
  },

  drums: {
    type: 'drums',
    hint: '🥁 Você precisa estar perto de uma bateria'
  },

  sitting: {
    type: 'sitting',
    hint: '🪑 Você precisa estar perto de um assento'
  },

  laying: {
    type: 'laying',
    hint: '🛌 Você precisa estar perto de uma cama'
  }
};

// ======================================================
// ANIMAÇÕES DO MIXAMO
// ======================================================

const DEFAULT_ANIMATIONS = [
  ['idle', 'idle.fbx'],
  ['walk', 'walking.fbx'],
  ['run', 'running.fbx'],
  ['strafeLeft', 'left strafe walk.fbx'],
  ['strafeRight', 'right strafe walk.fbx'],
  ['jump', 'jump.fbx'],

  ['falling', 'Falling.fbx'],
  ['joyfulJump', 'Joyful Jump.fbx'],

  ['pickup', 'Picking Up Object.fbx'],
  ['excited', 'Excited.fbx'],
  ['sillyDancing', 'Silly Dancing.fbx'],
  ['climbing', 'Climbing.fbx'],
  ['skateboarding', 'Skateboarding.fbx'],
  ['guitar', 'Guitar Playing.fbx'],
  ['drums', 'Playing Drums.fbx'],

  ['disappointed', 'Disappointed.fbx'],
  ['kickGroin', 'Kick To The Groin.fbx'],

  ['sitting', 'Female Sitting Pose.fbx'],
  ['laying', 'Laying Idle.fbx']
];

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function removerRootMotion(clip, nome) {
  if (!clip || !STRIP_ROOT_MOTION.has(nome)) {
    return clip;
  }

  const antes = clip.tracks.length;

  clip.tracks = clip.tracks.filter(track => {
    const nomeTrack = track.name.toLowerCase();

    const ehPosicao = track.name.endsWith('.position');

    const ehRoot =
      nomeTrack.includes('hips') ||
      nomeTrack.includes('root');

    return !(ehPosicao && ehRoot);
  });

  if (antes !== clip.tracks.length) {
    console.log(
      `[player] ${nome}: ${antes} → ${clip.tracks.length} tracks (root motion removido)`
    );
  }

  return clip;
}

function normalizarAcoes(acoes = {}) {
  const resultado = { ...acoes };

  const aliases = {
    walk: ['walking'],
    run: ['running'],
    strafeLeft: ['leftStrafe', 'leftStrafeWalk'],
    strafeRight: ['rightStrafe', 'rightStrafeWalk'],
    joyfulJump: ['joyful_jump'],
    sillyDancing: ['silly_dancing']
  };

  for (const [destino, alternativas] of Object.entries(aliases)) {
    if (resultado[destino]) continue;

    for (const alternativa of alternativas) {
      if (resultado[alternativa]) {
        resultado[destino] = resultado[alternativa];
        break;
      }
    }
  }

  return resultado;
}

function criarListenerFinished(player, mixer) {
  mixer.addEventListener('finished', event => {
    for (const nome of ONESHOT_ANIMS) {
      if (
        player.actions[nome] &&
        event.action === player.actions[nome]
      ) {
        player._oneShotEndsAt = 0;
        break;
      }
    }
  });
}

// ======================================================
// CLASSE PLAYER
// ======================================================

export class Player {

  constructor(camera, domElement, input = null) {

    this.camera = camera;
    this.domElement = domElement;
    this.input = input;

    // --------------------------------------------------
    // ESTRUTURA 3D
    // --------------------------------------------------

    this.mesh = new THREE.Group();
    this.mesh.position.set(0, 0, 8);

    this.cameraTarget = new THREE.Vector3(0, 1.2, 8);

    this.model = null;
    this.mixer = null;
    this.actions = {};

    this.activeAction = null;
    this.activeActionName = null;

    this.modelLoaded = false;

    // --------------------------------------------------
    // CONTROLE DE CARREGAMENTO
    // --------------------------------------------------

    this._characterLoadToken = 0;

    // --------------------------------------------------
    // HABILIDADES DO PERSONAGEM
    // --------------------------------------------------

    this.habilidades = {};

    this.speedMultiplier = 1;
    this.jumpMultiplier = 1;

    // --------------------------------------------------
    // MOVIMENTAÇÃO
    // --------------------------------------------------

    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();

    this.speed = 0;

    this.maxSpeed = 3.9;
    this.walkSpeed = 2.5;

    this.walkAnimSpeed = 1.0;
    this.runAnimSpeed = 3.5;

    this.acceleration = 4;
    this.deceleration = 6;

    this.rotationSpeed = 8;

    // --------------------------------------------------
    // PULO E GRAVIDADE
    // --------------------------------------------------

    this.jumpVelocity = 1;

    this.gravity = -20;
    this.jumpForce = 7;

    this.isGrounded = true;

    // --------------------------------------------------
    // INPUT
    // --------------------------------------------------

    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      shift: false,
      space: false
    };

    this.worldUp = new THREE.Vector3(0, 1, 0);

    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();

    // --------------------------------------------------
    // ESTADOS DAS ANIMAÇÕES EXTRAS
    // --------------------------------------------------

    this._lastPress = {};
    this._doubleTapMs = 320;

    this._oneShotEndsAt = 0;

    this._easterEgg = null;

    this._notifyTimer = null;

    this._contextZones = [];

    // --------------------------------------------------
    // TECLADO LEGADO
    // --------------------------------------------------

    if (!this.input) {

      this._onKeyDown = event => this.onKey(event, true);
      this._onKeyUp = event => this.onKey(event, false);

      this._onBlur = () => this.resetKeys();

      document.addEventListener(
        'keydown',
        this._onKeyDown
      );

      document.addEventListener(
        'keyup',
        this._onKeyUp
      );

      window.addEventListener(
        'blur',
        this._onBlur
      );
    }

    // --------------------------------------------------
    // DOUBLE-TAP / EASTER EGGS
    // --------------------------------------------------

    this._onSpecialKey = event => {
      this._handleSpecialKey(event);
    };

    document.addEventListener(
      'keydown',
      this._onSpecialKey
    );
  }

  // ==================================================
  // EQUIPAR PERSONAGEM — FBX / GLB / GLTF
  // ==================================================

  async equiparPersonagem(config) {

    if (!config?.modelo3D) {
      throw new Error(
        'Configuração de personagem inválida: modelo3D ausente.'
      );
    }

    // Cada solicitação recebe um identificador.
    // Uma solicitação antiga não poderá sobrescrever a nova.
    this._characterLoadToken++;

    const token = this._characterLoadToken;

    console.info(
      '[Player] Carregando personagem:',
      config.nome || config.id
    );

    let modeloNovo = null;

    try {

      // ------------------------------------------------
      // 1. CARREGAR MODELO
      // ------------------------------------------------

      const resultado = await carregarModeloPersonagem(config);

      modeloNovo = resultado.modelo;

      const clipsIncorporados = resultado.clips || [];

      if (!modeloNovo) {
        throw new Error('O carregador não retornou um modelo válido.');
      }

      if (token !== this._characterLoadToken) {
        liberarRecursos(modeloNovo);
        return false;
      }

      // ------------------------------------------------
      // 2. ANIMAÇÕES INCORPORADAS
      // ------------------------------------------------

      const incorporadas = mapearAnimacoes(
        clipsIncorporados
      );

      // ------------------------------------------------
      // 3. ANIMAÇÕES EXTERNAS
      // ------------------------------------------------

      const externas = await carregarAnimacoes(
        config.animacoes || {}
      );

      if (token !== this._characterLoadToken) {
        liberarRecursos(modeloNovo);
        return false;
      }

      // ------------------------------------------------
      // 4. NORMALIZAÇÃO
      // ------------------------------------------------

      const acoes = normalizarAcoes({
        ...incorporadas,
        ...externas
      });

      // Remove root motion de todas as animações.
      for (const [nome, clip] of Object.entries(acoes)) {
        removerRootMotion(clip, nome);
      }

      // ------------------------------------------------
      // 5. CRIAR MIXER NOVO
      // ------------------------------------------------

      const mixerNovo = new THREE.AnimationMixer(
        modeloNovo
      );

      const acoesNovas = {};

      for (const [nome, clip] of Object.entries(acoes)) {

        if (!clip) continue;

        acoesNovas[nome] = mixerNovo.clipAction(clip);
      }

      criarListenerFinished(this, mixerNovo);

      // ------------------------------------------------
      // 6. VERIFICAR NOVAMENTE A SOLICITAÇÃO
      // ------------------------------------------------

      if (token !== this._characterLoadToken) {

        mixerNovo.stopAllAction();

        liberarRecursos(modeloNovo);

        return false;
      }

      // ------------------------------------------------
      // 7. PRESERVAR TRANSFORMAÇÕES
      // ------------------------------------------------

      const posicaoAnterior = this.mesh.position.clone();

      const rotacaoAnterior = this.mesh.rotation.clone();

      const escalaAnterior = this.mesh.scale.clone();

      const modeloAnterior = this.model;

      const mixerAnterior = this.mixer;

      // ------------------------------------------------
      // 8. SUBSTITUIR MODELO
      // ------------------------------------------------

      if (mixerAnterior) {
        mixerAnterior.stopAllAction();
      }

      if (modeloAnterior) {
        this.mesh.remove(modeloAnterior);
      }

      this.model = modeloNovo;

      this.mesh.add(modeloNovo);

      this.mesh.position.copy(posicaoAnterior);

      this.mesh.rotation.copy(rotacaoAnterior);

      this.mesh.scale.copy(escalaAnterior);

      // ------------------------------------------------
      // 9. ATUALIZAR ANIMATION MIXER
      // ------------------------------------------------

      this.mixer = mixerNovo;

      this.actions = acoesNovas;

      this.activeAction = null;

      this.activeActionName = null;

      this.modelLoaded = true;

      // ------------------------------------------------
      // 10. APLICAR HABILIDADES
      // ------------------------------------------------

      this.habilidades = config.habilidades || {};

      this.speedMultiplier =
        Number(this.habilidades.velocidade ?? 1);

      this.jumpMultiplier =
        Number(this.habilidades.pulo ?? 1);

      if (!Number.isFinite(this.speedMultiplier) ||
          this.speedMultiplier <= 0) {
        this.speedMultiplier = 1;
      }

      if (!Number.isFinite(this.jumpMultiplier) ||
          this.jumpMultiplier <= 0) {
        this.jumpMultiplier = 1;
      }

      // ------------------------------------------------
      // 11. ANIMAÇÃO INICIAL
      // ------------------------------------------------

      if (this.actions.idle) {

        this.fadeToAction('idle', 0);

      } else {

        const primeiraAcao = Object.keys(
          this.actions
        )[0];

        if (primeiraAcao) {
          this.fadeToAction(primeiraAcao, 0);
        }
      }

      mixerNovo.update(0);

      // ------------------------------------------------
      // 12. LIBERAR MODELO ANTERIOR
      // ------------------------------------------------

      if (modeloAnterior && modeloAnterior !== modeloNovo) {

        liberarRecursos(modeloAnterior);
      }

      console.info(
        '[Player] Personagem equipado:',
        config.nome || config.id,
        '| Animações:',
        Object.keys(this.actions).length
      );

      return true;

    } catch (error) {

      // Se a troca falhar, o modelo anterior permanece ativo.
      if (
        modeloNovo &&
        modeloNovo !== this.model
      ) {
        liberarRecursos(modeloNovo);
      }

      console.error(
        '[Player] Erro ao equipar personagem:',
        error
      );

      throw error;
    }
  }

  // ==================================================
  // CARREGAMENTO INICIAL — YBOT MIXAMO
  // ==================================================

  async loadModel() {

    const loader = new FBXLoader();

    this._characterLoadToken++;

    const token = this._characterLoadToken;

    try {

      const path = 'models/Female Locomotion Pack/';

      // ------------------------------------------------
      // 1. MODELO BASE
      // ------------------------------------------------

      const fbx = await loader.loadAsync(
        path + 'Ch46_nonPBR.fbx'
      );

      if (token !== this._characterLoadToken) {
        liberarRecursos(fbx);
        return false;
      }

      fbx.scale.setScalar(0.02);

      fbx.traverse(object => {

        if (!object.isMesh) return;

        object.castShadow = true;

        object.receiveShadow = true;
      });

      this.model = fbx;

      this.mesh.add(fbx);

      // ------------------------------------------------
      // 2. MIXER
      // ------------------------------------------------

      const mixer = new THREE.AnimationMixer(fbx);

      this.mixer = mixer;

      this.actions = {};

      this.activeAction = null;

      this.activeActionName = null;

      criarListenerFinished(this, mixer);

      // ------------------------------------------------
      // 3. CARREGAR ANIMAÇÕES
      // ------------------------------------------------

      let loaded = 0;

      const actions = {};

      await Promise.all(
        DEFAULT_ANIMATIONS.map(async ([name, file]) => {

          try {

            const animFBX = await loader.loadAsync(
              path + file
            );

            if (!animFBX.animations?.length) {

              console.warn(
                `[player] ${file}: sem animação`
              );

              return;
            }

            const clip = animFBX.animations[0];

            removerRootMotion(clip, name);

            // Usa o mixer capturado nesta operação,
            // evitando misturar animações de outro personagem.
            actions[name] = mixer.clipAction(clip);

            loaded++;

          } catch (error) {

            console.warn(
              `[player] Falha ao carregar ${name} (${file}):`,
              error
            );
          }
        })
      );

      // ------------------------------------------------
      // 4. VALIDAR TOKEN
      // ------------------------------------------------

      if (token !== this._characterLoadToken) {

        mixer.stopAllAction();

        liberarRecursos(fbx);

        return false;
      }

      this.actions = actions;

      this.modelLoaded = true;

      // ------------------------------------------------
      // 5. ANIMAÇÃO INICIAL
      // ------------------------------------------------

      if (this.actions.idle) {
        this.fadeToAction('idle', 0);
      }

      mixer.update(0);

      console.info(
        `[player] ✅ Personagem carregado · ${loaded}/${DEFAULT_ANIMATIONS.length} animações`
      );

      return true;

    } catch (error) {

      console.error(
        '[player] Erro ao carregar personagem:',
        error
      );

      this.modelLoaded = false;

      return false;
    }
  }

  // ==================================================
  // DOUBLE-TAP / EASTER EGGS
  // ==================================================

  _handleSpecialKey(event) {

    const overlay = document.getElementById(
      'screens-overlay'
    );

    if (overlay && overlay.innerHTML.trim() !== '') {
      return;
    }

    const tag = (
      event.target?.tagName || ''
    ).toLowerCase();

    if (
      tag === 'input' ||
      tag === 'textarea' ||
      event.target?.isContentEditable
    ) {
      return;
    }

    const key = event.key.toLowerCase();

    const now = performance.now();

    const last = this._lastPress[key] || 0;

    this._lastPress[key] = now;

    // ESC cancela easter egg.
    if (key === 'escape' && this._easterEgg) {

      this._easterEgg = null;

      this.fadeToAction('idle', 0.2);

      return;
    }

    // Só considera double-tap.
    if (now - last > this._doubleTapMs) {
      return;
    }

    switch (key) {

      // Easter eggs em loop.

      case 'q':
        this._playEasterEgg(
          'sillyDancing',
          '💃 Dançando'
        );
        break;

      case 'c':
        this._playEasterEgg(
          'climbing',
          '🧗 Escalando'
        );
        break;

      case 'k':
        this._playEasterEgg(
          'skateboarding',
          '🛹 Andando de skate'
        );
        break;

      case 'g':
        this._playEasterEgg(
          'guitar',
          '🎸 Tocando guitarra'
        );
        break;

      case 'r':
        this._playEasterEgg(
          'drums',
          '🥁 Tocando bateria'
        );
        break;

      case 'f':
        this._playEasterEgg(
          'excited',
          '🎉 Comemorando'
        );
        break;

      // Poses.

      case 'x':
        this._togglePose(
          'sitting',
          '🪑 Sentada'
        );
        break;

      case 'z':
        this._togglePose(
          'laying',
          '🛌 Deitada'
        );
        break;

      // One-shots.

      case 'p':
        this.playOneShot(
          'pickup',
          1200,
          '📦 Pegando objeto'
        );
        break;

      case 'j':
        this.playOneShot(
          'joyfulJump',
          1200,
          '🤸 Pulo alegre'
        );
        break;
    }
  }

  // ==================================================
  // EASTER EGGS
  // ==================================================

  _playEasterEgg(name, label = '') {

    if (!this.modelLoaded || !this.actions[name]) {

      console.warn(
        `[player] easter egg indisponível: ${name}`
      );

      return;
    }

    if (!this._checkContextOrNotify(name)) {
      return;
    }

    this._easterEgg = name;

    this._oneShotEndsAt = 0;

    this.fadeToAction(name, 0.3);

    this._notify(label || name);
  }

  // ==================================================
  // POSES
  // ==================================================

  _togglePose(name, label = '') {

    if (!this.modelLoaded || !this.actions[name]) {
      return;
    }

    // Toggle OFF: levantar.
    if (this._easterEgg === name) {

      this._easterEgg = null;

      this.fadeToAction('idle', 0.3);

      this._notify('');

      return;
    }

    if (!this._checkContextOrNotify(name)) {
      return;
    }

    this._easterEgg = name;

    this._oneShotEndsAt = 0;

    this.fadeToAction(name, 0.3);

    this._notify(label || name);
  }

  // ==================================================
  // ONE-SHOTS
  // ==================================================

  playOneShot(name, durationMs = 1200, label = '') {

    if (!this.modelLoaded || !this.actions[name]) {

      console.warn(
        `[player] one-shot indisponível: ${name}`
      );

      return;
    }

    if (!this._checkContextOrNotify(name)) {
      return;
    }

    this._easterEgg = null;

    this._oneShotEndsAt =
      performance.now() + durationMs;

    this.fadeToAction(name, 0.2);

    this._notify(label || name);
  }

  // ==================================================
  // ZONAS DE CONTEXTO
  // ==================================================

  addContextZone(
    animType,
    position,
    radius = 4,
    label = ''
  ) {

    this._contextZones.push({

      anim: animType,

      x: position.x,

      z: position.z,

      radius,

      label
    });

    console.log(
      `[player] 🎯 zona: ${animType} @ (${position.x}, ${position.z}) r=${radius} ${label}`
    );
  }

  _hasContextFor(animType) {

    const zones = this._contextZones.filter(
      zone => zone.anim === animType
    );

    // Sem zonas registradas: libera geral.
    if (zones.length === 0) {
      return { ok: true };
    }

    const px = this.mesh.position.x;

    const pz = this.mesh.position.z;

    for (const zone of zones) {

      const dx = px - zone.x;

      const dz = pz - zone.z;

      if (
        dx * dx + dz * dz <=
        zone.radius * zone.radius
      ) {
        return {
          ok: true,
          zone
        };
      }
    }

    return {
      ok: false,
      zones
    };
  }

  _checkContextOrNotify(animName) {

    const requirement = ANIM_REQUIREMENTS[animName];

    if (!requirement) {
      return true;
    }

    const result = this._hasContextFor(
      requirement.type
    );

    if (!result.ok) {

      this._notify(requirement.hint);

      return false;
    }

    return true;
  }

  // ==================================================
  // TOAST
  // ==================================================

  _notify(message) {

    if (!message) return;

    const element = document.getElementById('hint');

    if (!element) return;

    element.textContent = message;

    element.classList.remove('hidden');

    clearTimeout(this._notifyTimer);

    this._notifyTimer = setTimeout(() => {

      element.classList.add('hidden');

    }, 2000);
  }

  // ==================================================
  // INPUT
  // ==================================================

  _isKeyDown(name) {

    if (this.input) {
      return this.input.keys.has(name);
    }

    return this.keys[name] === true;
  }

  _consumeJump() {

    if (this.input) {
      return this.input.consumeJump();
    }

    const value = this.keys.space;

    if (value) {
      this.keys.space = false;
    }

    return value;
  }

  // ==================================================
  // TECLADO LEGADO
  // ==================================================

  onKey(event, pressed) {

    switch (event.code) {

      case 'KeyW':
        this.keys.w = pressed;
        break;

      case 'KeyA':
        this.keys.a = pressed;
        break;

      case 'KeyS':
        this.keys.s = pressed;
        break;

      case 'KeyD':
        this.keys.d = pressed;
        break;

      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.shift = pressed;
        break;

      case 'Space':

        this.keys.space = pressed;

        if (pressed) {
          event.preventDefault();
        }

        break;
    }
  }

  resetKeys() {

    Object.keys(this.keys).forEach(key => {

      this.keys[key] = false;

    });
  }

  // ==================================================
  // ANIMAÇÕES — FADE TO ACTION
  // ==================================================

  fadeToAction(name, duration = 0.2) {

    const nextAction = this.actions[name];

    if (
      !nextAction ||
      this.activeAction === nextAction
    ) {
      return;
    }

    const previousAction = this.activeAction;

    this.activeAction = nextAction;

    this.activeActionName = name;

    if (
      ONESHOT_ANIMS.has(name) ||
      POSE_ANIMS.has(name)
    ) {

      nextAction.setLoop(THREE.LoopOnce);

      nextAction.clampWhenFinished = true;

    } else if (HOLDING_ANIMS.has(name)) {

      nextAction.setLoop(THREE.LoopRepeat);

      nextAction.clampWhenFinished = false;

    } else {

      nextAction.setLoop(THREE.LoopRepeat);

      nextAction.clampWhenFinished = false;
    }

    nextAction.reset();

    nextAction.setEffectiveTimeScale(1);

    nextAction.setEffectiveWeight(1);

    if (previousAction) {
      previousAction.fadeOut(duration);
    }

    nextAction.fadeIn(duration).play();
  }

  // ==================================================
  // DIREÇÃO / CÂMERA
  // ==================================================

  updateDirection() {

    this.camera.getWorldDirection(this.forward);

    this.forward.y = 0;

    if (this.forward.lengthSq() < 1e-6) {
      this.forward.set(0, 0, -1);
    }

    this.forward.normalize();

    this.right
      .crossVectors(this.forward, this.worldUp)
      .normalize();

    this.direction.set(0, 0, 0);

    if (this._isKeyDown('w')) {
      this.direction.add(this.forward);
    }

    if (this._isKeyDown('s')) {
      this.direction.sub(this.forward);
    }

    if (this._isKeyDown('a')) {
      this.direction.sub(this.right);
    }

    if (this._isKeyDown('d')) {
      this.direction.add(this.right);
    }

    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();
    }
  }

  syncCameraTarget() {

    this.cameraTarget.set(

      this.mesh.position.x,

      this.mesh.position.y + 1.2,

      this.mesh.position.z

    );
  }

  // ==================================================
  // LOOP PRINCIPAL
  // ==================================================

  computeDesiredDisplacement(dt) {

    dt = Math.min(dt, 0.05);

    if (this.mixer) {
      this.mixer.update(dt);
    }

    const now = performance.now();

    // ------------------------------------------------
    // ONE-SHOT EM ANDAMENTO
    // ------------------------------------------------

    if (now < this._oneShotEndsAt) {
      return new THREE.Vector3();
    }

    // ------------------------------------------------
    // EASTER EGG ATIVO
    // ------------------------------------------------

    if (this._easterEgg) {

      const anyMove =
        this._isKeyDown('w') ||
        this._isKeyDown('a') ||
        this._isKeyDown('s') ||
        this._isKeyDown('d') ||
        this._isKeyDown(' ');

      if (!anyMove) {
        return new THREE.Vector3();
      }

      this._easterEgg = null;
    }

    // ------------------------------------------------
    // DIREÇÃO
    // ------------------------------------------------

    this.updateDirection();

    const isMoving =
      this.direction.lengthSq() > 0;

    const isRunning =
      this._isKeyDown('shift') && isMoving;

    // ------------------------------------------------
    // VELOCIDADE COM HABILIDADE
    // ------------------------------------------------

    const multiplier =
      this.speedMultiplier || 1;

    const targetSpeed = (
      isRunning
        ? this.maxSpeed
        : this.walkSpeed
    ) * multiplier;

    if (isMoving) {

      this.speed = THREE.MathUtils.damp(
        this.speed,
        targetSpeed,
        this.acceleration,
        dt
      );

    } else {

      this.speed = THREE.MathUtils.damp(
        this.speed,
        0,
        this.deceleration,
        dt
      );
    }

    // ------------------------------------------------
    // PULO
    // ------------------------------------------------

    if (
      this.isGrounded &&
      this._consumeJump()
    ) {

      this.jumpVelocity =
        this.jumpForce * (this.jumpMultiplier || 1);

      this.isGrounded = false;

      this.fadeToAction('jump', 0.1);
    }

    // ------------------------------------------------
    // GRAVIDADE
    // ------------------------------------------------

    if (!this.isGrounded) {

      this.jumpVelocity += this.gravity * dt;

      this.mesh.position.y +=
        this.jumpVelocity * dt;

      if (this.mesh.position.y <= 0) {

        this.mesh.position.y = 0;

        this.jumpVelocity = 0;

        this.isGrounded = true;
      }
    }

    // ------------------------------------------------
    // SELEÇÃO DA ANIMAÇÃO
    // ------------------------------------------------

    if (this.modelLoaded) {

      let desired = 'idle';

      if (!this.isGrounded) {

        desired =
          this.jumpVelocity < 0
            ? 'falling'
            : 'jump';

      } else if (isMoving) {

        const aPressed = this._isKeyDown('a');

        const dPressed = this._isKeyDown('d');

        const lateralOnly =
          (aPressed || dPressed) &&
          !this._isKeyDown('w') &&
          !this._isKeyDown('s');

        if (lateralOnly) {

          desired = aPressed
            ? 'strafeLeft'
            : 'strafeRight';

        } else {

          desired = isRunning
            ? 'run'
            : 'walk';
        }
      }

      if (this.activeActionName !== desired) {

        this.fadeToAction(desired, 0.2);
      }
    }

    // ------------------------------------------------
    // DESLOCAMENTO
    // ------------------------------------------------

    const displacement = new THREE.Vector3();

    if (isMoving) {

      displacement
        .copy(this.direction)
        .multiplyScalar(this.speed * dt);
    }

    return displacement;
  }

  // ==================================================
  // ROTAÇÃO
  // ==================================================

  applyRotation(dt) {

    if (this.direction.lengthSq() === 0) {
      return;
    }

    const targetAngle = Math.atan2(
      this.direction.x,
      this.direction.z
    );

    let diff =
      targetAngle - this.mesh.rotation.y;

    diff = Math.atan2(
      Math.sin(diff),
      Math.cos(diff)
    );

    const smoothing =
      1 - Math.exp(-this.rotationSpeed * dt);

    this.mesh.rotation.y +=
      diff * smoothing;
  }

  // ==================================================
  // DISPOSE
  // ==================================================

  dispose() {

    // Invalida carregamentos pendentes.
    this._characterLoadToken++;

    if (this._onKeyDown) {
      document.removeEventListener(
        'keydown',
        this._onKeyDown
      );
    }

    if (this._onKeyUp) {
      document.removeEventListener(
        'keyup',
        this._onKeyUp
      );
    }

    if (this._onBlur) {
      window.removeEventListener(
        'blur',
        this._onBlur
      );
    }

    if (this._onSpecialKey) {
      document.removeEventListener(
        'keydown',
        this._onSpecialKey
      );
    }

    if (this.mixer) {
      this.mixer.stopAllAction();
    }

    clearTimeout(this._notifyTimer);

    if (this.model) {

      this.mesh.remove(this.model);

      liberarRecursos(this.model);

      this.model = null;
    }

    this.actions = {};

    this.activeAction = null;

    this.activeActionName = null;

    this.modelLoaded = false;
  }
}

