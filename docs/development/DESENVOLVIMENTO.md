# Desenvolvimento, setup e verificações

Fontes: [manifest do backend](../../backend/package.json), [manifest do frontend](../../frontend/package.json), [Compose](../../docker-compose.yml), [exemplo de ambiente](../../env.example), [CI](../../.github/workflows/ci.yml) e [runner F12](../../backend/scripts/f12.cjs).

## Ambiente e instalação

A homologação F12 usou Windows e Node **24.13.0**; CI/Render declaram Node **22**. Essas são referências distintas, não uma atualização de dependências. No PowerShell desta máquina, use `npm.cmd` e `npx.cmd`, pois os wrappers `.ps1` estão bloqueados pela política de execução.

A entrega F12 está versionada com fontes, migrações e evidências públicas. O [manifesto F12](../../output/playwright/F12-codigo.json) identifica a rodada histórica anterior à organização dos commits; a [Prontidão F12](PRONTIDAO_F12.md) registra as correções posteriores e a validação da entrega organizada. O [relatório da limpeza](../archive/ORGANIZACAO_POS_F12.md) preserva o contexto da cópia de trabalho daquela época.

Para uma instalação nova, use `npm.cmd ci --include=dev` dentro de cada pacote. A preparação posterior à auditoria executou instalações reais em Windows/Node 24 e Linux/Node 22. O npm 10 do Node 22 detectou duas entradas transitivas opcionais ausentes, `@emnapi/core` e `@emnapi/runtime`; os dois lockfiles receberam somente essas entradas, sem trocar versões existentes. O CI agora instala pelo lockfile. Os dry-runs anteriores continuam registrados como evidência histórica da limpeza; resultados atuais estão em [Prontidão F12](PRONTIDAO_F12.md).

## Configuração local

Preserve arquivos de ambiente existentes. Somente quando ainda não existirem, use `env.example` como base de `.env` na raiz e `backend/.env`. Preencha os valores localmente; não copie configurações com credenciais para documentação ou commits.

Confira especialmente:

- PostgreSQL do Compose em `localhost:5433`, com banco escolhido explicitamente.
- API na porta `3000` e `FRONTEND_URL=http://localhost:3001`.
- JWT próprio e configuração S3/MinIO completa para mídia.
- Bucket existente antes de testar uploads; Compose não cria esse bucket automaticamente.

Em `frontend/.env.local`, configure `NEXT_PUBLIC_API_URL=http://localhost:3000` e a URL de storage correspondente ao ambiente. A [configuração Next](../../frontend/next.config.ts) valida URLs no build de produção.

Os comandos `start`, `start:dev` e `start:debug` do backend priorizam o arquivo local em desenvolvimento. `DOTENV_CONFIG_PATH` seleciona outro arquivo. Produção/testes e a execução direta do build preservam a precedência de variáveis injetadas. Fontes: [launcher](../../backend/scripts/start-local.cjs) e [loader](../../backend/src/environment.ts).

## Infraestrutura e execução habitual

Na raiz, com Docker disponível:

```powershell
docker compose up -d
docker compose ps
```

Em um acervo existente, não execute migrações como uma etapa automática de inicialização. Confira o histórico e siga o preparo com backup/restauração descrito em [Operação local](../deployment/OPERACAO_LOCAL.md). Em uma base nova e explicitamente escolhida, `npx.cmd prisma migrate deploy` e `npx.cmd prisma generate`, dentro de `backend/`, aplicam o histórico e geram o cliente.

Em terminais separados:

```powershell
cd backend
npm.cmd run start:dev
```

```powershell
cd frontend
npm.cmd run dev -- --port 3001
```

A porta explícita evita disputar a porta 3000 com a API. Confira `http://localhost:3000/health/ready` e abra `http://localhost:3001`.

## Comandos e separação dos ensaios

| Verificação | Comando no pacote | Condição |
|---|---|---|
| Lint backend | `npm.cmd run lint` | Sem reescrita automática |
| Build backend | `npm.cmd run build` | Usa o schema/cliente instalado |
| Lint frontend | `npm.cmd run lint` | Sem reescrita automática |
| Testes frontend | `npm.cmd test -- --runInBand` | Suíte local Jest |
| Build frontend | `npm.cmd run build` | URLs compatíveis com o ambiente; fontes Google podem exigir rede |
| Testes backend e HTTP | Runner F12 abaixo | Banco/bucket de fixtures exclusivos |

`npm test` do backend descobre também integrações que escrevem em banco/storage. Não o execute com o ambiente habitual. O runner existente fixa fixtures e seus guards recusam bancos fora do padrão.

Na raiz, para os checks da homologação:

```powershell
node backend/scripts/f12.cjs checks
```

Esse comando escreve relatórios em `output/playwright/` e logs privados. Para comparar uma nova rodada sem substituir evidências F12, execute em cópia isolada. Ele permite selecionar `backend-tests`, `backend-http-mocked`, `backend-lint`, `frontend-tests`, `frontend-lint` e `frontend-build`; o primeiro inclui build do backend.

Preparação, seed, navegador, recuperação e aceite humano são procedimentos de **fixtures**, descritos em [F12-testes](../notion/execucao/F12-testes.md). Não são instruções da operação habitual. O `validate:phase1` continua consumido pelo manifest e também escreve registros temporários sob proteções próprias.

O [plano mínimo antigo](TEST_PLAN.md) é histórico. RF/CT/QA permanecem nos documentos [08](../notion/Engenharia_Reversa_Notion_Biblioteca/08_Requisitos_e_Historias.md) e [14](../notion/Engenharia_Reversa_Notion_Biblioteca/14_Rastreabilidade_e_Testes.md); resultados e limitações estão na [matriz F12](../notion/execucao/F12-testes.md).
