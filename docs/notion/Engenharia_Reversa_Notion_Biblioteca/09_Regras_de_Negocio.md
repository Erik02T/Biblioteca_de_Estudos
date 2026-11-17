# 09. Regras de negócio

São políticas **PROPOSTAS** da Biblioteca, exceto as restrições atuais explicitamente identificadas nas fontes. Não descrevem políticas internas comprovadas do Notion.

## RN-001 — Propriedade dos registros

Toda operação sobre página, filho, referência, anexo, versão e visualização deve resolver e validar o proprietário. Um ID enviado pelo cliente não concede autoridade.

- **Contexto/gatilho:** Leitura ou escrita.
- **Condições e exceções:** Registro pertence ao solicitante; exceção: nenhum compartilhamento previsto.
- **Ação esperada:** Rejeitar recurso inacessível sem revelar seu conteúdo.
- **Dependências:** RF-003, RF-012, RF-013, RF-015.
- **Origem/status:** REP-02/06; expansão PROPOSTA; proposta para validação.
- **Validação:** Uma conta não lista nem modifica itens de outra, inclusive por IDs conhecidos.

## RN-002 — Árvore sem ciclos

Página não pode ser pai de si mesma nem de um ancestral.

- **Contexto/gatilho:** Criação/movimento.
- **Condições e exceções:** Pais ativos e próprios; serializar operações estruturais concorrentes.
- **Ação esperada:** Validar e gravar ramo atomicamente; conflito não deixa árvore parcial.
- **Dependências:** RF-003, RF-004.
- **Origem/status:** WEB-02; PROPOSTO; proposta para validação.
- **Validação:** Movimentos simultâneos inversos não produzem ciclo.

## RN-003 — Seção coerente no ramo

Filhas herdam a seção da raiz; mover ramo para outra seção atualiza todas as descendentes na mesma operação.

- **Contexto/gatilho:** Movimento/criação.
- **Condições e exceções:** Seção é um dos quatro valores atuais; raiz pode escolher seção.
- **Ação esperada:** Conservar IDs, conteúdo, categoria e anexos.
- **Dependências:** RF-001, RF-004.
- **Origem/status:** REP-01; PROPOSTO; proposta para validação.
- **Validação:** Nenhuma filha aparece numa seção contraditória ao pai.

## RN-004 — Estado de estudo independente

Estudando/Estudado e nível 0–5 pertencem à página; não se propagam automaticamente por hierarquia.

- **Contexto/gatilho:** Alteração de estudo.
- **Condições e exceções:** Valores permitidos; sem agregação automática.
- **Ação esperada:** Atualizar apenas a página indicada e suas visualizações.
- **Dependências:** RF-009, RF-018, RF-022.
- **Origem/status:** REP-01/09; PROPOSTO; proposta para validação.
- **Validação:** Marcar filha como estudada não altera pai/irmãs.

## RN-005 — Identidade e rascunhos

ID é estável; títulos não são únicos. Criar rascunho usa defaults explícitos para cumprir campos atuais obrigatórios.

- **Contexto/gatilho:** Criar/renomear.
- **Condições e exceções:** Nome/categoria normalizados; vazio deliberado recebe default proposto.
- **Ação esperada:** Preservar links por ID; tentativa repetida com mesma chave retorna o mesmo rascunho.
- **Dependências:** RF-002, RF-013.
- **Origem/status:** EV-017; REP-09; PROPOSTO; proposta para validação.
- **Validação:** Repetição de request não duplica; duas criações intencionais com mesmo título são permitidas.

## RN-006 — Ordem estável

Ordem entre irmãos tem valor persistido e desempate por ID; não usar updatedAt como ordem manual.

- **Contexto/gatilho:** Reordenar/mover.
- **Condições e exceções:** Origem e irmãos no mesmo escopo validado.
- **Ação esperada:** Atualizar posições de forma transacional; título não serve de chave.
- **Dependências:** RF-004, RF-021.
- **Origem/status:** REP-02; EV-019; PROPOSTO; proposta para validação.
- **Validação:** Atualizar texto não reorganiza a árvore inesperadamente.

## RN-007 — Documento versionado

