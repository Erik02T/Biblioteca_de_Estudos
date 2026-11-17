# UX-02 — Ajustes e correções

15/11/2026. Mesma referência de árvore local de [UX-02.md](UX-02.md). Escopo APLICAR; problemas tratados durante a implementação, sem reabrir falhas resolvidas da UX-01.

| ID | Tipo / prioridade | Evidência e causa | Solução e verificação |
|---|---|---|---|
| UX02-001 | Fluxo, P1 | `SectionView` obrigava escolher status antes da coleção. Efeito de carregamento exigia seção + status. | Coleção abre com status opcional; filtros geram URLs compatíveis. Navegador e integração real: VERIFICADO. |
| UX02-002 | Funcional, P1 | Controles de escopo, filtro e ordenação alteravam estado, mas a consulta/renderização não o consumia. | Pipeline de coleção filtra/ordena antes da paginação. Toda a paginação HTTP é percorrida; testes de duas respostas e 20+5 itens: VERIFICADO. |
| UX02-003 | Navegação, P1 | Lateral exclusiva do editor; início/coleções trocavam o contexto visual. | Componente compartilhado com seleção, links, árvore real e checkpoints. Persistência na troca de área: VERIFICADO por novo GET. |
| UX02-004 | Interação, P1 | Cartões exibiam todas as ações e permitiam arrastar sob qualquer ordenação. | Expansor nativo com teclado/Escape; ordem manual explícita e nova leitura após mover. Reordenação real: VERIFICADO. |
| UX02-005 | Responsividade, P1 | Primeira versão compartilhada ocupava grande parte da tela móvel com todos os destinos. Captura intermediária/matriz durante implementação. | Navegação recolhível abaixo de 1200 px. Medidas nas cinco larguras e zoom nativo 200%: VERIFICADO. |
| UX02-006 | Recuperação, P1 | Busca/lixeira convertiam falhas em arrays vazios; busca no editor podia propagar Escape para a saída. | Estados separados de erro/carregamento, tentativa novamente, Escape consumido e foco restaurado. Regressão Jest/execução da busca: VERIFICADO; falha de coleção controlada também passou. |
| UX02-007 | Continuidade, P1 | Estado da coleção não era representado na URL; retorno do editor reconstruía apenas seção/status. | Serialização validada e preservação da rota de origem, incluindo filtro/página/layout. Recarga, Voltar/Avançar e retorno do editor: VERIFICADO. |

A validação inicial do script de navegador teve dois problemas de fixture/sincronização: o item esperado estava na segunda página por empate de data e a asserção de busca não aguardava o resultado filtrado. Foram ajustados timestamp da fixture e espera pelo estado observável; nenhum critério do produto foi relaxado. Houve também erro de tipagem `exact` nos novos testes, corrigido antes do build final.

Sem defeito funcional confirmado aberto nos critérios centrais da UX-02. Limites de homologação e custo da agregação constam de UX-02-testes.md e UX-02.md. UX-03 não iniciada.
