# Publicação da entrega F12

Runbook de preparação, atualizado em 17/11/2026 (America/Fortaleza). Os testes locais não autorizam push ou deploy. O estado dos painéis e do banco de destino precisa ser confirmado em cada publicação.

## Gates antes do push

- Conferir o diff dos commits e a ausência de ambientes, dumps, perfis e dados do acervo. Os cinco ZIPs liberados nominalmente em `.gitignore` são fixtures de reprodução; não liberar outros arquivos ZIP por extensão.
- Usar a branch `refactor/cleanup-general` e PR para `main`. Conferir novamente as referências remotas; não usar a branch local `main` desatualizada como base.
- Confirmar no Render a branch conectada, auto-deploy desligado, deploy hooks, Root Directory `backend` e se o serviço realmente usa `backend/render.yaml`.
- Confirmar no Vercel Root Directory `frontend`, Production Branch, previews, hooks e aplicação de `frontend/vercel.json`.
- Se push ou merge disparar deploy automático, tratar esse envio como publicação e obter a autorização correspondente antes dele.

O repositório declara `autoDeploy: false` no Render e `git.deploymentEnabled: false` no Vercel. Isso não comprova a configuração efetiva dos projetos existentes. A auditoria de 17/11 encontrou telas de login nos dois painéis; a integração GitHub não conseguiu ler a proteção de `main` (403).

O Actions executa em push para `main`, `develop` e `refactor/cleanup-general`, e em PR para `main`/`develop`. Os jobs validam backend, frontend e imagem Docker; não publicam. O resultado do CI deve corresponder ao SHA efetivamente enviado. Runs antigos ou testes locais não substituem esse resultado.

## Validação local e CI

Executar checks em checkout descartável do conteúdo previsto para envio, sem copiar `.env`, builds ou `node_modules` habituais. Instalar com `npm ci --include=dev` em cada pacote. No Windows, usar `npm.cmd`/`npx.cmd` se os wrappers PowerShell estiverem bloqueados.

A integração exige `NODE_ENV=test`, PostgreSQL local com nome `biblioteca_test_*` e MinIO local na porta 9000 com bucket `biblioteca-test-f7*`. Nunca apontar essas suítes ao banco ou bucket de produção. As suítes de storage preparam o bucket e recusam destinos fora desses limites.

Ordem de checks do backend: instalar, gerar Prisma Client, lint/tipos, aplicar as migrações no banco de teste novo, compilar, preparar storage, executar Jest e testes HTTP. O teste de bootstrap inicia o `dist/src/main.js` real, portanto o build precisa preceder o Jest. O workflow usa PostgreSQL e MinIO descartáveis e credenciais exclusivas de teste.

