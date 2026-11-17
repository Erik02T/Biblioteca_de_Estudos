# Organização e limpeza após a F12

> **Relatório com duas rodadas.** A organização documental anterior está preservada abaixo. A continuação solicitada de exclusão efetiva, seus ganhos e a restauração atual estão em [Exclusão comprovada de artefatos gerados](#exclusão-comprovada-de-artefatos-gerados).

Rodada local de **17/11/2026**, America/Fortaleza. Dois lotes exclusivamente documentais. O estado anterior foi preservado antes das alterações; os resultados históricos da F12 não foram regenerados.

## Referência exata e estado local

- Branch: `refactor/cleanup-general`; HEAD: `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`.
- Antes: **58 entradas rastreadas modificadas**, **553 arquivos não rastreados**, **0 staged**. Depois: **62**, **558** e **0**, respectivamente. O diff contra HEAD inclui trabalho anterior; as mudanças desta rodada são somente as 13 entradas relacionadas abaixo.
- [F12-codigo.json](../../output/playwright/F12-codigo.json): **330/330 hashes iguais antes**; 13 migrações SQL presentes. O HEAD isolado contém a base antiga, não a entrega homologada inteira.
- Instruções: nenhum AGENTS.md na raiz/ancestrais consultados; [frontend/AGENTS.md](../../frontend/AGENTS.md) preservado. Nenhum código frontend foi editado.
- Patch staged vazio, patch unstaged binário, status NUL, índice, lista tracked/untracked/ignored e todos os arquivos relevantes foram guardados privadamente. Não houve staging, commit, push ou publicação.

## Snapshot e armazenamento privado

Raiz da rodada: `%LOCALAPPDATA%\BibliotecaDeEstudos\pos-f12\20261117-144759`.

`snapshot/` contém **80.324 arquivos / 1.613.709.091 bytes**, copiados e verificados por SHA-256; inclui objetos/metadados Git, índice, dependências instaladas, arquivos não rastreados e ignorados relevantes. ACL da pasta foi restringida ao usuário e SYSTEM, sem herança. Nenhum backup foi enviado ou publicado.

`manifests/files.json` registra caminho, tamanho e hash integral de cada arquivo; `inventory.json` registra conteúdo descritivo, origem, consumidor, classificação, evidência, ação e recuperação por candidato. `lote1.json` e `lote2.json` registram hashes anteriores/posteriores e caminhos exatos. Patches são complementares, não o mecanismo único de restauração.

A cópia Git passou em `git fsck --full --no-reflogs`. Antes do primeiro lote, seis restaurações amostrais passaram: README modificado, teste não rastreado, migração não rastreada, resultado F12, arquivo de ambiente privado e índice. A listagem staged do índice restaurado coincidiu byte a byte com a original.

Foram excluídos da **cópia**, sem remoção da origem, somente estes caches gerados: `backend/node_modules/.cache`, `backend/node_modules/@prisma/engines/node_modules/.cache`, `node_modules/.cache` e `frontend/.next{,-f10,-f11,-f12}/cache`. Os checks atuais passaram sem eles. Os demais builds e dependências foram preservados; recriação histórica equivalente de F10/F11 não foi demonstrada. A reinstalação integral não foi executada; o dry-run autorizado posterior passou, conforme registrado abaixo. A instalação atual foi preservada.

Arquivos de ambiente, dumps, perfis, tokens, scripts gerados com autenticação e mídias locais ficaram no armazenamento privado. Não houve administração de volumes nem comandos contra o banco/bucket habituais; os testes usaram somente fixtures fixas nos serviços locais existentes.

## Árvore, fontes e classificação por pasta

`docs/README.md` é o [índice principal](../README.md), com a árvore comentada. A contagem abaixo refere-se aos arquivos do snapshot, incluindo dependências/builds preservados e excluindo os sete caches enumerados; não é contagem de código-fonte.

| Pasta/grupo | Arquivos | Bytes |
|---|---:|---:|
| `.devin` | 1 | 168 |
| `[raiz: arquivos]` | 9 | 23287 |
| `.f12-artifacts` | 1977 | 222758173 |
| `.f7-artifacts` | 68 | 137718730 |
| `.f8-artifacts` | 51 | 83579915 |
| `.git` | 2723 | 20512715 |
| `.github` | 1 | 4241 |
| `.playwright-cli` | 47 | 119474 |
| `.playwright-mcp` | 102 | 404760 |
| `.vscode` | 1 | 44 |
| `backend` | 39728 | 450869203 |
| `docs` | 117 | 2458134 |
| `frontend` | 31413 | 671746366 |
| `node_modules` | 3765 | 11475922 |
| `output` | 321 | 12037959 |

| Grupo | Classificação e conteúdo | Origem/consumidor efetivo | Ação e recuperação |
|---|---|---|---|
| `backend/src/`, `backend/test/` | Ativo: API, regras, integrações e HTTP simulado | Módulos/controllers, Jest e runner F12 | Preservados; hashes no snapshot |
| `backend/prisma/` | Ativo/protegido: schema, lock de provedor e 13 migrações | Prisma, instalação/build e atualização de dados | Nenhuma alteração |
| `backend/scripts/` | Ativo ou evidência de fase: startup, ensaios, backup e reprodução | Manifests, imports entre runners e relatórios F7–F12 | Todos preservados; nenhuma inferência de dispensa pelo nome |
| `frontend/src/app/` | Ativo: rota, componentes, editor, estilos e testes | Next.js, imports, Jest e TypeScript | Nenhuma movimentação de aplicação |
| `frontend/public/` | Ativo por URL; cinco candidatos de uso incerto | Next.js, URLs/CSS/JS e possíveis consumidores externos | Todos preservados |
| `docs/development/`, `docs/deployment/` | Guias atuais e histórico explicitamente rotulado | Scripts/configuração atuais e leitores | Lote 1; restaurar pelo manifesto |
| `docs/notion/`, `docs/archive/` | Especificação, histórico e evidência | Índices, critérios RF/CT/QA e relatórios | Lotes 1/2 somente nos caminhos enumerados |
| `output/playwright/` | Evidência e recursos ativos misturados: capturas, resultados, roteiros, ZIPs e fixtures | Links de relatórios e leitores dinâmicos dos runners | Todos preservados, inclusive ZIPs ignorados |
| `.github/`, Docker, deploy, manifests e lockfiles | Ativo/protegido | CI; Docker COPY; Render/Vercel; npm | Nenhuma alteração; Dockerfile continua com job ativo |
| `node_modules/` e dependências dos pacotes | Uso necessário ou incerto; reinstalação integral não comprovada | Resolução Node, inclusive fallback entre diretórios | Preservados na origem e snapshot |
| `dist/`, `.next*` | Gerado; há consumidores de execução/ensaios | Nest, Next e launchers específicos | Builds preservados; caches apenas omitidos da cópia |
| `.f7-artifacts/`, `.f8-artifacts/`, `.f12-artifacts/` | Privado: backups, perfis, logs e evidências | Scripts de backup/recuperação e fases | Preservados, sem exposição de conteúdo |
| `.playwright-cli/`, `.playwright-mcp/` | Evidência/ferramentas locais; uso incerto por item | Automação de navegador e sessões | Preservados |
| `.env*`, `.devin/`, `.vscode/` | Configuração local necessária ou de uso incerto | Inicialização e ferramentas locais | Preservados; nenhum segredo no relatório |
| `.git/` | Ativo/protegido | Git e estado do índice | Cópia verificada; índice e HEAD originais intactos |
| `scripts/`, `frontend/src app/` | Vazios, uso incerto | Origem/consumidor externo não comprovados | Mantidos sem alteração |

## Documentação canônica e mudanças por lote

As entradas são [README](../../README.md) e [docs/README](../README.md). [Arquitetura atual](../development/ARQUITETURA.md), [Desenvolvimento](../development/DESENVOLVIMENTO.md) e [Operação local](../deployment/OPERACAO_LOCAL.md) apontam para código, configuração e scripts efetivos. Cada um distingue o uso habitual dos ensaios com escrita em fixtures.

Os documentos [08](../notion/Engenharia_Reversa_Notion_Biblioteca/08_Requisitos_e_Historias.md) e [14](../notion/Engenharia_Reversa_Notion_Biblioteca/14_Rastreabilidade_e_Testes.md) continuam fontes da especificação e dos IDs; os 26 RF, CT e dez QA não foram reescritos. [F12-testes](../notion/execucao/F12-testes.md) continua sendo a matriz final. Relatórios F8–F12, aceites humanos e evidências únicas mantiveram seus bytes.

| Lote | Caminho | Ação |
|---|---|---|
| lote1 | [README.md](../../README.md) | documentation-update |
| lote1 | [README.md](../README.md) | documentation-update |
| lote1 | [development/ARQUITETURA.md](../development/ARQUITETURA.md) | documentation-add |
| lote1 | [development/DESENVOLVIMENTO.md](../development/DESENVOLVIMENTO.md) | documentation-add |
| lote1 | [deployment/OPERACAO_LOCAL.md](../deployment/OPERACAO_LOCAL.md) | documentation-add |
| lote1 | [development/TEST_PLAN.md](../development/TEST_PLAN.md) | documentation-update |
| lote1 | [development/prompts-biblioteca-estudos.md](../development/prompts-biblioteca-estudos.md) | documentation-update |
| lote1 | [deployment/HOMOLOGACAO.md](../deployment/HOMOLOGACAO.md) | documentation-update |
| lote1 | [deployment/PRODUCAO.md](../deployment/PRODUCAO.md) | documentation-update |
| lote1 | [notion/Organizacao_e_Limpeza_Biblioteca_Pos_F12.md](../notion/Organizacao_e_Limpeza_Biblioteca_Pos_F12.md) | documentation-update |
| lote1 | [archive/ORGANIZACAO_POS_F12.md](ORGANIZACAO_POS_F12.md) | documentation-add |
| lote2 | [notion/Analise_Notion_Biblioteca_de_Estudos.md](../notion/Analise_Notion_Biblioteca_de_Estudos.md) | replace-with-pointer |
| lote2 | [archive/Analise_Notion_Biblioteca_de_Estudos_v1_2026-11-10.md](Analise_Notion_Biblioteca_de_Estudos_v1_2026-11-10.md) | archive-exact-original |

No lote 1, os avisos editoriais apontam para sucessores, conservando byte a byte os corpos dos cinco guias/levantamentos anteriores. O plano antigo de testes continua em seu caminho, consumido também por `backend/scripts/f8-reference.cjs`. Os planos hospedados não foram apresentados como validação operacional atual.

No lote 2, os **15 corpos técnicos** da análise contínua foram encontrados integralmente nos documentos separados, normalizando apenas CRLF/LF para comparar texto. O restante contém introdução e separadores, sem conteúdo técnico exclusivo. O original de **131.141 bytes** foi movido primeiro para:

`quarantine/lote2/docs/notion/Analise_Notion_Biblioteca_de_Estudos.md`, sob a raiz privada da rodada.

Uma cópia idêntica permanece no [arquivo histórico](Analise_Notion_Biblioteca_de_Estudos_v1_2026-11-10.md). SHA-256 completo do original, quarentena e arquivo histórico: **`a1a1ff10e02727da236b0fe08a7353a8dc2b38d3a9862fb6a679f3847c4bd341`**. O caminho anterior mantém apontador e **139 âncoras de títulos**. A quarentena não foi descartada.

## Candidatos mantidos e evidência faltante

Os hashes abaixo são prefixos de 12 caracteres para leitura; os hashes integrais e os metadados estão nos manifestos privados. Para os sete logs/.bat, o usuário confirmou **origem/uso incerto**. Quatro logs vazios, uma saída de 136 bytes e dois .bat idênticos não constituem, por si, prova de dispensa.

| Caminho | Classe | Bytes antes | SHA-256 antes (prefixo) | Ação |
|---|---|---:|---|---|
| `jest-out.txt` | uso incerto | 0 | `e3b0c44298fc` | preservar |
| `test-output.txt` | uso incerto | 0 | `e3b0c44298fc` | preservar |
| `backend/jest-out.txt` | uso incerto | 136 | `0628c1d6a8b4` | preservar |
| `backend/jest-err.txt` | uso incerto | 0 | `e3b0c44298fc` | preservar |
| `backend/test-output.txt` | uso incerto | 0 | `e3b0c44298fc` | preservar |
| `run-test.bat` | uso incerto | 294 | `d09722ff4840` | preservar |
| `backend/run-test.bat` | uso incerto | 294 | `d09722ff4840` | preservar |
| `frontend/public/file.svg` | candidato sem uso comprovado | 391 | `2b67812c325c` | preservar; uso incerto por URL |
| `frontend/public/globe.svg` | candidato sem uso comprovado | 1035 | `b614b9bf1839` | preservar; uso incerto por URL |
| `frontend/public/next.svg` | candidato sem uso comprovado | 1375 | `55995dfad6ec` | preservar; uso incerto por URL |
| `frontend/public/vercel.svg` | candidato sem uso comprovado | 128 | `f081337b2fee` | preservar; uso incerto por URL |
| `frontend/public/window.svg` | candidato sem uso comprovado | 385 | `644768c4aaeb` | preservar; uso incerto por URL |
| `files.zip` | uso incerto | 8809 | `ac1b62ecd407` | preservar privado |
| `docs/notion/Analise_Notion_Biblioteca_de_Estudos.md` | histórico | 131141 | `a1a1ff10e027` | quarentena privada + original arquivado + apontador |
| `docs/development/TEST_PLAN.md` | histórico | 2477 | `725ae10ea5a1` | adicionar aviso e sucessor |
| `docs/development/prompts-biblioteca-estudos.md` | histórico | 9057 | `4af4ac252879` | adicionar aviso e sucessor |
| `docs/deployment/HOMOLOGACAO.md` | histórico | 18071 | `4661f4435210` | adicionar aviso e sucessor |
| `docs/deployment/PRODUCAO.md` | histórico | 26862 | `15b02d4769ac` | adicionar aviso e sucessor |
| `docs/notion/Organizacao_e_Limpeza_Biblioteca_Pos_F12.md` | histórico | 10247 | `2ec3811a7906` | adicionar aviso e sucessor |

Os SVGs são arquivos rastreados, servidos diretamente por URL. A busca sem ocorrências diretas não resolve referências externas, URLs montadas ou dados armazenados. `files.zip` permaneceu privado porque sua origem e substituto não foram comprovados. Diretórios vazios e dependências de raiz também permaneceram por incerteza. Não houve limpeza de espaço por exclusão de recursos de aplicação.

A investigação cruzou `rg` (incluindo ocultos relevantes), scripts npm, CI, Docker COPY/ignore, Render/Vercel, globs Jest/TypeScript/ESLint, imports/require dinâmicos, convenções Next, recursos por URL e links Markdown. Runners F12 leem roteiros/resultados por nomes montados; `output/playwright/` não foi tratado como saída descartável. Nenhum inventário remoto foi usado para substituir a cópia F12. Consumidores fora do repositório não foram presumidos ausentes.

## Verificações executadas e limites

Baseline em `baseline/`, cópia física isolada do snapshot, sem reinstalação de pacotes. Node **24.13.0**, npm **11.6.2**, mesmo Windows e dependências instaladas da referência. As seis seleções de `node backend/scripts/f12.cjs checks <nome>` foram executadas antes de qualquer alteração documental:

| Check | Resultado | Evidência resumida |
|---|---|---|
| `backend-tests` | Aprovado | Test Suites: 29 passed, 29 total; Tests:       168 passed, 168 total |
| `backend-http-mocked` | Aprovado | Test Suites: 1 passed, 1 total; Tests:       26 passed, 26 total |
| `backend-lint` | Aprovado | Script existente, saída privada |
| `frontend-tests` | Aprovado | Test Suites: 19 passed, 19 total; Tests:       141 passed, 141 total |
| `frontend-lint` | Aprovado | Script existente, saída privada |
| `frontend-build` | Aprovado | Script existente, saída privada |

`backend-tests` incluiu build Nest, 29 suítes e 168 testes com PostgreSQL/MinIO de fixtures. HTTP simulado teve 26 testes; frontend, 19 suítes e 141 testes. O build frontend usou configuração F12. As escritas foram restritas ao banco `biblioteca_test_f8_f12_20261117` e bucket `biblioteca-test-f7-f8-f12-20261117`; não houve prepare, seed, migração habitual ou recuperação do acervo habitual.

| Verificação documental/preservação | Antes | Depois |
|---|---|---|
| Links locais e capitalização | 209 links; sem problemas | 363 links; sem problemas |
| Fragmentos locais examinados | 2; válidos | 2; válidos, mais âncoras antigas verificadas explicitamente |
| `git diff --check` | Aprovado | Aprovado após corrigir linhas finais extras do lote 1 |
| Hashes dos arquivos originais | 80.324 registrados/verificados na cópia | **80316 idênticos**; **8 mudanças documentais previstas**; nenhum desvio não previsto |
| Novos arquivos | — | **5**, todos previstos nos lotes |
| Manifesto histórico F12 | 330/330 idênticos | **328/330 idênticos**; somente README e docs/README mudaram intencionalmente |
| Git/índice | Snapshot e fsck aprovados | Índice, entradas staged e HEAD preservados |
| Restauração | Seis amostras antes do primeiro lote | **13 caminhos** ensaiados em cópia: oito arquivos anteriores recuperados e cinco novos removidos |

Os dois lotes passaram na auditoria de links separadamente. A auditoria final também procurou colisões de capitalização nos caminhos públicos do Git; nenhuma foi encontrada. O protótipo HTML foi examinado como HTML, evitando interpretar chamadas JavaScript como links Markdown.

A restauração recusou uma edição posterior simulada antes de modificar qualquer outro arquivo; depois passou em dry-run e aplicação na cópia de ensaio. Nenhum comando de restauração foi aplicado à árvore de trabalho real.

Verificação de instalação: o dry-run offline inicial, no sandbox restrito, falhou com mensagem de ausência de `@emnapi/runtime` no lockfile. A repetição na cópia isolada autorizada retornou **0**, inclusive com o mesmo `npm.cmd` 11.6.2. A falha inicial não foi reproduzida nesse contexto; não foi atribuída uma causa sem prova nem tratado o lockfile como incompatível confirmado. Nenhuma instalação limpa foi executada. Lockfiles permaneceram intactos; build/testes aprovados comprovam esta instalação, não a recriação integral de suas dependências. Os dois resultados e seus contextos ficam registrados, com logs da repetição no armazenamento privado.

A consulta Docker no sandbox foi negada durante a exploração; os serviços prontos foram alcançados pelas integrações na cópia autorizada. Não foi executado build Docker, deploy ou administração de volumes.

Não se repetiram aceites humanos, Android, IME, desempenho, jornadas browser ou restauração de banco da F12: os lotes alteram somente documentação, não fontes, assets públicos, globs ou consumidores executáveis. Os caminhos e bytes das evidências correspondentes foram conferidos. A ausência dessa repetição não constitui nova homologação dos fluxos ou garantia absoluta.

## Como desfazer sem perder trabalho posterior

Os manifestos enumeram somente caminhos destes lotes. O helper privado verifica todos os hashes antes de escrever, recusa edições posteriores/alteração do índice, restaura arquivos anteriores do snapshot e remove somente os cinco arquivos novos explicitamente enumerados. Não usa reset, git clean, remoção recursiva, restauração de volumes ou alteração de banco/storage.

Em PowerShell, primeiro faça a conferência:

```powershell
$rodadaBiblioteca = Join-Path $env:LOCALAPPDATA 'BibliotecaDeEstudos\pos-f12\20261117-144759'
node (Join-Path $rodadaBiblioteca 'tools\restore.cjs') all --check
```

Para restaurar os dois lotes, executar o mesmo comando sem `--check`. Também é possível selecionar `lote2` e depois `lote1`, nessa ordem, primeiro com `--check`. Caso haja recusa por edição posterior, comparar os arquivos com o snapshot e preservar a edição; não forçar sobrescrita. A cópia inicial do índice continua disponível privadamente, mas o helper não a sobrescreve.

Logs completos, status, patches, inventário, resultados e helpers permanecem sob a raiz privada. Este relatório e os índices contêm somente metadados necessários à revisão; não contêm dumps, tokens ou conteúdo pessoal. O resultado demonstra o recorte verificado e a possibilidade de reversão, sem declarar segurança absoluta.

## Exclusão comprovada de artefatos gerados

Continuação executada em **17/11/2026**, America/Fortaleza, mediante o pedido posterior de exclusão efetiva e medição. Esta seção registra os três novos lotes; a rodada documental acima permanece como histórico. Não foi repetida a organização já concluída.

### Referência, inventário e checkpoint

Branch/HEAD continuam `refactor/cleanup-general` / `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`. A cópia homologada foi revalidada: 328 arquivos do manifesto F12 continuam idênticos e as duas diferenças são os índices documentais já alterados na rodada anterior. As 13 migrações estão presentes.

O checkpoint desta continuação fica em `%LOCALAPPDATA%\BibliotecaDeEstudos\pos-f12\20261117-154100-exclusao`. É incremental: referencia o snapshot verificado `20261117-144759/snapshot`, herdou **80.314 arquivos idênticos** e copiou **33 arquivos novos/diferentes**, incluindo a documentação atual e metadados automáticos do Codex/Git. Capturou **80.347 arquivos**, status, patches staged/unstaged, lista de ignorados e índice. As diferenças de refs auxiliares estão registradas; HEAD, branch e índice não foram reescritos.

Seis amostras passaram antes das exclusões: relatório atual, teste não rastreado, migração não rastreada, BUILD_ID F10, página compilada F11 e índice. Os arquivos não-cache de cada candidato tiveram seu backup inteiro conferido por hash. Os seis pequenos metadados de cache F10/F11 foram copiados adicionalmente para restauração exata; tabelas binárias recriáveis do Turbopack não foram duplicadas. Preserve as duas pastas privadas: a nova referência depende do snapshot e das dependências físicas da anterior.

O inventário privado `candidates.json` classifica cada um dos arquivos removidos com caminho, tamanho, SHA-256, origem, consumidor, backup ou comando de regeneração. O inventário por pastas da rodada anterior continua válido para os grupos mantidos, com estas reclassificações:

| Grupo | Classificação e evidência | Decisão |
|---|---|---|
| `.next-f10`, `.next-f11` | Gerados; manifests confirmam distDir, documentação F10/F11 fornece os comandos; nenhum Next/servidor de frontend ativo | Excluir somente após restauração, regeneração e smoke isolados |
| `.next/cache/turbopack` | Cache binário do Next 16.4.5; arquivos SST/meta/del e índices internos classificados | Excluir após build frio recriar o cache |
| `.next/cache/_events_*.json` | Eventos pendentes; origem e consumidor identificados no telemetry/storage.js do Next | Cinco arquivos preservados no caminho original, com hashes conferidos |
| Demais dados de `.next/` | Build corrente, tipos, dados de desenvolvimento e logs | Preservados; não foi excluída a pasta inteira |
| `.next-f12`, `backend/dist` | Referência F12 e API em uso, PID 15020/porta 3067 | Preservados; nenhum processo do usuário encerrado |
| Cobertura | Nenhuma pasta coverage encontrada nos três locais examinados | Zero remoções e zero ganho atribuídos |
| Dependências, cache Prisma e ferramentas locais | Backend em uso; reinstalação integral e regeneração dos demais candidatos não ensaiadas | Mantidos, sem alterar manifests ou lockfiles |
| Logs/.bat, SVGs, ZIPs, backups e diretórios mistos | Incertezas e consumidores/evidências da rodada anterior permanecem | Mantidos; sem deduzir dispensa de uma busca vazia |

### Caminhos excluídos, origem e recuperação

Foram excluídos **474 arquivos**, somando **211.215.340 bytes lógicos (201,43 MiB)**, somente nestes três caminhos ignorados. A soma se refere ao mesmo grupo de artefatos locais; não inclui fontes, histórico Git ou medidas de bundle.

| Lote | Caminho | Arquivos | Bytes lógicos | SHA-256 da listagem caminho/tamanho/hash |
|---|---|---:|---:|---|
| exclusao-1 | `frontend/.next-f10` | 223 | 51996958 | `a7ac7d7375fd02d9243939fd879eec6d60c868dce938d9887219633230369eb4` |
| exclusao-2 | `frontend/.next-f11` | 218 | 53914487 | `4e20a2564b6f10d9c559b1442f0b842eb0a1d0dd701c6aec3fce609bb53576e1` |
| exclusao-3 | `frontend/.next/cache/turbopack` | 33 | 105303895 | `b5eba78ff3e42be37b9add41077e95e4fb3e2146da26629d9615eccf48709eb8` |

Os hashes individuais completos estão no manifesto privado. A exclusão verificou cada caminho absoluto resolvido e rejeitou symlinks/junctions; o conteúdo foi comparado ao inventário antes da remoção. Arquivos e diretórios foram removidos pela lista enumerada, sem git clean/reset, remoção genérica, atualização de dependências ou comandos de volumes.

Fontes efetivas: [next.config.ts](../../frontend/next.config.ts), [manifest frontend](../../frontend/package.json), [F10-testes](../notion/execucao/F10-testes.md), [F11-testes](../notion/execucao/F11-testes.md) e [f11-checks.cjs](../../backend/scripts/f11-checks.cjs). Os guias instalados do Next sobre distDir e cache CI e seu código de telemetria também foram inspecionados. A ausência de servidores foi conferida imediatamente antes de cada lote; a API F12 permaneceu disponível.

Recriação confirmada em cópia isolada, para cada `NEXT_DIST_DIR=.next-f10`, `.next-f11` ou `.next`: `node node_modules/next/dist/bin/next build`, com `NODE_ENV=production`, `ALLOW_LOOPBACK_IN_BUILD=true` e os destinos de fixtures documentados. Os testes privados desabilitaram somente a telemetria das ferramentas, de modo igual antes/depois. As três compilações frias recriaram cache e iniciaram com HTML HTTP 200 e quatro arquivos estáticos válidos cada. Antes delas, os três builds restaurados sem tabelas binárias de cache também iniciaram e passaram no mesmo smoke.

### Comparação e verificações

Baseline atual, antes de excluir: **335 testes aprovados** (168 backend real, 26 HTTP simulado, 141 frontend), builds e lints. A cópia isolada usou as fontes atuais e dependências físicas já preservadas, via três junções **somente no diretório privado**; não criou outra cópia de node_modules. Os caminhos de exclusão na árvore real não contêm junções.

Depois da retirada, lint, build/tipos frontend e smoke F12 foram aprovados. A primeira execução dos testes frontend teve **140/141 aprovados**: o teste de navegação não encontrou o botão da página após localizar o título da coleção. Sem alterar código/testes ou recolocar artefatos, a suíte de navegação passou isoladamente e a suíte completa passou com **141/141**. A primeira falha e as repetições foram mantidas nos logs; sua causa não foi estabelecida. Não é declarado sucesso de primeira tentativa nem corrigida uma hipótese de problema de produto nesta limpeza.

A remoção não tem consumidor backend: não se repetiram suas integrações após o lote, pois seus arquivos permaneceram idênticos; a baseline atual as executou em fixtures. API/banco/bucket habituais, migrations, volumes e storage não receberam comandos desta limpeza. As integrações usaram exclusivamente os destinos fixos de fixtures F12. Aceites humanos, Android/IME e benchmarks não foram repetidos.

Conferência dos ativos protegidos: **77246 arquivos idênticos** ao checkpoint e **duas atualizações documentais previstas**, **358 ausências não-cache previstas** dos builds excluídos, nenhum desvio não previsto; metadados auxiliares Git são contabilizados separadamente e o índice/stage/HEAD foram comparados explicitamente. Os 328 arquivos F12 protegidos, os relatórios, os roteiros, capturas e ZIPs de evidência mantiveram seus hashes. Metadados/eventos no cache padrão foram mantidos.

O ensaio final do helper de restauração passou em cópia privada: arquivos não-cache e metadados recuperados com hashes originais; caches binários regenerados; os três builds restaurados passaram no smoke. **As tabelas binárias recriadas não têm promessa de identidade de bytes com os caches antigos.** Não se aplicou restauração à árvore real. Conferência final: 370 links locais, capitalização/fragmentos válidos e git diff --check aprovado.

### Medição de espaço sem somar grupos

| Medida e definição | Antes | Depois / variação |
|---|---:|---:|
| Arquivos do checkout: rastreados + não rastreados não ignorados; exclui dependências, gerados ignorados e Git | 16337432 bytes | 16349191 bytes; 11759 bytes de variação documental |
| Artefatos locais ignorados, apenas os três candidatos acima | 211.215.340 bytes lógicos | 0 bytes nesses caminhos após a exclusão |
| Espaço disponível no volume C:, medido no início e ao finalizar | 34706886656 bytes | 34860445696 bytes; saldo observado 153559040 bytes (146,45 MiB) |
| Novas cópias/manifestos/logs mantidos na pasta privada desta continuação, sem seguir junções | 0 | 45163372 bytes lógicos |
| Tamanho do bundle de produção | Não medido | Não houve alteração de fontes/conteúdo; não é uma otimização de bundle |

A leitura inicial do volume foi feita em 17/11/2026 às 15:33:51 (America/Fortaleza), antes das novas cópias. A leitura final é de **17/11/2026, 16:12:47**. O saldo disponível **já desconta** as novas cópias, logs e documentos mantidos no mesmo volume; não foi somado aos bytes lógicos excluídos. Compilações e restaurações de ensaio geraram temporários, mas seus diretórios enumerados foram removidos antes da leitura final. A variação de todo o volume também pode refletir atividade externa e alocação do filesystem, portanto não é atribuída integralmente à limpeza. Cópias antigas já existentes não foram contadas como novos ganhos nem descartadas.

O checkout cresceu apenas pelo complemento documental. Excluir os diretórios ignorados libera armazenamento local sem alterar o conteúdo versionável. Nenhum objeto foi removido do histórico Git. Mover o documento na rodada anterior, no mesmo volume, não foi contabilizado como espaço liberado.

### Restaurar esta continuação

O índice documental recebeu somente um apontador para esta seção. Os dois documentos alterados foram copiados antes da edição. O helper verifica seus hashes, o índice e a ausência dos destinos; recusa caminhos recriados ou edições posteriores nesses documentos. Mantém as fontes atuais e não sobrescreve o índice.

```powershell
$rodadaExclusao = Join-Path $env:LOCALAPPDATA 'BibliotecaDeEstudos\pos-f12\20261117-154100-exclusao'
node (Join-Path $rodadaExclusao 'tools\restore-cleanup.cjs') --check
```

Para restaurar, executar o mesmo comando sem `--check`. Os dois builds antigos voltam dos backups byte a byte, incluindo seus metadados, e as tabelas binárias de cache são regeneradas em isolamento antes da cópia. Somente após desfazer esta continuação se deve usar o helper documental anterior; do contrário, ele recusará o relatório/índice que receberam novas edições. Nenhum item da quarentena anterior foi descartado.

Todos os manifestos, logs da falha/repetições, processos/portas sanitizados, fontes herdadas e resultados de restauração permanecem privados. Este complemento documenta o que foi executado e suas limitações; não representa garantia absoluta.