Conteúdo só pode ser regravado em schema conhecido. JSON legível como objeto não basta para validar o documento.

- **Contexto/gatilho:** Carregar/salvar/migrar.
- **Condições e exceções:** Tipos, atributos, profundidade e tamanho validados; mídias como referências.
- **Ação esperada:** Migrar formato conhecido; preservar e bloquear escrita destrutiva de formato desconhecido.
- **Dependências:** RF-001, RF-006, RF-020.
- **Origem/status:** REP-04/09; PROPOSTO; proposta para validação.
- **Validação:** Round-trip não remove nós desconhecidos silenciosamente.

## RN-008 — Anexos com identidade durável

Blocos, capas e versões referenciam anexos por ID; URLs assinadas são dados temporários de leitura.

- **Contexto/gatilho:** Inserir/abrir/remover anexo.
- **Condições e exceções:** Anexo próprio e associado à página; verificar usos em versões.
- **Ação esperada:** Renovar URL quando necessário; remoção definitiva não deixa versões quebradas sem política explícita.
- **Dependências:** RF-011, RF-012, RF-026.
- **Origem/status:** REP-06; PROPOSTO; proposta para validação.
- **Validação:** URL expirada não obriga editar o documento; arquivo referenciado por versão é retido.

## RN-009 — Escrita com revisão esperada

Toda alteração de documento/metadados informa a revisão que leu, validada atomicamente no servidor.

- **Contexto/gatilho:** Salvar/restaurar/editar no quadro.
- **Condições e exceções:** Revisão coincide; caso contrário conflito.
- **Ação esperada:** Retornar nova revisão; conflito preserva rascunho e não sobrescreve.
- **Dependências:** RF-014, RF-018, RF-022, RF-026.
- **Origem/status:** REP-05; PROPOSTO: tornar obrigatório; proposta para validação.
- **Validação:** Duas escritas com a mesma revisão não vencem ambas.

## RN-010 — Lixeira por lote

Excluir página ativa marca ela e descendentes ativas com mesmo lote; itens antes excluídos mantêm lote anterior.

- **Contexto/gatilho:** Enviar à lixeira.
- **Condições e exceções:** Ownership e árvore válidos.
- **Ação esperada:** Ocultar de árvore/busca/favoritos ativos e manter conteúdo/objetos.
- **Dependências:** RF-017.
- **Origem/status:** EV-002; REP-02; PROPOSTO; proposta para validação.
- **Validação:** Restaurar o lote do pai não ressuscita filha excluída anteriormente.

## RN-011 — Restauração consistente

Restaurar lote recupera itens atingidos por esse lote e relações possíveis.

- **Contexto/gatilho:** Restaurar.
- **Condições e exceções:** Se pai original está ativo, reanexar; se indisponível, raiz da mesma seção com aviso.
- **Ação esperada:** Não criar ciclo; revalidar vínculos e anexos; operação atômica no banco.
- **Dependências:** RF-003, RF-017.
- **Origem/status:** PROPOSTO; proposta para validação.
- **Validação:** Restauração funciona quando o pai foi removido e informa o destino resultante.

## RN-012 — Exclusão definitiva separada

Purge só ocorre por ação explícita confirmada, fora de edição normal. Não há esvaziamento automático proposto.

- **Contexto/gatilho:** Confirmar exclusão permanente.
- **Condições e exceções:** Item na lixeira e escopo compreendido; referências de versões/cópias resolvidas.
- **Ação esperada:** Remover dados e programar limpeza idempotente de objetos com falhas rastreáveis.
- **Dependências:** RF-017, RF-026.
- **Origem/status:** REP-02/06; PROPOSTO; proposta para validação.
- **Validação:** Falha no storage não é reportada como limpeza completa; retry não apaga arquivo de outra página.

## RN-013 — Modelos sem sincronização

Aplicar modelo cria cópia independente; mudar modelo não altera páginas antigas.

- **Contexto/gatilho:** Aplicar modelo.
- **Condições e exceções:** Modelo válido e próprio ou inicial permitido.
- **Ação esperada:** Criar novos IDs e anexos independentes; não substituir texto existente sem escolha.
- **Dependências:** RF-019, RF-024.
- **Origem/status:** PROPOSTO; proposta para validação.
- **Validação:** Duas páginas geradas divergem sem afetar o modelo.

