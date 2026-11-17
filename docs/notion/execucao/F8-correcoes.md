# F8 — Correções de integridade e reconciliação documental

Data: 16/11/2026, America/Fortaleza. Código: working tree sobre `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`. Resultados e referência reproduzível em `F8-testes.md`, `F8.md` e `F8-referencia.json`.

## BUG-F8-001 — Repetir criação podia gerar outra página

**Origem:** RF-002/CT-002, mecanismo original de F1. Gravidade alta. Estado: **corrigido e verificado no fluxo com chave de intenção**.

Antes do ajuste, PF não gerava chave de criação e `AreasService.create()` sempre executava `area.create`. A reprodução inicial executou o serviço real com armazenamento simulado, sem banco: duas tentativas iguais, duas linhas e IDs diferentes. Isso foi registrado como reprodução em memória, sem alegar teste PostgreSQL anterior à correção.

**Causa:** sem identidade persistente do pedido, resposta perdida era indistinguível de uma nova criação. Títulos iguais devem continuar permitidos; não se usou deduplicação por nome/conteúdo.

**Correção:** header opcional UUID v4; recibo proprietário/chave/hash/área na mesma transação; chave/pedido congelados no journal do cliente; retries devolvem o ID atual sem reaplicar metadados. Tombstone do recibo impede recriação após purge. Rejeições definitivas permitem corrigir a carga; falhas incertas mantêm o pedido original. Clientes antigos sem chave continuam aceitos, sem promessa de idempotência que seu protocolo não fornece.

**Arquivos:** schema/migração F8, controller/serviço de áreas, `PageSaveCoordinator`, PF e testes novos.

**Verificação:** INT-F8-01–05, FE-F8-02/06 e BR-F8-01. O teste do navegador encaminha POST real, obtém a confirmação upstream e aborta somente a resposta ao cliente. Duas tentativas resultaram em uma página; a edição posterior permaneceu no mesmo ID. API Nest reiniciada entre tentativas preservou o recibo. Outra conta, carga diferente, lixeira e purge têm testes próprios.

## GAP-F8-002 — Conteúdo, metadados e rascunho não tinham um mecanismo durável comum

**Origem:** RF-014/CT-014 e F1. Estado: **mecanismos concluídos e cenários verificados; requisito global sem verificação completa**.

A inspeção encontrou `SerializedSaveQueue<JSONContent>` para conteúdo e PATCH separado em checkpoint/submit. Não havia armazenamento de rascunhos no reinício: somente formulário em memória e `beforeunload`. A comparação exata/atômica de F7 já protegia o servidor e foi preservada. Não se alegou reprodução de sobrescrita silenciosa no servidor atual para justificar essa mudança.

**Correção:** escritor único por página/conta para conteúdo/metadados/checkpoint; sequência reconhecida somente após resposta correspondente; journal IndexedDB antes da rede; identidade confirmada por `/auth/me`; registros independentes por sessão de edição; remoção condicional por sequência. Recuperação exige conta correta e leitura remota. Conflito conserva/download do local e não rebaseia. Resposta antiga de outra conta não pode confirmar/apagar o rascunho.

**Arquivos:** `page-save-coordinator.ts`, `draft-store.ts`, `DraftRecovery.tsx`, PF, auth controller; `page-save-coordinator.test.ts`, `navigation.test.tsx`, `jest.setup.mjs`; `fake-indexeddb` e lockfile.

**Verificação:** FE-F8-01–06 e BR-F8-02–05, com Tiptap/IndexedDB/API reais no navegador. Nova página no mesmo perfil recuperou journal depois de fechar o documento; outra conta não viu formulário/journal anterior. Remoto mais novo continuou intacto. Falha de quota é teste do adaptador injetado; falha física/reinício do SO não foi ensaiada.

**Compatibilidade:** estado “Salvo” agora cobre conteúdo e propriedades. O teste antigo de “propriedades pendentes” foi atualizado para exigir “Alterações pendentes” na fila comum, preservando as assertivas de não declarar salvo e de persistir os campos. Documento com nós desconhecidos continua bloqueado para escrita do corpo; a fila pode guardar metadados sem normalizá-lo.

