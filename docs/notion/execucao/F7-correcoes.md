# Diagnóstico e correções — F7

Data: 13/11/2026, America/Fortaleza, rodada de diagnóstico após `F7-testes.md`.

Status das falhas BUG-F7-002, BUG-F7-003 e BUG-F7-004: **CORRIGIDO E VERIFICADO**. A etapa continua **IMPLEMENTADA SEM VERIFICAÇÃO COMPLETA** pelos critérios gerais de homologação ainda parciais; isso não significa que estas três correções estejam sem verificação.

Atualização posterior — **BUG-F7-005 CORRIGIDO E VERIFICADO**: o banco local efetivamente usado pela aplicação recebeu as três migrações pendentes após backup conjunto e restauração comprovada em clone. A listagem original pelo `AreasService.findAll()` passou. A limitação anterior de “migrações somente em teste” deixa de se aplicar a esse banco local identificado; produção e demais ambientes não foram alterados.

Ambiente: Windows/PowerShell, Node 24.13.0, branch `refactor/cleanup-general`, HEAD `f87fdbc`, working tree com as alterações anteriores preservadas. PostgreSQL/MinIO locais; API 3017 e frontend de produção local 3018 exclusivos de teste. Não houve commit, push, deploy, reset ou mutação da biblioteca existente.

## Reprodução antes da correção

Foi relido integralmente o prompt de diagnóstico, a especificação RN-001–004/009–011 e os registros da F7. Executado, antes de alterar o serviço, `F7_TEST_DATABASE=biblioteca_test_f7 node scripts/f7-homologation.cjs`:

- H-F7-004: esperado filha em FACULDADE; observado LINGUAGENS — **FALHOU**, processo retornou 1.
- H-F7-017: esperado descendente na lixeira; observado `deletedAt=null` — **FALHOU**.
- BUG-F7-004: a implementação ainda guardava seleção apenas em React; não havia leitura/gravação do endereço nem tratamento de `popstate`. A reprodução visual anterior, documentada na conversa e no relatório, retornava ao início após reload. Essa causa foi confirmada no código atual antes da alteração.

Não se tomou o relatório anterior como prova de aprovação. BUG-F7-001 já estava corrigido; o controle de revisão foi mantido e revalidado na regressão real de F7.

## BUG-F7-002 — Seção divergente nos descendentes

Gravidade: alta. Requisitos: RF-004, RN-002/003/004. Estado: **CORRIGIDO E VERIFICADO**.

**Causa confirmada:** `update()` alterava apenas a raiz. As validações de hierarquia eram feitas fora de uma transação estrutural comum, e exigiam também subseção igual à do pai, contrariando o estado de estudo independente. `reorder()` usava um caminho separado e podia reproduzir a divergência ao mudar de pai.

**Mudança:** criar, mover por PATCH, reordenar, duplicar no destino, excluir e restaurar usam transação e advisory lock por proprietário antes de ler a estrutura. Mover seção atualiza todos os descendentes, inclusive os que continuam na lixeira, sem mudar conteúdo, IDs, categoria, anexos, status de estudo ou entendimento. Nova mãe determina a seção do ramo. Mudança de seção de filha sem movê-la exige desvincular explicitamente para raiz ou escolher outra mãe. Criação herda seção da mãe, mantendo status próprio. Validação de ancestrais rejeita ciclos e pais indisponíveis.

**Verificação:** reprodução H-F7-004 passou sem mudar o auditor. Integração real cobre árvore com três níveis, filha ESTUDADO, anexo e exclusão anterior; reparent entre seções, reordenação e movimentos A→B/B→A concorrentes, com apenas um vencedor. Uma falha injetada na atualização dos descendentes reverteu também seção e revisão da raiz no PostgreSQL. Não houve reparo automático de árvores antigas já inconsistentes.

## BUG-F7-003 — Lixeira alterava somente o pai

Gravidade: alta. Requisitos: RF-017, RN-010/011. Estado: **CORRIGIDO E VERIFICADO**.

**Causa confirmada:** `trash()` e `restore()` gravavam uma única `Area`; não existia identificação de quais páginas tinham sido excluídas juntas.

**Mudança:** migração aditiva acrescenta `Area.deletionBatchId` e índice por proprietário/lote. Exclusão cotidiana percorre o ramo na transação, marca somente páginas ativas com um novo lote e mantém as exclusões anteriores. Restaurar qualquer item recupera o lote correspondente, preservando relações válidas. Mãe indisponível resulta em raiz da mesma seção e aviso; pai externo ativo determina a seção. Ciclos na restauração abortam a transação. Registros legados sem lote são restaurados individualmente: não se adivinha a intenção de exclusões antigas. Nenhum objeto ou versão é apagado. A interface atualiza a coleção após operações do ramo e apresenta o aviso de recuperação.

