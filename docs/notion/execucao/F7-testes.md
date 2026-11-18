# Verificação — F7

Status atual: VALIDAÇÃO PARCIAL. RF-025/026 mantidos na regressão; **BUG-F7-002/003/004 CORRIGIDOS E VERIFICADOS** na rodada de correção. A homologação geral ainda depende dos QA/CT parciais. As tabelas originais abaixo registram a primeira rodada, quando as dependências anteriores ainda falhavam; não representam pendências funcionais atuais desses três bugs. Ver [F7-correcoes.md](F7-correcoes.md).

Atualização posterior: **BUG-F7-005 CORRIGIDO E VERIFICADO**. O banco local da aplicação estava com três migrações pendentes. Backup conjunto recuperado em clone, migrações validadas no clone e depois aplicadas na origem local; dados anteriores preservados. `AreasService.findAll()` e a consulta Prisma que falhava passaram; schema local atualizado com 11 migrações. Os ambientes das tabelas históricas abaixo continuam identificados como os das respectivas rodadas.

Atualização de integração fetch: usuário confirmou que `Failed to fetch` deixou de aparecer após atualizar a página de localhost informada. A captura autenticada de documento/anexos/listagem/versões dessa página respondeu 200; a imagem assinada respondeu 206. Foi corrigido um bloqueio CORS/HMR reproduzível em `127.0.0.1`, distinto da origem localhost do relato. Cliente de rede unificado e renovação compartilhada validados: backend **133 testes**, frontend **31 testes**, lint/build aprovados. Causa exclusiva do erro transitório original não foi afirmada; ver detalhes em `F7-correcoes.md`.

13/11/2026, America/Fortaleza. Código da working tree sobre `f87fdbc`, branch `refactor/cleanup-general`, incluindo alterações locais anteriores preservadas e F7 sem commit. PostgreSQL/MinIO locais exclusivos de teste; interface em `localhost:3018`, API em `localhost:3017`, Chromium 157. Sem uso de produção. As referências a testes históricos não os promovem a aprovação do código atual.

## Casos executados