## BUG-F8-003 — Falso conflito na reconciliação de JSONB

**Origem:** defeito encontrado durante a integração F8, RF-002/014. Estado: **corrigido e verificado**.

O primeiro comparador do cliente usava `JSON.stringify` diretamente. Criar pelo Tiptap real mostrou erro de conflito embora a página tivesse sido criada corretamente. A investigação comparou somente os nomes das chaves diferentes: `conteudo`. PostgreSQL JSONB devolveu as propriedades dos objetos em outra ordem; arrays e texto eram equivalentes.

**Correção:** comparação canônica recursiva de objetos, sem ordenar arrays nem tolerar divergência de revisão. A identificação da página é gravada no journal mesmo quando uma resposta de criação revelar alteração remota incompatível. Uma regressão devolve deliberadamente o JSON com propriedades reordenadas.

**Verificação:** FE-F8-06 e roteiro final BR-F8-01–05 passaram; o rascunho da tentativa exploratória foi recuperado no ID já criado, sem duplicação. Nenhuma tolerância de milissegundos/segundos foi acrescentada.

## ENV-F8-001 — EPERM ao gerar Prisma Client

**Estado:** resolvido no ambiente local controlado, com saída zero identificada.

Primeiro `prisma generate` reproduziu EPERM ao substituir `query_engine-windows.dll.node`. Foram identificados por caminho do projeto os processos do launcher/watcher e o backend com a DLL carregada. Somente esses processos foram interrompidos; frontend e demais processos Node não foram encerrados. A geração seguinte passou em Prisma 6.19.0; o backend habitual foi reiniciado com `start:dev` e a configuração local existente.

Não se apagaram dependências, não se usou geração sem engine e não se substituiu o resultado por aprovação de build. A geração modifica cliente local, não aplica migrations nem altera dados. Como a DLL volta a ser carregada quando a API roda, futuras gerações devem repetir a liberação controlada se necessário.

## BUG-F8-004 — Metadado inalterado bloqueava a fila comum

**Origem:** regressão encontrada durante a integração F8, RF-014. Estado: **corrigido e verificado**.

O primeiro incremento enviava o snapshot inteiro em PATCH. Criar origem com `targetPageId`, excluir o destino e editar o título reproduziu erro “Página referenciada não encontrada.”: o vínculo antigo era reenviado e revalidado, embora o usuário estivesse alterando outro campo. Também havia risco de persistir defaults de apresentação sobre metadados legados não editados.

**Correção:** a fila continua armazenando snapshots completos, mas o transporte envia somente campos diferentes da última confirmação; mantém a revisão obrigatória e não afrouxa validação de referências realmente alteradas. Metadados legados não editados permanecem no servidor. Nova leitura durante reconciliação atualiza a base de comparação, sem autorizar rebase sobre versão divergente.

**Verificação:** FE-F8-07 e BR-F8-08: título/corpo persistidos com destino na lixeira, referência preservada e `icone=null` intacto. Não foi implementado nó inline nem resolução visual da referência; isso permanece em F10.

## BUG-F8-005 — 401 anterior ao CORS impedia renovação no navegador

**Origem:** caminho reproduzido no bootstrap atual, RF-014/RNF-007. Estado: **corrigido e verificado**.

Com token expirado, o navegador recebeu `TypeError: Failed to fetch` ao escrever, enquanto health retornava 200. Requisições nativas com `Origin: http://localhost:3028` confirmaram POST/PATCH retornando **401 sem Access-Control-Allow-Origin**. A pré-autorização do body encerrava a resposta antes da instalação do CORS, impedindo o cliente de reconhecer 401 e usar a renovação existente.

**Correção:** instalar a mesma política CORS antes do middleware de pré-autorização. JWT/sessão continuam verificados antes de consumir bodies de escrita; nenhum limite de payload, origem permitida ou validação foi removido.

