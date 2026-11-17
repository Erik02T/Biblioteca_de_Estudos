# Documentação da Biblioteca de Estudos

Use este índice para distinguir orientação atual, especificação e evidência histórica. A documentação atual descreve a entrega F12 versionada e sua preparação posterior; a fonte efetiva de execução continua sendo código, configuração e scripts.

## Por onde começar

| Assunto | Documento principal | Fonte efetiva |
|---|---|---|
| Visão geral | [README do projeto](../README.md) | Código e referência local F12 |
| Arquitetura atual | [Arquitetura](development/ARQUITETURA.md) | Módulos/controllers, frontend e schema Prisma |
| Instalação, execução e verificações | [Desenvolvimento](development/DESENVOLVIMENTO.md) | Manifests npm, configuração e runners existentes |
| Operação local e recuperação | [Operação local](deployment/OPERACAO_LOCAL.md) | Compose, ambiente e scripts protegidos de backup |
| Preparação de publicação F12 | [Publicação F12](deployment/PUBLICACAO_F12.md) | Gates de CI, migrações, backup e rollback; publicação exige autorização própria |
| Validação e commits F12 | [Prontidão F12](development/PRONTIDAO_F12.md) | Checks isolados, instalação pelo lockfile e condições restantes |
| Contratos do backend | [README do backend](../backend/README.md) | Controllers, DTOs e testes; a lista do README não é exaustiva |
| Interface e editor | [README do frontend](../frontend/README.md) | Rotas, componentes, configuração e testes |
| RF-001–026 | [Requisitos e histórias](notion/Engenharia_Reversa_Notion_Biblioteca/08_Requisitos_e_Historias.md) | Especificação original, IDs preservados |
| CT/QA e rastreabilidade | [Documento 14](notion/Engenharia_Reversa_Notion_Biblioteca/14_Rastreabilidade_e_Testes.md) | Critérios planejados; resultados efetivos na F12 |
| Aceite consolidado | [F12-testes](notion/execucao/F12-testes.md) | [Resultados](../output/playwright/F12-resultados.json), [manifesto](../output/playwright/F12-codigo.json) e [aceite humano](../output/playwright/F12-aceite-humano.json) |
| Organização desta rodada | [Relatório pós-F12](archive/ORGANIZACAO_POS_F12.md) | Inventário, snapshot privado, validações e restauração |

## Mapa de pastas e fontes

```text
backend/
  src/                 API, autenticação, páginas, anexos, modelos e versões
  prisma/              schema e 13 migrações; histórico protegido
  test/                testes HTTP com Prisma simulado
  scripts/             inicialização, ensaios, backup e reprodução das fases
frontend/
  src/app/             rota Next.js, interface, editor, estado e testes
  public/              recursos servidos por URL; uso não depende de import
docs/
  development/         orientação atual e guias antigos identificados
  deployment/          operação local e planos históricos de publicação
  notion/              especificação, planejamento e relatórios de execução
  archive/             registros históricos e análise contínua arquivada
output/playwright/     mistura de roteiros, fixtures e evidências; preservar por item
.github/workflows/     CI; inclui validação ativa da imagem Docker
```

Na raiz, [Compose](../docker-compose.yml) define PostgreSQL/MinIO e volumes; [env.example](../env.example) documenta configuração. Manifests/lockfiles definem dependências. [Dockerfile](../backend/Dockerfile), [Render](../backend/render.yaml) e [Vercel](../frontend/vercel.json) têm consumidores e não são sobras.

Arquivos de ambiente, dumps, perfis, mídias pessoais e diretórios locais de artefatos ficam privados. Dependências e builds são gerados, mas sua recriação precisa ser demonstrada antes de qualquer descarte. `scripts/` na raiz e `frontend/src app/` estavam vazios e foram mantidos.

## Homologação e evidências

- F12: [entrega e limites](notion/execucao/F12.md), [testes/matriz/reprodução](notion/execucao/F12-testes.md) e [correções](notion/execucao/F12-correcoes.md).
- F8: [entrega](notion/execucao/F8.md), [testes](notion/execucao/F8-testes.md) e [correções](notion/execucao/F8-correcoes.md).
- F9: [entrega](notion/execucao/F9.md), [testes](notion/execucao/F9-testes.md) e [correções](notion/execucao/F9-correcoes.md).
- F10: [entrega](notion/execucao/F10.md), [testes](notion/execucao/F10-testes.md) e [correções](notion/execucao/F10-correcoes.md).
- F11: [entrega](notion/execucao/F11.md), [testes](notion/execucao/F11-testes.md) e [correções](notion/execucao/F11-correcoes.md).

As fases anteriores e os registros UX continuam em `notion/execucao/`. Resultados, capturas, ZIPs e roteiros em `output/playwright/` e `notion/execucao/evidencias/` fazem parte dessa cadeia. Ausência de rastreamento ou regra de ignore não comprova descarte.

## Especificação e histórico

- [Índice dos 15 documentos técnicos](notion/Engenharia_Reversa_Notion_Biblioteca/00_Indice.md): fonte canônica da especificação. O documento 11 é uma proposta arquitetural de 10/11, distinta da arquitetura atual.
- [Análise em leitura contínua](notion/Analise_Notion_Biblioteca_de_Estudos.md): caminho anterior preservado como apontador ao original arquivado.
- [Análise após F7](notion/Analise_Pos_F7_Proximos_Passos_Biblioteca.md): auditoria histórica; consultar F12 para o aceite posterior.
- [Prompts mestres](notion/Prompts_Mestres_Biblioteca_de_Estudos.md), [direção UX/UI](notion/Direcao_UX_UI_Biblioteca_de_Estudos.md), [prompt UX/UI](notion/Prompt_Mestre_UX_UI_Aplicar_Testar_Corrigir.md) e [protótipo HTML](notion/Biblioteca_Modelo_Interativo.html): planejamento e referências; não substituem o aplicativo homologado.
- [Plano mínimo antigo de testes](development/TEST_PLAN.md) e [prompts antigos](development/prompts-biblioteca-estudos.md): históricos; comandos atuais em Desenvolvimento, resultados na F12.
- [Homologação hospedada](deployment/HOMOLOGACAO.md) e [produção](deployment/PRODUCAO.md): planos históricos de publicação. Não comprovam a infraestrutura atual nem são o roteiro da operação local.
- [Fase 6](archive/FASE_6_RELATORIO.md), [Fase 6.1](archive/FASE_6_1_RELATORIO.md), [estabilização](archive/FASE2_ESTABILIZACAO_REPORT.md) e [refatoração anterior](archive/REFACTORING_REPORT.md): registros preservados.
- [Levantamento anterior à rodada local](notion/Organizacao_e_Limpeza_Biblioteca_Pos_F12.md): inventário remoto e prompt que originaram esta organização.

## Exclusão comprovada após a organização

A [continuação do relatório](archive/ORGANIZACAO_POS_F12.md#exclusão-comprovada-de-artefatos-gerados) registra os três caminhos gerados excluídos, a comparação dos checks, o ganho líquido observado no disco e a restauração. Os eventos pendentes do Next, recursos de uso incerto e a referência F12 foram preservados.
