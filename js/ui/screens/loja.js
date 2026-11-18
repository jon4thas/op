import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { state }               from '../../game/state.js';
import { listarPersonagens, listarItensLoja, CATEGORIAS_LOJA } from '../../game/shop.js';
import { overlay }             from './helpers.js';

// ======================================================
// ESTADO INTERNO
// ======================================================
let categoriaLojaAtiva  = 'todos';
let itemLojaSelecionado = null;
let lojaLoadToken       = 0;

const lojaViewer = {
  scene: null, camera: null, renderer: null, controls: null, loader: null,
  model: null, animationId: null, resizeObserver: null
};

export const getCategoriaLojaAtiva  = () => categoriaLojaAtiva;
export const setCategoriaLojaAtiva  = (v) => { categoriaLojaAtiva = v; };
export const getItemLojaSelecionado = () => itemLojaSelecionado;
export const setItemLojaSelecionado = (v) => { itemLojaSelecionado = v; };

// ======================================================
// CATEGORIAS DE EXIBIÇÃO (mescla com CATEGORIAS_LOJA)
// ======================================================
const CATEGORIAS_DISPLAY = [
  { id: 'todos',        nome: 'TODOS',        ascii: 'ALL',   emoji: '◈' },
  { id: 'personagens',  nome: 'PERSONAGENS',  ascii: 'CHAR',  emoji: '◉' },
  { id: 'vestuario',    nome: 'VESTUÁRIO',    ascii: 'GEAR',  emoji: '◈' },
  { id: 'cenario',      nome: 'CENÁRIO',      ascii: 'WORLD', emoji: '◈' },
  { id: 'natureza',     nome: 'NATUREZA',     ascii: 'WILD',  emoji: '◈' },
  { id: 'arquitetura',  nome: 'ARQUITETURA',  ascii: 'ARCH',  emoji: '◈' },
  { id: 'habilidades',  nome: 'HABILIDADES',  ascii: 'SKILL', emoji: '◈' },
  { id: 'equipamentos', nome: 'EQUIPAMENTOS', ascii: 'EQUIP', emoji: '◈' },
  { id: 'partes',       nome: 'PARTES',       ascii: 'PARTS', emoji: '◈' },
];

const _idsCategorias = new Set(CATEGORIAS_DISPLAY.map(c => c.id));
const _categoriasExtras = (CATEGORIAS_LOJA || [])
  .filter(c => c.id !== 'loja' && !_idsCategorias.has(c.id))
  .map(c => ({
    id:    c.id,
    nome:  (c.nome || c.id || '').toString().toUpperCase(),
    ascii: (c.id   || 'CAT').toString().slice(0, 5).toUpperCase(),
    emoji: c.emoji || '◈'
  }));
const CATEGORIAS = [...CATEGORIAS_DISPLAY, ..._categoriasExtras];

// ======================================================
// HELPERS
// ======================================================
function filtrarLoja(items) {
  return (items || []).filter(i => i.id !== 'loja' && i.nome?.toLowerCase() !== 'loja');
}
function listarItensSeguro(catId) {
  try { return filtrarLoja(listarItensLoja(catId)); }
  catch { return []; }
}
function contarItens(catId) {
  if (catId === 'personagens') return listarPersonagens().length;
  return listarItensSeguro(catId).length;
}

// ======================================================
// LIMPEZA
// ======================================================
function liberarRecursosModelo(model) {
  if (!model) return;
  const geoms = new Set(), mats = new Set(), texs = new Set();
  model.traverse(obj => {
    if (obj.geometry) geoms.add(obj.geometry);
    if (!obj.material) return;
    const lista = Array.isArray(obj.material) ? obj.material : [obj.material];
    lista.forEach(mat => {
      mats.add(mat);
      Object.values(mat).forEach(v => { if (v && v.isTexture) texs.add(v); });
    });
  });
  geoms.forEach(g => g.dispose());
  texs.forEach(t => t.dispose());
  mats.forEach(m => m.dispose());
}
function liberarModeloLoja() {
  if (!lojaViewer.model) return;
  if (lojaViewer.model.parent) lojaViewer.model.parent.remove(lojaViewer.model);
  liberarRecursosModelo(lojaViewer.model);
  lojaViewer.model = null;
}

