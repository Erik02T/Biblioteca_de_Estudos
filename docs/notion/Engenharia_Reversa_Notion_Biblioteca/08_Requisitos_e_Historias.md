# 08. Requisitos funcionais, não funcionais e histórias

Todos os RF são **PROPOSTOS para a Biblioteca**, sujeitos à validação de escopo. Fontes observadas justificam origem, não aprovação. P0 integra o MVP; P1 integra a versão completa simplificada. Ator comum: proprietário autenticado. Confiança nas propostas: média, porque dependem de ensaio técnico e validação de produto. Dependências descrevem relações de entrega; trabalhos acoplados podem ser construídos na mesma fase.

## Catálogo funcional

### RF-001 — Preservar a biblioteca existente

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** REP-01/03/09; USR-01.
- **Dependências:** —.
- **Pré-condição:** uma cópia representativa do banco atual esteja disponível.
- **Comportamento:** evoluir o modelo sem substituir IDs ou conteúdo.
- **Resultado esperado:** IDs, proprietário, seções, status, categoria, entendimento, conteúdo e anexos continuam acessíveis; páginas legadas entram como raízes; o resultado é reconciliado por contagens e amostras de conteúdo.
- **HU-001:** Como proprietário da biblioteca, quero evoluir o modelo sem substituir IDs ou conteúdo para continuar usando tudo que já organizei.
- **Aceitação:** Dado que uma cópia representativa do banco atual esteja disponível, quando eu executar essa ação, então IDs, proprietário, seções, status, categoria, entendimento, conteúdo e anexos continuam acessíveis; páginas legadas entram como raízes; o resultado é reconciliado por contagens e amostras de conteúdo.
- **Verificação CT-001:** Migrar uma cópia com conteúdo legado, Tiptap, caracteres japoneses e anexos; comparar antes/depois e testar restauração do backup.

### RF-002 — Criar e editar páginas persistidas

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** EV-013/017; REP-03/09.
- **Dependências:** RF-001.
- **Pré-condição:** o usuário esteja em uma seção ou página própria ativa.
- **Comportamento:** criar página e editar título/categoria.
- **Resultado esperado:** um único ID é retornado mesmo após repetição da tentativa; rascunho pode usar “Sem título” e categoria “Geral” como defaults propostos; títulos iguais são permitidos; erro mantém texto digitado.
- **HU-002:** Como proprietário da biblioteca, quero criar página e editar título/categoria para registrar uma ideia antes de preencher todos os detalhes.
- **Aceitação:** Dado que o usuário esteja em uma seção ou página própria ativa, quando eu executar essa ação, então um único ID é retornado mesmo após repetição da tentativa; rascunho pode usar “Sem título” e categoria “Geral” como defaults propostos; títulos iguais são permitidos; erro mantém texto digitado.
- **Verificação CT-002:** Simular resposta perdida e repetição da criação: existe uma página, não duas; reabrir por ID e conferir metadados.

### RF-003 — Organizar páginas em árvore

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** EV-009/011; WEB-02.
- **Dependências:** RF-001, RF-002.
- **Pré-condição:** existam páginas próprias ativas.
- **Comportamento:** criar subpágina e expandir sua página mãe.
- **Resultado esperado:** a filha aparece uma vez sob o pai e também na seção correta; expansão não exige baixar todos os documentos completos; a estrutura permanece após recarga.
- **HU-003:** Como proprietário da biblioteca, quero criar subpágina e expandir sua página mãe para dividir assuntos em unidades menores.
- **Aceitação:** Dado que existam páginas próprias ativas, quando eu executar essa ação, então a filha aparece uma vez sob o pai e também na seção correta; expansão não exige baixar todos os documentos completos; a estrutura permanece após recarga.
- **Verificação CT-003:** Criar três níveis, recarregar e conferir parentesco; bloquear pai de outra conta e pai excluído.

