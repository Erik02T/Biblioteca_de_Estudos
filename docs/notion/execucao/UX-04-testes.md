# UX-04 — Verificações e evidências

## Revalidação de entrada na rodada CORRIGIR / UX-05 — 16/11/2026

O usuário indicou este relatório como entrada da UX-05. O registro de 15/11 está preservado abaixo. A rodada atual identifica o código pelo [manifesto SHA-256](../../../output/playwright/UX-05-correcao-codigo.sha256), na mesma branch/HEAD e com mudanças locais não commitadas. [Entrega de correções solicitada](UX-01-correcoes.md).

| Cenário do relatório | Resultado atual |
|---|---|
| UX04-001/002/003: título atual do alternante, renomeações independentes no undo, toggle sem reverter histórico | **VERIFICADO**, sem regressão reproduzida: editor real, navegador e nova leitura HTTP/PostgreSQL. |
| UX04-004: JSON com mídia/referência não suportada | **VERIFICADO** somente quanto à preservação: metadados gravados e JSON integral mantido em novo GET. Inserção/renderização no corpo continua **FALHOU — requisito funcional pendente**. |
| UX04-005: Escape de menu antes de sair do foco | **VERIFICADO** no navegador; teclado normal e retorno de foco preservados. |
| Composição sintética, camadas externas | **FALHOU antes / VERIFICADO depois**: seis de oito observações falhavam; Escape 229 fechava ferramenta/foco, e o menu da página capturava setas/Escape em composição. Corrigidos UX05-011/012, sem reabrir os defeitos anteriores. |
| Composição japonesa real | **NÃO EXECUTADO**. Os novos testes sintéticos não substituem IME real. |
| Fluxos anteriormente não executados: upload/download, versões/exportação, isolamento entre contas | **VERIFICADO nesta UX-05** com HTTP/PostgreSQL/MinIO locais reais; não se transfere essa aprovação para mídia no corpo. |

Evidências atuais: [49 checks de blocos](../../../output/playwright/UX-05-correcao-blocos-browser-resultados.json), [46 de integração](../../../output/playwright/UX-05-correcao-integracao-resultados.json), composição [antes](../../../output/playwright/UX-05-correcao-ime-antes.json)/[depois](../../../output/playwright/UX-05-correcao-ime-depois.json) e [mobile](../../../output/playwright/UX-05-correcao-ime-depois-375.json). Lint/tipos/build e 83 testes passaram. Cinco larguras, zoom nativo 200%, seleção, instância, undo/redo e conflito real revalidados; detalhes em [UX-05-testes.md](UX-05-testes.md).

**Aceite integral permanece pendente** de IME real e suporte funcional a mídia/referências no corpo. Não foi iniciada outra etapa após a UX-05.

## Histórico — rodada UX-04 de 15/11/2026

15/11/2026. Referência: árvore local não commitada sobre `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`, branch `refactor/cleanup-general`. [Hashes do código](../../../output/playwright/UX-04-codigo.sha256).

**Resultado: implementação dos comandos verificada; aceite integral da UX-04 pendente.** O ensaio com IME real não foi executado e mídia/referências dentro do corpo continuam como entregas originais pendentes. Não se declara conformidade WCAG completa.

## Ambiente e isolamento

Windows/PowerShell, Node 24.13.0, Next 16.4.5, React 19.2.8, Tiptap 3.31.x. Frontend iniciado nesta rodada em `localhost:3001`. Playwright MCP para inspeção inicial e comparação visual; módulo Playwright local com Chrome para o roteiro reproduzível, seguindo o precedente do projeto sem instalar dependências do produto. `npx` está disponível.

Backend desta árvore compilado com Nest e executado em `localhost:3029`, NODE_ENV=test, JWT aleatório e `DOTENV_CONFIG_PATH=NUL`. Banco local exclusivo **biblioteca_test_ux04_20261115**, criado nesta rodada em PostgreSQL `localhost:5433`; migrações existentes aplicadas somente nesse banco. Contas e dados descartáveis permanecem nele; nenhum banco anterior foi apagado.

