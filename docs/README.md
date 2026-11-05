# Documentação - Biblioteca de Estudos

Este diretório contém a documentação organizada do projeto.

## Estrutura

### Raiz do Projeto
- `README.md` - Visão geral e instruções de início rápido
- `env.example` - Template de variáveis de ambiente
- `docker-compose.yml` - Configuração de infraestrutura local

### Development (`docs/development/`)
- [TEST_PLAN.md](./development/TEST_PLAN.md) - Plano de testes mínimos
- [prompts-biblioteca-estudos.md](./development/prompts-biblioteca-estudos.md) - Prompts de desenvolvimento por fase (histórico)

### Deployment (`docs/deployment/`)
- [HOMOLOGACAO.md](./deployment/HOMOLOGACAO.md) - Plano de homologação e infraestrutura
- [PRODUCAO.md](./deployment/PRODUCAO.md) - Documentação de produção, segredos e backup

### Archive (`docs/archive/`)
- [FASE_6_RELATORIO.md](./archive/FASE_6_RELATORIO.md) - Relatório da Fase 6 (preparação operacional)
- [FASE_6_1_RELATORIO.md](./archive/FASE_6_1_RELATORIO.md) - Relatório da Fase 6.1 (validação de infraestrutura)
- [FASE2_ESTABILIZACAO_REPORT.md](./archive/FASE2_ESTABILIZACAO_REPORT.md) - Diagnóstico histórico da estabilização local
- [REFACTORING_REPORT.md](./archive/REFACTORING_REPORT.md) - Registro da reorganização e dos arquivos removidos

## Documentação Específica por Módulo

### Backend
Consulte `backend/README.md` para:
- Comandos de desenvolvimento e build
- Endpoints da API
- Configuração do Prisma
- Health checks

### Frontend
Consulte `frontend/README.md` para:
- Comandos de desenvolvimento e build
- Configuração de ambiente
- Estrutura de componentes
- Funcionalidades
