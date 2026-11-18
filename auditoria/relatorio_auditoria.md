# Relatório de auditoria do projeto

- Gerado em: 18/11/2026 18:32  |  auditar_projeto.py v1.0
- Pasta analisada: `C:\Users\aluno.fsa\Downloads\op`
- Arquivos: 617 (JS 48, CSS 9, HTML 1, PY 3)
- Validação de sintaxe: node --check
- Total de achados: 69

## 1. Resumo

| Severidade | Qtde |
|---|---|
| CRITICO | 0 |
| ALTO | 6 |
| MEDIO | 27 |
| BAIXO | 35 |
| INFO | 1 |

### Por bloco do projeto

| Bloco | CRIT | ALTO | MEDIO | BAIXO | INFO |
|---|---|---|---|---|---|
| Regras do jogo (js/game) | 0 | 3 | 16 | 5 | 0 |
| Interface (js/ui) | 0 | 2 | 1 | 0 | 0 |
| JS raiz (js/) | 0 | 1 | 2 | 3 | 1 |
| API global OZ (js/game/oz) | 0 | 0 | 0 | 1 | 0 |
| Bibliotecas (lib) | 0 | 0 | 0 | 1 | 0 |
| CSS modular (styles/) | 0 | 0 | 1 | 0 | 0 |
| CSS monolítico (style.css) | 0 | 0 | 0 | 2 | 0 |
| Física (js/physics) | 0 | 0 | 1 | 1 | 0 |
| HTML (index.html) | 0 | 0 | 0 | 2 | 0 |
| Missões (js/game/missoes) | 0 | 0 | 0 | 7 | 0 |
| Mundo 3D (js/world) | 0 | 0 | 1 | 1 | 0 |
| Núcleo (js/core: loop, mundo, colisão, player) | 0 | 0 | 0 | 2 | 0 |
| Outros ((raiz)) | 0 | 0 | 2 | 10 | 0 |
| Telas (js/ui/screens) | 0 | 0 | 3 | 0 | 0 |

### Por tipo de erro

| Tipo | Qtde |
|---|---|
| Path de asset/módulo | 24 |
| Código órfão | 10 |
| Dívida estrutural | 9 |
| Possível vazamento (listener) | 6 |
| Dívida acidental | 5 |
| Possível vazamento (GPU) | 4 |
| Import/Export inconsistente | 2 |
| Erro em tempo de execução | 1 |
| Possível vazamento (física) | 1 |
| Dependência externa | 1 |
| Qualidade | 1 |
| Método inexistente (TypeError) | 1 |
| Chamada a API global inexistente | 1 |
| Requisição abortada (rejeição não tratada) | 1 |
| Erro de sintaxe (SyntaxError) | 1 |
| Armazenamento bloqueado (SecurityError) | 1 |

## 2. Achados por bloco


### Regras do jogo (js/game)

**[A-001] ALTO · Path de asset/módulo** — `js/game/car.js:11`  
Asset referenciado não existe: models/car-workshop.glb
- Evidência: `loader.load('models/car-workshop.glb', (gltf) => {`
- Causa provável: Arquivo não está no projeto (nome errado, renomeado ou nunca copiado). Gera 404 no access.log e erro no loader.
- **Como corrigir:** Confira o nome na pasta real, restaure o arquivo ou remova a referência.

**[A-002] ALTO · Dívida estrutural** — `js/game/player.js:1`  
Arquivo muito grande: 1538 linhas
- Evidência: `1538 linhas`
- Causa provável: Várias responsabilidades no mesmo módulo (difícil de testar, revisar e dividir autoria).
- **Como corrigir:** Divida por responsabilidade (entrada/estado/UI/lógica), mantendo a API pública. Faça em commits/INT separadas e prove a não-regressão.

**[A-003] ALTO · Erro em tempo de execução** — `js/game/state.js:69`  
Acesso a localStorage/sessionStorage sem try/catch
- Evidência: `localStorage.removeItem(SAVE_KEY);`
- Causa provável: Navegador com armazenamento bloqueado (Firefox/aba privada/cookies bloqueados) lança "SecurityError: The operation is insecure" e derruba a inicialização.
- **Como corrigir:** Envolva em try/catch com fallback em memória: `let v=null; try{v=localStorage.getItem(K)}catch{}` e idem para setItem/removeItem.

**[A-012] MEDIO · Possível vazamento (listener)** — `js/game/input.js:28`  
3 listener(s) global(is) sem removeEventListener neste arquivo
- Evidência: `L28: window.addEventListener('keydown', onKeyDown);; L29: window.addEventListener('keyup', onKeyUp);; L30: window.addEventListener('blur', onBlur);`
- Causa provável: Listeners em window/document/canvas continuam ativos mesmo depois que a tela/missão fecha; se o código roda mais de uma vez eles se acumulam (callbacks duplicados, memória).
- **Como corrigir:** Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.