export function destruirViewerLoja() {
  lojaLoadToken++;
  if (lojaViewer.animationId !== null) cancelAnimationFrame(lojaViewer.animationId);
  if (lojaViewer.resizeObserver) lojaViewer.resizeObserver.disconnect();
  liberarModeloLoja();
  if (lojaViewer.controls) lojaViewer.controls.dispose();
  if (lojaViewer.renderer) {
    lojaViewer.renderer.dispose();
    if (lojaViewer.renderer.domElement.parentNode)
      lojaViewer.renderer.domElement.parentNode.removeChild(lojaViewer.renderer.domElement);
  }
  lojaViewer.scene = lojaViewer.camera = lojaViewer.renderer = null;
  lojaViewer.controls = lojaViewer.loader = lojaViewer.model = null;
  lojaViewer.animationId = lojaViewer.resizeObserver = null;
}

// ======================================================
// VIEWER 3D (dentro do popup)
// ======================================================
export function iniciarViewerLoja() {
  const container = document.getElementById('loja-viewer');
  if (!container) return;
  const modal = document.getElementById('loja-viewer-modal');
  if (modal && !modal.classList.contains('open')) return;
  if (lojaViewer.renderer) return;

  const width  = Math.max(container.clientWidth,  320);
  const height = Math.max(container.clientHeight, 300);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1f14);

  const camera = new THREE.PerspectiveCamera(40, width / height, 0.01, 1000);
  camera.position.set(4, 3, 5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace    = THREE.SRGBColorSpace;
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width   = '100%';
  renderer.domElement.style.height  = '100%';
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.06;
  controls.enablePan = false; controls.minDistance = 1; controls.maxDistance = 15;

  scene.add(new THREE.AmbientLight(0xffffff, 1.8));
  const luzPrincipal = new THREE.DirectionalLight(0xffffff, 3); luzPrincipal.position.set(5, 8, 5); scene.add(luzPrincipal);
  const luzPreenchimento = new THREE.DirectionalLight(0x8abaff, 1.4); luzPreenchimento.position.set(-5, 3, -4); scene.add(luzPreenchimento);
  const grid = new THREE.GridHelper(8, 16, 0x1c6644, 0x0e3322); grid.position.y = -1.55; scene.add(grid);

  lojaViewer.scene = scene; lojaViewer.camera = camera;
  lojaViewer.renderer = renderer; lojaViewer.controls = controls;
  lojaViewer.loader = new GLTFLoader();

  function animar() {
    if (lojaViewer.renderer !== renderer) return;
    lojaViewer.animationId = requestAnimationFrame(animar);
    controls.update(); renderer.render(scene, camera);
  }
  animar();

  if (typeof ResizeObserver !== 'undefined') {
    lojaViewer.resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    lojaViewer.resizeObserver.observe(container);
  }

  if (itemLojaSelecionado) carregarModeloLoja(itemLojaSelecionado);
}

export function carregarModeloLoja(id) {
  if (!id) return;
  const item = listarItensLoja().find(i => i.id === id);
  if (!item || !lojaViewer.loader || !lojaViewer.scene) return;

  const token = ++lojaLoadToken;
  liberarModeloLoja();
  const status = document.getElementById('loja-model-status');
  if (status) status.textContent = `// carregando: ${item.nome}...`;

  lojaViewer.loader.load(item.modelo3D, gltf => {
    if (token !== lojaLoadToken || !lojaViewer.scene) { liberarRecursosModelo(gltf.scene); return; }

    const model = gltf.scene; model.updateMatrixWorld(true);
    const boxOriginal = new THREE.Box3().setFromObject(model);
    const size = boxOriginal.getSize(new THREE.Vector3());
    const center = boxOriginal.getCenter(new THREE.Vector3());
    const maiorDimensao = Math.max(size.x, size.y, size.z);

    if (!Number.isFinite(maiorDimensao) || maiorDimensao <= 0) {
      if (status) status.textContent = '// modelo_3d_inválido_ou_vazio';
      liberarRecursosModelo(model); return;
    }

    model.position.sub(center);
    model.scale.multiplyScalar(3 / maiorDimensao);
    model.updateMatrixWorld(true);

    lojaViewer.scene.add(model);
    lojaViewer.model = model;

    const boxFinal = new THREE.Box3().setFromObject(model);
    const esfera   = boxFinal.getBoundingSphere(new THREE.Sphere());
    const raio     = Math.max(esfera.radius, 0.5);
    const dist     = raio / Math.sin(THREE.MathUtils.degToRad(lojaViewer.camera.fov / 2));

    lojaViewer.camera.position.set(
      esfera.center.x + dist * 0.9,
      esfera.center.y + dist * 0.65,
      esfera.center.z + dist * 1.1
    );
    lojaViewer.camera.near = Math.max(0.01, dist / 100);
    lojaViewer.camera.far  = dist * 100;
    lojaViewer.camera.updateProjectionMatrix();

    lojaViewer.controls.target.copy(esfera.center);
    lojaViewer.controls.minDistance = raio * 1.2;
    lojaViewer.controls.maxDistance = raio * 8;
    lojaViewer.controls.update();

    if (status) status.textContent = `// ${item.nome} :: carregado :: arraste_para_girar`;
  }, undefined, () => {
    if (token !== lojaLoadToken) return;
    if (status) status.textContent = `// falha_ao_carregar: ${item.nome}.glb`;
  });
}

