# F9 — correções e decisões

Data: 16/11/2026.

| Problema | Causa e correção | Verificação |
|---|---|---|
| Mãe com outro status desaparecia da árvore | A consulta compartilhava `section/subSection` da coleção. Índice completo paginado, filtros da coleção aplicados separadamente | Árvore real de três níveis com status mistos e sem IDs duplicados |
| Lista lateral não permitia expandir ramos e faltava caminho | Lista indentada substituída por listas aninhadas com botões de expansão, seleção por ID e caminho de ancestrais | Navegação/caminho, movimento, Voltar/Avançar e recarga |
| Seletor oferecia descendentes e ocultava mães de outro status | Candidatos calculados por descendência; filtro de status removido. Validação transacional do servidor preservada | Componente e movimento real com GET remoto |
| Título longo ficava limitado a uma linha | Textarea direta, altura conforme conteúdo/largura via ResizeObserver, Enter para escrever, guardas IME | Título longo em 375 px e editor real |
| Nova filha exigia escolher parentesco manualmente | Ação direta confirma pendências da mãe e preenche parentesco; raiz existente não herda estado de uma criação anterior | Testes de Home e criação real |
| Mensagens descreviam salvamento antigo | Indicador e ajuda agora descrevem a fila conjunta; erro continua com prioridade sobre “Salvo” | Testes e PATCH abortado no navegador |
| Ferramenta estreita reduzia área do documento | Reserva da coluna lateral limitada ao layout desktop; modal mantém largura de conteúdo | Cinco larguras sem overflow |
| Entrada em modo foco mantinha foco no acionador | Foco encaminhado ao textbox sem remontar editor | Elemento real Tiptap mantido e Escape consumido pelo modo |
| Remover ícone repunha ✦ | Resposta vazia agora persiste vazia; botão mantém acionador visível | Prompt nativo, GET e recarga |
| Lateral repetia página atual sem ação útil | Lista redundante substituída por índice do documento sob demanda; nomes longos da árvore abreviados visualmente com título completo acessível | Revisão de screenshots e navegação existente |

Ocorrências de execução: o primeiro build não conseguiu baixar as fontes Google por restrição de rede; build autorizado com acesso à rede passou. Nenhum fallback de fonte foi introduzido. A verificação inicial de foco precisou aguardar o `requestAnimationFrame` usado pelo próprio Tiptap; o produto já transferia o foco. O teste novo de criação passou a aguardar a conclusão da navegação, evitando deixar a resposta assíncrona alterar a fixture do teste seguinte.

O CLI antecipou o retorno de um roteiro que abriu seletor nativo, embora a execução de fundo tenha produzido capturas. A evidência final foi repetida sem esse seletor, usando o input real, e prompts de ícone foram tratados em comandos separados. Uma rodada longa atingiu 429 na API de teste: o limite permaneceu ativo; somente a API isolada iniciada nesta execução foi reiniciada e o cenário final foi repetido em nova conta. A ocorrência não foi apresentada como regressão de persistência.

## Rodada corretiva — erro informado pelo usuário em 16/11/2026

### BUG-F9-001 — erro 500 ao criar documento

**Status: CORRIGIDO E VERIFICADO nos ambientes descritos abaixo. Gravidade: alta; bloqueava criação pelo frontend atual.** RF-002/RF-014 e pré-requisito da F9. Classificação: banco local desatualizado, sem defeito novo identificado no comando de inserção de blocos Tiptap.

- **Sintoma confirmado:** usuário informou “Erro interno do servidor” e esclareceu que a falha era ao criar documento/página. O relatório anterior validava fixtures com a migração F8, mas registrava expressamente que ela ainda não tinha sido aplicada ao acervo habitual.
- **Causa confirmada:** `biblioteca_estudos`, em `localhost:5433`, tinha 11 migrações e não tinha `public.AreaCreationRequest`. `POST /areas` do frontend envia `Idempotency-Key`; `AreasService.create` consulta essa tabela dentro da transação antes de criar. No clone fiel do banco, o log da mesma requisição confirmou `The table public.AreaCreationRequest does not exist` e a API respondeu exatamente `500 / Erro interno do servidor`. A transação não criou página, e a interface manteve o rascunho.
- **Correção:** aplicar a migração aditiva existente `20261116120000_f8_creation_requests`. Não foi criada outra migração, removido o header nem introduzido fallback que sacrificasse idempotência.
- **Proteção dos dados:** backup conjunto banco/storage, restauração em clone novo, comparação das oito tabelas anteriores e dos 21 objetos; ensaio da migração no clone antes da origem. Na origem, as oito tabelas permaneceram iguais por contagem/hash e os 21 objetos por chaves/SHA-256 depois da migração.
- **Arquivos:** novo procedimento `backend/scripts/f9-creation-upgrade.cjs`; reprodução em `output/playwright/F9-criacao-antes.js` e `F9-criacao-depois.js`; atualizações nestes registros e READMEs. Nenhum código de produção frontend/backend foi alterado nesta rodada.

