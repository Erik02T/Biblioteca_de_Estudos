# UX-04 — Correções

15/11/2026. Código e ambiente em [UX-04-testes.md](UX-04-testes.md). Todas as mudanças são locais e não commitadas.

| ID / prioridade / tipo | Reprodução e observado | Esperado e causa confirmada | Correção / resultado |
|---|---|---|---|
| UX04-001 / P1 / funcional | Renomear alternante e solicitar nova renomeação; o NodeView original lia `node` capturado na criação. Alterações posteriores também podiam reutilizar atributos antigos. | Ler o título e atributos atuais. Causa: closures de `node.attrs` sem atualização no NodeView. | `currentNode` atualizado em `update`, botão Renomear/F2 e atributos preservados. VERIFICADO em regressão e prompts reais do navegador. |
| UX04-002 / P1 / funcional | Renomear duas vezes em menos de 500ms; undo agrupava ambas. Reproduzido no roteiro, com o primeiro título não recuperado. | Cada ação explícita deve poder ser desfeita separadamente. Causa: transações próximas no mesmo nó sem fronteira de histórico. | `closeHistory` nas ações de bloco e renomeação/abertura do alternante. VERIFICADO com editor real e navegador. |
| UX04-003 / P1 / funcional | Abrir/fechar ou desfazer alternante aciona eventos nativos `toggle`, inclusive em atualizações programáticas. O código anterior sempre gravava atributos da criação. | Undo estável, sem gravação redundante ou recuperação de título antigo. | Só grava se DOM e estado atual divergirem; mantém título/DOM e ignora mutações fora do conteúdo editável. VERIFICADO com undo, eventos nativos e nova leitura HTTP. |
| UX04-004 / P0 / preservação | Abrir JSON com `image`, `attachment`, `pageReference` ou atributo desconhecido. Inspeção confirmou ausência desses tipos no schema frontend, com risco de descartá-los no próximo `getJSON`. Não foi usado documento pessoal para provocar perda. | Conservar o JSON original até haver suporte completo. | Guard de compatibilidade bloqueia edição do corpo, avisa e mantém material/exportação e salvamento de metadados. VERIFICADO com fixtures e página real no banco exclusivo; igualdade estrutural após novo GET. |
| UX04-005 / P1 / interação | Escape com menu `/` aberto no modo foco concorria com o tratamento de Escape do layout. | Fechar a camada ativa sem sair do foco ou da página. | Layout respeita menu de bloco ativo; menu consome Escape e retorna foco. VERIFICADO no navegador e nas cinco larguras. |

Os controles foram verificados em 320/375/768/1024/1440 CSS px e zoom nativo 200%. As capturas e resultados estruturados estão no relatório de testes. Conversões incompatíveis são recusadas em vez de achatar conteúdo, e seleções entre vários blocos não recebem ação ambígua.

A inserção por `/`/botão e as operações de bloco eram entregas originais ausentes e foram implementadas nesta rodada; não foram registradas como regressão de uma funcionalidade existente. Mídias/referências no corpo e IME físico permanecem pendentes, explicitados em [UX-04.md](UX-04.md). Não foram declarados corrigidos ou homologados.
