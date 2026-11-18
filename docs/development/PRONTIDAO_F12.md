# Prontidão dos commits F12

Preparação local em 17/11/2026, America/Fortaleza. As fontes, migrações e evidências públicas da F12 foram organizadas em seis commits após a auditoria. Push e publicação permanecem ações separadas.

Resultados resumidos e sem credenciais em [PRONTIDAO-F12-resultados.json](../../output/playwright/PRONTIDAO-F12-resultados.json). A matriz e os aceites humanos anteriores continuam nos [testes F12](../notion/execucao/F12-testes.md); o [manifesto F12](../../output/playwright/F12-codigo.json) identifica o estado histórico anterior às correções desta preparação.

## Correções desta preparação

- Cada suíte de storage prepara seu bucket antes de usar mídia. O helper exige banco local biblioteca_test_*, NODE_ENV=test, MinIO local na porta 9000, bucket biblioteca-test-f7* e credenciais de fixtures. Há 16 novos testes dessa fronteira e do tratamento de erros.
- A F11 passou isoladamente como primeira suíte, com bucket inicialmente ausente. A dependência da ordem das suítes foi removida.
- Os dois lockfiles receberam as entradas opcionais transitivas @emnapi/core e @emnapi/runtime exigidas por npm ci em Linux/Node 22. Nenhuma versão já existente foi trocada.
- O workflow instala pelo lockfile, aplica migrações em banco exclusivo, compila antes dos testes de bootstrap e provisiona MinIO/bucket de teste. A preparação inicial usou uma imagem MinIO fixada por digest; a correção de 18/11 descrita abaixo substituiu essa origem. O job remove apenas o contêiner que criou.
- Os testes de navegação aguardam os efeitos iniciais de identidade/coleção antes de interagir com a tela. As asserções de preservação de dados e navegação foram mantidas.
- Cinco ZIPs de fixtures receberam exceções nominais em .gitignore. Ambientes, dumps, perfis, builds e os demais ZIPs continuam excluídos.
- Os 18 avisos de whitespace encontrados nos sete documentos novos foram tratados; quebras Markdown intencionais foram preservadas com quebras explícitas de linha.

### Correção do runner limpo em 18/11/2026

