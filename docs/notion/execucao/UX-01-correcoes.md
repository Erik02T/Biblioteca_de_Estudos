# UX-01 — Correções e revalidação

## Entrega solicitada — CORRIGIR / UX-05 — 16/11/2026

Este arquivo é a entrega `UX-01-correcoes.md` solicitada pelo usuário para a **etapa UX-05**, tendo [UX-04-testes.md](UX-04-testes.md) como entrada. O nome do arquivo não muda a etapa executada. O histórico da UX-01 permanece abaixo. Nenhuma etapa seguinte foi iniciada.

**Resultado: duas falhas de interação corrigidas e verificadas; aceite integral da UX-05 pendente.** A referência é a árvore local não commitada da branch `refactor/cleanup-general`, sobre HEAD `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`. [Manifesto SHA-256 desta rodada](../../../output/playwright/UX-05-correcao-codigo.sha256). Mudanças anteriores preservadas, sem commit, push, merge ou deploy.

O relatório de entrada não continha defeitos abertos nos comandos anteriormente corrigidos. UX04-001/002/003/004/005 foram repetidos sem reproduzir regressão. A investigação da cobertura de composição encontrou as duas falhas adicionais abaixo, reproduzidas **antes** de alterar o produto.

| ID / prioridade / classe | Reprodução, esperado e observado | Causa confirmada e alteração | Resultado |
|---|---|---|---|
| UX05-011 / P1 / interação | Em 1440×900, ativar Modo foco e despachar Escape com `isComposing=false`, `keyCode=229` no editor. Repetir em Categoria com Propriedades abertas. Deveria preservar a camada e deixar a composição tratar o evento; saía do foco ou fechava a ferramenta, consumindo Escape. | `EditorLayout.tsx`: captura e propagação verificavam somente `isComposing`. Ambos agora ignoram também 229, como os comandos de bloco e o atalho global já faziam. | **VERIFICADO**: mesmas condições passam depois; também verificadas em 375×900. Campo, documento e instância preservados. Escape normal continua fechando a camada e retornando foco. |
| UX05-012 / P1 / interação | Abrir Mais opções da página, focar Exportar, despachar seta/Escape durante `isComposing=true` e durante 229 sem `isComposing`. Setas moviam o foco e Escape fechava o menu. | `ActionRail`, no mesmo arquivo: handler de setas não tinha guard; listener de Escape no `document` não verificava composição. Os dois agora ignoram ambas as sinalizações antes de agir. | **VERIFICADO**: oito verificações sintéticas de composição passam em desktop e mobile; teclado normal, Home/End, setas e Escape mantidos. |

O roteiro inicial encontrou seis falhas em oito verificações sintéticas. Quatro regressões parametrizadas foram adicionadas a `editor-layout.test.tsx`: antes do ajuste, três falhavam e uma passava; depois, todas passaram. Nenhum teste foi desativado ou critério reduzido. A mudança do produto se restringe aos quatro handlers em `EditorLayout.tsx`; não modifica schema, contratos de API, JSON ou persistência.

### Evidências e regressões

- [Roteiro de reprodução](../../../output/playwright/ux05-correcao-ime.cjs), [antes](../../../output/playwright/UX-05-correcao-ime-antes.json), [depois em 1440](../../../output/playwright/UX-05-correcao-ime-depois.json), [depois em 375](../../../output/playwright/UX-05-correcao-ime-depois-375.json). Cada rodada posterior tem oito observações de composição e 17 checks de comportamento. Eventos são **sintéticos**; não equivalem a IME real.
- [Jest antes](../../../output/playwright/UX-05-correcao-jest-antes.txt) e [Jest final](../../../output/playwright/UX-05-correcao-jest-depois.txt): 13 suítes, **83 testes aprovados**, ante 79 existentes. Lint, `tsc --noEmit`, builds frontend/backend e `git diff --check` aprovados.
- [Blocos: 49 checks reais](../../../output/playwright/UX-05-correcao-blocos-browser-resultados.json): renomeação/F2, undo independente, alternante, `/`, conversão/seleção, tarefas, H6, código, IDs, persistência por novo GET/recarga e 409. Nenhuma exceção JS.
- [Integração: 46 checks reais](../../../output/playwright/UX-05-correcao-integracao-resultados.json): autenticação, criação, autosave, propriedades, erros e recuperação, foco, upload/download MinIO, versões/restauração, exportação, histórico, duplicação, lixeira e isolamento entre contas. Nenhuma exceção JS.
- [Matriz visual final](../../../output/playwright/UX-05-correcao-visual-depois.json): 20 pares documento/ferramenta em 320/375/768/1024/1440 CSS px, mais materiais nas cinco larguras; sem overflow horizontal ou controles sobrepostos. Ciclo de Tab, Escape e instância preservados. [Zoom nativo 200%](../../../output/playwright/UX-05-correcao-zoom-resultados.json): DPR 1→2, largura 1440→720, scrollWidth=720; contraste de menu 16,02:1 e movimento reduzido. Capturas de menu desktop, Propriedades 320 e zoom inspecionadas visualmente.

