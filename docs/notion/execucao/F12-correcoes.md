# F12 — Correções e decisões verificadas

17/11/2026. Mudanças na working tree existente, sem migração nova, atualização de dependências da aplicação ou publicação.

| Caso | Defeito e correção | Evidência |
|---|---|---|
| BUG-F12-001 — Conteúdo incompatível | Raízes desconhecidas e legado com campos extras viravam documento vazio antes do guard. O carregamento preserva esses dados, bloqueia o corpo e omite `conteudo` em alterações de metadados. Estruturas malformadas não derrubam o guard. `schemaVersion: 1` é aceito e preservado na edição; versão futura fica bloqueada. | Três regressões inicialmente falharam; testes de compatibilidade/`Home` passaram após a correção. Navegadores conferem JSON idêntico por nova leitura do servidor. |
| BUG-F12-002 — FK ao duplicar ramo | Referência de propriedade para filha era inserida antes de a filha existir, violando `Area_targetPageId_fkey`. A transação cria todas as páginas antes de resolver essas referências. | Integração PostgreSQL reproduziu a violação e passou após a correção. |
| BUG-F12-003 — Vínculo legado na cópia | `pageId` antigo não era remapeado e continuava apontando à origem. A cópia remapeia também esse identificador. | Cópia de ramo com referência legada e arquivo real; purge da origem preserva vínculo e bytes da cópia. |
| BUG-F12-004 — Exclusão definitiva inacessível | A rota DELETE existente só enviava à lixeira e o serviço antigo de remoção não era exposto. Adicionados DTO, rota específica, ação de interface e confirmação; revisão/ownership/lixeira/versões são conferidos antes da limpeza. | HTTP real: 400/404/409, limpeza parcial 503 seguida de repetição, ramo removido e versões preservadas. React testa cancelamento, revisão e nova tentativa. |
| BUG-F12-005 — Diagnóstico descartado | O filtro removia códigos explícitos dos erros. Preserva código e inclui identificador UUID no corpo/header; não publica query, stack ou detalhes de erro inesperado. | O teste HTTP de falha real de limpeza inicialmente perdeu `code`; a regressão verifica código e identidade entre corpo/header. Suíte HTTP existente permanece aprovada. |
| BUG-F12-006 — Foco modal | Tab podia sair da galeria, inclusive quando só havia o botão de fechar. Galeria e captura de modelo usam a contenção modal já existente. | Navegadores verificam Tab dentro do diálogo e Escape com retorno ao acionador. |
| BUG-F12-007 — Acessibilidade | Botão de renomear estava dentro de `summary`; checkbox tinha alvo de 13 px; nomes de nível não começavam pelo número visível; grupo de ferramentas não tinha papel semântico. Renomear é ação irmã do alternante, checkbox tem 24 px e nomes/grupo foram corrigidos. | Auditoria axe, regressão de renomeação/F2/undo e operações reais em alternantes. CSS considera o `li[data-checked]` efetivamente gerado pelo Tiptap. |
| BUG-F12-008 — Volume e navegação | Cada documento provocava download de todos os metadados e esgotava o orçamento normal da API em poucas trocas. A abertura reutiliza a árvore e atualiza metadados do GET autorizado; escrita estrutural e retorno à coleção mantêm a atualização canônica. | Reprodução com 81 respostas de navegação e 429; depois, dez respostas iniciais sem corpos e lote completo aprovado nos dois motores. Regressão React verifica reutilização e atualização ao voltar. |

## Precisões sobre a automação

Os roteiros F9/F10/F11 são repetidos com portas F12 e nomes de artefatos próprios, preservando resultados históricos. Cada lote é sequencial e para ao falhar; reinicia somente a API de fixtures entre grupos, sem alterar os limites do produto. As versões finais devem ser consultadas no agregador F12, não em tentativas exploratórias.

Os ajustes de roteiro incluíram esperar referências assíncronas, usar `textContent` para código, normalizar CRLF do Windows, registrar respostas 304 válidas na busca aquecida e respeitar o retorno da restauração à coleção. No Firefox, o teste de clipboard usa Ctrl+V real em vez das permissões exclusivas de Chromium. HTML nativo é preparado com `ClipboardItem` e gesto de clique; a composição IME foi aceita pelo proprietário, não inferida de strings/eventos sintéticos.

Escolhas de `window.confirm` são controladas no roteiro de lixeira para evitar a suspensão do CLI por diálogos nativos; o teste React também verifica que cancelar não transmite a requisição. O fluxo HTTP de limpeza parcial usa PostgreSQL/MinIO reais; o 503 de interface é injetado separadamente.

Após encerramento forçado, o ensaio reconfirma a conta na API e consulta seu journal IndexedDB. Não usa token ou marcador de `localStorage` como prova de durabilidade: esse armazenamento pode conservar uma gravação anterior após a interrupção do processo. A recuperação exige a identidade correta e compara a revisão remota antes de salvar.

Um roteiro exploratório que editava e arrastava no documento já alterado por outros testes foi substituído pelas fixtures determinísticas do roteiro F10. Uma rodada Firefox foi interrompida por reinício do frontend; o lote completo foi repetido depois, com o servidor estável. Essas falhas de preparação não foram classificadas como bugs do produto.

O banco habitual e seus objetos não foram usados. O adb opera em servidor próprio, porta 5038, e os redirecionamentos USB da F12 podem ser removidos sem encerrar outros servidores adb. Perfis e dumps permanecem disponíveis para reprodução.

O Next incluiu automaticamente os diretórios de tipos `.next-f12` no `tsconfig.json` durante o build isolado. Eles são mantidos, e o ESLint/Git ignoram os artefatos desse build; as fontes da aplicação continuam integralmente sujeitas ao lint.
