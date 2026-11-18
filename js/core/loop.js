import { FASE }                    from '../game/flow.js';
import { CONFIG, resolverColisao } from './collision.js';

export function startLoop({ world, player, colliders, interaction, flow }) {
  const { scene, camera, renderer } = world;
  let last = performance.now();

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt  = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (flow.fase === FASE.WORKSHOP) {
      const disp    = player.computeDesiredDisplacement(dt);
      const oldPos  = player.mesh.position.clone();
      const desired = oldPos.clone().add(disp);
      player.mesh.position.copy(resolverColisao(oldPos, desired, colliders));

      player.applyRotation(dt);
      player.syncCameraTarget();
      player.controls.target.lerp(player.cameraTarget, CONFIG.cameraFollowSpeed);
      player.controls.update();

      interaction.atualizar();
    }
    renderer.render(scene, camera);
  }
  animate();
}