**[A-013] MEDIO · Possível vazamento (listener)** — `js/game/interactions.js:10`  
1 listener(s) global(is) sem removeEventListener neste arquivo
- Evidência: `L10: canvas.addEventListener('click', (e) => {`
- Causa provável: Listeners em window/document/canvas continuam ativos mesmo depois que a tela/missão fecha; se o código roda mais de uma vez eles se acumulam (callbacks duplicados, memória).
- **Como corrigir:** Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.

**[A-014] MEDIO · Possível vazamento (GPU)** — `js/game/player.js:602`  
Recursos Three.js criados/carregados sem nenhum .dispose() neste arquivo e objetos são removidos da cena
- Evidência: `carrega modelos/texturas`
- Causa provável: Remover do scene NÃO libera GPU: geometry/material/texture continuam em memória. Cada abrir/fechar de tela/missão aumenta renderer.info.memory.
- **Como corrigir:** Ao descartar: `obj.traverse(o=>{o.geometry?.dispose(); [].concat(o.material||[]).forEach(m=>{Object.values(m).forEach(v=>v?.isTexture&&v.dispose()); m.dispose();});}); scene.remove(obj);` e `renderer.dispose()` ao destruir o canvas. Prove com renderer.info.memory antes/depois de abrir/fechar 10x.

**[A-015] MEDIO · Dívida estrutural** — `js/game/shop.js:1`  
Arquivo muito grande: 609 linhas
- Evidência: `609 linhas`
- Causa provável: Várias responsabilidades no mesmo módulo (difícil de testar, revisar e dividir autoria).
- **Como corrigir:** Divida por responsabilidade (entrada/estado/UI/lógica), mantendo a API pública. Faça em commits/INT separadas e prove a não-regressão.

**[A-016] MEDIO · Path de asset/módulo** — `js/game/shop.js:22`  
Caminho 'Female Locomotion Pack/Ch46_nonPBR.fbx' não existe, mas 'Ch46_nonPBR.fbx' existe em outro lugar
- Evidência: `Female Locomotion Pack/Ch46_nonPBR.fbx`
- Causa provável: Arquivo movido de pasta.
- **Como corrigir:** Aponte para: models/Female Locomotion Pack/Ch46_nonPBR.fbx

**[A-017] MEDIO · Path de asset/módulo** — `js/game/shop.js:26`  
Caminho 'Female Locomotion Pack/idle.fbx' não existe, mas 'idle.fbx' existe em outro lugar
- Evidência: `Female Locomotion Pack/idle.fbx`
- Causa provável: Arquivo movido de pasta.
- **Como corrigir:** Aponte para: models/Female Locomotion Pack/idle.fbx

**[A-018] MEDIO · Path de asset/módulo** — `js/game/shop.js:27`  
Caminho 'Female Locomotion Pack/walking.fbx' não existe, mas 'walking.fbx' existe em outro lugar
- Evidência: `Female Locomotion Pack/walking.fbx`
- Causa provável: Arquivo movido de pasta.
- **Como corrigir:** Aponte para: models/Female Locomotion Pack/walking.fbx

**[A-019] MEDIO · Path de asset/módulo** — `js/game/shop.js:28`  
Caminho 'Female Locomotion Pack/running.fbx' não existe, mas 'running.fbx' existe em outro lugar
- Evidência: `Female Locomotion Pack/running.fbx`
- Causa provável: Arquivo movido de pasta.
- **Como corrigir:** Aponte para: models/Female Locomotion Pack/running.fbx

**[A-020] MEDIO · Path de asset/módulo** — `js/game/shop.js:29`  
Caminho 'Female Locomotion Pack/jump.fbx' não existe, mas 'jump.fbx' existe em outro lugar
- Evidência: `Female Locomotion Pack/jump.fbx`
- Causa provável: Arquivo movido de pasta.
- **Como corrigir:** Aponte para: models/Female Locomotion Pack/jump.fbx

**[A-021] MEDIO · Path de asset/módulo** — `js/game/shop.js:31`  
Caminho 'Female Locomotion Pack/left turn.fbx' não existe, mas 'left turn.fbx' existe em outro lugar
- Evidência: `Female Locomotion Pack/left turn.fbx`
- Causa provável: Arquivo movido de pasta.
- **Como corrigir:** Aponte para: models/Female Locomotion Pack/left turn.fbx

**[A-022] MEDIO · Path de asset/módulo** — `js/game/shop.js:32`  
Caminho 'Female Locomotion Pack/right turn.fbx' não existe, mas 'right turn.fbx' existe em outro lugar
- Evidência: `Female Locomotion Pack/right turn.fbx`
- Causa provável: Arquivo movido de pasta.
- **Como corrigir:** Aponte para: models/Female Locomotion Pack/right turn.fbx

