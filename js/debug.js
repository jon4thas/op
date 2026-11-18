export function instalarDebug({ THREE, colliders, player, stations, scene, camera, renderer, flow, interaction }) {
  window.__debug = {
    get THREE()     { return THREE; },
    get colliders() { return colliders; },
    get player()    { return player; },
    get stations()  { return stations; },
    get scene()     { return scene; },
    get controls()  { return player.controls; },
    get camera()    { return camera; },
    get renderer()  { return renderer; },
    get flow()      { return flow; },
    get stationFocada() { return interaction.getStationFocada(); },
  };
  console.log('[debug] window.__debug exposto ✅');
}
