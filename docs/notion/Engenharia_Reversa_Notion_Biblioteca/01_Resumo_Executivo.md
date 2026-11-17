# 01. Resumo executivo

**Biblioteca de Estudos — evolução inspirada no Notion**<br>
Data: 10/11/2026. Estado: especificação proposta para revisão; nenhuma implementação realizada.

## Direção recomendada

Evoluir o projeto existente para uma biblioteca pessoal de páginas hierárquicas, com editor por blocos, materiais anexados e acompanhamento de estudo. “Simplificada, porém completa” significa concluir o ciclo de organizar → escrever → relacionar → encontrar → revisar → recuperar/exportar dentro desse domínio. Não significa reproduzir todo o produto Notion.

Um exemplo da organização proposta é **Projetos → Desenvolvimento web → Backend → Terminal → Exercícios**. Cada nível é uma página que pode ter conteúdo e páginas filhas. Idiomas, Faculdade, Projetos e Outros continuam como entradas da biblioteca. Estudando/Estudado passam a funcionar também como filtros e propriedades, sem obrigar a pessoa a atravessar essas telas para abrir uma anotação.

## O que foi confirmado

- No vídeo: tema escuro, páginas com capa/ícone, hierarquia de páginas, referência a subpágina no conteúdo, menus contextuais, opções de transformação e cor, seletor de linguagem de código, navegação por caminho, páginas vazias e personalização. Muitas opções apenas aparecem; sua execução não é demonstrada.
- No repositório: Next.js/React, Tiptap, NestJS, Prisma/PostgreSQL; entidades Area, Attachment, User e Session; seções/status fixos; anexos; fila de salvamento e verificação condicional de conflito. Evidência de código não equivale a homologação em produção.
- A base analisada foi `main`, commit `ccecca35a828da4c19015ba51874da3cf09e10a1`. A comparação remota mostrou `refactor/cleanup-general` um commit atrás dessa base, sem alterações exclusivas na comparação. Nenhum branch foi modificado.

## O que mais precisa mudar

| Dimensão | Situação constatada | Evolução proposta |
|---|---|---|
| Organização | Area sem relação pai/filho | Preservar Area e adicionar hierarquia |
| Navegação | Estados React na página principal | Rotas por ID, árvore lateral e caminho clicável |
| Editor | Texto rico; controles em painéis | Inserção contextual, ações por bloco e blocos de estudo |
| Busca | Filtra os itens carregados da listagem | Busca no servidor, em todas as páginas do proprietário |
| Salvamento | Fila existente, conflitos condicionais | Revisão obrigatória nas escritas e saída protegida |
| Exclusão | Remoção de registros e arquivos | Lixeira recuperável antes da exclusão definitiva |
| Anexos | Painel vinculado à Area | Reuso do painel e referências por ID no conteúdo |
| Visualizações | Listagem e filtros fixos | Tabela e quadro sobre os mesmos registros, numa segunda entrega |

## Vocabulário que evita erros de arquitetura

- **Página:** documento completo; corresponde à Area existente.
- **Bloco:** parágrafo, título, código, imagem, tarefa ou referência dentro do documento Tiptap. Não criar uma Area para cada parágrafo.
- **Subpágina:** outra Area cujo `parentId` aponta para a página mãe.
- **Metadados:** informações sobre a página: categoria, status e nível de entendimento.
- **Visualização:** maneira de mostrar os mesmos dados; alternar tabela/quadro não cria cópias das páginas.
- **MVP:** primeira versão que já permite concluir o fluxo principal com persistência e recuperação.
- **Migração:** transformação controlada do banco/conteúdo existente para o novo formato.
- **Controle de concorrência:** evita que uma aba sobrescreva silenciosamente o trabalho de outra.

## Duas entregas com fronteiras claras

**MVP — RF-001 a RF-010 e RF-012 a RF-018:** preservar dados, criar páginas, organizar subpáginas, navegar, editar blocos essenciais, código e tarefas, anexar materiais, criar links internos, salvar com segurança, pesquisar, favoritar e recuperar da lixeira. O ícone simples existente continua funcionando. Os requisitos não funcionais críticos fazem parte dessa entrega.

**Versão completa simplificada — acrescentar RF-011 e RF-019 a RF-026:** capa/seletor de ícone, duplicação independente, alternantes e destaques, arrastar com alternativa acessível, tabela/quadro de estudos, filtros salvos, modelos, exportação portátil e versões manuais recuperáveis.

**Fora das duas entregas:** colaboração simultânea, espaços de equipe, compartilhamento público, comentários entre usuários, IA/agentes, calendário externo, fórmulas, relações/rollups arbitrários, marketplace, blocos sincronizados, layouts de múltiplas colunas, modo offline com sincronização e clonagem integral de bases do Notion. Essas funções foram registradas quando visíveis; não foram apagadas da análise.

## Critério de sucesso

O usuário consegue criar uma página de estudo com subpáginas, escrever e reorganizar conteúdo, anexar e reencontrar material, mudar de tela sem perda silenciosa, reabrir após recarregar e restaurar uma exclusão. Na segunda entrega, consegue também visualizar o estudo em tabela/quadro e levar uma cópia dos dados e arquivos consigo.

A prioridade é concluir esses fluxos. Sem eles, semelhança visual não demonstra uma biblioteca completa.