**[A-023] MEDIO · Path de asset/módulo** — `js/game/shop.js:34`  
Caminho 'Female Locomotion Pack/left strafe.fbx' não existe, mas 'left strafe.fbx' existe em outro lugar
- Evidência: `Female Locomotion Pack/left strafe.fbx`
- Causa provável: Arquivo movido de pasta.
- **Como corrigir:** Aponte para: models/Female Locomotion Pack/left strafe.fbx

**[A-024] MEDIO · Path de asset/módulo** — `js/game/shop.js:35`  
Caminho 'Female Locomotion Pack/right strafe.fbx' não existe, mas 'right strafe.fbx' existe em outro lugar
- Evidência: `Female Locomotion Pack/right strafe.fbx`
- Causa provável: Arquivo movido de pasta.
- **Como corrigir:** Aponte para: models/Female Locomotion Pack/right strafe.fbx

**[A-025] MEDIO · Path de asset/módulo** — `js/game/shop.js:38`  
Caminho 'Female Locomotion Pack/left strafe walk.fbx' não existe, mas 'left strafe walk.fbx' existe em outro lugar
- Evidência: `Female Locomotion Pack/left strafe walk.fbx`
- Causa provável: Arquivo movido de pasta.
- **Como corrigir:** Aponte para: models/Female Locomotion Pack/left strafe walk.fbx

**[A-026] MEDIO · Path de asset/módulo** — `js/game/shop.js:42`  
Caminho 'Female Locomotion Pack/right strafe walk.fbx' não existe, mas 'right strafe walk.fbx' existe em outro lugar
- Evidência: `Female Locomotion Pack/right strafe walk.fbx`
- Causa provável: Arquivo movido de pasta.
- **Como corrigir:** Aponte para: models/Female Locomotion Pack/right strafe walk.fbx

**[A-027] MEDIO · Dívida estrutural** — `js/game/stations.js:1`  
Arquivo muito grande: 773 linhas
- Evidência: `773 linhas`
- Causa provável: Várias responsabilidades no mesmo módulo (difícil de testar, revisar e dividir autoria).
- **Como corrigir:** Divida por responsabilidade (entrada/estado/UI/lógica), mantendo a API pública. Faça em commits/INT separadas e prove a não-regressão.

**[A-046] BAIXO · Código órfão** — `js/game/car.js:1`  
Módulo nunca importado a partir do index.html
- Evidência: `54 linhas`
- Causa provável: Resto da refatoração, código morto ou módulo preparado e nunca ligado.
- **Como corrigir:** Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.

**[A-047] BAIXO · Possível vazamento (GPU)** — `js/game/car.js:11`  
Recursos Three.js criados/carregados sem nenhum .dispose() neste arquivo
- Evidência: `carrega modelos/texturas`
- Causa provável: Se os recursos vivem o app inteiro, não há vazamento real.
- **Como corrigir:** Só aja se a medição (renderer.info.memory) crescer a cada uso.

**[A-048] BAIXO · Código órfão** — `js/game/interactions.js:1`  
Módulo nunca importado a partir do index.html
- Evidência: `27 linhas`
- Causa provável: Resto da refatoração, código morto ou módulo preparado e nunca ligado.
- **Como corrigir:** Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.

**[A-049] BAIXO · Path de asset/módulo** — `js/game/player.js:95`  
21 referências a assets com espaço no nome/pasta (em 2 arquivo(s))
- Evidência: `Female Locomotion Pack/Ch46_nonPBR.fbx; Female Locomotion Pack/idle.fbx; Female Locomotion Pack/jump.fbx`
- Causa provável: Espaços viram %20 na URL e quebram facilmente em scripts, deploy e comparação de nomes.
- **Como corrigir:** Renomeie pasta/arquivos sem espaços (ex.: female-locomotion-pack/left-strafe-walk.fbx) e atualize o código em um único ponto (config de paths). Só faça se der tempo de refazer o checklist de não-regressão; senão registre como dívida remanescente.

**[A-050] BAIXO · Possível vazamento (GPU)** — `js/game/stations.js:23`  
Recursos Three.js criados/carregados sem nenhum .dispose() neste arquivo
- Evidência: `9 criação(ões): BoxGeometry, MeshStandardMaterial`
- Causa provável: Se os recursos vivem o app inteiro, não há vazamento real.
- **Como corrigir:** Só aja se a medição (renderer.info.memory) crescer a cada uso.


### Interface (js/ui)

**[A-006] MEDIO · Dívida acidental** — `js/ui/screens.js.bak:1`  
Arquivo temporário/backup dentro do projeto
- Evidência: `screens.js.bak`
- Causa provável: Sobra de edição (.swp do Vim), backup manual ou saída de script de refatoração.
- **Como corrigir:** 1) Guarde uma cópia em projeto_original/ se precisar do 'antes'. 2) Apague do código-fonte. 3) Adicione ao .gitignore: *.bak, *.swp, *~.

