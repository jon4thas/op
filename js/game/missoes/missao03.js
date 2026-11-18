export const missao03 = {
  id: 'missao03',
  tipo: 'enem', // O roteador vai usar isso

  titulo: 'ROBOT ARM: Factory Protocol',
  subtitulo: 'Automação Industrial e Lógica Condicional',
  badge: 'Chamado #003',
  
  cliente: 'O braço robótico está colocando todas as peças na caixa principal. O controle de qualidade falhou e o descarte não foi usado.',
  objetivo: 'Analise o cenário e escolha o algoritmo que classifica corretamente as peças boas e defeituosas.',

  // Dados para a simulação 3D (apenas para visual)
  fabrica: {
    totalPecas: 5,
    energiaInicial: 100,
    qualidadeInicial: 100,
    pecas: [
      { id: 1, tipo: 'defeituosa' },
      { id: 2, tipo: 'boa' },
      { id: 3, tipo: 'boa' },
      { id: 4, tipo: 'defeituosa' },
      { id: 5, tipo: 'boa' }
    ],
    regras: { boa: 'caixa', defeituosa: 'descarte' }
  },

  // O Desafio Híbrido (Estilo ENEM)
  questao: {
    enunciado: 'Qual estrutura lógica garante que TODAS as 5 peças sejam processadas e separadas corretamente?',
    alternativas: [
      {
        id: 'A',
        texto: 'REPETIR 1 VEZ: PEGAR -> MOVER PARA CAIXA',
        feedback: 'Você só processou 1 peça e nem olhou se era boa ou ruim. O sistema falhou na esteira.'
      },
      {
        id: 'B',
        texto: 'REPETIR 5 VEZES: PEGAR -> MOVER PARA DESCARTE',
        feedback: 'Você processou as 5 peças, mas mandou as peças boas para o lixo! A qualidade caiu 100%.'
      },
      {
        id: 'C',
        texto: 'REPETIR 5 VEZES: PEGAR -> SE (Peça == Defeituosa) ENTÃO DESCARTE, SENÃO CAIXA',
        feedback: 'Perfeito! Você usou a repetição para as 5 peças e a condição (SE/SENÃO) para classificar corretamente.',
        correta: true
      },
      {
        id: 'D',
        texto: 'REPETIR 5 VEZES: SE (Peça == Defeituosa) ENTÃO DESCARTE, SENÃO CAIXA',
        feedback: 'Quase! Você esqueceu de mandar o robô PEGAR a peça antes de tentar movê-la.'
      }
    ]
  },

  recompensa: { xp: 250, dinheiro: 500 }
};