| ID | RF/RN/QA | Cenário e procedimento | Esperado / observado | Estado e evidência |
|---|---|---|---|---|
| V-F7-001 | CT-025, RN-018 | Exportar raiz/filha, imagem, japonês, código, tarefa marcada e alternante recolhido; extrair com `unzipSync`, ler Markdown/JSON e comparar SHA-256 de cada entrada | Arquivos reais, hierarquia correta, referências relativas, conteúdo recolhido incluído e timestamps ISO; lixeira fora por padrão, dentro quando escolhida | PASSOU — integração PostgreSQL/MinIO, teste CT-025 |
| V-F7-002 | CT-026, RN-008/009 | Criar versão com imagem/capa; editar texto; remover anexo atual; restaurar; recuperar backup automático | Mesmo ID/pai/seção/ordem; nova mídia e referências remapeadas; bytes idênticos; estado anterior recuperável; token velho recusado | PASSOU — integração CT-026 |
| V-F7-003 | RN-009, QA-002 | Duas atualizações e duas restaurações paralelas com mesmo token; escritor legado imediatamente após token futuro | Um vencedor; nenhuma versão automática de operação perdida; trigger avança token mesmo se relógio não avançar | PASSOU — integração real + unitário de concorrência |
| V-F7-004 | RN-001, QA-003 | Conta diferente conhece IDs; registro legado contém URL de storage de outra conta | Não revelar conteúdo nem copiar objeto; acesso negado antes de download | PASSOU — integração real e HTTP real 404 |
| V-F7-005 | RN-007, QA-006 | JSON legado, schema futuro, nó desconhecido, conteúdo irregular e profundidade excessiva | Exportar original sem normalização destrutiva; negar escrita/restauração incompatível; limitar conversão | PASSOU no backend/exportador — `portable-document.spec.ts` e integração; round-trip completo de todos os nós no editor continua parcial |
| V-F7-006 | RN-018, QA-002/007 | Alterar página durante leitura de objeto; arquivo ausente | Abortar pacote com erro explícito; não criar versão quebrada | PASSOU — integração, spy apenas para injetar a alteração; banco e storage reais |
| V-F7-007 | QA-007 | Falhar segunda cópia durante snapshot | Não criar versão parcial; compensar cópias novas; originais intactos | PASSOU — integração real com falha injetada no upload |
| V-F7-008 | RN-012 | Tentar purge pelo serviço em página com versões | Impedir remoção antes de excluir objetos | PASSOU — integração CT-026; nenhuma exclusão real de dados pessoais |
| V-F7-009 | RN-017, QA-002/007 | Salvar pendências antes de criar/restaurar; checkpoint falha | Usar token confirmado; manter diálogo/formulário e não chamar criação/restauração após falha | PASSOU — testes do diálogo e fluxo de navegador |
| V-F7-010 | QA-001/004 | Diálogo a 320 px e 1280×720; Tab, Esc, foco e prévia somente leitura | Sem overflow horizontal; foco no diálogo; Esc fecha só diálogo; conteúdo escapado não executa script | PASSOU no recorte manual/DOM e Jest; screenshots `.f7-artifacts/versions-*.png`; não é auditoria WCAG completa |
| V-F7-011 | RF-025/026 | Browser: cadastrar, criar texto japonês, criar versão, editar, restaurar, reabrir após reload, baixar ZIP; depois upload e prévia de imagem | Texto original persistido, ZIP baixado e imagem com `naturalWidth=1`, foco no diálogo | PASSOU — snapshots Playwright em `.playwright-mcp/`; arquivo baixado `biblioteca-estudos.zip` |
| V-F7-012 | QA-003/009 | `f7-http-smoke.cjs`, autenticação real e multipart | Upload e mídia assinada 200; sem auth 401; DTO inválido 400; conta errada 404; token antigo 409; restauração/ZIP 201 | PASSOU — nove grupos de checks; `.f7-artifacts/http-smoke.zip` |
| V-F7-013 | QA-008 | Backup de banco e bucket de fixtures, restore em banco/bucket novos, comparar tabelas por ID e bytes de objetos | 30 páginas, 18 versões, 10 anexos, 6 vínculos e 16 objetos idênticos | PASSOU — `pg_dump`, `pg_restore`, `f7-recovery.cjs`, inventário local em `.f7-artifacts/recovery/` |
| V-F7-014 | QA-009 | Suítes completas, lint e build dos dois projetos | Backend 20 suítes/119 testes; frontend 4 suítes/13 testes; lint e build sem erros | PASSOU — comandos em F7.md; backend E2E adicional 26 testes com Prisma mockado |
| V-F7-015 | QA-001/004 | Reabrir aplicação reconstruída com os últimos ajustes de foco/centralização; abrir Versões a 320 px e fechar com Esc | Diálogo entre x=19 e x=301, sem overflow; foco dentro ao abrir e devolvido ao botão Menu ao fechar; editor permanece aberto | PASSOU — Playwright, rodada final 12:39 America/Fortaleza |
| H-F7-004 | RF-004/RN-003 | Auditor real cria pai/filha em LINGUAGENS e move pai para FACULDADE | Esperado filha FACULDADE; observado LINGUAGENS | FALHOU — `f7-homologation.cjs`, BUG-F7-002 |
| H-F7-017 | RF-017/RN-010 | Auditor real cria pai/filha e envia pai à lixeira | Esperado filha excluída pelo lote; observado `deletedAt=null` | FALHOU — `f7-homologation.cjs`, BUG-F7-003 |

Os casos V-F7 usam o código final de backend; o navegador teve uma primeira rodada funcional e uma rodada após reconstrução com os validadores finais. Os últimos ajustes de centralização e retorno de foco do diálogo passaram em testes, lint, build e na rodada V-F7-015. As screenshots de versões foram coletadas antes desses dois ajustes; os snapshots e medidas da rodada final registram o estado posterior.

## Matriz de homologação RF-001–026

“Parcial” significa que a evidência descrita não cobre todo o CT, mesmo quando uma suíte passou. O registro F5 antigo troca os números de RF-019/020/021 em alguns títulos; esta matriz usa a numeração da especificação 08.