**[L-001] ALTO · Import/Export inconsistente** — `js/ui/screens.js:0`  
[LOG] SyntaxError: The requested module '/js/ui/screens/flow-screens.js' doesn't provide an export named: 'renderWorkshop'
- Evidência: `7x | 17/11 16:43:47 → 17/11 17:06:54 | SyntaxError: The requested module '/js/ui/screens/flow-screens.js' doesn't provide an export named: 'renderWorkshop' | código atual: js/ui/screens/flow-screens.js exporta renderWorkshop`
- Causa provável: O módulo importado não exporta esse nome (renomeado, movido ou esquecido na divisão de arquivos).
- **Como corrigir:** Adicione `export` à função renderWorkshop no módulo de origem ou corrija o import no módulo que a usa. Status: ATIVO (ocorreu perto do fim do log)

**[L-002] ALTO · Import/Export inconsistente** — `js/ui/screens.js:0`  
[LOG] SyntaxError: The requested module '/js/ui/screens/flow-screens.js' doesn't provide an export named: 'renderRecepcao'
- Evidência: `2x | 17/11 16:55:56 → 17/11 16:55:59 | SyntaxError: The requested module '/js/ui/screens/flow-screens.js' doesn't provide an export named: 'renderRecepcao' | código atual: js/ui/screens/flow-screens.js exporta renderRecepcao`
- Causa provável: O módulo importado não exporta esse nome (renomeado, movido ou esquecido na divisão de arquivos).
- **Como corrigir:** Adicione `export` à função renderRecepcao no módulo de origem ou corrija o import no módulo que a usa. Status: ATIVO (ocorreu perto do fim do log)


### JS raiz (js/)

**[A-007] MEDIO · Possível vazamento (listener)** — `js/main.js:68`  
1 listener(s) global(is) sem removeEventListener neste arquivo
- Evidência: `L68: document.addEventListener('focus', (e) => {`
- Causa provável: Listeners em window/document/canvas continuam ativos mesmo depois que a tela/missão fecha; se o código roda mais de uma vez eles se acumulam (callbacks duplicados, memória).
- **Como corrigir:** Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.

**[A-008] MEDIO · Dívida acidental** — `js/main.js.bak:1`  
Arquivo temporário/backup dentro do projeto
- Evidência: `main.js.bak`
- Causa provável: Sobra de edição (.swp do Vim), backup manual ou saída de script de refatoração.
- **Como corrigir:** 1) Guarde uma cópia em projeto_original/ se precisar do 'antes'. 2) Apague do código-fonte. 3) Adicione ao .gitignore: *.bak, *.swp, *~.

**[A-051] INFO · Qualidade** — `js/:0`  
5 console.log/debugger no código
- Evidência: `js/game/player.js (2), js/debug.js (1), js/ui/panel.js (1), js/world/sky.js (1)`
- Causa provável: Ruído no console e custo em produção.
- **Como corrigir:** Remova ou proteja por flag de debug.

**[L-003] ALTO · Método inexistente (TypeError)** — `js/main.js:47`  
[LOG] TypeError: (intermediate value).setPhase is not a function
- Evidência: `7x | 17/11 16:55:10 → 17/11 17:10:15 | TypeError: (intermediate value).setPhase is not a function | código atual: nenhuma chamada a .setPhase() (provável corrigido)`
- Causa provável: O objeto não tem o método 'setPhase' (API mudou, objeto errado ou módulo não inicializado).
- **Como corrigir:** Confira o objeto no ponto indicado (console.log do tipo), a ordem de inicialização e o nome do método. Status: ATIVO (ocorreu perto do fim do log)

**[L-006] BAIXO · Requisição abortada (rejeição não tratada)** — `js/:0`  
[LOG] Error in input stream
- Evidência: `4x | 17/11 14:15:34 → 17/11 16:47:05 | Error in input stream`
- Causa provável: Carregamento de FBX/GLB/EXR cancelado por reload/hot-reload no meio do download; a Promise rejeita sem catch.
- **Como corrigir:** Adicione try/catch/.catch nos loaders e ignore AbortError/erros de cancelamento; trate como ruído de dev se só ocorre em reload. Status: SEM RECORRÊNCIA há 23 min (provável corrigido; confirme rodando de novo)

**[L-007] BAIXO · Erro de sintaxe (SyntaxError)** — `js/main.js:0`  
[LOG] SyntaxError: missing ) after formal parameters
- Evidência: `11x | 17/11 14:48:46 → 17/11 15:03:50 | SyntaxError: missing ) after formal parameters | código atual: js/main.js passa na checagem de sintaxe`
- Causa provável: Arquivo JS inválido: o navegador recusa o módulo inteiro.
- **Como corrigir:** Rode `node --check` no arquivo, corrija parênteses/chaves/vírgulas na linha apontada e na anterior. Status: SEM RECORRÊNCIA há 126 min (provável corrigido; confirme rodando de novo)

