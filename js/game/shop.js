
import { state, salvarProgresso } from './state.js';

// ======================================================
// CAMINHOS DOS MODELOS
// ======================================================

// shop.js está em js/game/.
// ../../models/ aponta para a pasta models na raiz do projeto.

const MODELS = new URL('../../models/', import.meta.url);

function modelo(arquivo) {
  return new URL(arquivo, MODELS).href;
}

// ======================================================
// YBOT — MODELO E ANIMAÇÕES
// ======================================================

export const YBOT_MODEL = modelo(
  'Female Locomotion Pack/Ch46_nonPBR.fbx'
);

export const YBOT_ANIMATIONS = {
  idle: modelo('Female Locomotion Pack/idle.fbx'),
  walking: modelo('Female Locomotion Pack/walking.fbx'),
  running: modelo('Female Locomotion Pack/running.fbx'),
  jump: modelo('Female Locomotion Pack/jump.fbx'),

  leftTurn: modelo('Female Locomotion Pack/left turn.fbx'),
  rightTurn: modelo('Female Locomotion Pack/right turn.fbx'),

  leftStrafe: modelo('Female Locomotion Pack/left strafe.fbx'),
  rightStrafe: modelo('Female Locomotion Pack/right strafe.fbx'),

  leftStrafeWalk: modelo(
    'Female Locomotion Pack/left strafe walk.fbx'
  ),

  rightStrafeWalk: modelo(
    'Female Locomotion Pack/right strafe walk.fbx'
  )
};

// ======================================================
// CATÁLOGO DE PERSONAGENS
// ======================================================

export const PERSONAGENS = [
  {
    id: 'default',
    nome: 'YBot',
    emoji: '',

    descricao:
      'Criador de Mundos. Transforma ideias aparentemente impossíveis em cenários, universos e possibilidades.',

    habilidade:
      'Elucubrações Inexequíveis · Criador de Mundos',

    preco: 0,

    desbloqueadoPorPadrao: true,

    modelo3D: YBOT_MODEL,

    formato: 'fbx',

    animacoes: YBOT_ANIMATIONS
  },

  {
    id: 'ninja',
    nome: 'Ninja',
    emoji: '?',

    descricao:
      'Move-se mais rápido e salta mais alto.',

    preco: 300,

    habilidade:
      'Velocidade +50%, pulo +30%'
  },

  {
    id: 'cientista',
    nome: 'Cientista',
    emoji: '?',

    descricao:
      'Recebe XP em dobro em todos os desafios.',

    preco: 500,

    habilidade:
      'XP x2'
  },

  {
    id: 'engenheiro',
    nome: 'Engenheiro',
    emoji: '?',

    descricao:
      'Ganha mais dinheiro ao concluir desafios.',

    preco: 700,

    habilidade:
      'Dinheiro +50%'
  },

  {
    id: 'mago',
    nome: 'Mago da Lógica',
    emoji: '?',

    descricao:
      'Recebe uma dica grátis em cada desafio.',

    preco: 1000,

    habilidade:
      'Dica automática'
  }
];

// ======================================================
// CATÁLOGO VISUAL — MODELOS 3D
// ======================================================

// O carrinho NÃO é um produto.
// Ele permanece exclusivamente como botão de acesso à loja.