**Contrato compatível:** os endpoints existentes e campos de `Area` permanecem. Restauração acrescenta `restoredIds` e `warning` opcional à resposta. O novo campo de lote não é aceito como comando livre do cliente.

**Verificação:** H-F7-017 passou no auditor original. Integração real cobriu filho/neta no mesmo lote, exclusão independente anterior, restaurar a partir da filha, legado sem lote, acesso por outra conta e concorrência entre criar filha/excluir pai. No Chromium, restaurar a filha recuperou pai e filha na coleção; outro lote voltou à raiz com aviso porque sua mãe continuava excluída.

**Migração com dados anteriores:** aplicada em `biblioteca_test_f7_restore_final`, clone de fixtures recuperado na rodada anterior, protegido pelo dump/inventário existentes. Antes e depois: 30 páginas, hash MD5 `5ed764004ba57d8f2de078d3a6831cfb` do JSON dos campos preexistentes ordenados por ID. Zero registros receberam lote inventado; conteúdo, IDs e metadados ficaram intactos. `biblioteca_estudos` e produção não foram alterados. Para recuperação, usar o dump anterior em outro destino isolado; não remover colunas de um banco em uso como estratégia de rollback.

## BUG-F7-004 — Recarregar perdia a página selecionada

Gravidade: média. Requisitos: RF-005, RN-017 e recuperação de RF-026. Estado: **CORRIGIDO E VERIFICADO**.

**Causa confirmada:** seleção apenas em memória, sem endereço por ID, fetch direto da página ou listener de histórico. Reutilizar o mesmo componente de formulário entre IDs também exigia uma chave para não manter valores da página anterior.

**Mudança:** `/?page=<UUID>` reabre a página por GET autorizado, independentemente da página de listagem; seção e status são derivados da resposta atual. Coleções usam `?section=…&status=…`. Navegação utiliza History API, com Voltar/Avançar, cancelamento de resposta obsoleta e formulário identificado por ID. Criar página acrescenta endereço ao histórico sem substituir a coleção anterior. Recurso indisponível mostra erro sem exibir dados anteriores.

O guard de navegação persiste fila de conteúdo e metadados antes de sair. Falha mantém URL e formulário; em `popstate` repõe o endereço da página atual. Requisições concorrentes de navegação compartilham a gravação pendente. Fechar/recarregar com alterações não confirmadas tem proteção `beforeunload`; rascunho novo precisa ser salvo antes de sair. Falha de rede tem mensagem orientada a reconectar e tentar novamente. Isso não acrescenta um sistema de recuperação local entre reinícios.

**Verificação:** testes de componente exercitam deep link/remontagem, metadados pendentes, falha de rede, histórico com erro, 404, criação e retorno à coleção. Chromium 157 confirmou:

- Página criada recebeu `?page=a872b74c-d240-4e41-ad4d-4d58d4b54183`; reload manteve nome, texto e ID.
- Voltar/Avançar gravou texto e metadados; leitura posterior da API confirmou o valor salvo.
- API de teste desligada durante saída: rascunho e URL permaneceram no formulário. API religada e nova tentativa: valor persistido e saída concluída.
- Página criada com o build final recebeu `?page=b2721130-64db-4081-b88c-e009cc4ecec0`; Back retornou à coleção que a originou.
- Na mesma página, versão foi criada, texto editado e versão restaurada; nova leitura da API confirmou o texto anterior, sem regressão do fluxo F7.

## Ajustes de testes e arquivos

O primeiro E2E após introduzir transações falhou porque o mock de Prisma não tinha `$transaction`. Resolução: fixture passou a executar o callback transacional com o mock existente, mantendo a expectativa HTTP 201 e os demais asserts. Trata-se de compatibilidade do teste, não de defeito do produto; a criação com banco real já passava. Também foi removida uma opção de query de Testing Library não aceita pelos tipos; testes e build passaram depois.

Arquivos principais desta rodada:

- `backend/src/areas/areas.service.ts`, schema e migração `20261113140000_f7_trash_batches/migration.sql`.
- `backend/src/areas/hierarchy-regression.integration.spec.ts`, fixture `areas.service.spec.ts` e `backend/test/app.e2e-spec.ts`.
- `frontend/src/app/page.tsx`, `library-route.ts`, `library-route.test.ts`, `navigation.test.tsx`.
- Registros `F7.md`, `F7-testes.md` e este arquivo. O auditor original foi preservado.

