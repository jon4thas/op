# PROMPT PARA A IA (cole este arquivo inteiro e anexe os arquivos citados)

Você é um engenheiro de software sênior fazendo MANUTENÇÃO de um sistema legado
(Three.js + ES Modules + dev.py). NÃO reescreva módulos do zero. Faça mudanças mínimas,
cada uma rastreável, sem quebrar o que já funciona (princípio de não-regressão).

Abaixo está o relatório gerado por `auditar_projeto.py`. Cada achado traz ID, severidade,
tipo, bloco do projeto, arquivo:linha, evidência e a solução sugerida.

## O que eu preciso de você
1. Trabalhe em ordem: CRITICO → ALTO → MEDIO. Ignore INFO por enquanto.
2. Para cada achado: (a) confirme se é erro real ou falso positivo (heurística), olhando o arquivo
   que eu anexar; (b) mostre o trecho ANTES e DEPOIS (diff curto); (c) explique o motivo em 1–2 frases;
   (d) diga como eu provo que funcionou (comando, print, métrica ou linha do log).
3. Se faltar o conteúdo de um arquivo para decidir, PEÇA o arquivo pelo caminho; não invente código.
4. Agrupe correções que mexem no mesmo arquivo numa única intervenção (INT-01, INT-02...).
5. No fim entregue: tabela (ID | arquivo | tipo | corrigido? | evidência de não-regressão) e uma lista
   de dívida remanescente (o que NÃO vale corrigir agora e por quê).

## Regras
- Responda em português. Não use commits/PR (este trabalho não usa Git): registre cada mudança como INT-xx.
- Não remova arquivos sem eu confirmar que nada os importa (veja 'Código órfão' e o access.log).
- Quando houver risco visual (CSS), exija prints antes/depois.

## Relatório (resumo dos achados)
- [A-001] ALTO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/car.js:11
  problema: Asset referenciado não existe: models/car-workshop.glb
  evidência: loader.load('models/car-workshop.glb', (gltf) => {
  sugestão: Confira o nome na pasta real, restaure o arquivo ou remova a referência.
- [A-002] ALTO | Dívida estrutural | bloco: Regras do jogo (js/game) | js/game/player.js:1
  problema: Arquivo muito grande: 1538 linhas
  evidência: 1538 linhas
  sugestão: Divida por responsabilidade (entrada/estado/UI/lógica), mantendo a API pública. Faça em commits/INT separadas e prove a não-regressão.
- [A-003] ALTO | Erro em tempo de execução | bloco: Regras do jogo (js/game) | js/game/state.js:69
  problema: Acesso a localStorage/sessionStorage sem try/catch
  evidência: localStorage.removeItem(SAVE_KEY);
  sugestão: Envolva em try/catch com fallback em memória: `let v=null; try{v=localStorage.getItem(K)}catch{}` e idem para setItem/removeItem.
- [A-004] MEDIO | Dívida estrutural | bloco: CSS modular (styles/) | styles/01-tokens.css:1
  problema: 8 arquivo(s) CSS não são carregados por nenhuma página
  evidência: em uso: 3424 linhas | fora de uso: 2408 linhas | ex.: styles/01-tokens.css, styles/02-reset.css, styles/03-layout.css, styles/04-panel.css
  sugestão: Compare cobertura (linhas/seletores) entre o CSS em uso e o modular. Só migre o <link> depois de provar com prints antes/depois; senão registre como dívida remanescente com o motivo.
- [A-005] MEDIO | Possível vazamento (física) | bloco: Física (js/physics) | js/physics/world.js:81
  problema: addBody sem removeBody
  evidência: world.addBody(groundBody);
  sugestão: Ao remover o mesh chame `world.removeBody(body)` e meça world.bodies.length no ciclo criar/destruir.
- [A-006] MEDIO | Dívida acidental | bloco: Interface (js/ui) | js/ui/screens.js.bak:1
  problema: Arquivo temporário/backup dentro do projeto
  evidência: screens.js.bak
  sugestão: 1) Guarde uma cópia em projeto_original/ se precisar do 'antes'. 2) Apague do código-fonte. 3) Adicione ao .gitignore: *.bak, *.swp, *~.