export const ITENS_LOJA = [

  // ----------------------------------------------------
  // MOBILIDADE
  // ----------------------------------------------------

  {
    id: 'skate',
    nome: 'Skate',
    categoria: 'mobilidade',
    emoji: '🛹',

    modelo3D: modelo('skateboard-667a82.glb'),

    descricao:
      'Equipamento de mobilidade.'
  },

  {
    id: 'carro-corrida',
    nome: 'Carro de corrida',
    categoria: 'mobilidade',
    emoji: '🏎️',

    modelo3D: modelo('race-car.glb'),

    descricao:
      'Veículo esportivo.'
  },

  // ----------------------------------------------------
  // AUTOMOTIVO
  // ----------------------------------------------------

  {
    id: 'motor',
    nome: 'Motor',
    categoria: 'automotivo',
    emoji: '⚙️',

    modelo3D: modelo('engine.glb'),

    descricao:
      'Motor automotivo.'
  },

  {
    id: 'alternador',
    nome: 'Alternador',
    categoria: 'automotivo',
    emoji: '🔧',

    modelo3D: modelo('alternator.glb'),

    descricao:
      'Sistema de geração elétrica.'
  },

  {
    id: 'bateria',
    nome: 'Bateria',
    categoria: 'automotivo',
    emoji: '🔋',

    modelo3D: modelo('car-battery.glb'),

    descricao:
      'Sistema elétrico automotivo.'
  },

  {
    id: 'freio',
    nome: 'Disco de freio',
    categoria: 'automotivo',
    emoji: '🔩',

    modelo3D: modelo('brake-disc.glb'),

    descricao:
      'Sistema de frenagem.'
  },

  {
    id: 'painel',
    nome: 'Painel',
    categoria: 'automotivo',
    emoji: '🚘',

    modelo3D: modelo('car-dashboard.glb'),

    descricao:
      'Painel de instrumentos.'
  },

  {
    id: 'pedais',
    nome: 'Pedais',
    categoria: 'automotivo',
    emoji: '🦶',

    modelo3D: modelo('car-pedals.glb'),

    descricao:
      'Conjunto de pedais.'
  },

  {
    id: 'cambio',
    nome: 'Seletor de marchas',
    categoria: 'automotivo',
    emoji: '⚙️',

    modelo3D: modelo('automatic-gear-selector.glb'),

    descricao:
      'Transmissão automática.'
  },

  {
    id: 'chave',
    nome: 'Chave automotiva',
    categoria: 'automotivo',
    emoji: '🔑',

    modelo3D: modelo('car-key-fob.glb'),

    descricao:
      'Chave eletrônica.'
  },

  // ----------------------------------------------------
  // TECNOLOGIA
  // ----------------------------------------------------

  {
    id: 'navegacao',
    nome: 'Central multimídia',
    categoria: 'tecnologia',
    emoji: '📟',

    modelo3D: modelo('car-navigation-screen.glb'),

    descricao:
      'Sistema de navegação.'
  },

  {
    id: 'console',
    nome: 'Console portátil',
    categoria: 'tecnologia',
    emoji: '🎮',

    modelo3D: modelo('handheld-game-console.glb'),

    descricao:
      'Dispositivo eletrônico.'
  },

  {
    id: 'camera',
    nome: 'Câmera de segurança',
    categoria: 'tecnologia',
    emoji: '📹',

    modelo3D: modelo('security-camera.glb'),

    descricao:
      'Monitoramento e segurança.'
  },

  {
    id: 'robo',
    nome: 'Braço robótico',
    categoria: 'tecnologia',
    emoji: '🦾',

    modelo3D: modelo('robot-arm.glb'),

    descricao:
      'Automação industrial.'
  },

  {
    id: 'robo-luz',
    nome: 'Braço robótico iluminado',
    categoria: 'tecnologia',
    emoji: '🤖',

    modelo3D: modelo('robot-arm-light.glb'),

    descricao:
      'Modelo alternativo de robótica.'
  },

  // ----------------------------------------------------
  // NATUREZA
  // ----------------------------------------------------

  {
    id: 'abelha',
    nome: 'Abelha',
    categoria: 'natureza',
    emoji: '🐝',

    modelo3D: modelo('honeybee-base.glb'),

    descricao:
      'Modelo colecionável.'
  }
];

// ======================================================
// CATEGORIAS
// ======================================================

// Não existe mais categoria "Loja".
// O carrinho é somente o botão externo de acesso.

export const CATEGORIAS_LOJA = [
  {
    id: 'todos',
    nome: 'Todos',
    emoji: '📦'
  },

  {
    id: 'personagens',
    nome: 'Personagens',
    emoji: '🤖'
  },

  {
    id: 'mobilidade',
    nome: 'Mobilidade',
    emoji: '🛹'
  },

  {
    id: 'automotivo',
    nome: 'Automotivo',
    emoji: '🚗'
  },

  {
    id: 'tecnologia',
    nome: 'Tecnologia',
    emoji: '💻'
  },

  {
    id: 'natureza',
    nome: 'Natureza',
    emoji: '🌱'
  }
];

// ======================================================
// API — PERSONAGENS
// ======================================================

export function listarPersonagens() {
  const desbloqueados = state.personagensDesbloqueados || [];

  return PERSONAGENS.map(p => ({
    ...p,

    desbloqueado:
      p.desbloqueadoPorPadrao ||
      desbloqueados.includes(p.id),

    equipado:
      state.personagemAtual === p.id
  }));
}

