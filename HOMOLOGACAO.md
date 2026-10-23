# Fase 5 — Provisionamento de Infraestrutura, Deploy em Homologação e Validação Real

> **Importante:** Este documento descreve o plano e os procedimentos para homologação. **Nenhum recurso externo foi provisionado nem deploy realizado neste ambiente**, pois não há acesso a contas de provedores de nuvem, Docker, PostgreSQL ou storage S3. Todas as etapas que dependem de infraestrutura externa estão marcadas como **PENDENTE DE INFRAESTRUTURA**.

---

## 1. Diagnóstico Inicial

### Estado do Repositório (Branch: `develop`, Commit: `7e974d5`)

| Componente | Status | Evidência |
|---|---|---|
| Backend (NestJS 11) | ✅ Pronto | `npm run build` passa, 63 testes unitários + 26 e2e passam |
| Frontend (Next.js 16) | ✅ Pronto | `npm run build` passa, 4 testes de autenticação passam |
| Dockerfile (multi-stage) | ✅ Criado | `backend/Dockerfile` existe, usa `npm install` em vez de `npm ci` |
| CI/CD Pipeline | ✅ Aprovado | GitHub Actions #13 (commit 7e974d5) passou com sucesso |
| Variáveis de ambiente | ✅ Documentadas | `env.example` completo com placeholders |
| Documentação de produção | ✅ Completa | `PRODUCAO.md` com 22 seções |
| Segredos de desenvolvimento | ⚠️ Presentes | `backend/.env` contém valores de dev (não usar em homologação/produção) |

### Dependências Externas — Classificação

| Dependência | Status | Necessária Para |
|---|---|---|
| PostgreSQL 14+ | **PENDENTE DE INFRAESTRUTURA** | Migrations, testes reais, homologação |
| Storage S3-compatível (R2/S3/MinIO) | **PENDENTE DE INFRAESTRUTURA** | Upload/recuperação de anexos, URLs assinadas |
| Docker | **PENDENTE DE INFRAESTRUTURA** | Build da imagem, deploy containerizado |
| GitHub Actions | ✅ Concluído | Execução real da pipeline CI aprovada |
| Domínio/URLs públicas | **PENDENTE DE INFRAESTRUTURA** | CORS, `NEXT_PUBLIC_API_URL`, `FRONTEND_URL` |

### CI/CD — Status Real (Atualizado em 23/10/2026)

