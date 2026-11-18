import * as nav   from './navigation.js';
import * as life  from './missao-lifecycle.js';
import * as m01   from './missao-01.js';
import * as gen   from './genericos.js';
import * as loja  from './loja.js';

export function instalarOZ({ verificarDesbloqueios, player }) {
  life.setVerificarDesbloqueios(verificarDesbloqueios);
  life.setPlayerRef(player);

  window.OZ = {
    // navegação
    mostrarBoasVindas:      nav.mostrarBoasVindas,
    marcarBoasVindasVistas: nav.marcarBoasVindasVistas,
    entrarOficina:          nav.entrarOficina,
    irPara:                 nav.irPara,
    voltar:                 nav.voltar,

    // ciclo de missão
    iniciarMissao:          life.iniciarMissao,
    voltarOficina:          life.voltarOficina,
    concluirMissao:         life.concluirMissao,
    resetProgresso:         life.resetProgresso,

    // missão 01
    addBloco:               m01.addBloco,
    removeBloco:            m01.removeBloco,
    limparBlocos:           m01.limparBlocos,
    rodarTestes:            m01.rodarTestesMissao,

    // genéricos
    escolherHipotese:       gen.escolherHipotese,
    executarProcedimento:   gen.executarProcedimento,
    marcarTabela:           gen.marcarTabela,
    validarTabela:          gen.validarTabela,

    // loja
    abrirLoja:              loja.abrirLoja,
    fecharLoja:             loja.fecharLoja,
    comprarPersonagem:      loja.comprarPersonagemOZ,
    equiparPersonagem:      loja.equiparPersonagemOZ,
  };
}
