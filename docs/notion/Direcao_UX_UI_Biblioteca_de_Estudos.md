# Biblioteca de Estudos — direção de UX/UI e plano de redesign

13 de novembro de 2026. Avaliação heurística de quatro capturas de tela, informada por referências de UX e acessibilidade. Não é um teste com usuários nem uma revisão do build atual em execução. Nenhum arquivo da aplicação foi modificado.

## 1. Diagnóstico central

O projeto apresenta dois extremos: telas de entrada muito espaçosas, com títulos de apresentação dominantes, e um editor denso, com diversas ferramentas permanentemente abertas. A mesma pessoa passa de escolher entre poucos cartões grandes para interpretar quatro faixas verticais, vários botões, metadados e formatação simultaneamente.

A direção proposta é um **ambiente contínuo de estudo**, com navegação previsível, documento central e ferramentas reveladas no momento de uso. A identidade roxa pode permanecer. O ganho principal virá da hierarquia, consistência, linguagem e distribuição das ações.

Há também defeitos visuais objetivos a corrigir antes do refinamento: selects/inputs com aparência desconectada do tema e controles de propriedades aparentemente sobrepostos. As capturas não permitem determinar se a causa é CSS ausente, conflito de estilos ou comportamento responsivo. Isso precisa ser inspecionado no DOM e nos estilos computados do código local.

## 2. Referências e como foram aplicadas

| Referência | Orientação extraída | Aplicação proposta |
|---|---|---|
| Nielsen Norman Group — Progressive Disclosure [1] | Apresentar opções principais primeiro e disponibilizar opções especializadas sob demanda | Manter ações frequentes acessíveis; propriedades, materiais e operações ocasionais em superfícies secundárias identificáveis. |
| Nielsen Norman Group — 10 Usability Heuristics [2] | Consistência, linguagem compreensível, estado visível, controle e recuperação de erros | Distinguir página/bloco, padronizar controles e eliminar a ambiguidade entre “Salvo”, “Salvar” e “Cancelar”. |
| W3C — conteúdo em hover/foco [3] | Conteúdo acionado por hover/foco deve permitir acesso e encerramento adequados | Nenhuma ação essencial exclusivamente no hover; menus utilizáveis por teclado e toque. |
| W3C — contraste e tamanho de alvo [4–5] | Critérios verificáveis para legibilidade e acionamento | Medir os pares reais; projetar alvos confortáveis e verificar exceções aplicáveis, em vez de declarar conformidade pela aparência. |
| WAI-ARIA APG — diálogo modal [6] | Foco entra no diálogo, permanece nele e retorna ao fechar | Aplicar a busca, confirmações e painéis modais no celular; painel lateral não modal tem comportamento diferente. |

As fontes fundamentam princípios. As escolhas específicas deste documento são propostas para a Biblioteca, a validar em uso. Nenhum profissional dessas organizações avaliou estas telas.

## 3. Auditoria das quatro telas

Prioridades: **P0** = clareza de dados/ações ou controle visual comprometido; **P1** = fluxo principal; **P2** = refinamento. São prioridades de design, não classificação de vulnerabilidade.

