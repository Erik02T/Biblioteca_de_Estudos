# UX-05 — Verificações e evidências

## Rodada CORRIGIR — 16/11/2026

Entrada: [UX-04-testes.md](UX-04-testes.md). Entrega pedida: [UX-01-correcoes.md](UX-01-correcoes.md), referente à UX-05. Branch `refactor/cleanup-general`, HEAD `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`, árvore local não commitada; [manifesto atual](../../../output/playwright/UX-05-correcao-codigo.sha256). Nenhuma etapa seguinte iniciada. **Correções verificadas; aceite integral pendente.**

### Ambiente e método

Windows/PowerShell, Node 24.13.0, npm 11.6.2, Next 16.4.5 e dependências existentes. `frontend/AGENTS.md`, guia local de Jest do Next e skill Playwright consultados. Frontend desta árvore iniciado em `127.0.0.1:3001`, acessado pelo Chrome/Chromium em `localhost:3001`. Sem instalação de dependências do produto.

A inspeção inicial de Docker no sandbox falhou por acesso a configuração/pipe. `docker ps` de leitura fora do sandbox confirmou PostgreSQL e MinIO ativos; o bloqueio inicial **foi superado**. Backend compilado desta árvore e executado em 3033 com NODE_ENV=test e JWT efêmero pelo launcher existente. Banco exclusivo de teste `biblioteca_test_ux05_20261115` reutilizado sem apagar dados anteriores; novas contas e buckets `ux05-*`. [Ambiente de integração](../../../output/playwright/UX-05-correcao-ambiente.json). API de teste reiniciada entre blocos e integração, preservando o limitador do produto; encerrada depois das verificações. Frontend deixado disponível.

Roteiro de composição e matriz visual usam fixtures HTTP interceptadas; não comprovam persistência real. Roteiros de blocos/integração encaminham ao backend local e verificam novos GETs no PostgreSQL; upload/download e ZIP usam MinIO real. Nenhum request de teste foi enviado à API externa e nenhum material pessoal foi usado. Artefatos históricos preservados com `UX_ARTIFACT_PREFIX=UX-05-correcao`.

### Reprodução e correção

| ID | Antes de editar | Revalidação |
|---|---|---|
| UX05-011 / P1 / interação | Em 1440×900: Escape sintético 229, sem `isComposing`, sai do foco ou fecha Propriedades. Esperado: preservar camada/campo e não consumir evento de composição. Causa: handlers externos só verificavam `isComposing`. | **VERIFICADO** após guard 229 na captura e propagação do layout. Mesmos casos e variante `isComposing=true` passaram em 1440 e 375. |
| UX05-012 / P1 / interação | Menu da página: seta muda foco e Escape fecha durante composição nas duas sinalizações. Causa: handler de setas e listener de Escape em `document` sem proteção completa. | **VERIFICADO** após guard nos dois handlers. Setas/Home/End/Escape normais continuam operantes. |

[Roteiro](../../../output/playwright/ux05-correcao-ime.cjs); [antes: seis falhas/oito observações](../../../output/playwright/UX-05-correcao-ime-antes.json); [depois 1440](../../../output/playwright/UX-05-correcao-ime-depois.json); [depois 375](../../../output/playwright/UX-05-correcao-ime-depois-375.json). Cada execução posterior confirma oito observações de composição e 17 checks de regressão. Capturas comparáveis: menu 1440 [antes](../../../output/playwright/UX-05-correcao-antes-229.png)/[depois](../../../output/playwright/UX-05-correcao-depois-229.png). As correções não alegam validar IME físico.

### Resultados atuais

