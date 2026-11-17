# Arquitetura atual — referência local F12

Este mapa descreve responsabilidades observadas no código da F12. A [proposta arquitetural original](../notion/Engenharia_Reversa_Notion_Biblioteca/11_Arquitetura_e_Decisoes.md) permanece como especificação histórica; o [aceite F12](../notion/execucao/F12.md) informa o que foi homologado.

## Fluxo e responsabilidades

A interface Next.js/React identifica páginas pela URL e acessa a API NestJS com autenticação JWT. O backend deriva o proprietário da sessão, valida DTOs e consulta PostgreSQL pelo Prisma. Materiais físicos ficam em storage S3 compatível; URLs assinadas são renovadas por identificação do recurso.

| Grupo | Responsabilidade | Fonte |
|---|---|---|
| Entrada e configuração da API | Bootstrap, ambiente, CORS, autenticação e tratamento de erros | [main.ts](../../backend/src/main.ts), [app.module.ts](../../backend/src/app.module.ts), [environment.ts](../../backend/src/environment.ts) |
| Identidade | Registro, login, refresh, logout, sessão e guard | [AuthModule](../../backend/src/auth/auth.module.ts), [controller](../../backend/src/auth/auth.controller.ts) |
| Páginas e organização | Hierarquia, navegação, busca, favoritos, visitas, lixeira e duplicação | [AreasModule](../../backend/src/areas/areas.module.ts), [controller](../../backend/src/areas/areas.controller.ts), [service](../../backend/src/areas/areas.service.ts) |
| Visualizações e modelos | Configurações salvas, tabela/quadro e modelos com mídia própria | [visualizações](../../backend/src/areas/view-configurations.controller.ts), [modelos](../../backend/src/areas/templates.controller.ts) |
| Versões e portabilidade | Checkpoints, restauração e exportação ZIP | [controllers](../../backend/src/areas/portability.controller.ts), [exportação](../../backend/src/areas/exports.service.ts), [versões](../../backend/src/areas/revisions.service.ts) |
| Materiais | Metadados de anexos e operações no storage | [anexos](../../backend/src/attachments/attachments.service.ts), [storage](../../backend/src/storage/storage.service.ts) |
| Interface e navegação | Coleção, árvore, URL, filtros e abertura de páginas | [page.tsx](../../frontend/src/app/page.tsx), [LibraryNavigation](../../frontend/src/app/LibraryNavigation.tsx), [rotas](../../frontend/src/app/library-route.ts) |
| Editor e salvamento | Tiptap, blocos, fila de gravação e recuperação local | [EditorLayout](../../frontend/src/app/EditorLayout.tsx), [extensions](../../frontend/src/app/extensions.ts), [coordenador](../../frontend/src/app/page-save-coordinator.ts), [journal](../../frontend/src/app/draft-store.ts) |

## Dados e contratos

O [schema Prisma](../../backend/prisma/schema.prisma) é a fonte física: Area, Attachment, User, Session, AreaCreationRequest, ViewConfiguration, Template, AreaOpening, TemplateFile, PageRevision e RevisionFile. As [migrações](../../backend/prisma/migrations/) preservam sua evolução; são 13 na referência F12 e nenhuma foi criada na própria F12.

Uma página corresponde a Area; seus blocos permanecem no documento JSON. Trocar lista/tabela/quadro usa os mesmos IDs. O frontend mantém rascunhos em IndexedDB segregados por conta; revisões condicionam escritas concorrentes. Formatos desconhecidos são preservados com edição do corpo bloqueada. Detalhes e limites estão nos [relatórios F8](../notion/execucao/F8.md) e [F12](../notion/execucao/F12.md), junto aos DTOs e testes atuais.

A exclusão comum envia à lixeira. A exclusão definitiva usa confirmação e revisão exata, podendo exigir repetição da limpeza em falha de storage. O contrato detalhado está no [README do backend](../../backend/README.md) e nos [testes F12](../../backend/src/areas/f12-acceptance.integration.spec.ts). Este documento não acrescenta endpoints ou modifica formatos.

## Infraestrutura e consumidores

[Compose](../../docker-compose.yml) fornece PostgreSQL e MinIO. [CI](../../.github/workflows/ci.yml) executa lint, testes, builds e valida a imagem do [Dockerfile](../../backend/Dockerfile). O [Render](../../backend/render.yaml) usa runtime Node nativo e o [Vercel](../../frontend/vercel.json) mantém deploy automático desabilitado.

O frontend usa [next.config.ts](../../frontend/next.config.ts) para diretório de build e configuração de imagens. Rotas e arquivos especiais em `src/app/` e recursos em `public/` têm descoberta pelo framework/URL; ausência de import não demonstra ausência de uso.

Consulte [Desenvolvimento](DESENVOLVIMENTO.md), [Operação local](../deployment/OPERACAO_LOCAL.md) e o [índice documental](../README.md).
