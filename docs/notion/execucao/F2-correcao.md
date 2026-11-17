# Correção — F2

Status: CORRIGIDO E VERIFICADO
Data: 2026-11-10

## Falha identificada
- ID: BUG-F2-01
- Requisito afetado: RF-003 (organizar páginas em árvore), RF-004 (mover páginas e ramos) e RF-005 (navegar por URL, árvore e caminho).
- Problema: a funcionalidade de hierarquia foi implementada em código e no Prisma schema, mas a migração `20261110120000_area_hierarchy` ainda não havia sido aplicada no banco PostgreSQL em execução. Isso fazia o backend falhar em runtime ao executar `area.findMany` com `parentId`, emitindo o erro `The column Area.parentId does not exist in the current database`.
- Evidência da causa: `npx prisma migrate status` reportou que a migração estava pendente e o erro de runtime da aplicação confirmava que o banco não possuía a coluna `parentId`.

## Correção implementada
- Aplicamos a migração pendente do Prisma para o banco local:
  - `backend/prisma/migrations/20261110120000_area_hierarchy/migration.sql`
- Verificamos a correção em ambiente real contra o banco:
  - `prisma.area.findMany({ take: 1 })` passou e retornou `query_ok 1` após a migração.
- Mantivemos o restante do escopo F2 intacto: a árvore continua implementada sem avançar para F3.

## Verificação de regressão
Comando executado:
```bash
cd backend
npx prisma migrate deploy
node -e "require('dotenv').config(); const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.area.findMany({ take: 1 }).then(rows => { console.log('query_ok', rows.length); process.exit(0); }).catch(err => { console.error(err); process.exit(1); });"
npm test -- --runInBand --watch=false
```

Resultados observados:
- `npx prisma migrate deploy`: migração aplicada com sucesso.
- Consultar o banco via Prisma: `query_ok 1`.
- Testes do backend: 12 suítes passaram; 80 testes passaram.

## Classificação
- Tipo: defeito de ambiente/infraestrutura de dados, não defeito de lógica da F2 em si.
- Impacto: alto para a execução real da funcionalidade, porque o backend quebrava ao tentar consultar o campo novo antes da migração estar aplicada.
- Risco: em ambientes compartilhados ou de homologação, esse tipo de desvio pode causar falhas silenciosas em produção se o banco não estiver sincronizado com o schema.

## Status final
CORRIGIDO E VERIFICADO dentro do escopo F2.
