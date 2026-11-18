# 15. Lacunas, hipóteses e validação

## Lacunas e contradições

| ID | Lacuna / contradição | Impacto/prioridade | Evidência | Como resolver |
|---|---|---|---|---|
| LAC-001 | “Completa” pode significar uso pessoal ou paridade com todo o Notion | Alta; define tamanho do produto | USR-01 | Validar recorte das duas entregas; proposta assume biblioteca pessoal |
| LAC-002 | Vídeo é majoritariamente inspeção/leitura; não demonstra persistência, erros ou validações | Alta para equivalência comportamental | EV-001–022 | Sessão de teste em páginas descartáveis ou nova gravação dos fluxos específicos; não bloqueia planejar comportamentos propostos |
| LAC-003 | Áudio não transcrito | Média para intenção narrada | VIDEO-01 | Transcrição se houver instrução verbal relevante; nenhuma conclusão atual depende dela |
| LAC-004 | Conector Notion não retornou as páginas pesquisadas | Baixa para vídeo, alta para inspeção ao vivo | NTC-01 | Se necessária inspeção adicional, fornecer URL da página pertinente e confirmar que está disponível à conexão |
| LAC-005 | Instalação/produção pode diferir da main analisada | Alta antes de implementar | REP-00 | Confirmar branch e revisão alvo; avaliar diffs de develop/editor-v3 se forem a base escolhida |
| LAC-006 | Contagem, tamanho e formato dos documentos reais desconhecidos | Alta para migração/performance | REP-01/09 | Inventário anonimizável em ambiente autorizado; medir antes de escolher limites |
| LAC-007 | Current DTO declara 50 MiB, mas parser/proxy e desempenho não foram medidos | Alta para uploads/salvamento | REP-09 | Testar limite efetivo de ponta a ponta e ajustar UX/contratos ao resultado |
| LAC-008 | API só aplica conflito quando updatedAt chega; UI tem fila, mas isso não garante todos os escritores | Alta para perda de dados | REP-05 | Teste de duas abas e endpoint com revisão ausente; especificar exigência obrigatória |
| LAC-009 | “Salvo” e fechamento podem não considerar todo metadado/pendência | Alta para confiança do usuário | GAP-05/06 | Reproduzir alteração de título e navegação durante atraso; corrigir pelo estado unificado |
| LAC-010 | Biblioteca visual do Notion não demonstra uma base criada pelo usuário | Média para escopo de dados | EV-016, WEB-03/04 | Tratar tabela/quadro como proposta de domínio; testar base real apenas se ela for requisito |
| LAC-011 | Menu oferece recursos que nunca foram executados | Média para cobertura | EV-002/003/018/019 | Não marcar duplicação, lixeira, colunas, equações ou sincronização como comportamento comprovado |
| LAC-012 | Mídias e versões futuras compartilham riscos de referência/limpeza | Alta para segunda entrega | REP-06; RF-019/025/026 | Definir retenção de anexo enquanto houver versão; ensaiar cópia, purge e recuperação |
| LAC-013 | Layout móvel, leitor de tela e IME não demonstrados | Alta para acessibilidade | VIDEO-01 apenas desktop | Testar em ambientes definidos, com viewport estreita e composição japonesa |
| LAC-014 | Busca em japonês e desempenho com acervo real não validados | Média/alta para estudo | REP-03/09 | Definir semântica de busca; testar substring/tokenização; indexar após baseline |
| LAC-015 | Nenhuma medição de fonte, zoom ou CSS original | Baixa para equivalência funcional | VIDEO-01 | Aprovar tokens próprios em protótipo; não prometer reprodução pixel a pixel |

## Hipóteses explícitas

