# Organização e limpeza da Biblioteca de Estudos após a F12

> **Levantamento anterior — referência remota e prompt de execução.** As limitações e propostas abaixo descrevem aquela análise. O inventário da cópia local F12 e a organização efetivamente realizada estão no [relatório pós-F12](../archive/ORGANIZACAO_POS_F12.md).

## O que foi possível conferir

A árvore remota de `refactor/cleanup-general` em `f87fdbcda593e7005ea43eaa229bb8b09cbc9990` tem 130 entradas, contando diretórios. Nela há três migrações SQL. A F12 relata 13 migrações e uma cópia de trabalho com mudanças locais e arquivos não rastreados. A árvore remota ajuda a entender a estrutura anterior, mas não fornece o inventário da versão homologada. Neste levantamento, nenhum arquivo do projeto foi movido ou removido.

Na versão remota, há duas dependências concretas que impedem classificações por aparência:

- `backend/Dockerfile` participa de um job ativo do CI, apesar de o deploy no Render usar o runtime nativo.
- `backend/scripts/validate-phase1.ts` é chamado pelo script `validate:phase1` de `backend/package.json`. O nome indica sua origem, mas não comprova que ficou dispensável.

Os SVGs do template em `frontend/public/` são candidatos a investigação por URL, CSS, JavaScript e configuração. Nomes genéricos e falta de import direto não autorizam remoção.

## Mapa inicial e destino recomendado

| Local | O que contém ou representa | Como classificar |
|---|---|---|
| `README.md` na raiz | Entrada para entender, instalar e executar o projeto | Ativo. Tornar curto e linkar o mapa e os guias canônicos. |
| `frontend/src/app/` | Rotas Next.js, telas, componentes, estilos, editor e testes próximos do código | Ativo. Documentar as responsabilidades atuais sem reorganizar caminhos de runtime neste ciclo. |
| `frontend/public/` | Arquivos servidos diretamente por URL | Ativo por padrão. Auditar cada candidato, inclusive caminhos escritos em Markdown, CSS ou montados em runtime. |
| `backend/src/` | Módulos NestJS e regras de autenticação, páginas e arquivos | Ativo. Descrever responsabilidades conforme os módulos da cópia F12. |
| `backend/prisma/` | Schema, histórico de migrações e lock do provedor | Protegido. Preservar migrações aplicadas e sua ordem, inclusive as antigas. |
| `backend/test/`, testes junto dos módulos, `backend/scripts/` | Testes, manutenção, validação e reprodução das entregas | Classificar por script e pelo processo que o chama. Roteiros F8–F12 podem ser parte da reprodução de evidências. |
| `.github/workflows/`, Dockerfiles, Compose, configurações Render/Vercel, manifests, lockfiles e exemplos de ambiente | Compilação, CI, infraestrutura, instalação e configuração | Ativos ou protegidos. Comprovar dependência pelo consumidor real antes de propor mudança. |
| `docs/README.md`, `docs/development/`, `docs/deployment/` | Índice de documentos, orientação de desenvolvimento e operação | Reutilizar a estrutura existente. Manter fonte canônica por assunto, com links de entrada. |
| `docs/archive/` e relatórios das fases | Histórico de decisões, implementações, correções e testes | Arquivar sob referências estáveis quando perderem função operacional. Manter requisitos e critérios vigentes acessíveis pela documentação ativa. |
| Relatórios finais F12, matriz, aceite humano, resultados e manifesto de fontes | Evidências da homologação local | Preservar e manter a cadeia de links verificável. Distinguir os artefatos presentes daqueles apenas citados. |
| `output/playwright/` | Roteiros, resultados e capturas citados pela homologação | Pasta mista. Inventariar individualmente roteiro reutilizável, evidência única, duplicata e saída regenerável. |
| `.f8-artifacts/`, `.f12-artifacts/` e equivalentes | Backups, perfis, arquivos de teste, logs e outros dados locais | Privado. Separar itens recuperáveis de backups e evidências únicas. Manter fora de commits e arquivos para compartilhamento. |
| `node_modules/`, `dist/`, `.next*/`, `coverage/` | Dependências instaladas e saídas de geração | Candidatos à limpeza quando comprovadamente recriáveis, sem consumidor em execução e sem evidência exclusiva. |

Os caminhos acima são os observados no remoto ou citados nos relatórios. A organização física definitiva depende do inventário local. O mapa deve atribuir a cada pasta seu propósito, origem da informação, o que é editável, o que é gerado e qual arquivo deve ser consultado primeiro.

## Prompt para executar na cópia F12

