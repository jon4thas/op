export const overlay = () => document.getElementById('screens-overlay');

export const setHTML = (id, html) => {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
};

export const setText = (id, txt) => {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
};

export const setDisplay = (id, display) => {
  const el = document.getElementById(id);
  if (el) el.style.display = display;
};
