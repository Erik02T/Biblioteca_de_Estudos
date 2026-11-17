# F12 — Testes, reprodução e matriz consolidada

17/11/2026. Estado final em [F12-resultados.json](../../../output/playwright/F12-resultados.json); hashes de fontes em [F12-codigo.json](../../../output/playwright/F12-codigo.json). Os relatórios F8–F11 continuam históricos.

## Verificações

| Verificação | Evidência da rodada |
|---|---|
| Backend com PostgreSQL/MinIO reais | 29 suítes, 168 testes aprovados; inclui cinco integrações F12 de duplicação/purge |
| HTTP com Prisma simulado | 26 testes aprovados, separados das integrações reais |
| Frontend | 19 suítes, 141 testes aprovados |
| Lint e builds | Backend/frontend; build de produção local `.next-f12` |
| Navegadores | Chrome/Chromium desktop 157.0.8103.79 e Firefox/Gecko 159.0 |
| Aceite físico guiado | IME real nos dois motores; Narrador e zoom 200%/400% no Chrome; Chrome/Android físico por USB |
| Volume | 1.000 páginas; dez amostras por cenário, sem SLA; proprietário confirmou usabilidade |
| Recuperação | Banco e objetos restaurados em novos destinos; hashes e imagem assinada conferidos |
| Exportação offline | ZIPs reais produzidos pela interface; manifesto, caminhos relativos e hashes conferidos sem sessão |

Não somar verificações de browser aos testes de unidade como medida de cobertura. A auditoria axe registra também itens `incomplete`; as confirmações humanas cobrem o recorte funcional guiado e não constituem auditoria integral WCAG.

## Legenda das evidências

- **A:** suites atuais backend/frontend/HTTP, incluindo criação/recuperação, hierarquia, referências, portabilidade e organização reais.
- **B:** `F12-{chromium,firefox}-{journey,compatibility,surfaces,accessibility,clipboard,native-paste-*,integrity,trash,recovery-*}-resultados.json` e encerramento forçado de processo com perfil validado.
- **C:** roteiros F10 repetidos nesta versão: documento misto, uploads, referências, movimento/undo, URL expirada, versões, mídia independente e ZIP.
- **D:** roteiros F11 repetidos nesta versão: coleções, busca, visitas, configurações e modelos com cópias físicas.
- **E:** restauração conjunta e conferência offline dos ZIPs da F12. Migração do acervo habitual é evidência histórica F11, sem nova execução ou mutação habitual na F12.
- **H:** aceite guiado registrado em `F12-aceite-humano.json`.
- **P:** baseline `F12-{chromium,firefox}-performance-resultados.json`, com contexto novo, dados amostrados e métricas discriminadas.
- **N:** roteiros F9 repetidos no build F12: movimento pela interface, criação de subpágina, proteção de saída, capa/recorte/remoção e ícone pelo diálogo nativo.

## Matriz RF-001–026

Cada linha mantém o CT de mesmo número do documento 14. **Os 26 RF e os dez QA estão verificados no recorte definido, com limitações explicitamente aceitas pelo proprietário.** Não há pendência obrigatória aberta nesta matriz; isso não representa certificação ou aceite fora do ambiente descrito.

| RF e nome canônico | Aceite/evidência consolidada |
|---|---|
| RF-001 — Preservar a biblioteca existente | A/B/E: legado e formato atual, JSON incompatível preservado, 13 migrações em fixture nova e restauração conjunta. Ensaio de migração habitual anterior continua explicitamente histórico. |
| RF-002 — Criar e editar páginas persistidas | A/B/C: criação idempotente, resposta perdida, revisão e conteúdo relidos; páginas geradas pela interface/modelos. |
| RF-003 — Organizar páginas em árvore | A/B/N: três níveis, status mistos, parentesco e isolamento; navegação só transporta metadados. |
| RF-004 — Mover páginas e ramos | A/N: concorrência inversa, ciclos/rollback e propagação de seção; movimento pela interface preserva descendentes e recalcula caminho. |
| RF-005 — Navegar por URL, árvore e caminho | A/B/C/N: deep link, recarga, Voltar/Avançar, referência e proteção de pendências. |
| RF-006 — Editar conteúdo essencial por blocos | A/B/C/H: round-trip, headings 1–6, marcas/listas, Unicode e colagem HTML nativa sem conteúdo ativo. |
| RF-007 — Inserir pelo menu de comandos | A/B/C/H: slash/alternativa de inserção, foco/teclado e composição IME real nos dois motores. |
| RF-008 — Operar blocos por menu | A/B/C: item/grupo, conversão recusada sem perda, duplicação, movimento e undo. |
| RF-009 — Usar listas de tarefas | A/B/C: checkbox/texto persistem e não alteram status/entendimento. |
| RF-010 — Usar blocos de código | A/B/C: linguagem, indentação, cópia nativa, recusa/fallback e quebras do Windows. |
| RF-011 — Personalizar cabeçalho e largura | A/D/N: upload, recorte e remoção de capa, recarga e ícone por diálogo nativo nos dois motores; capa capturada em modelo com mídia independente. |
| RF-012 — Anexar materiais e inseri-los no corpo | A/C/D: uploads válidos/inválidos, bloco por ID, renovação de URL, arquivo mantido ao remover bloco. |
| RF-013 — Relacionar páginas por referência interna | A/B/C: dois destinos, rename/move/lixeira; guard e cópia de referência legada. |
| RF-014 — Salvar sem perda silenciosa | A/B/H: fila, atraso/rede, abas conflitantes, quota induzida, processo encerrado e journal segregado por conta. |
| RF-015 — Pesquisar toda a biblioteca | A/D/P/H: corpo fora da primeira página, outras áreas, paginação e isolamento. |
| RF-016 — Favoritar e retomar páginas | A/D: favorito não registra visita; Recentes reflete abertura e preserva ID. |
| RF-017 — Excluir com lixeira e restaurar | A/B: lote respeita exclusão anterior; confirmação/revisão/ownership, versões retidas, limpeza parcial e repetição. |
| RF-018 — Preservar propriedades de estudo | A/B/D: limites, categoria, nível e status independentes; gravação por ID/CAS. |
| RF-019 — Duplicar páginas de forma independente | A/C/D: ramo, arquivo físico, capa e referências internas/canônicas/legadas; origem removida sem quebrar cópia. |
| RF-020 — Adicionar alternantes e destaques | A/B/C: grupo misto, estado recolhido, renomear/F2, undo e exportação. |
| RF-021 — Reordenar arrastando com alternativa equivalente | A/C: arraste, teclado e menu produzem a mesma ordem; persistência e rejeição de ciclos. |
| RF-022 — Ver estudos em tabela e quadro | A/B/D: mesmo ID, propriedades sincronizadas, agrupamento e paginação. |
| RF-023 — Salvar filtros e ordenações | A/B/D: configuração nomeada, recarga, troca de layout, configuração antiga inválida e filtro antes da paginação. |
| RF-024 — Criar páginas a partir de modelos | A/D: captura/preview/apply reais, falha mantendo seleção, aplicações independentes e idempotência. |
| RF-025 — Exportar biblioteca de forma portátil | A/C/E: ZIP sem sessão, JSON/Markdown/manifesto, arquivos relativos, hashes e limites declarados. |
| RF-026 — Guardar e restaurar versões explícitas | A/C/E: checkpoint, snapshot com mídia retida, restauração com revisão atual e estado anterior recuperável. |

