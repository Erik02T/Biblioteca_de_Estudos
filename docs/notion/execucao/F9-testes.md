# F9 — testes e evidências

Data: 16/11/2026. Execução local em fixtures; nenhum acervo habitual foi usado.

## Verificação estática e componentes

| Verificação | Resultado |
|---|---|
| `npm test -- --runInBand` em frontend | 15 suítes, 103 testes aprovados |
| `npm run lint` em frontend | Aprovado |
| `npm run build` em frontend | Aprovado; inclui TypeScript |
| `git diff --check` nos arquivos rastreados da F9 | Sem erro de whitespace |

Novos cenários verificam árvore de três níveis com status mistos, expansão/recolhimento, seleção, navegação por ID, caminho depois de movimento, exclusão de descendentes do seletor, órfãos/ciclos legados sem duplicação, criação de filha após confirmar edição da mãe e reabertura de raiz sem reaplicar o parentesco de uma criação anterior. As suítes preexistentes de fila, rascunhos, conta, navegação, salvamento e editor também passaram. Tiptap é mockado nos testes de `Home`; o aceite abaixo usa Tiptap real.

## Navegador e API reais

Roteiros em `output/playwright/F9-navegacao.js`, `F9-apresentacao.js` e `F9-icone.js`. Executados com Playwright CLI em sessões próprias. O plugin de navegador estava com seu perfil ocupado; não foi encerrado. API compilada existente de F8, banco e storage reais isolados; backend não modificado nesta etapa.

| Cenário | Resultado observado |
|---|---|
| BR-F9-01 — três níveis | Japonês ESTUDANDO → Partículas ESTUDADO → は e が ESTUDANDO; quatro IDs da fixture representados uma vez; ancestrais abertos e neta selecionada |
| BR-F9-02 — escrever e navegar | Enter no título focou o Tiptap; edição conjunta de título/corpo, clique no caminho, GET remoto e Voltar/Avançar conservaram os dados |
| BR-F9-03 — mover ramo | Partículas foi movida para Gramática pelo seletor; a neta manteve a mãe; GET e recarga confirmaram caminho e parentesco; descendente não era uma opção de destino |
| BR-F9-04 — filha direta | Menu Nova subpágina, título selecionado, Enter, escrita e Criar página; GET confirmou `parentId` da mãe sem preencher propriedades |
| BR-F9-05 — foco e ferramentas | Entrada no modo foco levou ao texto; Escape saiu do modo mantendo a URL; abrir/fechar propriedades manteve o mesmo elemento Tiptap |
| BR-F9-06 — telas | Propriedades em 320/375/768/1024/1440 CSS px sem overflow horizontal; capturas `F9-<largura>.png` |
| BR-F9-07 — saída sem rede | PATCH abortado; caminho e Voltar do navegador recusaram a saída; título/URL preservados; reconexão e Salvar e voltar confirmados por GET |
| BR-F9-08 — título longo | Título multilinha continuou inteiro depois de reduzir a largura a 375 CSS px; captura `F9-titulo-375.png` |
| BR-F9-09 — capa | Upload PNG no input real, associação por ID, posição 75, recarga e GET confirmados; remoção tornou `coverAttachmentId` nulo; arquivo continuou em materiais |
| BR-F9-10 — ícone | Prompt nativo aceitou 🌸; autosave, GET e recarga confirmados. Prompt com espaço removeu ícone após trim; GET/recarga confirmaram string vazia |
| BR-F9-11 — reflow | Em viewport de 720 CSS px, largura de conteúdo <= viewport; equivalente de layout de 1440 px a 200%, sem ensaio do comando de zoom nativo |

Os seis grupos finais do roteiro de navegação retornaram `true`. O roteiro de apresentação retornou `wrappingTitle`, `coverCropAndReopen` e `coverRemoval` verdadeiros. A verificação separada de ícone retornou `{chosen:true,reopen:true}` e depois `{removed:true,reopen:true}`. Os erros de rede de BR-F9-07 foram induzidos e esperados.

## Reprodução

1. Usar os serviços e dependências locais já documentados na F8; `node backend/scripts/run-f8.cjs serve` inicia somente a API de fixtures em 3027. Banco/migrations F8 devem estar preparados. Não apontar esses roteiros ao acervo habitual.
2. Compilar frontend com `ALLOW_LOOPBACK_IN_BUILD=true`, `NEXT_PUBLIC_API_URL=http://localhost:3027` e `NEXT_PUBLIC_STORAGE_URL=http://localhost:9000/biblioteca-test-f7-f8-20261116`; iniciar `next start -p 3028` com esse ambiente.
3. `npx --yes --package @playwright/cli playwright-cli -s=f9 open http://localhost:3028`.
4. Executar `playwright-cli -s=f9 run-code --filename output/playwright/F9-navegacao.js --raw`, depois `F9-apresentacao.js`. Ambos criam/operam somente fixtures. O segundo também pode criar uma conta própria em sessão nova.
5. Para o ícone, obter referência atual por snapshot/find, clicar Escolher ícone, usar `dialog-accept 🌸`, executar `F9-icone.js`. Repetir com um espaço como resposta para conferir remoção. O CLI deve tratar cada prompt em comando próprio.
6. Revisar screenshots, resultado dos scripts e console. Rodadas repetidas podem consumir o limite normal de 120 requisições/15 minutos por IP; aguardar a janela ou encerrar/reiniciar exclusivamente a API de fixtures. Não mudar os limites do produto para fazer o teste passar.