| RF / CT | Evidência atual ou histórica identificada | Resultado da homologação completa |
|---|---|---|
| 001 / 001 | Backup/restore de fixtures, JSON legado e desconhecido preservados; sem migração do acervo real | PARCIAL |
| 002 / 002 | Criação real por UI/HTTP e testes de área | PARCIAL — idempotência de rascunho não coberta |
| 003 / 003 | Pai/filha reais em CT-025/026, parentesco conservado na restauração | PARCIAL — árvore completa/reload não homologados |
| 004 / 004 | H-F7-004 reproduz seção divergente | FALHOU |
| 005 / 005 | Reabrir confirma persistência; reload volta ao início, URL permanece `/` | FALHOU no recorte de navegação por ID; BUG-F7-004 |
| 006 / 006 | Exportação de nós, registro das extensões; relatório F3 com fluxos de UI pendentes | PARCIAL — comandos/menu completos não reexecutados |
| 007 / 007 | Código e marcas convertidos; extensões existentes | PARCIAL — seleção/formatação completa não reexecutada |
| 008 / 008 | Código multilíngue preservado no ZIP | PARCIAL — edição/cópia no editor não reexecutadas |
| 009 / 009 | Tarefas marcadas exportadas; extensão registrada | PARCIAL — alternância no editor/reload não reexecutada |
| 010 / 010 | Fixtures de blocos e conversão/limitações; pendências históricas F3 | PARCIAL |
| 011 / 011 | Capa restaurada por novo ID na integração; metadados retidos | PARCIAL — todos os controles visuais não reexecutados |
| 012 / 012 | Upload multipart, URLs assinadas, remoção/recuperação e isolamento reais | PARCIAL — matriz completa de todos os arquivos segue os testes existentes |
| 013 / 013 | Referências relativas no exportador e indicação de destino fora do pacote | PARCIAL — renomear/mover/excluir destino na UI não reexecutados |
| 014 / 014 | CAS real, concorrência, fila serializada, autosave e checkpoint | PARCIAL — recuperação local/reinício/rede do editor integral não homologados |
| 015 / 015 | Testes existentes e relatório F4; sem nova validação global de busca/paginação | PARCIAL |
| 016 / 016 | Testes existentes e relatório F4; favoritos/recentes não homologados integralmente nesta rodada | PARCIAL |
| 017 / 017 | H-F7-017 reproduz filha ativa após excluir pai | FALHOU |
| 018 / 018 | Metadados de estudo/restauração reais e suites de atualização | PARCIAL — todas as visualizações simultâneas não reexecutadas |
| 019 / 019 | Implementação de cópia existente; declaração histórica de F5 | PARCIAL — cópia/purge do original com todas as mídias não reexecutados |
| 020 / 020 | Alternante recolhido com conteúdo exportado, testes de extensão | PARCIAL — round-trip completo no editor não reexecutado |
| 021 / 021 | Reordenação existente; histórico F5; sem equivalência drag/menu/teclado nesta rodada | PARCIAL |
| 022 / 022 | Integração real existente de views e propriedades reexecutada na suíte | PARCIAL — quadro/tabela/árvore no navegador não reexecutados integralmente |
| 023 / 023 | Integração real de configuração existente passou | PARCIAL — configuração antiga inválida/fallback não homologados |
| 024 / 024 | Integração real de modelos existente passou | PARCIAL — independência de mídias entre todas as cópias não homologada |
| 025 / 025 | V-F7-001/004/005/006/011/012 | PASSOU no recorte executado |
| 026 / 026 | V-F7-002/003/007/008/009/011/012 | PASSOU no recorte executado |

## QA-001–010 e limites

| QA | Situação |
|---|---|
| 001 | Teclado, foco, nomes, conteúdo escapado e diálogo nativo testados. Leitor de tela e auditoria automatizada de acessibilidade completa NÃO EXECUTADOS; nenhuma alegação WCAG |
| 002 | Concorrência real e falhas injetadas passaram. Reinício/recuperação local integral de edição e rede real interrompida NÃO EXECUTADOS |
| 003 | Ownership, chave de objeto, protocolos perigosos, ausência de auth, mídia privada e renovação de sessão testados. O browser registrou 401 ao expirar token, recuperou sessão e concluiu a prévia; não houve erro final do fluxo. Não é certificação de segurança nem revisão completa de dependências |
| 004 | Diálogos e editor a 320 px sem overflow; desktop 1280×720. Auditoria de todas as telas com zoom NÃO EXECUTADA |
| 005 | Massa sintética pequena, até 30 páginas no ensaio final; sem baseline representativa ou metas de latência. NÃO EXECUTADO para aceite de desempenho com acervo real |
| 006 | Guardas e exportação de legado/desconhecido passaram. Round-trip integral do editor para todos os schemas NÃO EXECUTADO |
| 007 | Falhas de cópia/leitura/conflito exibidas ou rejeitadas com diagnóstico. Falha da própria compensação tem log para recuperação, sem fila automática. Auditoria geral de requestId permanece pendente |
| 008 | Backup/restore conjunto de fixtures passou; não substitui backup dos dados pessoais existentes |
| 009 | Lint, tipos pelos builds, suites, HTTP e browser executados. `prisma generate` retornou EPERM de DLL em uso; ver F7.md |
| 010 | Chromium 157 e texto japonês testados. Segundo motor, IME real e clipboard completo NÃO EXECUTADOS |