| Tela / observação visível | Consequência provável | Mudança proposta | Prioridade |
|---|---|---|---|
| Início: grande chamada “Biblioteca do conhecimento”, apresentação e rodapé ocupam boa parte da tela | O usuário recorrente precisa atravessar uma apresentação para retomar uma nota | Cabeçalho compacto, “Continuar estudando”, recentes reais e áreas de conhecimento acessíveis na lateral | P1 |
| Idiomas: outra tela grande apenas para escolher “Estudando” ou “Estudado” | Status acrescenta uma etapa ao caminho até o conteúdo | Abrir diretamente a coleção Idiomas; status vira filtro/aba na mesma tela | P1 |
| Coleção: “Estudando” muito grande, filtros comprimidos em uma linha e controles brancos | A hierarquia dá destaque ao título e pouco espaço à operação | Título compacto, barra de ferramentas responsiva e componentes consistentes | P0/P1 |
| Coleção: cartão exibe Favoritar, Editar, Duplicar e setas simultaneamente | Ações repetidas dominam o conteúdo e escalam mal com muitas páginas | Título abre a página; favorito discreto e menu de ações. Reordenação disponível em contexto apropriado | P1 |
| Coleção: “Página raiz”, “Sem referência interna”, “0/5” e barra de baixo destaque | Metadados técnicos e estados vazios competem com informações úteis | Mostrar categoria/status quando ajudam a decidir. Detalhes estruturais nas propriedades; nomear entendimento explicitamente | P1 |
| Editor: árvore, documento, anexos/formatação e uma faixa extra de ações | Muitas regiões disputam espaço e atenção | Navegação lateral reaproveitada, documento e painel auxiliar opcional; incorporar ações da faixa extrema ao cabeçalho/menu | P1 |
| Editor: propriedades parecem sobrepostas junto aos selects | Leitura e acionamento ficam comprometidos | Layout com rótulos, dimensões mínimas, quebra responsiva e inspeção de zoom/conteúdo longo | P0 |
| Editor: H1–H6, cores, formatos e anexos sempre visíveis | Ferramentas ocasionais têm presença semelhante à escrita | Formatação contextual; seletor de estilo; materiais sob demanda | P1 |
| Editor: recorte e remoção de capa permanentemente sobre a imagem | Uma configuração ocasional compete com a leitura | Modo explícito “Reposicionar capa”, com concluir/cancelar somente essa operação | P2 |
| Editor: “Salvo” junto de “Salvar” e “Cancelar” | Não fica claro o que já persistiu ou o que Cancelar desfaz | Definir um contrato de salvamento e ajustar os rótulos ao comportamento real | P0 |
| Terminologia: “Novo bloco” abre algo com título, capa, status e conteúdo | Confusão entre documento e unidade do editor | Chamar esse objeto de “Página”; reservar “Bloco” ao conteúdo dentro dela | P1 |
| Anexos: espaços vazios tracejados sem significado evidente na captura | Pode parecer erro, carregamento ou conteúdo ausente | Renderizar apenas itens reais e um estado vazio explicado. Se for carregamento, usar indicação temporária com saída para erro | P1 |

Não concluí pelas imagens que busca, salvamento ou anexos estejam quebrados. A avaliação acima distingue o que está visível da hipótese de impacto.

## 4. Arquitetura de navegação proposta

### Estrutura persistente

- **Lateral:** Biblioteca, Buscar, Início, Favoritos, áreas de estudo e árvore de páginas. Lixeira e conta em posição secundária estável. A lateral que já aparece no editor deve ser integrada às demais telas, com seleção consistente.
- **Barra superior:** caminho da página/coleção e ações locais. O caminho precisa continuar correto ao mover uma página.
- **Área central:** início, coleção ou documento. Trocar de área não troca toda a linguagem visual da aplicação.
- **Ferramenta auxiliar:** propriedades, materiais ou índice, aberta conforme necessidade. Preferência inicial: uma por vez. Permitir fixar o painel no desktop posteriormente, se o uso demonstrar necessidade.

O início passa a servir a retomada: páginas recentes verificadas e acesso às áreas. Não preencher com métricas artificiais, porcentagens de aprendizado não calculadas ou atividades que o produto não registra. Estado vazio: explicação curta e “Criar primeira página”.

### Redução do caminho

O caminho mostrado nas capturas passa por Biblioteca → Idiomas → status → página. A proposta usa **Idiomas → página**, deixando o status como filtro na coleção. Recentes/favoritos fornecem acesso direto quando disponíveis. É uma redução proposta de passos, não uma medição de tempo ganho.

Preservar os endereços atuais e o histórico. Links que hoje apontam a uma coleção por seção/status devem abrir essa mesma seleção na interface reorganizada. Não mudar dados ou enums do backend para renomear um rótulo visual.