- [A-007] MEDIO | Possível vazamento (listener) | bloco: JS raiz (js/) | js/main.js:68
  problema: 1 listener(s) global(is) sem removeEventListener neste arquivo
  evidência: L68: document.addEventListener('focus', (e) => {
  sugestão: Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.
- [A-008] MEDIO | Dívida acidental | bloco: JS raiz (js/) | js/main.js.bak:1
  problema: Arquivo temporário/backup dentro do projeto
  evidência: main.js.bak
  sugestão: 1) Guarde uma cópia em projeto_original/ se precisar do 'antes'. 2) Apague do código-fonte. 3) Adicione ao .gitignore: *.bak, *.swp, *~.
- [A-009] MEDIO | Possível vazamento (listener) | bloco: Mundo 3D (js/world) | js/world/scene.js:29
  problema: 1 listener(s) global(is) sem removeEventListener neste arquivo
  evidência: L29: window.addEventListener('resize', () => {
  sugestão: Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.
- [A-010] MEDIO | Dívida acidental | bloco: Outros ((raiz)) | .refactor-op.sh.swp:1
  problema: Arquivo temporário/backup dentro do projeto
  evidência: .refactor-op.sh.swp
  sugestão: 1) Guarde uma cópia em projeto_original/ se precisar do 'antes'. 2) Apague do código-fonte. 3) Adicione ao .gitignore: *.bak, *.swp, *~.
- [A-011] MEDIO | Dívida acidental | bloco: Outros ((raiz)) | backup_ dev.py:1
  problema: Arquivo temporário/backup dentro do projeto
  evidência: backup_ dev.py
  sugestão: 1) Guarde uma cópia em projeto_original/ se precisar do 'antes'. 2) Apague do código-fonte. 3) Adicione ao .gitignore: *.bak, *.swp, *~.
- [A-012] MEDIO | Possível vazamento (listener) | bloco: Regras do jogo (js/game) | js/game/input.js:28
  problema: 3 listener(s) global(is) sem removeEventListener neste arquivo
  evidência: L28: window.addEventListener('keydown', onKeyDown);; L29: window.addEventListener('keyup', onKeyUp);; L30: window.addEventListener('blur', onBlur);
  sugestão: Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.