O primeiro push disparou o run [44305671650](https://github.com/Erik02T/Biblioteca_de_Estudos/actions/runs/44305671650): frontend aprovado e backend bloqueado no download MinIO do Quay (`401 UNAUTHORIZED`), antes dos testes. O ensaio local anterior tinha reutilizado a imagem existente e não comprovava pull anônimo. O CI passou a construir o serviço a partir de um commit fixo do [código oficial MinIO](https://github.com/minio/minio/tree/9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a), sem depender daquele registro. Os resultados de 17/11 abaixo são históricos; o resultado remoto da correção precisa corresponder ao novo SHA enviado.

Validação da correção: acesso anônimo aos manifests Go/Alpine, construção com `--pull --no-cache` e configuração de registro vazia, actionlint/ShellCheck aprovados, 184 testes backend e 26 HTTP aprovados em Node 22 com PostgreSQL e o novo MinIO descartáveis. Os dados e serviços habituais foram preservados.

## Validação

Cópias isoladas, instalações reais e recursos novos de teste. Nenhum ambiente ou node_modules habitual foi copiado para a instalação limpa. Para os limites entre commits, as árvores foram exportadas do índice; o frontend usou instalações físicas próprias, pois o Turbopack recusa dependências fora de sua raiz. As dependências backend dessas verificações de limite ficaram em diretório privado compartilhado entre as cópias, com regeneração do Prisma para cada schema.

| Check | Resultado |
|---|---|
| Backend real | 30 suítes, 184 testes |
| HTTP simulado | 26 testes |
| Frontend | 19 suítes, 141 testes |
| Lint e tipos | Backend/frontend aprovados; sete warnings preexistentes no teste de integração F12 |
| Migrações | 13 aplicadas em banco novo |
| Instalação Windows | Node 24.13.0 / npm 11.6.2 |
| Instalação e comandos do workflow em Linux | Node 22.23.5 / npm 10.9.9; nove comandos backend e quatro frontend aprovados |
| Sintaxe do workflow | actionlint 1.7.11, incluindo ShellCheck, aprovado |
| Builds de produção | Backend, frontend e Docker aprovados |
| Imagem após prune | UID 100, Prisma Client presente, Prisma CLI ausente |
| Smoke da imagem | Readiness, registro, criação/leitura autenticada, upload/leitura por URL assinada e envio à lixeira aprovados em fixtures |
| Navegadores | Chromium e Firefox: autenticação, 19 checks de compatibilidade e 26 de superfícies por motor |
| Exportação offline | Dois ZIPs F12, sete entradas verificadas por pacote |
| Whitespace e links | Diffs dos commits conferidos; links locais da documentação conferidos |

Não foi uma execução sem falhas desde a primeira tentativa: o npm 10 detectou os metadados ausentes; uma execução Linux e uma cópia de limite entre commits expuseram dois testes com interação durante a carga inicial. Os lockfiles e a sincronização inicial dos testes foram corrigidos, e as verificações correspondentes passaram nas repetições. Os logs completos ficam no armazenamento privado de validação.

Android físico, IME real, Narrador, benchmarks completos e restauração do banco de destino não foram repetidos. Seus aceites anteriores permanecem históricos. Os replays automatizados desta preparação não renovam aceite humano nem certificam infraestrutura hospedada.

## Organização dos commits

1. Ambiente local, CORS, autenticação e cliente HTTP compartilhado.
2. API, schema, dez migrações novas, funcionalidades e testes backend, incluindo o setup seguro de fixtures.
3. Biblioteca/editor frontend, recuperação, dependências e testes.
4. Runners, especificações, relatórios, capturas e ZIPs de reprodução.
5. Workflow de CI compatível com as integrações.
6. Guias atuais, registro da limpeza e runbook de publicação.

backend/package.json foi separado entre scripts de início e dependência de exportação. .gitignore foi separado entre builds frontend e artefatos/evidências. Schema e migrações ficaram juntos. Os grupos da entrega não devem ser publicados isoladamente.

Os oito arquivos locais de configuração, logs e wrappers ad hoc enumerados na auditoria ficaram fora dos commits, preservados na estação. Não houve descarte desses arquivos nem dos ambientes privados. As remoções anteriores de builds/cache ignorados não geraram exclusões de fonte no Git.

## Vereditos e ações restantes

- **COMMITS — APTO:** correções locais e organização verificadas; consultar o histórico para os seis grupos.
- **PUSH — BLOQUEADO:** confirmar branches, hooks, Root Directory e auto-deploy efetivo no Render/Vercel antes de enviar. Sem essa confirmação, tratar push como potencial publicação.
- **PRODUÇÃO — BLOQUEADO:** conferir variáveis e migrações do destino, backup/restauração atual, compatibilidade de clientes, par de aplicação para rollback e decisão de risco das dependências.

**CI GitHub dos novos commits: PENDENTE.** A execução local dos comandos do workflow não é resultado do GitHub Actions para um SHA enviado. A auditoria só confirmou runs remotos antigos; esta preparação não fez push, abriu PR ou publicou.

O grafo backend continua com quatro advisories high do ecossistema Prisma e um moderate em file-type; o frontend não apresentou advisories de produção. Os quatro pacotes Prisma alertados não ficaram na imagem final. file-type@16.5.4 permanece com a proteção ASF testada. A decisão de tratamento/aceitação do risco precisa ser registrada antes da produção.

O HEAD antigo f87fdbc não é contingência irrestrita compatível: em fixture com revisão, sua exclusão removeu mídia antes de falhar por FK. Reverter aplicação e recuperar banco/storage são procedimentos diferentes. Seguir o [runbook de publicação](../deployment/PUBLICACAO_F12.md), mantendo escritas bloqueadas até resolver os gates.
