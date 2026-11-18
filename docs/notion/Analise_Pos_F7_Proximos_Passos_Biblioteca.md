# Biblioteca de Estudos — análise após F7 e próximos passos

Data: 13/11/2026. Natureza: auditoria documental e orientação de produto; nenhuma implementação, migração ou publicação realizada nesta análise.

## 1. Conclusão

A Biblioteca já possui uma base funcional substancial, com recursos de organização, edição, arquivos, modelos, visualizações, exportação e versões. A evidência mais consistente está nas integrações reais e nas correções descritas na F7. O próximo ciclo deve concentrar-se em concluir os comportamentos do escopo original e integrar a experiência de navegação e escrita.

As sete fases não eram destinadas somente à infraestrutura: o plano original incluía uma versão simplificada utilizável, com árvore lateral, comandos `/`, operações por bloco e referências no conteúdo. Algumas dessas entregas foram declaradas concluídas com uma verificação mais estreita que seus critérios. Portanto, parte do próximo trabalho é conclusão do escopo anterior, além do refinamento visual.

Não há fundamento para calcular um percentual de conclusão. Contagem de fases e quantidade de testes não medem cobertura funcional integral.

## 2. O que foi efetivamente analisado

- Os 20 relatórios fornecidos, de `F0-testes.md` a `F7-correcoes.md`, incluindo os acréscimos posteriores às tabelas históricas.
- A especificação original, especialmente os requisitos do documento 08 e o planejamento do documento 12.
- As branches remotas e a árvore/schema de `refactor/cleanup-general` no GitHub.
- Documentação oficial do Notion sobre edição por blocos e subpáginas, apenas como referência de interação.

A branch remota consultada continua no commit `f87fdbcda593e7005ea43eaa229bb8b09cbc9990`. Seu schema não contém as evoluções relatadas. Os próprios registros F7 dizem que o trabalho está na working tree local, sem commit/push. Isso é compatível com mudanças locais ainda não disponíveis para esta inspeção; não significa que elas não existam.

Não executei as suítes da aplicação, não examinei os arquivos locais de implementação do seu computador e não inspecionei a interface atual em funcionamento. Nesta análise, “evidência forte” significa relato específico de reprodução e verificação, não uma nova execução independente. Para a auditoria direta, a referência necessária é um snapshot do código atualizado — commit acessível ou arquivo do projeto sem segredos, dependências instaladas e dados pessoais.

## 3. O que foi construído, por etapa

| Etapa | Entrega documentada | Leitura atual |
|---|---|---|
| F0 | Levantamento do estado inicial e verificações existentes | A verificação inicial era parcial. Backup e recuperação ganharam evidência concreta na F7. |
| F1 | Persistência, metadados e revisão obrigatória no salvamento | A proteção atômica contra sobrescrita foi efetivamente corrigida na F7. Criação idempotente e recuperação entre reinícios continuam sem comprovação completa. |
| F2 | Parentesco, validações de hierarquia e seleção de página mãe | F7 corrigiu movimento de ramos, ciclos concorrentes e URL persistente. Árvore visual e caminho completo ainda precisam de aceite específico. |
| F3 | Reaproveitamento do editor Tiptap e correção de checklist | O relatório não demonstra toda a experiência de `/`, menu de blocos, código e anexos no corpo. É a maior área de investigação para a experiência de escrita. |
| F4 | Busca, favoritos, recentes, lixeira e campo de referência entre páginas | F7 corrigiu lixeira por lote. A referência descrita em F4 é um campo da página, com limitações expressas quanto aos blocos e renomeação. |
| F5 | Capa, largura, ordem de páginas, duplicação, alternantes e destaques | Há implementação relatada; independência de mídias, operações no editor e equivalência de arrastar/menu/teclado precisam de verificação integral. |
| F6 | Tabela, quadro, configurações e modelos | Há integrações de serviços; a experiência conjunta das visualizações e a independência completa das cópias não estão homologadas. |
| F7 | Exportação ZIP, versões nomeadas, restauração e correções transversais | Evidência mais forte de banco/storage/HTTP/browser. O próprio status final continua “VALIDAÇÃO PARCIAL”. |

O último registro de integração informa **133 testes backend e 31 frontend**, com lint/build aprovados. Uma rodada anterior informa também 26 E2E HTTP com Prisma mockado; esses testes não equivalem aos testes de integração com banco e storage reais e não devem ser somados como indicador de cobertura do produto.

