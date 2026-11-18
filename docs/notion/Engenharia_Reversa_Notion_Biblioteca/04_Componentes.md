# 04. Catálogo de componentes

O quadro separa o que é visível na referência do que precisa ser projetado. As interfaces e propriedades de componentes são propostas de implementação, não extraídas do código do Notion.

| ID | Componente | Props/dados e eventos propostos | Estados observados | Estados a construir/verificar | Reuso e origem |
|---|---|---|---|---|---|
| CMP-01 | AppShell | página ativa, lateral aberta; alternar lateral | Desktop escuro | Lateral em gaveta, foco e carregamento | Global; EV-001 |
| CMP-02 | PageTree | id, título, ícone, filhos, expanded; abrir/criar/mover | Árvore expandida, item ativo | Erro, vazio, paginação de filhos, teclado | Navegação e seletor de destino; EV-011 |
| CMP-03 | Breadcrumbs | ancestrais; abrir nível/mostrar irmãos | Caminho e menus em cascata | Truncamento acessível, overflow | Todas as páginas; EV-009 |
| CMP-04 | PageHeader | título, ícone, capa, posição da capa; atualizar | Com/sem capa, placeholder | Upload, falha e remoção | Páginas; EV-001, EV-013, EV-020 |
| CMP-05 | PageProperties | seção, categoria, status, entendimento | Não demonstrado como estudo no Notion | Validação, alteração pendente e erro | Página/tabela; REP-01, REP-03 |
| CMP-06 | BlockEditor | documento, schemaVersion; transação | Leitura com diversos blocos | Vazio, seleção, composição japonesa, colagem | Página/modelos; EV-007, REP-04 |
| CMP-07 | CommandMenu | consulta, posição, opções; inserir/cancelar | Menu / não mostrado no vídeo | Abrir por / ou +, filtrar, setas, Enter/Esc | Editor; WEB-01; PROPOSTO |
| CMP-08 | BlockMenu | blockId, tipo; converter/duplicar/mover/apagar | Selecionado, submenus, hover | Undo, alternativa por teclado e conversão inválida | Editor; EV-002–006 |
| CMP-09 | ColorPicker | cor de texto/fundo; escolher/remover | Paletas separadas e recente | Contraste, foco, seleção anunciada | Texto/blocos; EV-004 |
| CMP-10 | IconPicker | emoji/ícone; pesquisar/escolher/remover | Popover, categorias, filtro | Teclado e erro de imagem, se suportada | Cabeçalho/árvore; EV-005, EV-020 |
| CMP-11 | CodeBlock | texto, linguagem; copiar/alterar linguagem | Caixa, lista de linguagens | Clipboard negado, texto copiado, linguagem desconhecida | Editor; EV-008 |
| CMP-12 | PageReference | targetPageId; abrir | Referência com ícone/nome | Destino na lixeira ou indisponível | Editor; EV-010 |
| CMP-13 | AttachmentCard | attachmentId, tipo, nome; abrir/remover | Não exercitado no vídeo | Progresso, falha, URL expirada, nova tentativa | Painel e corpo; REP-06 |
| CMP-14 | SearchDialog | consulta, filtros, cursor; abrir resultado | Apenas entrada de busca | Buscando, vazio, erro, resultado e paginação | Global; EV-022; PROPOSTO |
| CMP-15 | SaveIndicator | estado e revisão confirmada | Não determinado no vídeo | Editando, salvando, salvo, erro, conflito | Cabeçalho; REP-05 |
| CMP-16 | TrashDialog | raiz/lote, quantidade afetada; restaurar/excluir | Apenas opção de lixeira no menu | Confirmação, falha, restauração parcial proibida | MOD-06; EV-002; PROPOSTO |
| CMP-17 | StudyCollection | pages, view; editar metadados/abrir | Não demonstrado no vídeo | Tabela/quadro, vazio, filtros e conflito | MOD-07; WEB-03/04; PROPOSTO |
| CMP-18 | TemplateRevisionPicker | modelos ou versões; aplicar/restaurar | Não demonstrado | Preview, confirmação, erro e cancelamento | MOD-06/08; PROPOSTO |

Menus reutilizam a mesma infraestrutura de popover e foco. Indicadores de erro não devem desaparecer ao abrir outro menu. A seleção de texto deve ser preservada quando a pessoa usa a barra de formatação. A revisão arquitetural deve aproveitar EditorLayout, AttachmentsPanel e FormatPanel onde fizer sentido, sem manter a lógica inteira concentrada em page.tsx.
