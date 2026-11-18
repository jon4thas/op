import * as THREE from 'three';

export const CONFIG = {
  playerRadius:        0.45,
  playerHeight:        0.9,
  interactionDistance: 10,
  cameraFollowSpeed:   0.2,
};

export function createColliders() {
  return [];
}

export function colide(posicao, colliders) {
  const centro = posicao.clone();
  centro.y += CONFIG.playerHeight;
  const esfera = new THREE.Sphere(centro, CONFIG.playerRadius);
  return colliders.some(c => c.intersectsSphere(esfera));
}

export function resolverColisao(posAnterior, posDesejada, colliders) {
  const r  = posAnterior.clone();
  const tx = r.clone(); tx.x = posDesejada.x;
  if (!colide(tx, colliders)) r.x = tx.x;
  const tz = r.clone(); tz.z = posDesejada.z;
  if (!colide(tz, colliders)) r.z = tz.z;
  return r;
}