```text
Trabalhe no repositório local Biblioteca_de_Estudos que foi homologado na F12.
Organize a documentação e limpe recursos comprovadamente dispensáveis.
Preserve comportamento, APIs, schemas, dados e o trabalho local existente.
Faça o inventário, aplique mudanças reversíveis comprovadas e verifique o resultado.

1. Identifique a referência correta.
   Leia AGENTS.md e instruções aplicáveis. Registre branch, HEAD, git status,
   diferenças staged/unstaged e arquivos não rastreados. Distinga ignorados
   gerados de arquivos locais necessários. Confira a presença dos arquivos
   e migrações da F12 e, quando disponível, seu manifesto. Um checkout de HEAD
   ou um git archive de HEAD não contém a versão homologada por si só.
   Se a cópia F12 estiver ausente, documente o inventário possível e preserve
   a cópia antiga para evitar uma limpeza baseada na versão errada.

2. Crie uma referência reversível antes de mover arquivos.
   Preserve a cópia de trabalho atual, incluindo arquivos não rastreados
   relevantes e o estado do índice. Faça um snapshot restaurável ou cópia
   isolada verificada. Registre caminhos e hashes dos arquivos candidatos.
   Mantenha .env, credenciais, dumps, perfis e mídias pessoais em armazenamento
   privado. Não dependa apenas de um patch para recuperar arquivos não
   rastreados. Evite copiar dependências e caches que tenham regeneração
   comprovada. Verifique a restauração por amostragem antes do primeiro lote.

3. Faça o inventário por pasta e por candidato à limpeza.
   Registre caminho, conteúdo, origem verificável, gerador ou consumidor,
   classificação, evidência, ação proposta e como desfazer.
   Classifique como ativo, histórico, evidência, gerado recriável, candidato
   sem uso comprovado ou uso incerto. Preserve itens de uso incerto.
   Cruze rg com manifests/scripts npm, CI, configurações de deploy, Docker
   COPY, globs de build/teste, imports dinâmicos, rotas Next.js, recursos
   por URL, links Markdown, scripts de backup e referências fora do repo.
   Cheque diferenças de maiúsculas entre Windows e Linux. Zero ocorrências
   em uma busca textual não basta para concluir que um item é dispensável.

4. Organize a documentação existente.
   Atualize README.md e docs/README.md como pontos de entrada.
   Use o índice de docs para localizar arquitetura, setup/testes e operação.
   Para cada assunto, escolha um documento principal e indique a fonte
   efetiva, como config, script, especificação ou relatório verificado.
   Rotule guias superados como históricos e aponte para o sucessor. Reaproveite
   docs/development, docs/deployment e docs/archive onde fizer sentido.
   Preserve os 26 requisitos, IDs de critérios, relatórios F8–F12, matriz
   final, scripts de reprodução e evidências únicas com seus links.
   Se mover um documento, ajuste os links e preserve o caminho anterior
   com apontador quando necessário. Não reescreva resultados históricos
   nem trate dados de teste como instruções da operação habitual.

5. Aplique a limpeza em lotes pequenos.
   Primeiro índices e documentação redundante com substituto identificado.
   Depois candidatos comprovados, inicialmente em quarentena local fora do
   repositório, com mapa caminho original → destino e hashes. Mova apenas
   caminhos enumerados. Preserve scripts com consumidores, fontes, fixtures
   e evidências únicas. Não mova pastas da aplicação por organização estética
   nem atualize dependências ou lockfiles nesta rodada.
   Preserve migrações, volumes, banco, storage, backups, segredos e Git.
   Evite git clean, reset, remoção em massa e comandos de limpeza de volumes.
   Não publique nem encaminhe backups. Não descarte definitivamente itens
   em quarentena nesta rodada. Se o candidato não tiver prova suficiente,
   mantenha-o e descreva a evidência que falta.

6. Compare antes e depois na mesma versão e ambiente.
   Registre a baseline dos checks antes das alterações em cópia isolada.
   Valide links locais e caminhos por consumidor no lote de documentação.
   Para arquivos com efeito em build, execução ou ensaios, use scripts
   existentes e repita lint, tipos/build, testes ou smoke pertinentes.
   Use banco/bucket de fixtures quando houver escrita. Avalie os fluxos
   afetados e os roteiros F12 relevantes, incluindo os caminhos de evidência.
   Confira git diff --check, escopo do diff, inventário e hashes dos ativos
   protegidos. Se um lote causar falha, reverta só esse lote e mantenha
   as alterações anteriores do usuário. Se um check material não puder
   rodar ou já estiver falhando na baseline, retenha os candidatos que
   dependem dele e registre a limitação.

7. Entregue o índice atualizado e um relatório único da rodada.
   Informe referência exata, árvore de pastas, fonte de cada grupo,
   documentação canônica, histórico e itens em quarentena. Liste caminhos
   que mudaram, motivo, evidência, validação e como restaurar cada lote.
   Distinga verificações executadas de verificações bloqueadas. Não
   declare 100% de segurança. Demonstre o que foi preservado e restaurável.
```

## Referências

- [Árvore remota de referência](https://github.com/Erik02T/Biblioteca_de_Estudos/tree/f87fdbcda593e7005ea43eaa229bb8b09cbc9990)
- [CI com job de Docker ativo](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/f87fdbcda593e7005ea43eaa229bb8b09cbc9990/.github/workflows/ci.yml)
- [Scripts do backend na referência remota](https://github.com/Erik02T/Biblioteca_de_Estudos/blob/f87fdbcda593e7005ea43eaa229bb8b09cbc9990/backend/package.json)
- [F12.md](https://chatgpt.com/library?file_id=libfile_9d455975a2c48191b15be5414ce1409e&account_id=personal)
- [F12-testes.md](https://chatgpt.com/library?file_id=libfile_52c38609a00c8191bdb493e8cf80d044&account_id=personal)
