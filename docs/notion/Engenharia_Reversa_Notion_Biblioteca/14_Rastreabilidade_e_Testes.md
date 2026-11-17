# 14. Matriz de rastreabilidade e testes

**Esta seção planeja testes; nenhum teste da aplicação foi executado nesta análise.** A auditoria documental confirma consistência das referências e cobertura do plano, não qualidade da futura implementação.

## Evidência → requisito → entrega → teste

| Origem | Requisito | Implementação planejada | Caso / aprovação |
|---|---|---|---|
| REP-01/03/09; USR-01 | RF-001 | BK-001, F0 | CT-001: Migrar uma cópia com conteúdo legado, Tiptap, caracteres japoneses e anexos; comparar antes/depois e testar restauração do backup. |
| EV-013/017; REP-03/09 | RF-002 | BK-002, F1 | CT-002: Simular resposta perdida e repetição da criação: existe uma página, não duas; reabrir por ID e conferir metadados. |
| EV-009/011; WEB-02 | RF-003 | BK-003, F2 | CT-003: Criar três níveis, recarregar e conferir parentesco; bloquear pai de outra conta e pai excluído. |
| EV-002 como opção; WEB-02; PROPOSTO | RF-004 | BK-004, F2 | CT-004: Tentar A dentro de B e B dentro de A simultaneamente; ao fim não há ciclo nem ramo parcial. |
| EV-009–012; REP-03 | RF-005 | BK-005, F2 | CT-005: Abrir URL em nova aba, atualizar, voltar/avançar e trocar com rede interrompida e texto pendente. |
| EV-003/007; REP-04 | RF-006 | BK-006, F3 | CT-006: Editar fixture com listas, títulos e japonês, colar HTML com script e recarregar; conteúdo permitido preservado e script não executado. |
| WEB-01; CMP-07; PROPOSTO | RF-007 | BK-007, F3 | CT-007: Usar / em parágrafo, código, texto selecionado e composição IME; verificar comando apenas onde previsto e alternativa por clique. |
| EV-002–006 | RF-008 | BK-008, F3 | CT-008: Mover bloco entre listas, duplicar e desfazer; tentar converter mídia ou referência sem perder seus dados silenciosamente. |
| EV-003 como opção; USR-01 | RF-009 | BK-009, F3 | CT-009: Marcar uma tarefa, editar seu texto, salvar e recarregar; metadados da página não mudam. |
| EV-007/008; REP-04 | RF-010 | BK-010, F3 | CT-010: Copiar texto com indentação e comparar bytes; negar clipboard, recarregar linguagem e verificar fallback de linguagem antiga. |
| EV-001/005/020/021 | RF-011 | BK-011, F5 | CT-011: Enviar capa, mudar recorte e recarregar; remover só a capa; simular falha no upload e verificar ausência de alteração parcial. |
| REP-06; USR-01 | RF-012 | BK-012, F3 | CT-012: Fazer upload válido/inválido, simular falha de registro e URL expirada; remover apenas o bloco inline e confirmar que anexo continua no painel. |
| EV-002/010/011 | RF-013 | BK-013, F4 | CT-013: Criar referência, renomear destino, mover e colocar na lixeira; link mantém identidade e mostra estado coerente. |
| REP-05; USR-01 | RF-014 | BK-014, F1 | CT-014: Editar em duas abas, atrasar respostas, interromper rede e recarregar; nenhum conflito é resolvido por sobrescrita automática e rascunho não migra entre contas. |
| REP-03; EV-022 como entrada; PROPOSTO | RF-015 | BK-015, F4 | CT-015: Criar resultado fora dos 20 primeiros itens e em outra seção; buscar trecho do corpo e verificar isolamento entre contas e lixeira. |
| EV-002/016/022; PROPOSTO | RF-016 | BK-016, F4 | CT-016: Favoritar, reabrir, renomear, enviar à lixeira e restaurar; listas apontam para o mesmo ID. |
| EV-002 como opção; REP-02; PROPOSTO | RF-017 | BK-017, F4 | CT-017: Excluir filha antes do pai, restaurar pai e conferir filha ainda excluída; simular falha no storage durante purge e verificar recuperação operacional. |
| REP-01/09; USR-01 | RF-018 | BK-018, F1 | CT-018: Alterar nível nos limites e fora deles, mover ramo e conferir status independentes e categoria preservada. |
| EV-002 como opção; PROPOSTO | RF-019 | BK-019, F5 | CT-019: Duplicar ramo com imagem e referência interna; editar/excluir original; cópia permanece íntegra e links internos apontam para a cópia. |
| EV-003 como opções; PROPOSTO | RF-020 | BK-020, F5 | CT-020: Recolher texto com listas e código, salvar/reabrir/expandir; exportação inclui conteúdo recolhido. |
| WEB-01/02; EV-019 como opção; PROPOSTO | RF-021 | BK-021, F5 | CT-021: Executar mesma mudança por drag, teclado e menu; comparar ordem final e rejeitar drop que forme ciclo. |
| WEB-03/04; PROPOSTO | RF-022 | BK-022, F6 | CT-022: Alterar status no quadro e conferir página/tabela pelo mesmo ID; aplicar filtros com paginação sem cartões duplicados. |
| WEB-04; PROPOSTO | RF-023 | BK-023, F6 | CT-023: Salvar filtro, recarregar, trocar layout e conferir IDs/valores intactos; remover campo inválido de configuração antiga de modo explícito. |
| EV-013 como entrada; USR-01; PROPOSTO | RF-024 | BK-024, F6 | CT-024: Aplicar mesmo modelo duas vezes, editar uma cópia e confirmar independência; cancelar aplicação sem modificar página. |
| USR-01; PROPOSTO | RF-025 | BK-025, F7 | CT-025: Abrir pacote sem sessão da aplicação, validar hashes e referências relativas, conferir código/japonês/tarefas/alternantes; lixeira só entra se escolhida. |
| USR-01; PROPOSTO | RF-026 | BK-026, F7 | CT-026: Salvar versão com imagem, editar, remover referência e restaurar; original atual fica recuperável; conflito em outra aba bloqueia restauração. |

