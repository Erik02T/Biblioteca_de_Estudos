# Prompt mestre — aplicar, testar e corrigir UX/UI

Biblioteca de Estudos · 15/11/2026

Use o prompt no agente que tem acesso ao código local atualizado e consegue executar o aplicativo. Disponibilize o documento de direção e o HTML de referência no projeto ou como anexos. O protótipo não deve substituir o aplicativo real.

## Sequência de uso

Execute APLICAR → TESTAR → CORRIGIR na mesma etapa. CORRIGIR é necessário quando houver defeitos; se TESTAR aprovar os critérios, avance à próxima etapa. Uma verificação final deve avaliar as etapas integradas. Para testar, prefira uma nova rodada que confira o resultado independentemente das alegações da implementação.

| Etapa | Escopo | Critério central |
|---|---|---|
| UX-01 | Componentes, tokens, controles desalinhados, propriedades sobrepostas e linguagem de salvamento | Controles legíveis, acionáveis e consistentes; sem sobreposição; estados honestos |
| UX-02 | Navegação comum, coleções, filtros e ações de páginas | Chegar ao documento com menos etapas, preservando URLs e funcionalidades |
| UX-03 | Documento central, propriedades/materiais sob demanda, modo foco e capa | Abrir ferramentas sem perder texto, seleção ou espaço de leitura |
| UX-04 | Comandos e operações por blocos | Inserção e reorganização confiáveis, com compatibilidade do conteúdo e IME |
| UX-05 | Homologação integrada | Jornadas completas, responsividade, acessibilidade e regressões verificadas |

Não rode todas as etapas de uma vez. Comece pela UX-01. As etapas acima correspondem ao documento de direção já fornecido.

## Prompt completo