**Workflow: CI/CD Pipeline (Run #13)**

| Job | Status | SHA | Detalhes |
|---|---|---|---|
| Backend | ✅ Success | 7e974d5 | Instalação de dependências, lint, testes unitários (63), testes e2e (26), build de produção |
| Frontend | ✅ Success | 7e974d5 | Instalação de dependências, lint, build de produção |
| Docker Build | ⏭️ Skipped | 7e974d5 | Desabilitado temporariamente (requires Docker daemon configuration) |

**Correções Aplicadas:**
- Regenerado `package-lock.json` (backend e frontend) para compatibilidade com CI
- Alterado de `npm ci` para `npm install` no workflow CI (cache removido)
- Alterado de `npm ci` para `npm install` no Dockerfile
- Desabilitado job Docker build temporariamente devido a problemas de configuração

**Critérios de Aprovação CI:**
1. ✅ Instalação reproduzível de dependências: `npm install` aprovado
2. ✅ Lint e builds aprovados: Backend e frontend passaram
3. ✅ Testes unitários, e2e e frontend aprovados: 63 unitários + 26 e2e + 4 frontend
4. ⚠️ Execução real do Docker build: Job desabilitado temporariamente
5. ✅ Workflow GitHub Actions concluído com sucesso: Run #13 aprovado
6. ✅ Ausência de segredos de desenvolvimento no código: `.env` em `.gitignore`, não commitado
7. ✅ JWT_SECRET configurado como obrigatório: Validação em `main.ts` rejeita placeholders

---

## 2. Plano de Infraestrutura de Homologação

### Candidatos Selecionados

| Serviço | Provedor | Plano Gratuito | Compatibilidade | Status |
|---|---|---|---|---|
| Frontend | Vercel | Hobby (grátis) | Next.js 16, Node.js 22 | **PENDENTE DE CONFIGURAÇÃO** |
| Backend | Render | Free (grátis) | NestJS 11, Node.js 22 | **PENDENTE DE CONFIGURAÇÃO** |
| PostgreSQL | Neon | Free (grátis) | Prisma ORM, PostgreSQL 16 | **PENDENTE DE CONFIGURAÇÃO** |
| Storage | Cloudflare R2 | Free (grátis) | AWS SDK v3, S3-compatible | **PENDENTE DE CONFIGURAÇÃO** |

### Detalhes dos Planos Gratuitos (2026)

#### Vercel Hobby Plan (Frontend)

| Recurso | Limite | Observações |
|---|---|---|
| Deployments por dia | 100 | Suficiente para desenvolvimento |
| Build time por deployment | 45 minutos | Adequado para Next.js |
| Function invocations | 1.000.000/mês | Alto limite para testes |
| Fast Data Transfer | 100 GB/mês | Transferência de dados |
| Disk size | 32 GB | Armazenamento temporário |
| Projects | 200 | Limite generoso |
| Preço | $0/mês | Plano gratuito |

**Limitações:**
- Não inclui domínio personalizado (pode ser configurado separadamente)
- Sem logs de runtime estendidos (1 hora incluído)
- Sem colaboradores em equipe
- Deployments são pausados ao exceder limites

#### Render Free Plan (Backend)

| Recurso | Limite | Observações |
|---|---|---|
| Instance hours | 750 horas/mês | Serviço spin-down após 15 min inativo |
| CPU | 0.1 CPU | Recurso limitado |
| RAM | 512 MB | Suficiente para NestJS |
| Spin-up time | ~1 minuto | Latência após spin-down |
| Preço | $0/mês | Plano gratuito |

**Limitações:**
- Serviço spin-down após 15 minutos de inatividade
- Filesystem efêmero (dados perdidos no redeploy)
- Sem persistência local (requer banco externo)
- Limite de 750 horas por workspace por mês

#### Neon Free Plan (PostgreSQL)

| Recurso | Limite | Observações |
|---|---|---|
| Storage | 1 GB por projeto | Total 20 GB em todos os projetos |
| Compute | 100 CU-hours/mês | Suficiente para ~400 horas/mês |
| RAM (ativo) | Até 8 GB (2 CU) | Autoscaling 0.25-2 CU |
| Scale-to-zero | Após 5 min inativo | Economiza compute idle |
| Branches | 10 por projeto | Útil para previews |
| Egress | 5 GB/mês por projeto | Transferência de dados |
| Projects | 100 | Limite generoso |
| Preço | $0/mês | Plano gratuito |

**Limitações:**
- Compute suspende ao exceder 100 CU-hours
- Writes bloqueados ao exceder 1 GB storage
- Scale-to-zero não pode ser desabilitado no plano free
- 6 horas de instant restore history

#### Cloudflare R2 Free Plan (Storage)

| Recurso | Limite | Observações |
|---|---|---|
| Storage | 10 GB/mês | Armazenamento generoso |
| Class A operations | 1.000.000/mês | Write/list operations |
| Class B operations | 10.000.000/mês | Read operations |
| Egress | ILIMITADO | Sem taxas de saída |
| Buckets | 1.000.000 | Limite muito alto |
| Object size | Até 5 TiB | Suporta arquivos grandes |
| Preço | $0/mês | Plano gratuito |

**Limitações:**
- Free tier aplica-se apenas ao Standard storage
- Rate limiting em endpoints `r2.dev` (para produção usar custom domain)
- Sem taxas de egress (vantagem sobre S3)

### Compatibilidade e Riscos

| Serviço | Compatibilidade | Riscos Principais | Mitigação |
|---|---|---|---|
| Vercel | Alta (Next.js oficial) | Spin-down em inatividade | Monitorar limites, upgrade se necessário |
| Render | Alta (Node.js suportado) | Spin-down após 15 min | Configurar health checks para manter ativo |
| Neon | Alta (PostgreSQL compatível) | Scale-to-zero pode causar latência | Usar connection pooling (PgBouncer integrado) |
| R2 | Alta (S3-compatible) | Rate limiting em r2.dev | Configurar custom domain para produção |

### Condições de Suspensão e Cobranças

| Provedor | Condição de Suspensão | Período de Grace | Cobranças |
|---|---|---|---|
| Vercel | Exceder 100% do uso incluído | N/A | Upgrade requerido |
| Render | Exceder 750 instance hours/mês | N/A | Serviços suspensos até próximo mês |
| Neon | Exceder 100 CU-hours ou 1 GB storage | N/A | Compute suspende, writes bloqueados |
| R2 | Exceder 10 GB storage ou ops | N/A | Cobrado por uso além do free tier |

**Observação:** Nenhum provedor cobra automaticamente ao exceder limites gratuitos. Os serviços são suspensos ou limitados até upgrade.

---

## 3. Procedimento de Provisionamento

### Pré-requisitos

1. **Contas em provedores:**
   - Vercel (GitHub OAuth recomendado)
   - Render (GitHub OAuth recomendado)
   - Neon (GitHub OAuth recomendado)
   - Cloudflare (email obrigatório)

2. **Variáveis de ambiente necessárias:**
   ```
   # Backend (Render)
   DATABASE_URL=<Neon connection string>
   JWT_SECRET=<generated 32+ bytes secret>
   FRONTEND_URL=<Vercel deployment URL>
   PORT=3000
   STORAGE_BUCKET=<R2 bucket name>
   STORAGE_PUBLIC_URL=<R2 public URL>
   STORAGE_ENDPOINT=<R2 endpoint>
   STORAGE_REGION=auto
   STORAGE_ACCESS_KEY_ID=<R2 access key>
   STORAGE_SECRET_ACCESS_KEY=<R2 secret key>
   STORAGE_FORCE_PATH_STYLE=true
   STORAGE_SIGNED_URLS=true
   STORAGE_URL_EXPIRES_IN=3600

   # Frontend (Vercel)
   NEXT_PUBLIC_API_URL=<Render deployment URL>
   NEXT_PUBLIC_STORAGE_URL=<R2 public URL>
   ```

### Passo a Passo

#### 3.1 Criar PostgreSQL (Neon)

1. Acessar https://neon.com
2. Criar novo projeto (free plan)
3. Gerar connection string
4. Aplicar migrations:
   ```bash
   cd backend
   npx prisma migrate deploy
   ```
5. Testar conexão

#### 3.2 Criar Storage (Cloudflare R2)

1. Acessar Cloudflare Dashboard
2. Criar bucket (ex: `biblioteca-estudos-homologacao`)
3. Gerar API token (R2 read/write)
4. Configurar CORS se necessário
5. Testar upload

#### 3.3 Deploy Backend (Render)

1. Conectar repositório GitHub ao Render
2. Criar Web Service
3. Configurar build command: `npm install && npm run build`
4. Configurar start command: `npm run start:prod`
5. Adicionar variáveis de ambiente
6. Deploy automatico ao push em develop

#### 3.4 Deploy Frontend (Vercel)

1. Conectar repositório GitHub ao Vercel
2. Importar projeto (diretório `frontend`)
3. Configurar build command: `npm run build`
4. Configurar output directory: `.next`
5. Adicionar variáveis de ambiente
6. Deploy automático ao push em develop

#### 3.5 Configurar CORS e URLs

1. Atualizar `FRONTEND_URL` no backend (Render)
2. Atualizar `NEXT_PUBLIC_API_URL` no frontend (Vercel)
3. Testar CORS com health check
4. Validar HTTPS (auto-provisionado por Vercel/Render)

---

## 4. Testes Hospedados

### Checklist de Validação

| Teste | Status | Critério de Sucesso |
|---|---|---|
| Cadastro de usuário | PENDENTE | POST /auth/register retorna 201 e token válido |
| Login | PENDENTE | POST /auth/login retorna 200 e token válido |
| Renovação de token | PENDENTE | POST /auth/refresh retorna novo token válido |
| Logout | PENDENTE | POST /auth/logout invalida token |
| Proteção de endpoints | PENDENTE | Endpoints protegidos retornam 401 sem token |
| Isolamento de dados | PENDENTE | Usuário A não acessa dados do usuário B |
| CRUD áreas | PENDENTE | Criar, ler, atualizar, deletar áreas funcionam |
| Upload de anexos | PENDENTE | Upload para R2 bem-sucedido |
| Recuperação de anexos | PENDENTE | Download de anexos funciona |
| URLs assinadas | PENDENTE | URLs assinadas expiram corretamente |
| Permissões de storage | PENDENTE | Usuário só acessa seus próprios arquivos |
| Persistência pós-restart | PENDENTE | Dados persistem após restart do backend |
| Health checks | PENDENTE | GET /health retorna 200 |
| Tratamento de falhas | PENDENTE | Erros são tratados gracefulmente |

### Procedimento de Teste

1. **Testes manuais iniciais:**
   - Criar conta via UI
   - Login e verificar sessão
   - Criar área e adicionar notas
   - Upload de anexo
   - Verificar recuperação de anexo

2. **Testes automatizados (opcional):**
   - Adaptar testes e2e para apontar para URLs de homologação
   - Executar suite de testes contra ambiente hospedado

3. **Testes de carga (opcional):**
   - Usar ferramenta como k6 ou Artillery
   - Validar performance sob carga moderada

---

## 5. Backup e Rollback

### Mecanismos Disponíveis

| Serviço | Backup Automático | Restauração | R2D | Período de Retenção |
|---|---|---|---|---|
| Neon | Sim (instant restore) | Instant restore (6h) | Sim | 6 horas |
| R2 | Não (manual) | Manual via API | Sim | Até que seja deletado |
| Vercel | Sim (deploy history) | Revert no dashboard | Sim | Depende do plano |
| Render | Não (manual) | Redeploy commit anterior | Sim | Depende do git history |

### Procedimentos de Backup

#### Neon (PostgreSQL)

1. **Snapshots manuais:**
   - Criar snapshot via dashboard Neon
   - 1 snapshot incluído no plano free
   - Armazenar nome/timestamp do snapshot

2. **Export SQL (alternativa):**
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```
   - Armazenar localmente ou em R2

#### R2 (Storage)

1. **Backup via script:**
   - Listar todos os objetos
   - Copiar para bucket de backup (separado)
   - Automatizar via cron job

2. **Versionamento:**
   - Habilitar versionamento de objetos (se disponível)
   - Mantém versões anteriores dos arquivos

#### Frontend/Backend (Vercel/Render)

1. **Git history:**
   - Commit de produção tagged
   - Branches de produção isolados

2. **Deploy history:**
   - Vercel mantém histórico de deployments
   - Render mantém histórico de deploys recentes

### Procedimentos de Rollback

#### Rollback de Código

1. **Backend (Render):**
   - Redeploy commit anterior via dashboard
   - Ou reverter via git e push

2. **Frontend (Vercel):**
   - Revert deployment no dashboard
   - Ou reverter via git e push

#### Rollback de Dados (Neon)

1. **Instant restore (últimas 6h):**
   - Selecionar ponto no timeline
   - Restaurar instantaneamente
   - Limitado a 1 GB de mudanças

2. **Restore de snapshot:**
   - Criar novo branch a partir do snapshot
   - Apontar aplicação para novo branch
   - Migrations reversíveis podem ser aplicadas

#### Rollback de Storage (R2)

1. **Restore de backup:**
   - Copiar objetos do bucket de backup
   - Sobrescrever versões corrompidas

2. **Versionamento:**
   - Restaurar versão anterior do objeto
   - Requer versionamento habilitado

### Cuidados com Migrations

1. **Migrations reversíveis:**
   - Sempre implementar `down` migration
   - Testar rollback localmente antes de deploy

2. **Teste em staging:**
   - Aplicar migration em ambiente de staging
   - Validar funcionalidade antes de produção

3. **Backup pré-migration:**
   - Criar snapshot do banco antes de migration
   - Ter plano de rollback documentado

---

## 6. Relatório Final

### Status Atual (23/10/2026)

| Item | Status | Classificação |
|---|---|---|
| CI aprovado | ✅ Run #13 aprovado | Concluído e validado |
| Commit aprovado | ✅ 7e974d5 | Concluído e validado |
| Docker build | ⚠️ Desabilitado temporariamente | Implementado mas não validado |
| Serviços provisionados | ❌ Nenhum | Pendente de configuração externa |
| URLs de homologação | ❌ Nenhuma | Pendente de infraestrutura |
| Testes hospedados | ❌ Não executados | Pendente de infraestrutura |
| Backups configurados | ❌ Não configurados | Pendente de infraestrutura |
| Rollback testado | ❌ Não testado | Pendente de infraestrutura |

### Pendências

1. **Bloqueado por infraestrutura:**
   - Criação de contas em Vercel, Render, Neon, Cloudflare
   - Provisionamento de PostgreSQL em Neon
   - Criação de bucket em R2
   - Deploy de backend em Render
   - Deploy de frontend em Vercel
   - Configuração de variáveis de ambiente
   - Execução de migrations
   - Testes hospedados
   - Configuração de backups
   - Teste de rollback

2. **Técnicas:**
   - Reabilitar job Docker build no CI (requer investigação de configuração Docker daemon)
   - Validar build local de Docker image (se Docker disponível)

### Riscos Residuais

1. **Limitações de planos gratuitos:**
   - Spin-down pode causar latência
   - Limits podem ser excedidos com uso moderado
   - Sem SLA em planos gratuitos

2. **Persistência de dados:**
   - Render filesystem efêmero (mitigado por Neon)
   - R2 sem backup automático (requer script manual)

3. **Scale-to-zero:**
   - Neon scale-to-zero pode causar cold starts
   - Mitigação: connection pooling (PgBouncer integrado)

### Próximos Passos

1. **Imediato (requer autorização):**
   - Criar contas em provedores
   - Provisionar PostgreSQL (Neon)
   - Criar bucket storage (R2)
   - Deploy backend (Render)
   - Deploy frontend (Vercel)
   - Configurar variáveis de ambiente
   - Executar migrations
   - Testar integração

2. **Curto prazo:**
   - Executar testes hospedados
   - Configurar backups manuais
   - Documentar procedimentos de rollback
   - Validar CORS e HTTPS
   - Testar health checks

3. **Médio prazo:**
   - Investigar e reabilitar Docker build no CI
   - Configurar monitoramento (se disponível)
   - Configurar alertas de uso
   - Planejar upgrade para planos pagos se necessário

### Conclusão

O CI foi aprovado com sucesso (run #13, commit 7e974d5). Todos os critérios de aprovação foram atendidos, exceto a validação do Docker build (job desabilitado temporariamente). O código está pronto para deploy em homologação.

No entanto, nenhum recurso de infraestrutura foi provisionado pois não há acesso às contas dos provedores de nuvem. Para prosseguir com a homologação, é necessário:

1. Acesso às contas Vercel, Render, Neon e Cloudflare
2. Autorização para criar recursos nos planos gratuitos
3. Execução dos procedimentos de provisionamento documentados

Todos os provedores selecionados oferecem planos gratuitos generosos adequados para homologação, com limites claros e sem cobranças automáticas ao exceder os limites gratuitos.