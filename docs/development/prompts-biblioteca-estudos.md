# Prompts — Biblioteca do Conhecimento

Um par de prompts por fase: **Planejar e Implementar** (use antes de começar a fase)
e **Testar e Validar** (use depois de terminar, antes de avançar pra próxima).

Sempre cole o prompt junto com o contexto do projeto (o schema.prisma e os
arquivos já existentes), pra o assistente não reinventar o que já foi decidido.

---

## Fase 1 — Modelagem de dados

### Planejar e implementar
```
Estou implementando a Fase 1 (modelagem de dados) do projeto "Biblioteca do
Conhecimento". Aqui está o schema.prisma atual: [cole o schema.prisma].

Quero que você:
1. Revise se o schema cobre todos os requisitos: Area (seção fixa, subseção
   fixa, nome, categoria, nível de entendimento, ícone, conteúdo em JSON) e
   Attachment (tipo link/imagem/arquivo, vinculado a uma Area).
2. Aponte qualquer índice, constraint ou relação faltando antes de eu rodar
   a migração.
3. Me dê o comando exato de migração pra rodar localmente com Postgres.

Não implemente nada de backend ou frontend ainda — só a camada de dados.
```

### Testar e validar
```
Acabei de rodar a migração do schema.prisma. Quero validar a Fase 1 antes de
seguir pro backend. Me ajude a:
1. Escrever um script simples (via Prisma Client num arquivo .ts solto, sem
   NestJS ainda) que cria uma Area de teste e um Attachment vinculado a ela.
2. Confirmar que os enums (SectionType, SubSectionType, AttachmentType)
   rejeitam valores inválidos.
3. Confirmar que apagar uma Area apaga os Attachments dela em cascata
   (onDelete: Cascade).

Me diga, em cada teste, o que eu deveria ver se estiver funcionando certo.
```

---

## Fase 2 — Backend: CRUD básico

### Planejar e implementar
```
Estou implementando a Fase 2 (CRUD no backend com NestJS) do projeto
"Biblioteca do Conhecimento". Já tenho o schema.prisma e os módulos areas e
attachments com o UserIdGuard: [cole os arquivos relevantes].

Quero implementar em duas etapas dentro dessa fase:
1. Primeiro, sem o guard — só a lógica de CRUD pura. Me ajude a revisar o
   AreasService e AreasController.
2. Depois de eu confirmar que o CRUD puro funciona, me ajude a ligar o
   UserIdGuard e confirmar que ele bloqueia requests sem X-User-Id válido.

Não crie nenhuma tela de frontend nessa fase. O objetivo é eu conseguir
testar tudo via Postman/Insomnia.
```

### Testar e validar
```
Terminei a Fase 2 (CRUD no backend). Quero validar antes de partir pro
frontend. Me dê uma sequência de requests (formato Postman/curl) pra eu
rodar manualmente, cobrindo:
1. Criar uma Area sem X-User-Id → deve falhar com erro claro.
2. Criar uma Area com X-User-Id válido → deve retornar 201 com os dados.
3. Listar Areas filtrando por section e subSection → só deve trazer as do
   userId usado.
4. Criar uma segunda Area com um X-User-Id diferente e confirmar que o
   primeiro usuário não a vê na listagem.
5. Editar e deletar uma Area, e confirmar que deletar também remove os
   Attachments vinculados.

Para cada request, me diga o resultado esperado (status code e formato do
corpo da resposta) pra eu comparar com o que recebo de verdade.
```

---

## Fase 3 — Frontend: listagem (somente leitura)

### Planejar e implementar
```
Estou implementando a Fase 3 (listagem no frontend, somente leitura) do
projeto "Biblioteca do Conhecimento", usando Next.js. O backend já está
funcionando (Fase 2 validada).

Quero implementar:
1. Geração e persistência do UUID de usuário no primeiro acesso
   (crypto.randomUUID() salvo em localStorage).
2. Tela "Biblioteca do conhecimento" com as 4 seções fixas
   (Linguagens/Faculdade/Projetos/Outros).
3. Tela de seção com as duas subseções (Estudando/Estudado).
4. Tela de subseção com o grid de blocos, consumindo
   GET /areas?section=...&subSection=... e mostrando nome, categoria, nível
   de entendimento e ícone de cada Area.

Não implemente formulário de criação/edição nem o editor de texto ainda —
essa fase é só leitura e navegação.
```

### Testar e validar
```
Terminei a Fase 3 (listagem no frontend). Quero validar antes de avançar
pro formulário de criação. Me ajude a conferir manualmente:
1. Ao abrir o app pela primeira vez num navegador limpo (ou aba anônima),
   um UUID novo é gerado e salvo em localStorage.
2. Recarregando a página, o mesmo UUID é reaproveitado (não gera um novo).
3. Áreas criadas via Postman com esse UUID aparecem corretamente na
   seção/subseção certas.
4. Áreas de outro userId (criadas via Postman com outro UUID) NÃO aparecem.
5. Navegar entre Biblioteca → Seção → Subseção → grid funciona sem
   recarregar a página inteira (navegação client-side).

Me diga como simular o "outro userId" no navegador pra testar o item 4 sem
precisar de um segundo dispositivo.
```

