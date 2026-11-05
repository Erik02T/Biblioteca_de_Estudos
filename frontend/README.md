# Frontend - Biblioteca de Estudos

Frontend em Next.js 16.4.5 para a Biblioteca de Estudos.

## Tecnologias

- Next.js 16.4.5
- React 19
- Tiptap (editor de texto rico)
- TypeScript

## Instalação

```bash
npm install
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
