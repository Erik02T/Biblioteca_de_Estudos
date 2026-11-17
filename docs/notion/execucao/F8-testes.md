# F8 — Testes, evidências e limites

Data: 16/11/2026, America/Fortaleza. Resultado: **correções de integridade aprovadas nos cenários executados; aceite global parcial**. Referência: `F8.md` e `F8-referencia.json`.

## Ambiente protegido

Windows/PowerShell, Node 24.13.0, npm 11.6.2, Nest 11.2.3, Prisma 6.19.0, Next 16.4.5, React 19.2.8, Tiptap 3.31.3; PostgreSQL 16.14/MinIO locais. Chromium 157.0.8103.52.

- Suítes reais: `biblioteca_test_f8_20261116`, bucket `biblioteca-test-f7-f8-20261116`.
- Navegador: frontend compilado em 3028, API compilada em 3027; contas/páginas sintéticas próprias. Não se usou a sessão pessoal do usuário.
- Migração/recuperação: origem de **fixtures** `biblioteca_test_f7_restore_final`, clone novo `biblioteca_test_f8_upgrade_20261116`; nenhuma escrita na origem.
- `biblioteca_estudos` foi consultado somente para confirmar o histórico de 11 migrações. Não recebeu a migração F8, fixtures ou reset.
- Acesso ao Docker exigiu execução fora do sandbox. Instalação de `fake-indexeddb` como dependência de desenvolvimento também exigiu acesso à rede; não se executou `npm audit fix` nem upgrade da stack.

## Checks do estado combinado

| ID | Comando/ambiente | Resultado observado |
|---|---|---|
| CK-F8-01 | `cd backend` → `node scripts/run-f8.cjs test --json --outputFile=../.f8-artifacts/backend-tests.json` | **26 suítes, 152 testes passaram**, incluindo PostgreSQL/MinIO, HTTP e bootstrap real |
| CK-F8-02 | `cd frontend` → `npm.cmd test -- --runInBand --watch=false --json --outputFile=../.f8-artifacts/frontend-tests.json` | **14 suítes, 98 testes passaram** |
| CK-F8-03 | `cd backend` → `npm.cmd run test:e2e -- --runInBand` | **26 testes passaram**, Prisma mockado; não substitui CK-F8-01 |
| CK-F8-04 | `npm.cmd run lint` nos dois projetos | Passou sem erros ou avisos depois de corrigir formatação/tipagem dos arquivos novos |
| CK-F8-05 | `npm.cmd run build` nos dois projetos | Passou; build frontend com API 3027, bucket de fixtures e override local de loopback no processo |
| CK-F8-06 | `cd backend` → `npx.cmd prisma generate` | Primeira tentativa EPERM; segunda **saída zero**, após interromper somente backend/watcher identificados como consumidores do projeto; serviço habitual reiniciado |
| CK-F8-07 | `node scripts/run-f8.cjs prepare` | Banco exclusivo criado, 12 migrações aplicadas sem reset; origens habituais não alteradas |
| CK-F8-08 | `node scripts/f8-upgrade-check.cjs` | Dump de fixtures F7 restaurado em destino novo; migração 11→12; oito contagens/hashes anteriores iguais |
| CK-F8-09 | Auditor original `f7-homologation.cjs` com `F7_TEST_DATABASE=biblioteca_test_f8_20261116` | H-F7-004 e H-F7-017 passaram; resultado em `.f8-artifacts/f7-audit.json` |

Na exploração inicial passaram 83 testes frontend e 118 testes backend sem integrações. Esses números identificam o recorte inicial, não devem ser somados aos resultados finais. Falhas de prontidão/erro inesperado nos logs do E2E são injeções deliberadas da suíte. O aviso preexistente de depreciação `ts-jest.isolatedModules` permanece; não se desativaram testes, guardas ou expectativas para obter aprovação.

## Regressões executadas