- [A-013] MEDIO | Possível vazamento (listener) | bloco: Regras do jogo (js/game) | js/game/interactions.js:10
  problema: 1 listener(s) global(is) sem removeEventListener neste arquivo
  evidência: L10: canvas.addEventListener('click', (e) => {
  sugestão: Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.
- [A-014] MEDIO | Possível vazamento (GPU) | bloco: Regras do jogo (js/game) | js/game/player.js:602
  problema: Recursos Three.js criados/carregados sem nenhum .dispose() neste arquivo e objetos são removidos da cena
  evidência: carrega modelos/texturas
  sugestão: Ao descartar: `obj.traverse(o=>{o.geometry?.dispose(); [].concat(o.material||[]).forEach(m=>{Object.values(m).forEach(v=>v?.isTexture&&v.dispose()); m.dispose();});}); scene.remove(obj);` e `renderer.dispose()` ao destruir o canvas. Prove com renderer.info.memory antes/depois de abrir/fechar 10x.
- [A-015] MEDIO | Dívida estrutural | bloco: Regras do jogo (js/game) | js/game/shop.js:1
  problema: Arquivo muito grande: 609 linhas
  evidência: 609 linhas
  sugestão: Divida por responsabilidade (entrada/estado/UI/lógica), mantendo a API pública. Faça em commits/INT separadas e prove a não-regressão.
- [A-016] MEDIO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/shop.js:22
  problema: Caminho 'Female Locomotion Pack/Ch46_nonPBR.fbx' não existe, mas 'Ch46_nonPBR.fbx' existe em outro lugar
  evidência: Female Locomotion Pack/Ch46_nonPBR.fbx
  sugestão: Aponte para: models/Female Locomotion Pack/Ch46_nonPBR.fbx
- [A-017] MEDIO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/shop.js:26
  problema: Caminho 'Female Locomotion Pack/idle.fbx' não existe, mas 'idle.fbx' existe em outro lugar
  evidência: Female Locomotion Pack/idle.fbx
  sugestão: Aponte para: models/Female Locomotion Pack/idle.fbx
- [A-018] MEDIO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/shop.js:27
  problema: Caminho 'Female Locomotion Pack/walking.fbx' não existe, mas 'walking.fbx' existe em outro lugar
  evidência: Female Locomotion Pack/walking.fbx
  sugestão: Aponte para: models/Female Locomotion Pack/walking.fbx
- [A-019] MEDIO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/shop.js:28
  problema: Caminho 'Female Locomotion Pack/running.fbx' não existe, mas 'running.fbx' existe em outro lugar
  evidência: Female Locomotion Pack/running.fbx
  sugestão: Aponte para: models/Female Locomotion Pack/running.fbx
- [A-020] MEDIO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/shop.js:29
  problema: Caminho 'Female Locomotion Pack/jump.fbx' não existe, mas 'jump.fbx' existe em outro lugar
  evidência: Female Locomotion Pack/jump.fbx
  sugestão: Aponte para: models/Female Locomotion Pack/jump.fbx
- [A-021] MEDIO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/shop.js:31
  problema: Caminho 'Female Locomotion Pack/left turn.fbx' não existe, mas 'left turn.fbx' existe em outro lugar
  evidência: Female Locomotion Pack/left turn.fbx
  sugestão: Aponte para: models/Female Locomotion Pack/left turn.fbx
- [A-022] MEDIO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/shop.js:32
  problema: Caminho 'Female Locomotion Pack/right turn.fbx' não existe, mas 'right turn.fbx' existe em outro lugar
  evidência: Female Locomotion Pack/right turn.fbx
  sugestão: Aponte para: models/Female Locomotion Pack/right turn.fbx
- [A-023] MEDIO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/shop.js:34
  problema: Caminho 'Female Locomotion Pack/left strafe.fbx' não existe, mas 'left strafe.fbx' existe em outro lugar
  evidência: Female Locomotion Pack/left strafe.fbx
  sugestão: Aponte para: models/Female Locomotion Pack/left strafe.fbx
- [A-024] MEDIO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/shop.js:35
  problema: Caminho 'Female Locomotion Pack/right strafe.fbx' não existe, mas 'right strafe.fbx' existe em outro lugar
  evidência: Female Locomotion Pack/right strafe.fbx
  sugestão: Aponte para: models/Female Locomotion Pack/right strafe.fbx
- [A-025] MEDIO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/shop.js:38
  problema: Caminho 'Female Locomotion Pack/left strafe walk.fbx' não existe, mas 'left strafe walk.fbx' existe em outro lugar
  evidência: Female Locomotion Pack/left strafe walk.fbx
  sugestão: Aponte para: models/Female Locomotion Pack/left strafe walk.fbx
- [A-026] MEDIO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/shop.js:42
  problema: Caminho 'Female Locomotion Pack/right strafe walk.fbx' não existe, mas 'right strafe walk.fbx' existe em outro lugar
  evidência: Female Locomotion Pack/right strafe walk.fbx
  sugestão: Aponte para: models/Female Locomotion Pack/right strafe walk.fbx
- [A-027] MEDIO | Dívida estrutural | bloco: Regras do jogo (js/game) | js/game/stations.js:1
  problema: Arquivo muito grande: 773 linhas
  evidência: 773 linhas
  sugestão: Divida por responsabilidade (entrada/estado/UI/lógica), mantendo a API pública. Faça em commits/INT separadas e prove a não-regressão.
- [A-028] MEDIO | Possível vazamento (listener) | bloco: Telas (js/ui/screens) | js/ui/screens/listeners.js:11
  problema: 1 listener(s) global(is) sem removeEventListener neste arquivo
  evidência: L11: document.addEventListener('click', e => {
  sugestão: Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.
- [A-029] MEDIO | Dívida estrutural | bloco: Telas (js/ui/screens) | js/ui/screens/loja.js:1
  problema: Arquivo muito grande: 626 linhas
  evidência: 626 linhas
  sugestão: Divida por responsabilidade (entrada/estado/UI/lógica), mantendo a API pública. Faça em commits/INT separadas e prove a não-regressão.
- [A-030] MEDIO | Possível vazamento (listener) | bloco: Telas (js/ui/screens) | js/ui/screens/loja.js:287
  problema: 1 listener(s) global(is) sem removeEventListener neste arquivo
  evidência: L287: document.addEventListener('keydown', (e) => {
  sugestão: Guarde a referência da função (`const onKey = e => {...}`) e chame `removeEventListener('keydown', onKey)` ao fechar, ou use `{ signal: controller.signal }` com AbortController. Se roda UMA vez por sessão, anote 'sem risco' no Relatório. Confirme medindo getEventListeners(window) antes/depois.
- [A-031] BAIXO | Dívida estrutural | bloco: API global OZ (js/game/oz) | js/game/oz/loja.js:1
  problema: Mesmo nome de módulo em pastas diferentes: loja.js
  evidência: js/game/oz/loja.js, js/ui/screens/loja.js
  sugestão: Confirme se os dois são usados (ver 'código órfão'). Renomeie para refletir a responsabilidade (ex.: core/player-physics.js vs game/player-view.js) ou remova o morto.
- [A-032] BAIXO | Dívida acidental | bloco: Bibliotecas (lib) | lib/addons/libs/fflate.module.js:1
  problema: Arquivos idênticos (duplicata)
  evidência: lib/addons/libs/fflate.module.js, lib/addons/loaders/fflate.module.js
  sugestão: Descubra qual é importado/usado (procure o nome do arquivo no código e no access.log) e remova a cópia não usada.
- [A-033] BAIXO | Dependência externa | bloco: CSS monolítico (style.css) | style.css:2500
  problema: @import de CSS externo (fontes/CDN)
  evidência: https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400
  sugestão: Use <link rel=preload>/font-display: swap ou hospede a fonte em fonts/.
- [A-034] BAIXO | Código órfão | bloco: Física (js/physics) | js/physics/world.js:1
  problema: Módulo nunca importado a partir do index.html
  evidência: 120 linhas
  sugestão: Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.
- [A-035] BAIXO | Dívida estrutural | bloco: HTML (index.html) | index.html:1
  problema: 21 handlers inline (onclick=...) acoplados a window.OZ
  evidência: js/ui/screens/flow-screens.js (17), js/ui/screens/loja.js (3), index.html (1)
  sugestão: Prefira data-attributes + addEventListener com delegação num módulo (ex.: data-acao="abrirLoja"). Se não der tempo, declare como dívida remanescente.
- [A-036] BAIXO | Código órfão | bloco: Missões (js/game/missoes) | js/game/missoes/missao02.js:1
  problema: Módulo nunca importado a partir do index.html
  evidência: 20 linhas
  sugestão: Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.
- [A-037] BAIXO | Código órfão | bloco: Missões (js/game/missoes) | js/game/missoes/missao03.js:1
  problema: Módulo nunca importado a partir do index.html
  evidência: 56 linhas
  sugestão: Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.
- [A-038] BAIXO | Código órfão | bloco: Missões (js/game/missoes) | js/game/missoes/missao04.js:1
  problema: Módulo nunca importado a partir do index.html
  evidência: 35 linhas
  sugestão: Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.
- [A-039] BAIXO | Código órfão | bloco: Missões (js/game/missoes) | js/game/missoes/missao05.js:1
  problema: Módulo nunca importado a partir do index.html
  evidência: 35 linhas
  sugestão: Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.
- [A-040] BAIXO | Código órfão | bloco: Missões (js/game/missoes) | js/game/missoes/missao06.js:1
  problema: Módulo nunca importado a partir do index.html
  evidência: 28 linhas
  sugestão: Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.
- [A-041] BAIXO | Código órfão | bloco: Missões (js/game/missoes) | js/game/missoes/missao07.js:1
  problema: Módulo nunca importado a partir do index.html
  evidência: 49 linhas
  sugestão: Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.
- [A-042] BAIXO | Código órfão | bloco: Missões (js/game/missoes) | js/game/missoes/missao08.js:1
  problema: Módulo nunca importado a partir do index.html
  evidência: 38 linhas
  sugestão: Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.
- [A-043] BAIXO | Possível vazamento (GPU) | bloco: Mundo 3D (js/world) | js/world/scene.js:14
  problema: Recursos Three.js criados/carregados sem nenhum .dispose() neste arquivo
  evidência: 5 criação(ões): MeshStandardMaterial, PlaneGeometry, RingGeometry, WebGLRenderer
  sugestão: Só aja se a medição (renderer.info.memory) crescer a cada uso.
- [A-044] BAIXO | Dívida estrutural | bloco: Núcleo (js/core: loop, mundo, colisão, player) | js/core/player.js:1
  problema: Mesmo nome de módulo em pastas diferentes: player.js
  evidência: js/core/player.js, js/game/player.js
  sugestão: Confirme se os dois são usados (ver 'código órfão'). Renomeie para refletir a responsabilidade (ex.: core/player-physics.js vs game/player-view.js) ou remova o morto.
- [A-045] BAIXO | Dívida estrutural | bloco: Núcleo (js/core: loop, mundo, colisão, player) | js/core/world.js:1
  problema: Mesmo nome de módulo em pastas diferentes: world.js
  evidência: js/core/world.js, js/physics/world.js
  sugestão: Confirme se os dois são usados (ver 'código órfão'). Renomeie para refletir a responsabilidade (ex.: core/player-physics.js vs game/player-view.js) ou remova o morto.
- [A-046] BAIXO | Código órfão | bloco: Regras do jogo (js/game) | js/game/car.js:1
  problema: Módulo nunca importado a partir do index.html
  evidência: 54 linhas
  sugestão: Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.
- [A-047] BAIXO | Possível vazamento (GPU) | bloco: Regras do jogo (js/game) | js/game/car.js:11
  problema: Recursos Three.js criados/carregados sem nenhum .dispose() neste arquivo
  evidência: carrega modelos/texturas
  sugestão: Só aja se a medição (renderer.info.memory) crescer a cada uso.
- [A-048] BAIXO | Código órfão | bloco: Regras do jogo (js/game) | js/game/interactions.js:1
  problema: Módulo nunca importado a partir do index.html
  evidência: 27 linhas
  sugestão: Confirme no access.log que o arquivo NUNCA é requisitado. Se confirmar: remova (registrando a decisão no Relatório) ou documente como dívida remanescente.
- [A-049] BAIXO | Path de asset/módulo | bloco: Regras do jogo (js/game) | js/game/player.js:95
  problema: 21 referências a assets com espaço no nome/pasta (em 2 arquivo(s))
  evidência: Female Locomotion Pack/Ch46_nonPBR.fbx; Female Locomotion Pack/idle.fbx; Female Locomotion Pack/jump.fbx
  sugestão: Renomeie pasta/arquivos sem espaços (ex.: female-locomotion-pack/left-strafe-walk.fbx) e atualize o código em um único ponto (config de paths). Só faça se der tempo de refazer o checklist de não-regressão; senão registre como dívida remanescente.
- [A-050] BAIXO | Possível vazamento (GPU) | bloco: Regras do jogo (js/game) | js/game/stations.js:23
  problema: Recursos Three.js criados/carregados sem nenhum .dispose() neste arquivo
  evidência: 9 criação(ões): BoxGeometry, MeshStandardMaterial
  sugestão: Só aja se a medição (renderer.info.memory) crescer a cada uso.
- [L-001] ALTO | Import/Export inconsistente | bloco: Interface (js/ui) | js/ui/screens.js:0
  problema: [LOG] SyntaxError: The requested module '/js/ui/screens/flow-screens.js' doesn't provide an export named: 'renderWorkshop'
  evidência: 7x | 17/11 16:43:47 → 17/11 17:06:54 | SyntaxError: The requested module '/js/ui/screens/flow-screens.js' doesn't provide an export named: 'renderWorkshop' | código atual: js/ui/screens/flow-screens.js exporta renderWorkshop
  sugestão: Adicione `export` à função renderWorkshop no módulo de origem ou corrija o import no módulo que a usa. Status: ATIVO (ocorreu perto do fim do log)
- [L-002] ALTO | Import/Export inconsistente | bloco: Interface (js/ui) | js/ui/screens.js:0
  problema: [LOG] SyntaxError: The requested module '/js/ui/screens/flow-screens.js' doesn't provide an export named: 'renderRecepcao'
  evidência: 2x | 17/11 16:55:56 → 17/11 16:55:59 | SyntaxError: The requested module '/js/ui/screens/flow-screens.js' doesn't provide an export named: 'renderRecepcao' | código atual: js/ui/screens/flow-screens.js exporta renderRecepcao
  sugestão: Adicione `export` à função renderRecepcao no módulo de origem ou corrija o import no módulo que a usa. Status: ATIVO (ocorreu perto do fim do log)
- [L-003] ALTO | Método inexistente (TypeError) | bloco: JS raiz (js/) | js/main.js:47
  problema: [LOG] TypeError: (intermediate value).setPhase is not a function
  evidência: 7x | 17/11 16:55:10 → 17/11 17:10:15 | TypeError: (intermediate value).setPhase is not a function | código atual: nenhuma chamada a .setPhase() (provável corrigido)
  sugestão: Confira o objeto no ponto indicado (console.log do tipo), a ordem de inicialização e o nome do método. Status: ATIVO (ocorreu perto do fim do log)
- [L-004] BAIXO | Path de asset/módulo | bloco: CSS monolítico (style.css) | style.css:0
  problema: [ACCESS.LOG] HTTP 404 em /style.css (22x)
  evidência: 22x | 15:58:15 → 16:06:36
  sugestão: Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 63 min (provável corrigido; confirme rodando de novo)
- [L-005] BAIXO | Chamada a API global inexistente | bloco: HTML (index.html) | index.html:1
  problema: [LOG] TypeError: window.OZ.fecharViewerLoja is not a function
  evidência: 12x | 17/11 15:37:56 → 17/11 15:40:29 | TypeError: window.OZ.fecharViewerLoja is not a function | código atual: window.OZ.fecharViewerLoja DEFINIDO
  sugestão: Registre `window.OZ.fecharViewerLoja = fecharViewerLoja` no módulo que define a função (ex.: instalarOZ) ou troque o onclick por addEventListener. Status: SEM RECORRÊNCIA há 90 min (provável corrigido; confirme rodando de novo)
- [L-006] BAIXO | Requisição abortada (rejeição não tratada) | bloco: JS raiz (js/) | js/:0
  problema: [LOG] Error in input stream
  evidência: 4x | 17/11 14:15:34 → 17/11 16:47:05 | Error in input stream
  sugestão: Adicione try/catch/.catch nos loaders e ignore AbortError/erros de cancelamento; trate como ruído de dev se só ocorre em reload. Status: SEM RECORRÊNCIA há 23 min (provável corrigido; confirme rodando de novo)
- [L-007] BAIXO | Erro de sintaxe (SyntaxError) | bloco: JS raiz (js/) | js/main.js:0
  problema: [LOG] SyntaxError: missing ) after formal parameters
  evidência: 11x | 17/11 14:48:46 → 17/11 15:03:50 | SyntaxError: missing ) after formal parameters | código atual: js/main.js passa na checagem de sintaxe
  sugestão: Rode `node --check` no arquivo, corrija parênteses/chaves/vírgulas na linha apontada e na anterior. Status: SEM RECORRÊNCIA há 126 min (provável corrigido; confirme rodando de novo)
- [L-008] BAIXO | Armazenamento bloqueado (SecurityError) | bloco: JS raiz (js/) | js/main.js:121
  problema: [LOG] SecurityError: The operation is insecure.
  evidência: 14x | 17/11 14:14:02 → 17/11 14:21:37 | SecurityError: The operation is insecure. | código atual: ainda há acesso a storage sem try/catch
  sugestão: Envolva todo acesso em try/catch com fallback em memória. Status: SEM RECORRÊNCIA há 168 min (provável corrigido; confirme rodando de novo)
- [L-009] BAIXO | Path de asset/módulo | bloco: Outros ((raiz)) | 01-tokens.css:0
  problema: [ACCESS.LOG] HTTP 404 em /01-tokens.css (3x)
  evidência: 3x | 16:13:12 → 16:13:21
  sugestão: Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)
- [L-010] BAIXO | Path de asset/módulo | bloco: Outros ((raiz)) | 02-reset.css:0
  problema: [ACCESS.LOG] HTTP 404 em /02-reset.css (3x)
  evidência: 3x | 16:13:12 → 16:13:21
  sugestão: Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)
- [L-011] BAIXO | Path de asset/módulo | bloco: Outros ((raiz)) | 03-layout.css:0
  problema: [ACCESS.LOG] HTTP 404 em /03-layout.css (3x)
  evidência: 3x | 16:13:12 → 16:13:21
  sugestão: Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)
- [L-012] BAIXO | Path de asset/módulo | bloco: Outros ((raiz)) | 04-panel.css:0
  problema: [ACCESS.LOG] HTTP 404 em /04-panel.css (3x)
  evidência: 3x | 16:13:12 → 16:13:21
  sugestão: Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)