## 4. Problemas antigos que não devem ser reabertos sem regressão

Os registros finais de F7 supersedem as falhas e limitações históricas dos documentos anteriores:

| Problema | Situação documentada mais recente |
|---|---|
| Salvamento aceitava tolerância de cinco minutos e gravava sem comparar revisão | Corrigido: comparação exata e gravação condicional atômica, com revisão monotônica e testes concorrentes reais. |
| Mover pai deixava descendentes na seção anterior | Corrigido: transação estrutural, propagação do ramo e proteção concorrente. |
| Lixeira alterava apenas a página pai | Corrigido: lote de exclusão/restauração; preserva exclusões anteriores. |
| Recarregar perdia a página selecionada | Corrigido: URL `?page=<ID>`, histórico e proteção ao sair com alterações pendentes. |
| Banco local não tinha `deletionBatchId` | Corrigido após backup conjunto, recuperação em clone e aplicação das migrações. Onze migrações registradas no banco local. |
| Alias local `127.0.0.1` falhava por CORS/HMR | Corrigido no cenário reproduzido; cliente de rede e renovação compartilhada de sessão também foram verificados. |

O erro transitório original de `localhost` deixou de ocorrer segundo confirmação do usuário registrada no relatório; sua causa exclusiva não foi demonstrada. Não é correto atribuí-lo automaticamente ao defeito do outro hostname.

Permanece uma ocorrência de ambiente: `prisma generate` retornou EPERM ao substituir uma DLL em uso, embora tipos/runtime e verificações tenham funcionado. A ação é repetir em ambiente controlado sem o bloqueio e obter saída zero, sem encerrar processos alheios indiscriminadamente.

## 5. Diferenças concretas entre escopo e comprovação

### Criação e recuperação — RF-002/014

O escopo pede criação idempotente: se a resposta se perder e a tentativa for repetida, deve existir uma única página. Criar uma página normalmente não testa isso. Também pede recuperação local segregada por usuário. Manter o formulário aberto durante falha de rede e proteger a saída são avanços reais; não comprovam recuperação após fechar e reabrir o navegador.

**Próximo aceite:** interromper a resposta da criação, repetir, confirmar um ID; editar sem rede, encerrar/reabrir e recuperar o rascunho sem sobrescrever uma revisão remota mais nova nem expor o conteúdo a outra conta.

### Navegação visível — RF-003/005

`parentId`, seletor de mãe e URL por ID sustentam a navegação, mas não comprovam árvore lateral navegável, expansão, item selecionado e caminho de ancestrais. A URL com query string já atende ao requisito de identidade; mudar sua estética não é prioridade.

**Próximo aceite:** criar três níveis, navegar por árvore e caminho, mover o ramo e recarregar; seleção, seção e parentesco devem permanecer coerentes.

### Edição por blocos — RF-006–010/021

F3 justifica a conclusão pelo editor existente, JSON e inclusão de checklist. Isso não demonstra os comandos `/`, ações por bloco, conversões seguras, preservação da seleção ou reordenação dos blocos do documento. F5 descreve reordenação de páginas; isso não comprova reordenação de blocos.

**Próximo aceite:** inserir pelo `/` e pelo botão `+`, converter, duplicar, mover e desfazer; salvar/reabrir preservando o conteúdo. Validar código com linguagem, indentação e cópia. Testar entrada japonesa com composição IME real, e não apenas inserir uma string japonesa por automação.

### Referências e materiais no conteúdo — RF-012/013

F4 implementa `Area.targetPageId` e um seletor de referência. O requisito original pede referência dentro do documento, com `targetPageId` e rótulo atualizado ao ler o destino renomeado. A limitação é reconhecida em `F4-correcao.md`. Uma página precisa poder citar teoria, exemplos e exercícios em pontos distintos do texto.

**Próximo aceite:** inserir duas referências no corpo, renomear e mover os destinos, excluir um deles e recarregar. O outro vínculo continua correto e o excluído mostra estado indisponível. Para arquivos, remover o bloco não deve apagar automaticamente o anexo; URLs temporárias devem ser renováveis por ID estável.

### Visualizações e modelos — RF-019/022–024

