# 02. Inventário de evidências e cobertura

## Método e limites

O vídeo foi decodificado localmente e examinado por quadros em ordem temporal: amostragem geral de seis em seis segundos e quadros adicionais nas transições. Os intervalos abaixo delimitam os quadros examinados; não medem a duração exata dos cliques. Menus abertos comprovam disponibilidade visual de opções, não o sucesso de cada ação. Não houve navegação interativa na conta nem inspeção de tráfego/DOM do Notion.

O arquivo contém áudio AAC. A faixa não foi transcrita nem usada como evidência verbal; a análise comportamental é visual. Não se afirma que o vídeo seja silencioso. Quadros intermediários podem conter ações rápidas não capturadas. Conteúdos privados incidentais não foram transcritos nem incorporados aos entregáveis; as capturas são apenas material de análise.

O texto anexado é a metodologia, não uma descrição funcional do Notion. A documentação oficial complementa lacunas e recebe fonte própria. O código foi lido estaticamente em um commit fixo; não foram executados app, testes ou migrações.

## Classificação

| Rótulo | Uso |
|---|---|
| OBSERVADO | Visto diretamente no vídeo, código ou texto de documentação; o tipo de fonte é sempre indicado |
| INFERIDO | Interpretação plausível que ainda precisa de confirmação |
| PROPOSTO | Decisão para a Biblioteca; não descreve obrigatoriamente o Notion |
| NÃO DETERMINADO | Sem evidência suficiente, inclusive resultado de ações apenas listadas |

Confiança alta significa leitura direta e clara do item especificado; média, contexto/transição parcial; baixa, indícios insuficientes. Confiança na identificação de um menu não se estende à sua persistência. Todos os requisitos da nova aplicação são **PROPOSTOS**, mesmo quando sua origem é uma observação.

## Fontes primárias

| ID | Material | Alcance e limitação |
|---|---|---|
| USR-01 | Solicitação desta conversa | Notion como referência, projeto existente como base; objetivo “simplificada, porém completa” |
| DOC-01 | Texto colado(20261110-135433).txt | Prompt de engenharia reversa, fases 0–13; determina planejar antes de implementar |
| VIDEO-01 | 2026-11-10 10-40-16.mp4 | 192,43 s; 1280×720; H.264, 30 fps; 148.297.906 bytes; navegador desktop, tema escuro |
| NTC-01 | Consultas pelo conector Notion: Biblioteca; Terminal | Sem resultados nessas consultas. Não comprova inexistência das páginas nem equivalência entre a conexão e o workspace gravado |
| REP-00 | Repositório e branches consultados em 10/11/2026 | main fixada no commit indicado; produção e alterações locais não examinadas |

