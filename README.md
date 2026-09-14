# Biblioteca do Conhecimento

Aplicação web para organizar conhecimentos, matérias e projetos em uma biblioteca pessoal. O projeto permite separar áreas por seção e status de estudo, editar conteúdo com formatação rica e associar links, imagens e arquivos a cada bloco.

## Pra que serve

A Biblioteca do Conhecimento resolve o problema de espalhar anotações entre matérias, projetos e referências sem uma organização consistente. Cada assunto fica em uma área própria, dentro de uma das quatro seções fixas, com categoria, nível de entendimento, conteúdo editável e anexos relacionados.

## Como foi planejado

O projeto foi dividido em fases incrementais, validando a base antes de adicionar novas telas:

0. Infraestrutura de desenvolvimento com Docker Compose.
1. Modelagem de dados com Prisma e PostgreSQL.
2. CRUD de áreas e anexos no backend.
3. Navegação e listagem no frontend.
4. Formulário de criação, edição e exclusão de blocos.
5. Editor rico com Tiptap, headings h1-h6, destaque multicolorido e autosave.
6. Links, imagens e arquivos anexados às áreas.

### Decisões de arquitetura

- **NestJS no backend:** organiza a API em módulos, controllers, services e DTOs com validação.
- **Prisma + PostgreSQL:** fornece migrations versionadas, enums para os valores fixos e uma relação explícita entre áreas e anexos.
- **Next.js no frontend:** concentra a aplicação web em uma interface React com navegação client-side.
- **Tiptap:** permite persistir o conteúdo do editor como JSON estruturado, mantendo headings e destaques editáveis.
- **Identificação por `userId`:** na primeira versão não existe login. O frontend cria um UUID, salva-o no `localStorage` e envia-o no header `X-User-Id`. Isso é adequado para prototipação local, mas não deve ser tratado como autenticação para dados sensíveis.

## Como foi implementado

### Modelo de dados

O banco possui duas entidades principais:

- **Area:** pertence a um `userId`, possui uma seção (`LINGUAGENS`, `FACULDADE`, `PROJETOS` ou `OUTROS`), uma subseção (`ESTUDANDO` ou `ESTUDADO`), nome, categoria, nível de entendimento, ícone e conteúdo JSON do Tiptap.
- **Attachment:** representa um link, imagem ou arquivo associado a uma `Area`. A relação usa exclusão em cascata no banco.

O backend também possui upload compatível com S3/R2/MinIO. O upload salva o objeto no storage e retorna uma URL; o frontend registra essa URL como `Attachment` em seguida.

### Estrutura do repositório

```text
.
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── scripts/
│   └── src/
│       ├── areas/
│       ├── attachments/
│       ├── common/
│       └── prisma/
├── frontend/
│   ├── public/
│   └── src/app/
│       ├── AreaEditor.tsx
│       ├── extensions.ts
│       ├── page.tsx
│       └── *.css
├── docker-compose.yml
├── env.example
└── prompts-biblioteca-estudos.md
```

## Como usar

### Pré-requisitos

- Git
- Node.js compatível com os tipos usados no projeto, preferencialmente Node.js 20 ou superior
- npm
- Docker Desktop com Docker Compose
- Uma conta no storage S3/R2, ou um MinIO local configurado para o upload de anexos

### Clonar e instalar

```bash
git clone https://github.com/Erik02T/Biblioteca_de_Estudos.git
cd Biblioteca_de_Estudos

cd backend
npm install
cd ../frontend
npm install
cd ..
```

### Subir a infraestrutura local

```bash
docker compose up -d
docker compose ps
```

O Compose inicia:

- PostgreSQL em `localhost:5432`
- MinIO API em `localhost:9000`
- MinIO Console em `http://localhost:9001`

### Configurar variáveis de ambiente

Copie o exemplo para um arquivo local e preencha as credenciais do storage:

```powershell
Copy-Item env.example .env
Copy-Item env.example backend\.env
```

```bash
cp env.example .env
cp env.example backend/.env
```

O arquivo não deve ser commitado. Os valores mínimos são:

```env
DATABASE_URL="postgresql://biblioteca:biblioteca@localhost:5432/biblioteca_estudos"
FRONTEND_URL="http://localhost:3001"
STORAGE_BUCKET="biblioteca-estudos"
STORAGE_PUBLIC_URL="http://localhost:9000/biblioteca-estudos"
STORAGE_ENDPOINT="http://localhost:9000"
STORAGE_REGION="us-east-1"
STORAGE_ACCESS_KEY_ID="..."
STORAGE_SECRET_ACCESS_KEY="..."
STORAGE_FORCE_PATH_STYLE="true"
```

O bucket e as credenciais do MinIO precisam existir antes de testar uploads. Para links, áreas e editor, apenas o PostgreSQL é necessário.

Para configurar o MinIO localmente, abra `http://localhost:9001` e entre com:

- Usuário: `biblioteca_storage`
- Senha: `biblioteca_storage_dev_2026`

Crie o bucket `biblioteca-estudos` e configure leitura pública apenas para desenvolvimento local. Sem essa política, o upload pode funcionar, mas a URL retornada não ficará acessível pelo navegador. Em ambientes reais, use bucket privado e URLs assinadas.

> Observação: o Prisma CLI lê `backend/.env` durante as migrations. O processo Nest também precisa receber `DATABASE_URL` e as demais variáveis no ambiente em que for iniciado. Em shells que não carregam `.env` automaticamente, exporte-as antes de iniciar o backend ou use uma ferramenta de carregamento de ambiente.

### Rodar as migrations

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

Durante o desenvolvimento, quando houver uma alteração no schema, use:

```bash
npx prisma migrate dev --name nome_da_mudanca
```

### Iniciar o backend

Em um terminal, com as variáveis de ambiente disponíveis:

```bash
cd backend
npm run start:dev
```

A API ficará disponível em `http://localhost:3000`.

### Iniciar o frontend

Em outro terminal:

```bash
cd frontend
npm run dev
```

Abra `http://localhost:3001`. Para usar outra URL da API, defina `NEXT_PUBLIC_API_URL` antes de iniciar o frontend.

### Testes e validações

```bash
cd backend
npm test
npm run test:e2e
npm run build

cd ../frontend
npm run lint
npm run build
```

## Publicar no GitHub

### Opção A: GitHub CLI

Instale o [GitHub CLI](https://cli.github.com/) e autentique-se:

```bash
gh auth login
```

Na raiz do projeto:

```bash
git init
git branch -M main
git add .
git commit -m "chore: initial project setup"
gh repo create Erik02T/Biblioteca_de_Estudos --public --source=. --remote=origin --push
```

Para um repositório privado, troque `--public` por `--private`.

### Opção B: pelo site do GitHub

1. Acesse <https://github.com/new>.
2. Informe `Biblioteca_de_Estudos` como nome do repositório.
3. Escolha público ou privado.
4. Não marque as opções de README, `.gitignore` ou licença, pois os arquivos serão enviados do projeto local.
5. Crie o repositório e execute, na raiz local:

```bash
git init
git branch -M main
git add .
git commit -m "chore: initial project setup"
git remote add origin https://github.com/Erik02T/Biblioteca_de_Estudos.git
git push -u origin main
```

Antes do primeiro `git add .`, confirme que `.env`, `backend/.env`, `frontend/.env*`, `node_modules`, builds e arquivos `.zip` estão sendo ignorados:

```bash
git status --short --ignored
```

## Revisão rápida para quem acabou de clonar

- O Docker Compose fornece PostgreSQL e MinIO, mas não cria automaticamente o bucket do MinIO.
- O upload de imagem/arquivo depende de um storage configurado; adicionar links não depende dele.
- O backend usa `X-User-Id` como identificação temporária, não como autenticação real.
- O frontend espera a API em `http://localhost:3000` e normalmente roda em `http://localhost:3001`.
- O processo Nest precisa receber `DATABASE_URL`; copiar o arquivo de ambiente sem carregá-lo no processo pode causar erro de conexão.