## Comandos e resultados finais

| Verificação | Ambiente/comando | Resultado |
|---|---|---|
| Auditor original | `F7_TEST_DATABASE=biblioteca_test_f7_corrections node scripts/f7-homologation.cjs` | H-F7-004 e H-F7-017 PASSARAM |
| Backend completo | `F7_TEST_DATABASE=biblioteca_test_f7_corrections`, `F7_TEST_BUCKET=biblioteca-test-f7-corrections`, `node scripts/run-f7-tests.cjs` | 21 suítes, 128 testes PASSARAM; inclui 9 regressões novas e testes reais de exportação/versões |
| Frontend | `npm.cmd test -- --runInBand` | 6 suítes, 23 testes PASSARAM |
| HTTP existente | `npm.cmd run test:e2e -- --runInBand` | 26 testes PASSARAM após ajuste do mock; logs de falha de prontidão são injeções deliberadas dos testes |
| HTTP F7 real | `F7_HTTP_TESTS=1 node scripts/f7-http-smoke.cjs` contra API isolada | Upload, mídia retida, isolamento, DTO, revisão antiga, restore e ZIP PASSARAM |
| Checks | `npm.cmd run lint` e `npm.cmd run build` nos dois projetos | PASSARAM; override de loopback restrito ao build de verificação local |
| Migração | `npx.cmd prisma migrate deploy` com URL explícita de teste | 11 migrações na base nova; nova migração também aplicada e comparada no clone de dados anteriores |
| Navegador | Chromium 157, build local de produção, 1280×720/320 px | Deep link, recarga, histórico, falha real de rede/reconexão, lotes/aviso e regressão de versões PASSARAM; lista sem overflow a 320 px |

Evidências Playwright locais em `.playwright-mcp/`, rodada 14:24–14:35 America/Fortaleza. Esses arquivos e dumps são artefatos de fixtures, ignorados pelo Git, não dados de produção. As consultas da migração exibiram apenas contagem/hash.

## Limitações e próxima ação

`prisma generate` foi tentado no sandbox e fora dele e continua retornando EPERM ao substituir a DLL local. JS/tipos foram atualizados e os testes com os novos campos passaram; não se registra saída zero desse comando. Nenhum processo alheio foi encerrado para liberar o arquivo. É uma pendência de ambiente, não uma falha funcional reproduzida destas correções.

Continuam as lacunas gerais de homologação listadas no relatório: leitor de tela, segundo motor, IME real, desempenho representativo, round-trip integral dos formatos e outros CT parciais. Não foram declaradas como aprovadas. Não há reparo automático dos dados legados inconsistentes nem restauração recursiva presumida para exclusões legadas sem lote.

Próxima ação exata: completar os QA/CT ainda parciais do relatório atualizado, sem reabrir BUG-F7-002/003/004 como não corrigidos. Antes de aplicar a migração a outro acervo, obter backup conjunto daquele ambiente e ensaiar recuperação; nenhuma liberação externa está autorizada por esta rodada. Não avançar para funcionalidades futuras.

## BUG-F7-005 — Coluna `Area.deletionBatchId` ausente no banco da aplicação

Estado: **CORRIGIDO E VERIFICADO**. Natureza: schema de ambiente local desatualizado em relação ao código; impede listar páginas. Sintoma fornecido pelo usuário: `PrismaClientKnownRequestError` em `areas.service.ts`, `this.prisma.area.findMany()`.

**Diagnóstico confirmado:** `backend/.env` aponta para PostgreSQL local `localhost:5433/biblioteca_estudos`. `prisma migrate status` encontrou três migrações pendentes: `20261113120000_area_f7_revisions`, `20261113121000_area_monotonic_revision` e `20261113140000_f7_trash_batches`. As rodadas anteriores tinham aplicado essas migrações somente em bases isoladas; o cliente atualizado passou a consultar uma coluna que a base local ainda não possuía. Este erro não é causado pela falha EPERM na substituição da DLL.

**Proteção dos dados:** criado backup em `.f7-artifacts/local-upgrade-20261113_150000/`, ignorado pelo Git, contendo `database.dump`, inventário e bytes dos 19 objetos do bucket local. O dump foi restaurado em `biblioteca_test_f7_upgrade_20261113_150000`, e os objetos em um bucket novo e privado `biblioteca-test-f7-upgrade-20261113-150000`. Contagens e hashes das seis tabelas existentes, além dos SHA-256 dos objetos, coincidiram. As três migrações passaram no clone; uma nova comparação confirmou os dados anteriores intactos.