### RF-004 — Mover páginas e ramos

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** EV-002 como opção; WEB-02; PROPOSTO.
- **Dependências:** RF-003, RF-014.
- **Pré-condição:** origem e destino estejam ativos e pertençam ao mesmo usuário.
- **Comportamento:** usar “Mover para…” ou promover a página a raiz.
- **Resultado esperado:** o ramo é movido atomicamente; ciclos são rejeitados inclusive em operações concorrentes; mudança de seção atualiza o ramo; status de estudo das filhas permanece independente.
- **HU-004:** Como proprietário da biblioteca, quero usar “Mover para…” ou promover a página a raiz para reorganizar o aprendizado sem recriar conteúdo.
- **Aceitação:** Dado que origem e destino estejam ativos e pertençam ao mesmo usuário, quando eu executar essa ação, então o ramo é movido atomicamente; ciclos são rejeitados inclusive em operações concorrentes; mudança de seção atualiza o ramo; status de estudo das filhas permanece independente.
- **Verificação CT-004:** Tentar A dentro de B e B dentro de A simultaneamente; ao fim não há ciclo nem ramo parcial.

### RF-005 — Navegar por URL, árvore e caminho

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** EV-009–012; REP-03.
- **Dependências:** RF-002, RF-003, RF-014.
- **Pré-condição:** uma página exista e seja acessível.
- **Comportamento:** abrir link direto, navegar pela árvore ou usar voltar/avançar.
- **Resultado esperado:** URL identifica a página; caminho reflete ancestrais; seleção acompanha a navegação; saída não abandona silenciosamente alterações pendentes; página indisponível mostra estado apropriado.
- **HU-005:** Como proprietário da biblioteca, quero abrir link direto, navegar pela árvore ou usar voltar/avançar para retomar qualquer anotação rapidamente.
- **Aceitação:** Dado que uma página exista e seja acessível, quando eu executar essa ação, então URL identifica a página; caminho reflete ancestrais; seleção acompanha a navegação; saída não abandona silenciosamente alterações pendentes; página indisponível mostra estado apropriado.
- **Verificação CT-005:** Abrir URL em nova aba, atualizar, voltar/avançar e trocar com rede interrompida e texto pendente.

### RF-006 — Editar conteúdo essencial por blocos

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** EV-003/007; REP-04.
- **Dependências:** RF-001, RF-002, RF-014.
- **Pré-condição:** o documento esteja carregado em formato suportado.
- **Comportamento:** inserir e editar parágrafo, títulos, listas, citação, divisor e formatação.
- **Resultado esperado:** persistem texto, negrito, itálico, riscado, links permitidos, destaques e cores aprovadas; headings 1–6 legados são preservados; undo/redo funciona na sessão; colagem não executa HTML ativo.
- **HU-006:** Como proprietário da biblioteca, quero inserir e editar parágrafo, títulos, listas, citação, divisor e formatação para escrever material de estudo claro.
- **Aceitação:** Dado que o documento esteja carregado em formato suportado, quando eu executar essa ação, então persistem texto, negrito, itálico, riscado, links permitidos, destaques e cores aprovadas; headings 1–6 legados são preservados; undo/redo funciona na sessão; colagem não executa HTML ativo.
- **Verificação CT-006:** Editar fixture com listas, títulos e japonês, colar HTML com script e recarregar; conteúdo permitido preservado e script não executado.

### RF-007 — Inserir pelo menu de comandos

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** WEB-01; CMP-07; PROPOSTO.
- **Dependências:** RF-006.
- **Pré-condição:** o cursor esteja no contexto elegível do editor e fora de composição de texto.
- **Comportamento:** digitar / ou usar o botão +.
- **Resultado esperado:** menu lista somente tipos suportados, filtra consulta, aceita setas/Enter/Esc; busca global não intercepta o / no editor; texto comum e composição japonesa permanecem corretos.
- **HU-007:** Como proprietário da biblioteca, quero digitar / ou usar o botão + para adicionar conteúdo sem memorizar botões.
- **Aceitação:** Dado que o cursor esteja no contexto elegível do editor e fora de composição de texto, quando eu executar essa ação, então menu lista somente tipos suportados, filtra consulta, aceita setas/Enter/Esc; busca global não intercepta o / no editor; texto comum e composição japonesa permanecem corretos.
- **Verificação CT-007:** Usar / em parágrafo, código, texto selecionado e composição IME; verificar comando apenas onde previsto e alternativa por clique.