**[L-008] BAIXO · Armazenamento bloqueado (SecurityError)** — `js/main.js:121`  
[LOG] SecurityError: The operation is insecure.
- Evidência: `14x | 17/11 14:14:02 → 17/11 14:21:37 | SecurityError: The operation is insecure. | código atual: ainda há acesso a storage sem try/catch`
- Causa provável: localStorage/sessionStorage inacessível (Firefox, aba privada, cookies bloqueados).
- **Como corrigir:** Envolva todo acesso em try/catch com fallback em memória. Status: SEM RECORRÊNCIA há 168 min (provável corrigido; confirme rodando de novo)


### API global OZ (js/game/oz)

**[A-031] BAIXO · Dívida estrutural** — `js/game/oz/loja.js:1`  
Mesmo nome de módulo em pastas diferentes: loja.js
- Evidência: `js/game/oz/loja.js, js/ui/screens/loja.js`
- Causa provável: Nomes repetidos confundem imports e indicam duplicidade ou responsabilidades misturadas.
- **Como corrigir:** Confirme se os dois são usados (ver 'código órfão'). Renomeie para refletir a responsabilidade (ex.: core/player-physics.js vs game/player-view.js) ou remova o morto.


### Bibliotecas (lib)

**[A-032] BAIXO · Dívida acidental** — `lib/addons/libs/fflate.module.js:1`  
Arquivos idênticos (duplicata)
- Evidência: `lib/addons/libs/fflate.module.js, lib/addons/loaders/fflate.module.js`
- Causa provável: Mesmo conteúdo em mais de um lugar.
- **Como corrigir:** Descubra qual é importado/usado (procure o nome do arquivo no código e no access.log) e remova a cópia não usada.


### CSS modular (styles/)

**[A-004] MEDIO · Dívida estrutural** — `styles/01-tokens.css:1`  
8 arquivo(s) CSS não são carregados por nenhuma página
- Evidência: `em uso: 3424 linhas | fora de uso: 2408 linhas | ex.: styles/01-tokens.css, styles/02-reset.css, styles/03-layout.css, styles/04-panel.css`
- Causa provável: Divisão do CSS feita mas não ligada ao HTML (ou incompleta). Trocar o <link> pode causar regressão visual se faltar regra.
- **Como corrigir:** Compare cobertura (linhas/seletores) entre o CSS em uso e o modular. Só migre o <link> depois de provar com prints antes/depois; senão registre como dívida remanescente com o motivo.


### CSS monolítico (style.css)

**[A-033] BAIXO · Dependência externa** — `style.css:2500`  
@import de CSS externo (fontes/CDN)
- Evidência: `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400`
- Causa provável: Requisição bloqueante no caminho crítico de renderização.
- **Como corrigir:** Use <link rel=preload>/font-display: swap ou hospede a fonte em fonts/.

**[L-004] BAIXO · Path de asset/módulo** — `style.css:0`  
[ACCESS.LOG] HTTP 404 em /style.css (22x)
- Evidência: `22x | 15:58:15 → 16:06:36`
- Causa provável: O navegador pediu um arquivo que o servidor não tem/ não liberou.
- **Como corrigir:** Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 63 min (provável corrigido; confirme rodando de novo)


### Física (js/physics)

**[A-005] MEDIO · Possível vazamento (física)** — `js/physics/world.js:81`  
addBody sem removeBody
- Evidência: `world.addBody(groundBody);`
- Causa provável: Corpos físicos ficam em world.bodies para sempre: o passo de simulação fica mais lento.
- **Como corrigir:** Ao remover o mesh chame `world.removeBody(body)` e meça world.bodies.length no ciclo criar/destruir.

**[A-034] BAIXO · Código órfão** — `js/physics/world.js:1`  
Módulo nunca importado a partir do index.html
- Evidência: `120 linhas`
- Causa provável: Resto da refatoração, código morto ou módulo preparado e nunca ligado.
- **Como corrigir:** Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.


### HTML (index.html)

**[A-035] BAIXO · Dívida estrutural** — `index.html:1`  
21 handlers inline (onclick=...) acoplados a window.OZ
- Evidência: `js/ui/screens/flow-screens.js (17), js/ui/screens/loja.js (3), index.html (1)`
- Causa provável: HTML gerado como string chama funções globais: qualquer função fora de window.OZ vira TypeError.
- **Como corrigir:** Prefira data-attributes + addEventListener com delegação num módulo (ex.: data-acao="abrirLoja"). Se não der tempo, declare como dívida remanescente.