## Regras e seus cenários de verificação

| Regra | Requisitos que a exercitam | Casos de teste |
|---|---|---|
| RN-001 | RF-003, RF-012, RF-013, RF-015 | CT-003, CT-012, CT-013, CT-015 |
| RN-002 | RF-003, RF-004 | CT-003, CT-004 |
| RN-003 | RF-001, RF-004 | CT-001, CT-004 |
| RN-004 | RF-009, RF-018, RF-022 | CT-009, CT-018, CT-022 |
| RN-005 | RF-002, RF-013 | CT-002, CT-013 |
| RN-006 | RF-004, RF-021 | CT-004, CT-021 |
| RN-007 | RF-001, RF-006, RF-020 | CT-001, CT-006, CT-020 |
| RN-008 | RF-011, RF-012, RF-026 | CT-011, CT-012, CT-026 |
| RN-009 | RF-014, RF-018, RF-022, RF-026 | CT-014, CT-018, CT-022, CT-026 |
| RN-010 | RF-017 | CT-017 |
| RN-011 | RF-003, RF-017 | CT-003, CT-017 |
| RN-012 | RF-017, RF-026 | CT-017, CT-026 |
| RN-013 | RF-019, RF-024 | CT-019, CT-024 |
| RN-014 | RF-018, RF-022 | CT-018, CT-022 |
| RN-015 | RF-015, RF-023 | CT-015, CT-023 |
| RN-016 | RF-013 | CT-013 |
| RN-017 | RF-005, RF-014, RF-026 | CT-005, CT-014, CT-026 |
| RN-018 | RF-025 | CT-025 |
| RN-019 | RF-019, RF-024 | CT-019, CT-024 |

## Qualidade transversal