### RF-008 — Operar blocos por menu

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** EV-002–006.
- **Dependências:** RF-006, RF-007.
- **Pré-condição:** um bloco editável esteja selecionado.
- **Comportamento:** converter, duplicar, mover acima/abaixo ou remover pelo menu.
- **Resultado esperado:** operações preservam conteúdo compatível e seleção; conversão que perde dados é impedida ou exige escolha explícita; remoção pode ser desfeita na sessão; IDs novos na duplicação.
- **HU-008:** Como proprietário da biblioteca, quero converter, duplicar, mover acima/abaixo ou remover pelo menu para reestruturar explicações com controle.
- **Aceitação:** Dado que um bloco editável esteja selecionado, quando eu executar essa ação, então operações preservam conteúdo compatível e seleção; conversão que perde dados é impedida ou exige escolha explícita; remoção pode ser desfeita na sessão; IDs novos na duplicação.
- **Verificação CT-008:** Mover bloco entre listas, duplicar e desfazer; tentar converter mídia ou referência sem perder seus dados silenciosamente.

### RF-009 — Usar listas de tarefas

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** EV-003 como opção; USR-01.
- **Dependências:** RF-006.
- **Pré-condição:** uma página própria esteja em edição.
- **Comportamento:** inserir checklist e marcar/desmarcar itens.
- **Resultado esperado:** texto, ordem e marcação permanecem após recarga; marcar tarefa não altera automaticamente o status de estudo da página.
- **HU-009:** Como proprietário da biblioteca, quero inserir checklist e marcar/desmarcar itens para acompanhar exercícios e revisões.
- **Aceitação:** Dado que uma página própria esteja em edição, quando eu executar essa ação, então texto, ordem e marcação permanecem após recarga; marcar tarefa não altera automaticamente o status de estudo da página.
- **Verificação CT-009:** Marcar uma tarefa, editar seu texto, salvar e recarregar; metadados da página não mudam.

### RF-010 — Usar blocos de código

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** EV-007/008; REP-04.
- **Dependências:** RF-006.
- **Pré-condição:** um bloco de código exista.
- **Comportamento:** selecionar linguagem suportada e copiar conteúdo.
- **Resultado esperado:** texto preserva espaços, quebras e caracteres; linguagem é metadado salvo; clipboard tem feedback; linguagem desconhecida aparece como texto simples; código nunca é executado.
- **HU-010:** Como proprietário da biblioteca, quero selecionar linguagem suportada e copiar conteúdo para guardar comandos e exemplos reutilizáveis.
- **Aceitação:** Dado que um bloco de código exista, quando eu executar essa ação, então texto preserva espaços, quebras e caracteres; linguagem é metadado salvo; clipboard tem feedback; linguagem desconhecida aparece como texto simples; código nunca é executado.
- **Verificação CT-010:** Copiar texto com indentação e comparar bytes; negar clipboard, recarregar linguagem e verificar fallback de linguagem antiga.

### RF-011 — Personalizar cabeçalho e largura

- **Prioridade/classificação:** P1; PROPOSTO.
- **Origem:** EV-001/005/020/021.
- **Dependências:** RF-002, RF-012, RF-014.
- **Pré-condição:** a página esteja ativa.
- **Comportamento:** escolher/remover ícone, capa e posição de recorte; alternar largura de leitura.
- **Resultado esperado:** cabeçalho persiste; remover capa não remove conteúdo; mídia tem vínculo estável; preview e árvore refletem ícone; sem capa o layout continua íntegro.
- **HU-011:** Como proprietário da biblioteca, quero escolher/remover ícone, capa e posição de recorte; alternar largura de leitura para identificar visualmente cada área de estudo.
- **Aceitação:** Dado que a página esteja ativa, quando eu executar essa ação, então cabeçalho persiste; remover capa não remove conteúdo; mídia tem vínculo estável; preview e árvore refletem ícone; sem capa o layout continua íntegro.
- **Verificação CT-011:** Enviar capa, mudar recorte e recarregar; remover só a capa; simular falha no upload e verificar ausência de alteração parcial.

