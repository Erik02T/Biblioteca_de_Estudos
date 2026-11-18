# Correção — F3

Status: CORRIGIDO E VERIFICADO
Data: 2026-11-10

## Falha identificada
- ID: BUG-F3-01
- Requisito afetado: RF-009 (usar listas de tarefas) e critérios de aceitação da etapa F3.
- Problema: o editor por blocos não registrava as extensões Tiptap de checklist (`taskList` / `taskItem`), e o painel de formatação também não expunha a ação de checklist. O produto estava criando listas de itens, listas numeradas e blocos de código, mas não permitia inserir ou alternar uma checklist, mesmo sendo um requisito da etapa F3.
- Evidência da causa: a reprodução direta do problema foi feita em teste automatizado de regressão, e a configuração do editor em `frontend/src/app/extensions.ts` continha apenas `StarterKit` e `Highlight`.

## Correção implementada
- Adicionamos as extensões compatíveis do Tiptap para checklist:
  - `@tiptap/extension-task-item@3.31.3`
  - `@tiptap/extension-task-list@3.31.3`
- Ajustamos a configuração do editor em `frontend/src/app/extensions.ts` para incluir `TaskList` e `TaskItem.configure({ nested: true })`.
- Atualizamos o painel de formatação em `frontend/src/app/EditorLayout.tsx` para incluir a ação de checklist e a ativação correta do estado no editor.
- Atualizamos o fluxo de marcação em `frontend/src/app/page.tsx` para tratar `taskList` com `toggleTaskList()`.
- Adicionamos teste de regressão em `frontend/src/app/extensions.test.ts` para garantir que a checklist continue disponível.

## Verificação de regressão
Comandos executados:
```bash
cd frontend
npm test -- --runInBand
cd frontend
$env:ALLOW_LOOPBACK_IN_BUILD='true'
npm run build
```

Resultados observados:
- Testes do frontend: 3 suítes passaram; 7 testes passaram.
- Build de produção: compilação concluída com sucesso.

## Classificação
- Tipo: defeito do produto e defeito de teste.
- Impacto: médio para o escopo da etapa F3, porque o requisito funcional RF-009 ficou incompleto mesmo com o restante do editor funcionando.
- Risco: sem essa correção, a checklist não era inserível nem persistida pelo editor, falhando diretamente a funcionalidade esperada no MVP.

## Status final
CORRIGIDO E VERIFICADO dentro do escopo F3.