## 5. O que aparece e o que fica sob demanda

| Recurso | Local proposto | Quando aparece / como descobrir |
|---|---|---|
| Título e corpo | Documento central | Sempre visíveis; edição direta no título com foco claro |
| Estado do salvamento | Cabeçalho discreto | Sempre acessível; erro/conflito ganha destaque persistente |
| Nova página | Coleção e lateral | Ação principal com texto; não esconder em menu genérico |
| Buscar | Lateral/barra global | Botão identificado e atalho opcional; nenhum conflito com `/` ou composição IME |
| Status e entendimento | Resumo compacto no documento | Valores legíveis; edição em “Propriedades” ou controle contextual identificado |
| Categoria, página mãe e demais propriedades | Painel “Propriedades” | Botão com rótulo; campos agrupados e nomeados |
| Anexos existentes | Painel “Materiais”, com contagem | Botão estável, inclusive quando vazio; conteúdos podem ser inseridos no documento |
| Inserir imagem/link/arquivo | Menu Inserir e painel Materiais | Agrupar pela intenção “Inserir”; respeitar o mesmo fluxo de upload existente |
| Negrito/itálico/link/destaque | Barra contextual de texto | Na seleção; também por comando/teclado e alternativa por botão |
| Tipo de bloco | Menu de bloco e Inserir | Tipos frequentes primeiro; H4–H6 permanecem acessíveis em estilos adicionais |
| Duplicar/converter/mover bloco | Menu do bloco | Botão acessível por foco/toque; nenhuma exclusão silenciosa na conversão |
| Mover/duplicar página | Menu “Mais opções da página” | Rótulos distinguem página de bloco; feedback após ação |
| Favoritar | Ação discreta no item/documento | Estado selecionado identificável sem depender só de cor |
| Visualização lista/tabela/quadro | Barra da coleção | Um seletor de visualização; não misturar com ordenação |
| Filtros | Botão “Filtrar” | Contador e resumo dos filtros ativos permanecem à vista quando o painel fecha |
| Ordenação e direção | Popover “Ordenar” | Campo e direção juntos. Não deixar “Crescente/Decrescente” sem contexto |
| Escopo raízes/todas | Opções de visualização | Rótulo “Páginas principais” ou “Incluir subpáginas”, explicando o resultado; preservar contrato |
| Modelos | Ação identificada junto de Nova página | “Criar a partir de modelo”; não obrigar o fluxo normal a passar pela galeria |
| Capa e recorte | Cabeçalho / opções de aparência | Mostrar controles de reposicionamento apenas durante essa tarefa |
| Exportar e versões | Menu da página | Itens identificados; versões abrem sua interface existente |
| Lixeira | Navegação secundária | Local fixo e reconhecível; excluir página no menu, separado das ações não destrutivas |
| Sair da conta | Menu da conta | Não ocupar a barra principal de estudo |

**Ocultar uma ferramenta não significa ocultar a existência dela.** Usar rótulos, grupos previsíveis, estado ativo, contagem e alternativas acessíveis. Evitar cascatas de submenus para tarefas frequentes.

## 6. Contratos de interação

### Salvamento

Primeiro conferir o comportamento implementado. Se conteúdo e metadados são automáticos, apresentar “Salvando…”, “Salvo”, “Sem conexão — alterações pendentes” e “Conflito — revisar alterações”. Não afirmar que existe cópia local recuperável enquanto isso não estiver implementado e validado.

Nesse modelo, fechar a página é “Voltar” ou “Fechar”; “Cancelar” não promete desfazer dados já persistidos. Desfazer durante edição e restaurar uma versão são operações distintas. Se alguns campos ainda exigem gravação explícita, mostrar “Aplicar alterações” dentro do grupo correspondente e não exibir “Tudo salvo” globalmente.

### Painéis, menus e foco