Criar configurações e modelos via serviço não demonstra o fluxo de uso das telas. É necessário confirmar que tabela, quadro, árvore e documento representam a mesma página, com o mesmo ID, e que alterações de propriedades aparecem entre as visualizações.

**Próximo aceite:** alterar status na tabela e conferir quadro/documento após recarga; aplicar filtro antes da paginação; testar configuração inválida; gerar duas páginas do mesmo modelo com mídia e comprovar sua independência.

### Compatibilidade e qualidade geral

F7 cobre exportação de legado/nós desconhecidos e bloqueio de escrita incompatível. Ainda falta verificar o ciclo completo abrir → editar → salvar → reabrir no editor para os formatos suportados. Os relatos também mantêm pendências de leitor de tela, segundo motor de navegador, clipboard, zoom, IME e desempenho representativo.

O upgrade local foi ensaiado com dados reais daquele ambiente, incluindo duas páginas e 19 objetos. Isso fecha o incidente local; não valida automaticamente outro acervo ou produção. Não há reparo automático documentado de árvores legadas já inconsistentes.

### Rastreabilidade

F5 troca os rótulos RF-019/020/021. A matriz F7 reconhece essa troca, mas ainda associa alguns cenários de formatação/código a RF-007/008, que no documento original são comandos e operações de bloco. É preciso reconciliar ID, nome, comportamento e evidência. Um teste com ID correto e cenário errado não fecha o requisito.

## 6. O que torna a experiência próxima do Notion

A documentação oficial descreve inserção por `/` e `+`, ações no menu do bloco, movimentação direta e navegação entre subpáginas pela lateral e pelo caminho de ancestrais. Essas interações são referências úteis para este projeto; não implicam reproduzir toda a plataforma.

Para a Biblioteca, proponho uma superfície de escrita central, título editável no próprio documento, propriedades de estudo compactas, árvore lateral, salvamento visível e comandos próximos do conteúdo. Capa e ícone já possuem base relatada: o ganho está em integrá-los ao documento. Tema, espaçamento e tipografia acompanham esse trabalho.

Essa é uma direção de produto, não uma constatação visual da tela atual. A comparação visual final exige observar o build atualizado.

## 7. Sequência proposta para continuar

Os números F8–F12 abaixo são uma nova proposta de organização. A indicação de RF mantém a origem das pendências: concluir um requisito anterior não o transforma em funcionalidade nova.

| Etapa proposta | Resultado para o usuário | Trabalho e critério de saída |
|---|---|---|
| **F8 — Consolidar o estado real** | Base identificável e pendências claras | Inspecionar working tree atual, reconciliar os 26 RF, reproduzir somente lacunas relevantes, fechar idempotência/recuperação se ausentes e resolver geração local. Fixar referência reproduzível de código e documentação. Sem declarar homologação completa por passar build. |
| **F9 — Navegar e escrever na página** | Abrir um assunto e começar a escrever com pouco atrito | Árvore, caminho, título direto, propriedades compactas, estados de salvamento, capa/ícone e foco. Reutilizar contratos de hierarquia, URL e proteção de saída. Aceite: três níveis, mover, voltar/avançar e reabrir sem perda. |
| **F10 — Manipular o conteúdo** | Organizar explicações sem sair do texto | `/`, `+`, menu de bloco, conversão, duplicação, movimento, desfazer, código, anexos e referências no corpo. Implementar em incrementos verificáveis. Aceite: documento misto preservado após recarga, inclusive japonês e mídias. |
| **F11 — Integrar a organização dos estudos** | Usar lista/tabela/quadro como visões do mesmo acervo | Sincronização de propriedades, filtros/ordenação persistidos, busca, favoritos/recentes e modelos com cópias independentes. Aceite: mesma página/ID em todos os fluxos, filtros e paginação coerentes. |
| **F12 — Homologar a experiência completa** | Usar o produto com confiança no dia a dia | Jornada real, formatos legados, teclado/leitor de tela, zoom/mobile, segundo motor, IME, clipboard e volume representativo. Fechar matriz e registrar limitações aceitas. Preparação de publicação somente depois, como ação separada. |

Atualização local de 16/11/2026: a execução da F9 e seu aceite delimitado estão registrados em [execucao/F9.md](execucao/F9.md), com [testes](execucao/F9-testes.md) e [correções](execucao/F9-correcoes.md). Esse registro posterior não altera as conclusões históricas da análise acima nem homologa F10–F12.

