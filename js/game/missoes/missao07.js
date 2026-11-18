// js/game/missoes/missao07.js
// Missão 07 — Banco de Dados
// Conceito: consulta, indexação, complexidade

export const missao07 = {
  id: 'missao07',
  tipo: 'enem',
  titulo: 'Banco de Dados',
  subtitulo: 'Consultas, índices e complexidade',
  badge: 'Estruturas de Dados',
  cliente:
    'Uma tabela de 1.000.000 de pedidos precisa retornar os 10 pedidos mais recentes de um cliente específico. ' +
    'Sem índice, o banco faz varredura completa (O(n)). Com índice no campo `cliente_id`, a busca ' +
    'fica O(log n). Qual abordagem é correta?',
  recompensa: { xp: 220, dinheiro: 500 },
  questao: {
    enunciado:
      'Considere uma tabela com 1.000.000 de linhas. Qual é a complexidade de uma busca por índice em árvore B?',
    alternativas: [
      {
        id: 'A',
        texto: 'O(1) — acesso direto por posição',
        correta: false,
        feedback: 'O(1) acontece em hash tables com poucas colisões, não em índices B-tree.'
      },
      {
        id: 'B',
        texto: 'O(log n) — árvore B divide o espaço de busca',
        correta: true,
        feedback: 'Correto! Índices B-tree percorrem ~log₂(n) nós, ~20 passos para 1M de linhas.'
      },
      {
        id: 'C',
        texto: 'O(n) — precisa varrer todas as linhas',
        correta: false,
        feedback: 'Isso é justamente o que o índice elimina. Sem índice seria O(n).'
      },
      {
        id: 'D',
        texto: 'O(n²) — para cada linha, olha todas as outras',
        correta: false,
        feedback: 'O(n²) é de algoritmos de ordenação ingênuos, não de busca com índice.'
      }
    ]
  },
  fabrica: {
    totalPecas: 100          // reutiliza o campo pra UI não quebrar
  }
};