Não foram repetidas integralmente as suítes backend F8, pois não houve alteração de backend. Não executados: segundo motor, leitor de tela, composição IME física, zoom nativo, reinício do SO, coleção de grande volume ou homologação das entregas F10–F12.

## Rodada de diagnóstico e correção — 16/11/2026

**Resultado: VERIFICADA no recorte local abaixo.** A entrega anterior tinha sido verificada em fixtures atualizadas; o banco habitual ainda não tinha a migração exigida. O incidente do usuário foi registrado como **BUG-F9-001**, inicialmente REPRODUZIDO e depois CORRIGIDO E VERIFICADO. Histórico e causa em [F9-correcoes.md](F9-correcoes.md).

Estado de código: branch `refactor/cleanup-general`, HEAD `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`, working tree existente preservada. Node 24.13.0, npm 11.6.2, Next 16.4.5. Não houve alteração nos componentes, serviço de criação, schema-fonte ou migrações-fonte nesta rodada; a correção foi a aplicação da migração F8 existente no banco local.

| ID / requisito | Ambiente e passos | Esperado / observado | Estado / evidência |
|---|---|---|---|
| DX-F9-001 / RF-002 | Inspeção somente de schema da origem `biblioteca_estudos` | Tabela de recibos necessária; estavam presentes 11 migrações e ausente `AreaCreationRequest` | **PASSOU** para o diagnóstico; estado anterior registrado no relatório privado do run |
| DX-F9-002 / RF-002/014 | Clone fiel ainda sem migração; POST real e `F9-criacao-antes.js` | Reproduzir o relato; retornou exatamente **500 / Erro interno do servidor**, rascunho permaneceu e zero páginas foram criadas na conta de teste | **FALHOU antes da correção**, de forma esperada; log identificou tabela inexistente; `F9-criacao-antes.png` |
| DX-F9-003 / RF-001 | Backup e restauração do run `20261116_122057` | Oito tabelas e 21 objetos iguais entre origem, backup e clone | **PASSOU**; `prepare` e `verify-clone` |
| DX-F9-004 / RF-002/014 | `migrate-clone`, `http-after`, mesma sessão de navegador com `F9-criacao-depois.js` | Criação **201**, repetição com mesmo ID, uma página; título/texto preservados após recarga | **PASSOU**; `F9-criacao-depois.png` e relatório do run |
| DX-F9-005 / RF-001/002 | `apply-source` após as provas no clone | 12 migrações na origem, tabela presente, lookup Prisma aprovado; oito tabelas e 21 arquivos anteriores inalterados | **PASSOU**, sem POST de teste na conta habitual |
| REG-F9-001 / RF-003/004/005/014 | `F9-navegacao.js` no clone migrado | Todos os grupos de navegação/movimento/recarga/proteção de saída aprovados | **PASSOU**; nova execução dos cenários BR-F9-01–07 |
| REG-F9-002 / RF-002/014 | `node scripts/run-f8.cjs test creation-recovery.integration.spec.ts` | 5 testes com HTTP/PostgreSQL reais: reinício, repetição, concorrência, isolamento e conflitos de chave | **PASSOU**, 1 suíte / 5 testes; banco `biblioteca_test_f8_20261116` |
| CK-F9-001 | `npm test -- --runInBand` em frontend | 15 suítes / 103 testes | **PASSOU** |
| CK-F9-002 | Frontend `npm run lint`, `npx tsc --noEmit`, `npm run build`; backend `npm run build`; `node --check scripts/f9-creation-upgrade.cjs` | Sem erro | **PASSOU** |
| CK-F9-003 | `prepare` repetido com o mesmo run, sem elevação | Recusar sobrescrita antes de qualquer mutação | **PASSOU**; saída 1 esperada: `Refuse to overwrite an earlier recovery run` |
| CK-F9-004 | Formatação do script de manutenção e nova inspeção somente de leitura | Prettier e sintaxe aprovados; origem permanece com 12 migrações | **PASSOU** |
| DX-F9-007 | URL pública da API na configuração local do frontend e checks de saúde | `localhost:3000`; `/health` e `/health/ready` retornam 200 | **PASSOU**, sem imprimir credenciais ou alterar `.env` |
| DX-F9-006 | Criar usando a conta e a aba habituais do usuário | Repetir a ação após atualizar schema | **NÃO EXECUTADO pelo agente**; a origem foi verificada sem inserir fixtures |

Comandos de recuperação, em `backend`, com `F9_LOCAL_UPGRADE_RUN=20261116_122057`: `f9-creation-upgrade.cjs prepare` → `serve-clone` → `http-before` → `migrate-clone` → `http-after` → `apply-source`. Os roteiros de navegador antes/depois foram intercalados antes da aplicação na origem. Esses modos registram evidências e recusam sobrescrita; **não repetir `prepare` no mesmo run nem executar a reprodução “antes” contra um banco já corrigido**. Para confirmar o estado atual sem mutação: `node scripts/f9-creation-upgrade.cjs inspect`.

Não foram repetidos os testes integrais de capa/ícone, clipboard, leitor de tela, segundo motor e IME físico: não foram alterados pela correção de schema. Os limites da homologação anterior permanecem; nenhum teste de etapa futura foi considerado obrigatório para fechar este incidente.
