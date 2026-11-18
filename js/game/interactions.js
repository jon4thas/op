import * as THREE from 'three';
import { abrirScanner } from '../ui/screens.js';
import { flow, FASE } from './flow.js';   // <- ajustado

export function setupRaycast({ renderer, camera, getCarGroup }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const canvas = renderer.domElement;

  canvas.addEventListener('click', (e) => {
    if (flow.fase !== FASE.WORKSHOP) return;   // <- OFICINA → WORKSHOP
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 2;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 2;
    raycaster.setFromCamera(pointer, camera);

    const carGroup = getCarGroup();
    if (!carGroup) return;

    const hits = raycaster.intersectObjects([carGroup], true);
    if (hits.length > 0) {
      let n = hits[0].object;
      while (n && !n.userData?.tipo) n = n.parent;
      if (n?.userData?.tipo) abrirScanner(n.userData.tipo);
    }
  });
}