### RF-012 — Anexar materiais e inseri-los no corpo

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** REP-06; USR-01.
- **Dependências:** RF-002, RF-006.
- **Pré-condição:** a página já tenha ID e storage configurado.
- **Comportamento:** anexar link, imagem ou arquivo e opcionalmente inserir referência no conteúdo.
- **Resultado esperado:** painel atual permanece utilizável; bloco aponta para attachmentId; restrições de tamanho/tipo são explicadas; URL temporária expirada pode ser renovada; excluir referência do corpo não destrói arquivo automaticamente.
- **HU-012:** Como proprietário da biblioteca, quero anexar link, imagem ou arquivo e opcionalmente inserir referência no conteúdo para manter fonte e anotação juntas.
- **Aceitação:** Dado que a página já tenha ID e storage configurado, quando eu executar essa ação, então painel atual permanece utilizável; bloco aponta para attachmentId; restrições de tamanho/tipo são explicadas; URL temporária expirada pode ser renovada; excluir referência do corpo não destrói arquivo automaticamente.
- **Verificação CT-012:** Fazer upload válido/inválido, simular falha de registro e URL expirada; remover apenas o bloco inline e confirmar que anexo continua no painel.

### RF-013 — Relacionar páginas por referência interna

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** EV-002/010/011.
- **Dependências:** RF-003, RF-006, RF-015.
- **Pré-condição:** existam páginas próprias ativas.
- **Comportamento:** inserir referência pesquisando uma página e ativá-la.
- **Resultado esperado:** documento salva targetPageId; renomear o destino atualiza rótulo na leitura; destino excluído/indisponível tem estado claro sem vazar dados de outra conta.
- **HU-013:** Como proprietário da biblioteca, quero inserir referência pesquisando uma página e ativá-la para conectar teoria, exemplos e exercícios.
- **Aceitação:** Dado que existam páginas próprias ativas, quando eu executar essa ação, então documento salva targetPageId; renomear o destino atualiza rótulo na leitura; destino excluído/indisponível tem estado claro sem vazar dados de outra conta.
- **Verificação CT-013:** Criar referência, renomear destino, mover e colocar na lixeira; link mantém identidade e mostra estado coerente.

### RF-014 — Salvar sem perda silenciosa

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** REP-05; USR-01.
- **Dependências:** RF-001.
- **Pré-condição:** página ou rascunho esteja em edição.
- **Comportamento:** alterar conteúdo/metadados, salvar ou navegar.
- **Resultado esperado:** fila por página mantém a última edição; resposta antiga não apaga edição nova; indicação “Salvo” cobre conteúdo e metadados; revisão divergente bloqueia sobrescrita; erro conserva rascunho recuperável segregado por conta.
- **HU-014:** Como proprietário da biblioteca, quero alterar conteúdo/metadados, salvar ou navegar para confiar que minhas anotações foram guardadas.
- **Aceitação:** Dado que página ou rascunho esteja em edição, quando eu executar essa ação, então fila por página mantém a última edição; resposta antiga não apaga edição nova; indicação “Salvo” cobre conteúdo e metadados; revisão divergente bloqueia sobrescrita; erro conserva rascunho recuperável segregado por conta.
- **Verificação CT-014:** Editar em duas abas, atrasar respostas, interromper rede e recarregar; nenhum conflito é resolvido por sobrescrita automática e rascunho não migra entre contas.

### RF-015 — Pesquisar toda a biblioteca

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** REP-03; EV-022 como entrada; PROPOSTO.
- **Dependências:** RF-002, RF-006.
- **Pré-condição:** existam páginas em seções e páginas de listagem diferentes.
- **Comportamento:** buscar título, categoria ou texto da anotação.
- **Resultado esperado:** resultado vem do conjunto autorizado no servidor, omite lixeira, tem contexto e paginação; estados vazio/erro são distintos; busca não se limita aos registros já carregados.
- **HU-015:** Como proprietário da biblioteca, quero buscar título, categoria ou texto da anotação para encontrar um assunto mesmo sem lembrar onde o guardei.
- **Aceitação:** Dado que existam páginas em seções e páginas de listagem diferentes, quando eu executar essa ação, então resultado vem do conjunto autorizado no servidor, omite lixeira, tem contexto e paginação; estados vazio/erro são distintos; busca não se limita aos registros já carregados.
- **Verificação CT-015:** Criar resultado fora dos 20 primeiros itens e em outra seção; buscar trecho do corpo e verificar isolamento entre contas e lixeira.