**[L-005] BAIXO · Chamada a API global inexistente** — `index.html:1`  
[LOG] TypeError: window.OZ.fecharViewerLoja is not a function
- Evidência: `12x | 17/11 15:37:56 → 17/11 15:40:29 | TypeError: window.OZ.fecharViewerLoja is not a function | código atual: window.OZ.fecharViewerLoja DEFINIDO`
- Causa provável: onclick inline chama window.OZ.fecharViewerLoja, que não foi registrada.
- **Como corrigir:** Registre `window.OZ.fecharViewerLoja = fecharViewerLoja` no módulo que define a função (ex.: instalarOZ) ou troque o onclick por addEventListener. Status: SEM RECORRÊNCIA há 90 min (provável corrigido; confirme rodando de novo)


### Missões (js/game/missoes)

**[A-036] BAIXO · Código órfão** — `js/game/missoes/missao02.js:1`  
Módulo nunca importado a partir do index.html
- Evidência: `20 linhas`
- Causa provável: Resto da refatoração, código morto ou módulo preparado e nunca ligado.
- **Como corrigir:** Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.

**[A-037] BAIXO · Código órfão** — `js/game/missoes/missao03.js:1`  
Módulo nunca importado a partir do index.html
- Evidência: `56 linhas`
- Causa provável: Resto da refatoração, código morto ou módulo preparado e nunca ligado.
- **Como corrigir:** Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.

**[A-038] BAIXO · Código órfão** — `js/game/missoes/missao04.js:1`  
Módulo nunca importado a partir do index.html
- Evidência: `35 linhas`
- Causa provável: Resto da refatoração, código morto ou módulo preparado e nunca ligado.
- **Como corrigir:** Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.

**[A-039] BAIXO · Código órfão** — `js/game/missoes/missao05.js:1`  
Módulo nunca importado a partir do index.html
- Evidência: `35 linhas`
- Causa provável: Resto da refatoração, código morto ou módulo preparado e nunca ligado.
- **Como corrigir:** Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.

**[A-040] BAIXO · Código órfão** — `js/game/missoes/missao06.js:1`  
Módulo nunca importado a partir do index.html
- Evidência: `28 linhas`
- Causa provável: Resto da refatoração, código morto ou módulo preparado e nunca ligado.
- **Como corrigir:** Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.

**[A-041] BAIXO · Código órfão** — `js/game/missoes/missao07.js:1`  
Módulo nunca importado a partir do index.html
- Evidência: `49 linhas`
- Causa provável: Resto da refatoração, código morto ou módulo preparado e nunca ligado.
- **Como corrigir:** Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.

**[A-042] BAIXO · Código órfão** — `js/game/missoes/missao08.js:1`  
Módulo nunca importado a partir do index.html
- Evidência: `38 linhas`
- Causa provável: Resto da refatoração, código morto ou módulo preparado e nunca ligado.
- **Como corrigir:** Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.


### Mundo 3D (js/world)

**[A-009] MEDIO · Possível vazamento (listener)** — `js/world/scene.js:29`  
1 listener(s) global(is) sem removeEventListener neste arquivo
- Evidência: `L29: window.addEventListener('resize', () => {`
- Causa provável: Listeners em window/document/canvas continuam ativos mesmo depois que a tela/missão fecha; se o código roda mais de uma vez eles se acumulam (callbacks duplicados, memória).
- **Como corrigir:** Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.

**[A-043] BAIXO · Possível vazamento (GPU)** — `js/world/scene.js:14`  
Recursos Three.js criados/carregados sem nenhum .dispose() neste arquivo
- Evidência: `5 criação(ões): MeshStandardMaterial, PlaneGeometry, RingGeometry, WebGLRenderer`
- Causa provável: Se os recursos vivem o app inteiro, não há vazamento real.
- **Como corrigir:** Só aja se a medição (renderer.info.memory) crescer a cada uso.


### Núcleo (js/core: loop, mundo, colisão, player)

**[A-044] BAIXO · Dívida estrutural** — `js/core/player.js:1`  
Mesmo nome de módulo em pastas diferentes: player.js
- Evidência: `js/core/player.js, js/game/player.js`
- Causa provável: Nomes repetidos confundem imports e indicam duplicidade ou responsabilidades misturadas.
- **Como corrigir:** Confirme se os dois são usados (ver 'código órfão'). Renomeie para refletir a responsabilidade (ex.: core/player-physics.js vs game/player-view.js) ou remova o morto.

**[A-045] BAIXO · Dívida estrutural** — `js/core/world.js:1`  
Mesmo nome de módulo em pastas diferentes: world.js
- Evidência: `js/core/world.js, js/physics/world.js`
- Causa provável: Nomes repetidos confundem imports e indicam duplicidade ou responsabilidades misturadas.
- **Como corrigir:** Confirme se os dois são usados (ver 'código órfão'). Renomeie para refletir a responsabilidade (ex.: core/player-physics.js vs game/player-view.js) ou remova o morto.