| ID | Requisito / cenário | Procedimento e resultado |
|---|---|---|
| INT-F8-01 | RF-002 / CT-002: resposta perdida e reinício | Integração HTTP real cria com chave, fecha/recria a aplicação Nest e repete: mesmo ID/revisão, uma página e um recibo |
| INT-F8-02 | RF-002: concorrência e conta | Duas criações paralelas com a mesma chave produzem um ID; outra conta pode usar a chave sem compartilhar página; GET cruzado 404 |
| INT-F8-03 | RF-002: replay após edição | Editar remotamente e repetir criação retorna a página atual; não reaplica o título inicial; chave com outra carga retorna 409 |
| INT-F8-04 | RF-002: lixeira/purge/validação | Retry de página excluída ou purgada retorna 409; recibo retido; UUID inválido 400; `/auth/me` sem autenticação 401; cliente sem header continua aceito |
| INT-F8-05 | RF-014: CAS F7 | PATCH concorrentes com a mesma revisão: um 200 e um 409; sem revisão 400. As regressões existentes de trigger, restauração e escritores legados também passaram |
| FE-F8-01 | RF-014: fila única | Com primeira resposta pendente, editar título/categoria/corpo; duas escritas serializadas preservam o snapshot mais recente e usam a revisão confirmada |
| FE-F8-02 | RF-002/014: criação incerta | Resposta perdida conserva pedido/chave; edição posterior não altera o replay; após confirmar o ID, envia PATCH da edição nova |
| FE-F8-03 | RF-014: PATCH incerto | Nova leitura aceita confirmação somente se revisão-base ainda corresponde ou remoto equivale ao snapshot enviado; outra edição remota bloqueia, sem rebase automático |
| FE-F8-04 | RF-014: IndexedDB e conta | Adaptador IndexedDB transacional exercitado com `fake-indexeddb`: registros independentes entre abas, remoção condicional, escrita antiga, quota/falha, proprietário diferente e resposta atrasada após troca de conta |
| FE-F8-05 | RF-014: remontagem da interface | `Home` desmontado/remontado oferece rascunho; recuperação confere GET remoto e salva metadados; troca de conta remove formulário anterior e não oferece seu journal |
| FE-F8-06 | RF-002: correção após rejeição | HTTP 400 permite corrigir o pedido; 500 mantém pedido/chave incertos. JSON equivalente com propriedades reordenadas não provoca falso conflito |
| FE-F8-07 | RF-014: metadados inalterados | Com destino excluído e ícone legado nulo, alterar título envia somente nome/revisão; mantém vínculo e ícone, sem bloqueio de uma validação alheia à alteração |
| INT-F8-06 | RF-014: bootstrap/CORS/renovação | Processo compilado real: POST/PATCH com token inválido retornam 401 com CORS; preflight inclui Idempotency-Key e aliases continuam restritos; token assinado realmente expirado é renovado pelo cliente frontend efetivo e criação termina em 201 |
| INT-F8-07 | RF-014: identidade e limites | GET `/auth/me` mantém limite da API, sem consumir o orçamento de credenciais; 11ª tentativa de credenciais e 121ª leitura API continuam bloqueadas nos testes |
| REG-F8-01 | RF-004/017: regressões F7 | Propagação do ramo, rollback, ciclos concorrentes, reorder, criação concorrente com trash, exclusão anterior/lote, legado sem lote e isolamento passaram |
| REG-F8-02 | RF-025/026: regressões F7 | ZIP, hashes, mídia retida, backup anterior, CAS de restore, schema desconhecido, ownership, alterações durante captura e compensação passaram com banco/bucket reais |

Os testes de componente de navegação usam Tiptap mockado; o roteiro abaixo exercita o `page.tsx`, coordenador, Tiptap, IndexedDB, API e banco efetivamente usados pelo produto. O `doc` vazio de uma fixture antiga foi corrigido para um documento estruturalmente válido com parágrafo ao adicionar o teste de recuperação; a guarda contra estrutura inválida permaneceu ativa.

