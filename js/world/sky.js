// js/world/sky.js
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

/**
 * Carrega um HDRI EXR equiretangular e aplica como background + environment.
 * Retorna uma Promise que resolve quando o céu estiver pronto.
 */
export function carregarCeuHDRI(scene, renderer, caminho = 'syferfontein_0d_clear_puresky_2k.exr') {
  return new Promise((resolve, reject) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    new EXRLoader().load(
      caminho,
      (texture) => {
        // EXR vem em LinearSRGB — só marca colorSpace pra o Three não distorcer
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.LinearSRGBColorSpace;

        // Background: usa direto a textura equiretangular (sem gastar pré-processamento)
        scene.background = texture;

        // Environment: processa via PMREM pra IBL de qualidade
        const envRT = pmrem.fromEquirectangular(texture);
        scene.environment = envRT.texture;

        // Libera o PMREM (já gerou o render target)
        pmrem.dispose();

        // Ajusta intensidade do environment pra não estourar
        scene.environmentIntensity = 1.0;

        console.log('[sky] HDRI carregado:', caminho);
        resolve({ background: texture, environment: envRT.texture });
      },
      undefined,
      (err) => {
        console.error('[sky] Falha ao carregar EXR:', caminho, err);
        // Fallback: céu sólido pra não ficar preto
        scene.background = new THREE.Color(0x0a0f17);
        reject(err);
      }
    );
  });
}
