// js/game/missoes/missao08.js
// Missão 08 — Segurança de Senha
// Conceito: strings, entropia, análise de força

export const missao08 = {
  id: 'missao08',
  tipo: 'logica',
  titulo: 'Segurança de Senha',
  subtitulo: 'Entropia e boas práticas',
  badge: 'Segurança da Informação',
  cliente:
    'O sistema exige senhas com pelo menos: 12 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo. ' +
    'Qual expressão descreve corretamente a validação?',
  objetivo:
    'Combine verificações de comprimento e classes de caracteres com AND lógico.',
  recompensa: { xp: 250, dinheiro: 550 },
  hipoteseCorreta: 'todas',
  hipoteses: [
    { id: 'todas',    label: 'len>=12 AND tem_maiuscula AND tem_minuscula AND tem_numero AND tem_simbolo' },
    { id: 'qualquer', label: 'len>=12 OR tem_maiuscula OR tem_numero' },
    { id: 'so_len',   label: 'len>=12' }
  ],
  procedimentos: [
    { id: 'verificar_comprimento', label: 'Validar comprimento mínimo' },
    { id: 'verificar_classes',     label: 'Checar classes de caracteres' }
  ],
  tabela: [
    { s1: 1, s2: 1, s3: 1, s4: 1, s5: 1, alarme: 1 },
    { s1: 1, s2: 1, s3: 1, s4: 1, s5: 0, alarme: 0 },
    { s1: 0, s2: 1, s3: 1, s4: 1, s5: 1, alarme: 0 },
    { s1: 1, s2: 0, s3: 1, s4: 1, s5: 1, alarme: 0 },
    { s1: 1, s2: 1, s3: 0, s4: 1, s5: 1, alarme: 0 },
    { s1: 1, s2: 1, s3: 1, s4: 0, s5: 1, alarme: 0 },
    { s1: 1, s2: 1, s3: 1, s4: 1, s5: 1, alarme: 1 },
    { s1: 0, s2: 0, s3: 0, s4: 0, s5: 0, alarme: 0 }
  ],
  expressaoCorreta: ['s1', 'AND', 's2', 'AND', 's3', 'AND', 's4', 'AND', 's5']
};
