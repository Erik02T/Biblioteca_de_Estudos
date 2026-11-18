# F10 — Testes e evidências

16/11/2026. Testes com dados de fixtures; nenhuma conta habitual foi utilizada.

## Verificações automatizadas

| Verificação | Resultado |
|---|---|
| Frontend Jest | 17 suítes, 121 testes aprovados no estado final |
| Backend Jest com ambiente F8 isolado | 27 suítes, 155 testes aprovados |
| Lint frontend/backend | Aprovado |
| Build frontend/backend | Aprovado, incluindo tipos do frontend |
| Whitespace dos arquivos rastreados desta entrega | Sem erro |

Regressões novas exercitam transações reais do Tiptap: seleção invertida entre listas, tarefas marcadas e filhos, IDs de subárvores, grupo pai, duplicação/desfazer, recusa de conversão e movimento destrutivos, inserção em listas, composição, inserção assíncrona mapeada, linguagem antiga, clipboard negado, Escape em código aninhado, URLs temporárias e resolução autorizada. O seletor tem testes de paginação, erro/nova tentativa, upload inválido e cancelamento. O cliente de rede cobre todos os formatos de `HeadersInit` sem duplicar autorização.

Backend novo: HTTP com Nest/ValidationPipe e PostgreSQL real verifica metadados autorizados, renomeação/movimento/lixeira, IDs inválidos, lote acima do limite, busca com mais de 20 resultados e persistência de documento misto com rejeição de revisão antiga.

## Navegador real

Frontend de produção `localhost:3048`, API de fixtures `localhost:3047`, PostgreSQL `biblioteca_test_f8_20261116` e bucket `biblioteca-test-f7-f8-20261116`. A aplicação e API habituais não foram encerradas. O build fica em `.next-f10`, separado do build anterior.

| Roteiro | Evidência |
|---|---|
| `F10-browser.js` — 22 verificações | Linguagem/cópia; menu e teclado em listas; duplicar/desfazer; duas referências; upload real de PNG/TXT/link; IDs únicos; ausência de assinatura no JSON; nova leitura HTTP e recarga; renomear/mover/excluir destinos; 320/375/768/1024/1440 px sem overflow; zero erros de execução. |
| `F10-operations.js` — 14 verificações | Arraste real dentro de alternante; equivalência com teclado e Mover para; desfazer com JSON completo; grupo pai; remoção de bloco preservando arquivo; duplicação com IDs distintos; resposta 403 de imagem seguida de renovação por ID; upload inválido preservando comando; navegação com pendência e Voltar. |
| `F10-portability.js` — 6 verificações | Versão com mídia; restauração do documento misto com IDs de anexos remapeados; referências resolvidas; download ZIP; cópia independente; remoção do material original sem quebrar a cópia. |
| `F10-final-smoke.js` — regressão no build final | Alvo do grupo após duplicar; desfazer conserva o original; código em item de tarefa; Escape conserva a página e seleciona parágrafo válido; persistência após recarga; mídia/referências funcionais; zero erros de execução. |

Resultados JSON e screenshots estão em `output/playwright/F10-*`. O ZIP baixado contém 20 entradas; inspeção adicional confirma japonês, `attachmentId`, `targetPageId`, linguagem Python, Markdown e ausência de credenciais de assinatura no JSON. ZIP fica ignorado pelo Git, como os demais arquivos ZIP locais.

No roteiro principal, o cursor antes de novos comandos `/` é posicionado pela API pública `editor.commands.focus('end')`; digitação, menu, escolha de destino e envio são feitos pela interface real. Isso evita confundir o foco nativo de um link com um cursor de escrita na automação. O roteiro final usa clique e teclado em uma fixture própria para verificar grupo pai e código dentro de tarefa. Esses recortes não homologam toda a navegação de caret por teclado entre referências inline.

O 403 de storage e o upload inválido são falhas induzidas. Rodadas exploratórias atingiram o limite normal de 120 requisições por janela da API. Somente o servidor de fixtures foi reiniciado; limites do produto não foram alterados. O launcher conserva uma chave aleatória exclusivamente local em `.f8-artifacts/f10-session-secret`, ignorada pelo Git e não incluída nas evidências.

## Reprodução

1. Dependências e fixtures F8 devem estar disponíveis. Na pasta backend, executar `node scripts/run-f8.cjs test` para build e suítes no ambiente isolado; depois `node scripts/f10-serve.cjs` para servir a API em 3047.
2. No frontend, definir `NEXT_DIST_DIR=.next-f10`, `ALLOW_LOOPBACK_IN_BUILD=true`, `NEXT_PUBLIC_API_URL=http://localhost:3047` e `NEXT_PUBLIC_STORAGE_URL=http://localhost:9000/biblioteca-test-f7-f8-20261116`. Executar `npm.cmd run build` e `node node_modules/next/dist/bin/next start -p 3048`.
3. Usar Playwright CLI em sessão própria: abrir `http://localhost:3048`; executar `F10-setup.js`, `F10-browser.js`, `F10-operations.js`, `F10-portability.js` e `F10-final-smoke.js` com `run-code --filename ... --raw`.
4. Entre grupos extensos, reiniciar exclusivamente `f10-serve.cjs` se a janela de limite for consumida. A conta de fixtures permanece válida. O roteiro de portabilidade remove intencionalmente um material da origem no último passo; para repeti-lo, usar uma fixture nova com mídia ou a cópia sobrevivente.
5. Revisar resultados e imagens e gerar o fingerprint com `node backend/scripts/f10-reference.cjs`.

## Pendências de aceite

IME japonês físico, leitor de tela, toque físico e segundo motor não executados. A passagem automatizada não concede homologação integral desses cenários. O aviso de depreciação de `isolatedModules` do ts-jest já existia e permanece sem impedir as suítes.