- Usar uma superfície secundária por tarefa. Abrir Materiais troca Propriedades quando ambos ocupariam a mesma região.
- Menu/popover para ações curtas; painel para configuração contínua; diálogo para uma tarefa que bloqueia temporariamente o restante da interface.
- Escape fecha a camada ativa, preservando alterações conforme seu contrato; foco retorna ao acionador quando apropriado. Não fechar a página inteira ao dispensar um menu.
- Dialog modal prende o foco; painel lateral não modal permite voltar ao documento por teclado.
- No desktop, ações de bloco podem ganhar ênfase em hover/focus-within, com alvo estável. No toque, fornecer acionador visível e equivalente. Tooltips complementam rótulos; não carregam instruções essenciais.

### Editor

Preservar a instância do editor ao abrir painéis, manter seleção para executar comandos e não perder posição/cursor em re-renderizações. Não reescrever schema do documento para trocar apresentação. Testar os atalhos durante composição japonesa; não capturar teclas de comandos enquanto o usuário compõe um caractere.

### Movimento e feedback

Proposta de projeto: transições curtas de aproximadamente 120–180 ms para abertura, seleção e feedback. Respeitar movimento reduzido. Nenhuma animação contínua atrás do texto. Ordenação manual deve estar disponível em um modo compatível; não permitir arrastar uma lista ordenada por atualização sem explicar como isso altera a ordenação.

## 7. Sistema visual inicial

Estes valores são um ponto de partida de design, não uma norma nem um resultado de pesquisa com usuários.

| Elemento | Proposta |
|---|---|
| Fundo de leitura escuro | `#17181E` |
| Navegação / superfície secundária | `#121319` |
| Superfície interativa / hover | `#22242E` |
| Texto principal | `#EDEEF5` |
| Texto secundário | `#ADB2C5` |
| Acento / foco | `#BBACFF` |
| Fundo de destaque | `#2E2842` |
| Texto sobre botão de acento | `#211738` |
| Separador decorativo | `#363946`; não usá-lo como único indicador de campo ou foco |
| Tipografia | Uma família sans consistente na interface; corpo 16–18 px, ferramentas 14 px, secundários 12–13 px |
| Título de coleção / documento | Aproximadamente 28–36 px; ajustar ao conteúdo e viewport |
| Espaçamento | Escala 4/8/12/16/24/32/48 px |
| Cantos | 6–8 px em controles; até 12 px em diálogos; evitar enquadrar toda região em cartões |
| Coluna de leitura | Faixa inicial 680–760 px no desktop, ajustável; testar linhas longas, japonês e código |
| Lateral | Aproximadamente 220–248 px, recolhível |
| Painel auxiliar | Aproximadamente 300–340 px, apenas quando houver largura útil |

Reservar roxo para seleção, foco e ação principal. Estados de erro/sucesso também usam texto/ícone. Gradientes podem permanecer no logotipo e em pequenos elementos de marca; não são necessários atrás de ferramentas ou texto.

Verificar contraste no contexto real: o critério WCAG para texto comum é 4,5:1; para texto grande, 3:1, com as condições e exceções da norma [4]. Não confundir borda decorativa com indicador indispensável de controle. Um tema claro precisa de tokens próprios validados; inverter as cores automaticamente não basta.

Evitar substituir selects nativos somente por aparência: eles podem ser estilizados de forma consistente. Quando uma interação exigir combobox/menu personalizado, aproveitar um componente acessível já disponível no projeto e validar teclado/foco. Não escolher uma nova biblioteca sem inspecionar as dependências existentes.

## 8. Responsividade e acessibilidade