### Reprodução e verificação

Run identificado: `20261116_122057` (America/Fortaleza). Backup em `.f7-artifacts/local-upgrade-20261116_122057/`; relatório técnico privado em `.f8-artifacts/f9-creation-upgrade-20261116_122057/report.json`. Dumps, tokens de fixtures, inventários privados e objetos não foram adicionados à documentação ou exibidos como conteúdo.

1. Consulta somente de schema na origem: 11 migrações; `to_regclass` da tabela retornou nulo.
2. `prepare`: backup e restauração em `biblioteca_test_f7_upgrade_20261116_122057` e bucket `biblioteca-test-f7-upgrade-20261116-122057`; verificadas oito tabelas e 21 objetos. O script recusa origem remota, migrações inesperadas ou sobrescrita de um run anterior.
3. `http-before` e navegador antes: POST com header retornou **500**, mensagem original, zero páginas na conta fictícia; título e corpo preservados na interface. Captura `F9-criacao-antes.png`.
4. `migrate-clone`: somente a migração F8 aplicada; dados anteriores do clone inalterados.
5. `http-after`: **201**; repetir o mesmo pedido retornou o mesmo ID e manteve uma página. No navegador, repetir Criar página no formulário que falhara produziu **201**; título/corpo japonês e uma página confirmados após recarga. Captura `F9-criacao-depois.png`.
6. `apply-source`: após exigir as provas anteriores, migração aplicada a `biblioteca_estudos`; 12 migrações, tabela presente e lookup Prisma de recibo aprovado. Registros anteriores e storage iguais ao backup.
7. Repetido `F9-navegacao.js` no clone migrado: três níveis, movimento, histórico, recarga, filha direta, foco/ferramentas, cinco larguras e saída sem rede **passaram**.
8. Frontend: **103 testes**, lint, TypeScript e build aprovados. Backend: build e **5 testes de integração HTTP de criação idempotente com PostgreSQL real** aprovados, via `run-f8.cjs`, em `biblioteca_test_f8_20261116`.

**Limite da verificação:** o POST autenticado na conta habitual do usuário não foi executado pelo agente. As mutações de teste ocorreram apenas em contas fictícias dos bancos identificados. Na origem foram verificados schema, leitura do recibo e preservação dos dados; o fluxo completo foi repetido no clone. O usuário pode repetir a criação na aba habitual sem recriar o rascunho.

A configuração pública do frontend habitual aponta para `localhost:3000`; `/health` e `/health/ready` dessa API retornaram 200 após o reparo. Nenhum arquivo `.env` foi alterado. Uma tentativa de repetir `prepare` no mesmo run foi recusada antes de mutação, confirmando a proteção contra sobrescrita.

### Demais ocorrências da conversa

| Ocorrência anterior | Situação nesta rodada |
|---|---|
| Falha de teste por finalização assíncrona de criação | Não reproduzida: suíte atual passou sem alterar testes ou reduzir assertivas |
| Falha no download de fontes do build | Não reproduzida no build atual, com acesso de rede autorizado |
| Perfil Playwright ocupado / seletor nativo | Sessão própria `f9fix`; reprodução da criação não usa seletor nativo. Não foi encerrado navegador alheio |
| 429 depois de várias rodadas | Não reproduzido nos fluxos desta rodada; limites permaneceram ativos. Não tratado como causa do 500 |

Próxima ação exata: repetir Criar página na aba habitual. Se ainda houver falha, identificar a origem real da API e seu banco; este reparo se aplica exclusivamente à instância local identificada. Nenhuma funcionalidade de F10–F12 foi iniciada.
