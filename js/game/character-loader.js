
import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();

const ANIMATION_ALIASES = {
  idle: ['idle', 'standing', 'breathing'],
  walk: ['walk', 'walking'],
  run: ['run', 'running'],
  jump: ['jump', 'jumping'],
  falling: ['falling', 'fall'],
  strafeLeft: ['left strafe walk', 'strafeleft', 'leftstrafe'],
  strafeRight: ['right strafe walk', 'straferight', 'rightstrafe'],
  joyfulJump: ['joyful jump'],
  pickup: ['picking up object', 'pickup'],
  excited: ['excited'],
  sillyDancing: ['silly dancing'],
  climbing: ['climbing'],
  skateboarding: ['skateboarding'],
  guitar: ['guitar playing'],
  drums: ['playing drums'],
  sitting: ['female sitting pose', 'sitting'],
  laying: ['laying idle', 'laying']
};

function normalizarNome(nome = '') {
  return nome
    .toLowerCase()
    .replace(/\.(fbx|glb|gltf)$/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function extrairClips(objeto) {
  if (objeto.animations?.length) return objeto.animations;
  return [];
}

function prepararModelo(modelo, config) {
  modelo.position.set(0, 0, 0);

  const escala = Number(config.escala ?? 0.02);
  modelo.scale.setScalar(escala);

  modelo.traverse(obj => {
    if (!obj.isMesh) return;

    obj.castShadow = true;
    obj.receiveShadow = true;

    if (obj.material) {
      const materiais = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];

      for (const material of materiais) {
        material.needsUpdate = true;
      }
    }
  });

  if (config.centralizar) {
    const box = new THREE.Box3().setFromObject(modelo);
    const centro = box.getCenter(new THREE.Vector3());

    modelo.position.x -= centro.x;
    modelo.position.z -= centro.z;
    modelo.position.y -= box.min.y;
  }

  return modelo;
}

async function carregarFBX(url) {
  return fbxLoader.loadAsync(url);
}

async function carregarGLTF(url) {
  const gltf = await gltfLoader.loadAsync(url);

  return {
    scene: gltf.scene,
    animations: gltf.animations || []
  };
}

export async function carregarModeloPersonagem(config) {
  if (!config?.modelo3D) {
    throw new Error('Configuração sem endereço de modelo3D.');
  }

  const formato = (config.formato || '').toLowerCase();

  let modelo;
  let clips = [];

  if (formato === 'fbx' || /\.fbx$/i.test(config.modelo3D)) {
    const fbx = await carregarFBX(config.modelo3D);
    modelo = fbx;
    clips = extrairClips(fbx);
  } else if (
    formato === 'glb' ||
    formato === 'gltf' ||
    /\.(glb|gltf)$/i.test(config.modelo3D)
  ) {
    const gltf = await carregarGLTF(config.modelo3D);
    modelo = gltf.scene;
    clips = gltf.animations;
  } else {
    throw new Error(`Formato de personagem não suportado: ${formato}`);
  }

  prepararModelo(modelo, config);

  return { modelo, clips };
}

export async function carregarAnimacoes(config = {}) {
  const resultado = {};

  for (const [nome, url] of Object.entries(config)) {
    if (!url) continue;

    try {
      const fbx = await carregarFBX(url);
      const clip = fbx.animations?.[0];

      if (clip) resultado[nome] = clip;
    } catch (erro) {
      console.warn(`[CharacterLoader] Falha na animação ${nome}:`, erro);
    }
  }

  return resultado;
}

export function mapearAnimacoes(clips = [], aliases = ANIMATION_ALIASES) {
  const resultado = {};

  for (const [destino, nomes] of Object.entries(aliases)) {
    const clip = clips.find(animacao => {
      const nome = normalizarNome(animacao.name);

      return nomes.some(alias => {
        const termo = normalizarNome(alias);
        return nome.includes(termo) || termo.includes(nome);
      });
    });

    if (clip) resultado[destino] = clip;
  }

  return resultado;
}

export function liberarRecursos(modelo) {
  if (!modelo) return;

  modelo.traverse(obj => {
    if (!obj.isMesh) return;

    obj.geometry?.dispose();

    const materiais = Array.isArray(obj.material)
      ? obj.material
      : [obj.material];

    for (const material of materiais) {
      if (!material) continue;

      // Texturas podem ser compartilhadas; não são descartadas aqui.
      material.dispose();
    }
  });
}

