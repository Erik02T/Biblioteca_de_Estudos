# Plano mínimo de testes

## Objetivo
Cobrir os fluxos críticos que hoje não têm uma suíte mínima confiável: userId/ownership, DTO validation, CRUD de área/anexo, remoção em cascata, upload de arquivos e editor/autosave.

## Matriz mínima

### 1) Ownership por userId
- Validar JWT válido/expirado e rejeição de requests sem `Authorization`.
- Validar rotação de refresh token e revogação de sessão no logout.
- Validar que o `sub` do token controla o ownership e que `X-User-Id` é ignorado/rejeitado.
- Verificar que `AreasService.findOne` e `AttachmentsService.findOne` só retornam registros do dono correto.
- Testar `GET /areas/:id` e `GET /attachments/:id` com `userId` inválido ou cruzado.

### 2) Validação de DTOs
- `CreateAreaDto`: enums válidos, strings obrigatórias e faixa de `nivelEntendimento`.
- `CreateAttachmentDto`: URL HTTP/HTTPS válida e `areaId` em UUID.
- Validar 400 em rota `POST /areas` e `POST /attachments` com payload inválido.

### 3) CRUD de Area e Attachment
- `create`, `findAll`, `findOne`, `update`, `remove` para `Area`.
- `create`, `list`, `findOne`, `update`, `remove` para `Attachment`.
- Confirmar que a rota usa `userId` para isolar dados por usuário.

### 4) Cascade de remoção
- Quando uma área é removida, remover objetos do storage correspondentes aos anexos.
- Quando o anexo é removido, apagar o objeto físico do storage antes do `delete` no banco.
- Confirmar que URLs externas não são deletadas.

### 5) Fluxo de upload
- Validar MIME real do arquivo antes de salvar.
- Verificar `PutObjectCommand` e `url` pública gerada.
- Testar rollback (`DeleteObjectCommand`) quando o `create` do banco falha.

### 6) Editor e autosave
- Testar renderização do `AreaEditor` com conteúdo inicial.
- Simular edição e confirmar que o callback `onChange` dispara.
- Verificar o estado de autosave quando existe um atraso e a chamada de PATCH é disparada.
- Cobrir o caso de `onBlur` disparando salvamento manual.

## Implementação mínima recomendada
- Backend: serviço + guard + DTO + e2e com mock do Prisma.
- Frontend: adicionar `jest` + `@testing-library/react` e testar o editor e o autosave no componente de formulário.

## Critério de aceite
- Cada item acima tem ao menos um teste automatizado, com falha clara quando a regra é quebrada.
- A suíte deve impedir regressões em `userId`, permissões, payload inválido, remoção e upload.
