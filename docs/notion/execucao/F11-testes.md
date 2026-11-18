# F11 — Testes e evidências

17/11/2026. Jornadas funcionais executadas exclusivamente com contas e objetos de fixtures. A atualização do acervo habitual foi restrita à migração aditiva, com backup, restauração em clone e verificação de preservação; a conferência posterior foi somente de leitura.

## Verificações automatizadas

| Verificação | Resultado |
|---|---|
| Backend Jest, incluindo integrações reais | 28 suítes e 163 testes aprovados |
| HTTP E2E com Prisma simulado | 26 testes aprovados; não equivalem a PostgreSQL/storage reais |
| Frontend Jest | 18 suítes e 129 testes aprovados |
| Lint frontend/backend | Aprovado |
| Builds de produção frontend/backend | Aprovados, incluindo TypeScript |
| Banco habitual após atualização | 13 migrações em dia; leitura da coleção e tabelas novas aprovada |

As oito integrações F11 usam Nest/ValidationPipe, PostgreSQL e MinIO. Cobrem mais de 100 páginas, combinação de filtros antes da paginação, ordem reversa, página excedente, metadados sem corpos, busca na terceira página, identidade/CAS/ownership, abertura sem nova revisão, CRUD e configuração inválida/nula, captura com mídia, aplicações concorrentes idempotentes, cópias físicas, exclusão da origem/modelo, compensação e limpeza repetível. Texto legado é preservado e mídia legada sem manifesto é recusada sem criar página incompleta.

Os testes frontend cobrem URL/configuração com nível zero, transmissão do nome da visualização, configuração incompatível, edição com conflito, menu/favorito do quadro, falha de aplicação mantendo seleção/chave e criação de modelo após checkpoint. Uma regressão de navegação verifica título pendente seguido de favorito e salvamento com a revisão própria confirmada.

Após completar a exibição dos ancestrais no contexto da busca, o build e o lint passaram novamente, assim como 28 testes direcionados de navegação/hierarquia. Esses testes já pertencem à suíte frontend e não são somados novamente ao total.

[Resultados dos checks](../../../output/playwright/F11-checks-resultados.json). Os erros de conexão e banco impressos pelos E2E simulados são falhas induzidas dos cenários de prontidão/tratamento de exceção. O aviso preexistente de depreciação de `isolatedModules` no ts-jest não impede as suítes.

## Navegador real

Chromium, frontend de produção em `localhost:3058`, API em `localhost:3057`, banco `biblioteca_test_f8_20261116` e bucket `biblioteca-test-f7-f8-20261116`. Build em `.next-f11`, separado dos demais. Os roteiros fazem **48 verificações observáveis**, sem somá-las aos testes de unidade como medida de cobertura.

| Roteiro | Evidência |
|---|---|
| `F11-collections.js` — 10 verificações | Propriedades por ID, status no quadro, favorito sem visita, manutenção de paginação ao trocar layout, filtro antes da paginação, visualização reaberta, busca no corpo além dos 20 primeiros e Recentes. |
| `F11-models.js` — 6 verificações | Criação pela interface, preview com mídia real, falha 503 induzida mantendo contexto, dois destinos independentes, IDs/objetos distintos e imagem preservada após remover o arquivo original da fixture. |
| `F11-surfaces.js` — 26 verificações | Lista/tabela/quadro em 320/375/720/768/1024/1440 px, scroll horizontal restrito à tabela, rascunho com favorito, conflito 409 real, recarga explícita, Tab, galeria a 320 px, Escape/foco e ausência de erros de execução nesse roteiro. |
| `F11-final-ordering.js` — 6 verificações | Direções ascendente/descendente persistidas, agrupamento da segunda página, reset ao trocar ordenação e filtro inválido preservando consulta e campos. Executado em 17/11 no build final. |

Resultados JSON e imagens ficam em `output/playwright/F11-*`. Os roteiros de coleções, modelos e superfícies foram concluídos em 16/11; as suítes e o roteiro final foram conferidos novamente em 17/11. Os 720 px verificam reflow equivalente, sem afirmar acionamento do zoom nativo. Nenhum usuário habitual foi utilizado nos roteiros.

## Reprodução

1. Disponibilizar as fixtures F8 e aplicar migrations exclusivamente nelas com `node backend/scripts/run-f8.cjs prepare`. Executar `node backend/scripts/f11-checks.cjs` para as suítes, lint e builds. O runner guarda logs em `.f8-artifacts/f11-checks/` e publica somente resultados resumidos.
2. Executar `node backend/scripts/f11-serve.cjs`. No frontend, usar `NEXT_DIST_DIR=.next-f11`, `ALLOW_LOOPBACK_IN_BUILD=true`, `NEXT_PUBLIC_API_URL=http://localhost:3057` e `NEXT_PUBLIC_STORAGE_URL=http://localhost:9000/biblioteca-test-f7-f8-20261116`; iniciar o build de produção na porta 3058.
3. Abrir uma sessão própria do Playwright CLI. Executar `run-code --filename output/playwright/F11-setup.js --raw`, depois `F11-collections.js`, `F11-models.js` e `F11-surfaces.js`. Para repetir o roteiro de modelos, criar fixture nova: seu último passo exclui intencionalmente um material da origem.
4. Entre grupos longos, reiniciar somente a API de fixtures se a janela de 120 requisições/15 minutos for consumida. O launcher conserva o segredo local da sessão; os limites do produto não foram alterados. Para o roteiro final de ordenação, usar fixture nova do setup.
5. Gerar a referência do código com `node backend/scripts/f11-reference.cjs`. Para auditar o upgrade local, consultar `F11-local-upgrade-resultados.json`; dumps e inventários privados permanecem fora dos artefatos públicos.

## Limites

Leitor de tela, IME físico, toque físico, segundo motor e desempenho com um acervo grande representativo não foram homologados nesta etapa. A independência de arquivos foi verificada com objetos locais reais; indisponibilidade simultânea de storage e compensação pode exigir limpeza pelos logs. A exclusão interrompida de um modelo mantém seu manifesto para nova tentativa. A homologação integrada permanece em F12.
