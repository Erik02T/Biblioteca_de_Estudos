# Frontend - Biblioteca de Estudos

Frontend em Next.js 16.4.5 para a Biblioteca de Estudos.

## Tecnologias

- Next.js 16.4.5
- React 19
- Tiptap (editor de texto rico)
- TypeScript

## Instalação

```bash
npm ci --include=dev
```

## Configuração

Crie um arquivo `.env.local` com as variáveis de ambiente:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_STORAGE_URL=http://localhost:9000/biblioteca-estudos
```

## Comandos

### Desenvolvimento
```bash
npm run dev
```

O frontend usa `http://localhost:3000` por padrão. Se essa porta estiver ocupada, o Next.js usará a próxima porta disponível (comumente `3001`).

### Build
```bash
npm run build
```

Para validar um build local sem expor o ambiente de desenvolvimento em produção, use a proteção explícita do loopback apenas em smoke tests locais:

```bash
ALLOW_LOOPBACK_IN_BUILD=true npm run build
```

### Produção
```bash
npm run start
```

### Testes
```bash
npm test
```

### Lint
```bash
npm run lint
```

## Funcionalidades

- Navegação por seções (Linguagens, Faculdade, Projetos, Outros)
- Subseções (Estudando, Estudado)
- Grid de blocos com nome, categoria, nível de entendimento e ícone
- Editor de texto rico com Tiptap (headings h1-h6, destaques coloridos)
- Gerenciamento de anexos (links, imagens, arquivos)
- Autenticação com JWT (access tokens e refresh tokens)
- Autosave com debounce

## Estrutura

```
src/app/
├── AreaEditor.tsx          # Componente de editor Tiptap
├── EditorLayout.tsx        # Layout principal do editor
├── EditorLayout.module.css # Estilos do editor
├── extensions.ts           # Extensões do Tiptap
├── page.tsx                # Página principal
├── page.module.css         # Estilos da página principal
├── layout.tsx              # Layout raiz
└── globals.css            # Estilos globais
```


## F8 — salvamento e recuperação local

Páginas existentes salvam conteúdo e propriedades na mesma fila de autosave de 700 ms. Páginas novas começam com “Sem título” e “Geral” e são criadas por ação explícita. O indicador “Salvo” cobre a fila confirmada; uma resposta antiga não confirma uma edição posterior.

Rascunhos ficam em IndexedDB, separados por conta e sessão de edição. A conta é confirmada pela API antes de consultar os rascunhos. Reabrir oferece recuperação explícita; versão remota divergente permite baixar o rascunho para comparação e impede sobrescrita automática. Trocar de conta preserva o journal da conta original sem exibi-lo à outra. Limpar os dados do navegador apaga esses registros; falha do armazenamento mantém o texto em memória e bloqueia escrita sem proteção local.

O frontend F8 exige backend com `/auth/me` e a migração de recibos de criação para o fluxo com `Idempotency-Key`. A migração foi ensaiada em bases isoladas, não no acervo habitual. O roteiro de teste real está em `../output/playwright/F8-integridade.js`; relatório e backlog em `../docs/notion/execucao/F8.md`.

Atualização posterior, BUG-F9-001 de 16/11/2026: a migração foi aplicada ao banco local habitual após backup e ensaio em clone, corrigindo o erro 500 ao criar página. Ver [F9-correcoes.md](../docs/notion/execucao/F9-correcoes.md).

## F9 — navegação e escrita

A árvore lateral representa todos os status da área, independentemente dos filtros da coleção. Caminho e árvore usam a URL por ID e salvam pendências antes de navegar. O título é editável no documento; Enter passa ao texto. “Nova subpágina” confirma a mãe e abre uma filha com parentesco preenchido.

Propriedades, materiais e índice ficam sob demanda; modo foco mantém o documento e leva o cursor ao texto. Capa, recorte e ícone persistem pelo mesmo autosave de conteúdo e propriedades. Aceite e limites em [F9](../docs/notion/execucao/F9.md); roteiros em `../output/playwright/F9-*.js`.

## F12 — compatibilidade e homologação integrada

Formatos desconhecidos ficam preservados com edição do corpo bloqueada; alterar propriedades não substitui seu JSON. Documentos `schemaVersion: 1` mantêm o envelope ao editar. A navegação reutiliza os metadados carregados ao abrir um documento e atualiza a árvore após mudanças estruturais e retorno à coleção.

A lixeira oferece exclusão definitiva confirmada, com revisão atual e mensagem de recuperação em falha de limpeza. Galeria/modelos mantêm foco modal; alternantes têm renomeação separada e checklists têm alvos de 24 px. Testes de Chromium/Gecko, IME real, Narrador, zoom e Android estão em [F12-testes](../docs/notion/execucao/F12-testes.md). Build de fixtures: `.next-f12`; nenhum arquivo `.env` habitual é alterado pelos runners.
