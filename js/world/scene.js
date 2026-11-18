import * as THREE from 'three';

export function createScene() {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 8, 14);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  document.getElementById('scene').replaceWith(renderer.domElement);
  renderer.domElement.id = 'scene';

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer };
}

export function buildFloor(scene) {
  // ── Chão principal (grande) ────────────────────────
  const floorSize = 120;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorSize, floorSize, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x2a2a3a,
      roughness: 0.85,
      metalness: 0.1
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── Grid sutil (ajuda a ver profundidade) ──────────
  const grid = new THREE.GridHelper(
    120, 120,
    0x3a3a4a, 0x2a2a3a
  );
  grid.position.y = 0.01;
  grid.material.opacity = 0.3;
  grid.material.transparent = true;
  scene.add(grid);

  // ── Anel externo (decoração) ───────────────────────
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(38, 40, 64),
    new THREE.MeshStandardMaterial({
      color: 0x3a4a5a,
      side: THREE.DoubleSide,
      roughness: 0.7,
      metalness: 0.2
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  scene.add(ring);

  return { floor, grid, ring };
}
