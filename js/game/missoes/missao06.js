// js/game/missoes/missao06.js
// Missão 06 — Conversor de Unidades (Lei de Ohm)
// Conceito: proporção, regra de três, unidades elétricas V/A/Ω

export const missao06 = {
  id: 'missao06',
  tipo: 'conversao',
  titulo: 'Conversor de Unidades',
  subtitulo: 'Lei de Ohm · V = R · I',
  badge: 'Grandezas Elétricas',
  cliente:
    'Um técnico mediu 12 V no resistor e 0,5 A de corrente. Precisamos da resistência em ohms (Ω), ' +
    'da potência em watts (P = V · I) e da conversão para notação de engenharia.',
  objetivo: 'Converta 0,5 A para miliamperes (mA) e calcule a resistência (Ω) usando V = R·I.',
  recompensa: { xp: 200, dinheiro: 450 },
  conversao: {
    decimalBase: 500,          // 500 mA
    hexOpcoes: ['1F4', '2B4', '500', '1E4'],
    hexCorreto: '1F4',
    binOpcoes: ['111110100', '101010', '110010', '111111111'],
    binCorreto: '111110100'
  },
  // campos extras que o avaliador da missão 06 pode checar
  calculos: {
    resistencia: 24,           // 12 / 0.5
    potencia: 6                // 12 * 0.5
  }
};
