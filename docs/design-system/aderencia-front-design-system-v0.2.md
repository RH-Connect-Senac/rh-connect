# Aderência do Front ao Design System v1 — v0.2

## 1. Objetivo

Registrar o estado final de aderência do Front-end do RH Connect ao Design System v1 após a rodada de consolidação e aplicação integral experimental realizada na branch:

`lab/design-system-v1-integral`

Checkpoint de fechamento:

`17df8e8 feat: consolida aplicacao integral experimental do design system v1`

Este documento não redefine o Design System. Ele registra o grau de aplicação prática do DS v1 no Front atual e classifica itens ainda não aplicados como exceções conscientes ou evoluções futuras.

---

## 2. Fontes oficiais do Design System v1

A avaliação de aderência considera como fontes principais:

- `docs/design-system/design-system-foundations-v1.md`
- `docs/design-system/components-v1.md`
- `docs/design-system/patterns-layout-v1.md`
- `docs/design-system/product-components-v1.md`
- `docs/design-system/pendencias-aplicacao-design-system-v1.md`

Em caso de conflito com documentos arquivados ou versões anteriores, prevalecem os documentos oficiais atuais acima.

---

## 3. Resumo executivo

A aplicação experimental integral do Design System v1 foi concluída dentro do escopo atual do Front.

Situação final:

- Foundations: aderência consolidada;
- Actions: resolvido;
- Forms: resolvido;
- Selection: resolvido nos casos seguros;
- Status: resolvido;
- Surfaces/Feedback: resolvido;
- Overlays: primitives alinhados, com exceções comportamentais conscientes;
- Navigation: aplicação parcial compatível com o estado atual da arquitetura;
- Patterns/Layout: aplicados apenas onde havia repetição segura e estável;
- Product Components: mantidos para evolução conforme fluxos reais;
- bloqueadores reais de fechamento: `0`.

Os itens não implementados nesta fase foram classificados como exceções conscientes ou evoluções futuras e não impedem o fechamento do DS v1.

---

## 4. Foundations

### Status

RESOLVIDO

O Front passou a respeitar as foundations oficiais como referência visual transversal.

Principais pontos consolidados:

- cor primária de marca e ação;
- superfícies oficiais;
- tipografia operacional;
- radius de controls e surfaces;
- linguagem visual de foco;
- bordas e sombras;
- spacing;
- estados hover, disabled e invalid;
- transitions consistentes.

Também foi consolidada a regra de que primitives oficiais devem ser a fonte visual principal para novos componentes e compositions.

---

## 5. Actions

### Status

RESOLVIDO

Foram consolidados:

- `Button`;
- variações de ação;
- `IconButton`;
- `TextLink`;
- botões locais passando a compor o primitive oficial;
- padronização de ações textuais de retorno;
- remoção de setas textuais redundantes em ações de “Voltar”.

As ações de retorno preservam seus textos específicos de contexto.

Exemplos:

- “Voltar à Lista”;
- “Voltar à página inicial”;
- “Voltar ao login”.

---

## 6. Surfaces e Card

### Status

RESOLVIDO

O `Card` oficial passou a atuar como primitive visual estruturalmente neutro.

O Card base não impõe:

- `flex`;
- `flex-col`;
- `gap` estrutural.

Essas decisões ficam sob responsabilidade do consumidor ou de compositions específicas.

Isso evita regressões em:

- cards horizontais;
- métricas;
- cards informativos;
- cards de contexto;
- layouts com conteúdo lado a lado.

---

## 7. Forms

### Status

RESOLVIDO

Foram consolidados:

- `Input`;
- `Textarea`;
- `SelectTrigger`;
- `SearchInput`;
- `PasswordInput`;
- `NativeSelect`.

A família de controles compartilha a mesma linguagem visual.

Regra consolidada:

`Input`, `Textarea`, `SelectTrigger`, `SearchInput` e `PasswordInput` não devem reinventar foco, border, radius, shadow ou transitions.

O `SearchInput` utiliza o `Input` oficial como base e adiciona apenas composição de busca.

O `PasswordInput` utiliza o `Input` oficial como base e adiciona apenas o controle de visibilidade de senha.

O `NativeSelect` mantém o comportamento nativo onde a migração para Radix não gera ganho prático.

---

## 8. Selection

### Status

RESOLVIDO NO ESCOPO SEGURO

Foram aplicados:

- `Checkbox` oficial com dimensão de 20px;
- `FilterChip`;
- estados semânticos com `aria-pressed` em seleções seguras.

Os seguintes casos foram deliberadamente mantidos:

- `Toggle` local;
- seleções que ainda não justificam `SelectableCard`;
- `RadioGroup` sem uso estável que justifique migração.

O `Toggle` atual já possui:

- `role="switch"`;
- `aria-checked`.

A substituição pelo `Switch` oficial foi evitada para não introduzir regressão visual ou comportamental.

---

## 9. Status e metadata

### Status

RESOLVIDO

Uso consolidado:

- `StatusBadge` para estados inequívocos do produto;
- `Badge` para metadata e informação contextual segura.

A migração foi feita apenas onde a semântica era clara, evitando classificar metadata como status de produto.

---

## 10. Feedback e System States

### Status

RESOLVIDO NO ESCOPO ATUAL

Foram consolidados:

- `Alert`;
- variantes `info`, `success`, `warning` e `destructive`;
- `EmptyState`;
- `Spinner`;
- `Sonner/Toaster`.

O `Alert` não aplica `role="alert"` automaticamente.

A semântica é contextual.

`role="alert"` é reservado para situações em que a mensagem realmente exige anúncio imediato, como erro bloqueante.

Alertas persistentes seguros foram migrados em fluxos de:

- Candidato;
- Admin;
- Avaliador.

Não foram criados `LoadingState` e `ErrorState` nomeados porque ainda não existe repetição real suficiente para justificar abstração estável.

---

## 11. Overlays

### Status

RESOLVIDO COM EXCEÇÕES CONSCIENTES

Primitives alinhados:

- `Dialog`;
- `AlertDialog`;
- `Sheet`;
- `Sonner/Toaster`.

Foram mantidos deliberadamente:

- modais locais de logout;
- `ConfirmModal`;
- tooltips artesanais de gráficos.

Motivo:

a migração poderia alterar:

- estrutura de DOM;
- foco;
- Escape;
- clique fora;
- comportamento de hover/touch;
- estado visual associado aos gráficos.

Esses casos são exceções conscientes e não representam bloqueadores do DS.

---

## 12. Navigation

### Status

PARCIAL / NÃO BLOQUEIA

A aplicação de Navigation foi limitada ao escopo compatível com a arquitetura atual.

Não foram tratados como parte deste fechamento:

- React Router;
- Breadcrumb estrutural;
- AppShell completo por perfil;
- arquitetura definitiva de layouts.

Esses itens dependem da evolução arquitetural do Front e não bloqueiam o Design System v1.

---

## 13. Patterns/Layout

### Status

APLICAÇÃO SEGURA / EVOLUÇÃO CONTÍNUA

Foram avaliados:

- PageHeader;
- SectionHeader;
- FormLayout;
- FieldGrid;
- FormActions;
- ListLayout;
- CardGrid;
- FilterPattern;
- TablePattern;
- Empty/Loading/Error patterns.

A decisão foi não criar abstrações apenas por oportunidade.

Patterns maiores só devem ser consolidados quando:

- houver repetição real;
- houver semântica estável;
- não houver risco de acoplamento prematuro ao protótipo atual.

Portanto, a ausência de abstração nominal para todos os patterns documentados não representa falha de aderência.

---

## 14. Product Components

### Status

FUTURO / NÃO BLOQUEIA

Os Product Components documentados continuam como referência oficial para evolução do produto.

Entre os candidatos estáveis estão:

- `JobContextSummary`;
- `InterviewSetupCard`;
- `QuestionCard`;
- `CandidateAnswerInput`;
- `CandidateAnswerViewer`;
- `EvaluationCriteriaPanel`;
- `ReportHeaderCard`;
- `CandidateSummary`;
- `InterviewStatusCard`;
- `EvaluatorQueueItem`;
- `EvaluationCard`;
- `EvaluationReviewSummary`;
- `FeedbackBlock`.

A extração ampla desses componentes foi adiada até que os fluxos reais estejam suficientemente estáveis.

Não se deve criar componente apenas porque uma estrutura visual parece reutilizável no protótipo.

---

## 15. Itens deliberadamente fora do fechamento

Os seguintes pontos não fazem parte dos bloqueadores do DS v1:

- Auth/token;
- regras de cadastro/login/ativação;
- Legal/LGPD;
- consentimentos sensíveis;
- React Router;
- AppShell/layout definitivo;
- API/Back/Prisma;
- scores/notas;
- desempenho;
- Nilo;
- Gamificação;
- Árvore de Talentos;
- regras de produto ainda instáveis;
- brand mark definitivo da sidebar recolhida.

Esses itens pertencem a outras frentes de produto, arquitetura, segurança ou evolução visual.

---

## 16. Exceções conscientes registradas

Permanecem como exceções conscientes:

- termos/política e consentimentos;
- confirmação sensível de envio de entrevista;
- Toggle local;
- Auth/Settings sem Tabs oficiais;
- dropdown de categoria em Materiais;
- seleção de vaga/atribuição sem `SelectableCard`;
- ausência de wrapper específico para toast;
- ausência de `LoadingState` e `ErrorState` nomeados;
- tooltips artesanais dos gráficos.

Nenhuma dessas exceções bloqueia o fechamento do DS v1.

---

## 17. Validação técnica

Na branch experimental foram executadas as validações:

- `git --no-pager diff --check`;
- `pnpm run build:web`.

Resultado final do build:

- 2260 módulos transformados;
- build concluído com sucesso;
- único aviso: chunk JavaScript acima de 500 kB.

O warning de chunk é uma pendência de otimização/performance e não uma falha do Design System.

Checkpoint final:

`17df8e8 feat: consolida aplicacao integral experimental do design system v1`

Working tree após o commit:

`nothing to commit, working tree clean`

---

## 18. Situação final

A aplicação experimental do Design System v1 pode ser considerada concluída dentro do escopo atual.

Resumo:

- primitives principais consolidados;
- compositions seguras aplicadas;
- feedback e selection estabilizados;
- exceções comportamentais documentadas;
- abstrações prematuras evitadas;
- itens de produto e arquitetura separados do fechamento do DS;
- bloqueadores reais restantes: `0`.

O DS v1 permanece evolutivo.

Novos componentes, patterns e Product Components devem ser adicionados conforme necessidades reais do produto, mantendo as foundations e contracts já estabelecidos.

---

## 19. Próxima etapa recomendada

Após este fechamento, a próxima etapa não é ampliar indiscriminadamente o Design System.

A evolução deve ocorrer junto aos fluxos reais do produto.

Prioridades futuras:

1. aplicar o DS nas novas telas e fluxos durante sua implementação;
2. consolidar Product Components quando houver repetição real;
3. evoluir Patterns/Layout junto à reorganização arquitetural do Front;
4. revisar aderência novamente após a integração dos fluxos reais;
5. tratar otimização de bundle separadamente da evolução do Design System.