O MinIO de CI é construído por `.github/docker/minio.Dockerfile` a partir do commit oficial `9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a` (RELEASE.2025-10-15T17-29-55Z), com Go/Alpine fixados por digest. A construção acessa Docker Hub, GitHub e os módulos Go públicos; não usa a imagem MinIO do Quay nem credenciais de registro. O digest anterior do Quay retornou `401` no runner limpo em 18/11/2026. Uma imagem já presente localmente não comprova disponibilidade no registro: validar acesso anônimo e uma construção com `--pull --no-cache` ao alterar essa dependência. Ver [release oficial](https://github.com/minio/minio/releases/tag/RELEASE.2025-10-15T17-29-55Z).

Conferir também frontend (lint, testes, build/tipos), imagem Docker e `git diff --check`, incluindo os arquivos novos. O build frontend baixa fontes Google; garantir acesso do builder. A reprodução F12 está em [F12-testes](../notion/execucao/F12-testes.md). Não substituir as evidências históricas ao executar uma nova rodada.

## Configuração do destino

Conferir presença e destino das variáveis sem imprimir valores:

| Serviço | Variáveis |
|---|---|
| API | `NODE_VERSION`, `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` |
| Storage da API | `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_PUBLIC_URL`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_FORCE_PATH_STYLE`, `STORAGE_SIGNED_URLS`, `STORAGE_URL_EXPIRES_IN` |
| Frontend, no build | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STORAGE_URL` |

Usar segredo JWT próprio e storage privado com URLs assinadas. Não reutilizar credenciais de Compose/CI/fixtures. Conferir `ALLOW_LOOPBACK_IN_BUILD` ausente ou falso em produção. O frontend possui fallback de API; compilar com sucesso não comprova que a URL selecionada seja a pretendida.

O Render atualmente declara:

```sh
npm install --include=dev && npx prisma generate && npm run build && npm prune --omit=dev --omit=optional
npm run start:prod
```

O início executa `node dist/src/main`. O Docker usa a mesma entrada e roda sem root. O health check é `GET /health/ready`; ele faz `SELECT 1`, mas não valida tabelas novas nem storage. Validar esses recursos separadamente. `GET /health` é somente liveness.

O frontend usa `npm ci --include=dev` e `npm run build`; Vercel hospeda o projeto Next.js. Para smoke local do build, usar `npm run start`.

## Migrações e backup

Há 13 migrações na entrega, dez adicionadas após a base antiga e nenhuma criada especificamente pela F12. Não inferir quantas estão pendentes no destino pela quantidade de arquivos novos.

1. Confirmar identificação do banco e bucket de destino, janela de manutenção, responsáveis e RPO/RTO.
2. Ler `prisma migrate status` e `_prisma_migrations`: comparar nomes, checksums, `finished_at` e `rolled_back_at`, e investigar drift. Não editar SQL de migrações já aplicadas.
3. Obter backup consistente do PostgreSQL e dos objetos no mesmo ponto de corte. Registrar retenção, acesso, horário, manifesto de chaves/metadados e hashes; não guardar esses backups no Git.
4. Restaurar o backup atual em banco e bucket novos. Conferir tabelas, `_prisma_migrations`, contagens/digests, referências de anexos e leitura por URL assinada. O ensaio histórico F12 não comprova o backup atual de produção.
5. Aplicar somente migrações pendentes confirmadas, uma vez, por tarefa controlada usando o lockfile do SHA aprovado:

```sh
npm ci --include=dev
npx --no-install prisma migrate deploy
```

A tarefa recebe `DATABASE_URL` por injeção segura. Executar antes de iniciar a API nova e com as escritas bloqueadas. Não acrescentar migração automática ao início habitual. O runtime após `prune` não contém Prisma CLI; não presumir que `npx` nesse runtime use a versão aprovada. Não usar `migrate reset`, `db push`, remoção de volumes ou SQL reverso improvisado.

## Troca de versões e verificação

Ordem: backup/restauração aprovados → bloquear escritas e retirar API/clientes antigos da troca → migrações → API nova → conferir schema, readiness e storage → frontend novo → verificar clientes/recarga → liberar escritas.

A convivência de clientes antigos com documentos novos ainda exige teste específico. Não declarar rollout gradual seguro apenas porque a migração é aditiva. Manter manutenção enquanto houver clientes capazes de gravar conteúdo incompatível.

Usar conta dedicada com fixtures pequenas para o smoke: login/refresh/logout e isolamento entre contas; criar/editar/salvar/recarregar; conflito de revisão; árvore/movimento/duplicação com referências; upload e renovação de URL; modelos/coleções; versões; lixeira/restauração e exportação offline. Purge somente de fixtures descartáveis. Injeção de falha parcial de storage e quota fica na homologação.

Monitorar readiness, 5xx, 429, latência e `requestId`, sem registrar conteúdo pessoal, tokens ou SQL completo. Registrar SHA, IDs dos deploys API/frontend e resultado dos smokes antes de encerrar a janela.

## Rollback da aplicação

O HEAD antigo `f87fdbc` não é um rollback irrestrito seguro sobre o banco F12. Em ensaio isolado, sua rotina de exclusão removeu a mídia e depois recebeu `P2003` por revisão retida, mantendo a página sem o arquivo. O contrato também mudou: `DELETE /areas/:id` passou a enviar para lixeira, e purge é uma operação distinta.

Antes da publicação, guardar IDs/artefatos do par API/frontend de contingência e testar esse par com o schema e os documentos que existirão após a troca. Se não houver par compatível, manter escritas bloqueadas enquanto a correção é preparada. Não reabrir a API antiga para gravações por conveniência.

O rollback de aplicação usa os artefatos compatíveis confirmados nos provedores; não desfaz migrações nem recupera objetos removidos. Confirmar a retenção dos artefatos e o efeito do rollback sobre variáveis e auto-deploy nos painéis. Ver [rollback Render](https://render.com/docs/rollbacks).

## Recuperação do banco e storage

Parar escritas, preservar o estado pós-falha para diagnóstico e restaurar dump/PITR e objetos do mesmo ponto de corte em destinos novos. Validar integridade, chaves, URLs e assinaturas antes de trocar conexões/configuração e reabrir tráfego. Trocar somente `DATABASE_URL` não garante integridade da mídia. Registrar as escritas posteriores ao backup que possam ser perdidas e reconciliá-las conforme o RPO aprovado.

Recuperação de dados é uma decisão separada de rollback da aplicação. Não sobrescrever o destino original ou excluir dados durante a tentativa de recuperação.

## Dependências e risco residual

A auditoria encontrou advisories no grafo Prisma e em `file-type@16.5.4`. `prisma`, `@prisma/config`, `effect` e `deepmerge-ts` não permaneceram na imagem final após `prune`; continuam relevantes para a cadeia de build. `file-type` permanece em runtime, e uploads rejeitam a assinatura ASF antes de chamar o parser, com regressões aprovadas para a mitigação [GHSA-5v7r-6r5c-r473](https://github.com/advisories/GHSA-5v7r-6r5c-r473).

Antes da produção, registrar responsável, escopo, prazo e decisão de tratamento ou aceitação do risco residual. O aceite funcional F12 não equivale a aceite desses advisories. Não executar `npm audit fix --force` ou salto de Prisma 6 para 7 como reparo automático da preparação de commits.
