# Correção da conexão local

15/11/2026. Branch `refactor/cleanup-general`, árvore local não commitada sobre `f87fdbc`. Alterações anteriores preservadas.

## Causa confirmada

O contêiner PostgreSQL existente publica `5433 → 5432`. `backend/.env` já apontava para 5433; o `.env` da raiz e o Compose versionado ainda indicavam 5432. O carregamento genérico `dotenv/config` selecionava o arquivo relativo ao diretório de execução. Executar o build pela raiz podia usar a conexão incorreta e gerar P1001.

## Correção

- `backend/src/environment.ts`: localiza o pacote backend a partir do código fonte ou compilado e carrega `backend/.env`, sem depender do diretório de execução. Importado antes dos demais módulos em `main.ts`.
- Variáveis explícitas de processo continuam tendo precedência. `DOTENV_CONFIG_PATH` continua permitindo ambientes isolados.
- `.env` local da raiz, `docker-compose.yml`, `env.example` e documentação alinhados à porta publicada 5433. Nenhum contêiner/volume foi recriado e nenhum dado foi apagado.
- O frontend já estava configurado para `http://localhost:3000`; não foi necessário alterá-lo.

## Verificações

| Verificação | Resultado |
|---|---|
| Dois testes de regressão do carregamento | VERIFICADO — fonte/build escolhem arquivo backend; ambiente explícito/arquivo alternativo mantidos |
| ESLint dos arquivos envolvidos | VERIFICADO — após aplicar formatação do projeto |
| Build backend | VERIFICADO |
| `prisma migrate status` no banco local normal | VERIFICADO — 11 migrações, schema atualizado; nenhuma migração aplicada nesta correção |
| `node backend/dist/src/main.js` executado pela raiz | VERIFICADO — API iniciou em 3000 e conectou ao PostgreSQL |
| `GET /health/ready` | VERIFICADO — HTTP 200, `checks.database=connected` |
| CORS para frontend 3001 | VERIFICADO — origem autorizada |
| Navegador real no frontend 3001, sem interceptação de API | VERIFICADO — prontidão 200 e formulário enviou `/auth/login` à API local 3000; credenciais fictícias receberam 401 e mensagem visível |

O primeiro script de navegador encontrou dois elementos `role=alert` devido ao anunciador do Next; o seletor foi limitado ao aviso do formulário e a verificação repetida passou. Não foram usadas credenciais pessoais nem criados registros para este smoke test.

A API iniciada para conferir a correção permanece disponível em `http://localhost:3000`; frontend existente em `http://localhost:3001`. Para desenvolvimento com recarga, encerrar essa instância e executar `npm run start:dev` em backend. Nenhuma alteração de produção, commit ou deploy.

## Revalidação após novo relato de P1001

15/11/2026. O usuário informou novamente uma falha em `localhost:5432`, usando `npm run start:dev`. No estado atual, o erro não foi reproduzido:

- **VERIFICADO:** `.env` da raiz e `backend/.env` apontam para `localhost:5433/biblioteca_estudos`. A inspeção exibiu somente host/porta/nome do banco, sem credenciais.
- **VERIFICADO:** PostgreSQL escutando em 5433. A conexão direta pelo Prisma, carregando o ambiente atual, executou `SELECT 1` com sucesso, sem modificar dados.
- **VERIFICADO:** `npm.cmd run start:dev` iniciado em `backend`, compilação com zero erros e API na porta 3000. Essa instância em modo watch foi mantida disponível.
- **VERIFICADO:** `GET http://localhost:3000/health/ready` retornou HTTP 200 e `checks.database=connected`.
- **VERIFICADO:** dois testes de `src/environment.spec.ts` passaram; arquivo backend selecionado tanto no fonte quanto no build e precedência de variáveis explícitas preservada.
- **NÃO CONFIRMADO:** a origem de 5432 no processo que falhou. Nenhuma `DATABASE_URL` de processo/usuário/máquina foi encontrada no ambiente acessível ao agente. Isso não demonstra ausência de uma variável exportada em outro terminal já aberto. Ambiente antigo, outro checkout/processo ou carregamento externo permanecem hipóteses.

Não houve necessidade de nova alteração no código, nos arquivos `.env`, na porta publicada ou no banco. Não foram executadas migrações nem recriados contêineres/volumes. Para uma próxima inicialização no terminal que apresentou o erro, caso ele tenha uma `DATABASE_URL` antiga exportada, remover somente essa variável de processo (`Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue`) permite que `backend/.env` forneça a conexão. Não substituir automaticamente ambientes explicitamente injetados, pois também são usados pelos testes isolados.