[Repositório na revisão analisada](https://github.com/Erik02T/Biblioteca_de_Estudos/tree/ccecca35a828da4c19015ba51874da3cf09e10a1).

## Catálogo visual

| ID | Localização em VIDEO-01 | Descoberta e limite | Classe | Confiança | Dependência |
|---|---|---|---|---|---|
| EV-001 | 00:00–00:08 | Página Terminal com capa, ícone, título, texto, caminho superior e lateral | OBSERVADO | Alta | — |
| EV-002 | 00:10–00:12 | Menu da referência EX-Terminal; transformação, cor, ícone, favoritos, renomear, abrir, copiar link, duplicar, mover, lixeira e IA disponíveis visualmente | OBSERVADO | Alta | EV-001 |
| EV-003 | 00:14–00:18 | Submenu de tipos: texto, títulos 1–4, página, listas, tarefas, alternantes, código, citação, destaque, equação, sincronizado, títulos alternantes e 2–5 colunas | OBSERVADO | Alta | EV-002 |
| EV-004 | 00:20–00:26 | Submenu separa cor de texto e cor de fundo; há indicação de cor usada por último | OBSERVADO | Alta | EV-002 |
| EV-005 | 00:28–00:32 | Seletor de emoji/ícone aberto para a referência; filtro e categorias visíveis | OBSERVADO | Alta | EV-002 |
| EV-006 | 00:34–00:44 | Retorno à página e reabertura do menu; execução de duplicar/mover/excluir não comprovada | OBSERVADO | Alta para menu | EV-002 |
| EV-007 | 00:48–01:02 | Rolagem de texto longo com títulos, listas, separadores e caixas de código | OBSERVADO | Alta | EV-001 |
| EV-008 | 01:04–01:10 | Seletor de linguagem do código aberto; pesquisa, lista de linguagens e controle de copiar visíveis | OBSERVADO | Alta | EV-007 |
| EV-009 | 01:18–01:32 | Menus em cascata do caminho superior expõem vários níveis até EX-Terminal | OBSERVADO | Alta | EV-001 |
| EV-010 | 01:42–01:46 | Referência EX-Terminal precede transição por tela de carregamento e abertura da página com esse título | OBSERVADO | Alta para sequência; média para gesto exato | EV-002 |
| EV-011 | 01:46–01:58 | Página filha com texto, código inline, listas e blocos; árvore lateral expandida | OBSERVADO | Alta | EV-010 |
| EV-012 | 02:00–02:12 | Navegação entre outras páginas pela lateral; uma página contém material privado incidental, omitido | OBSERVADO | Alta | EV-011 |
| EV-013 | 02:14–02:16 | Página “Nova página” aberta, com título vazio/placeholder e sugestões de início | OBSERVADO | Alta | EV-012 |
| EV-014 | 02:18–02:20 | Menu da guia inicial: renomear, excluir guia e personalização da lateral | OBSERVADO | Alta | EV-013 |
| EV-015 | 02:22–02:24 | Tela de novo chat com campo de entrada; nenhum prompt/resposta executado na amostragem | OBSERVADO | Alta | — |
| EV-016 | 02:26 | Tela Biblioteca do Notion com abas e listagem de espaço de equipe | OBSERVADO | Alta | — |
| EV-017 | 02:28–02:34 | Retorno a página vazia; duas entradas “Nova página” ficam visíveis na lateral | OBSERVADO | Alta | EV-013 |
| EV-018 | 02:36–02:44 | Menu do workspace com opções de configurações, membros/conexões e troca de contexto | OBSERVADO | Média: menu parcial | — |
| EV-019 | 02:48–02:52 | Menu da seção particular oferece alternativas de ordenação, inclusive manual | OBSERVADO | Alta para opções | EV-017 |
| EV-020 | 02:58–03:04 | Controles de personalização precedem página com capa lunar e ícone de lua; seletor de ícones aberto | OBSERVADO | Alta para antes/depois; média para seleção exata | EV-013 |
| EV-021 | 03:06–03:12 | Capa/ícone continuam visíveis; campo de comentário aberto e vazio | OBSERVADO | Alta | EV-020 |
| EV-022 | 00:00–03:12 | Controles de compartilhar, favoritos, busca e sumário lateral aparecem; uso completo desses controles não demonstrado | OBSERVADO | Alta para presença | EV-001 |

## Evidência do projeto existente

Todos os caminhos abaixo são relativos ao repositório na revisão REP-00. Os intervalos indicam localização aproximada; o link é para o arquivo versionado completo.

| ID | Arquivo/local | Constatação estática | Confiança |
|---|---|---|---|
| REP-01 | backend/prisma/schema.prisma, modelos a partir da linha 28 | Quatro modelos: Area, Attachment, User, Session. Area não possui parentId, capa, lixeira ou modelo genérico de coleção | Alta |
| REP-02 | backend/src/areas/areas.service.ts, findAll/update/remove; areas.controller.ts | CRUD, paginação, ordenação por atualização/ID, ownership; DELETE apaga objetos e registro | Alta |
| REP-03 | frontend/src/app/page.tsx, Home/AreaForm, linhas 100–175 e 265–431 | Navegação por estado, filtro sobre áreas carregadas, sidebar do editor com item atual/índice | Alta |
| REP-04 | frontend/src/app/extensions.ts; page.tsx, retorno de AreaForm | StarterKit e Highlight; headings 1–6; painel ativo desabilita underline/link, embora exista componente alternativo com outros botões | Alta |
| REP-05 | serialized-save-queue.ts; page.tsx, linhas 265–325; areas.service.ts, linhas 75–118 | Serialização no cliente; autosave de conteúdo existente com atraso de 700 ms; conflito se updatedAt enviado; API aceita escrita sem essa precondição | Alta |
| REP-06 | backend/src/attachments/attachments.service.ts; page.tsx, uploadAttachment | Upload e metadados, URLs assinadas no retorno, compensação de upload; anexar exige Area já salva | Alta |
| REP-07 | frontend/package.json; backend/package.json | Dependências declaradas confirmam a stack do projeto, não a stack do Notion | Alta |
| REP-08 | .github/workflows/ci.yml; frontend/AGENTS.md | Pipeline declara lint/testes/build; guia local da versão de Next deve ser lido antes de implementar | Alta |
| REP-09 | create-area.dto.ts; update-area.dto.ts | Nome/categoria obrigatórios, nível 0–5, conteúdo como objeto com limite declarado de 50 MiB; não há validação completa de árvore do editor nesse DTO | Alta |

Não inferir testes aprovados a partir da existência dos arquivos. Também não presumir que um componente isolado seja o editor usado: o fluxo ativo está em AreaForm de page.tsx.

## Documentação oficial consultada

| ID | Fonte e localização | Informação aproveitada |
|---|---|---|
| WEB-01 | [Escrita e edição](https://www.notion.com/help/writing-and-editing-basics), menus/blocos | Confirma edição por blocos e comandos de inserção; complementa, sem substituir, o vídeo |
| WEB-02 | [Subpáginas](https://www.notion.com/help/create-a-subpage), criação/navegação | Documenta páginas aninhadas, lateral e caminho de navegação |
| WEB-03 | [Introdução a bases](https://www.notion.com/help/intro-to-databases), características | Itens são páginas com propriedades; essa capacidade não foi exercitada no vídeo |
| WEB-04 | [Visualizações, filtros e ordenação](https://www.notion.com/help/views-filters-and-sorts), configurações de visualização | Diferentes apresentações dos mesmos dados e ajustes por visualização |
| WEB-05 | [Personalizar página](https://www.notion.com/help/customize-your-page) | Consulta tentada sem conteúdo utilizável; não usada para sustentar requisitos. Capa/ícone vêm do vídeo |
| WEB-06 | [WCAG 2.2](https://www.w3.org/TR/WCAG22/), 2.1.1, 2.4.7, 2.4.11 e 2.5.7 | Referência para teclado, foco e alternativa a arrastar |
| WEB-07 | [OWASP ASVS](https://asvs.owasp.org/) | Referência de verificação de segurança; a página oficial apresenta ASVS 5.0.0 |

## Cobertura por módulo

Alta: vários estados e transições legíveis. Média: estrutura e alguns estados, sem ciclo completo. Baixa: opção isolada, documentação externa ou ausência de demonstração.

| Módulo | Cobertura | Motivo |
|---|---|---|
| Leitura e navegação hierárquica | Alta | Páginas distintas, caminho e árvore visíveis |
| Edição e ações por bloco | Média | Menus claros, mas pouca edição efetiva demonstrada |
| Personalização de página | Média | Antes/depois de capa/ícone; persistência após recarga não vista |
| Criação de página | Média | Páginas vazias novas; validações, erros e salvamento não demonstrados |
| Biblioteca/lateral | Média | Vários menus e tela agregadora; filtros não exercitados |
| Busca, favoritos, lixeira, exportação | Baixa | Controles/opções sem fluxo comprovado ou ausentes |
| Bases e visualizações | Baixa | Complementação documental; nenhum uso no vídeo |
| IA, colaboração, responsividade, offline | Baixa | Entradas de interface ou ausência de evidência |
| Integração futura com o projeto | Média | Código relevante lido; não houve execução ou prova de migração |

## Links diretos dos arquivos inspecionados

- [README.md](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/README.md)
- [frontend/AGENTS.md](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/frontend/AGENTS.md)
- [frontend/package.json](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/frontend/package.json)
- [backend/package.json](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/backend/package.json)
- [backend/prisma/schema.prisma](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/backend/prisma/schema.prisma)
- [backend/src/areas/areas.controller.ts](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/backend/src/areas/areas.controller.ts)
- [backend/src/areas/areas.service.ts](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/backend/src/areas/areas.service.ts)
- [backend/src/areas/dto/create-area.dto.ts](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/backend/src/areas/dto/create-area.dto.ts)
- [backend/src/areas/dto/update-area.dto.ts](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/backend/src/areas/dto/update-area.dto.ts)
- [frontend/src/app/page.tsx](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/frontend/src/app/page.tsx)
- [frontend/src/app/EditorLayout.tsx](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/frontend/src/app/EditorLayout.tsx)
- [frontend/src/app/AreaEditor.tsx](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/frontend/src/app/AreaEditor.tsx)
- [frontend/src/app/extensions.ts](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/frontend/src/app/extensions.ts)
- [frontend/src/app/serialized-save-queue.ts](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/frontend/src/app/serialized-save-queue.ts)
- [backend/src/attachments/attachments.service.ts](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/backend/src/attachments/attachments.service.ts)
- [.github/workflows/ci.yml](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/ccecca35a828da4c19015ba51874da3cf09e10a1/.github/workflows/ci.yml)
