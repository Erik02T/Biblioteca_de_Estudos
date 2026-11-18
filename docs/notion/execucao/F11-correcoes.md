# F11 — Correções e decisões verificadas

17/11/2026. Complementa a entrega e os testes da F11; os registros das fases anteriores permanecem históricos.

| Caso | Correção | Verificação |
|---|---|---|
| Consultas divergentes | Filtros/ordenação passaram à consulta canônica do servidor, antes da contagem/paginação; árvore e seletores receberam endpoint de metadados independente. | Integração com 125 páginas, layout compartilhando os mesmos IDs, segunda página e filtros combinados. |
| Visualização não salvava nome/configuração | CRUD nomeado conectado à interface; remoção do diálogo antigo que descartava o nome; contextos globais e validação de legado/nulos. | Criar/reabrir/atualizar/excluir, unicidade, configuração incompatível e valores inválidos. |
| Favorito gerava “recente” | Favorito deixou de gravar abertura. Visitas usam `AreaOpening`, preservando o trigger monotônico de revisão. | Abrir duas vezes não muda `updatedAt`; leitura auxiliar/favorito não cria visita e CAS continua funcionando. |
| Favorito concorria com edição da própria linha | Fila por ID e cadeia das revisões próprias confirmadas, guardando somente timestamps. Escritas externas continuam produzindo conflito real. | Teste frontend e navegador: título digitado → favorito → salvar; conflito externo conserva o rascunho. |
| Modelo copiava apenas JSON | Snapshot próprio de propriedades e mídia, manifesto com hash, remapeamento de anexos/capa/blocos, idempotência na aplicação e compensação. | Duas aplicações com objetos distintos, origem removida, recarga da cópia, legado e falha de storage. |
| Galeria fechava em falha | Aplicação assíncrona mantém diálogo, destino, seleção e chave da tentativa. | Falha 503 induzida seguida de repetição bem-sucedida. |
| Criação pela página enviava corpo sem tipo JSON | Cabeçalho `Content-Type` explícito na captura do modelo. | Defeito encontrado no navegador; regressão de unidade confere cabeçalho/checkpoint e o roteiro completo passou depois da correção. |
| Limpeza de modelo interrompida | Tombstone conserva o manifesto até a remoção física terminar; nova aplicação é bloqueada, e DELETE pode ser repetido. | Falha induzida, repetição e arquivo da página de origem preservado. |
| Ordem manual ignorava direção | Consulta honra ascendente/descendente com desempate por ID; reordenação interativa fica no recorte ascendente. | Integração e seis verificações finais de navegador, com manutenção da segunda página ao trocar layout. |
| Índice global incompatível com PostgreSQL | O primeiro ensaio em fixtures rejeitou cast de enum em expressão de índice. Foram usados índices parciais para contextos nulos, e a migração foi encapsulada em transação. | Histórico da tentativa de fixtures reconciliado; migração corrigida aprovada em fixtures, clone restaurado e banco habitual. |

Durante a automação, seletores de rótulos foram corrigidos para nomes acessíveis de comboboxes, a busca passou a aguardar a resposta da segunda página e o roteiro abriu a navegação recolhida do editor. Esses ajustes corrigem a sincronização dos testes. Rodadas exploratórias consumiram o limite da API; reiniciaram-se apenas os serviços de fixtures.

O build isolado teve uma tentativa sem acesso ao download das fontes já usadas pelo projeto; o build posterior concluiu normalmente. A geração local do Prisma encontrou DLL em uso; os tipos foram atualizados mantendo o engine existente, e as integrações reais e o smoke somente de leitura confirmaram o funcionamento do cliente. Não foi necessário interromper servidores habituais nem alterar dependências.

O runner final teve sua resolução do executável do ESLint ajustada aos exports do pacote. As duas suítes backend já concluídas foram aproveitadas pelos logs identificados em `fromCompletedLog`; lint, build e suítes frontend concluíram depois. O comando padrão do runner executa todas as verificações.

O upgrade local preservou hashes das tabelas anteriores e de 22 objetos após restauração em clone e aplicação da migração. Evidência pública resumida em `output/playwright/F11-local-upgrade-resultados.json`; backups privados em `.f8-artifacts/f11-upgrade-20261116190356/`.