- **Desktop amplo:** lateral + documento; painel auxiliar opcional, desde que a coluna de leitura continue utilizável.
- **Notebook/tablet:** recolher a lateral ou abrir a ferramenta auxiliar como superfície sobreposta. Decidir por espaço efetivo, não por nome do dispositivo.
- **Celular:** documento em uma coluna, navegação e ferramentas em superfícies que não comprimem o texto. Sem rolagem horizontal da página; código e tabelas podem ter rolagem própria quando necessária.
- Verificar 320, 375, 768, 1024 e 1440 CSS px, zoom de 200%, títulos extensos e nomes de arquivos longos.
- Meta prática: controles de toque próximos de 44×44 px. O mínimo WCAG 2.2 AA de 24×24 CSS px possui exceções de espaçamento/equivalência e outras condições [5]; 44 px é a escolha de projeto para conforto, não a declaração do mínimo AA.
- Ordem de Tab lógica, nomes acessíveis, foco visível, contraste medido e foco não encoberto pelos painéis. Feedback assíncrono anunciado sem interromper a cada caractere.
- Cobertura visual e automação não substituem testar o fluxo com leitor de tela e teclado.

## 9. Implementação incremental sobre o projeto existente

### UX-01 — Corrigir a base visual

Inspecionar o build local, identificar estilos ausentes/conflitos e padronizar Button, Input, Select, rótulos e espaçamentos. Corrigir a sobreposição de propriedades. Definir os estados de salvamento antes de renomear/remover ações. Não mudar dados, contratos ou a lógica concorrente da F7.

**Aceite:** controles legíveis e acionáveis nas larguras de teste; nenhum campo sobreposto; contrato de salvar/fechar compreensível; foco visível.

### UX-02 — Unificar navegação e coleções

Reaproveitar a lateral existente como navegação consistente. Trocar telas intermediárias de status por filtros da coleção; preservar URLs. Padronizar página/bloco. Simplificar cartões/linhas e agrupar filtros, ordenação e escopo.

**Aceite:** abrir uma área e uma página, filtrar status, voltar/recarregar, identificar posição e filtros ativos; mesmas páginas/IDs e dados.

### UX-03 — Dar prioridade ao documento

Reorganizar cabeçalho, título e propriedades; transformar anexos e formatação permanente em ferramentas sob demanda. Remover a faixa extrema de ações incorporando seus comandos aos locais apropriados. Implementar modo foco e capa em modo de edição explícito.

**Aceite:** editar e abrir/fechar ferramentas sem perder cursor, seleção ou conteúdo; executar ações por mouse, teclado e toque; largura de leitura preservada.

### UX-04 — Completar interação por blocos

Integrar comandos e menus da F10 proposta. Se o recurso já existir, reposicionar sem duplicar implementação. Se estiver ausente, registrar como entrega funcional original pendente. Preservar headings legados, referências por ID, arquivos e undo/redo.

**Aceite:** documento misto com japonês, código, tarefas, links e mídia permanece íntegro após edição/recarga; comandos não interferem na composição IME.

### UX-05 — Validar e ajustar

Comparar tarefas antes/depois, verificar estados vazios/loading/erro, responsividade, acessibilidade, desempenho e regressões das operações de dados. Fechar pendências com evidência.

Essa trilha se encaixa na F9/F10 já proposta. A consolidação F8 pode continuar em paralelo à especificação visual; nenhuma nova interface deve esconder falhas conhecidas de persistência ou se declarar pronta apenas por estar estilizada.

## 10. Avaliação prática

Faça uma primeira rodada formativa com pessoas semelhantes ao usuário do produto; isso ajuda a descobrir obstáculos, sem produzir uma estimativa estatística confiável de toda a população. Inclua o próprio uso diário de japonês, programação e faculdade.

Tarefas sem explicar o caminho antecipadamente:

1. Retomar uma página estudada recentemente.
2. Criar uma página em Idiomas e começar a escrever.
3. Alterar status e entendimento, explicando a diferença entre eles.
4. Anexar um material e inserir uma referência no texto.
5. Transformar e mover um bloco; desfazer a última alteração.
6. Encontrar versões e restaurar um estado, entendendo o que será afetado.
7. Identificar uma falha de salvamento e tentar recuperar sem perder conteúdo.