// ======================================================
// POPUP  (modal vive em document.body — escapa de overflow/z-index)
// ======================================================
export function abrirViewerLoja(id) {
  const modal = document.getElementById('loja-viewer-modal');
  if (!modal) return;
  itemLojaSelecionado = id;
  modal.classList.add('open');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!lojaViewer.renderer) iniciarViewerLoja();
    else carregarModeloLoja(id);
  }));
}

export function fecharViewerLoja() {
  const modal = document.getElementById('loja-viewer-modal');
  if (modal) modal.classList.remove('open');
  destruirViewerLoja();
}

// Cria o modal uma única vez por render, direto no <body>
function criarModalViewer() {
  const antigo = document.getElementById('loja-viewer-modal');
  if (antigo) antigo.remove();

  const modal = document.createElement('div');
  modal.id = 'loja-viewer-modal';
  modal.className = 'loja-modal';
  modal.innerHTML = `
    <div class="loja-modal-backdrop"></div>
    <div class="loja-modal-panel">
      <div class="loja-modal-head">
        <span class="loja-modal-head-title">◤ VISUALIZADOR_3D ◢</span>
        <button type="button" class="loja-modal-close" data-loja-fechar>[X] FECHAR</button>
      </div>
      <div id="loja-viewer"></div>
      <div id="loja-model-status">// aguardando_seleção</div>
    </div>
  `;

  const backdrop = modal.querySelector('.loja-modal-backdrop');
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) fecharViewerLoja();
  });

  modal.querySelectorAll('[data-loja-fechar]').forEach(btn => {
    if (btn.classList.contains('loja-modal-backdrop')) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fecharViewerLoja();
    });
  });

  document.body.appendChild(modal);

  if (!window.__lojaEscBind) {
    window.__lojaEscBind = true;
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const m = document.getElementById('loja-viewer-modal');
      if (m && m.classList.contains('open')) {
        e.preventDefault();
        fecharViewerLoja();
      }
    }, true);
  }
}

