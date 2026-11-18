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