// ======================================================
// VERIFICAÇÃO DE COMPRA
// ======================================================

export function podeComprar(id) {
  const personagem = PERSONAGENS.find(p => p.id === id);

  if (!personagem) return false;

  if (personagem.desbloqueadoPorPadrao) return false;

  if ((state.personagensDesbloqueados || []).includes(id)) {
    return false;
  }

  return state.dinheiro >= personagem.preco;
}

// ======================================================
// COMPRAR PERSONAGEM
// ======================================================

export function comprarPersonagem(id) {
  const personagem = PERSONAGENS.find(p => p.id === id);

  if (!personagem) {
    return {
      ok: false,
      erro: 'Personagem não encontrado.'
    };
  }

  if (personagem.desbloqueadoPorPadrao) {
    return {
      ok: false,
      erro: 'Este personagem já está disponível.'
    };
  }

  if (!state.personagensDesbloqueados) {
    state.personagensDesbloqueados = [];
  }

  if (state.personagensDesbloqueados.includes(id)) {
    return {
      ok: false,
      erro: 'Personagem já desbloqueado.'
    };
  }

  if (state.dinheiro < personagem.preco) {
    return {
      ok: false,
      erro: `Dinheiro insuficiente. Necessário: R$ ${personagem.preco}.`
    };
  }

  state.dinheiro -= personagem.preco;

  state.personagensDesbloqueados.push(id);

  salvarProgresso();

  return {
    ok: true,
    personagem
  };
}

// ======================================================
// EQUIPAR PERSONAGEM
// ======================================================

export function equiparPersonagem(id) {
  const personagem = PERSONAGENS.find(p => p.id === id);

  if (!personagem) {
    return {
      ok: false,
      erro: 'Personagem não encontrado.'
    };
  }

  const desbloqueado =
    personagem.desbloqueadoPorPadrao ||
    (state.personagensDesbloqueados || []).includes(id);

  if (!desbloqueado) {
    return {
      ok: false,
      erro: 'Personagem não desbloqueado.'
    };
  }

  state.personagemAtual = id;

  salvarProgresso();

  return {
    ok: true,
    personagem
  };
}

// ======================================================
// PERSONAGEM ATUAL
// ======================================================

export function getPersonagemAtual() {
  return PERSONAGENS.find(
    p => p.id === state.personagemAtual
  ) || PERSONAGENS[0];
}

// ======================================================
// API — CATÁLOGO 3D
// ======================================================

export function listarItensLoja(categoria = 'todos') {
  if (categoria === 'todos') {
    return [...ITENS_LOJA];
  }

  return ITENS_LOJA.filter(
    item => item.categoria === categoria
  );
}

// ======================================================
// BUSCAR ITEM
// ======================================================

export function buscarItemLoja(id) {
  return ITENS_LOJA.find(
    item => item.id === id
  ) || null;
}

// ======================================================
// OBTER MODELO 3D
// ======================================================

export function getModeloLoja(id) {
  const item = buscarItemLoja(id);

  return item ? item.modelo3D : null;
}

// ======================================================
// ÍCONE DA LOJA
// ======================================================

// O carrinho agora é um ícone de interface.
// Não existe modelo 3D de carrinho no catálogo.

export function getIconeLoja() {
  return '🛒';
}

// ======================================================
// BUSCAR ITENS
// ======================================================

export function buscarItensLoja(termo = '') {
  const busca = String(termo).trim().toLowerCase();

  if (!busca) {
    return [...ITENS_LOJA];
  }

  return ITENS_LOJA.filter(item =>
    item.nome.toLowerCase().includes(busca) ||
    item.categoria.toLowerCase().includes(busca) ||
    item.descricao.toLowerCase().includes(busca)
  );
}

// ======================================================
// LISTAR CATEGORIAS
// ======================================================

export function listarCategoriasLoja() {
  return CATEGORIAS_LOJA.map(categoria => ({
    ...categoria,

    quantidade:
      categoria.id === 'todos'
        ? ITENS_LOJA.length

        : categoria.id === 'personagens'
          ? PERSONAGENS.length

          : ITENS_LOJA.filter(
              item => item.categoria === categoria.id
            ).length
  }));
}

