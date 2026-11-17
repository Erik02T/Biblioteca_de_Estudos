# 07. Fluxos e casos de uso

Todos os casos abaixo são PROPOSTOS. O proprietário autenticado é o ator principal.

## UC-001 — Organizar um assunto

Origem: EV-009–013, REP-01/03. Requisitos: RF-001–005, RF-014, RF-018.

1. Abrir Projetos e criar a página “Desenvolvimento web”.
2. A criação retorna um ID; o caminho e a árvore passam a apontar para a nova página.
3. Criar “Backend” dentro dela e “Terminal” dentro de Backend.
4. Acessar Terminal pelo link direto e pelo navegador voltar/avançar.
5. Mover Terminal para outra página permitida; todo o ramo mantém conteúdo, IDs e anexos.

Alternativas: pai não disponível → informar e manter rascunho; destino é descendente → rejeitar sem alterar a árvore; falha de rede → não mostrar criação/movimento como concluído.

## UC-002 — Produzir e consultar uma anotação

Origem: EV-002–008, EV-010, REP-04/06. Requisitos: RF-006–010, RF-012–014.

1. Escrever explicação; inserir título, checklist, código e referência à página de exercícios.
2. Inserir imagem/arquivo usando o sistema de anexos e visualizar o resultado no documento.
3. Converter um parágrafo em título e mover um bloco pelo menu.
4. Esperar confirmação do salvamento, recarregar e conferir o mesmo conteúdo.
5. Abrir a referência de exercícios e voltar à página original.

Alternativas: clipboard negado → informar; arquivo inválido → explicar motivo; JSON com bloco desconhecido → preservar payload e impedir regravação destrutiva; erro ao salvar → manter rascunho e opção de recuperação.

## UC-003 — Encontrar e acompanhar estudos

Origem: REP-03, WEB-03/04; proposta de produto USR-01. Requisitos: RF-015/016/018/022/023.

Pesquisar “Terminal” encontra a página mesmo fora dos 20 itens carregados. Favoritar cria um atalho. Na segunda entrega, alternar tabela/quadro preserva os mesmos IDs; mover um cartão entre Estudando e Estudado muda a propriedade da página. O progresso de estudo é informado pelo usuário; não se deduz de tempo aberto ou quantidade de palavras.

## UC-004 — Recuperar conteúdo

Origem: EV-002 como opção visual; REP-02 e necessidade proposta. Requisitos: RF-017/026.

Enviar uma página com filhas para a lixeira oculta o ramo das listagens ativas, mas mantém documentos e objetos. Restaurar recupera somente os itens excluídos naquele lote. Uma filha que já estava excluída antes continua excluída. Se o pai original não estiver ativo, restaurar como raiz da mesma seção, com aviso. A exclusão definitiva exige confirmação e tratamento de limpeza de arquivos.

Na segunda entrega, recuperar uma versão cria uma nova revisão atual, preservando a versão anterior. Conflito de revisão bloqueia a operação e mantém o rascunho local.

## UC-005 — Reaproveitar e transportar

Origem: USR-01, opção visual de duplicar/modelos; proposta. Requisitos: RF-019/024/025.

Duplicar uma página cria identidade e arquivos independentes; subpáginas só são copiadas se essa opção for escolhida. Aplicar modelo gera conteúdo editável novo. Exportar cria pacote com manifesto, JSON versionado, leitura em Markdown e arquivos; informa explicitamente formatos não representáveis em Markdown. Importar bases complexas do Notion não faz parte dessa entrega.

## UC-006 — Trocar de página durante uma alteração

Origem: REP-03/05. Requisitos: RF-005/014; RN-017.

O aplicativo identifica alterações pendentes de conteúdo e metadados antes da navegação. Se conseguir confirmar o salvamento, prossegue. Se falhar, preserva a cópia local e oferece permanecer ou recuperar o rascunho. Fechar o navegador pode interromper uma requisição; por isso a recuperação local deve ser testada, sem prometer persistência remota antes de uma resposta.
