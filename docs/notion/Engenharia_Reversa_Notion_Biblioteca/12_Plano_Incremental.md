# 12. Planejamento incremental

Plano PROPOSTO, sem cronograma prometido ou tarefas iniciadas. A implementação começa após validação dos requisitos e deste recorte, conforme DOC-01. As etapas abaixo orientam o trabalho futuro; executar a análise não significa ter concluído F0 técnico.

## F0 — Confirmar baseline e proteger os dados

**Objetivo:** tornar a mudança reversível e baseada no estado real do projeto. **Escopo:** RF-001; RNF-006/008/009. **Pré-requisitos:** revisão a implementar escolhida; ambiente de teste e dados representativos autorizados.

Inspecionar working tree, instruções e docs locais; confirmar branch sem sobrescrever trabalho do usuário. Executar checks existentes, reproduzir os GAP-01–10 relevantes e inventariar formatos do conteúdo/anexos. Preparar backup e provar restauração em ambiente isolado. Fixar limites reais de payload e volumes de teste.

**Conclusão:** relatório de baseline, diferenças entre código e produção registradas, backup restaurável, fixtures anonimizadas e plano aditivo revisado. **Testes:** CT-001 e QA-006/008/009. **Risco:** migrar formatos não inventariados. **Componentes:** camada de dados, editor legado, storage. **Prioridade:** bloqueadora para todas as demais fases.

## F1 — Criar páginas e salvar de forma confiável

**Escopo:** RF-002/014/018; contratos de schema/revisão. **Pré-requisito:** F0. **Objetivo:** persistência comum para conteúdo e metadados antes de ampliar UI.

Criar rascunho idempotente; preservar defaults compatíveis; unificar fila por página, revisão esperada, estado de salvamento e recuperação local segregada por usuário. Não marcar página salva enquanto houver metadados pendentes. Distinguir fechar de desfazer. Preparar erro de conflito e estados de falha.

**Conclusão:** criar/editar/recarregar funciona, resposta atrasada não apaga texto e duas abas não sobrescrevem silenciosamente. **Testes:** CT-002/014/018; QA-002/003/007. **Risco:** escritores antigos que não enviam revisão. **Componentes:** PageHeader, propriedades, SaveIndicator, API client. **Prioridade:** P0.

## F2 — Hierarquia e navegação

**Escopo:** RF-003/004/005. **Pré-requisito:** F1. Implementar parentId, ordem, árvore lateral, caminho e rotas por ID. Criar subpágina e mover ramo com proteção concorrente contra ciclos. Tratar links indisponíveis e navegação com alterações pendentes.

**Conclusão:** ramo sobrevive à recarga e navegação direta; mover preserva IDs/anexos e não cria ciclo. **Testes:** CT-003–005 e QA-004. **Risco:** carregar documentos inteiros para montar árvore, ou mover apenas parte do ramo. **Componentes:** PageTree, Breadcrumbs, seletor de destino. **Prioridade:** P0.

## F3 — Editor e materiais

**Escopo:** RF-006–010/012. **Pré-requisitos:** F1/F2, prova técnica de extensões Tiptap. Implementar comandos e menu contextual, formatação, tarefas, código e referências inline de anexos. Preservar headings e JSON antigos; cuidar do foco e da composição japonesa. Continuar oferecendo painel de anexos.

**Conclusão:** fixture de estudo com formatos e mídias reabre intacta; upload e colagem inválidos falham de modo recuperável. **Testes:** CT-006–010/012; QA-001/006/010. **Risco:** normalização do editor descartar nós desconhecidos ou URLs assinadas ficarem salvas no JSON. **Componentes:** BlockEditor, menus, CodeBlock, AttachmentCard. **Prioridade:** P0.

## F4 — Encontrar, conectar e recuperar; homologar MVP

**Escopo:** RF-013/015/016/017. **Pré-requisitos:** F2/F3. Implementar busca no servidor, referências internas, favoritos/recentes e lixeira com lote. Separar purge de remoção cotidiana. Homologar os 17 requisitos P0 e todos os RNFs aplicáveis.

**Conclusão:** UC-001 a UC-004 e UC-006 executáveis, com limitações P1 explícitas; nenhum blocker de perda de dados, isolamento ou navegação. **Testes:** CT-013/015–017 e regressão dos P0; QA-001–010. **Risco:** restauração ressuscitar itens excluídos antes; busca ignorar páginas não carregadas. **Componentes:** SearchDialog, PageReference, TrashDialog, início. **Prioridade:** P0.

## F5 — Personalização e organização avançada

**Escopo:** RF-011/019/020/021. **Pré-requisito:** MVP validado. Adicionar capa/ícone, cópia independente, alternantes/destaques e drag-and-drop, mantendo menu e teclado equivalentes.

**Conclusão:** duplicar e excluir original não quebra cópia; aparência e ordem persistem; alternantes preservam conteúdo. **Testes:** CT-011/019–021, regressão de schema/arquivos. **Risco:** compartilhar sem controle o mesmo objeto de storage entre cópias; drag introduzir validação diferente de “Mover para…”. **Prioridade:** P1.

## F6 — Visualizações e modelos de estudo

**Escopo:** RF-022/023/024. **Pré-requisito:** F4/F5. Tabela/quadro usam campos atuais e páginas existentes, com escopo explícito de raízes ou todas as páginas. Salvar configurações e aplicar modelos independentes. Não criar uma engine universal de bases.

**Conclusão:** alterações se refletem na página/árvore/tabela/quadro pelo mesmo ID; modelo não modifica cópias anteriores. **Testes:** CT-022–024, conflitos de edição de propriedades e filtros com paginação. **Risco:** duplicar registros por layout ou aplicar filtro somente depois de paginar. **Prioridade:** P1.

## F7 — Portabilidade, versões e homologação final

**Escopo:** RF-025/026 e validação completa. **Pré-requisitos:** F5/F6 e política de retenção de arquivos/versões definida. Criar snapshots explícitos, restauração com revisão e exportação consistente com arquivos.

**Conclusão:** pacote abre sem sessão; versão com mídia restaura íntegra; todos os RF têm evidência de teste; necessidades remanescentes ficam documentadas. **Testes:** CT-025/026 e regressão dos fluxos alterados; auditorias de acessibilidade/segurança focadas. **Risco:** versões referenciar arquivos apagados; exportação misturar revisões durante edição. **Prioridade:** P1.

## Dependências e liberação

O caminho crítico é F0, F1, F2, F3 e F4, encerrando o MVP. F5, F6 e F7 completam a segunda entrega. Filtros, modelos e exportação dependem da estabilidade de páginas, documentos e arquivos construída nas etapas anteriores.

Essa ordem privilegia dependências funcionais. Design de componentes pode evoluir durante cada fase, mas não deve ocultar falta de persistência. Não há estimativa em dias: tamanho do acervo, compatibilidade de extensões e baseline de testes ainda não foram medidos. Estimar após F0 e a prova técnica do editor, com faixa e hipótese explícitas.

Deploy, merge e execução de migrações não foram solicitados nesta etapa. O plano não modifica o estado de tarefas no GitHub ou Notion.