### RF-016 — Favoritar e retomar páginas

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** EV-002/016/022; PROPOSTO.
- **Dependências:** RF-002, RF-005.
- **Pré-condição:** uma página própria esteja ativa.
- **Comportamento:** favoritar/desfavoritar e abri-la em recentes.
- **Resultado esperado:** favorito persiste sem duplicar página; recentes refletem abertura; páginas excluídas saem das listas ativas; renomear atualiza rótulos.
- **HU-016:** Como proprietário da biblioteca, quero favoritar/desfavoritar e abri-la em recentes para voltar aos materiais usados com frequência.
- **Aceitação:** Dado que uma página própria esteja ativa, quando eu executar essa ação, então favorito persiste sem duplicar página; recentes refletem abertura; páginas excluídas saem das listas ativas; renomear atualiza rótulos.
- **Verificação CT-016:** Favoritar, reabrir, renomear, enviar à lixeira e restaurar; listas apontam para o mesmo ID.

### RF-017 — Excluir com lixeira e restaurar

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** EV-002 como opção; REP-02; PROPOSTO.
- **Dependências:** RF-003, RF-004, RF-014.
- **Pré-condição:** uma página própria ou ramo esteja ativo.
- **Comportamento:** enviar à lixeira, restaurar ou solicitar exclusão definitiva.
- **Resultado esperado:** lixeira preserva conteúdo/anexos, oculta ramo das consultas ativas e registra lote; restaurar não ressuscita exclusões anteriores; purge exige confirmação e reporta falha de limpeza.
- **HU-017:** Como proprietário da biblioteca, quero enviar à lixeira, restaurar ou solicitar exclusão definitiva para corrigir exclusões acidentais.
- **Aceitação:** Dado que uma página própria ou ramo esteja ativo, quando eu executar essa ação, então lixeira preserva conteúdo/anexos, oculta ramo das consultas ativas e registra lote; restaurar não ressuscita exclusões anteriores; purge exige confirmação e reporta falha de limpeza.
- **Verificação CT-017:** Excluir filha antes do pai, restaurar pai e conferir filha ainda excluída; simular falha no storage durante purge e verificar recuperação operacional.

### RF-018 — Preservar propriedades de estudo

- **Prioridade/classificação:** P0; PROPOSTO.
- **Origem:** REP-01/09; USR-01.
- **Dependências:** RF-001, RF-014.
- **Pré-condição:** uma página própria esteja ativa.
- **Comportamento:** editar categoria, Estudando/Estudado e nível 0–5.
- **Resultado esperado:** valores são validados pelo servidor; filtros refletem a alteração; estudar uma filha não conclui o pai; campo vazio ou inválido não é aceito silenciosamente.
- **HU-018:** Como proprietário da biblioteca, quero editar categoria, Estudando/Estudado e nível 0–5 para acompanhar meu entendimento de cada assunto.
- **Aceitação:** Dado que uma página própria esteja ativa, quando eu executar essa ação, então valores são validados pelo servidor; filtros refletem a alteração; estudar uma filha não conclui o pai; campo vazio ou inválido não é aceito silenciosamente.
- **Verificação CT-018:** Alterar nível nos limites e fora deles, mover ramo e conferir status independentes e categoria preservada.

### RF-019 — Duplicar páginas de forma independente

- **Prioridade/classificação:** P1; PROPOSTO.
- **Origem:** EV-002 como opção; PROPOSTO.
- **Dependências:** RF-003, RF-012, RF-014.
- **Pré-condição:** uma página ou ramo próprio esteja ativo.
- **Comportamento:** duplicar escolhendo incluir ou não subpáginas.
- **Resultado esperado:** novos IDs e objetos de arquivo independentes; referências internas ao ramo são remapeadas quando o ramo é copiado; falha não publica cópia incompleta como pronta.
- **HU-019:** Como proprietário da biblioteca, quero duplicar escolhendo incluir ou não subpáginas para reaproveitar um material sem alterar o original.
- **Aceitação:** Dado que uma página ou ramo próprio esteja ativo, quando eu executar essa ação, então novos IDs e objetos de arquivo independentes; referências internas ao ramo são remapeadas quando o ramo é copiado; falha não publica cópia incompleta como pronta.
- **Verificação CT-019:** Duplicar ramo com imagem e referência interna; editar/excluir original; cópia permanece íntegra e links internos apontam para a cópia.

### RF-020 — Adicionar alternantes e destaques

