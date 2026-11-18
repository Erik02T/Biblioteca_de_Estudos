# Correção — F4

Status: CORRIGIDO E VERIFICADO
Data: 2026-11-10

## Falha identificada
- ID: BUG-F4-01
- Requisito afetado: RF-013 (relacionar páginas por referência interna).
- Problema: o modelo de `Area` e o fluxo de criação/edição não tinham suporte persistente para referência interna entre páginas. A etapa F4 não possuía um campo `targetPageId`, nem validação, nem seleção de referência na interface.
- Evidência da causa: `backend/prisma/schema.prisma` continha `parentId`, `isFavorite` e `deletedAt`, mas não havia qualquer vínculo de referência interna; a inspeção do código e do relatório de testes identificaram ausência de `targetPageId` nos contratos de API e UI.

## Correção implementada
- Adicionamos `targetPageId` ao modelo `Area` em `backend/prisma/schema.prisma` e criamos migração em `backend/prisma/migrations/20261110140000_area_f4_reference_links/migration.sql`.
- Ajustamos `CreateAreaDto` (`backend/src/areas/dto/create-area.dto.ts`) para aceitar `targetPageId` e preservamos a validação no contrato de API.
- Atualizamos `AreasService` (`backend/src/areas/areas.service.ts`) para:
  - normalizar `targetPageId`;
  - validar que a área referenciada exista, pertença ao mesmo usuário e não seja a própria área;
  - incluir `targetPage` no `findOne` para leitura e renderização;
  - persistir o valor na criação e no update.
- Integramos a seleção de referência interna na UI principal em `frontend/src/app/page.tsx`, permitindo escolher uma página referenciada sem quebrar o circuito existente de criação/edição.
- Adicionamos regressão no teste de serviço `backend/src/areas/areas.service.spec.ts` para cobrir referência válida e rejeição de autorreferência.

## Verificação de regressão
Comandos executados:
```bash
cd backend
npm test -- --runInBand
npm run build
```

```bash
cd frontend
npm test -- --runInBand
$env:ALLOW_LOOPBACK_IN_BUILD='true'
npm run build
```

Resultados:
- Backend: 12 suítes passaram; 83 testes passaram; build concluído com sucesso.
- Frontend: 3 suítes passaram; 7 testes passaram; build de produção concluído com sucesso.

## Classificação
- Tipo: defeito do produto e do contrato de API, não apenas falha de teste.
- Impacto: alto para RF-013 e para a integridade da etapa F4.
- Risco residual: a referência interna foi implementada no escopo do MVP atual; não houve expansão para sincronização de renomeação automática em blocos de conteúdo ou para uma experiência de navegação mais avançada fora do modelo existente.

## Status final
CORRIGIDO E VERIFICADO dentro do escopo F4.


## Adendo de reconciliação F8 — 16/11/2026

A correção histórica de targetPageId permanece válida como base. Sua classificação canônica atual é RF-013 parcial: falta nó no corpo/resolvedor autorizado e aceite de renomear/mover/excluir destino. Ver F8.md/F8-testes.md; não confundir campo de propriedade com referência inline.