// ======================================================
// ESTILOS (injetados uma única vez)
// ======================================================
function injetarEstilosLoja() {
  if (document.getElementById('loja-hacker-styles')) return;
  const el = document.createElement('style');
  el.id = 'loja-hacker-styles';
  el.textContent = `
    @keyframes loja-rainbow {
      0%   { color:#00ff88; text-shadow:0 0 8px #00ff88, 0 0 18px #00ff8866; }
      25%  { color:#00ddff; text-shadow:0 0 8px #00ddff, 0 0 18px #00ddff66; }
      50%  { color:#aa55ff; text-shadow:0 0 8px #aa55ff, 0 0 18px #aa55ff66; }
      75%  { color:#ff5588; text-shadow:0 0 8px #ff5588, 0 0 18px #ff558866; }
      100% { color:#00ff88; text-shadow:0 0 8px #00ff88, 0 0 18px #00ff8866; }
    }
    @keyframes loja-blink { 0%,49%{opacity:1;} 50%,100%{opacity:0;} }
    @keyframes loja-scan {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(220%); }
    }
    @keyframes loja-pulse {
      0%,100% { box-shadow:0 0 10px #00ff8855, inset 0 0 10px #00ff8822; }
      50%     { box-shadow:0 0 30px #00ff88aa, inset 0 0 25px #00ff8844; }
    }

    .loja-hacker, .loja-hacker * {
      font-family:'Courier New','Consolas',ui-monospace,monospace !important;
    }
    .loja-hacker {
      letter-spacing:.5px;
      color:#d4ffe0;
      background:#0a1a10;
      position:relative;
    }
    .loja-hacker > * { position:relative; z-index:2; }
    .loja-hacker::before {
      content:'';
      position:absolute; inset:0;
      pointer-events:none; z-index:3;
      background: repeating-linear-gradient(
        to bottom,
        rgba(0,255,136,0)   0px,
        rgba(0,255,136,0)   2px,
        rgba(0,255,136,.03) 3px,
        rgba(0,255,136,0)   4px
      );
    }
    .loja-hacker h1, .loja-hacker h2, .loja-hacker h3 {
      animation:loja-rainbow 8s linear infinite;
    }

    .loja-btn {
      font-family:inherit; background:transparent; color:#9dffc5;
      border:1px solid #00ff88; padding:8px 14px; cursor:pointer;
      transition:all .2s; text-shadow:0 0 6px #00ff8888;
      font-size:12px; letter-spacing:1px;
    }
    .loja-btn:hover:not(:disabled) {
      background:#00ff8822;
      box-shadow:0 0 15px #00ff8877, inset 0 0 10px #00ff8833;
    }
    .loja-btn.active {
      background:#00ff8844;
      box-shadow:0 0 20px #00ff88aa, inset 0 0 15px #00ff8844;
      color:#e0fff0;
    }
    .loja-btn:disabled { opacity:.35; cursor:not-allowed; }

    .loja-cat-grid { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }

    .loja-wallet {
      display:flex; justify-content:space-between; align-items:center;
      padding:16px 24px;
      border:1px solid #00ff88;
      background:linear-gradient(90deg,#00ff8822,#00ff8808);
      animation:loja-pulse 3s ease-in-out infinite;
      margin-bottom:20px;
      position:relative; overflow:hidden;
    }
    .loja-wallet::after {
      content:''; position:absolute; top:0; left:0;
      width:60%; height:100%;
      background:linear-gradient(90deg,transparent,#00ff8822,transparent);
      animation:loja-scan 3.5s linear infinite;
    }
    .loja-wallet-label { font-size:12px; color:#7cffb0; letter-spacing:3px; }
    .loja-wallet-sub   { font-size:10px; opacity:.55; margin-top:4px; }
    .loja-wallet-value {
      font-size:28px; font-weight:bold; letter-spacing:2px;
      animation:loja-rainbow 5s linear infinite;
      position:relative; z-index:2;
    }

    .loja-items-grid {
      display:grid;
      grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
      gap:12px; margin-bottom:24px;
    }
    .loja-card {
      background:linear-gradient(180deg,#0d2016cc,#0a1a10cc);
      border:1px solid #00ff8833;
      padding:14px; cursor:pointer;
      transition:all .2s;
      position:relative; color:inherit;
    }
    .loja-card:hover {
      border-color:#00ff88;
      box-shadow:0 0 20px #00ff8855, inset 0 0 20px #00ff8811;
      transform:translateY(-2px);
    }
    .loja-card::before {
      content:'▸'; position:absolute; left:4px; top:4px;
      color:#00ff88; opacity:.5; font-size:10px;
    }
    .loja-card.non-clickable { cursor:default; }

    .loja-modal {
      position:fixed; inset:0; z-index:10000;
      display:none; align-items:center; justify-content:center;
    }
    .loja-modal.open { display:flex; pointer-events:auto; }
    .loja-modal-backdrop {
      position:absolute; inset:0;
      background:rgba(8,25,15,.82);
      backdrop-filter:blur(4px);
    }
    .loja-modal-panel {
      position:relative;
      width:min(92vw,900px); height:min(88vh,750px);
      display:flex; flex-direction:column;
      background:#0a1a10;
      border:2px solid #00ff88;
      box-shadow:0 0 60px #00ff8899, inset 0 0 40px #00ff8822;
      pointer-events:auto;
    }
    .loja-modal-head {
      display:flex; justify-content:space-between; align-items:center;
      padding:10px 16px; border-bottom:1px solid #00ff8844;
    }
    .loja-modal-head-title {
      animation:loja-rainbow 6s linear infinite;
      font-weight:bold; letter-spacing:2px;
    }
    .loja-modal-close {
      background:transparent; border:1px solid #ff3388;
      color:#ff77aa; padding:6px 14px; cursor:pointer;
      font-family:inherit; transition:all .2s;
      pointer-events:auto; font-size:12px; letter-spacing:1px;
    }
    .loja-modal-close:hover {
      background:#ff338833; box-shadow:0 0 15px #ff338888;
    }
    #loja-viewer {
      flex:1; min-height:0; position:relative; background:#0d1f14;
    }
    #loja-model-status {
      padding:10px 16px; border-top:1px solid #00ff8844;
      font-size:12px; color:#7cffb0;
    }
  `;
  document.head.appendChild(el);
}

