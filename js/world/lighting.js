import * as THREE from 'three';

export function setupLighting(scene) {
  // ── Sol (directional) ──────────────────────────────
  const sun = new THREE.DirectionalLight(0xfff5e0, 2.5);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;

  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;

  scene.add(sun);

  // ── Hemisphere (céu/terra) ─────────────────────────
  const hemi = new THREE.HemisphereLight(0xaaccff, 0x445566, 0.8);
  scene.add(hemi);

  // ── Ambient (suave) ────────────────────────────────
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);

  // ── Rim light (destaque nas bordas) ────────────────
  const rim = new THREE.DirectionalLight(0x88aaff, 0.6);
  rim.position.set(-20, 10, -20);
  scene.add(rim);

  // ── Preenchimento (frente) ─────────────────────────
  const fill = new THREE.DirectionalLight(0xffe0b0, 0.4);
  fill.position.set(-10, 15, 25);
  scene.add(fill);

  return { sun, hemi, ambient, rim, fill };
}
