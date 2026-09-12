# Front-end

Esta pasta concentra a documentação técnica do Front-end do RH Connect após a atualização do protótipo exportado do Figma Make.

Os documentos aqui registrados servem como referência para preparar, validar e conduzir a evolução do protótipo visual para uma arquitetura de produto, preservando a identidade visual, reduzindo riscos e organizando a migração estrutural de forma gradual.

## Documentos

- [Auditoria do protótipo atualizado](./auditoria-prototipo-atualizado.md): estado técnico e funcional atual do `apps/web`, stack encontrada, navegação, riscos e recomendações.

- [Mapa de telas do Front-end](./mapa-de-telas-front-end.md): telas por perfil, prioridade, status, dependência com Back-end, rotas futuras sugeridas e relação com a entrega testável de 10/09.

- [Plano Operacional Front-end — Pré-Migração Estrutural](./plano-operacional-front-end-pre-migracao.md): organiza as frentes de preparação do Front-end antes da migração estrutural, incluindo Design System, dependências, rotas, responsividade, testes e mapeamento da base atual.

- [Guia Operacional — Validação Visual do Design System](./guia-operacional-validacao-visual-design-system.md): orienta a equipe responsável por comparar o produto atual com a referência visual aprovada, registrar padrões, inconsistências, evidências e recomendações antes da consolidação do Design System v0.1.

- [Guia Operacional — Limpeza de Dependências do Front-end](./guia-operacional-limpeza-dependencias-front-end.md): orienta a análise do uso real das dependências e a remoção apenas das bibliotecas comprovadamente seguras.

- [Guia Operacional — Validação do Mapa de Rotas](./guia-operacional-validacao-mapa-rotas.md): orienta a equipe responsável por validar as rotas propostas, perfis, regras de acesso, parâmetros, prioridades e sequência de navegação antes da implementação estrutural com React Router.

- [Plano de migração do App.tsx](./plano-de-migracao-app-tsx.md): plano incremental para reduzir o arquivo principal e reorganizar a base sem reconstruir o protótipo do zero.

- [Mocks e dados temporários](./mocks-e-dados-temporarios.md): inventário inicial de hardcodes, mocks e simulações presentes no protótipo atualizado.

- [Escopo da entrega de 10/09](./escopo-entrega-10-09.md): recorte funcional atual da entrega testável de 10/09.

## Fases do Front-end

A evolução atual do Front-end está organizada em duas fases principais:

```text
PRÉ-MIGRAÇÃO ESTRUTURAL
↓
Auditorias
Validações
Limpezas seguras
Responsividade crítica
Testes
Mapeamentos
↓
CHECKPOINT
↓
MIGRAÇÃO ESTRUTURAL
↓
Mocks
Pages
Layouts
Rotas reais
Navegação
Integração