# Fase 5 — Provisionamento de Infraestrutura, Deploy em Homologação e Validação Real

> **Importante:** Este documento descreve o plano e os procedimentos para homologação. **Nenhum recurso externo foi provisionado nem deploy realizado neste ambiente**, pois não há acesso a contas de provedores de nuvem, Docker, PostgreSQL ou storage S3. Todas as etapas que dependem de infraestrutura externa estão marcadas como **PENDENTE DE INFRAESTRUTURA**.

---

## 1. Diagnóstico Inicial

### Estado do Repositório (Branch: `develop`, Commit: `e7b8c23`)

| Componente | Status | Evidência |
|---|---|---|
| Backend (NestJS 11) | ✅ Pronto | `npm run build` passa, 63 testes unitários + 26 e2e passam |
| Frontend (Next.js 16) | ✅ Pronto | `npm run build` passa, 4 testes de autenticação passam |
| Dockerfile (multi-stage) | ✅ Criado | `backend/Dockerfile` existe, não validado (Docker indisponível) |
| CI/CD Pipeline | ✅ Criado | `.github/workflows/ci.yml` existe, não executado |
| Variáveis de ambiente | ✅ Documentadas | `env.example` completo com placeholders |
| Documentação de produção | ✅ Completa | `PRODUCAO.md` com 22 seções |
| Segredos de desenvolvimento | ⚠️ Presentes | `backend/.env` contém valores de dev (não usar em homologação/produção) |

### Dependências Externas — Classificação

| Dependência | Status | Necessária Para |
|---|---|---|
| PostgreSQL 14+ | **PENDENTE DE INFRAESTRUTURA** | Migrations, testes reais, homologação |
| Storage S3-compatível (R2/S3/MinIO) | **PENDENTE DE INFRAESTRUTURA** | Upload/recuperação de anexos, URLs assinadas |
| Docker | **PENDENTE DE INFRAESTRUTURA** | Build da imagem, deploy containerizado |
| GitHub Actions | **PENDENTE DE INFRAESTRUTURA** | Execução real da pipeline CI |
| Domínio/URLs públicas | **PENDENTE DE INFRAESTRUTURA** | CORS, `NEXT_PUBLIC_API_URL`, `FRONTEND_URL` |