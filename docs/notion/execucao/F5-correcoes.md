# F5 — Registro de Correções

## BUG-F5-01: Desincronização entre schema Prisma e banco de dados

### Estado
CORRIGIDO E VERIFICADO

### Identificação
- **Data**: 10/11/2026
- **Sintoma**: Erros de runtime no backend reportando colunas inexistentes no banco de dados
  - `The column Area.deletedAt does not exist in the current database`
  - `The column Area.targetPageId does not exist in the current database`
- **Contexto**: Backend NestJS em execução (PID 10616) reportando erros em `areas.service.ts:338` e `areas.service.ts:332`

### Investigação
1. **Causa raiz**: O arquivo `backend/prisma/schema.prisma` não continha os campos adicionados nas etapas F2-F5 (`parentId`, `targetPageId`, `deletedAt`, `isFavorite`, `coverAttachmentId`, `coverPosition`, `fullWidth`, `sortOrder`), mas o banco de dados PostgreSQL já tinha essas colunas aplicadas através de migrações SQL manuais anteriores.

2. **Evidência**:
   - `npx prisma migrate status` mostrou 3 migrações pendentes não aplicadas formalmente pelo Prisma
   - `prisma db pull` sobrescreveu o schema com a estrutura do banco (correta), mas o arquivo foi revertido por `git checkout`
   - TypeScript compilava com 38 erros porque o Prisma Client gerado não continha os tipos para os campos F2-F5

3. **Impacto**: O backend não conseguia compilar nem executar queries que usassem os campos de hierarquia, favoritos, lixeira e personalização, impedindo o funcionamento das etapas F2-F5.

### Correção implementada
1. **Execução manual das migrações SQL pendentes**:
   - `20261110120000_area_hierarchy` (parentId e índices)
   - `20261110130000_area_f4_search_favorites_trash` (isFavorite, lastOpenedAt, deletedAt)
   - `20261110140000_area_f4_reference_links` (targetPageId)
   - `20261110150000_area_f5_personalization` (coverAttachmentId, coverPosition, fullWidth, sortOrder)

2. **Atualização do schema.prisma**:
   - Adicionados campos de hierarquia: `parentId`, relações `parent` e `children`
   - Adicionados campos de referência: `targetPageId`, relações `targetPage` e `referencedBy`
   - Adicionados campos de personalização: `coverAttachmentId`, `coverPosition`, `fullWidth`, `sortOrder`
   - Adicionados campos de F4: `isFavorite`, `lastOpenedAt`, `deletedAt`
   - Adicionada relação `coverAttachment` em Attachment com `usedAsCover`
   - Adicionados índices correspondentes às colunas novas

3. **Regeneração do Prisma Client**:
   - `npx prisma generate` após atualização do schema
   - `npm install` para reinstalar dependências Prisma corrompidas

### Verificação
- **Build**: `npm run build` — sucesso sem erros
- **Testes**: `npm test` — 15 suítes, 108 testes aprovados
- **Migrações**: `npx prisma migrate status` — "Database schema is up to date!"

### Arquivos alterados
- `backend/prisma/schema.prisma` — atualizado com campos F2-F5
- `backend/node_modules/@prisma/client/` — regenerado

### Riscos de regressão
- **Baixo**: O banco de dados já tinha a estrutura correta; apenas o schema e o Prisma Client foram atualizados para refletir a realidade do banco
- **Tipagem**: Código TypeScript usando os campos F2-F5 agora tem tipos corretos, reduzindo risco de erros em runtime

### Limitações
- A migração foi aplicada manualmente via `prisma db execute` porque `prisma migrate dev` falhava devido a uma migração anterior modificada após aplicação
- O histórico de migrações Prisma foi ajustado com `prisma migrate resolve --applied` para marcar as migrações como aplicadas

### Notas
- O erro inicial (`prisma db pull` sobrescrevendo o schema) foi revertido com `git checkout`, o que reestabeleceu o schema desatualizado. A correção manual foi necessária para sincronizar corretamente.
- A execução manual das migrações SQL garantiu que o banco e o schema ficassem alinhados sem perda de dados.


## Adendo de reconciliação F8 — 16/11/2026

Para cruzar este histórico com a especificação: RF-019/CT-019 = duplicação independente; RF-020/CT-020 = alternantes/destaques; RF-021/CT-021 = reordenação com alternativa equivalente. O incidente de schema aqui documentado não constitui aceite integral dessas três capacidades. F8.md contém a reconciliação atual.
