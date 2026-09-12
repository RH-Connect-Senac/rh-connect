# Design System — RH Connect

## Status

Diretriz adotada para a construção do Design System do RH Connect.

## Decisão

O Design System do RH Connect será construído a partir da auditoria do Protótipo 01 e da identidade visual já aprovada.

Os padrões existentes serão

- preservados quando coerentes;
- consolidados quando houver variações;
- substituídos apenas quando houver inconsistência;
- ajustados quando houver problema de acessibilidade;
- revisados quando houver necessidade técnica.

## Objetivo

Transformar os padrões visuais atualmente presentes no Protótipo 01 em um sistema visual consistente, reutilizável, documentado e adequado para desenvolvimento.

O objetivo não é realizar um redesign completo da plataforma.

## Princípios

- preservar a identidade visual aprovada;
- evitar alterações visuais sem justificativa;
- reduzir valores hardcoded;
- utilizar tokens semânticos;
- criar componentes reutilizáveis;
- manter consistência entre telas;
- considerar responsividade e acessibilidade;
- documentar decisões visuais importantes.

## Processo

O Design System será desenvolvido de forma incremental

1. auditoria visual do Protótipo 01;
2. levantamento de cores, tipografia, spacing, radius, sombras e estados;
3. identificação de inconsistências e duplicações;
4. definição dos tokens oficiais;
5. consolidação dos componentes fundamentais;
6. consolidação dos componentes estruturais;
7. documentação dos componentes;
8. utilização de Storybook quando a base estiver suficientemente estável.

## Componentes prioritários

Primeira fase

- Button
- Input
- PasswordInput
- Checkbox
- Select
- Textarea
- Card
- Badge
- Alert
- FormField
- Dialog  Modal
- Toast

Segunda fase

- Sidebar
- Header  TopBar
- PageHeader
- EmptyState
- DataTable
- Pagination
- Filters
- StatusBadge
- Tabs

## Regra para implementação

Nenhum agente ou desenvolvedor deve substituir a identidade existente por uma nova linguagem visual sem decisão explícita da equipe.

Durante refatorações estruturais, o comportamento esperado é preservar a aparência atual sempre que possível.

Alterações visuais devem ocorrer em tarefas específicas de Design System ou UX, e não como efeito colateral de uma refatoração técnica.