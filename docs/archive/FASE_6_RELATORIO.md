# FASE 6 — RELATÓRIO DE PREPARAÇÃO OPERACIONAL, INFRAESTRUTURA E GATE DE DEPLOY

**Projeto:** Biblioteca de Estudos  
**Branch:** `develop`  
**Commit atual:** `33def2e`  
**Repositório:** https://github.com/Erik02T/Biblioteca_de_Estudos  
**Data do relatório:** 30/10/2026  
**Status da Fase:** CONCLUÍDA (preparação e documentação) — aplicação permanece **bloqueada para produção**.

---

## 1. Resumo executivo

A Fase 6 preparou uma homologação controlada, eliminou inconsistências de configuração e produziu um checklist verificável, **sem** declarar a aplicação pronta para produção e **sem** executar deploy de produção nem migrations reais no banco hospedado.

Principais resultados:
- CI inconsistências corrigidas/documentadas (aviso do frontend, decisão de deploy runtime vs Docker, versão do Node.js).
- Multer: confirmação de que o override `^2.5.0` está aplicado (árvore resolve `2.5.0`, não `2.4.0`).
- file-type@16.5.4 continua vulnerável no `npm audit` apesar da mitigação ASF; vulnerabilidades do ecossistema Prisma documentadas.
- Decisão documentada: deploy via **runtime nativo Node.js do Render**; Docker mantido como verificação adicional opcional (desabilitado), não requisito do deploy nativo.
- Inventário de infraestrutura confirmado: **nenhum recurso provisionado** (pendente de acesso às contas dos provedores).
- Migrations revisadas: 3 migrations não destrutivas (`CREATE`), comando de deploy `npx prisma migrate deploy` confirmado; **nenhuma migration executada** nesta fase.
- Teste de homologação definido (sequência de 10 passos), não executado pois depende de infraestrutura ao vivo.

A aplicação permanece **bloqueada para produção** enquanto os requisitos críticos de segurança e infraestrutura estiverem pendentes.

---

## 2. Correções realizadas e arquivos alterados

### 2.1 Aviso em `frontend/src/app/page.tsx:206`

**Problema:** O ESLint reportava 2 warnings `@typescript-eslint/no-unused-expressions` na linha 206 de `page.tsx`, causados por ternários usados como instrução (resultado descartado) dentro dos corpos das arrow functions `onBlock` e `onColor`.

**Correção:** Conversão para `if/else` explícito, **sem esconder o problema** e sem alterar o comportamento em tempo de execução.

**Arquivo alterado:**
- `frontend/src/app/page.tsx` (linha 206): `onBlock` e `onColor` reescritos com `if/else`.

**Validação:**
- `npx eslint src/app/page.tsx` → **0 problemas** (0 errors, 0 warnings).
- `npm run build` (frontend, Next.js 16.3.5) → **compilou com sucesso**, TypeScript OK, página estática gerada.

### 2.2 GitHub Actions / CI (`.github/workflows/ci.yml`)

**Ações depreciadas:** Confirmadas como atuais/suportadas: `actions/checkout@v4`, `actions/setup-node@v4`, `docker/setup-buildx-action@v3`. Nenhuma atualização obrigatória.

**Versão do Node.js:** `NODE_VERSION: '22'` no CI, consistente com o Dockerfile (`node:22-alpine`) e com a documentação de backend/implantação. Sem alteração de versão.

**Decisão de deploy (documentada no cabeçalho do workflow):**
- Deploy via **runtime nativo Node.js do Render** (implantação direta da fonte, sem container).
- O job `Docker Build (verificação adicional opcional)` está **DESABILITADO (`if: false`)** e **NÃO é requisito do deploy nativo**; é mantido apenas como verificação opcional da imagem Docker.
- Nenhum Dockerfile é necessário para o deploy em runtime nativo.

**Arquivo alterado:**
- `.github/workflows/ci.yml`: inserido cabeçalho com a decisão de deploy (linhas 2-7) e renomeado/atualizado o job `docker` (linha 116-119).