- **Prioridade/classificação:** P1; PROPOSTO.
- **Origem:** EV-003 como opções; PROPOSTO.
- **Dependências:** RF-006, RF-008.
- **Pré-condição:** uma página esteja em edição.
- **Comportamento:** inserir seção recolhível ou bloco de destaque.
- **Resultado esperado:** conteúdo interno continua editável e exportável; recolher não apaga texto; expandir funciona por teclado; estrutura obedece schema versionado.
- **HU-020:** Como proprietário da biblioteca, quero inserir seção recolhível ou bloco de destaque para separar explicações complementares e alertas.
- **Aceitação:** Dado que uma página esteja em edição, quando eu executar essa ação, então conteúdo interno continua editável e exportável; recolher não apaga texto; expandir funciona por teclado; estrutura obedece schema versionado.
- **Verificação CT-020:** Recolher texto com listas e código, salvar/reabrir/expandir; exportação inclui conteúdo recolhido.

### RF-021 — Reordenar arrastando com alternativa equivalente

- **Prioridade/classificação:** P1; PROPOSTO.
- **Origem:** WEB-01/02; EV-019 como opção; PROPOSTO.
- **Dependências:** RF-004, RF-008.
- **Pré-condição:** páginas/blocos tenham identidade e ordem estáveis.
- **Comportamento:** arrastar para uma posição válida.
- **Resultado esperado:** indicador de destino é visível; operação compartilha validações com menu; ordem persiste; teclado e clique sem arrastar produzem o mesmo resultado.
- **HU-021:** Como proprietário da biblioteca, quero arrastar para uma posição válida para reorganizar rapidamente quando estiver usando o mouse.
- **Aceitação:** Dado que páginas/blocos tenham identidade e ordem estáveis, quando eu executar essa ação, então indicador de destino é visível; operação compartilha validações com menu; ordem persiste; teclado e clique sem arrastar produzem o mesmo resultado.
- **Verificação CT-021:** Executar mesma mudança por drag, teclado e menu; comparar ordem final e rejeitar drop que forme ciclo.

### RF-022 — Ver estudos em tabela e quadro

- **Prioridade/classificação:** P1; PROPOSTO.
- **Origem:** WEB-03/04; PROPOSTO.
- **Dependências:** RF-015, RF-018.
- **Pré-condição:** existam páginas com propriedades de estudo.
- **Comportamento:** alternar lista/tabela/quadro e editar propriedade.
- **Resultado esperado:** cada linha/cartão representa a mesma Area; tabela usa nome, seção, categoria, status, entendimento e atualização; quadro agrupa por status; escopo de raízes/todas as páginas é explícito.
- **HU-022:** Como proprietário da biblioteca, quero alternar lista/tabela/quadro e editar propriedade para comparar e organizar meu estudo em uma visão geral.
- **Aceitação:** Dado que existam páginas com propriedades de estudo, quando eu executar essa ação, então cada linha/cartão representa a mesma Area; tabela usa nome, seção, categoria, status, entendimento e atualização; quadro agrupa por status; escopo de raízes/todas as páginas é explícito.
- **Verificação CT-022:** Alterar status no quadro e conferir página/tabela pelo mesmo ID; aplicar filtros com paginação sem cartões duplicados.

### RF-023 — Salvar filtros e ordenações

- **Prioridade/classificação:** P1; PROPOSTO.
- **Origem:** WEB-04; PROPOSTO.
- **Dependências:** RF-022.
- **Pré-condição:** uma coleção de estudo esteja aberta.
- **Comportamento:** definir e salvar visualização nomeada.
- **Resultado esperado:** persistem layout, filtros por campos permitidos, ordenação e escopo; trocar visualização não altera registros; configuração inválida informa fallback.
- **HU-023:** Como proprietário da biblioteca, quero definir e salvar visualização nomeada para reutilizar visões como Faculdade em andamento.
- **Aceitação:** Dado que uma coleção de estudo esteja aberta, quando eu executar essa ação, então persistem layout, filtros por campos permitidos, ordenação e escopo; trocar visualização não altera registros; configuração inválida informa fallback.
- **Verificação CT-023:** Salvar filtro, recarregar, trocar layout e conferir IDs/valores intactos; remover campo inválido de configuração antiga de modo explícito.

### RF-024 — Criar páginas a partir de modelos

