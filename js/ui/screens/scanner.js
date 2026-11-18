import { state }     from '../../game/state.js';
import { renderScreens } from '../screens.js';

export function abrirScanner(tipo) {
  if (tipo === 'analisar_logs') {
    state.evidencias.push({ label: 'Logs', valor: '4 eventos analisados', cls: 'ok' });
  } else if (tipo === 'validar_requisitos') {
    state.evidencias.push({ label: 'Requisitos', valor: '4 verificados', cls: 'ok' });
  } else if (tipo === 'executar_testes') {
    state.evidencias.push({ label: 'Testes', valor: '8 casos executados', cls: 'ok' });
  }
  if (tipo === 'bateria' || tipo === 'carregar_bateria')
    state.evidencias.push({ label: 'Bateria', valor: (state.fisico?.bateria ?? '?') + 'V', cls: 'ok' });
  if (tipo === 'sensor_freio' || tipo === 'reconectar_sensor')
    state.evidencias.push({ label: 'Freio', valor: 'Divergência', cls: 'err' });
  if (tipo === 'alarme' || tipo === 'desligar_alarme')
    state.evidencias.push({ label: 'Alarme', valor: 'Disparado', cls: 'err' });

  renderScreens();
}
