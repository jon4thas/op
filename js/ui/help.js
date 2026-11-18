export function setupHelpHUD() {
  const btnHelp    = document.getElementById('btn-help');
  const helpModal  = document.getElementById('help-modal');
  const btnClose   = document.getElementById('btn-close-help');

  if (!btnHelp || !helpModal) return;

  btnHelp.addEventListener('click', () => { helpModal.style.display = 'block'; });
  if (btnClose) btnClose.addEventListener('click', () => { helpModal.style.display = 'none'; });
}