**Verificação:** `bootstrap.integration.spec.ts` inicia o `dist/src/main.js` real: 401 com CORS, aliases/preflight e origem recusada; assina um token realmente expirado com o segredo efêmero da fixture e usa o cliente TypeScript efetivo para renovar/criar com sucesso. BR-F8-09 recebe 401 acessível ao JavaScript. Não se atribui este caminho à causa exclusiva do incidente histórico de localhost de F7; o bug de aliases permanece encerrado e suas regras preservadas.

## BUG-F8-006 — Consulta de identidade consumia tentativas de credenciais

**Origem:** integração do novo `/auth/me`, RF-014. Estado: **corrigido e verificado**.

O guard agrupava todo `/auth/*` no orçamento de 10 tentativas/15 minutos. Recargas, reabertura, duas abas e troca de conta do roteiro consumiram esse orçamento e produziram 429 em `/auth/me`, bloqueando uma consulta autenticada legítima.

**Correção:** GET `/auth/me` usa o orçamento normal da API, de 120/15 minutos. Continua autenticado e limitado; login, cadastro, refresh e logout mantêm o orçamento mais restrito. Não foi desativado rate limit nem criado override de teste.

**Verificação:** teste novo permite dez leituras e dez tentativas de login em orçamentos independentes, bloqueia a 11ª credencial e a 121ª leitura. A suíte completa e os sete grupos do roteiro real passaram com esses limites ativos. Uma execução exploratória que encontrou 429 não foi registrada como aprovada.

## Migração e proteção dos dados

Nova tabela sem reescrever Area/Attachment, IDs ou documentos; FK da área usa SetNull para preservar recibos de páginas purgadas. A migração foi aplicada somente em `biblioteca_test_f8_20261116` e no clone de fixtures `biblioteca_test_f8_upgrade_20261116`.

`f8-upgrade-check.cjs` fez dump da base de fixtures F7, restaurou um destino novo, aplicou a migração e comparou contagem/hash das oito tabelas preexistentes: todas iguais. O destino já existente é recusado, não sobrescrito. Origem, dump e clone foram preservados. Bucket habitual, banco habitual e produção não receberam mutações desta rodada. A atualização do acervo habitual continua pendente de seu procedimento próprio de backup/recuperação e migração.

## Erratas documentais, preservando o histórico

- F5: onde o histórico chamou reordenação de RF-019, a associação canônica é **RF-021/CT-021**; duplicação rotulada RF-020 é **RF-019/CT-019**; alternantes/destaques rotulados RF-021 são **RF-020/CT-020**. Adendos em `F5.md`, `F5-testes.md` e `F5-correcoes.md`.
- F7: código/marcas/formatação não comprovam RF-007/CT-007; código no ZIP não comprova RF-008/CT-008. Formatação pertence a RF-006, comandos a RF-007, operações de bloco a RF-008, código a RF-010, exportação a RF-025. Adendo em `F7-testes.md`.
- F1/F2/F3/F4: status históricos não demonstram idempotência/recuperação, árvore/caminho, todos os menus ou referências inline. Adendos indicam a matriz atual sem reescrever o registro original.
- F6: testes de configuração TABLE/BOARD não são execução de alteração de status no quadro; JSON de modelo aplicado não prova independência de mídia. A tolerância histórica de conflito foi supersedida por F7, sem ser reintroduzida. Adendos em seus três relatórios.

## Limites e próxima ação

Não foram reabertos os bugs corrigidos de CAS, movimento de ramos, lixeira por lote, URL, migração local de F7 e aliases CORS. Suas regressões continuaram passando; faltas de UI foram registradas como pendências originais específicas, não regressão daqueles mecanismos.

Primeira entrega seguinte: **F9.1 — árvore completa e caminho de ancestrais**, independente do filtro da coleção e sem carregar corpos completos. Aceite e dependências em `F8.md`. As demais lacunas de editor/material/modelos ficam em F10/F11; não houve implementação simultânea dessas fases nem homologação total baseada em build ou contagem de testes.
