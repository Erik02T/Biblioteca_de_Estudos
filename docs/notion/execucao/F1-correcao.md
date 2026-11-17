# Correção — F1

Status: CORRIGIDO E VERIFICADO
Data: 2026-11-10

## Falha identificada
- ID: BUG-F1-01
- Requisito afetado: RF-014 (salvar sem perda silenciosa) e RF-002/018 no contexto de revisão e persistência de metadados.
- Problema: `updatedAt` era opcional em `UpdateAreaDto`, permitindo que clientes omitassem a revisão esperada em atualizações. Isso abria caminho para operações de escrita sem a validação de concorrência e sem a proteção contra sobrescrita silenciosa.
- Evidência da causa: `backend/src/areas/dto/update-area.dto.ts` definiu `updatedAt?: string`, e `backend/src/areas/areas.service.ts` só aplicava a checagem de conflito quando `updatedAt !== undefined`.

## Correção implementada
- Tornamos `updatedAt` obrigatório no contrato de atualização: `backend/src/areas/dto/update-area.dto.ts`.
- Ajustamos o serviço para exigir a revisão esperada em toda atualização, sem ramificação opcional: `backend/src/areas/areas.service.ts`.
- Atualizamos os testes de regressão para cobrir o caso de ausência de `updatedAt` e para validar o fluxo de atualização com a revisão correta: `backend/src/areas/dto/update-area.dto.spec.ts` e `backend/src/areas/areas.service.spec.ts`.

## Verificação de regressão
Comando executado:
```bash
cd backend
npm test -- --runInBand
```
Resultado: 12 suítes passaram, 77 testes passaram.

## Classificação
- Tipo: defeito do produto/contrato de API, não apenas defeito de teste.
- Impacto: alta para a integridade de escrita e o requisito de não sobrescrever trabalho pendente.
- Risco: este ajuste reforça a proteção de concorrência e mantém o comportamento esperado mesmo para clientes antigos que não enviam revisão.

## Status final
CORRIGIDO E VERIFICADO dentro do escopo F1.