- **Prioridade/classificação:** P1; PROPOSTO.
- **Origem:** EV-013 como entrada; USR-01; PROPOSTO.
- **Dependências:** RF-006, RF-012, RF-019.
- **Pré-condição:** um modelo próprio ou inicial válido esteja disponível.
- **Comportamento:** pré-visualizar e aplicar modelo de anotação, aula ou projeto.
- **Resultado esperado:** cria cópia editável com novo ID; não mantém sincronização com o modelo; anexos pertencem à nova página; aplicação em documento existente exige escolha explícita.
- **HU-024:** Como proprietário da biblioteca, quero pré-visualizar e aplicar modelo de anotação, aula ou projeto para começar uma anotação com uma estrutura útil.
- **Aceitação:** Dado que um modelo próprio ou inicial válido esteja disponível, quando eu executar essa ação, então cria cópia editável com novo ID; não mantém sincronização com o modelo; anexos pertencem à nova página; aplicação em documento existente exige escolha explícita.
- **Verificação CT-024:** Aplicar mesmo modelo duas vezes, editar uma cópia e confirmar independência; cancelar aplicação sem modificar página.

### RF-025 — Exportar biblioteca de forma portátil

- **Prioridade/classificação:** P1; PROPOSTO.
- **Origem:** USR-01; PROPOSTO.
- **Dependências:** RF-012, RF-013, RF-020.
- **Pré-condição:** páginas selecionadas pertençam ao usuário.
- **Comportamento:** exportar página/ramo com anexos.
- **Resultado esperado:** pacote inclui manifesto, JSON versionado, leitura em Markdown, hierarquia e arquivos; snapshot é consistente; nenhum segredo ou URL temporária substitui arquivo; limitações de conversão são listadas.
- **HU-025:** Como proprietário da biblioteca, quero exportar página/ramo com anexos para manter uma cópia utilizável fora da aplicação.
- **Aceitação:** Dado que páginas selecionadas pertençam ao usuário, quando eu executar essa ação, então pacote inclui manifesto, JSON versionado, leitura em Markdown, hierarquia e arquivos; snapshot é consistente; nenhum segredo ou URL temporária substitui arquivo; limitações de conversão são listadas.
- **Verificação CT-025:** Abrir pacote sem sessão da aplicação, validar hashes e referências relativas, conferir código/japonês/tarefas/alternantes; lixeira só entra se escolhida.

### RF-026 — Guardar e restaurar versões explícitas

- **Prioridade/classificação:** P1; PROPOSTO.
- **Origem:** USR-01; PROPOSTO.
- **Dependências:** RF-014, RF-017, RF-012.
- **Pré-condição:** uma página persistida esteja aberta.
- **Comportamento:** criar versão nomeada, pré-visualizar e restaurar.
- **Resultado esperado:** snapshot inclui conteúdo/metadados compatíveis e referências de anexos retidas; restaurar cria nova revisão e salva versão anterior; requer revisão atual; não reverte parentesco sem ação separada.
- **HU-026:** Como proprietário da biblioteca, quero criar versão nomeada, pré-visualizar e restaurar para recuperar uma explicação anterior sem perder a atual.
- **Aceitação:** Dado que uma página persistida esteja aberta, quando eu executar essa ação, então snapshot inclui conteúdo/metadados compatíveis e referências de anexos retidas; restaurar cria nova revisão e salva versão anterior; requer revisão atual; não reverte parentesco sem ação separada.
- **Verificação CT-026:** Salvar versão com imagem, editar, remover referência e restaurar; original atual fica recuperável; conflito em outra aba bloqueia restauração.

## Requisitos não funcionais

Todos são PROPOSTOS. Responsável pela validação: equipe implementadora; aceite de comportamento pelo proprietário do produto.

### RNF-001 — Acessibilidade

**Prioridade:** P0. **Origem:** WEB-06.

Fluxos principais operáveis por teclado, foco visível e não oculto; ações de arrastar também por clique sem arrastar. Validar contraste, nomes acessíveis, mensagens e reflow com meta WCAG 2.2 AA, sem alegar conformidade antes de auditoria.

**Aceitação/verificação:** Verificação manual de teclado/leitor de tela e auditoria automatizada; registrar falhas reais e corrigir as que bloqueiam o fluxo.

### RNF-002 — Integridade e recuperação

**Prioridade:** P0. **Origem:** REP-05; PROPOSTO.

