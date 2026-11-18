// js/game/input.js
let inputAtivo = null;

export function setupInput(domElement) {
  if (inputAtivo) return inputAtivo;

  const keys = new Set();
  const edges = {
    jump: false,
    interact: false,
  };

  function onKeyDown(e) {
    if (e.repeat) return;
    const k = e.key.toLowerCase();

    if (k === ' ') { edges.jump = true; e.preventDefault(); }
    if (k === 'e') { edges.interact = true; }

    keys.add(k);
  }

  function onKeyUp(e) {
    keys.delete(e.key.toLowerCase());
  }

  function onBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);

  const input = {
    keys,
    consumeJump()     { const v = edges.jump;     edges.jump = false;     return v; },
    consumeInteract() { const v = edges.interact; edges.interact = false; return v; },
    destruir() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);

      keys.clear();
      edges.jump = false;
      edges.interact = false;

      if (inputAtivo === input) inputAtivo = null;
    },
  };

  inputAtivo = input;
  return input;
}