O navegador encaminhou as chamadas de API ao backend local com `route.fetch`: persistência verificada com HTTP/PostgreSQL reais. Conteúdo e alterações de teste não foram enviados à API externa configurada no frontend. Não houve upload a storage ou acesso a materiais pessoais. Ao final, o processo de API de teste foi encerrado; o frontend local foi mantido disponível.

## Verificações finais

| Cenário | Estado e evidência |
|---|---|
| Lint frontend | VERIFICADO — sem erros/avisos ESLint |
| Jest completo | VERIFICADO — 13 suítes, **72 testes** |
| Tipos e build frontend | VERIFICADO — `tsc --noEmit` e build Next; compilação e geração estática |
| Build backend para integração | VERIFICADO — Nest; produto backend sem alterações nesta rodada |
| `/` filtra e insere código; H1–H6, listas, tarefas, citação, destaque, alternante e divisor | VERIFICADO — inserção dos 15 tipos em testes reais de editor; `/codigo` no navegador |
| Barra em código/texto normal e seleção não elegível | VERIFICADO — regressões; código no navegador permanece literal |
| Menu sem resultados; Escape conserva texto | VERIFICADO — navegador |
| Duplicar, mover, excluir e limites do documento | VERIFICADO — testes de editor real; duplicar/mover também no navegador |
| Undo/redo e separação entre ação e digitação | VERIFICADO — testes de transações e navegador |
| Conversão preserva seleção invertida, marcas e links | VERIFICADO — editor real; seleção/link/negrito também no navegador |
| Conversão que apagaria marcas ou estrutura | VERIFICADO — recusada; opção Código desabilitada no navegador |
| Alternante: renomear por botão/F2 e usar título atual | VERIFICADO — regressão e navegador |
| Alternante: abrir/fechar e desfazer sem evento nativo reverter o histórico | VERIFICADO — regressão, navegador e novo GET |
| Documento misto com japonês, H6, código com language, tarefas aninhadas e links | VERIFICADO — edição, autosave, nova leitura HTTP e recarga do navegador |
| Materiais e `targetPageId` | VERIFICADO — IDs reais preservados após operações de bloco e recarga |
| Instância do editor | VERIFICADO — marcador DOM retido durante comandos e abertura/fechamento de Materiais |
| 320, 375, 768, 1024 e 1440 CSS px | VERIFICADO — scrollWidth igual ao viewport; menu inteiro dentro da tela, com scroll próprio |
| Alvos dos itens de menu | VERIFICADO — altura mínima 44px nas cinco larguras |
| Teclado: Home/End, setas, Enter e Escape | VERIFICADO — menu e retorno de foco; Escape fecha menu antes do modo foco/página |
| Toque | VERIFICADO em contexto Chrome `hasTouch` usando `tap`, sem depender de hover; não equivale a dispositivo físico |
| Zoom nativo 200% | VERIFICADO — método e medidas abaixo |
| Contraste do menu e movimento reduzido | VERIFICADO — 16,02:1 para texto normal; preferência reduce e duração de transição 0s |
| Composição sintética | VERIFICADO — `isComposing`/229, barra/Enter/seta/Escape sem captura, abertura de menu ou mudança do JSON; não comprova IME real |
| Conflito concorrente real | VERIFICADO — atualização externa por HTTP antes da edição; PATCH do autosave retorna **409**; texto local e undo permanecem, servidor não recebe o texto pendente |
| Corpo com mídia/referências/atributos sem suporte | VERIFICADO — testes de compatibilidade; navegador bloqueia edição e mantém JSON completo ao salvar metadados, conferido por novo GET |
| Exceções JavaScript | VERIFICADO — nenhuma `pageerror` no roteiro final |