Nenhuma confirmação de salvamento sem resposta válida; preservar rascunho em falha e rejeitar revisões antigas. Conteúdo novo não pode ser perdido por resposta fora de ordem.

**Aceitação/verificação:** Testes com latência, rede interrompida, duas abas e reinício; comparar conteúdo efetivo e revisão.

### RNF-003 — Proteção dos dados

**Prioridade:** P0. **Origem:** REP-02/06; WEB-07.

Cada leitura/escrita valida proprietário; conteúdo não executa scripts; URLs usam protocolos permitidos; arquivos privados não dependem de URL pública. Mapear controles aplicáveis do ASVS, sem declarar certificação.

**Aceitação/verificação:** Testar acesso cruzado, payloads HTML/URL perigosos, arquivos rejeitados e expiração de URL; revisar logs sem tokens/conteúdo integral.

### RNF-004 — Responsividade

**Prioridade:** P0. **Origem:** USR-01; PROPOSTO.

Navegação, edição e recuperação utilizáveis em tela estreita e desktop. Código/tabelas podem rolar internamente; menus não ficam fora da tela.

**Aceitação/verificação:** Validar a 1280×720 como referência e a 320 CSS px como cenário de reflow, com zoom e teclado; não atribuir esses layouts ao vídeo.

### RNF-005 — Desempenho com dados reais

**Prioridade:** P0. **Origem:** REP-02/09; PROPOSTO.

Listagem/árvore não transportam documentos completos sem necessidade. Busca e índice respeitam paginação. Metas de latência, quantidade de páginas e tamanho típico serão fixadas após baseline representativa.

**Aceitação/verificação:** Medir carregamento, digitação e busca em dados de amostra autorizados; comparar antes/depois; não inventar SLA ou prometer milhares de páginas sem medir.

### RNF-006 — Evolução compatível

**Prioridade:** P0. **Origem:** REP-01/04; PROPOSTO.

Documento possui schemaVersion; migração é aditiva e testável; leitores desconhecidos não apagam blocos novos. Mudança de editor não exige reescrever todas as páginas.

**Aceitação/verificação:** Round-trip de fixtures antigas/atuais/desconhecidas e ensaio de restauração; versão antiga deve recusar escrita em formato novo.

### RNF-007 — Diagnóstico operacional

**Prioridade:** P0. **Origem:** REP-08; PROPOSTO.

Erros têm código estável e identificador de requisição; distinguir falha de upload, conflito, validação e indisponibilidade. Registrar métricas operacionais sem texto privado.

**Aceitação/verificação:** Simular erro em cada etapa e verificar diagnóstico e ação de recuperação apresentados ao usuário.

### RNF-008 — Backup e restauração

**Prioridade:** P0. **Origem:** USR-01; PROPOSTO.

Antes de migrar, obter cópia consistente de banco e inventário/objetos de storage; restauração deve ser ensaiada. Retenção, RPO e RTO dependem do ambiente e ficam a definir.

**Aceitação/verificação:** Restaurar ambiente isolado e conferir IDs, referências e arquivos; backup de banco sem objetos não atende este requisito.

### RNF-009 — Manutenibilidade e validação

**Prioridade:** P0. **Origem:** REP-08.

Separar páginas/editor/anexos/busca; manter convenções existentes, DTOs e testes de comportamento. Consultar documentação local do Next indicada em AGENTS.md antes de código.

**Aceitação/verificação:** Executar lint, testes relevantes e build na implementação; adicionar E2E dos fluxos de persistência e navegação; não confundir existência de pipeline com execução aprovada.

### RNF-010 — Compatibilidade e entrada multilíngue

**Prioridade:** P0. **Origem:** REP-03/04; contexto de estudo.

Preservar Unicode, acentos e japonês; atalhos respeitam IME e campos editáveis. Matriz inicial de navegadores deve ser validada conforme o ambiente do usuário.

**Aceitação/verificação:** Testar composição japonesa, seleção/colagem, teclado e arrastar em Chromium e outro motor a definir; registrar versões efetivamente usadas.

## Critério de aceite conjunto

Um requisito só está concluído quando seu cenário nominal, a falha relevante e a persistência aplicável foram verificados. “Botão aparece”, “build passou” ou “funcionou antes de recarregar” não bastam para concluir um fluxo com dados. Aprovar esta especificação não significa que ela esteja implementada.
