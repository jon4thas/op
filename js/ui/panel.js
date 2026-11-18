export function setupPanelToggle() {
  const app      = document.getElementById('app');
  const btnToggle = document.getElementById('btn-toggle-panel');
  const btnShow   = document.getElementById('btn-show-panel');

  if (!app || !btnToggle || !btnShow) {
    console.warn('[PANEL] Elementos do painel não encontrados.');
    return;
  }

  const STORAGE_KEY = 'panel-collapsed';
  let storageWarningShown = false;

  function readPanelState() {
    try { return window.localStorage.getItem(STORAGE_KEY) === 'true'; }
    catch (error) {
      if (!storageWarningShown) console.warn('[PANEL] Storage indisponível:', error.name);
      storageWarningShown = true;
      return false;
    }
  }

  function savePanelState(value) {
    try { window.localStorage.setItem(STORAGE_KEY, String(value)); return true; }
    catch (error) {
      if (!storageWarningShown) console.warn('[PANEL] Não foi possível salvar:', error.name);
      storageWarningShown = true;
      return false;
    }
  }

  function updatePanel(collapsed) {
    app.classList.toggle('panel-collapsed', collapsed);
    btnToggle.title    = collapsed ? 'Mostrar painel' : 'Ocultar painel';
    btnToggle.textContent = collapsed ? '▶' : '◀';
  }

  updatePanel(readPanelState());

  btnToggle.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    const collapsed = !app.classList.contains('panel-collapsed');
    updatePanel(collapsed);
    savePanelState(collapsed);
  });

  btnShow.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    updatePanel(false);
    savePanelState(false);
  });

  console.log('[PANEL] Inicializado.');
}