Registrar conclusão, tempo observado, cliques, erros, pedidos de ajuda e compreensão do estado. Comparar com o mesmo cenário anterior. Não prometer percentuais de melhoria sem medição.

## 11. Prompt de implementação para o agente local

```text
ETAPA: UX-01 — base visual e clareza de interação da Biblioteca de Estudos.

Use Direcao_UX_UI_Biblioteca_de_Estudos.md e as quatro capturas como briefing.
Objetivo: corrigir incoerência de controles, sobreposição de propriedades e
ambiguidade de salvamento; preparar os componentes para o redesign incremental.

Inspecione instruções do repositório, branch, working tree, dependências,
componentes, estilos globais e o build local. Preserve alterações existentes.
Confira o código atual: relatórios F7 não substituem observação direta.

1. Reproduza as quatro telas e registre achados com viewport e componente.
   Diferencie causa confirmada de hipótese. Não trate o tema escuro em si
   como defeito. Inspecione estilos computados dos controles desalinhados.
2. Reutilize a biblioteca de componentes existente. Defina tokens semânticos
   e padronize botões, inputs, selects, rótulos, espaçamento, foco e estados.
   Corrija metadados sobrepostos com layout responsivo e textos extensos.
3. Mapeie o contrato de autosave do conteúdo e metadados. Só então ajuste
   “Salvo”, “Salvar” e “Cancelar”. Não prometa desfazer o que já persistiu.
   Erros e conflitos continuam visíveis e recuperáveis.
4. Padronize o rótulo “Página” para documentos e “Bloco” para unidades do
   editor, sem renomear banco/API como efeito colateral.
5. Preserve autenticação, isolamento, IDs, JSON, headings 1–6, anexos,
   updatedAt/CAS, URLs, histórico, proteção de saída, versões e exportação.
   Não reescreva backend/editor nem acrescente dependências sem necessidade.
6. Verifique navegador em 320/375/768/1024/1440 px, zoom 200%, teclado,
   foco e nomes longos. Execute os checks pertinentes do projeto e as
   regressões afetadas. Registre o que foi observado e o que não foi testado.
7. Entregue UX-01.md com achados, arquivos alterados, antes/depois,
   verificações e backlog UX-02/03/04. Não declare WCAG completa pela
   aparência, por screenshots ou por uma ferramenta automatizada isolada.

Execute as correções locais autorizadas sem pedir confirmação para escolhas
rotineiras. Não faça deploy, push ou mutação de produção. Termine a UX-01
antes de implementar todas as etapas seguintes de uma vez.
```

## 12. Limites da prévia e fontes

A prévia interativa desta conversa demonstra a distribuição de navegação, documento, materiais, propriedades, menu de página e coleção. Usa conteúdo fictício e estado local; não está conectada ao projeto e não simula persistência real. Não substitui Tiptap, APIs ou testes da aplicação. No espaço reduzido da prévia, o painel se reorganiza em fluxo vertical; o comportamento final sobreposto deve ser implementado e validado no produto conforme a largura disponível.

Verificação da prévia: sintaxe JavaScript e referências estáticas de elementos/controles conferidas. A tentativa de inspeção automatizada no Chromium foi impedida por restrição de execução do ambiente; portanto, não se declara validação visual em navegador, responsividade comprovada ou acessibilidade completa desta prévia. Os critérios acima são requisitos de implementação e aceite do produto.

Capturas analisadas: início, escolha de status em Idiomas, coleção Estudando e editor com painéis permanentes. Arquivos fornecidos: `image(7).png`, `image(8).png`, `image(9).png`, `image(10).png`.

Fontes consultadas em 13/11/2026:

1. Jakob Nielsen, Nielsen Norman Group. [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/).
2. Jakob Nielsen, Nielsen Norman Group. [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/).
3. W3C WAI. [Understanding SC 1.4.13 — Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html).
4. W3C WAI. [Understanding SC 1.4.3 — Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
5. W3C WAI. [Understanding SC 2.5.8 — Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum).
6. W3C WAI-ARIA APG. [Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