- [L-013] BAIXO | Path de asset/módulo | bloco: Outros ((raiz)) | 05-hud.css:0
  problema: [ACCESS.LOG] HTTP 404 em /05-hud.css (3x)
  evidência: 3x | 16:13:12 → 16:13:21
  sugestão: Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)
- [L-014] BAIXO | Path de asset/módulo | bloco: Outros ((raiz)) | 06-modals.css:0
  problema: [ACCESS.LOG] HTTP 404 em /06-modals.css (3x)
  evidência: 3x | 16:13:12 → 16:13:21
  sugestão: Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)
- [L-015] BAIXO | Path de asset/módulo | bloco: Outros ((raiz)) | 07-screen.css:0
  problema: [ACCESS.LOG] HTTP 404 em /07-screen.css (3x)
  evidência: 3x | 16:13:12 → 16:13:21
  sugestão: Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)
- [L-016] BAIXO | Path de asset/módulo | bloco: Outros ((raiz)) | 08-boot-welcome.css:0
  problema: [ACCESS.LOG] HTTP 404 em /08-boot-welcome.css (3x)
  evidência: 3x | 16:13:12 → 16:13:21
  sugestão: Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)
- [L-017] BAIXO | Path de asset/módulo | bloco: Outros ((raiz)) | 09-loja.css:0
  problema: [ACCESS.LOG] HTTP 404 em /09-loja.css (3x)
  evidência: 3x | 16:13:12 → 16:13:21
  sugestão: Confira o caminho pedido pelo navegador x a estrutura real de pastas (maiúsculas, extensão, pasta). Se vem de @import/url() do CSS, o caminho é relativo ao CSS. Status: SEM RECORRÊNCIA há 57 min (provável corrigido; confirme rodando de novo)
- [L-018] BAIXO | Path de asset/módulo | bloco: Outros ((raiz)) | favicon.ico:0
  problema: [ACCESS.LOG] HTTP 404 em /favicon.ico (93x)
  evidência: 93x | 14:14:02 → 17:10:28
  sugestão: Adicione um favicon (`<link rel="icon" href="data:,">` resolve sem arquivo). Status: ATIVO (ocorreu perto do fim do log)
