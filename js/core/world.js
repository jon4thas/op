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
