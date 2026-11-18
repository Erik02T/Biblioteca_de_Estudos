# Biblioteca de Estudos — engenharia reversa do Notion

**Especificação funcional e técnica, versão 1.0 — 10/11/2026**

Objetivo: evoluir o projeto existente para uma versão pessoal simplificada do fluxo de páginas/blocos do Notion. Entrega de análise e planejamento; nenhuma implementação. Leia primeiro o resumo executivo, depois requisitos, arquitetura e plano. As evidências completas e limitações estão no documento 02.

## Índice dos documentos

- [01. Resumo executivo](01_Resumo_Executivo.md)
- [02. Inventário de evidências e cobertura](02_Evidencias_e_Cobertura.md)
- [03. Mapa de módulos e páginas](03_Modulos_e_Paginas.md)
- [04. Catálogo de componentes](04_Componentes.md)
- [05. Especificação visual e design system](05_Design_System.md)
- [06. Matriz de interações e estados](06_Interacoes_e_Estados.md)
- [07. Fluxos e casos de uso](07_Fluxos_e_Casos_de_Uso.md)
- [08. Requisitos funcionais, não funcionais e histórias](08_Requisitos_e_Historias.md)
- [09. Regras de negócio](09_Regras_de_Negocio.md)
- [10. Modelo conceitual de dados e contratos](10_Dados_e_Contratos.md)
- [11. Proposta arquitetural e decisões](11_Arquitetura_e_Decisoes.md)
- [12. Planejamento incremental](12_Plano_Incremental.md)
- [13. Backlog priorizado](13_Backlog_Priorizado.md)
- [14. Matriz de rastreabilidade e testes](14_Rastreabilidade_e_Testes.md)
- [15. Lacunas, hipóteses e validação](15_Lacunas_e_Validacao.md)


## Correspondência com as fases do prompt fornecido

| Fase solicitada | Entregável correspondente |
|---|---|
| 0 — Inventário | 02 |
| 1 — Investigação multimodal | 02 e 06 |
| 2 — Decomposição | 03 |
| 3 — Design system | 04 e 05 |
| 4 — Comportamentos | 06 e 07 |
| 5 — Requisitos | 08 |
| 6 — Regras | 09 |
| 7 — Dados/contratos | 10 |
| 8 — Arquitetura | 11 |
| 9 — Planejamento | 12 e 13 |
| 10 — Validação | 14 |
| 11 — Lacunas | 15 |
| 12 — Organização | Este índice e os 15 documentos |
| 13 — Auditoria | 15 e verificação de integridade dos arquivos |

## Como usar com uma IA de desenvolvimento

Forneça a pasta inteira, informe a branch alvo e aprove primeiro o recorte de escopo. Peça que comece por F0, leia AGENTS.md e a documentação local indicada, confirme os GAPs em execução e preserve dados. Cada entrega deve citar BK, RF, RN e CT/QA atendidos. Não pedir que a IA implemente os 26 requisitos numa única mudança.

Os caminhos do repositório são relativos à revisão fixada, não arquivos do projeto modificados por esta análise. Menus presentes no vídeo não comprovam resultado de execução. As decisões PROPOSTAS precisam de validação antes do desenvolvimento, como determina o texto metodológico anexado.
