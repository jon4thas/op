
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ============================================================
// ESTAÇÃO 01 — ENGINE
// Laboratório de diagnóstico e manutenção
// ============================================================

export function criarEstacoes(scene, colliders = []) {

  const stations = [];
  const loader = new GLTFLoader();

  // Evita carregamentos simultâneos duplicados do mesmo modelo.
  let modeloCarregado = false;

  // ============================================================
  // 1. MATERIAIS COMPARTILHADOS
  // ============================================================

  const mat = {
    floor: new THREE.MeshStandardMaterial({
      color: 0x252b35,
      roughness: 0.82,
      metalness: 0.25
    }),

    metal: new THREE.MeshStandardMaterial({
      color: 0x343c49,
      roughness: 0.55,
      metalness: 0.75
    }),

    dark: new THREE.MeshStandardMaterial({
      color: 0x151b24,
      roughness: 0.65,
      metalness: 0.35
    }),

    cyan: new THREE.MeshStandardMaterial({
      color: 0x00c8e5,
      emissive: 0x004455,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.3
    }),

    yellow: new THREE.MeshStandardMaterial({
      color: 0xf0b323,
      roughness: 0.7,
      metalness: 0.2
    }),

    red: new THREE.MeshStandardMaterial({
      color: 0xc0392b,
      roughness: 0.6,
      metalness: 0.3
    }),

    screen: new THREE.MeshStandardMaterial({
      color: 0x071d29,
      emissive: 0x007b99,
      emissiveIntensity: 1.1,
      roughness: 0.25
    }),

    rubber: new THREE.MeshStandardMaterial({
      color: 0x111318,
      roughness: 0.95
    })
  };

  // ============================================================
  // 2. CACHE DE GEOMETRIAS
  // ============================================================

  const geometries = new Map();

  function obterBoxGeometry(width, height, depth) {

    const key = `${width}_${height}_${depth}`;

    if (!geometries.has(key)) {
      geometries.set(
        key,
        new THREE.BoxGeometry(width, height, depth)
      );
    }

    return geometries.get(key);
  }

  // ============================================================
  // 3. HELPERS
  // ============================================================

  function criarCaixa(
    parent,
    size,
    position,
    material,
    options = {}
  ) {

    const geometry = obterBoxGeometry(
      size[0],
      size[1],
      size[2]
    );

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(
      position[0],
      position[1],
      position[2]
    );

    mesh.castShadow = options.castShadow !== false;
    mesh.receiveShadow = options.receiveShadow !== false;

    if (options.name) {
      mesh.name = options.name;
    }

    parent.add(mesh);

    return mesh;
  }

  function adicionarColisor(object) {

    scene.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);

    if (!box.isEmpty()) {
      colliders.push(box);
    }
  }

  function criarGrupo(nome, position = [0, 0, 0]) {

    const group = new THREE.Group();

    group.name = nome;

    group.position.set(
      position[0],
      position[1],
      position[2]
    );

    return group;
  }

  // ============================================================
  // 4. PLATAFORMA PRINCIPAL
  // ============================================================

  function criarPlataforma(root, width, depth) {

    // Base inferior
    criarCaixa(
      root,
      [width + 0.35, 0.18, depth + 0.35],
      [0, 0.09, 0],
      mat.dark,
      { name: 'platform-base' }
    );

    // Piso principal
    criarCaixa(
      root,
      [width, 0.12, depth],
      [0, 0.24, 0],
      mat.floor,
      {
        name: 'platform-floor',
        castShadow: false
      }
    );

    // Faixa frontal
    criarCaixa(
      root,
      [width * 0.82, 0.035, 0.09],
      [0, 0.315, depth / 2 - 0.25],
      mat.cyan,
      { castShadow: false }
    );

    // Faixas laterais
    for (const side of [-1, 1]) {

      criarCaixa(
        root,
        [0.09, 0.035, depth * 0.78],
        [side * (width / 2 - 0.25), 0.315, 0],
        mat.yellow,
        { castShadow: false }
      );
    }

    // Linhas de divisão do piso
    for (let i = -2; i <= 2; i++) {

      criarCaixa(
        root,
        [0.025, 0.012, depth - 1.2],
        [i * 2.8, 0.315, 0],
        mat.metal,
        { castShadow: false }
      );
    }
  }

  // ============================================================
  // 5. ARMÁRIO TÉCNICO
  // ============================================================

  function criarArmario(root, position) {

    const cabinet = criarGrupo(
      'technical-cabinet',
      position
    );

    criarCaixa(
      cabinet,
      [1.15, 1.85, 0.95],
      [0, 0.925, 0],
      mat.dark
    );

    // Porta frontal
    criarCaixa(
      cabinet,
      [1.05, 1.65, 0.045],
      [0, 0.925, 0.49],
      mat.metal
    );

    // Divisões
    for (let i = 0; i < 4; i++) {

      criarCaixa(
        cabinet,
        [0.82, 0.035, 0.035],
        [0, 0.35 + i * 0.34, 0.525],
        mat.dark
      );
    }

    // Identificação luminosa
    criarCaixa(
      cabinet,
      [0.28, 0.08, 0.045],
      [0, 1.58, 0.53],
      mat.cyan
    );

    // Indicadores
    criarCaixa(
      cabinet,
      [0.12, 0.06, 0.045],
      [-0.30, 1.58, 0.53],
      mat.yellow
    );

    root.add(cabinet);

    adicionarColisor(cabinet);

    return cabinet;
  }

  // ============================================================
  // 6. CONSOLE DE DIAGNÓSTICO
  // ============================================================

  function criarConsole(root, position, scale = 1) {

    const console = criarGrupo(
      'diagnostic-console',
      position
    );

    console.scale.setScalar(scale);

    // Estrutura
    criarCaixa(
      console,
      [1.25, 1.25, 0.85],
      [0, 0.625, 0],
      mat.dark
    );

    // Display
    criarCaixa(
      console,
      [1.05, 0.62, 0.055],
      [0, 1.35, 0.445],
      mat.screen
    );

    // Moldura
    criarCaixa(
      console,
      [1.18, 0.055, 0.06],
      [0, 1.70, 0.45],
      mat.metal
    );

    // Indicadores
    criarCaixa(
      console,
      [0.16, 0.045, 0.045],
      [-0.32, 0.98, 0.45],
      mat.cyan
    );

    criarCaixa(
      console,
      [0.16, 0.045, 0.045],
      [0, 0.98, 0.45],
      mat.yellow
    );

    criarCaixa(
      console,
      [0.16, 0.045, 0.045],
      [0.32, 0.98, 0.45],
      mat.red
    );

    // Base
    criarCaixa(
      console,
      [1.55, 0.15, 1.05],
      [0, 0.075, 0],
      mat.metal
    );

    root.add(console);

    adicionarColisor(console);

    return console;
  }

  // ============================================================
  // 7. BANCADA DE MANUTENÇÃO
  // ============================================================

  function criarBancada(root, position) {

    const bench = criarGrupo(
      'maintenance-workbench',
      position
    );

    // Tampo
    criarCaixa(
      bench,
      [2.4, 0.16, 1.15],
      [0, 1.05, 0],
      mat.metal
    );

    // Pés
    for (const x of [-1.05, 1.05]) {

      for (const z of [-0.45, 0.45]) {

        criarCaixa(
          bench,
          [0.12, 1.0, 0.12],
          [x, 0.5, z],
          mat.dark
        );
      }
    }

    // Faixa de identificação
    criarCaixa(
      bench,
      [2.05, 0.045, 0.04],
      [0, 0.94, 0.58],
      mat.yellow
    );

    // Ferramentas / módulos técnicos
    criarCaixa(
      bench,
      [0.48, 0.10, 0.35],
      [-0.65, 1.18, 0],
      mat.dark
    );

    criarCaixa(
      bench,
      [0.48, 0.10, 0.35],
      [0, 1.18, 0],
      mat.cyan
    );

    criarCaixa(
      bench,
      [0.48, 0.10, 0.35],
      [0.65, 1.18, 0],
      mat.dark
    );

    root.add(bench);

    adicionarColisor(bench);

    return bench;
  }

  // ============================================================
  // 8. SUPORTE DO ENGINE
  // ============================================================

  function criarSuporteMotor(root) {

    const stand = criarGrupo('engine-support');

    // Trilhos inferiores
    for (const z of [-0.85, 0.85]) {

      criarCaixa(
        stand,
        [7.2, 0.18, 0.20],
        [0, 0.34, z],
        mat.metal
      );
    }

    // Travessas
    for (const x of [-3.45, 3.45]) {

      criarCaixa(
        stand,
        [0.20, 0.18, 1.9],
        [x, 0.34, 0],
        mat.dark
      );
    }

    // Apoios
    for (const x of [-3.45, 3.45]) {

      for (const z of [-0.85, 0.85]) {

        criarCaixa(
          stand,
          [0.32, 0.14, 0.32],
          [x, 0.14, z],
          mat.rubber
        );
      }
    }

    // Travessas superiores
    for (const z of [-0.65, 0.65]) {

      criarCaixa(
        stand,
        [5.8, 0.12, 0.12],
        [0, 0.58, z],
        mat.yellow
      );
    }

    root.add(stand);

    return stand;
  }

  // ============================================================
  // 9. CARREGAMENTO DO MODELO ENGINE
  // ============================================================

  function carregarModelo(
    root,
    path,
    options = {}
  ) {

    const {
      maxSize = 7,
      offsetX = 0,
      offsetZ = 0,
      baseY = 0.65,
      collision = false
    } = options;

    loader.load(

      path,

      (gltf) => {

        if (modeloCarregado) return;

        const model = gltf.scene;

        model.name = 'engine-model';

        model.updateMatrixWorld(true);

        const originalBox = new THREE.Box3()
          .setFromObject(model);

        const originalSize = originalBox.getSize(
          new THREE.Vector3()
        );

        const largestDimension = Math.max(
          originalSize.x,
          originalSize.y,
          originalSize.z
        );

        if (
          !Number.isFinite(largestDimension) ||
          largestDimension <= 0
        ) {

          console.warn(
            '[stations] Modelo engine inválido:',
            path
          );

          return;
        }

        // Dimensionamento proporcional
        model.scale.multiplyScalar(
          maxSize / largestDimension
        );

        model.updateMatrixWorld(true);

        // Centralização
        const box = new THREE.Box3()
          .setFromObject(model);

        const center = box.getCenter(
          new THREE.Vector3()
        );

        model.position.x += offsetX - center.x;
        model.position.z += offsetZ - center.z;
        model.position.y += baseY - box.min.y;

        // Sombras
        model.traverse((object) => {

          if (!object.isMesh) return;

          object.castShadow = true;
          object.receiveShadow = true;

          if (object.geometry) {
            object.geometry.computeBoundingSphere();
          }
        });

        root.add(model);

        scene.updateMatrixWorld(true);

        if (collision) {
          adicionarColisor(model);
        }

        modeloCarregado = true;

        console.info(
          '[stations] Engine carregado:',
          path
        );
      },

      undefined,

      (error) => {

        console.error(
          '[stations] Falha ao carregar engine:',
          path,
          error
        );
      }
    );
  }

  // ============================================================
  // 10. ESTAÇÃO PRINCIPAL
  // ============================================================

  const engine = criarGrupo(
    'station-engine',
    [-11, 0, -12]
  );

  engine.userData = {

    type: 'station',

    id: 'missao01',

    title: 'Missão 01: Central de Diagnóstico',

    subtitle: 'Diagnóstico e manutenção de sistemas',

    area: 'diagnostico',

    competencia: 'Análise e diagnóstico de falhas',

    dificuldade: 'iniciante',

    status: 'disponivel',

    unlocked: true,

    requer: [],

    objetivo:
      'Investigar evidências, identificar falhas e validar uma solução.'
  };

  scene.add(engine);

  stations.push(engine);

  // ============================================================
  // 11. CONSTRUÇÃO DO AMBIENTE
  // ============================================================

  // Plataforma ampliada
  criarPlataforma(engine, 18, 16);

  // Estrutura central do motor
  criarSuporteMotor(engine);

  // Modelo principal
  carregarModelo(
    engine,
    'models/car-engine.glb',
    {
      maxSize: 7.2,
      offsetX: 0,
      offsetZ: -0.1,
      baseY: 0.72,
      collision: false
    }
  );

  // ============================================================
  // 12. EQUIPAMENTOS LATERAIS
  // ============================================================

  // Armário técnico à esquerda
  criarArmario(
    engine,
    [-7.0, 0.24, -4.8]
  );

  // Console principal à direita
  criarConsole(
    engine,
    [6.5, 0.24, -4.8],
    1.05
  );

  // Bancada frontal esquerda
  criarBancada(
    engine,
    [-5.8, 0.24, 5.0]
  );

  // Console secundário frontal direito
  criarConsole(
    engine,
    [5.8, 0.24, 4.8],
    0.90
  );

  // ============================================================
  // 13. ELEMENTOS DE IDENTIFICAÇÃO
  // ============================================================

  // Painel traseiro
  const rearPanel = criarGrupo(
    'station-rear-panel',
    [0, 0.24, -7.1]
  );

  criarCaixa(
    rearPanel,
    [5.8, 2.0, 0.16],
    [0, 1.0, 0],
    mat.dark
  );

  criarCaixa(
    rearPanel,
    [5.2, 0.10, 0.05],
    [0, 1.85, 0.12],
    mat.cyan
  );

  // Painéis laterais
  criarCaixa(
    engine,
    [0.12, 1.7, 5.2],
    [-8.6, 1.0, 0],
    mat.dark
  );

  criarCaixa(
    engine,
    [0.12, 1.7, 5.2],
    [8.6, 1.0, 0],
    mat.dark
  );

  engine.add(rearPanel);

  // ============================================================
  // 14. ÁREA LIVRE DE CIRCULAÇÃO
  // ============================================================

  // Não são adicionados colisores à plataforma.
  // O estudante pode circular livremente pelo ambiente.

  // Os equipamentos possuem colisores próprios.
  // O modelo GLB do motor não bloqueia toda a área central.

  // ============================================================
  // 15. FINALIZAÇÃO
  // ============================================================

  scene.updateMatrixWorld(true);

  console.info(
    '[stations] Ambiente criado:',
    engine.userData.title
  );

  console.info(
    '[stations] Estações disponíveis:',
    stations.length
  );

  console.info(
    '[stations] Colisores registrados:',
    colliders.length
  );

  // Compatibilidade com o código anterior.
  stations.verificarDesbloqueios = () => false;

  stations.stations = stations;

  return stations;
}