### Outros ((raiz))

**[A-010] MEDIO · Dívida acidental** — `.refactor-op.sh.swp:1`  
Arquivo temporário/backup dentro do projeto
- Evidência: `.refactor-op.sh.swp`
- Causa provável: Sobra de edição (.swp do Vim), backup manual ou saída de script de refatoração.
- **Como corrigir:** 1) Guarde uma cópia em projeto_original/ se precisar do 'antes'. 2) Apague do código-fonte. 3) Adicione ao .gitignore: *.bak, *.swp, *~.

**[A-011] MEDIO · Dívida acidental** — `backup_ dev.py:1`  
Arquivo temporário/backup dentro do projeto
- Evidência: `backup_ dev.py`
- Causa provável: Sobra de edição (.swp do Vim), backup manual ou saída de script de refatoração.
- **Como corrigir:** 1) Guarde uma cópia em projeto_original/ se precisar do 'antes'. 2) Apague do código-fonte. 3) Adicione ao .gitignore: *.bak, *.swp, *~.

**[L-009] BAIXO · Path de asset/módulo** — `01-tokens.css:0`  
[ACCESS.LOG] HTTP 404 em /01-tokens.css (3x)
- Evidência: `3x | 16:13:12 → 16:13:21`
- Causa provável: O navegador pediu um arquivo que o servidor não tem/ não liberou.
- **Como corrigir:** Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)

**[L-010] BAIXO · Path de asset/módulo** — `02-reset.css:0`  
[ACCESS.LOG] HTTP 404 em /02-reset.css (3x)
- Evidência: `3x | 16:13:12 → 16:13:21`
- Causa provável: O navegador pediu um arquivo que o servidor não tem/ não liberou.
- **Como corrigir:** Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)

**[L-011] BAIXO · Path de asset/módulo** — `03-layout.css:0`  
[ACCESS.LOG] HTTP 404 em /03-layout.css (3x)
- Evidência: `3x | 16:13:12 → 16:13:21`
- Causa provável: O navegador pediu um arquivo que o servidor não tem/ não liberou.
- **Como corrigir:** Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)

**[L-012] BAIXO · Path de asset/módulo** — `04-panel.css:0`  
[ACCESS.LOG] HTTP 404 em /04-panel.css (3x)
- Evidência: `3x | 16:13:12 → 16:13:21`
- Causa provável: O navegador pediu um arquivo que o servidor não tem/ não liberou.
- **Como corrigir:** Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)

**[L-013] BAIXO · Path de asset/módulo** — `05-hud.css:0`  
[ACCESS.LOG] HTTP 404 em /05-hud.css (3x)
- Evidência: `3x | 16:13:12 → 16:13:21`
- Causa provável: O navegador pediu um arquivo que o servidor não tem/ não liberou.
- **Como corrigir:** Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)

**[L-014] BAIXO · Path de asset/módulo** — `06-modals.css:0`  
[ACCESS.LOG] HTTP 404 em /06-modals.css (3x)
- Evidência: `3x | 16:13:12 → 16:13:21`
- Causa provável: O navegador pediu um arquivo que o servidor não tem/ não liberou.
- **Como corrigir:** Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)

**[L-015] BAIXO · Path de asset/módulo** — `07-screen.css:0`  
[ACCESS.LOG] HTTP 404 em /07-screen.css (3x)
- Evidência: `3x | 16:13:12 → 16:13:21`
- Causa provável: O navegador pediu um arquivo que o servidor não tem/ não liberou.
- **Como corrigir:** Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)

**[L-016] BAIXO · Path de asset/módulo** — `08-boot-welcome.css:0`  
[ACCESS.LOG] HTTP 404 em /08-boot-welcome.css (3x)
- Evidência: `3x | 16:13:12 → 16:13:21`
- Causa provável: O navegador pediu um arquivo que o servidor não tem/ não liberou.
- **Como corrigir:** Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)

**[L-017] BAIXO · Path de asset/módulo** — `09-loja.css:0`  
[ACCESS.LOG] HTTP 404 em /09-loja.css (3x)
- Evidência: `3x | 16:13:12 → 16:13:21`
- Causa provável: O navegador pediu um arquivo que o servidor não tem/ não liberou.
- **Como corrigir:** Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)

**[L-018] BAIXO · Path de asset/módulo** — `favicon.ico:0`  
[ACCESS.LOG] HTTP 404 em /favicon.ico (93x)
- Evidência: `93x | 14:14:02 → 17:10:28`
- Causa provável: O navegador pediu um arquivo que o servidor não tem/ não liberou.
- **Como corrigir:** Adicione um favicon (`<link rel="icon" href="data:,">` resolve sem arquivo). Status: ATIVO (ocorreu perto do fim do log)


### Telas (js/ui/screens)

