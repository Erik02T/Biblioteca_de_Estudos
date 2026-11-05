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
npm install
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

## Comandos

### Desenvolvimento
```bash
npm run start:dev
```

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
