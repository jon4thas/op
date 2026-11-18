
import * as CANNON from 'cannon-es';

// ======================================================
// CONFIGURAÇÕES DA FÍSICA
// ======================================================

const PHYSICS_CONFIG = {
  gravity: -9.82,
  fixedTimeStep: 1 / 60,
  maxSubSteps: 5,
  maxFrameTime: 0.1,
  groundFriction: 0.6,
  carFriction: 0.4,
  restitution: 0.05,
  allowSleep: true
};

// ======================================================
// CRIAÇÃO DO MUNDO
// ======================================================

export function createPhysics() {
  const world = new CANNON.World();

  // Gravidade
  world.gravity.set(0, PHYSICS_CONFIG.gravity, 0);

  // Broadphase: otimiza detecção de colisões
  world.broadphase = new CANNON.SAPBroadphase(world);

  // Estabilidade
  world.allowSleep = PHYSICS_CONFIG.allowSleep;
  world.solver.iterations = 10;
  world.solver.tolerance = 0.001;

  // Materiais
  const groundMat = new CANNON.Material('ground');
  const carMat = new CANNON.Material('car');

  // Contato entre chão e veículo
  const groundCarContact = new CANNON.ContactMaterial(
    groundMat,
    carMat,
    {
      friction: PHYSICS_CONFIG.groundFriction,
      restitution: PHYSICS_CONFIG.restitution
    }
  );

  world.addContactMaterial(groundCarContact);

  // Contato padrão
  world.defaultContactMaterial.friction =
    PHYSICS_CONFIG.carFriction;

  world.defaultContactMaterial.restitution = 0.05;

  // ====================================================
  // CHÃO FÍSICO
  // ====================================================

  const groundBody = new CANNON.Body({
    mass: 0,
    material: groundMat,
    shape: new CANNON.Plane()
  });

  // Plano horizontal: superfície no eixo X/Z
  groundBody.quaternion.setFromEuler(
    -Math.PI / 2,
    0,
    0
  );

  groundBody.position.set(0, 0, 0);

  groundBody.collisionFilterGroup = 1;
  groundBody.collisionFilterMask = -1;

  world.addBody(groundBody);

  // ====================================================
  // RETORNO
  // Mantém compatibilidade com o main.js existente
  // ====================================================

  return {
    world,
    groundBody,
    materials: {
      groundMat,
      carMat
    }
  };
}

// ======================================================
// ATUALIZAÇÃO DA SIMULAÇÃO
// ======================================================

export function stepPhysics(world, dt) {
  if (!world || !Number.isFinite(dt) || dt <= 0) {
    return;
  }

  // Evita saltos físicos após travamentos da aplicação
  const safeDt = Math.min(
    dt,
    PHYSICS_CONFIG.maxFrameTime
  );

  // Passo fixo com substeps para maior estabilidade
  world.step(
    PHYSICS_CONFIG.fixedTimeStep,
    safeDt,
    PHYSICS_CONFIG.maxSubSteps
  );
}