Os roteiros anteriores receberam apenas um prefixo opcional de saída (`UX_ARTIFACT_PREFIX=UX-05-correcao`) para preservar os artefatos de 15/11. As asserções existentes permanecem. A integração usa o banco local exclusivo `biblioteca_test_ux05_20261115`, novas contas descartáveis e buckets novos `ux05-*`; nenhum banco anterior foi apagado. Chamadas foram encaminhadas somente à API local. O launcher foi reiniciado entre blocos e integração mantendo o rate limit ativo.

### Pendências e próximo passo

| Estado | Pendência |
|---|---|
| **NÃO EXECUTADO** | IME japonês real: candidatos, Enter/Escape durante composição e atalhos. Esta rodada corrige falhas confirmadas nos handlers, sem homologar composição física. |
| **FALHOU — requisito funcional pendente** | Inserir/renderizar imagem, arquivo e referência por ID no corpo. Reproduzido com JSON misto; o schema frontend não registra `image`, `attachment` ou `pageReference`, e o menu não os oferece. O guard anterior preserva o JSON, mas não implementa essa jornada. Mantido como entrega funcional original pendente conforme a direção, sem usar seu bloqueio para alegar correção. |
| **NÃO EXECUTADO** | Leitor de tela, toque físico, avaliação com usuários, outros motores de navegador e benchmark de produção. Toque automatizado com `hasTouch` passou; não comprova dispositivo físico. |

Próximo passo exato, ainda na UX-05: executar IME real/leitor de tela e completar a entrega funcional original de mídia/referências, repetindo a jornada integrada com edição e recarga do documento misto. **Não se declara a etapa concluída.** Relatórios atualizados: [UX-04-testes.md](UX-04-testes.md) e [UX-05-testes.md](UX-05-testes.md).

## Histórico da UX-01

## Rodada CORRIGIR — 15/11/2026

Referência: mesma branch `refactor/cleanup-general`, árvore não commitada sobre `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`. O relatório anterior registrava limitações de cobertura, sem bugs abertos confirmados. Os cenários anteriores foram repetidos antes da edição e passaram; não foram reabertos como regressões.

**UX01-010 — P1 visual, nome de anexo cortado — CORRIGIDO E VERIFICADO.** Ao executar o cenário pendente de nome longo, um arquivo com `Material_sem_espacos_` repetido 12 vezes e sufixo `.pdf` produziu link de clientWidth=107 e scrollWidth=1656 em 320 CSS px, com `white-space: nowrap`, recorte e ausência de título. Causa confirmada: regra de reticências e item com proporção quadrada. A primeira correção expôs encolhimento de linhas na grade desktop; essa tentativa não foi declarada aprovada.

Correção incremental em `EditorLayout.module.css`: nomes de arquivos/links quebram em qualquer ponto necessário, itens sem imagem crescem com o conteúdo, grade usa linhas de altura intrínseca e os textos não encolhem dentro do flex. Miniaturas continuam com seu tratamento existente; URLs, IDs, callbacks e funcionalidades foram preservados. Removido limite de altura da grade móvel para permitir leitura integral.

Revalidação: 320/375/768/1024/1440 px, sem overflow horizontal da página; clientWidth=scrollWidth em todas as larguras (107/134/331/459/109 px), retângulo completo do nome contido no item. Captura final: `evidencias/UX-01-correcao-anexo-depois.png`. O primeiro ensaio anterior à correção retornou suas medidas no log da ferramenta; não foi salva captura inicial desse cenário.

Novo teste `attachments-panel.test.tsx` verifica nome acessível completo, destino do link, remoção pelo ID original e ação de adicionar arquivo. Lint passou; 9 suítes/37 testes passaram. Build final passou com TypeScript. A primeira tentativa de build encontrou uso indevido de `exact` no novo teste, corrigido sem remover as asserções.

