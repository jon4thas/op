export function mostrarToast(msg, duration = 2500) {
  const el = document.getElementById('hint');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), duration);
}
