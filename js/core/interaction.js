
import { flow, FASE } from '../game/flow.js';
import { getMissao } from '../game/missoes/index.js';
import { mostrarToast } from '../ui/toast.js';

export function setupInteraction({
  player,
  stations,
  interactionDistance = 10
}) {
  const prompt = document.getElementById('interaction-prompt');

  let stationFocada = null;

  // Aceita tanto um array quanto o objeto retornado pelo módulo
  // de estações, desde que contenha a propriedade stations.
  const listaEstacoes = Array.isArray(stations)
    ? stations
    : Array.isArray(stations?.stations)
      ? stations.stations
      : [];

  function atualizar() {
    if (!player?.mesh?.position) {
      stationFocada = null;

      if (prompt) prompt.style.display = 'none';

      return;
    }

    const p = player.mesh.position;

    let maisProxima = null;
    let menorDist = Infinity;

    for (const st of listaEstacoes) {
      if (!st?.visible) continue;

      // Contrato oficial das estações.
      if (
        st.userData?.type !== 'station' ||
        !st.userData?.id
      ) {
        continue;
      }

      if (!st.position) continue;

      const dx = st.position.x - p.x;
      const dz = st.position.z - p.z;

      const distancia = Math.hypot(dx, dz);

      if (
        distancia < interactionDistance &&
        distancia < menorDist
      ) {
        menorDist = distancia;
        maisProxima = st;
      }
    }

    stationFocada = maisProxima;

    if (!prompt) return;

    if (stationFocada) {
      prompt.style.display = 'block';
      prompt.innerText =
        `[E] Iniciar: ${stationFocada.userData.title || 'Missão'}`;
    } else {
      prompt.style.display = 'none';
    }
  }

  function iniciarInteracao(e) {
    if (e.code !== 'KeyE' || e.repeat) return;

    if (flow.fase !== FASE.WORKSHOP) return;

    if (!stationFocada?.userData?.id) return;

    const idMissao = stationFocada.userData.id;

    const missao = getMissao(idMissao);

    if (!missao) {
      mostrarToast(
        stationFocada.userData.subtitle || 'Missão indisponível',
        3000
      );
      return;
    }

    window.OZ?.iniciarMissao?.(idMissao);
  }

  document.addEventListener('keydown', iniciarInteracao);

  return {
    atualizar,

    getStationFocada: () => stationFocada,

    destruir() {
      document.removeEventListener('keydown', iniciarInteracao);

      stationFocada = null;

      if (prompt) prompt.style.display = 'none';
    }
  };
}