Atualização F10 de 16/11/2026: comandos e operações internas, arraste, código, materiais e referências no corpo foram implementados e verificados no recorte automatizado local. Ver [entrega](execucao/F10.md), [testes](execucao/F10-testes.md) e [correções](execucao/F10-correcoes.md). IME japonês físico continua pendente de aceite; esse registro não homologa F11/F12.

F8 deve ser um ciclo delimitado, evitando uma auditoria interminável. Seu resultado é um conjunto priorizado de correções e uma referência confiável; a homologação integral acontece após os fluxos F9–F11. Testes de acessibilidade, compatibilidade e recuperação relevantes entram em cada entrega, sem serem adiados em bloco para F12.

Não proponho trocar Next/Nest/Prisma/Tiptap, reconstruir o backend ou ampliar agora para colaboração em tempo real, IA integrada e um sistema universal de bancos de dados. O objetivo deste ciclo é a Biblioteca pessoal já especificada.

## 8. Jornada de aceite orientada ao seu uso

Use uma conta e um acervo de teste representativos, com exemplos de japonês, programação e faculdade:

1. Abrir “Japonês”, criar “Partículas” e uma subpágina “は e が”, começando sem preencher um formulário extenso.
2. Escrever exemplos com IME, criar um destaque, checklist e alternante; inserir uma imagem e duas referências internas.
3. Duplicar um bloco, mudar sua posição, desfazer e conferir o texto.
4. Recarregar e usar Voltar/Avançar mantendo página, estrutura e conteúdo.
5. Alterar status de estudo pela tabela e conferir a mesma página no quadro; entendimento continua independente.
6. Duplicar a página com mídia e comprovar que alterações/remoções permitidas no original não quebram a cópia.
7. Excluir/restaurar um ramo preservando um item excluído antes; criar versão, editar, restaurar e exportar os arquivos.
8. Em cenário separado, interromper a rede, recuperar edição pendente e testar duas abas concorrentes sem perda silenciosa.

Cada passo precisa de resultado observável no navegador e, quando relevante, confirmação após nova leitura do servidor. Um botão presente ou um componente renderizado não é o aceite completo.

## 9. Prompt para iniciar a próxima rodada no agente local

```text
ETAPA ATUAL: F8 — consolidação pós-F7 da Biblioteca de Estudos.

Objetivo: reconciliar o que foi implementado com a especificação original,
fechar lacunas de integridade e preparar uma sequência concreta de melhoria
da experiência de navegação e edição. Trabalhe no repositório local atual.

Leia as instruções do projeto, os documentos originais 08/12/14 e os
relatórios F0–F7. Considere as atualizações finais de F7: concorrência,
movimento de ramos, lixeira por lote, URL persistente, migração local e
aliases CORS já foram corrigidos segundo os registros. Não reabra esses
bugs sem reproduzir uma regressão no código atual.

1. Inspecione branch, HEAD, mudanças locais e arquivos não rastreados.
   Preserve o trabalho existente. Identifique o código realmente executado,
   versões de ambiente e migrações, sem imprimir segredos ou notas pessoais.

2. Monte uma matriz dos RF-001–026 com os nomes canônicos do documento 08:
   requisito; caminho/símbolo que o implementa; cenário de aceite;
   evidência; estado; pendência; prioridade. Classifique como verificado,
   implementado sem verificação completa, parcial, ausente ou bloqueado.
   Ausência de teste não prova ausência da funcionalidade. Corrija as
   associações trocadas de RF/CT nos relatórios, preservando o histórico.

3. Investigue primeiro RF-002 e RF-014: repetição da criação após resposta
   perdida, fila de conteúdo e metadados, conflito entre abas, recuperação
   depois de reinício e isolamento de rascunhos entre contas. Preserve a
   comparação atômica de revisão introduzida na F7; não adicione tolerância.

4. Corrija defeitos reproduzidos de integridade e conclua esses mecanismos
   de F1 se faltarem, com mudanças incrementais e compatíveis. Recuperação
   deve exigir usuário correto e reconciliação de versão, sem sobrescrever
   automaticamente conteúdo remoto mais novo. Adicione regressões que
   exercitem o comportamento real. Use banco/bucket isolados para mutações.

5. Faça inventário direto da interface para RF-003/005/007/008/010/012/013/021:
   árvore, caminho, comandos, menu de blocos, código, anexos e referências
   no corpo, reordenação de páginas e blocos. Para esta rodada, documente
   essas lacunas com evidência; sua implementação será organizada em F9/F10.
   Avalie também integração de visualizações/modelos para F11.

6. Resolva prisma generate/EPERM no ambiente local controlado, se persistir.
   Execute checks pertinentes às alterações; se o estado final combinado
   não tiver validação identificável, execute os checks obrigatórios do
   projeto. Não desative testes, validações ou expectativas para obter verde.

7. Registre F8.md, F8-testes.md e, havendo defeitos, F8-correcoes.md seguindo
   a estrutura real do repositório. Informe arquivos alterados, causas,
   cenários executados, não executados e resultados. Prepare backlog F9–F12
   com dependências e critérios observáveis, separando pendências originais
   de refinamentos novos. Registre uma referência reproduzível do código.

Avance autonomamente nas inspeções e correções locais dentro desse escopo.
Pergunte apenas por decisão essencial que não possa ser obtida do projeto;
continue tarefas independentes enquanto isso. Não substitua o produto nem
remova dados. Não faça push, merge, deploy ou mutações em produção nesta
rodada. Não implemente todas as próximas fases de uma vez.

Conclusão esperada: matriz confiável, correções de integridade verificadas,
limitações honestas e a primeira entrega de F9 claramente definida.
Não declare “Notion completo” nem homologação total com base em build
ou número de testes.
```