| Verificação | Estado / evidência |
|---|---|
| Jest original | **VERIFICADO**: 13 suítes/79 testes antes de acrescentar regressões. |
| Novas regressões antes da correção | **FALHOU**, como esperado: três dos quatro testes novos falham; [log](../../../output/playwright/UX-05-correcao-jest-antes.txt). |
| Jest final | **VERIFICADO**: 13 suítes/**83 testes**; [log](../../../output/playwright/UX-05-correcao-jest-depois.txt). Nenhuma asserção removida. |
| Lint, tipos e build frontend | **VERIFICADO**: [lint](../../../output/playwright/UX-05-correcao-lint.txt), [tipos](../../../output/playwright/UX-05-correcao-tipos.txt), [build](../../../output/playwright/UX-05-correcao-build.txt). Exit 0; aviso preexistente de `ts-jest isolatedModules` permanece. |
| Build backend | **VERIFICADO**: `npm.cmd run build`/Nest, exit 0; produto backend sem alterações nesta rodada. |
| Regressões UX04-001 a UX04-005, comandos e conteúdo | **VERIFICADO**, [49 checks com servidor real](../../../output/playwright/UX-05-correcao-blocos-browser-resultados.json): seleção/link/negrito, H6, código com language, tarefas aninhadas, alternante, undo/redo, `/`, materiais/IDs, recarga e conflito 409. Guard preserva JSON incompatível. |
| Jornada integrada | **VERIFICADO**, [46 checks reais](../../../output/playwright/UX-05-correcao-integracao-resultados.json): cadastro, criação, autosave/propriedades, loading/erro/retry, seleção/instância, upload/download, versões/restauração/segurança, ZIP com arquivo, histórico, favorito, duplicação pendente, lixeira/restauração, isolamento entre contas, falha de rede/recuperação e 409 sem sobrescrever servidor. |
| Responsividade e foco | **VERIFICADO**, [matriz](../../../output/playwright/UX-05-correcao-visual-depois.json): 20 pares documento/ferramenta nas cinco larguras, mais cinco com material longo, sem overflow horizontal nem sobreposição dos controles. Tab/Shift+Tab em modal e Escape retornam foco; mesma instância DOM. |
| Zoom 200%, contraste e movimento reduzido | **VERIFICADO**, [resultado](../../../output/playwright/UX-05-correcao-zoom-resultados.json): `chrome.tabs.setZoom`, DPR 1→2, 1440→720 CSS px e scrollWidth=720. Menu dentro da tela, contraste 16,02:1 e transição 0s. Não se usou CSS zoom. |
| Toque | **VERIFICADO** somente com `hasTouch`/`tap` no roteiro de blocos. |
| Capturas e exceções | **VERIFICADO**: menu desktop, [Propriedades 320](../../../output/playwright/UX-05-correcao-depois-Propriedades-320.png) e [zoom](../../../output/playwright/UX-05-correcao-zoom-200.png) inspecionados; zero `pageerror` nos roteiros finais. |

Reprodução da raiz: definir `UX_ARTIFACT_PREFIX=UX-05-correcao`; executar `node output/playwright/ux05-server.cjs`, depois `ux05-blocos.cjs` e `ux05-integracao.cjs` sequencialmente, reiniciando somente a API isolada entre eles para iniciar a contagem de rate limit de cada rodada. `node output/playwright/ux05-correcao-ime.cjs depois` usa fixtures, independentemente da API; com `UX_TEST_WIDTH=375`, usar fase `depois-375`. Matriz: `node output/playwright/ux05-visual.cjs depois`; zoom: `node output/playwright/ux05-zoom.cjs`. Em frontend: `npm.cmd test -- --runInBand --silent`, `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npm.cmd run build`.

### Pendências de aceite

- **NÃO EXECUTADO**: IME japonês real, candidatos e Enter/Escape/atalhos durante composição. Sintéticos não cobrem essa condição.
- **FALHOU — requisito funcional pendente da UX-04**: inserir/renderizar mídia, arquivos e referências por ID no corpo. Reproduzido: schema não registra os tipos e não há comando de inserção. Novo GET prova preservação do JSON pelo guard, sem aprovar suporte funcional. Mantido como entrega original pendente, conforme a direção; não se ampliou esta correção para implementar um novo conjunto de blocos.
- **NÃO EXECUTADO**: leitor de tela, toque físico, avaliação com usuários, outros motores, benchmark de produção e suíte backend completa. Sem alegação de WCAG completa.

Próximo passo exato: ainda na UX-05, ensaiar IME real/leitor de tela e completar mídia/referências com revalidação do documento misto editável e recarga. **Etapa não concluída integralmente.**

## Histórico — rodada de 15/11/2026

15/11/2026. Código: árvore local não commitada sobre `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`, branch `refactor/cleanup-general`. [Hashes finais](../../../output/playwright/UX-05-codigo.sha256).

**Resultado: verificações técnicas abaixo aprovadas; aceite integral pendente dos limites explícitos no final.** Não se declara conformidade WCAG completa ou teste com usuários.

## Ambiente e isolamento

Windows/PowerShell, Node 24.13.0, Next 16.4.5, React 19.2.8, Tiptap existente. Frontend local `localhost:3001`; Chrome/Chromium automatizado pelo módulo Playwright já disponível, sem dependências novas do produto. `npx` disponível. Guias locais do Next sobre Jest consultados conforme `AGENTS.md`.

Backend desta árvore compilado com Nest e iniciado em `localhost:3033`, `NODE_ENV=test`, JWT aleatório e configuração explícita de teste. Banco **biblioteca_test_ux05_20261115**, criado nesta rodada no PostgreSQL local porta 5433; migrations aplicadas somente nesse banco. MinIO local porta 9000, buckets exclusivos com prefixo `ux05-` e UUID, usando configuração local sem expor credenciais. O launcher recusa banco fora de localhost/127.0.0.1:5433 e só habilita storage em hostname local.

Cada execução cria contas descartáveis. Requests do navegador para a API configurada são interceptados e encaminhados ao servidor local por `route.fetch`; persistência não é simulada no roteiro integrado nem no de blocos. Somente falhas de transporte/listagem são injetadas para testar recuperação. Os roteiros de layout, coleções e zoom usam fixtures HTTP e não comprovam persistência. Nenhum conteúdo pessoal ou requisição de teste foi enviado à API externa.

A API de teste foi reiniciada entre rodadas para não acumular o rate limit, sem modificar a proteção do produto. Na jornada integrada, tráfego do navegador e leituras de conferência usam loopbacks IPv6/IPv4 distintos, ambos locais, mantendo o limitador ativo. Banco e fixtures não foram apagados. Ao encerrar, a API criada para os testes foi parada; frontend preexistente preservado. O arquivo `UX-05-ambiente.json` registra a última inicialização do launcher, não uma promessa de serviço ainda ativo.

## Checks de código

| Verificação | Estado / evidência |
|---|---|
| Jest inicial | VERIFICADO — 13 suítes, 72 testes anteriores |
| Jest final | VERIFICADO — 13 suítes, **79 testes**, incluindo sete regressões novas; [log](../../../output/playwright/UX-05-jest.txt) |
| Lint frontend | VERIFICADO — sem erros/avisos ESLint; [log](../../../output/playwright/UX-05-lint.txt) |
| `tsc --noEmit` | VERIFICADO — [log](../../../output/playwright/UX-05-tipos.txt), exit 0 |
| Build frontend | VERIFICADO — compilação, TypeScript e geração estática; [log](../../../output/playwright/UX-05-build.txt) |
| Build backend | VERIFICADO — `npm.cmd run build` para executar integração; backend de produto sem alterações nesta rodada |
| Whitespace | VERIFICADO — `git diff --check -- frontend/src/app`; apenas avisos de normalização LF/CRLF |

Comandos em frontend: `npm.cmd test -- --runInBand --silent`, `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npm.cmd run build`. Aviso preexistente do `ts-jest isolatedModules` permanece; no PowerShell, stderr aparece como `NativeCommandError` no log, mas o processo terminou com exit 0 e 79 testes aprovados. A primeira checagem de tipos detectou `exact` inadequado numa chamada de Testing Library acrescentada; corrigido o teste e repetidos tipos/build com sucesso.

## Jornadas e interação

| Cenário | Estado / evidência |
|---|---|
| Cadastro real, criação de página, título, categoria e japonês | VERIFICADO — interface e novo GET no servidor |
| Rascunho, conteúdo pendente, autosave e propriedades pendentes | VERIFICADO — estados honestos; rascunho nunca indica Salvo |
| Aplicar propriedades, salvar ao navegar e restaurar foco | VERIFICADO — persistência real, mesmo ID e permanência no editor ao aplicar |
| Falha de rede, saída recusada e tentativa posterior | VERIFICADO — texto continua no editor, nova tentativa persiste e limpa o aviso anterior |
| Conflito real | VERIFICADO — PATCH externo torna revisão obsoleta; autosave retorna 409, mantém texto local e não sobrescreve servidor |
| Formatar texto selecionado e abrir ferramentas | VERIFICADO — seleção e instância DOM mantidas |
| Materiais/versões/modelos: loading, erro e nova tentativa | VERIFICADO — falhas injetadas só no transporte; recuperação consulta servidor real; vazio só após sucesso |
| Upload e download | VERIFICADO — PDF de teste enviado pela interface ao MinIO; URL assinada recupera exatamente os mesmos bytes |
| Versões | VERIFICADO — criar, pré-visualizar, exigir confirmação, restaurar conteúdo e produzir versão de segurança; materiais preservados |
| Exportar | VERIFICADO — ZIP baixado pela interface, descompactado e conferido: documento e arquivo real; [pacote sintético](../../../output/playwright/UX-05-exportacao.zip) |
| Histórico e links diretos | VERIFICADO — ID original, recarga, Voltar/Avançar e preservação de filtros |
| Favoritos, duplicação com propriedades pendentes, lixeira/restauração | VERIFICADO — novos GETs, novo ID para cópia e mesmo ID após restauração |
| Isolamento entre contas | VERIFICADO — outra conta recebe 404 em página, materiais, versões e exportação |
| Blocos | VERIFICADO — 49 checks novos sobre roteiro anterior: H6, japonês, links, código, tarefas aninhadas, alternante, inserir/transformar/mover/duplicar, undo/redo, recarga e conflito |
| Conteúdo ainda não suportado | VERIFICADO — edição destrutiva bloqueada e JSON/IDs preservados ao gravar metadados; não significa suporte a mídia/referências no corpo |
| Coleções | VERIFICADO — 39 checks: paginação, status, URL antiga, busca, favoritos, ordenação manual, menu por teclado, falhas recuperáveis, tabela/quadro |
| Exceções JS | VERIFICADO — nenhuma `pageerror` nos roteiros finais integrado, blocos e visual |

Roteiro integrado: [script](../../../output/playwright/ux05-integracao.cjs), [46 verificações](../../../output/playwright/UX-05-integracao-resultados.json). Blocos: [script](../../../output/playwright/ux05-blocos.cjs), [49 verificações](../../../output/playwright/UX-05-blocos-browser-resultados.json). Coleções: [script](../../../output/playwright/ux05-colecoes.cjs), [39 verificações](../../../output/playwright/UX-05-colecoes-browser-resultados.json). Launcher: [ux05-server.cjs](../../../output/playwright/ux05-server.cjs). Executar da raiz com Node; o launcher requer configuração local válida, sem usar serviço externo.

## Visual, responsividade e acessibilidade

| Cenário | Estado / evidência |
|---|---|
| 320, 375, 768, 1024 e 1440 CSS px | VERIFICADO — início, coleção, endereço legado de status, documento, ferramentas e materiais; sem rolagem horizontal da página |
| Propriedades | VERIFICADO — nenhum controle sobreposto antes/depois; painel dentro do viewport, com scroll próprio quando necessário |
| Largura de leitura e painel desktop | VERIFICADO — documento não coberto pelo painel não modal; ferramentas modais nas larguras menores |
| Alvos | VERIFICADO — propriedades/formatação com altura >=44px; menu de bloco >=44px; remoção de material 44×44px |
| Nomes longos | VERIFICADO — título extenso e arquivo sem espaços; arquivo/link usa largura inteira do painel e preserva nome completo |
| Teclado e foco | VERIFICADO — Tab/Shift+Tab circulam em modais, Escape retorna ao acionador, menu usa setas/Home/End; painel desktop não é modal |
| Semântica | VERIFICADO — um único `main`, região de editor nomeada e estados ativos anunciáveis por `aria-pressed` |
| Contraste computado | VERIFICADO — corpo e título 15,31:1; estado Salvo 8,82:1; texto do botão principal 8,40:1; menu 16,02:1. Medição desses pares, não auditoria de todos os conteúdos do usuário |
| Zoom nativo 200% | VERIFICADO — `chrome.tabs.setZoom(tabId, 2)` via extensão local existente; DPR 1→2, largura CSS 1440→720, scrollWidth=720; menu dentro da tela |
| Movimento reduzido | VERIFICADO — preferência reduce, duração de transição 0s no menu |
| Toque | VERIFICADO em contexto `hasTouch` e `tap`; não equivale a aparelho físico |
| Desempenho observado | VERIFICADO apenas como observação: edição→Salvo de 916ms na jornada local, incluindo debounce de 700ms e servidor. Não é benchmark de produção ou medição com usuários |

Matriz: [script](../../../output/playwright/ux05-visual.cjs), [antes](../../../output/playwright/UX-05-visual-antes.json), [depois](../../../output/playwright/UX-05-visual-depois.json). Mesma fixture e dimensões na comparação do documento/propriedades. [Antes 320](../../../output/playwright/UX-05-antes-Propriedades-320.png), [depois 320](../../../output/playwright/UX-05-depois-Propriedades-320.png), [documento 1440](../../../output/playwright/UX-05-depois-documento-1440.png), [material final 320](../../../output/playwright/UX-05-material-final-320.png), [conflito real](../../../output/playwright/UX-05-conflito-real.png). Capturas inspecionadas visualmente. O nome do arquivo é de teste.

Zoom: [script](../../../output/playwright/ux05-zoom.cjs), [resultado](../../../output/playwright/UX-05-zoom-resultados.json), [captura](../../../output/playwright/UX-05-zoom-200.png). Chromium 1194 com extensão local preexistente; não foi usado CSS zoom ou somente redução do viewport.

## Intercorrências e limites

Falhas de roteiro foram distinguidas dos defeitos do produto: seleção do input de capa em vez do seletor real de arquivo (corrigida para evento `filechooser`); espera pela restauração antes de a requisição terminar (corrigida aguardando fechamento do diálogo e reabrindo o ID); rate limit acumulado (reinício só da API isolada); seletor de mensagem de conflito com flexão incorreta. Evidências intermediárias `UX-05-falha-integracao.png` não representam a entrega final. As falhas reais e suas causas constam em [correções](UX-05-correcoes.md).

- **NÃO EXECUTADO:** Microsoft IME/equivalente real, candidatos, Enter/Escape e atalhos durante composição. Eventos sintéticos preservaram JSON e não dispararam comandos, mas não comprovam IME físico.
- **NÃO EXECUTADO:** leitor de tela, toque físico e avaliação formativa com pessoas; necessários para fechar a avaliação prática da direção de UX.
- **PENDENTE FUNCIONAL DA UX-04:** inserir/renderizar mídia e referências por ID no corpo. Materiais no painel, snapshots e exportação foram verificados; guard de compatibilidade preserva o original, sem substituir essas entregas.
- **NÃO EXECUTADO:** benchmark de produção e navegação em outros motores de browser. A cobertura automatizada foi em Chrome/Chromium.
- **NÃO EXECUTADO nesta rodada:** suíte backend completa ou novos testes e2e backend independentes. O backend foi compilado e exercitado por HTTP/PostgreSQL/MinIO reais nas jornadas descritas.

O fechamento desta rodada não concede aceite integral à UX-05. Próximo passo: IME real/leitor de tela e pendências funcionais indicadas, seguidos de revalidação integrada; nenhuma etapa seguinte iniciada.
