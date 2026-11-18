# 13. Backlog priorizado

Status de todos os itens: **Planejado — não implementado**. Não foram criados tickets externos, responsáveis, datas ou compromissos. Cada item referencia requisito, dependências e caso de aceite definidos no catálogo. O ID BK identifica uma entrega rastreável, não necessariamente um único commit.

| Item | Fase | Prioridade | Entrega / objetivo | Requisito | Pré-requisitos | Aceite |
|---|---|---|---|---|---|---|
| BK-001 | F0 | P0 | Preservar a biblioteca existente | RF-001 | — | CT-001, resultado esperado em RF |
| BK-002 | F1 | P0 | Criar e editar páginas persistidas | RF-002 | RF-001 | CT-002, resultado esperado em RF |
| BK-014 | F1 | P0 | Salvar sem perda silenciosa | RF-014 | RF-001 | CT-014, resultado esperado em RF |
| BK-018 | F1 | P0 | Preservar propriedades de estudo | RF-018 | RF-001, RF-014 | CT-018, resultado esperado em RF |
| BK-003 | F2 | P0 | Organizar páginas em árvore | RF-003 | RF-001, RF-002 | CT-003, resultado esperado em RF |
| BK-004 | F2 | P0 | Mover páginas e ramos | RF-004 | RF-003, RF-014 | CT-004, resultado esperado em RF |
| BK-005 | F2 | P0 | Navegar por URL, árvore e caminho | RF-005 | RF-002, RF-003, RF-014 | CT-005, resultado esperado em RF |
| BK-006 | F3 | P0 | Editar conteúdo essencial por blocos | RF-006 | RF-001, RF-002, RF-014 | CT-006, resultado esperado em RF |
| BK-007 | F3 | P0 | Inserir pelo menu de comandos | RF-007 | RF-006 | CT-007, resultado esperado em RF |
| BK-008 | F3 | P0 | Operar blocos por menu | RF-008 | RF-006, RF-007 | CT-008, resultado esperado em RF |
| BK-009 | F3 | P0 | Usar listas de tarefas | RF-009 | RF-006 | CT-009, resultado esperado em RF |
| BK-010 | F3 | P0 | Usar blocos de código | RF-010 | RF-006 | CT-010, resultado esperado em RF |
| BK-012 | F3 | P0 | Anexar materiais e inseri-los no corpo | RF-012 | RF-002, RF-006 | CT-012, resultado esperado em RF |
| BK-013 | F4 | P0 | Relacionar páginas por referência interna | RF-013 | RF-003, RF-006, RF-015 | CT-013, resultado esperado em RF |
| BK-015 | F4 | P0 | Pesquisar toda a biblioteca | RF-015 | RF-002, RF-006 | CT-015, resultado esperado em RF |
| BK-016 | F4 | P0 | Favoritar e retomar páginas | RF-016 | RF-002, RF-005 | CT-016, resultado esperado em RF |
| BK-017 | F4 | P0 | Excluir com lixeira e restaurar | RF-017 | RF-003, RF-004, RF-014 | CT-017, resultado esperado em RF |
| BK-011 | F5 | P1 | Personalizar cabeçalho e largura | RF-011 | RF-002, RF-012, RF-014 | CT-011, resultado esperado em RF |
| BK-019 | F5 | P1 | Duplicar páginas de forma independente | RF-019 | RF-003, RF-012, RF-014 | CT-019, resultado esperado em RF |
| BK-020 | F5 | P1 | Adicionar alternantes e destaques | RF-020 | RF-006, RF-008 | CT-020, resultado esperado em RF |
| BK-021 | F5 | P1 | Reordenar arrastando com alternativa equivalente | RF-021 | RF-004, RF-008 | CT-021, resultado esperado em RF |
| BK-022 | F6 | P1 | Ver estudos em tabela e quadro | RF-022 | RF-015, RF-018 | CT-022, resultado esperado em RF |
| BK-023 | F6 | P1 | Salvar filtros e ordenações | RF-023 | RF-022 | CT-023, resultado esperado em RF |
| BK-024 | F6 | P1 | Criar páginas a partir de modelos | RF-024 | RF-006, RF-012, RF-019 | CT-024, resultado esperado em RF |
| BK-025 | F7 | P1 | Exportar biblioteca de forma portátil | RF-025 | RF-012, RF-013, RF-020 | CT-025, resultado esperado em RF |
| BK-026 | F7 | P1 | Guardar e restaurar versões explícitas | RF-026 | RF-014, RF-017, RF-012 | CT-026, resultado esperado em RF |

## Trabalho transversal obrigatório

| Item | Entrega | Fases | Requisitos de qualidade | Critério de conclusão |
|---|---|---|---|---|
| BK-027 | Backup, ensaio de restauração e migração aditiva | F0 e antes de cada migração | RNF-006/008 | QA-006/008; comparação de dados e arquivos aprovada |
| BK-028 | Teclado, foco e layouts estreitos | F2–F7 | RNF-001/004 | QA-001/004; mesmos fluxos por teclado e sem arrastar |
| BK-029 | Autorização por objeto e conteúdo seguro | F1–F7 | RNF-003 | QA-003; tentativas entre contas e payloads perigosos rejeitados |
| BK-030 | Baseline e medição de desempenho | F0/F4/F7 | RNF-005 | QA-005; volumes/metas explícitos e medições registradas |
| BK-031 | Diagnóstico e recuperação de falhas | F1–F7 | RNF-002/007 | QA-002/007; erros distinguíveis e rascunho preservado |
| BK-032 | Organização do código, compatibilidade e pipeline | F0–F7 | RNF-006/009/010 | QA-006/009/010; checks executados e fixtures multilíngues preservadas |

## Como transformar backlog em execução

Para cada BK, o implementador lê o RF e as RN relacionadas, confirma os arquivos na branch atual, descreve a fatia mínima verificável, implementa e registra execução do CT. Só então altera status para verificado. Dividir um BK grande é permitido mantendo o vínculo original. Nenhuma tarefa é concluída apenas porque a documentação foi criada.