Regressão de navegador: repetidos os 20 pares tela/largura, pendência de propriedades, autosave, resposta 409, falha de rede e recuperação, foco/setas/Escape, vazio/erro de coleção e movimento reduzido; passaram com API interceptada. O servidor existente em 3001 foi reutilizado após EADDRINUSE na tentativa de iniciar outro.

Persistem as pendências de integração real, IME, leitor de tela, toque físico e zoom nativo. Docker local foi identificado por inspeção de leitura, mas não se executou teste de banco/storage nesta rodada. Uma chamada ao navegador foi inicialmente impedida por falha da revisão automática devido a limite de uso; após a solicitação do usuário para continuar, novas chamadas foram aceitas. Não se contornou a revisão.

Estado: **IMPLEMENTADA SEM VERIFICAÇÃO COMPLETA**. Encerrada esta rodada de correção, sem avançar para UX-02. Próxima ação: homologar os cenários manuais e integrados pendentes em ambiente isolado.

## Registro da implementação anterior

15/11/2026. Referência de código e ambiente em [UX-01-testes.md](UX-01-testes.md).

| ID | Prioridade / tipo | Reprodução e causa | Correção / evidência |
|---|---|---|---|
| UX01-001 | P0 visual | Abrir editor: contêiner de 170 px acomoda categoria e dois selects de min-width 180 px. Categoria medida com 22 px; selects brancos. | Grade responsiva, Field/Input/Select com tokens. Cinco larguras sem interseção; categoria com 255 px em 320. VERIFICADO. |
| UX01-002 | P0 interação | Editar somente título/propriedades: indicador anterior considerava apenas dirty do conteúdo. | Fingerprint de metadados confirmado acompanha apresentação; estados de criação, gravação e erro. Regressão Jest e navegador. VERIFICADO. |
| UX01-003 | P0 interação | “Cancelar” chamava saída protegida, podendo gravar alterações; salvar página existente retornava à coleção. | “Voltar” e “Salvar e voltar”, com explicação do contrato. Preservados handlers e checkpoint. VERIFICADO. |
| UX01-004 | P1 teclado | Escape de menu podia alcançar o listener global de saída; abertura não focava primeiro item. | Foco inicial, setas/Home/End, Escape consumido e retorno ao acionador. Jest e navegador. VERIFICADO. |
| UX01-005 | P1 linguagem | Documentos eram chamados de blocos; botão lateral de criação chamava apenas saída. | Página para documentos; “Voltar à coleção” no botão lateral; comandos internos continuam Bloco. VERIFICADO por inspeção e testes. |
| UX01-006 | P1 visual/interação | Slots de anexos vazios eram preenchidos artificialmente; mensagem sugeria arrastar sem handler. | Renderização somente de itens reais, instrução dos botões existentes e remoção acionável sem hover. VERIFICADO por inspeção. Upload real NÃO EXECUTADO. |
| UX01-007 | P1 regressão durante implementação | Captura em 320 mostrou lateral limitada a 180 px e ação excedendo seu contêiner; faixa fixa cobria parte do texto. | Removido limite de altura rígido; ações móveis no fluxo antes do editor, DOM correspondente e menu abrindo abaixo. Rechecadas quatro larguras móveis. VERIFICADO. |
| UX01-008 | P1 feedback | Aviso de navegação ficava fora do editor fixo; primeira correção duplicou mensagem. | Erro de navegação encaminhado para o aviso do editor, status resumido sem repetir a mensagem detalhada. Testes de rede e histórico passam. VERIFICADO. |
| UX01-009 | P1 consistência | Login reutilizava grade e seletores do editor; visualizações alternativas não usavam controles comuns. | Layout de autenticação próprio; primitives e tokens em visualizações/diálogo; tabela com scroll local e quadro por teclado. Smoke de login e tabela/quadro aprovado. VERIFICADO no frontend com API interceptada. |

Durante implementação, lint detectou leitura de ref no render: substituída por estado de apresentação atualizado somente após confirmação de gravação. Teste antigo que buscava “Salvar” na criação foi atualizado para “Criar página”, preservando a asserção de histórico. A verificação de movimento reduzido encontrou duração residual de uma regra antiga; agora a transição é desativada. Nenhum critério foi retirado para obter aprovação.

Não há alegação de correção de backend, conflitos reais entre sessões ou IME real. Pendências de homologação permanecem em UX-01-testes.md.