| Caso | Requisito | Procedimento e aceite |
|---|---|---|
| QA-001 | RNF-001 | Verificação manual de teclado/leitor de tela e auditoria automatizada; registrar falhas reais e corrigir as que bloqueiam o fluxo. |
| QA-002 | RNF-002 | Testes com latência, rede interrompida, duas abas e reinício; comparar conteúdo efetivo e revisão. |
| QA-003 | RNF-003 | Testar acesso cruzado, payloads HTML/URL perigosos, arquivos rejeitados e expiração de URL; revisar logs sem tokens/conteúdo integral. |
| QA-004 | RNF-004 | Validar a 1280×720 como referência e a 320 CSS px como cenário de reflow, com zoom e teclado; não atribuir esses layouts ao vídeo. |
| QA-005 | RNF-005 | Medir carregamento, digitação e busca em dados de amostra autorizados; comparar antes/depois; não inventar SLA ou prometer milhares de páginas sem medir. |
| QA-006 | RNF-006 | Round-trip de fixtures antigas/atuais/desconhecidas e ensaio de restauração; versão antiga deve recusar escrita em formato novo. |
| QA-007 | RNF-007 | Simular erro em cada etapa e verificar diagnóstico e ação de recuperação apresentados ao usuário. |
| QA-008 | RNF-008 | Restaurar ambiente isolado e conferir IDs, referências e arquivos; backup de banco sem objetos não atende este requisito. |
| QA-009 | RNF-009 | Executar lint, testes relevantes e build na implementação; adicionar E2E dos fluxos de persistência e navegação; não confundir existência de pipeline com execução aprovada. |
| QA-010 | RNF-010 | Testar composição japonesa, seleção/colagem, teclado e arrastar em Chromium e outro motor a definir; registrar versões efetivamente usadas. |

## Fidelidade visual versus funcional

| Área | Comparação visual | Comparação funcional |
|---|---|---|
| Página | Proporção entre lateral, capa, título e coluna; tokens próprios | Criar, salvar, recarregar e abrir por URL |
| Hierarquia | Recuo/ícones, caminho e item ativo | Pai/filho correto, mover sem ciclo, estabilidade de ID |
| Blocos | Menus compactos, cores e código distinguíveis | Conversão sem perda, teclado, clipboard e persistência |
| Personalização | Cabeçalho com/sem capa e ícone | Upload, recorte, remoção e reabertura |
| Estudos | Tabela/quadro legíveis | Mesmos registros, filtros antes da paginação e revisão em edição |
| Recuperação | Mensagens e estado da lixeira claros | Restaurar lote e arquivos, sem ressuscitar exclusões anteriores |

Fidelidade visual é avaliada contra frames equivalentes e protótipos aprovados, sem copiar identidade/mídias privadas. Fidelidade funcional usa cenários completos. Comportamento não observado no Notion é validado contra a especificação proposta, não declarado “idêntico ao original”.

## Conjunto de dados de teste sugerido

Usar contas fictícias separadas, páginas raiz e com três ou mais níveis, títulos repetidos, categoria vazia/longa, nível 0 e 5, texto com acentos/japonês, listas aninhadas, código indentado, imagem/arquivo/link, formato legado e bloco desconhecido. Incluir resultado de busca fora da primeira página e ramo com filha já excluída. Medidas máximas e volumes de carga são definidos após inventário; não usar notas privadas reais como fixtures versionadas.

## Critérios de saída

- MVP: todos os 17 RF P0 verificados, mais QA aplicáveis e recuperação de dados demonstrada.
- Versão completa simplificada: 26 RF verificados, QA pertinentes aprovados e limites documentados.
- Uma falha não resolvida pode ser registrada como limitação apenas se não contradisser um critério obrigatório aprovado; nesse caso, requisito não pode ser marcado concluído.
- Manter registro de ambiente, commit, massa de dados, resultado, evidência e defeitos por CT/QA. Não declarar aprovação de testes históricos como aprovação desta versão.