**Correção aplicada:** `prisma migrate deploy` executado no banco **local da aplicação**, usando explicitamente a conexão validada de `backend/.env`, depois da verificação do clone. Nenhum reset, `db push`, remoção de tabelas, seed, exclusão de dados ou acesso a produção. Adicionado `backend/scripts/local-upgrade-backup.cjs` para registrar/verificar backup e recuperação; ele recusa origem remota/desconhecida e exige dump e comprovante de recuperação antes de migrar a origem.

**Resultados observados:**

| Verificação | Resultado |
|---|---|
| Backup conjunto e recuperação em clone | PASSOU, 19 objetos verificados por hash |
| Migrações no clone | PASSOU, três migrações aplicadas sem alterar os dados anteriores |
| Migrações em `biblioteca_estudos` local | PASSOU, mesmas três migrações aplicadas |
| Comparação depois da atualização local | PASSOU: seis tabelas mantiveram contagens/hashes; duas páginas preservadas, hash `ee3c5ad4e6654a6395ce07d270b50fb9` dos campos preexistentes de Area |
| Reprodução original | PASSOU: `prisma.area.findMany({take:1})` e `AreasService.findAll()` com um proprietário existente, somente leitura e sem exibir conteúdo |
| `npx.cmd prisma migrate status` | `Database schema is up to date!`, 11 migrações |

Um segundo comando de criação do bucket de recuperação foi recusado por ele já existir; o destino não foi sobrescrito. A recuperação já realizada foi então revalidada por leitura dos objetos e hashes. Não foram repetidas suítes de produto sem mudança de lógica: a verificação desta falha foi migração em clone, comparação de dados e reprodução real da consulta na origem.

Próxima ação deste incidente: atualizar a tela da aplicação. O schema local já está compatível; não é necessário apagar registros nem regenerar o banco. Os backups/clone ficam preservados para recuperação. Demais QA gerais e a ocorrência separada de EPERM continuam documentados, sem avanço de etapa.

## Incidente posterior — `Failed to fetch` nas integrações

Página informada: `http://localhost:3001/?page=18f00a97-ba67-425e-8e99-371c03a5fbb4`. Data: 13/11/2026, America/Fortaleza. Estado final do sintoma: **usuário confirmou “Não aparece mais” após atualizar a página**. Não se atribui o erro original de localhost exclusivamente ao defeito de CORS reproduzido em outro hostname.

### Diagnóstico observado

- API 3000: `/health` e `/health/ready` retornaram 200; acesso sem autenticação a `/areas` retornou 401, uma resposta HTTP normal, distinta de falha de rede.
- Para a página indicada, documento, anexos, listagem e versões retornaram 200 em leituras autenticadas, com `Access-Control-Allow-Origin: http://localhost:3001`. A página estava ativa. A imagem anexada respondeu 206 por URL assinada válida no MinIO. Nenhum conteúdo pessoal foi incluído na saída de diagnóstico.
- A sessão do navegador de automação não é a sessão do navegador do usuário. Não havia tokens nesse contexto de localhost:3001; não se apresentou a tela de login da automação como prova de falha da página autenticada do usuário. As verificações autenticadas do acervo foram somente leitura, com credencial de diagnóstico local de curta duração, sem criar conta ou substituir a sessão existente.
- **BUG-F7-006, reproduzido e corrigido:** `127.0.0.1:3001` era rejeitado pelo backend apesar de ser um alias local de `localhost:3001`. OPTIONS retornava 500 sem header CORS; no navegador a consulta rejeitava com `TypeError: Failed to fetch`. Também havia bloqueio de WebSocket HMR do Next para esse hostname. O endereço informado pelo usuário usa localhost, portanto essa reprodução não comprova a causa específica do seu erro transitório.
- **Ajuste de concorrência confirmado no código:** várias chamadas com access token expirado faziam renovações independentes com o mesmo refresh token. Não foi alegada reprodução desse mecanismo como causa do `Failed to fetch` original: 401 HTTP não é, por si só, erro de conectividade.
- Erros nativos de `fetch` eram exibidos sem endpoint/contexto. O código também podia escolher silenciosamente a API de produção em alguns hosts mesmo com API local explicitamente configurada; esse fallback foi removido quando há configuração explícita.

### Correções

