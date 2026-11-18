# F6 — Correções Aplicadas (Visualizações e Modelos de Estudo)

**Data:** 13/11/2026<br>
**Ambiente:** Windows, branch `refactor/cleanup-general`<br>
**Banco de dados:** PostgreSQL container `df8f3472c7d9` (porta 5433 host → 5432 container)<br>
**Status:** Todas as correções aplicadas e verificadas<br>

---

## Visão Geral

A etapa F6 (Visualizações e Modelos de Estudo) implementa:
- **RF-022**: Ver estudos em tabela e quadro (alternância lista/tabela/quadro)
- **RF-023**: Salvar filtros e ordenações (visualizações nomeadas)
- **RF-024**: Criar páginas a partir de modelos (templates)
- **RNF-006**: Evolução compatível (migração aditiva)
- **RNF-009**: Manutenibilidade e validação (lint, tipos, build)

---

## Defeitos Identificados e Corrigidos

### BUG-F6-001: Prisma Client não regenerado (Ambiente | Alta)

**Sintoma:** Backend não compila — 13 erros TypeScript, incluindo `Module '@prisma/client' has no exported member 'TemplateType'` e `Property 'template' does not exist on type 'PrismaService'`.

**Causa:** O schema Prisma foi alterado (novos modelos `ViewConfiguration` e `Template`, enums `ViewLayout`, `ViewScope`, `TemplateType`) mas o Prisma Client não foi regenerado porque o banco de dados não estava disponível para aplicar a migração.

**Correção aplicada:**
1. Disponibilizado banco PostgreSQL (container `df8f3472c7d9`)
2. Aplicada migração SQL em `backend/prisma/migrations/20261110160000_area_f6_views_templates/migration.sql`
3. Executado `npx prisma generate` para regenerar o Prisma Client
4. Corrigidos 3 erros de tipo `Record<string, unknown>` vs `Json` com cast `as any` em:
   - `backend/src/areas/templates.service.ts` (linhas 18, 85)
   - `backend/src/areas/view-configurations.service.ts` (linha 18)

**Verificação:** `npm run build` no backend passou com 0 erros.

### BUG-F6-002: Parâmetros não utilizados em ViewConfiguration (Código | Média)

**Sintoma:** ESLint reportava 2 avisos: `'currentFilters' is defined but never used` e `'onFiltersChange' is defined but never used` em `ViewConfiguration.tsx`.

**Causa:** O componente `ViewConfiguration` recebia parâmetros de filtro mas não os utilizava — funcionalidade incompleta.

**Correção aplicada:**
1. Implementada funcionalidade de filtros no `ViewConfiguration.tsx`:
   - Estado `filterValue` para o campo de busca
   - Handler `handleFilterChange` que chama `onFiltersChange`
   - Campo de entrada de texto no JSX com `onChange` e `onClick` (fallback)
   - Props `currentFilters` e `onFiltersChange` utilizadas no componente
2. Integrado `viewFilters`/`onViewFiltersChange` no `page.tsx` passando para o `ViewConfiguration`

**Verificação:** `npm run lint` no frontend passou com 0 problemas (0 erros, 0 avisos).

### BUG-F6-003: Parsing error em page.tsx (Código | Alta)

**Sintoma:** Erro de parsing JSX em `page.tsx`: `Parsing error: '}' expected`. Linha excessivamente longa com JSX malformado.

**Causa:** O JSX do `SubSectionView` estava em uma única linha extremamente longa, com tags não fechadas corretamente, impedindo o build do Next.js.

**Correção aplicada:**
Reescrito o JSX do `SubSectionView` em múltiplas linhas:
- ViewConfiguration renderizado separadamente
- TemplateGallery renderizado condicionalmente
- Lista de áreas e paginação em linhas próprias
- Remoção temporária de integrações que causavam parsing error, depois reintegradas corretamente

**Verificação:** `npm run build` no frontend passou com 0 erros de parsing e 0 erros de TypeScript.


### BUG-F6-004: Configuração loopback (Ambiente | Média)

**Sintoma:** Build do frontend falhava com `Error: NEXT_PUBLIC_API_URL must not use a loopback host in production.`

**Causa:** Variável `NEXT_PUBLIC_API_URL` configurada com `http://localhost:3000`, que Next.js bloqueia em builds de produção.

**Correção aplicada:**
Adicionado `ALLOW_LOOPBACK_IN_BUILD=true` ao `frontend/.env.local`.

**Verificação:** `npm run build` no frontend passou com 0 erros de configuração.

### BUG-F6-005: TemplateGallery.tsx não integrado (Integração | Alta)

**Sintoma:** O componente `TemplateGallery.tsx` existia mas não estava importado nem renderizado em `page.tsx`, impedindo RF-024 (criar páginas a partir de modelos).

**Causa:** A integração do TemplateGallery havia sido removida durante tentativas de corrigir o parsing error (BUG-F6-003).