## 10. Fontes e acesso

- [Especificação e análise originais](https://chatgpt.com/library?file_id=libfile_c3a23c4545f88191baae95eb1165b4bc&account_id=personal).
- [F3 — implementação](https://chatgpt.com/library?file_id=libfile_da5512c728288191a7b7399568ff6235&account_id=personal).
- [F4 — correção da referência entre páginas](https://chatgpt.com/library?file_id=libfile_8870b4b295048191bec0aa3431be0873&account_id=personal).
- [F7 — implementação e atualizações](https://chatgpt.com/library?file_id=libfile_921fcf7d4b148191a0830c25159bd2f6&account_id=personal).
- [F7 — testes e matriz de homologação](https://chatgpt.com/library?file_id=libfile_0d06997f43d8819193f661ee7d6a0908&account_id=personal).
- [F7 — correções e evidências posteriores](https://chatgpt.com/library?file_id=libfile_a8c3f6ab68b48191b795c39e9177940a&account_id=personal).
- [Código remoto de referência consultado](https://github.com/Erik02T/Biblioteca_de_Estudos/tree/f87fdbcda593e7005ea43eaa229bb8b09cbc9990), que não contém a working tree relatada.
- [Notion: escrita e edição](https://www.notion.com/help/writing-and-editing-basics), consultado em 13/11/2026.
- [Notion: subpáginas e navegação](https://www.notion.com/help/create-a-subpage), consultado em 13/11/2026.

## Atualização local — F11, 17/11/2026

A F11 foi implementada na working tree e validada no recorte funcional local: visões por ID, edição de propriedades, filtros e ordenação persistidos, busca paginada, favoritos/recentes de abertura e modelos com cópias independentes. Ver [entrega F11](execucao/F11.md), [testes](execucao/F11-testes.md) e [correções](execucao/F11-correcoes.md). A análise acima mantém sua data e natureza históricas. O próximo ciclo é F12, com homologação integrada; não houve publicação.

## Atualização local — F12, 17/11/2026

A rodada integrada F12 executou jornadas nos dois motores, formatos legados/incompatíveis, teclado/foco, clipboard nativo, volume de 1.000 páginas, restauração conjunta e exportação offline. O proprietário confirmou IME real em Chrome/Firefox, Narrador e zoom nativo, toque/teclado/clipboard no Android e usabilidade no volume medido. Ver [entrega F12](execucao/F12.md), [matriz e testes](execucao/F12-testes.md), [correções](execucao/F12-correcoes.md) e [resultado consolidado](../../output/playwright/F12-resultados.json). O registro final distingue aceites executados e limites aceitos; os relatos anteriores permanecem históricos. Preparação de publicação não integra esta etapa.