## Navegador real

Roteiro reproduzível: `output/playwright/F8-integridade.js`, executado pela ferramenta Playwright `browser_run_code_unsafe` com `filename` apontando para o arquivo, a partir de `http://localhost:3028`. Não depende de `@playwright/test` nem reimplementa o salvamento. Ele cria contas exclusivas e só permite o frontend isolado.

| ID | Cenário | Resultado observado |
|---|---|---|
| BR-F8-01 | Servidor confirma POST, automação aborta a resposta; editar e repetir | Duas tentativas, **uma página**, mesmo ID confirmado; edição posterior persistida. Na investigação inicial: ID `bc779d1a-ae8e-427d-973b-2903233a83bd`; o roteiro final usa novos IDs |
| BR-F8-02 | Segurar resposta do primeiro PATCH já confirmado; editar corpo e título durante espera | **Duas escritas**; última combinação de conteúdo/metadados confirmada por GET; resposta anterior não apaga edição posterior |
| BR-F8-03 | Rejeitar PATCH por rede, fechar documento e abrir nova página no mesmo perfil | Journal preservado no IndexedDB; remoto permanece intacto até ação explícita; recuperação autorizada persiste texto japonês e título, confirmados por GET |
| BR-F8-04 | Duas abas com mesma revisão; depois tentar recuperar o journal divergente | Aba vencedora persiste; perdedora conserva texto e oferece download; recuperação sobre remoto novo é recusada, sem sobrescrita |
| BR-F8-05 | Trocar para outra conta na mesma origem e voltar | Conta B recebe página indisponível e não vê formulário/journals A; conta A volta a ver seu journal |
| BR-F8-06 | Checkpoint/versões após refatorar fila | Criar “F8 preservada”, editar, restaurar com confirmação; GET retornou código anterior e não o texto posterior |
| BR-F8-07 | Reflow da recuperação | A 320 CSS px: `scrollWidth=320`, sem overflow horizontal no recorte; screenshot `F8-recuperacao-320.png` |
| BR-F8-08 | Referência excluída/ícone nulo | Reprodução anterior produziu “Página referenciada não encontrada.”; roteiro final salva título/corpo e confirma vínculo e ícone nulo inalterados por GET |
| BR-F8-09 | 401 legível no navegador | Reprodução anterior devolveu POST/PATCH 401 sem CORS e o navegador rejeitou fetch; após ajuste, POST inválido retorna status 401 acessível ao JavaScript |

BR-F8-03 prova descarte da memória do documento e reabertura com armazenamento persistente. **Não** é ensaio de kill do processo do navegador, reinício do Windows ou recuperação após perda de disco. O teste HTTP fecha/reabre a aplicação Nest, não o PostgreSQL. Esses limites são mantidos na classificação RF-014 e no backlog.

## Inventário direto de interface

| Caso | Observado / evidência |
|---|---|
| UI-F8-01 — RF-003/005 | Criados raiz ESTUDANDO, filha ESTUDADO e neta ESTUDANDO. Na lateral da raiz: raiz uma vez, filha zero vezes, neta uma vez separada. O filtro da coleção elimina um ancestral. `F8-inventario-arvore.png`; não é regressão da transação de movimento F7 |
| UI-F8-02 — RF-007/008 | `/` abriu menu real com 15 tipos; Código inserido. Menu de ações mostrou Duplicar, Mover acima/abaixo, Excluir. `F8-inventario-comandos.png` e `F8-inventario-blocos.png`; não foram classificados como ausentes |
| UI-F8-03 — RF-010 | Com um bloco de código real, zero botões de copiar código e zero seletores de linguagem. O texto japonês foi preservado no snapshot restaurado; isso não testa clipboard |
| UI-F8-04 — RF-012/013 | Painel de materiais e seletor de página referenciada existem. Não há comando/nó inline integrado por attachmentId/targetPageId; código/guardas confirmam a lacuna. Ausência do botão isoladamente não foi usada como prova |
| UI-F8-05 — RF-021 | Código apresenta drag de cards apenas no recorte de raízes/área/status/ordem manual sem filtro; blocos têm menu de movimento, sem drag equivalente. CT-021 integral não executado |
| UI-F8-06 — RF-022/023 | Alternar TABLE/BOARD exibiu tabela/quadro reais. Zero botões “Salvar visualização” e zero controles diretos de status no quadro; PF não fornece callback de persistência |
| UI-F8-07 — RF-024 | Galeria e chamada apply presentes; serviço copia JSON para nova Area, sem cópia/remapeamento de anexos. Preview atual é nome/descrição. Dois modelos com mídia no navegador não foram homologados |