## Defeitos e resolução

| ID | Gravidade / origem | Evidência, impacto e resolução |
|---|---|---|
| BUG-F7-001 | Alta, requisito indispensável à F7 | Tolerância de 5 min e update sem token no WHERE permitiam sobrescrita. CORRIGIDO E VERIFICADO: CAS, trigger monotônica e concorrência real |
| BUG-F7-002 | Alta, comportamento anterior de F2 | H-F7-004: mover seção só muda raiz; descendentes ficam incoerentes. REPRODUZIDO, não corrigido nesta etapa; requer propagação transacional do ramo |
| BUG-F7-003 | Alta, comportamento anterior de F4 | H-F7-017: trash só muda pai, deixando filha ativa. REPRODUZIDO, não corrigido nesta etapa; requer lotes e restauração consistente |
| BUG-F7-004 | Média, comportamento anterior de F2 | Reload retorna ao início; não há endereço persistido da página selecionada. IDENTIFICADO por UI e inspeção; requer rotas por ID e validação de navegação |

## Próxima verificação

Resolver explicitamente as dependências anteriores e então repetir H-F7-004/H-F7-017 e os CT afetados. Completar os QA não executados e a cobertura funcional parcial antes de mudar F7 para VERIFICADA. Não basta repetir build ou reinterpretar os relatórios antigos como aprovação atual.

## Atualização — diagnóstico e correções de 13/11/2026

Código atual: mesma branch/HEAD e working tree preservada, incluindo migração `20261113140000_f7_trash_batches`, alterações de serviço e navegação. Banco `biblioteca_test_f7_corrections` e bucket `biblioteca-test-f7-corrections` exclusivos; frontend 3018/API 3017, Chromium 157. Registros antigos são mantidos acima para comparação.

| ID / requisito | Reprodução e teste de regressão atual | Resultado |
|---|---|---|
| H-F7-004 / RF-004 | Mesmo auditor antes FALHOU; depois observou filha FACULDADE | PASSOU — BUG-F7-002 corrigido e verificado |
| C-F7-002 / RN-002/003/004 | Ramo de três níveis, descendente excluído antes, status independente, anexos/JSON/IDs preservados; movimento por PATCH/reorder, ciclo concorrente e rollback de falha injetada | PASSOU — integração real, 9 testes de hierarquia/lixeira ao todo |
| H-F7-017 / RF-017 | Mesmo auditor antes observou filha ativa; depois observou `deletedAt` preenchido | PASSOU — BUG-F7-003 corrigido e verificado |
| C-F7-003 / RN-010/011 | Lote inteiro restaurado pela filha; exclusão anterior mantida; mãe indisponível resulta em raiz/aviso; legado sem lote e outra conta | PASSOU em integração e UI real |
| C-F7-004 / RF-005 | Nova montagem/deep link, reload, Back/Forward e criação sem substituir a coleção no histórico | PASSOU em Jest e Chromium — BUG-F7-004 corrigido e verificado |
| C-F7-005 / RN-017, QA-002/007 | API real desligada ao tentar sair: URL, nome local e editor preservados; religada e nova tentativa salvou e navegou | PASSOU — interrupção de rede real em servidor próprio de teste; mensagem orientada e popstate também cobertos em Jest |
| C-F7-006 / RNF-006/008 | Nova migração no clone anterior de 30 páginas; comparar hash de todos os campos anteriores, sem criar lotes artificiais | PASSOU — hash antes/depois `5ed764004ba57d8f2de078d3a6831cfb`; lote não nulo em zero registros legados |
| C-F7-007 / RF-025/026 | Regressão completa de portabilidade; smoke HTTP real; criar/editar/restaurar versão pelo browser após corrigir navegação | PASSOU — conteúdo original confirmado em nova leitura da API |
| C-F7-008 / QA-009 | Backend 21 suítes/128 testes; frontend 6 suítes/23 testes; E2E existente 26 testes; lint e build dos dois projetos | PASSOU — fixture E2E ajustada para callback transacional, sem reduzir expectativas |

