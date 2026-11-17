# UX-01 — Verificações

## Atualização da rodada CORRIGIR — 15/11/2026

Estado atual: **IMPLEMENTADA SEM VERIFICAÇÃO COMPLETA**. Branch/HEAD iguais ao registro abaixo, com alterações locais preservadas. O registro original é mantido como histórico; resultados novos abaixo prevalecem nos cenários repetidos.

| Cenário repetido | Resultado atual |
|---|---|
| Lint | VERIFICADO — sem erros |
| Jest completo | VERIFICADO — 9 suítes, 37 testes |
| Build com TypeScript | VERIFICADO — compilação e geração estática aprovadas |
| Quatro telas × cinco larguras | VERIFICADO novamente — sem overflow horizontal e sem interseção de propriedades/lateral |
| Autosave, metadados, 409, falha de rede e recuperação | VERIFICADO novamente com API interceptada |
| Menu/setas/Escape/foco, vazio/erro e movimento reduzido | VERIFICADO novamente |
| Nome de arquivo longo em cinco larguras | FALHOU antes: 107 px disponíveis para 1656 px, nowrap. CORRIGIDO E VERIFICADO depois: texto contido no item, sem corte, em 320/375/768/1024/1440 |
| Link, remoção e adição de arquivo | VERIFICADO no teste de componente: nome completo, href e ID de remoção preservados |

Arquivos desta rodada: `EditorLayout.module.css`, novo `attachments-panel.test.tsx`, este relatório e `UX-01-correcoes.md`; capturas e medições da regressão foram renovadas. Detalhes da reprodução e causa em [UX-01-correcoes.md](UX-01-correcoes.md), UX01-010. Captura de nome longo em [UX-01-correcao-anexo-depois.png](evidencias/UX-01-correcao-anexo-depois.png).

Upload/download reais, persistência em banco real, leitor de tela, toque físico, IME e zoom nativo continuam **NÃO EXECUTADOS/BLOQUEADOS**, conforme as condições do registro original. Identificar PostgreSQL/MinIO ativos não equivale a validar esses serviços. Não há alegação de homologação integrada nesta rodada. Não avançar automaticamente de etapa.

## Registro da rodada anterior

15/11/2026. Código: árvore local não commitada sobre `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`, branch `refactor/cleanup-general`. Ambiente: Windows, PowerShell, Next 16.4.5/React 19.2.8, navegador Chromium via Playwright MCP. Frontend servido em `http://localhost:3001` por `npm.cmd run dev -- --port 3001`.

## Automação local

| Verificação | Resultado |
|---|---|
| `npm.cmd run lint` | VERIFICADO — sem erros |
| `npm.cmd test -- --runInBand --silent` | VERIFICADO — 8 suítes, 36 testes |
| `npx.cmd tsc --noEmit` | VERIFICADO na primeira rodada; build final também executa TypeScript |
| `npm.cmd run build` | VERIFICADO — compilação, TypeScript e geração estática aprovados |
| `git diff --check -- frontend/src/app frontend/AGENTS.md` | VERIFICADO — sem erros de whitespace; avisos de normalização LF/CRLF |

O primeiro build foi BLOQUEADO pelo download de Geist/Geist Mono; a repetição com acesso de rede autorizado passou. O Jest emite aviso preexistente sobre a opção deprecated `isolatedModules` do ts-jest; não foi removida validação para fazê-lo passar.

Regressões acrescentadas: propriedades pendentes não mostram “Salvo”; gravação explícita conserva o retorno à coleção; rascunho novo não aparenta persistido; Escape fecha menu e devolve foco sem navegar; evento de composição não executa saída. Testes existentes continuam cobrindo fila serializada, navegação, acesso indisponível, autenticação do cliente HTTP, extensões e portabilidade.

## Navegador e evidências

O script [UX-01-browser.js](evidencias/UX-01-browser.js) usa exclusivamente fixtures e interceptação HTTP de teste, fora do produto. Nenhuma nota pessoal foi usada nas capturas. [Resultados estruturados](evidencias/UX-01-browser-resultados.json) registram medidas, comportamentos e contrastes. Capturas `UX-01-{inicio,status,colecao,editor}-{320,1440}.png` estão no mesmo diretório.

| Cenário | Resultado e limite |
|---|---|
| Início, seleção de status, coleção e editor em 320/375/768/1024/1440 CSS px | VERIFICADO — 20 combinações sem overflow horizontal da página; propriedades sem interseção |
| Categoria e propriedades | VERIFICADO — categoria antes com 22 px; depois, 255 px em viewport 320 e ~221 px em 1440; altura de 44 px |
| Títulos extensos | VERIFICADO com fixture; campos editáveis preservam seu conteúdo |
| Estado pendente de metadados | VERIFICADO no navegador e Jest |
| Autosave e nova leitura HTTP | VERIFICADO contra API interceptada; não comprova banco real |
| Resposta 409 | VERIFICADO — aviso visível, URL e rascunho preservados |
| Falha de rede ao voltar | VERIFICADO — saída bloqueada; nova tentativa grava propriedades e sai |
| Menu: setas, Escape, foco | VERIFICADO — foco retorna ao acionador, sem saída acidental |
| Vazio e erro de coleção | VERIFICADO — criação e tentar novamente disponíveis |
| Movimento reduzido | VERIFICADO — transições desativadas |
| Tabela/quadro em 320 e 1440 | VERIFICADO — sem overflow da página; Enter no cartão do quadro abre a página |
| Entrada em 375 px | VERIFICADO — campos de 285 px em linhas separadas, submit enviado a endpoint interceptado, erro de autenticação visível |
| Ações móveis após correção final | VERIFICADO em 320/375/768/1024 — trilho termina em y=78, cabeçalho começa em y=364, sem interseção |
| Nomes longos de arquivos, upload/download reais | NÃO EXECUTADO nesta rodada |
| Carregamento com atraso controlado | NÃO EXECUTADO; carregamento normal observado |
| Leitor de tela e toque em dispositivo real | NÃO EXECUTADO |
| Zoom nativo de 200% | BLOQUEADO — Ctrl++ automatizado não mudou innerWidth nem devicePixelRatio; não foi substituído por CSS zoom |
| IME japonês real | NÃO EXECUTADO — só evento sintético de composição e texto japonês na fixture |
| Backend real, duas contas/abas, storage e restauração real de versões | NÃO EXECUTADO — esta rodada não provisionou ambiente integrado isolado |

Na primeira rodada, a categoria foi medida diretamente antes das alterações. Não foram obtidas capturas iniciais completas das quatro telas; não se apresenta o conjunto final como uma comparação visual completa antes/depois. As capturas são amostras de viewport, não comprovação isolada de acessibilidade.

## Contraste

Valores calculados a partir dos tokens efetivos no navegador: texto/fundo 15,31:1; texto secundário/superfície interativa 7,32:1; texto/botão de acento 8,40:1; borda de controle/superfície interativa 3,83:1; erro/superfície 9,80:1. Não constituem auditoria de todos os pares nem declaração de conformidade WCAG completa.

## Resultado

**IMPLEMENTADA SEM VERIFICAÇÃO COMPLETA.** Próxima ação: validar backend/storage isolados, zoom nativo, IME e leitor de tela; completar os cenários não executados e atualizar este relatório. Não avançar automaticamente para UX-02.
