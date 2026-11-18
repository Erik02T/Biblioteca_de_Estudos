# Backend - Biblioteca de Estudos

Backend API em NestJS para a Biblioteca de Estudos.

## Tecnologias

- NestJS 11
- Prisma ORM 6.19.0
- PostgreSQL
- AWS SDK v3 (para storage S3-compatível)
- JWT (autenticação)
- Helmet (segurança)

## Instalação

```bash
npm ci --include=dev
```

## Configuração

Copie o arquivo de exemplo e configure as variáveis de ambiente:

```bash
cp ../env.example .env
```

Variáveis obrigatórias:
- `DATABASE_URL` - String de conexão PostgreSQL
- `JWT_SECRET` - Segredo para assinar tokens JWT (mínimo 32 bytes)
- `STORAGE_BUCKET` - Nome do bucket no storage
- `STORAGE_ENDPOINT` - Endpoint do serviço S3/R2/MinIO
- `STORAGE_REGION` - Região do storage
- `STORAGE_ACCESS_KEY_ID` - Chave de acesso do storage
- `STORAGE_SECRET_ACCESS_KEY` - Chave secreta do storage

O PostgreSQL do Compose é publicado em `localhost:5433` (porta interna 5432).
Em desenvolvimento, `npm start`, `npm run start:dev` e `npm run start:debug`
carregam `backend/.env` antes de iniciar o Nest, dando preferência ao arquivo
sobre valores antigos herdados do terminal do VS Code/PowerShell. Isso evita
que uma `DATABASE_URL` antiga na porta 5432 substitua a configuração local.
O comando informa o arquivo selecionado e host/porta/banco, sem credenciais.
Reinicie um comando que já estava em execução para usar esse comportamento.

`DOTENV_CONFIG_PATH` seleciona um arquivo alternativo; caminhos relativos nos
comandos locais são resolvidos a partir de `backend/`. Com `NODE_ENV=production`
ou `NODE_ENV=test`, as variáveis injetadas continuam tendo precedência.
`start:prod` e a execução direta de `dist/src/main.js` também preservam a
precedência do ambiente e continuam localizando `backend/.env` independentemente
do diretório de execução. Não existe troca automática de porta ou banco.

## Comandos

### Desenvolvimento
```bash
npm run start:dev
```

Se o PostgreSQL estiver parado, execute `docker compose up -d postgres` na raiz
antes de iniciar. A correção de precedência não inicia o Docker nem modifica o
banco. Com o backend ativo, `http://localhost:3000/health/ready` deve retornar
`checks.database: "connected"`.

### Build
```bash
npm run build
```

### Produção
```bash
npm run start:prod
```

### Testes
```bash
npm test              # Testes unitários
npm run test:e2e      # Testes e2e
npm run test:cov      # Testes com coverage
```

### Lint
```bash
npm run lint          # Verifica sem alterar arquivos
```

### Prisma
```bash
npx prisma generate              # Gerar Prisma Client
npx prisma migrate dev           # Criar nova migration (dev)
npx prisma migrate deploy        # Aplicar migrations (produção)
npx prisma studio                # Abrir Prisma Studio
```

### Validação local da Fase 1

`npm run validate:phase1` cria e remove registros temporários. O script só aceita PostgreSQL em loopback com nome de banco identificando `test`, `local`, `dev` ou `audit`, e exige a confirmação explícita `PHASE1_VALIDATION_ALLOW_LOCAL_DB=true`. Nunca aponte esse teste para produção.

### Lint e Formatação
```bash
npm run lint        # Executar ESLint
npm run format      # Formatar código com Prettier
```

## API

A API está disponível em `http://localhost:3000` por padrão.

### Endpoints principais

- `POST /auth/register` - Registro de usuário
- `POST /auth/login` - Login
- `POST /auth/refresh` - Renovar token
- `POST /auth/logout` - Logout
- `GET /areas` - Listar áreas
- `POST /areas` - Criar área
- `GET /areas/:id` - Buscar área
- `PATCH /areas/:id` - Atualizar área
- `DELETE /areas/:id` - Deletar área
- `DELETE /areas/:id/purge` - Excluir definitivamente um ramo da lixeira, com confirmação e revisão atual
- `GET /attachments` - Listar anexos
- `POST /attachments` - Criar anexo
- `POST /attachments/upload` - Enviar imagem ou arquivo
- `DELETE /attachments/:id` - Deletar anexo