Comandos em frontend: `npm.cmd test -- --runInBand --silent`, `npm.cmd run lint`, `npx.cmd tsc --noEmit`, `npm.cmd run build`. Em backend: `npm.cmd run build`. Roteiros: `node output/playwright/ux04-server.cjs`, `node output/playwright/ux04-browser.cjs`, `node output/playwright/ux04-zoom.cjs`, executados da raiz. O launcher só aceita URL de banco local porta 5433; não registra credenciais. O aviso preexistente de depreciação de `ts-jest isolatedModules` permanece.

## Artefatos

- [Roteiro navegador/API](../../../output/playwright/ux04-browser.cjs), [resultado com 49 verificações](../../../output/playwright/UX-04-browser-resultados.json), [launcher isolado](../../../output/playwright/ux04-server.cjs).
- [Zoom nativo](../../../output/playwright/ux04-zoom.cjs) e [resultado](../../../output/playwright/UX-04-zoom-resultados.json). Extensão de teste existente chama `chrome.tabs.setZoom(tabId, 2)` em Chromium 1194. Confirmados DPR 1→2 e innerWidth 1440→720, com scrollWidth=720. Não se usou CSS zoom nem apenas viewport reduzido. [Captura](../../../output/playwright/UX-04-zoom-200.png).
- Comparação com a **mesma fixture** e viewport 1920×907: [antes](../../../output/playwright/UX-04-antes-1920.png) e [depois](../../../output/playwright/UX-04-depois-1920-comparacao.png). Os nomes e dados são exclusivamente de teste. Não são os dados do protótipo HTML.
- Documento final: [1440](../../../output/playwright/UX-04-documento-1440.png) e [320](../../../output/playwright/UX-04-documento-320.png). Menu: [1440](../../../output/playwright/UX-04-depois-1440.png) e [320](../../../output/playwright/UX-04-depois-320.png). Capturas de documento e menu foram inspecionadas visualmente; demais larguras têm medidas estruturadas.
- Regressões: `block-commands.test.ts`, `editor-document.test.ts`; suítes anteriores preservadas. `navigation.test.tsx` passou a usar o schema real e mockar apenas o novo CSS, mantendo suas asserções.

## Intercorrências e correções da verificação

As primeiras execuções encontraram agrupamento de renomeações consecutivas no undo; corrigido com fronteiras de histórico e revalidado. A leitura stale de atributos e a redundância dos eventos nativos do alternante também foram tratadas.

Repetições atingiram o rate limit do servidor isolado; reiniciado somente esse processo para a rodada final, sem desativar proteção do produto. O roteiro foi corrigido para aguardar a confirmação dos prompts, comparar objetos JSON estruturalmente (JSONB pode ordenar chaves) e selecionar o alerta do editor, distinguindo-o do route announcer do Next. Essas falhas do roteiro não foram apresentadas como defeitos do produto. A proteção de compatibilidade recebeu rótulos UTF-8 corrigidos durante a implementação. A evidência final corresponde ao código com essas correções.

## Limites e critérios ainda não cobertos

- **NÃO EXECUTADO:** composição japonesa com IME físico, candidatos, Enter/Escape durante composição e atalhos reais. Ferramentas desta sessão não fornecem uma sessão de IME físico comprovável. Necessário para aceite integral da UX-04.
- **NÃO EXECUTADO:** leitor de tela, dispositivo físico de toque e avaliação com usuários. Automação/contraste não substituem esses ensaios.
- **PENDENTE FUNCIONAL:** inserir/renderizar mídia, arquivos e referências por ID dentro do corpo. Os tipos não existiam no frontend; foram registrados conforme a especificação. O guard preserva o original e o painel de materiais permanece funcional, mas isso não aprova a jornada de mídia no corpo.
- **NÃO EXECUTADO nesta rodada:** upload/download real no storage, exportação/restauração de versões e teste entre contas diferentes. Esses fluxos não foram alterados; suítes frontend existentes passaram. A concorrência testada foi a revisão da mesma página por HTTP em sessão isolada.

O próximo passo permanece na UX-04: cobrir IME real e as entregas originais acima. Nenhuma execução automática da UX-05 foi realizada.