**[A-028] MEDIO · Possível vazamento (listener)** — `js/ui/screens/listeners.js:11`  
1 listener(s) global(is) sem removeEventListener neste arquivo
- Evidência: `L11: document.addEventListener('click', e => {`
- Causa provável: Listeners em window/document/canvas continuam ativos mesmo depois que a tela/missão fecha; se o código roda mais de uma vez eles se acumulam (callbacks duplicados, memória).
- **Como corrigir:** Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.

**[A-029] MEDIO · Dívida estrutural** — `js/ui/screens/loja.js:1`  
Arquivo muito grande: 626 linhas
- Evidência: `626 linhas`
- Causa provável: Várias responsabilidades no mesmo módulo (difícil de testar, revisar e dividir autoria).
- **Como corrigir:** Divida por responsabilidade (entrada/estado/UI/lógica), mantendo a API pública. Faça em commits/INT separadas e prove a não-regressão.

**[A-030] MEDIO · Possível vazamento (listener)** — `js/ui/screens/loja.js:287`  
1 listener(s) global(is) sem removeEventListener neste arquivo
- Evidência: `L287: document.addEventListener('keydown', (e) => {`
- Causa provável: Listeners em window/document/canvas continuam ativos mesmo depois que a tela/missão fecha; se o código roda mais de uma vez eles se acumulam (callbacks duplicados, memória).
- **Como corrigir:** Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.


## 3. Logs do dev.py

### errors.log (agrupado)

| Qtde | Tipo | Mensagem | Origem | 1ª | Última |
|---|---|---|---|---|---|
| 14 | javascript | SecurityError: The operation is insecure. | js/main.js | 14:14:02 | 14:21:37 |
| 12 | javascript | TypeError: window.OZ.fecharViewerLoja is not a function | http://127.0.0.1:8000/ | 15:37:56 | 15:40:29 |
| 11 | javascript | SyntaxError: missing ) after formal parameters | js/main.js | 14:48:46 | 15:03:50 |
| 7 | javascript | SyntaxError: The requested module '/js/ui/screens/flow-screens.js' doesn't provide an expo | js/ui/screens.js | 16:43:47 | 17:06:54 |
| 7 | javascript | TypeError: (intermediate value).setPhase is not a function | js/main.js | 16:55:10 | 17:10:15 |
| 4 | unhandledrejection | Error in input stream | - | 14:15:34 | 16:47:05 |
| 2 | javascript | SyntaxError: The requested module '/js/ui/screens/flow-screens.js' doesn't provide an expo | js/ui/screens.js | 16:55:56 | 16:55:59 |

### access.log (HTTP >= 400)

| Qtde | Status | Caminho |
|---|---|---|
| 93 | 404 | `/favicon.ico` |
| 22 | 404 | `/style.css` |
| 3 | 404 | `/02-reset.css` |
| 3 | 404 | `/01-tokens.css` |
| 3 | 404 | `/04-panel.css` |
| 3 | 404 | `/05-hud.css` |
| 3 | 404 | `/06-modals.css` |
| 3 | 404 | `/03-layout.css` |
| 3 | 404 | `/08-boot-welcome.css` |
| 3 | 404 | `/07-screen.css` |
| 3 | 404 | `/09-loja.css` |

### Sessões de carregamento (GET /) — use para baseline x depois

| Início | Duração (s) | Requisições | JS | CSS | Assets 3D | 4xx/5xx |
|---|---|---|---|---|---|---|
| 17/11 14:14:01 | 5 | 60 | 30 | 1 | 26 | 1 |
| 17/11 14:14:17 | 0 | 41 | 30 | 1 | 7 | 1 |
| 17/11 14:14:20 | 7 | 60 | 30 | 2 | 26 | 0 |
| 17/11 14:15:04 | 6 | 60 | 30 | 1 | 26 | 1 |
| 17/11 17:10:05 | 4 | 73 | 47 | 1 | 22 | 1 |
| 17/11 17:10:09 | 5 | 73 | 47 | 1 | 22 | 1 |
| 17/11 17:10:15 | 4 | 73 | 47 | 1 | 22 | 1 |
| 17/11 17:10:27 | 6 | 72 | 47 | 1 | 22 | 1 |

> Resolução de 1 s e hot-reload podem cancelar cargas: confirme tempos no DevTools (Performance).

## 4. Checklist de não-regressão (após corrigir)

- [ ] Rodar `python auditar_projeto.py` de novo e comparar a contagem (ALTO/CRITICO devem cair).
- [ ] Carregar cena → criar objeto → colidir → quiz → salvar/recarregar → fechar, SEM erro no console.
- [ ] errors.log sem entradas novas durante o roteiro; access.log sem 404 novos.
- [ ] Prints antes/depois de 2–3 cenas-chave; renderer.info.memory antes/depois de abrir/fechar a loja 10x.