```text
Atue como engenheiro de frontend com foco em UX/UI e acessibilidade.
Trabalhe na Biblioteca de Estudos existente.

MODO: APLICAR
ETAPA: UX-01
ALVO: telas e componentes abrangidos pela etapa
RELATÓRIO DE ERROS: usar o mais recente desta etapa, se existir

REFERÊNCIAS
- Direcao_UX_UI_Biblioteca_de_Estudos.md: direção de design e critérios.
- Biblioteca_Modelo_Interativo.html: referência visual e de interação.
- Capturas fornecidas: contexto do problema; confira o estado atual.
- Código, contratos e instruções do repositório: funcionamento real.

O HTML é um protótipo, não uma implementação pronta da aplicação.
Não copie o iframe, o runtime de visualização, dados fictícios ou mecanismos
de estado demonstrativos para produção. Adapte o design aos componentes,
rotas, editor e APIs existentes. Quando houver diferença entre a amostra
e o documento de UX, use os critérios do documento e preserve os contratos
funcionais. Registre adaptações relevantes.

PREPARAÇÃO
1. Inspecione branch, mudanças locais, dependências, componentes e estilos.
   Preserve alterações existentes e identifique o código efetivamente servido.
2. Abra as telas afetadas em ambiente local/teste e registre o estado inicial.
   Use dados de teste. Não exponha credenciais ou notas pessoais nos relatórios.
3. Resuma o escopo em poucas linhas e prossiga com o trabalho autorizado.
   Pergunte apenas por uma decisão essencial que não possa obter do projeto.
   Se faltar uma referência, procure no projeto e informe exatamente a lacuna;
   avance nas tarefas independentes sem inventar o conteúdo ausente.

COMPORTAMENTO POR MODO

APLICAR
- Implemente a etapa selecionada no produto existente.
- Reutilize os componentes e a biblioteca de UI já presentes.
- Centralize cores, tipografia, espaçamento, superfícies e estados em tokens.
- Corrija a causa de sobreposições e desalinhamentos; não apenas seus sintomas.
- Realocar uma ferramenta exige manter um caminho de acesso funcional.
- Conecte cada controle aos comportamentos reais; não entregue botões decorativos.
- Faça alterações incrementais e valide os fluxos afetados.
- Não avance automaticamente para a próxima etapa.

TESTAR
- Avalie a etapa sem alterar o código do produto.
- Execute o aplicativo e os testes adequados; prepare fixtures isoladas quando
  necessário. Compare antes/depois usando os mesmos dados e dimensões.
- Inspecione telas, estados, ações e persistência, não apenas screenshots.
- Registre cada problema com ID, prioridade, reprodução, esperado, observado,
  viewport, evidência e causa confirmada ou hipótese.
- Separe problema funcional, problema visual, divergência do briefing e sugestão.
- Entregue a lista priorizada para o modo CORRIGIR.

CORRIGIR
- Leia o relatório da etapa e reproduza cada falha antes de editar.
- Corrija causas confirmadas com o menor conjunto coerente de mudanças.
- Não reabra bugs antigos já resolvidos sem reproduzir uma regressão.
- Repita os cenários que falharam e os fluxos afetados pela correção.
- Preserve os critérios de aceite; não desative testes nem atualize imagens
  de referência apenas para fazer uma mudança incorreta passar.
- Se uma falha não for reproduzida, registre condições e evidências; não a
  declare corrigida. Não amplie a rodada para um redesign diferente.

REGRAS DO PRODUTO
- Preserve autenticação, isolamento de usuários, IDs, URLs, histórico,
  conteúdo JSON, headings H1–H6, anexos, autosave, revisão concorrente,
  lixeira, versões e exportação.
- Preserve a instância do editor, cursor, seleção e undo/redo ao abrir ferramentas.
- Use “Página” para documentos e “Bloco” para unidades dentro do editor.
- Mantenha título, conteúdo, navegação e estado de salvamento compreensíveis.
- Materiais e propriedades aparecem sob demanda, com acionadores identificáveis.
- Menus contextuais precisam funcionar por teclado e toque, além do mouse.
- “Salvo”, “Salvar”, “Fechar” e “Cancelar” devem refletir o contrato real;
  não prometa desfazer conteúdo já persistido ou recuperar rascunhos inexistentes.
- Não esconda erros ou remova funcionalidades para reduzir poluição visual.
- Não use overflow:hidden global, redução excessiva da fonte ou z-index arbitrário
  para mascarar defeitos de layout.
- Preserve a stack; não altere schema/API por conveniência estética.
- Não faça push, merge, deploy ou alterações em produção nesta rodada.

VERIFICAÇÃO
Conforme o escopo afetado, verifique:
- 320, 375, 768, 1024 e 1440 CSS px; zoom real de 200%; nomes longos.
- Estados vazio, carregando, preenchido, erro, salvando e conflito.
- Navegação, seleção ativa, links diretos, recarga e Voltar/Avançar.
- Abertura/fechamento de menus e painéis, Escape e retorno de foco.
- Ausência de sobreposição, conteúdo cortado e rolagem horizontal da página.
- Contraste medido, nomes acessíveis, foco visível, toque e movimento reduzido.
- Edição e aplicação de comandos sem perda de texto ou seleção.
- Japonês com IME real quando a edição/atalhos forem afetados; inserir uma string
  japonesa por automação não comprova composição IME.
- Persistência após nova leitura do servidor nos fluxos alterados.
- Lint, tipos, build e testes pertinentes disponíveis no projeto.

Adicione regressões úteis para comportamentos alterados ou bugs corrigidos.
Não crie testes que apenas repitam valores de CSS. Se não puder usar navegador,
continue as verificações possíveis e declare a validação visual bloqueada.
Build aprovado não significa UX aprovada. Não alegue conformidade completa
de acessibilidade com base somente em automação.

ENTREGA
Registre no diretório de documentação já adotado pelo projeto:
- <ETAPA>.md: escopo, decisões, alterações e referências de código.
- <ETAPA>-testes.md: cenários, ambiente, resultados e evidências.
- <ETAPA>-correcoes.md: defeitos tratados, quando houver.

Informe a referência do código avaliado e se há mudanças não commitadas.
Use estados claros: VERIFICADO, FALHOU, NÃO EXECUTADO ou BLOQUEADO.
Apresente o que mudou, como foi validado, pendências e próximo passo exato.
Só declare a etapa concluída quando seus critérios de aceite estiverem cobertos.
```

## Comandos para as rodadas seguintes

Na mesma conversa, se o prompt mestre e os arquivos ainda estiverem disponíveis:

```text
Use o prompt mestre de UX/UI.
MODO: TESTAR
ETAPA: UX-01
ALVO: entrega atual da UX-01, incluindo regressões dos fluxos afetados.
Execute os testes e entregue os achados; não altere o código do produto.
```

```text
Use o prompt mestre de UX/UI.
MODO: CORRIGIR
ETAPA: UX-01
RELATÓRIO DE ERROS: UX-01-testes.md
Reproduza, corrija e revalide os problemas registrados, preservando os critérios.
```

Para seguir após o aceite da UX-01:

```text
Use o prompt mestre de UX/UI.
MODO: APLICAR
ETAPA: UX-02
ALVO: navegação e coleções conforme Direcao_UX_UI_Biblioteca_de_Estudos.md.
Preserve o resultado aprovado da UX-01 e implemente apenas a UX-02.
```

Em uma conversa nova, forneça o prompt completo, as referências e os relatórios pertinentes. Não presuma que o novo agente conhece as etapas anteriores.

## Referências do projeto

- [Direcao_UX_UI_Biblioteca_de_Estudos.md](https://chatgpt.com/library?file_id=libfile_d7b4cd087e288191bb57203a1ec7a59d&account_id=personal)
- [Biblioteca_Modelo_Interativo.html](https://chatgpt.com/library?file_id=libfile_0344646ace4c8191b7315ab148677028&account_id=personal)

Este documento prepara a execução pelo agente local. Nenhuma mudança ou teste da aplicação foi realizado ao produzir estes prompts.