## QA-001–010

| QA | Evidência e limite do aceite |
|---|---|
| QA-001 | Axe nos dois motores, Tab/Escape/foco e Narrador guiado. Sem certificação WCAG integral. |
| QA-002 | A/B: atrasos/rede, duas abas, reinício de processo e comparação de revisão/conteúdo. |
| QA-003 | A/B/C: ownership, protocolos/HTML, arquivos inválidos e URLs assinadas renovadas por ID. |
| QA-004 | B/H: 1280×720, 320/375/768/1440 CSS px, zoom nativo 200%/400% e Android físico. |
| QA-005 | P/H: 1.000 páginas, documentos de 1.000 blocos, entrada, salvamento e busca; aceite de uso local sem SLA. |
| QA-006 | A/B/E: versões conhecida/futura, formatos legados/malformados e restauração sem normalização destrutiva. |
| QA-007 | A/B: falhas de upload, conflito, validação, storage e quota; códigos estáveis e identificador de erro. |
| QA-008 | E: dump e objetos, destinos novos, hashes iguais e mídia assinada lida do bucket restaurado. |
| QA-009 | A: suites, lint, builds e regressões dirigidas aos defeitos reproduzidos. |
| QA-010 | B/C/H: Chromium e Gecko reais, IME físico, seleção/colagem/clipboard e movimento equivalente. |

## Reprodução

Na raiz, com dependências da aplicação e Docker disponíveis:

```powershell
node backend/scripts/f12.cjs prepare
node backend/scripts/f12.cjs checks
node backend/scripts/f12.cjs start-api
node backend/scripts/f12.cjs web
```

`web` permanece em seu terminal. As ferramentas de navegador usam Playwright CLI 0.1.24 encontrado no cache npm ou apontado por `F12_PLAYWRIGHT_CLI`. Instalar axe somente no diretório privado: `npm.cmd install --prefix .f12-artifacts/tooling --save-exact --no-audit --no-fund axe-core@4.14.1`. O Firefox precisa estar instalado pelo Playwright compatível com a CLI.

```powershell
node backend/scripts/f12-browser.cjs chromium open
node backend/scripts/f12-suite.cjs chromium f10
node backend/scripts/f12-suite.cjs chromium f11
node backend/scripts/f12-suite.cjs chromium core
node backend/scripts/f12-browser.cjs chromium performance
```

Repetir os grupos com `firefox`, respeitando um lote de cada vez. `core` cria novas contas/páginas de fixtures e preserva as anteriores, a conta humana e a conta de volume. `performance` usa contexto novo com a conta de 1.000 páginas; reiniciar somente a API de fixtures antes de cada lote longo. Não reiniciar frontend/API no meio de um cenário.

Para a rodada humana, `node backend/scripts/f12-human.cjs chromium` ou `firefox`; acrescentar `volume` abre a conta de 1.000 páginas. Para Android, preparar platform-tools oficiais em `.f12-artifacts/android`, usar `f12-android.cjs inspect`, conectar/autorizar o aparelho e executar `connect`. O servidor adb é exclusivo da F12 (5038); os forwards são 3067/3068/9000 e CDP 9223. Ao terminar, `disconnect` remove apenas esses mapeamentos.

Depois dos testes e sem edições simultâneas nas fixtures:

```powershell
node backend/scripts/f12.cjs recovery
node backend/scripts/f12-evidence.cjs exports
node backend/scripts/f12-evidence.cjs report
node backend/scripts/f12.cjs reference
```

O agregador só declara homologação quando os resultados obrigatórios, aceites humanos e limitações aceitas estão registrados. Não sintetiza aceite humano a partir de testes automáticos.