| ID | Hipótese | Classe/confiança | Base | Validação |
|---|---|---|---|---|
| HYP-001 | Hierarquia e escrita são o centro do uso que o vídeo pretende demonstrar | INFERIDO; média | Predominância de EV-001–013 | Confirmar ordem de prioridade com o usuário |
| HYP-002 | Evoluir Area é menos arriscado que introduzir uma segunda entidade de documento | INFERIDO; média | REP-01/03/06 | Prova de migração e inspeção da branch alvo |
| HYP-003 | Tiptap atual pode acomodar o catálogo reduzido sem troca de motor | INFERIDO; média | REP-04/07 | Prova técnica de seleção, menus, nós de mídia e drag; verificar APIs/licenças atuais antes de adotar extensões |
| HYP-004 | Campos fixos de estudo atendem à primeira coleção útil | INFERIDO; média | USR-01 e modelo atual | Validar exemplos de tabelas/quadro que o usuário realmente precisa |
| HYP-005 | Bugs de navegação/atalhos podem ocorrer nos pontos estáticos identificados | INFERIDO; média | GAP-01/04/05/06 | Reproduzir antes de registrar como defeito comprovado |

## Decisões de produto para validar antes de implementar

| Decisão | Padrão recomendado nesta proposta | Consequência |
|---|---|---|
| Escopo de pessoas | Bibliotecas pessoais isoladas | Dispensa colaboração, convite e CRDT nesta versão |
| Seções | Manter as quatro atuais inicialmente | Evita migração de taxonomia; seções customizáveis seriam nova história |
| Status | Manter Estudando/Estudado e nível 0–5 por página | Preserva dados e torna quadro simples; “Revisar” pode ser incluído depois de regra definida |
| Bases | Coleção de estudos com campos fixos | Não reproduz fórmulas, propriedades arbitrárias ou relações de bases |
| Hierarquia | Area continua sendo página; status é independente; seção acompanha ramo | Evita confundir bloco com página e mantém filtros coerentes |
| Criação rápida | Rascunho com título/categoria padrão e ID logo no início | Anexos e autosave não dependem de formulário completo |
| Portabilidade | Exportar JSON+Markdown+arquivos; sem importador de Notion nesta entrega | Cópia utilizável não implica migração automática de todo o workspace Notion |
| Histórico | Versões nomeadas explícitas e snapshot antes de restaurar | Evita gravar cópia completa a cada tecla; retenção e quota precisam de parâmetros |
| Base do código | main no commit analisado, salvo decisão diferente | Revalidar diffs se o desenvolvimento ocorrer em outro branch |

## O que permanece NÃO DETERMINADO

Arquitetura interna, banco, APIs e estratégia de sincronização do Notion; implementação de persistência mostrada pelo vídeo; efeitos de comandos não executados; suporte offline da referência nesse fluxo; estado atual da produção da Biblioteca; alterações locais não publicadas; conteúdo de outras branches; volumes reais; política de retenção/quota; disponibilidade de extensões específicas e detalhes de licenciamento futuros.

## Auditoria desta entrega

- Texto metodológico e arquivo de vídeo considerados; limitações da amostragem e do áudio explicitadas.
- Código relevante lido numa revisão fixa; fontes e caminhos registrados, sem afirmar execução.
- Funções visíveis fora do escopo mantidas no inventário, inclusive IA, equipes, comentários, colunas, equações e sincronizados.
- Observações separadas de inferências e propostas; nenhum endpoint ou modelo proposto atribuído ao Notion.
- 26 RF, 26 histórias, 19 RN, 10 RNF, 32 itens de backlog, 26 CT e 10 QA conectados por identificadores.
- MVP e versão completa simplificada delimitados; requisitos e qualidade vinculados a critérios verificáveis.
- Migração, concorrência, lixeira, arquivos e exportação têm regras explícitas de integridade.
- Testes, implementação, criação de tickets, alteração do workspace Notion e deploy não foram realizados.

## Conclusão por grau de certeza

**Confirmado:** composição visual e navegação amostradas; stack, modelo e fluxos estáticos existentes no commit analisado.<br>
**Inferido:** prioridade de hierarquia/editor e adequação de aproveitar Area/Tiptap.<br>
**Proposto:** todos os requisitos futuros, arquitetura incremental, contratos, regras, backlog e testes.<br>
**Desconhecido:** comportamentos não demonstrados e estado operacional não executado.<br>
**Próxima decisão:** validar o recorte de biblioteca pessoal com 17 requisitos P0, seguido dos nove P1; então executar a baseline técnica F0 e iniciar a implementação incremental.
