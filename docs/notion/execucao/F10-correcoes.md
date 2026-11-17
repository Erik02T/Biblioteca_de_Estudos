# F10 — Correções verificadas

16/11/2026. Correções incrementais sobre a working tree existente.

| ID | Causa e correção | Evidência |
|---|---|---|
| BUG-F10-001 — Duplicação e identidade | `Node.toJSON()` compartilha os objetos de atributos do nó imutável. Renovar IDs sem clonar poderia alterar o original. A duplicação faz cópia profunda antes de renovar identidades recursivamente. | Testes de IDs distintos, documento original preservado, duplicação de subárvore e undo. |
| BUG-F10-002 — Cabeçalhos de recursos | Espalhar `Headers` perdia campos; normalizar para minúsculas e acrescentar `Authorization` podia criar dois valores Bearer. O cliente normaliza `HeadersInit`, remove a autorização anterior e acrescenta exatamente uma autorização atual. | Três regressões e busca/upload reais sem 401 no ensaio final. |
| BUG-F10-003 — Contexto de listas | Operações tratavam a lista inteira como alvo único; substituir o primeiro parágrafo por código violaria o schema. O alvo lógico passa a ser o item e a inserção preserva o parágrafo obrigatório, com transação validada. | Movimento entre listas, tarefas marcadas/filhos, slash/+ e recarga de código aninhado. |
| BUG-F10-004 — Foco de grupo | Chromium pode colapsar a seleção de `details` ao devolver foco de um menu. O alvo explícito do grupo é conservado por ID, destacado e reaplicado antes da próxima operação; interação real com texto ou arraste limpa esse alvo. Duplicação identifica o novo alvo pela transação. | Regressão real do build final: grupo continua sendo o alvo, undo conserva o original e clique posterior permite editar a tarefa. |
| BUG-F10-005 — Saída e cópia de código | Seleção em limite de contêiner podia ser inválida ao sair de código aninhado; clipboard negado precisava selecionar o intervalo real do editor. Escape usa seleção próxima em parágrafo válido, e a cópia manual usa TextSelection do conteúdo do código. | DOM keydown em editor real, regressão de navegador e teste de clipboard negado. |
| BUG-F10-006 — Formatação destrutiva | O painel antigo podia usar conversões genéricas que achatavam estruturas. Os comandos de tipo passam pela verificação de compatibilidade; limpar formatação remove marcas sem desmontar grupos, tarefas ou mídia. | Testes de conversão recusada, preservação de atributos e documento misto reaberto. |
| BUG-F10-007 — Retorno de seletores modais | Devolver foco somente ao elemento HTML podia reutilizar a seleção nativa anterior. O seletor fecha o diálogo antes de devolver foco pela instância do editor; os nós de recursos permitem a observação de alterações de seleção. | Testes de seletor, cancelamento e documento misto no navegador; limites do posicionamento automatizado descritos em F10-testes.md. |

O build inicialmente falhou ao baixar as fontes existentes do Google dentro da rede restrita. Repetido com acesso de rede, passou sem trocar a tipografia. A dependência UUID ESM da extensão oficial recebe transformação no Jest; não foi substituída por mock nem foram desabilitados testes.

Durante elaboração dos roteiros, seletores foram corrigidos para o HTML real dos itens, versões com nomes exclusivos e nós vazios ainda sem dimensões. Restauração retorna à coleção no fluxo existente: o ensaio reabre a mesma página por ID. Essas correções de roteiro não foram apresentadas como defeitos do produto.

Limites e pendências estão em [F10-testes.md](F10-testes.md). IME físico não foi substituído por eventos sintéticos.
