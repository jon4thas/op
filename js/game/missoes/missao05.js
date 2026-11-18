export const missao05 = {
  id: 'missao05',
  titulo: 'Sistema de Partida',
  subtitulo: 'Motor de arranque e ignição',
  badge: 'Chamado #005',
  cliente: 'Ao virar a chave, o motor faz um clique e não pega.',
  objetivo: 'Teste o motor de arranque e monte a lógica de ignição.',

  hipoteses: [
    { id: 'arranque', label: 'Motor de arranque travado' },
    { id: 'ignicao', label: 'Bobina de ignição com falha' },
    { id: 'chave', label: 'Chave de ignição desgastada' },
    { id: 'combustivel', label: 'Falta de combustível' }
  ],
  hipoteseCorreta: 'arranque',

  procedimentos: [
    { id: 'reconectar_sensor', label: 'Reconectar Sensor', fn: 'reconectarSensor' },
    { id: 'desligar_alarme', label: 'Desligar Alarme', fn: 'desligarAlarme' }
  ],

  tabela: [
    { batOK: false, freio: false, marcha: 'P', alarme: false, expected: false },
    { batOK: false, freio: true,  marcha: 'P', alarme: false, expected: false },
    { batOK: true,  freio: false, marcha: 'P', alarme: false, expected: false },
    { batOK: true,  freio: true,  marcha: 'P', alarme: false, expected: true  },
    { batOK: true,  freio: true,  marcha: 'N', alarme: false, expected: true  },
    { batOK: true,  freio: true,  marcha: 'P', alarme: true,  expected: false },
    { batOK: true,  freio: true,  marcha: 'D', alarme: false, expected: false },
    { batOK: false, freio: false, marcha: 'N', alarme: true,  expected: false }
  ],

  expressaoReferencia: 'bateria >= 12.0 && freio && (marcha === "P" || marcha === "N") && !alarme',
  recompensa: { xp: 300, dinheiro: 700 }
};