1. `backend/src/common/cors-options.ts` centraliza a política existente e permite aliases de loopback somente no mesmo protocolo/porta das origens locais ou explicitamente configuradas. Origens arbitrárias continuam recusadas. `main.ts` usa essa política.
2. `frontend/next.config.ts` permite os aliases locais de desenvolvimento também para assets/HMR, conforme a documentação da versão instalada. Nenhuma política de produção foi substituída por wildcard.
3. `frontend/src/app/api-client.ts` concentra a chamada de rede de autenticação e das integrações autenticadas. Erros de rede identificam método/endpoint, sem query, credenciais ou body; HTTP 400/401/409/500 continuam respostas HTTP e AbortError continua cancelamento de navegação.
4. Consultas simultâneas compartilham uma renovação de sessão; 401 atrasado pode reutilizar a rotação concluída; há no máximo uma repetição por requisição. Cancelar um caller não cancela a renovação compartilhada. Logout/troca de conta impede restaurar tokens antigos.
5. `page.tsx` usa o cliente comum em login/cadastro e nos demais fluxos. Uma gravação automática que se recupera limpa apenas sua mensagem antiga de erro, preservando erros de outras operações. Rascunhos e metadados não são apagados por indisponibilidade de rede.

### Mapa das integrações investigadas

| Integração | Chamadas | Verificação |
|---|---|---|
| Login/cadastro/sessão | `/auth/login`, `/auth/register`, `/auth/refresh` | Login inválido no browser de localhost retornou “Credenciais inválidas”, sem erro de fetch; renovação concorrente validada no ambiente isolado |
| Documento e coleção | `/areas/:id`, `/areas`, `/areas/search`, `/areas/trash` | Página real por leitura retornou 200; consultas paralelas, busca e lixeira passaram com fixture isolada |
| Edição e organização | PATCH/POST/DELETE em `/areas`, favoritos, ordem, duplicação, lixeira/restauração | Usam o mesmo cliente; HTTP de negócio não é convertido em erro de rede; regressão existente reexecutada |
| Materiais/capa | `/attachments`, `/attachments/upload`, `/attachments/:id` | Metadados da página real 200 e imagem assinada 206; consulta concorrente de anexos passou no teste de renovação |
| Modelos e visualizações | `/templates`, `/templates/:id/apply`, `/view-configurations` | Listagens reais no ambiente isolado 200; chamadas passam pelo cliente autenticado comum |
| Versões | `/areas/:id/revisions` e restauração | Leitura da página real 200; snapshot de fixture por cliente comum 201; regressão backend preservada |
| Exportação | `/exports` | Cliente comum com token renovado gerou ZIP 201 no ambiente isolado |
| Desenvolvimento | Next HMR e CORS | `127.0.0.1` deixou de gerar bloqueio de rede/HMR após configuração dos aliases; origem localhost manteve acesso |

### Evidências finais

- Backend: 22 suítes, **133 testes passaram**, incluindo cinco testes novos de política CORS. Lint e build passaram; uma tipagem do mock do novo teste foi ajustada antes da aprovação do lint.
- Frontend: 7 suítes, **31 testes passaram**, incluindo oito cenários novos de URL/erro, cancelamento, renovação simultânea, 401 atrasado e logout. Lint e build passaram; override de loopback restrito à verificação local.
- `F7_FETCH_TESTS=1 node scripts/fetch-integration-smoke.cjs`, exclusivamente na API isolada 3017 com banco/bucket de teste: três consultas paralelas responderam 200 com **uma única renovação**; modelos, configurações, busca e lixeira 200; snapshot e exportação 201. O script exercita o cliente TypeScript efetivamente usado pelo frontend, sem reimplementar sua lógica.
- Repetição do bloqueio original em `127.0.0.1`: depois da correção a consulta chegou à API e recebeu 401 com token diagnóstico inválido, sem `Failed to fetch`; health/ready no navegador respondeu 200. OPTIONS de localhost, IPv4 e IPv6 responderam 204 com a origem correspondente.
- `localhost:3001` permaneceu disponível e o usuário confirmou que o erro da página indicada não aparece mais após atualização. Não houve mutação das notas do acervo real, migração adicional, reset ou deploy nesta investigação.

Status BUG-F7-006: **CORRIGIDO E VERIFICADO** no cenário de aliases. Renovação concorrente e diagnóstico do cliente: implementados e verificados, sem afirmar que eram a causa exclusiva do incidente original de localhost. Caso o erro volte, a mensagem agora identifica a chamada para nova reprodução. A homologação geral da F7 continua parcial pelos QA já registrados, sem avanço de etapa.
