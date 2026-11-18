export const FASE = {
  MENU: 'menu',
  WORKSHOP: 'workshop',
  RECEPCAO: 'recepcao',
  DESAFIO: 'desafio',
  RESULTADO: 'resultado',
  LOJA: 'loja'
};

const ORDEM = [
  FASE.MENU,
  FASE.WORKSHOP,
  FASE.RECEPCAO,
  FASE.DESAFIO,
  FASE.RESULTADO
  // LOJA não entra no ORDEM — é um hub paralelo
];

class Flow {
  constructor() {
    this.fase = FASE.MENU;
    this.historico = [];
    this.visitadas = new Set([FASE.MENU]);
    this.listeners = [];
  }

  onChange(fn) { this.listeners.push(fn); }
  notificar() { this.listeners.forEach(fn => fn(this.fase, this)); }

  ir(fase) {
    this.historico.push(this.fase);
    this.fase = fase;
    this.visitadas.add(fase);
    this.notificar();
  }

  proximo() {
    const i = ORDEM.indexOf(this.fase);
    if (i >= 0 && i < ORDEM.length - 1) this.ir(ORDEM[i + 1]);
  }

  voltar() {
    if (this.historico.length === 0) return;
    this.fase = this.historico.pop();
    this.notificar();
  }

  reset() {
    this.fase = FASE.MENU;
    this.historico = [];
    this.visitadas = new Set([FASE.MENU]);
    this.notificar();
  }
}

export const flow = new Flow();
export { ORDEM };