---

## Fase 4 — Frontend: criar e editar blocos (formulário simples)

### Planejar e implementar
```
Estou implementando a Fase 4 (formulário simples de criar/editar) do
projeto "Biblioteca do Conhecimento". A Fase 3 (listagem) já está validada.

Quero implementar:
1. Um formulário com nome, categoria, nível de entendimento e ícone
   (o campo de conteúdo pode ser um <textarea> comum por enquanto, sem
   editor rico ainda).
2. Botão de criar nova Area, que faz POST /areas e volta pra listagem.
3. Botão de editar uma Area existente, que faz PATCH /areas/:id.
4. Botão de deletar com confirmação, que faz DELETE /areas/:id.
5. Validação simples no frontend (nome e categoria obrigatórios) antes de
   enviar o request.

Ainda não implemente o Tiptap nem os anexos.
```

---

## Fase 5 — Editor de texto rico (Tiptap)

### Planejar e implementar
```
Estou implementando a Fase 5 (editor Tiptap) do projeto "Biblioteca do
Conhecimento". A Fase 4 (formulário simples com textarea) já está validada.
Aqui estão os arquivos extensions.ts e AreaEditor.tsx que já preparei:
[cole os arquivos].

Quero:
1. Trocar o <textarea> do formulário da Fase 4 pelo componente AreaEditor.
2. Confirmar que os headings h1-h6 e os destaques coloridos (multicolor)
   funcionam na toolbar.
3. Revisar o autosave com debounce — quero confirmar que ele não dispara
   um PATCH a cada tecla digitada, só depois de eu parar de digitar.

Não implemente anexos ainda.
```

### Testar e validar
```
Terminei a Fase 5 (editor Tiptap). Quero validar antes de partir pros
anexos. Me ajude a conferir:
1. Escrever um título e aplicar cada nível de heading (h1 até h6) — a
   formatação visual muda de acordo?
2. Selecionar um trecho de texto e aplicar duas cores de destaque
   diferentes em partes diferentes do texto.
3. Salvar, recarregar a página inteira, e confirmar que a formatação
   (headings e cores) persistiu exatamente como estava.
4. Digitar rapidamente por alguns segundos e observar na aba Network do
   navegador que o PATCH só dispara uma vez, depois que eu paro de digitar
   (confirma o debounce).
5. Abrir a mesma Area em duas abas diferentes, editar em uma, e confirmar
   que a outra só reflete a mudança depois de recarregar (comportamento
   esperado nessa fase, já que não há sincronização em tempo real).
```

---

## Fase 6 — Anexos (links, imagens, arquivos)

### Planejar e implementar
```
Estou implementando a Fase 6 (anexos) do projeto "Biblioteca do
Conhecimento". As fases 1 a 5 já estão validadas. Já tenho o módulo
attachments no backend: [cole os arquivos].

Quero implementar:
1. Endpoint de upload no backend que recebe um arquivo/imagem, salva num
   storage (S3 ou R2 compatível) e retorna a URL.
2. Botão lateral superior direito na tela da Area (como no protótipo) com
   três opções: adicionar link, subir imagem, subir arquivo.
3. Para link: um input simples que chama POST /attachments direto com a
   URL informada.
4. Para imagem/arquivo: upload primeiro pro endpoint de storage, depois
   POST /attachments com a URL retornada.
5. Listagem dos anexos já existentes na Area, com opção de remover
   (DELETE /attachments/:id).

Me avise se algum dado sensível (tipo credenciais do storage) precisa ficar
só em variável de ambiente antes de eu escrever qualquer código.
```

### Testar e validar
```
Terminei a Fase 6 (anexos) — última fase do escopo inicial. Quero validar
o fluxo completo:
1. Adicionar um link → aparece na lista de anexos da Area sem reload.
2. Subir uma imagem → o upload completa, a URL retornada é salva, e a
   imagem aparece corretamente na lista (idealmente com preview).
3. Subir um arquivo comum (ex: PDF) → mesmo fluxo, mas sem preview,
   só o nome/link pra abrir.
4. Remover um anexo → some da lista e confirmo no banco (via Prisma
   Studio) que o registro foi apagado.
5. Deletar a Area inteira e confirmar que os anexos vinculados também
   somem (cascade), tanto no banco quanto — se você implementou limpeza
   de storage — nos arquivos físicos.

Me diga que erros são mais comuns nessa fase (tamanho de arquivo, tipo de
MIME, CORS no upload) pra eu já testar esses casos de propósito.
```
