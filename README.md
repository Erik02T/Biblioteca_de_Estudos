# Biblioteca de Estudos

Biblioteca pessoal de páginas hierárquicas para organizar estudos e projetos, com editor por blocos, materiais anexados, busca, tabela/quadro, modelos, versões e exportação.

A entrega F12 inclui fontes, migrações, testes e evidências públicas versionados. A [homologação F12](docs/notion/execucao/F12.md) e seu [manifesto](output/playwright/F12-codigo.json) registram o estado e os limites daquela rodada local. A [preparação posterior de commits](docs/development/PRONTIDAO_F12.md) registra as correções de instalação/CI e suas verificações atuais.

## Começar

- [Índice e mapa do repositório](docs/README.md)
- [Setup, comandos e testes](docs/development/DESENVOLVIMENTO.md)
- [Arquitetura atual](docs/development/ARQUITETURA.md)
- [Operação local e recuperação](docs/deployment/OPERACAO_LOCAL.md)
- [Prontidão dos commits](docs/development/PRONTIDAO_F12.md) e [runbook de publicação](docs/deployment/PUBLICACAO_F12.md)

No ambiente já configurado, inicie o backend em `backend/` com `npm.cmd run start:dev` e o frontend em `frontend/` com `npm.cmd run dev -- --port 3001`. API: `http://localhost:3000`; interface: `http://localhost:3001`. Em outros shells, use `npm` no lugar de `npm.cmd`. Confira o setup antes de instalar dependências ou aplicar migrações a um acervo existente.

## Fontes e aceite

NestJS, Prisma/PostgreSQL e storage S3 compatível sustentam a API; Next.js/React e Tiptap sustentam a interface. Os [documentos de requisitos](docs/notion/Engenharia_Reversa_Notion_Biblioteca/08_Requisitos_e_Historias.md) e de [rastreabilidade](docs/notion/Engenharia_Reversa_Notion_Biblioteca/14_Rastreabilidade_e_Testes.md) preservam RF-001–026 e CT/QA; a [matriz F12](docs/notion/execucao/F12-testes.md) registra os resultados finais.

Os relatórios [F8](docs/notion/execucao/F8.md), [F11](docs/notion/execucao/F11.md) e demais fases são registros históricos. Não representam pendências atuais quando uma fase posterior registra sua resolução. O [resultado consolidado F12](output/playwright/F12-resultados.json) distingue testes automatizados, aceite humano e limitações aceitas. Publicação é uma ação separada.

A organização documental desta rodada, suas verificações e a recuperação estão no [relatório pós-F12](docs/archive/ORGANIZACAO_POS_F12.md).
