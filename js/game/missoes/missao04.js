export const missao04 = {
  id: 'missao04',
  titulo: 'Sistema de Freios',
  subtitulo: 'Freio, ABS e segurança veicular',
  badge: 'Chamado #004',
  cliente: 'O pedal do freio está esponjoso e a luz do ABS está acesa.',
  objetivo: 'Diagnostique o sistema de freio e monte a lógica de segurança.',

  hipoteses: [
    { id: 'fluido', label: 'Fluido de freio baixo' },
    { id: 'pastilha', label: 'Pastilha desgastada' },
    { id: 'disco', label: 'Disco empenado' },
    { id: 'abs', label: 'Módulo ABS com falha' }
  ],
  hipoteseCorreta: 'fluido',

  procedimentos: [
    { id: 'reconectar_sensor', label: 'Reconectar Sensor ABS', fn: 'reconectarSensor' },
    { id: 'desligar_alarme', label: 'Resetar Alarme', fn: 'desligarAlarme' }
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
  recompensa: { xp: 250, dinheiro: 550 }
};
