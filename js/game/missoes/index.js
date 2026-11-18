// ======================================================
// js/game/missoes/index.js
// Registro central de todas as missões
// ======================================================

import { missao01 } from './missao01.js';

// ======================================================
// MAPA DE MISSÕES
// ======================================================
export const MISSOES = {
  missao01
};

// ======================================================
// RESOLVEDOR
// Retorna a missão pelo ID, ou null se não existir.
// ======================================================
export function getMissao(id) {
  if (!id) return null;
  return MISSOES[id] || null;
}

// ======================================================
// LISTAR TODAS (útil para menus / debug)
// ======================================================
export function listarMissoes() {
  return Object.values(MISSOES);
}
