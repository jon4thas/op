
export const missao01 = {
  id: 'missao01',

  titulo: 'Operação Sentinel',
  subtitulo: 'Manutenção, diagnóstico e recuperação de sistemas',
  badge: 'INCIDENTE CRÍTICO #001',

  cliente: `
    ALERTA DE PRODUÇÃO:

    O sistema de pedidos da empresa está apresentando
    falhas durante a confirmação de compras.

    Os usuários conseguem acessar a plataforma,
    visualizar produtos e montar seus carrinhos.

    Entretanto, ao confirmar o pedido, o sistema
    retorna uma mensagem de operação não autorizada.

    A equipe de desenvolvimento identificou possíveis
    inconsistências na regra de validação.
  `,

  objetivo: `
    Investigue o incidente, identifique a condição
    lógica responsável pela falha e implemente uma
    regra segura para autorizar o processamento
    dos pedidos.
  `,

  // ==========================================
  // CONTEXTO TÉCNICO
  // ==========================================

  ambiente: {
    sistema: 'Sentinel Commerce',
    versao: '2.8.4',
    modulo: 'Processamento de Pedidos',
    linguagem: 'JavaScript',
    criticidade: 'Alta',

    logs: [
      {
        horario: '09:14:02',
        nivel: 'INFO',
        mensagem: 'Usuário autenticado com sucesso.'
      },
      {
        horario: '09:14:05',
        nivel: 'INFO',
        mensagem: 'Consulta de estoque concluída.'
      },
      {
        horario: '09:14:08',
        nivel: 'WARNING',
        mensagem: 'Validação de pagamento inconsistente.'
      },
      {
        horario: '09:14:09',
        nivel: 'ERROR',
        mensagem: 'Pedido bloqueado pela regra de autorização.'
      }
    ],

    requisitos: [
      'O usuário precisa estar autenticado.',
      'O produto precisa estar disponível no estoque.',
      'O pagamento precisa estar aprovado.',
      'Pedidos bloqueados não podem ser processados.'
    ]
  },

  // ==========================================
  // ETAPA 01 — INVESTIGAÇÃO
  // ==========================================

  hipoteses: [
    {
      id: 'autenticacao',
      label: 'Falha na validação da sessão do usuário.'
    },
    {
      id: 'estoque',
      label: 'Inconsistência na consulta de disponibilidade do estoque.'
    },
    {
      id: 'pagamento',
      label: 'Falha na interpretação do retorno do pagamento.'
    },
    {
      id: 'logica',
      label: 'Erro na expressão lógica responsável pela autorização.'
    }
  ],

  hipoteseCorreta: 'logica',

  // ==========================================
  // ETAPA 02 — PROCEDIMENTOS TÉCNICOS
  // ==========================================

  procedimentos: [
    {
      id: 'analisar_logs',
      label: 'Analisar registros de execução',
      fn: 'analisarLogs'
    },
    {
      id: 'validar_requisitos',
      label: 'Conferir requisitos de autorização',
      fn: 'validarRequisitos'
    },
    {
      id: 'executar_testes',
      label: 'Executar testes de diagnóstico',
      fn: 'executarTestes'
    }
  ],

  // ==========================================
  // ETAPA 03 — MATRIZ DE TESTES
  // ==========================================

  tabela: [
    {
      autenticado: true,
      estoque: true,
      pagamento: true,
      bloqueado: false,
      expected: true
    },
    {
      autenticado: false,
      estoque: true,
      pagamento: true,
      bloqueado: false,
      expected: false
    },
    {
      autenticado: true,
      estoque: false,
      pagamento: true,
      bloqueado: false,
      expected: false
    },
    {
      autenticado: true,
      estoque: true,
      pagamento: false,
      bloqueado: false,
      expected: false
    },
    {
      autenticado: true,
      estoque: true,
      pagamento: true,
      bloqueado: true,
      expected: false
    },
    {
      autenticado: false,
      estoque: false,
      pagamento: true,
      bloqueado: true,
      expected: false
    },
    {
      autenticado: true,
      estoque: false,
      pagamento: false,
      bloqueado: false,
      expected: false
    },
    {
      autenticado: true,
      estoque: true,
      pagamento: false,
      bloqueado: true,
      expected: false
    }
  ],

  // ==========================================
  // ETAPA 04 — REGRA DE NEGÓCIO
  // ==========================================

  expressaoReferencia:
    'autenticado && estoque && pagamento && !bloqueado',

  // ==========================================
  // ETAPA 05 — CONHECIMENTO TÉCNICO
  // ==========================================

  conceitos: [
    {
      titulo: 'AND (&&)',
      descricao: 'Todas as condições precisam ser verdadeiras.'
    },
    {
      titulo: 'OR (||)',
      descricao: 'Pelo menos uma condição precisa ser verdadeira.'
    },
    {
      titulo: 'NOT (!)',
      descricao: 'Inverte o valor lógico de uma condição.'
    },
    {
      titulo: 'Depuração',
      descricao: 'Processo de investigação e correção de defeitos no software.'
    },
    {
      titulo: 'Teste de software',
      descricao: 'Verificação do comportamento da aplicação diante de diferentes entradas.'
    }
  ],

  // ==========================================
  // RECOMPENSA
  // ==========================================

  recompensa: {
    xp: 150,
    dinheiro: 350
  }
};