## RN-014 — Uma fonte para todas as visualizações

Tabela, quadro, árvore e página referenciam a mesma Area.

- **Contexto/gatilho:** Editar propriedade/trocar layout.
- **Condições e exceções:** Campos e valores permitidos.
- **Ação esperada:** Atualizar uma vez; invalidar consultas afetadas; não duplicar registros.
- **Dependências:** RF-018, RF-022.
- **Origem/status:** WEB-03/04; PROPOSTO; proposta para validação.
- **Validação:** Alterar status no quadro aparece na página com o mesmo ID.

## RN-015 — Configuração de visualização validada

Filtro/ordem/layout são configurações do usuário, não consultas SQL recebidas do cliente.

- **Contexto/gatilho:** Salvar/aplicar view.
- **Condições e exceções:** Lista permitida de campos e operadores; propriedade validada.
- **Ação esperada:** Aplicar filtros antes da paginação e retornar configuração válida ou erro explicável.
- **Dependências:** RF-015, RF-023.
- **Origem/status:** WEB-04; PROPOSTO; proposta para validação.
- **Validação:** Configuração inválida não muda dados nem expõe registros fora do escopo.

## RN-016 — Referências internas sobrevivem a renomear

Link usa targetPageId; título é apresentação derivada.

- **Contexto/gatilho:** Renomear/mover/excluir destino.
- **Condições e exceções:** Destino próprio e acessível.
- **Ação esperada:** Atualizar rótulo; informar indisponibilidade sem apagar silenciosamente o vínculo.
- **Dependências:** RF-013.
- **Origem/status:** EV-010; PROPOSTO; proposta para validação.
- **Validação:** Mover ou renomear não quebra link; exclusão produz estado indisponível.

## RN-017 — Sair não desfaz o que já foi salvo

Voltar/fechar e cancelar menu não revertem alterações já persistidas por autosave.

- **Contexto/gatilho:** Navegar/fechar.
- **Condições e exceções:** Pendências verificadas; falha mantém recuperação.
- **Ação esperada:** Comunicar estado; recuperar versão é ação distinta; Esc fecha primeiro o elemento em foco.
- **Dependências:** RF-005, RF-014, RF-026.
- **Origem/status:** REP-03/05; PROPOSTO; proposta para validação.
- **Validação:** Texto salvo continua após voltar; texto pendente não é descartado sem decisão.

## RN-018 — Exportação privada e consistente

Pacote contém somente escopo autorizado e snapshot coerente de documento, hierarquia e arquivos.

- **Contexto/gatilho:** Exportar.
- **Condições e exceções:** Verificar revisões durante captura; repetir ou abortar se conjunto mudou.
- **Ação esperada:** Gerar manifesto/hashes e falhas explícitas; sem tokens e sem URLs temporárias no lugar de arquivos.
- **Dependências:** RF-025.
- **Origem/status:** PROPOSTO; proposta para validação.
- **Validação:** Abrir sem sessão, conferir arquivos e identificar qualquer item não exportado.

## RN-019 — Duplicação realmente independente

Cópia usa novos IDs e objetos; não basta clonar registros que apontam para arquivos apagáveis pelo original.

- **Contexto/gatilho:** Duplicar página/ramo.
- **Condições e exceções:** Permissões, espaço e cópia de objetos concluídos.
- **Ação esperada:** Remapear referências internas ao ramo copiado; falhas compensadas; referência externa ao ramo continua apontando ao original.
- **Dependências:** RF-019, RF-024.
- **Origem/status:** EV-002 como opção; PROPOSTO; proposta para validação.
- **Validação:** Purge do original não invalida cópia nem modelo aplicado.

## Precedência

Ownership e integridade estrutural prevalecem sobre conveniência de UI. Revisão concorrente prevalece sobre retry automático. Lixeira prevalece sobre visibilidade em busca/favoritos. A confirmação visual não autoriza o servidor a ignorar essas regras. Cores, largura e posição de menus são decisões de interface e estão fora deste catálogo.
