# Operação local e recuperação

Este é o ponto de entrada da operação local da referência F12. Fontes: [Compose](../../docker-compose.yml), [exemplo de ambiente](../../env.example), [inicialização local](../../backend/scripts/start-local.cjs), [loader](../../backend/src/environment.ts) e scripts de backup existentes. Os planos antigos de [homologação hospedada](HOMOLOGACAO.md) e [produção](PRODUCAO.md) não comprovam a infraestrutura atual.

## Diagnóstico e uso habitual

| Recurso | Endereço/fonte | Conferência |
|---|---|---|
| API | `http://localhost:3000` por padrão | `/health` verifica processo; `/health/ready` verifica conexão ao banco |
| Interface | `http://localhost:3001` com porta explícita | Comando em [Desenvolvimento](../development/DESENVOLVIMENTO.md) |
| PostgreSQL | `localhost:5433`; porta interna 5432 | Destino real selecionado no ambiente do backend |
| MinIO | API 9000, console 9001 | Bucket e credenciais configurados localmente |
| Persistência | Volumes nomeados em Compose | `biblioteca_pgdata` e `biblioteca_minio_data` |

`docker compose ps` consulta o estado. Quando necessário, `docker compose up -d` inicia os serviços existentes. A inicialização da API informa arquivo de configuração e host/porta/banco sem imprimir credenciais. Uma readiness degradada retorna 503; confira a configuração e a disponibilidade do PostgreSQL antes de alterar qualquer dado.

A aplicação exige sessão JWT nas operações protegidas; ownership vem do usuário autenticado. URLs assinadas de mídia expiram e são renovadas pelo recurso. O console MinIO e o banco não substituem a interface para edição habitual da biblioteca.

## Atualização do acervo

Migrations são histórico protegido. A F12 não criou migração nova: utilizou as 13 existentes, incluindo as adições F8/F11. A atualização do banco habitual foi relatada em [F9-correções](../notion/execucao/F9-correcoes.md) e [F11](../notion/execucao/F11.md), após backup e ensaio em clone.

Antes de aplicar uma atualização a outro acervo:

1. Identificar explicitamente banco, bucket, versão e dados de origem.
2. Preservar dump do banco e cópia dos objetos com inventário/hashes, em armazenamento privado.
3. Restaurar em banco e bucket novos; comparar registros e objetos e testar leitura de mídia.
4. Aplicar o histórico somente no destino aprovado e manter o backup.

Não usar reset/db push ou limpeza de volumes como alternativa a esse procedimento. Esta rodada documental não aplicou migrations nem operou o acervo habitual.

## Scripts existentes e seus limites

| Script | Origem/finalidade | Uso nesta documentação |
|---|---|---|
| [local-upgrade-backup.cjs](../../backend/scripts/local-upgrade-backup.cjs) | Backup de objetos e verificação da biblioteca local identificada; dump/restore SQL são separados | Consultar guards, manifesto e identificador de rodada antes de executar; há modos que alteram a origem |
| [f9-creation-upgrade.cjs](../../backend/scripts/f9-creation-upgrade.cjs) | Diagnóstico e atualização protegida da criação idempotente | `inspect` é leitura; demais etapas pertencem ao procedimento específico |
| [f11-upgrade.cjs](../../backend/scripts/f11-upgrade.cjs) | Atualização aditiva de coleções/modelos, ensaiada em clone | Evidência histórica F11; não repetir uma rodada existente |
| [f12-recovery.cjs](../../backend/scripts/f12-recovery.cjs) | Dump, objetos, restauração e comparação em destinos novos | Opera fixtures F12, não o backup habitual |
| [f12-evidence.cjs](../../backend/scripts/f12-evidence.cjs) | Verificação offline dos ZIPs e agregação dos resultados | Pode reescrever evidências; usar cópia isolada em nova rodada |

Os roteiros preservam contextos e proteções diferentes. Não combinar etapas ou substituir nomes de recursos sem revisar o script e seu relatório. Dumps, tokens, perfis e mídias pessoais permanecem privados, fora de commits e de publicações.

## Fixtures F12 e publicação

O runner F12 fixa banco `biblioteca_test_f8_f12_20261117`, bucket `biblioteca-test-f7-f8-f12-20261117`, API 3067 e frontend 3068 com build `.next-f12`. Os [procedimentos F12](../notion/execucao/F12-testes.md) descrevem seed, testes, navegador e recuperação. Esses dados não representam instruções ou o conteúdo do acervo habitual.

[Render](../../backend/render.yaml) usa runtime Node nativo e `autoDeploy: false`; [Vercel](../../frontend/vercel.json) desabilita deploy automático. O [job Docker do CI](../../.github/workflows/ci.yml) continua ativo para validar a imagem. Nenhuma publicação foi realizada nesta organização.

A recuperação dos arquivos reorganizados nesta rodada é distinta da recuperação do banco: consulte o [relatório pós-F12](../archive/ORGANIZACAO_POS_F12.md) e seu snapshot privado.
