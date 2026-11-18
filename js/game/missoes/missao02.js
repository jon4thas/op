export const missao02 = {
  id: 'missao02',
  tipo: 'conversao', // Define a UI
  titulo: 'Desafio 02: Sistema Elétrico',
  subtitulo: 'Sistemas de Numeração e Conversão',
  badge: 'Chamado #002',
  cliente: 'O painel do alternador está exibindo os dados de tensão em hexadecimal, mas a ECU só aceita binário!',
  objetivo: 'Converta os valores de tensão (decimal) para hexadecimal e, em seguida, para binário.',

  // Dados do desafio (UI de Conversão)
  conversao: {
    decimalBase: 12, // Tensão da bateria
    hexCorreto: 'C',
    binCorreto: '1100',
    hexOpcoes: ['A', 'B', 'C', 'D', 'F'],
    binOpcoes: ['1000', '1010', '1100', '1110', '1111']
  },

  recompensa: { xp: 150, dinheiro: 300 }
};