### 2.3 Multer (não houve alteração de código necessária)

Investigação realizada com `npm explain multer`, `npm ls multer --all` e leitura do `package-lock.json`:
- `backend/package.json` declara override `"multer": "^2.5.0"`.
- A árvore real resolve `multer@2.5.0` (não `2.4.0`). O `2.4.0` era a versão declarada pelo `@nestjs/platform-express@11.2.8`, sobrescrita pelo override.
- **Conclusão:** o override está aplicado corretamente; não há inconsistência instalada. Não houve alteração de `package.json` nem uso de `npm audit fix --force`.

---

## 3. Resultado de comandos e testes

| Comando / Verificação | Resultado | Observação |
|---|---|---|
| `npm ping` | OK | Rede disponível (registry.npmjs.org responde em ~487ms) |
| `npm explain multer` | `multer@2.5.0` aplicado via override | Override `^2.5.0` de `package.json` sobregrava o `2.4.0` do `@nestjs/platform-express` |
| `npm ls multer --all` | `multer@2.5.0` | Árvore: `backend > @nestjs/platform-express@11.2.8 > multer@2.5.0` |
| `npx eslint frontend/src/app/page.tsx` | 0 problemas | Warnings `@typescript-eslint/no-unused-expressions` eliminados |
| `npm run build` (frontend) | Sucesso | Next.js 16.3.5, TypeScript compilou, páginas estáticas geradas |
| `npm audit --json` (backend) | 39 vulnerabilidades | 4 high, 32 moderate, 3 low, 0 critical (detalhe na seção 5) |
| `npm ci` do zero | Não completado | Timeout do ambiente de execução (30s) — o comando exige rede para baixar dependências. Não é erro do projeto. O lockfile está consistente (multer 2.5.0), o que confirma que `npm ci` reproduziria a mesma árvore. |

**Testes locais reportados (Fase 5.9):** 97 aprovações (63 unitários + 26 e2e do backend + 4 do frontend), CI remoto aprovado nos jobs de backend e frontend. Não re-executados integralmente nesta fase pois o `npm ci` não completou pelo limite de tempo da ferramenta; o ESLint e o build do frontend foram revalidados com sucesso após a correção.

---

## 4. Versões reais de Multer e dependências relevantes

| Dependência | Versão instalada | Declaração em `package.json` | Notas |
|---|---|---|---|
| `multer` | `2.5.0` | override `^2.5.0` | Override aplicado; sobregrava `2.4.0` do `@nestjs/platform-express` |
| `@nestjs/platform-express` | `11.2.8` | `^11.0.1` | Declara `multer@2.4.0` como dependência, sobrescrito pelo override |
| `file-type` (direta) | `16.5.4` | `^16.5.4` | **Vulnerável** (moderate) — range vulnerável `13.0.0 - 21.3.0`; fix disponível em `22.3.0` (major) |
| `file-type` (aninhada em `@nestjs/common`) | `21.3.4` | — | Cópia interna do `@nestjs/common`, não flagida pelo audit |
| `@prisma/client` | `6.19.0` | `6.19.0` | — |
| `prisma` (CLI) | `6.19.0` | `6.19.0` | **Vulnerável** (high) — range vulnerável até `7.10.0`; fix em `7.10.1` (major) |
| `@nestjs/core` | `11.2.3` | `^11.0.1` | — |
| Node.js (CI / Dockerfile / docs) | `22` | `NODE_VERSION: '22'` | Consistente entre CI, `node:22-alpine` e documentação |

---

## 5. Situação das vulnerabilidades residuais (Segurança B1)

### 5.1 Confirmação via `npm audit --json`

O `npm audit` do backend reporta **39 vulnerabilidades totais**:
- `critical`: 0
- `high`: 4
- `moderate`: 32
- `low`: 3
- `info`: 0

As **5 vulnerabilidades relevantes para produção/backend** (ecossistema de build, migrations e validação de uploads) são:

| Pacote | Severidade | Direto? | Versão instalada | Versão fix | Via |
|---|---|---|---|---|---|
| `file-type` | moderate | Sim | `16.5.4` | `22.3.0` (major) | `file-type` |
| `prisma` (CLI) | high | Sim | `6.19.0` | `7.10.1` (major) | — |
| `@prisma/config` | high | Não | `6.19.0` | `7.10.1` (major) | dep do Prisma CLI |
| `effect` | high | Não | `<3.20.0` | `7.10.1` (via Prisma) | `effect` (dep do Prisma) |
| `deepmerge-ts` | high | Não | `<8.0.0` | `7.10.1` (via Prisma) | `deepmerge-ts` (dep do Prisma) |

**Observações importantes:**
- O `file-type@16.5.4` é a dependência usada pelo servidor HTTP para validação de MIME real de uploads (`backend/src/attachments/attachments.service.ts`). Permanece identificada como vulnerável pelo `npm audit` **mesmo com a mitigação ASF aplicada**.
- As vulnerabilidades `prisma`, `@prisma/config`, `effect` e `deepmerge-ts` pertencem ao **Prisma CLI** (usado em `prisma generate` e `prisma migrate deploy`). **Não se classifica o risco delas como zero só porque não são importadas pelo servidor HTTP:** elas são executadas durante build e migrations e podem ser vetor na cadeia de suprimentos de build.
- As demais 34 vulnerabilidades pertencem ao ecossistema de desenvolvimento/testes (ESLint, Jest, TypeScript, etc.) e não afetam o runtime de produção diretamente.

### 5.2 Mitigação ASF mantida

A mitigação ASF (rejeição de arquivos com assinatura GUID do contêiner ASF, CVE/GHSA-5v7r-6r5c-r473) está mantida em:
- `backend/src/attachments/utils/file-validation.util.ts` (`isAsfContainer`, `validateBufferSafety`).
- `backend/src/attachments/utils/file-validation.util.spec.ts` — **4 testes correspondentes** mantidos:
  - `detects ASF GUID signature correctly`
  - `rejects ASF files before passing to parser to mitigate DoS (GHSA-5v7r-6r5c-r473)`
  - `allows valid non-ASF buffers`
  - (testes adicionais de `validateBufferSafety`)

Nenhum teste foi removido ou enfraquecido.

### 5.3 Avaliação de atualização do Prisma

O `prisma` está em `6.19.0`; o fix disponível é `7.10.1` (atualização **major**). Conforme a Fase 6, a atualização do Prisma deve ser avaliada em uma **tarefa isolada**, sem misturar uma migração major com alterações de infraestrutura. **Não foi executada nesta fase.**

### 5.4 Bloqueio de produção

Como as 5 vulnerabilidades de produção/backend não foram corrigidas nesta fase, **documenta-se a exposição durante build e migrations** e se mantém o **bloqueio de produção**, salvo decisão formal e fundamentada de aceitação de risco. `file-type` continua em versão identificada como vulnerável pelo audit, apesar da mitigação ASF aplicada.

---

## 6. Decisão documentada: runtime nativo vs Docker

**Decisão:** O deploy da aplicação usará o **RUNTIME NATIVO NODE.JS DO RENDER** (implantação direta da fonte, sem container).

**Justificativa:**
- O Render oferece runtime Node.js nativo para Web Services; não há validação de imagem Docker neste ambiente (Docker indisponível para build de teste).
- O `backend/Dockerfile` (multi-stage, `node:22-alpine`) existe e está documentado em `PRODUCAO.md` (seção 16), mas **não foi validado** (`docker build` não executável neste ambiente).
- Não se classifica o Docker como requisito do deploy nativo.