Atualização da matriz: RF-004/CT-004, RF-005/CT-005 e RF-017/CT-017 deixaram de ter as falhas conhecidas da rodada inicial. Os cenários acima estão verificados; não se declara cobertura integral de todos os CT/RNF. QA-002/007 ganharam evidência de saída com rede realmente indisponível e recuperação posterior. Leitor de tela, segundo motor, IME real, massa representativa e demais lacunas explicitadas anteriormente continuam NÃO EXECUTADOS/PARCIAIS.

BUG-F7-001 permanece corrigido e foi revalidado. BUG-F7-002/003/004: **CORRIGIDO E VERIFICADO**, sem falha remanescente nessas reproduções. `prisma generate` continua com EPERM de ambiente, apesar de JS/tipos e runtime real validados. Próxima ação atual: completar os QA/CT remanescentes e tratar geração em ambiente sem bloqueio da DLL, sem repetir indiscriminadamente suítes aprovadas nem avançar de etapa.

## Verificação do incidente local BUG-F7-005

| ID | Cenário | Resultado |
|---|---|---|
| C-F7-009 | Conferir banco efetivo e histórico antes da correção | CONFIRMADO: backend usa `localhost:5433/biblioteca_estudos`; três migrações F7 pendentes |
| C-F7-010 | Backup SQL e 19 objetos; recuperar em banco/bucket novos; aplicar migrações no clone | PASSOU: dados e objetos idênticos por contagens/hashes; migrações concluídas |
| C-F7-011 | Aplicar migrações na origem local e comparar dados anteriores | PASSOU: seis tabelas com mesmos hashes/contagens; nenhuma exclusão ou reset |
| C-F7-012 | Repetir `prisma.area.findMany()` e `AreasService.findAll()` na origem local | PASSOU, consultas somente leitura; nenhuma coluna ausente |
| C-F7-013 | Conferir histórico depois da correção | PASSOU: 11 migrações, `Database schema is up to date!` |

Backup/clone preservados em `.f7-artifacts/local-upgrade-20261113_150000/` e nos destinos locais registrados em `F7-correcoes.md`. Nenhuma credencial ou conteúdo de nota foi exposto nos relatórios. Este incidente foi resolvido no banco local identificado; nenhuma alteração de produção foi executada.

## Verificação posterior — integrações fetch

| Caso | Resultado |
|---|---|
| Página fornecida em localhost:3001 | Documento, anexos, listagem e versões 200; imagem assinada 206; usuário confirmou resolução do sintoma após atualização |
| Alias 127.0.0.1 antes/depois | Antes: OPTIONS 500 e TypeError no browser. Depois: OPTIONS 204, resposta HTTP 401 com token propositalmente inválido, health 200, sem erro de conectividade |
| Renovação compartilhada com cliente real e API isolada | Documento/anexos/listagem 200, uma renovação; busca/lixeira/modelos/configurações 200, versão/ZIP 201 |
| Unidade/regressão | Backend 22 suítes/133 testes e frontend 7 suítes/31 testes passaram; lint e build aprovados |
| Privacidade/cancelamento | Mensagem sem query/token/body; AbortError preservado; logout impede sessão antiga; nenhuma repetição ilimitada |

Sem novo defeito do conteúdo da página reproduzido no localhost informado. Os defeitos de aliases e de coordenação do cliente foram tratados com evidência própria, sem atribuir automaticamente a eles o erro transitório do usuário. Registros anteriores permanecem históricos.


## Adendo de reconciliação F8 — 16/11/2026

Errata da matriz histórica: formatação/marcas pertencem a RF-006/CT-006; comandos / e + a RF-007/CT-007; conversão/duplicação/movimento/remoção de blocos a RF-008/CT-008; linguagem/cópia de código a RF-010/CT-010; código multilíngue no ZIP comprova RF-025/CT-025 nesse recorte. Assim, as linhas históricas 007/007 e 008/008 não podem usar formatação/exportação como aceite dos respectivos CT. A matriz canônica atual está em F8.md. As correções finais F7-002/003/004/005/006 não foram reabertas; regressões pertinentes passaram. EPERM teve saída zero em F8, preservado o registro histórico da falha.
