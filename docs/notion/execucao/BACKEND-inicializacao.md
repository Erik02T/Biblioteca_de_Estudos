# Backend — correção da inicialização local / Prisma P1001

16/11/2026. Branch `refactor/cleanup-general`, HEAD `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`, árvore local não commitada. Trabalho separado da rodada de UX, solicitado pelo erro recorrente ao executar `npm run start:dev` no terminal do VS Code.

## Diagnóstico e reprodução

O Compose publica PostgreSQL em `localhost:5433`, encaminhando para a porta interna 5432. Tanto `.env` da raiz quanto `backend/.env` apontavam para 5433 durante a inspeção. Não foi inspecionado o ambiente interno do terminal já aberto do usuário; na sessão limpa do agente, o comando original iniciou normalmente.

A causa de configuração reproduzida foi a precedência de uma `DATABASE_URL` herdada do processo: o carregamento normal com `override: false` preservava uma URL antiga em 5432, mesmo com `backend/.env` correto. Ao injetar essa condição no backend compilado original, ele terminou com código 1, `P1001` e destino `localhost:5432`. [Evidência anterior](../../../output/backend-startup/antes.json). Credenciais não foram registradas.

## Alteração

- `backend/scripts/start-local.cjs` inicia o Nest CLI com ambiente próprio carregado antes do bootstrap. Nos comandos locais, valores do arquivo escolhido têm precedência sobre os herdados do terminal. O processo que chama o comando não é alterado.
- `backend/package.json`: `start`, `start:dev` e `start:debug` usam esse launcher, preservando os argumentos de watch/debug.
- A origem padrão é `backend/.env`, independente do diretório de execução. `DOTENV_CONFIG_PATH` seleciona outro arquivo; caminhos relativos são resolvidos a partir de `backend/`. Arquivo local inexistente ou sem `DATABASE_URL` gera orientação explícita, em vez de usar silenciosamente um valor antigo.
- A inicialização mostra arquivo selecionado e host/porta/banco efetivos, sem usuário, senha ou parâmetros da URL. Não há substituição automática de porta ou banco: o arquivo é a configuração local deliberada.
- `NODE_ENV=production` e `NODE_ENV=test` preservam a precedência de variáveis injetadas. `start:prod`, execução direta do build e o carregador geral `environment.ts` não foram alterados. Prisma CLI também mantém seu comportamento próprio.
- READMEs atualizados com precedência, configuração alternativa, prontidão e instrução para reiniciar um comando anterior.

## Verificações

| Cenário | Estado / evidência |
|---|---|
| URL herdada em 5432, arquivo em 5433, código anterior | **FALHOU**, reproduzindo `P1001`; `antes.json`. |
| `npm run start:dev`, duas inicializações independentes com URL herdada em 5432 | **VERIFICADO**, backend usa 5433 e `/health/ready` retorna `checks.database: connected`. |
| `npm start` com a mesma URL antiga | **VERIFICADO**, mesma confirmação de conexão. |
| Configuração local, produção/teste, arquivo alternativo, arquivo ausente e URL ausente | **VERIFICADO**, 8 testes novos, mais 2 do carregador existente: 2 suítes/10 testes. [Log](../../../output/backend-startup/testes.txt). |
| Lint do teste acrescentado, sintaxe do launcher, build Nest e tipos | **VERIFICADO**, exit 0. |

[Roteiro de inicialização](../../../output/backend-startup/verificar.cjs) e [resultados posteriores](../../../output/backend-startup/depois.json). Cada execução usa o próprio processo npm, consulta somente prontidão e encerra exclusivamente a árvore que criou. Não executa migrations, resets ou escrita de dados da aplicação.

A primeira tentativa de repetir o teste dentro do sandbox não conseguiu encerrar todos os processos filhos e encontrou a porta ocupada na segunda inicialização. Isso foi uma falha de limpeza do roteiro, não apresentado como novo defeito da aplicação. A árvore criada pelo agente foi identificada e encerrada; a rodada final foi executada com permissão para gerenciar seus processos e validou as três inicializações. O terminal/launcher do usuário que já existia foi preservado.

## Como aplicar no terminal existente

Encerre o `start:dev` antigo com Ctrl+C e execute novamente, dentro de `backend/`:

```powershell
npm run start:dev
```

O novo launcher deve informar `PostgreSQL: localhost:5433/biblioteca_estudos` nesta configuração. Não é necessário limpar `DATABASE_URL` manualmente a cada início local. O PostgreSQL deve estar ativo; se estiver parado, execute `docker compose up -d postgres` na raiz. A correção não inicia Docker nem mascara indisponibilidade real do banco.

Não houve alteração em `node_modules`, schema Prisma, volumes, dados, produção ou nos resultados da rodada de UX.