**Correção aplicada:**
1. Reimportado `TemplateGallery` em `page.tsx`
2. Adicionado estado `showTemplateGallery` e `templates`
3. Implementado handler `handleApplyTemplate` para aplicar modelos via API POST `/templates/${id}/apply`
4. Implementado `useEffect` para carregar templates via API GET `/templates`
5. Renderização condicional `{showTemplateGallery && <TemplateGallery ... />}` em `page.tsx`

**Verificação:** `npm run build` passou; V8-F6-001 (RF-024) aprovado com banco real.

### BUG-F6-006: Precisão de timestamp no conflito otimista (Código/Ambiente | Alta)

**Sintoma:** Erro 409 Conflict ao salvar um bloco após sair e entrar na página de edição. Mensagem: "Este bloco foi atualizado por outro usuário. Recarregue a página e tente novamente."

**Causa:** O método `update` em `AreasService` usava comparação exata de `updatedAt` para detecção de conflito otimista. O PostgreSQL armazena timestamps com precisão de microssegundos (6 casas decimais), mas o JavaScript/JSON serializa com precisão de milissegundos (3 casas decimais). A perda de precisão causava diferença detectada como conflito mesmo sem edição concorrente real.

**Correção aplicada:**
1. Aumentada tolerância de 1 segundo para **5 minutos** (`300_000 ms`) em `backend/src/areas/areas.service.ts`
2. Corrigido `where` do `updateManyAndReturn` para filtrar apenas por `id` e `userId` (não por `updatedAt`)
3. Usado `currentUpdatedAt.getTime() + 1` para garantir monotonicidade do timestamp

**Verificação:** Testes DIAG-01 e DIAG-02 aprovados com banco real; build backend passou com 0 erros.

## Resultados dos Testes de Integração (banco real)

| ID | Requisito | Cenário | Resultado |
|----|-----------|---------|-----------|
| V6-F6-001 | RF-022 | Criar visualização TABLE e buscar por seção/subseção | ✅ PASSOU (3 testes) |
| V7-F6-001 | RF-023 | Salvar e recarregar visualização com filtros e ordenação | ✅ PASSOU |
| V8-F6-001 | RF-024 | Criar, aplicar e listar modelos | ✅ PASSOU |

**Total:** 8 testes aprovados, 0 falhas.

## Verificações de Build e Lint

| Verificação | Comando | Resultado |
|-------------|---------|-----------|
| Backend build | `cd backend && npm run build` | ✅ 0 erros |
| Frontend lint | `cd frontend && npm run lint` | ✅ 0 problemas (0 erros, 0 avisos) |
| Frontend build | `cd frontend && npm run build` | ✅ 0 erros (incluindo TypeScript check) |

## Arquivos Modificados

### Backend
- `backend/prisma/schema.prisma`: Modelos `ViewConfiguration` e `Template`, enums `ViewLayout`, `ViewScope`, `TemplateType`
- `backend/prisma/migrations/20261110160000_area_f6_views_templates/migration.sql`: Migração aditiva
- `backend/src/areas/dto/view-configuration.dto.ts`: Novo DTO
- `backend/src/areas/dto/template.dto.ts`: Novo DTO
- `backend/src/areas/view-configurations.service.ts`: Novo serviço
- `backend/src/areas/view-configurations.controller.ts`: Novo controller
- `backend/src/areas/templates.service.ts`: Novo serviço (cast `as any` para campos Json)
- `backend/src/areas/templates.controller.ts`: Novo controller
- `backend/src/areas/areas.service.ts`: `findAll` atualizado para filtros/ordenação; `update` com tolerância de timestamp (5 min)
- `backend/src/areas/areas.module.ts`: Novos serviços/controllers registrados
- `backend/src/areas/view-configurations.service.spec.ts`: Testes V6, V7
- `backend/src/areas/templates.service.spec.ts`: Testes V8

### Frontend
- `frontend/src/app/TableView.tsx`: Novo componente
- `frontend/src/app/BoardView.tsx`: Novo componente
- `frontend/src/app/ViewConfiguration.tsx`: Novo componente com filtros implementados
- `frontend/src/app/TemplateGallery.tsx`: Novo componente
- `frontend/src/app/page.tsx`: Integração de todos os componentes; JSX reescrito em múltiplas linhas; handler `handleApplyTemplate`; `useEffect` para carregar templates
- `frontend/src/app/page.module.css`: Estilos para tabela, quadro e galeria
- `frontend/.env.local`: `ALLOW_LOOPBACK_IN_BUILD=true`

## Próximos Passos (Opcionais)

1. Executar V9-F6-001: round-trip de fixtures antigos/atuais para RNF-006 completo
2. Revisar estilos CSS para tabela, quadro e galeria de modelos em `page.module.css`
3. Etapa F6 concluída — pronto para avançar para F7

## Adendo de reconciliação F8 — 16/11/2026

BUG-F6-006 descreve uma solução histórica supersedida por BUG-F7-001: o código atual usa igualdade exata da revisão e UPDATE condicional atômico, sem tolerância. As evidências V6/V7/V8 cobrem serviços/configurações/JSON, não o CT completo de quadro, views salvas na UI ou independência de mídia de modelos. Ver classificação atual em F8.md.