// ======================================================
// RENDER
// ======================================================
export function renderLoja() {
  const root = overlay();
  if (!root) return;

  injetarEstilosLoja();

  // ── Limpa modal/estado anterior ─────────────
  const modalAntigo = document.getElementById('loja-viewer-modal');
  if (modalAntigo) {
    if (modalAntigo.classList.contains('open')) destruirViewerLoja();
    modalAntigo.remove();
  }
  destruirViewerLoja();

  const personagens = listarPersonagens();
  const saldo       = state.dinheiro;

  const todosItens = listarItensSeguro('todos');
  const mostrarPersonagens = categoriaLojaAtiva === 'todos' || categoriaLojaAtiva === 'personagens';
  const mostrarItens       = categoriaLojaAtiva !== 'personagens';

  let itens = [];
  if (categoriaLojaAtiva === 'todos') itens = todosItens;
  else if (categoriaLojaAtiva !== 'personagens') itens = listarItensSeguro(categoriaLojaAtiva);

  const categorias = CATEGORIAS.map(c => {
    const qtd = c.id === 'todos'
      ? personagens.length + todosItens.length
      : contarItens(c.id);
    return { ...c, quantidade: qtd };
  });

  const botoesCategorias = categorias.map(c => {
    const ativo = categoriaLojaAtiva === c.id;
    const vazia = c.quantidade === 0 && c.id !== 'todos';
    return `<button
      class="loja-btn ${ativo ? 'active' : ''}"
      data-categoria-loja="${c.id}"
      ${vazia ? 'style="opacity:.35;"' : ''}
    >[${c.ascii}:${c.quantidade}]</button>`;
  }).join('');

  const cardsPersonagens = mostrarPersonagens ? personagens.map(p => {
    const ehYBot = p.id?.toLowerCase() === 'ybot';
    const habilidade = ehYBot ? 'Elucubrações Inexequíveis · Criador de Mundos' : p.habilidade;
    const descricao  = ehYBot ? 'Transforma ideias impossíveis em mundos, cenários e possibilidades.' : p.descricao;
    const podePagar  = saldo >= p.preco;
    let acao;
    if (p.equipado)
      acao = `<button class="loja-btn" style="width:100%;" disabled>✓ PERSONAGEM_ATUAL</button>`;
    else if (p.desbloqueado)
      acao = `<button class="loja-btn" style="width:100%;" onclick="event.stopPropagation();window.OZ.equiparPersonagem('${p.id}')">▸ EQUIPAR</button>`;
    else
      acao = `<button class="loja-btn" style="width:100%;" ${podePagar ? '' : 'disabled'} onclick="event.stopPropagation();window.OZ.comprarPersonagem('${p.id}')">$ COMPRAR · R$ ${p.preco}</button>`;

    return `
      <div class="loja-card non-clickable" style="${p.equipado ? 'border-color:#00ff88;box-shadow:0 0 15px #00ff8855;' : ''}">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <div style="font-size:32px;">${p.emoji}</div>
          <div>
            <div style="font-weight:bold; color:#9dffc5;">${p.nome}</div>
            <div style="font-size:10px; color:#00ff88; opacity:.7;">${habilidade}</div>
          </div>
        </div>
        <div style="font-size:12px; color:#9dffc5aa; margin-bottom:12px; min-height:48px;">${descricao}</div>
        ${acao}
      </div>`;
  }).join('') : '';

  const cardsItens = mostrarItens ? itens.map(item => {
    const sel = itemLojaSelecionado === item.id;
    const avisoCarro = item.requerTodasPartes ? `
      <div style="
        margin-bottom:10px; padding:6px;
        border:1px dashed #ffaa33; color:#ffcc66;
        background:#ffaa3311; font-size:10px;
        letter-spacing:1px; text-align:center; line-height:1.4;
      ">
        ⚠ REQUER TODAS AS PARTES:<br>
        MOTOR · FREIO · BATERIA · ALTERNADOR · PEDAIS ·
        PAINEL · CÂMBIO · CHAVE · MULTIMÍDIA
      </div>` : '';

    return `
      <div class="loja-card" data-item-loja="${item.id}" role="button" tabindex="0" aria-pressed="${sel}"
           style="${sel ? 'border-color:#00ff88;box-shadow:0 0 20px #00ff8866;' : ''}">
        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
          <div style="font-size:28px;">${item.emoji || '◈'}</div>
          <div style="min-width:0;">
            <div style="font-weight:bold; color:#9dffc5;">${item.nome}</div>
            <div style="font-size:10px; color:#00ff88; opacity:.7;">[${item.categoria || '—'}]</div>
          </div>
        </div>
        <div style="font-size:12px; color:#9dffc5aa; margin-bottom:12px; min-height:36px;">${item.descricao || ''}</div>
        ${avisoCarro}
        <div style="font-size:10px; color:#00ff88; text-align:center; padding:6px; border:1px dashed #00ff8844; letter-spacing:1px;">
          ▸ CLIQUE_PARA_VISUALIZAR_3D
        </div>
      </div>`;
  }).join('') : '';

  root.innerHTML = `
    <div class="screen wide loja-hacker">
      <div class="screen-header">
        <h1>◤ MERCADO_DE_IDEIAS :: TERMINAL_v3.7 ◢</h1>
      </div>
      <div class="screen-body" style="max-height:70vh; overflow-y:auto;">
        <div class="loja-wallet">
          <div>
            <div class="loja-wallet-label">◤ CARTEIRA_DIGITAL ◢</div>
            <div class="loja-wallet-sub">// fundos_para_implementação_de_ideias</div>
          </div>
          <div class="loja-wallet-value">R$ ${saldo.toLocaleString('pt-BR')}</div>
        </div>

        <h2 style="margin:12px 0;">▸ FILTRAR_CATEGORIAS</h2>
        <div class="loja-cat-grid">${botoesCategorias}</div>

        ${mostrarPersonagens ? `
          <h3 style="margin:24px 0 12px;">▸ PERSONAGENS</h3>
          <div class="loja-items-grid">${cardsPersonagens}</div>
        ` : ''}

        ${mostrarItens ? `
          <h3 style="margin:24px 0 12px;">▸ MODELOS_E_EQUIPAMENTOS</h3>
          <div class="loja-items-grid">${cardsItens || '<p style="color:#9dffc5aa;">// nenhum item nesta categoria</p>'}</div>
        ` : ''}
      </div>
      <div class="screen-footer">
        <button class="loja-btn" onclick="window.OZ.fecharLoja()">[X] FECHAR_TERMINAL</button>
      </div>
    </div>
  `;

  // ── Bind categorias ─────────────────────────
  root.querySelectorAll('[data-categoria-loja]').forEach(btn => {
    btn.addEventListener('click', () => {
      categoriaLojaAtiva = btn.dataset.categoriaLoja;
      renderLoja();
    });
  });

  // ── Bind itens → popup ──────────────────────
  root.querySelectorAll('[data-item-loja]').forEach(card => {
    const abrir = () => abrirViewerLoja(card.dataset.itemLoja);
    card.addEventListener('click', abrir);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); }
    });
  });

  // ── Cria o modal desta renderização (vai para <body>) ──
  criarModalViewer();
}

// ======================================================
// EXPOE API NO window.OZ (idempotente)
// ======================================================
if (typeof window !== 'undefined') {
  window.OZ = window.OZ || {};
  window.OZ.abrirViewerLoja  = abrirViewerLoja;
  window.OZ.fecharViewerLoja = fecharViewerLoja;
}
