import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export function loadCar(scene, physicsWorld, materials) {
  return new Promise((resolve) => {
    const loader = new GLTFLoader();
    const group = new THREE.Group();
    scene.add(group);

    // 1. Carrega a Oficina de fundo
    loader.load('models/car-workshop.glb', (gltf) => {
      const shop = gltf.scene;
      shop.scale.set(1, 1, 1);
      scene.add(shop);
    });

    // 2. Carrega os componentes interativos
    const components = [
      { file: 'models/car-battery.glb', name: 'bateria', pos: [1.5, 0.5, -1], scale: 1.5 },
      { file: 'models/brake-disc.glb', name: 'sensor_freio', pos: [-1.5, 0.5, 1], scale: 2.0 },
      { file: 'models/car-key-fob.glb', name: 'alarme', pos: [0, 1, 2], scale: 3.0 }
    ];

    let carregados = 0;

    components.forEach(comp => {
      loader.load(comp.file, (gltf) => {
        const model = gltf.scene;
        model.position.set(...comp.pos);
        model.scale.setScalar(comp.scale);
        
        // Marca para o Raycasting saber o que é
        model.traverse(o => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            o.userData.tipo = comp.name;
          }
        });

        // Adiciona um brilho (holograma) para indicar que é clicável
        const boxHelper = new THREE.BoxHelper(model, 0x58a6ff);
        model.add(boxHelper);

        group.add(model);
        carregados++;

        if (carregados === components.length) {
          resolve({ group });
        }
      });
    });
  });
}