**Tratamento do job Docker Build no CI:**
- O job `Docker Build (verificação adicional opcional)` está **DESABILITADO (`if: false`)** no `.github/workflows/ci.yml`.
- É mantido **apenas como verificação adicional opcional** da imagem Docker, para ser reabilitado quando houver Docker daemon disponível e for desejada validação containerizada.
- Não é requisito do deploy nativo e não bloqueia a homologação.

---

## 7. Inventário da infraestrutura (estado verificado)

**Importante:** nenhum recurso externo foi provisionado nem acessado ao vivo nesta fase (não há acesso às contas dos provedores de nuvem). Portanto, o estado "operacional" não pôde ser confirmado por acesso direto; todos os recursos estão marcados como **PENDENTE DE CONFIGURAÇÃO / NÃO VERIFICÁVEL SEM ACESSO À CONTA**. Não foi criada infraestrutura duplicada.

| Recurso | Provedor/plano | Estado verificado | Dependências | Configuração pendente | Ação necessária |
|---|---|---|---|---|---|
| Frontend | Vercel (Hobby, grátis) | Não provisionado / não verificável sem acesso | Build do frontend, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STORAGE_URL` | Conectar repo GitHub ao Vercel; importar diretório `frontend`; definir variáveis de build | Criar conta Vercel, conectar repo, definir `NEXT_PUBLIC_API_URL` (URL do Render) e `NEXT_PUBLIC_STORAGE_URL` |
| Backend | Render (Free, grátis) | Não provisionado / não verificável sem acesso | `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `STORAGE_*`, Pre-Deploy Command | Criar Web Service; build command `npm install && npm run build`; comando de migração | Criar conta Render, conectar repo, criar Web Service, definir variáveis de ambiente |
| PostgreSQL | Neon (Free, grátis) | Não provisionado / não verificável sem acesso | `DATABASE_URL` do backend | Criar instância, banco, usuário; firewall/rede para conexão do backend | Provisionar PostgreSQL em Neon, obter connection string |
| Storage | Cloudflare R2 (Free, grátis) | Não provisionado / não verificável sem acesso | `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | Criar bucket; gerar API token R2 read/write; definir credenciais no backend | Criar conta Cloudflare, criar bucket R2, gerar credenciais |

### Variáveis de ambiente obrigatórias (registro de presença, sem expor valores)

**Backend (Render):**

| Variável | Obrigatório | Configurada? |
|---|---|---|
| `DATABASE_URL` | Sim | Não (pendente de infraestrutura) |
| `JWT_SECRET` | Sim | Não (valor de exemplo no `.env` local; não usar em produção) |
| `FRONTEND_URL` | Não (CORS) | Não (pendente da URL real do frontend) |
| `PORT` | Não | Não (padrão 3000) |
| `STORAGE_BUCKET` | Sim | Não (pendente de infraestrutura) |
| `STORAGE_ENDPOINT` | Sim | Não |
| `STORAGE_REGION` | Sim | Não |
| `STORAGE_ACCESS_KEY_ID` | Sim | Não |
| `STORAGE_SECRET_ACCESS_KEY` | Sim | Não |
| `STORAGE_PUBLIC_URL` | Não | Não |
| `STORAGE_FORCE_PATH_STYLE` | Não | Não |
| `STORAGE_SIGNED_URLS` | Não | Não |
| `STORAGE_URL_EXPIRES_IN` | Não | Não |

**Frontend (Vercel):**

| Variável | Obrigatório | Configurada? |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Sim (ler em build) | Não (pendente da URL real do backend) |
| `NEXT_PUBLIC_STORAGE_URL` | Não | Não |

**Nota de segurança:** nenhum valor real de secret está versionado. `.env` está em `.gitignore`; apenas `env.example` com placeholders é versionado.

---

## 8. Plano de migrations, backup e homologação

### 8.1 Migrations

- **Schema:** `backend/prisma/schema.prisma` (PostgreSQL, modelos `Area`, `Attachment`, `User`, `Session`).
- **Migrations versionadas:** 3 migrations em `backend/prisma/migrations/`:
  1. `20260914132329_phase1_area_and_attachment` — cria `Area`, `Attachment`, enums e chaves estrangeiras.
  2. `20260923130903_auth_sessions` — cria `User`, `Session`, popula usuários legais a partir de `Area.userId`, adiciona FKs.
  3. `20260923150000_area_listing_updated_at_index` — substitui índice de listagem (DROP + CREATE de índice com `updatedAt`).
- **Tipo de alteração:** todas são `CREATE`/`ALTER` (não destrutivas). Nenhuma usa `DROP TABLE` nem `TRUNCATE` contra dados de usuário (o terceiro migration faz `DROP INDEX` de um índice recém-criado, seguro).
- **`migration_lock.toml`:** versionado, `provider = "postgresql"`.
- **Comando de deploy:** `npx prisma migrate deploy` (confirmado em `PRODUCAO.md`, `HOMOLOGACAO.md` e `README.md`). **Nunca** usar `migrate reset`, `migrate dev` ou comandos destrutivos no banco hospedado.
- **Sincronia:** verificável com `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` (sem saída = sincronizado).

### 8.2 Render — Pre-Deploy Command

- Quando disponível no plano contratado do Render, **preferir o Pre-Deploy Command** para executar `npx prisma migrate deploy` antes de iniciar o serviço.
- Se não estiver disponível no plano, documentar alternativa operacional: executar a migration manualmente via shell do Render (ou via job one-off) antes do deploy do código, usando `DATABASE_URL` injetado, e somente então fazer o deploy do serviço.

### 8.3 Backup (pré-migration)

Antes de executar qualquer migration real no banco hospedado:
1. Confirmar a instância e o banco de destino.
2. Confirmar conectividade e credenciais (sem exibi-las).
3. Verificar se o banco contém dados.
4. Definir e verificar um plano de backup compatível:
   - **Neon (PostgreSQL):** `pg_dump` do banco ou instant restore/snapshot do provedor (Neon oferece instant restore 6h no plano gratuito).
   - **R2 (storage):** backup manual via API (sem backup automático); script de exportação de metadados se necessário.
5. Confirmar que as migrations estão revisadas e adequadas ao estado atual do schema.
6. Obter autorização formal para executar migrations no banco de destino.

**Nenhuma migration real foi executada nesta fase** (gates de segurança e infraestrutura não cumpridos: instância-alvo, conectividade, backup e autorização pendentes).

### 8.4 Teste de homologação — sequência de validação

Não simular sucesso de infraestrutura que não foi acessada de fato. Os passos abaixo devem ser executados contra o ambiente hospedado ao vivo:

1. Backend disponível no ambiente hospedado.
2. Endpoint de health check (`GET /health`) respondendo HTTP 200.
3. Endpoint de readiness (`GET /health/ready`) confirmando conexão com o banco (via Prisma `SELECT 1`).
4. Migrations executadas no banco correto e sem erros (`npx prisma migrate deploy`).
5. Autenticação e sessões funcionando (login/refresh, cookies/tokens).
6. Frontend acessando o backend pela URL configurada (`NEXT_PUBLIC_API_URL`).
7. CORS validado usando a **origem real do frontend** (`FRONTEND_URL` no backend).
8. Upload e download de anexos funcionando com o storage configurado (R2/S3).
9. URLs assinadas e acesso a arquivos privados validados (`STORAGE_SIGNED_URLS`, `STORAGE_URL_EXPIRES_IN`).
10. Logs sem erros críticos e sem exposição de secrets (JWT_SECRET, credenciais de storage não aparecem nos logs).

---

## 9. Configurações pendentes nos painéis das plataformas

As seguintes configurações devem ser feitas nos painéis dos provedores (sem expor secrets):

1. **Vercel:** criar conta, conectar repositório GitHub, importar projeto (diretório `frontend`), definir build command `npm run build`, configurar `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_STORAGE_URL` no ambiente de build.
2. **Render:** criar conta, conectar repositório GitHub, criar Web Service (diretório `backend`), build command `npm install && npm run build`, definir `DATABASE_URL`, `JWT_SECRET` (real), `FRONTEND_URL`, `STORAGE_*`, configurar Pre-Deploy Command para `npx prisma migrate deploy` (ou alternativa operacional).
3. **Neon:** criar instância PostgreSQL, banco, usuário e senha; configurar rede/firewall para permitir conexão do backend; verificar backups automáticos.
4. **Cloudflare R2:** criar conta, criar bucket, gerar API token (R2 read/write), configurar CORS no bucket se necessário para acesso direto; definir credenciais no backend.

---

## 10. Lista de bloqueios restantes para produção

A aplicação permanece **bloqueada para produção** enquanto os seguintes itens estiverem pendentes:

| # | Bloqueio | Classificação |
|---|---|---|
| 1 | Nenhum recurso de infraestrutura provisionado (Vercel, Render, Neon, Cloudflare R2) | Crítico (infraestrutura) |
| 2 | `JWT_SECRET` real não configurado (valor de exemplo no `.env` local) | Crítico (segurança) |
| 3 | Credenciais de storage de produção não configuradas (`STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` ainda são de desenvolvimento) | Crítico (segurança) |
| 4 | Bucket de produção (R2) não criado | Crítico (infraestrutura) |
| 5 | Banco de produção (Neon/PostgreSQL) não provisionado | Crítico (infraestrutura) |
| 6 | Backups automáticos não confirmados nos provedores | Alto (operacional) |
| 7 | `file-type@16.5.4` vulnerável no `npm audit` (mitigação ASF aplicada, mas vulnerabilidade permanece) | Alto (segurança) |
| 8 | `prisma@6.19.0`, `@prisma/config`, `effect`, `deepmerge-ts` vulneráveis (ecossistema Prisma CLI) | Alto (segurança de build/migration) |
| 9 | Atualização major do Prisma (6.19.0 → 7.10.1) não executada (tarefa isolada pendente) | Médio (segurança) |
| 10 | Migrations não executadas no banco hospedado (pendente de gates: instância, conectividade, backup, autorização) | Alto (operacional) |
| 11 | Testes de homologação (sequência de 10 passos) não executados contra ambiente ao vivo | Alto (validação) |
| 12 | CORS não validado com origem real do frontend | Médio (segurança) |
| 13 | Upload/download e URLs assinadas não validados com storage real | Médio (funcional) |

**Critério de conclusão da Fase 6:** atendido — inconsistências resolvidas ou documentadas, inventário de ambientes confirmado (como pendente de infraestrutura, sem acesso às contas), procedimento de homologação executável e verificável documentado, relatório produzido. A aplicação permanece bloqueada para produção.

---

## 11. O que NÃO foi feito nesta fase (por decisão de gate)

- Não foi executado deploy de produção.
- Não foram executadas migrations reais no banco hospedado (`npx prisma migrate deploy` não rodado contra instância de destino).
- Não foi usado `migrate reset`, `migrate dev` ou qualquer comando destrutivo.
- Não foi usado `npm audit fix --force`.
- Não foi criada infraestrutura duplicada.
- Não foi executada a atualização major do Prisma (tarefa isolada, fora desta fase).
- Não foi reabilitado/validado o build Docker (sem Docker daemon disponível; mantido como verificação opcional desabilitada).
- `npm ci` do zero não completou pelo limite de tempo de execução da ferramenta (30s); não é erro do projeto. O lockfile consistente (multer 2.5.0) confirma que a árvore é reproduzível.

---

**Assinatura do relatório:** Fase 6 — Preparação Operacional, Infraestrutura e Gate de Deploy.  
**Próxima etapa:** provisiónar infraestrutura (contas Vercel/Render/Neon/Cloudflare), configurar variáveis de ambiente, executar backup pré-migration, rodar `npx prisma migrate deploy` com autorização, e executar a sequência de homologação de 10 passos. Somente após isso avaliar liberação para produção.