## Health Checks

- `GET /health` - Verifica se o processo está rodando
- `GET /health/ready` - Verifica conexão com o banco; retorna HTTP 503 quando degradado

## Limites de requisição e uploads

- Criação/atualização JSON de áreas: até 52 MiB no corpo, preservando o limite de conteúdo de 50 MiB do DTO.
- Outros corpos JSON e URL-encoded: até 1 MiB.
- Upload de anexos: até 100 MiB por arquivo, com armazenamento temporário em disco e streaming ao storage S3-compatível.
- Uploads exigem autenticação antes de serem processados; arquivos temporários são removidos após o processamento.

## Segurança

- Helmet para headers de segurança HTTP
- Rate limiting por IP
- Autenticação JWT com tokens de acesso curtos (15 min) e refresh tokens longos (30 dias)
- Validação de DTOs com class-validator
- CORS configurado


## F8 — criação idempotente e ambiente de validação

`POST /areas` aceita o header opcional `Idempotency-Key` (UUID v4). O frontend atual mantém a chave por intenção de criação; repetir o mesmo pedido retorna o mesmo ID sem reaplicar conteúdo. Usar a chave para outra carga ou para uma página excluída retorna 409. Clientes sem header continuam aceitos. `GET /auth/me` exige a sessão normal e retorna o ID confirmado do proprietário.

A criação idempotente exige a migração `20261116120000_f8_creation_requests`. Na rodada original da F8 ela foi aplicada somente em bancos de teste. Na correção **BUG-F9-001 de 16/11/2026**, foi aplicada também ao banco local `biblioteca_estudos`, após backup conjunto e restauração/ensaio em clone. Oito tabelas anteriores e 21 objetos foram preservados. Outros bancos precisam do mesmo preparo; não usar reset ou db push. A ausência dessa tabela causa erro 500 no `POST /areas` com `Idempotency-Key`.

Diagnóstico somente de leitura: `node scripts/f9-creation-upgrade.cjs inspect`. Procedimento protegido e provas antes/depois em `scripts/f9-creation-upgrade.cjs` e [F9-correcoes.md](../docs/notion/execucao/F9-correcoes.md). Dumps e tokens ficam em diretórios privados ignorados pelo Git. Não repetir a preparação de um run já existente.

Para validação isolada: `node scripts/run-f8.cjs prepare`, `node scripts/run-f8.cjs test` e, após build, `node scripts/run-f8.cjs serve` (porta 3027). O launcher fixa banco/bucket de fixtures e recusa nomes fora do padrão. O Prisma CLI pode anunciar leitura de `.env`, mas a URL explícita do processo seleciona as fixtures. Relatórios e limites: `../docs/notion/execucao/F8.md` e `F8-testes.md`.

## F12 — exclusão definitiva e validação isolada

`DELETE /areas/:id` continua enviando à lixeira. O novo `DELETE /areas/:id/purge` recebe `{ "confirmed": true, "updatedAt": "<revisão ISO exata>" }`; exige proprietário correto, ramo na lixeira e ausência de versões retidas. Retorna `{ purgedIds }` após limpar os arquivos. Falha de storage devolve 503/`PURGE_STORAGE_CLEANUP_FAILED`, mantém os registros para nova tentativa e avisa que parte dos arquivos pode já ter sido removida. Respostas de erro incluem `code`, `requestId` e header `X-Request-Id`.

Não há migração F12. `node scripts/f12.cjs prepare` usa exclusivamente `biblioteca_test_f8_f12_20261117` e `biblioteca-test-f7-f8-f12-20261117`; `checks`, `start-api` e `recovery` validam suítes, API em 3067 e restauração em destinos novos. Reprodução completa em [F12-testes](../docs/notion/execucao/F12-testes.md). Os runners não atualizam o banco habitual.
