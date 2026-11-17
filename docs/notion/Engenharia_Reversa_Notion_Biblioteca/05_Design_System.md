# 05. Especificação visual e design system

## Observado

VIDEO-01 usa fundo escuro, superfícies de menus ligeiramente mais claras, texto branco/cinza, bordas discretas, ícones compactos e azul para seleção. O documento ocupa uma coluna central, a capa é mais larga que o texto e a árvore fica na esquerda. Há rolagem vertical de documento longo e menus sobrepostos. A captura inclui navegador e barra do sistema, que não pertencem à aplicação.

Não foram obtidos CSS, fontes instaladas, escala do sistema ou zoom do navegador. Por isso, nenhuma medida em pixels da gravação é declarada como token original do Notion. O tamanho da fonte e o espaçamento exatos permanecem NÃO DETERMINADOS. Não houve tela móvel nem troca de tema observada.

## Tokens propostos para a Biblioteca

Estes valores são pontos de partida para protótipo e aferição de contraste, não medições da referência.

| Token | Proposta | Motivo |
|---|---|---|
| canvas | #17191D | Base escura com foco na leitura |
| surface/menu | #22252B / #292D35 | Separar navegação e popovers |
| text / muted | #F3F4F6 / #B6BDC9 | Hierarquia sem depender apenas da cor |
| accent / selection | #8AB4FF / #233653 | Foco e seleção visíveis |
| border | #444B58 | Delimitação de controles; validar em contexto |
| danger | #FF8F8F | Mensagens e exclusão, sempre acompanhadas de texto |
| Tipografia | Fonte de sistema com fallback japonês; monospace para código | Evitar downloads obrigatórios e preservar conteúdo multilíngue |
| Texto base | 16 px, entrelinha 1,6 | Proposta de leitura confortável, ajustável |
| Espaçamento | 4, 8, 12, 16, 24, 32, 48 px | Escala comum para componentes |
| Raios | 6 px controles; 10 px menus | Consistência visual |
| Largura de leitura | Máximo de 760 px; opção ampla na segunda entrega | Reduzir linhas muito longas |
| Lateral | Cerca de 248 px no desktop; gaveta em telas estreitas | Acesso à árvore sem comprimir o texto |
| Capa | Faixa proporcional com recorte ajustável | Separar identidade visual de conteúdo |

Definir temas por tokens sem repetir cores nos componentes. O tema escuro é a referência inicial; tema claro não integra os critérios mínimos desta versão. Preservar os elementos de identidade da Biblioteca e usar imagens próprias ou autorizadas, sem reutilizar as capas do vídeo.

## Layout e comportamento propostos

- Desktop: lateral recolhível, cabeçalho com caminho, coluna de leitura e ferramentas contextuais. O painel atual de anexos pode abrir sob demanda.
- Tela estreita: documento em uma coluna, navegação em gaveta; menus cabem na viewport e devolvem foco ao gatilho.
- Código e tabelas largas: rolagem interna identificável; a página não deve ganhar rolagem horizontal por esses elementos.
- Estados: seleção, foco e hover têm tratamentos distintos. Uma falha de salvamento permanece legível e não é representada somente por uma bolinha colorida.
- Reorganização: arrastar é um acelerador; “Mover acima/abaixo” e “Mover para…” também resolvem a ação.

A implementação deve ser comparada em dimensões equivalentes ao vídeo e em viewport estreita. As larguras são metas de projeto revisáveis; não promessas de fidelidade pixel a pixel.