## Reprodução local

1. Subir PostgreSQL/MinIO do Compose e instalar dependências dos dois projetos com os lockfiles. Não usar banco/bucket pessoais como destino de teste.
2. Em `backend`, executar `node scripts/run-f8.cjs prepare`, que só cria `biblioteca_test_f8_*` e aplica migrations com URL explícita. O nome de bucket mantém o prefixo exigido pelas regressões de portabilidade existentes.
3. Executar CK-F8-01–05. `run-f8 test` compila o backend antes da suíte, pois a integração de bootstrap executa o entrypoint compilado real. `test:e2e` usa mocks; a suíte por `run-f8` exige banco real e as guardas de teste continuam obrigatórias.
4. Compilar frontend com `ALLOW_LOOPBACK_IN_BUILD=true`, `NEXT_PUBLIC_API_URL=http://localhost:3027` e storage do bucket isolado. Compilar backend.
5. Iniciar `node backend/scripts/run-f8.cjs serve`; em `frontend`, iniciar `next start -p 3028` com o mesmo ambiente local. Se a porta estiver ocupada, não encerrar processo alheio.
6. Abrir `http://localhost:3028`, executar o roteiro Playwright e comparar resultado de seus sete grupos com `.f8-artifacts/browser-result.json`. Os limites permanecem ativos; reutilizar a API durante muitas rodadas pode legitimamente consumir o orçamento da janela.
7. Para repetir a migração de clone, escolher destino novo em `f8-upgrade-check.cjs`; o script **recusa** sobrescrever o destino já criado nesta rodada. Dump/inventário ficam preservados.

## Não executado e próximos limites

- Reinício forçado do processo/SO, privação física de armazenamento, navegadores/modos privados diferentes e migração de journals futuros.
- Segundo motor, leitor de tela, auditoria WCAG, IME japonês real, clipboard concedido/negado, zoom completo e desempenho com acervo representativo. Digitar string japonesa não comprova composição IME.
- CT completos de árvore/caminho, operação dentro/entre listas, mídia/referência inline, purge operacional, views salvas e modelos com mídia. Essas capacidades permanecem em F9–F12, não foram implementadas para fazer a matriz parecer concluída.
- Nova restauração conjunta do bucket de um acervo habitual/produção. E5 restaura banco de fixtures; testes E4 usam bucket separado e a evidência histórica de recuperação conjunta de F7 permanece identificada como histórica.
- Não foram repetidos os scripts HTTP fixos de F7 na porta 3017: a suíte real de portabilidade/hierarquia e HTTP F8 em banco real foi executada, além do E2E HTTP existente.

As falhas intermediárias de formatação, tipo genérico de `createNestApplication`, fixture inválida e comparador JSON foram corrigidas antes dos resultados finais. O teste de retorno aos filtros passou a aguardar a montagem assíncrona inicial, evitando clicar um card transitório desmontado; todas as assertivas de navegação/filtros permanecem. Timeout de dois locators exploratórios foi resolvido usando o nome acessível completo; não se apresentou esse timeout como falha do produto. O 429 real da identidade e o 401 sem CORS foram investigados/corrigidos, conforme `F8-correcoes.md`. Os erros de rede/404/409 induzidos nos cenários esperados não foram ocultados.
