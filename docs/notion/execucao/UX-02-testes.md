# UX-02 — Verificações

15/11/2026. Referência: árvore local não commitada sobre `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`, branch `refactor/cleanup-general`. **Critérios centrais da UX-02: VERIFICADOS.** Não é uma declaração de conformidade WCAG completa nem de homologação integrada de todas as etapas.

## Ambiente e isolamento

Windows/PowerShell; Next 16.4.5, React 19.2.8; frontend existente em `http://localhost:3001`. Playwright local com Chrome em contexto novo. O MCP estava ocupado e a CLI não estava no cache; usou-se o módulo Playwright já instalado, sem instalar dependências do produto. Uma tentativa de iniciar outro frontend retornou EADDRINUSE; o servidor existente foi reutilizado.

Integração: backend compilado desta árvore em `localhost:3027`, `NODE_ENV=test`, PostgreSQL local porta 5433, banco **novo e exclusivo** `biblioteca_test_ux02_20261115`. Aplicadas as 11 migrações existentes nesse banco. `DOTENV_CONFIG_PATH=NUL` no servidor de teste e JWT aleatório. Nenhuma credencial foi registrada nas evidências. Contas e páginas descartáveis foram criadas somente nesse banco. Não houve upload/storage nesta etapa.

O frontend manteve sua configuração existente. Na integração, Playwright encaminhou todas as chamadas de API ao backend local 3027 usando `route.fetch`; a resposta veio do servidor/PostgreSQL real, sem simular persistência. Nos testes de layout, todas as chamadas externas foram interceptadas por fixtures. Nenhuma mutação de teste foi enviada a produção.

## Checks automatizados

| Cenário | Estado / resultado |
|---|---|
| Lint frontend | VERIFICADO — sem erros/avisos de ESLint |
| Jest completo | VERIFICADO — 10 suítes, 44 testes |
| Build frontend | VERIFICADO — compilação, TypeScript e geração estática |
| Build backend para integração | VERIFICADO — compilação Nest |
| Leitura dos contratos e preservação de URLs legadas | VERIFICADO — inspeção + testes de rotas/histórico |
| Filtros combinados, ordenação e imutabilidade | VERIFICADO — `collection.test.ts` |
| Mudança de área e status, recarga, retorno à URL filtrada | VERIFICADO — Jest e navegador |
| Saída pela lateral com propriedades pendentes | VERIFICADO — Jest + nova leitura no backend real |
| Falha/409 impede saída e preserva rascunho | VERIFICADO — regressões existentes + navegador com resposta 409 controlada |
| Busca: Escape fecha somente a busca, retorna foco e preserva editor | VERIFICADO — Jest/navegador; marcador DOM da instância mantido |
| Início, coleção geral, coleção por status e editor × 320/375/768/1024/1440 | VERIFICADO — 20 combinações, sem overflow horizontal da página nem interseção entre propriedades |
| Tabela/quadro em 320 px | VERIFICADO — sem overflow da página; tabela conserva scroll próprio |
| Paginação HTTP e paginação visual | VERIFICADO — 25 fixtures em duas respostas HTTP; interface mostra 20 + 5, sem perder resultados |
| Ações: Enter, Escape e retorno de foco | VERIFICADO — expansor nativo |
| Arrastar em ordenação por nome | VERIFICADO — indisponível |
| Favoritos e lixeira vazia | VERIFICADO — fixtures; favorito também confirmado em banco real |
| Erro de coleção e tentar novamente | VERIFICADO — falha 500 controlada e recuperação |
| Zoom **nativo** 200% | VERIFICADO — coleção/editor; método e medidas abaixo |
| Contraste do item ativo da navegação | VERIFICADO — 6,98:1, cores computadas no navegador |

Comandos: `npm.cmd run lint`, `npm.cmd test -- --runInBand --silent`, `npm.cmd run build` em frontend; `npm.cmd run build` em backend. O aviso deprecated de `ts-jest isolatedModules` já existia. O primeiro build detectou a opção `exact` indevida em testes Testing Library novos; foi removida sem alterar as asserções e o build final passou.

## Persistência real

[Script](evidencias/ux02-integracao.cjs) e [resultado](evidencias/UX-02-integracao-resultados.json):

1. Coleção real com ambos os status e subpágina; mesmas páginas/IDs.
2. Filtro Estudado e recarga da URL legada mantêm a seleção.
3. Ordem manual por botão; novo GET confirma a ordem no banco.
4. Edição de título/corpo, navegação pela lateral, novo GET confirma ambos.
5. Abertura direta por UUID recupera título/corpo persistidos.
6. Favorito persistido aparece na coleção global.
7. Duplicação abre novo UUID e preserva JSON.
8. Excluir/restaurar mantém UUID e novo GET confirma `deletedAt=null`.

Dados de teste permanecem identificados no banco exclusivo; nenhum banco anterior foi apagado. O processo da API criado para esta validação foi encerrado ao final.

## Evidência visual e zoom

[Script de navegador](evidencias/ux02-browser.cjs), [resultados](evidencias/UX-02-browser-resultados.json), capturas `UX-02-{inicio,colecao,status,editor}-{320,1440}.png`. Capturas foram inspecionadas visualmente; as demais larguras têm medidas estruturadas. A captura inicial foi sobrescrita durante uma repetição e renomeada para `UX-02-intermediario.png`; ela é **intermediária**, não uma prova visual antes/depois. O diagnóstico inicial também está apoiado na inspeção direta do código e execução anterior à edição.

[Zoom](evidencias/ux02-zoom.cjs): Chromium 1194 instalado localmente, perfil temporário e extensão de teste chamando `chrome.tabs.setZoom(tabId, 2)`. Confirmados zoom=2, `devicePixelRatio` de 1 para 2 e `innerWidth` de 1440 para 720; não se usou CSS zoom nem apenas redução artificial de viewport. Coleção e editor apresentaram scrollWidth=720; propriedades sem interseção. Navegação recolhível aberta por botão e fechada por Escape, com foco devolvido. [Resultado](evidencias/UX-02-zoom-resultados.json) e capturas `UX-02-zoom-{colecao,editor}.png`.

Contraste medido do item ativo: texto `rgb(187,172,255)` / fundo `rgb(46,40,66)` = 6,9796:1. Demais tokens foram preservados da UX-01; não se afirma auditoria de todos os pares.

## Limites

- **NÃO EXECUTADO:** leitor de tela, toque em dispositivo físico e avaliação com usuários. Testes de teclado e navegador não equivalem a esses ensaios.
- **NÃO EXECUTADO:** IME japonês real. Não foram alterados comandos do documento; a proteção de composição/atalhos tem regressão sintética, sem ser apresentada como IME real.
- **NÃO EXECUTADO nesta etapa:** upload/download, exportação/restauração de versões e concorrência real entre duas contas/abas. Regressões frontend existentes passaram; 409 desta rodada foi controlado. Persistência de conteúdo e operações de coleção foi validada no banco real.
- **NÃO EXECUTADO:** carga com milhares de páginas; agregação no cliente tem custo proporcional ao tamanho da coleção.

Esses limites permanecem visíveis para homologação integrada e não são reportados como aprovados. Não houve avanço para UX-03.
