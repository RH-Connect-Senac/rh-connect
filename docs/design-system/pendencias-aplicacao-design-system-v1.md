# Pendências da Aplicação do Design System v1 — RH Connect

**Status:** inventário operacional  
**Data:** 10/09/2026
**Escopo:** pendências e adiamentos conscientes identificados durante a aplicação gradual do Design System v1 no Front-end atual.

Este documento registra itens que já foram encontrados durante auditorias ou aplicação do Design System e que foram conscientemente adiados, mantidos como legado controlado ou classificados como dependentes de Produto, Arquitetura, UX, Regra de Negócio, Legal/LGPD ou fase futura.

Não é uma lista de todos os componentes ainda não implementados. Um item só aparece aqui quando há evidência em documentação atual, código atual ou histórico da branch `work/design-system-aplicado`.

## Fontes consideradas

- `docs/design-system/design-system-foundations-v1.md`
- `docs/design-system/components-v1.md`
- `docs/design-system/patterns-layout-v1.md`
- `docs/design-system/product-components-v1.md`
- `docs/design-system/aderencia-front-design-system-v0.1.md`
- `docs/front-end/guia-implementacao-design-system-front-end.md`
- Código atual em `apps/web`
- Histórico da branch `work/design-system-aplicado`, especialmente commits de campos, badges/status, metadata, filtros/seleção e checkbox.

Documentos em `docs/design-system/archive` não foram usados como fonte atual de decisão.

## Resumo Executivo

| Item | Categoria | Status | Dependência | Próxima fase | Bloqueia fechamento do DS? |
|---|---|---|---|---|---|
| Checkbox "Lembrar acesso" | Selection Controls | RESOLVIDO | Nenhuma | Manter | NÃO |
| Checkbox de Termos/Política no cadastro | Selection Controls / Legal | EXCEÇÃO CONSCIENTE | Produto + Legal | Auth/Legal | NÃO |
| Checkbox de confirmação de envio | Selection Controls / Interview | EXCEÇÃO CONSCIENTE | Produto | Entrevista | NÃO |
| Consentimento obrigatório de gravação | Selection Controls / Legal | EXCEÇÃO CONSCIENTE | Produto + Legal | Consentimentos | NÃO |
| Consentimento opcional de IA | Selection Controls / Legal | EXCEÇÃO CONSCIENTE | Produto + Legal | Consentimentos/IA | NÃO |
| Checkbox oficial 20px | Selection Controls | RESOLVIDO | Nenhuma | Manter | NÃO |
| Toggle local x Switch oficial | Selection Controls | EXCEÇÃO CONSCIENTE | UX/Componentes | Switch/Settings | NÃO |
| AuthScreen: Entrar/Criar conta x Tabs | Navigation | EXCEÇÃO CONSCIENTE | UX/Auth | Auth estrutural | NÃO |
| SettingsScreen: navegação de seções x Tabs | Navigation | EXCEÇÃO CONSCIENTE | UX/Arquitetura | Settings/Layout | NÃO |
| Filtros de Histórico e Materiais | Filters & Selection | RESOLVIDO | Nenhuma | Manter até FilterPattern | NÃO |
| Card base impondo layout interno | Surfaces / Card | RESOLVIDO | Nenhuma | Manter contrato neutro | NÃO |
| Botões textuais de retorno com seta/ícone | Actions / Button | RESOLVIDO | Nenhuma | Manter padrão textual | NÃO |
| FilterChip oficial | Filters & Selection | RESOLVIDO | Nenhuma | Manter | NÃO |
| Dropdown de categoria em Materiais | Select/Dropdown | EXCEÇÃO CONSCIENTE | Dropdown/Select Pattern | Filters | NÃO |
| Seleção de vaga como card clicável | SelectableCard / Radio | EXCEÇÃO CONSCIENTE | Produto/UX | Entrevista | NÃO |
| RadioGroup em escolhas exclusivas futuras | Selection Controls | FUTURO / NÃO BLOQUEIA FECHAMENTO | UX/Form semantics | Forms/Entrevista | NÃO |
| SearchInput nomeado | Forms / Filters | RESOLVIDO | Nenhuma | Manter | NÃO |
| NativeSelect oficial | Forms / Select | RESOLVIDO | Nenhuma | Manter | NÃO |
| PasswordInput nomeado | Forms | RESOLVIDO | Nenhuma | Manter | NÃO |
| FormField amplo e mensagens de campo | Forms | FUTURO / NÃO BLOQUEIA FECHAMENTO | Forms/a11y + possível react-hook-form | Forms avançados | NÃO |
| Selects Radix sem necessidade atual de migração | Forms / Select | EXCEÇÃO CONSCIENTE | Validação por uso | Manter | NÃO |
| Scores, notas e desempenho | Status / Product Components | FUTURO / NÃO BLOQUEIA FECHAMENTO | Produto | Relatório/Avaliação | NÃO |
| ScoreSummaryCard e métricas de relatório | Product Components | FUTURO / NÃO BLOQUEIA FECHAMENTO | Produto | Relatório | NÃO |
| Toast wrapper | Feedback | EXCEÇÃO CONSCIENTE | Baixa repetição atual | Manter uso direto de Sonner | NÃO |
| Alerts e mensagens locais | Feedback | RESOLVIDO | Nenhuma | Manter Alert oficial | NÃO |
| EmptyState e Spinner oficiais | Feedback / Patterns | RESOLVIDO | Nenhuma | Manter | NÃO |
| LoadingState/ErrorState nomeados | Feedback / Patterns | EXCEÇÃO CONSCIENTE | Repetição insuficiente | Criar só quando houver padrão real | NÃO |
| AppShell e layouts por perfil | Patterns/Layout | FUTURO / NÃO BLOQUEIA FECHAMENTO | Extração gradual | Layouts por perfil | NÃO |
| Product Components estáveis candidatos ao ciclo atual | Product Components | FUTURO / NÃO BLOQUEIA FECHAMENTO | Auditoria por fluxo | Product Components DS | NÃO |
| Product Components dependentes de Produto | Product Components | FUTURO / NÃO BLOQUEIA FECHAMENTO | Produto | Produto por fluxo | NÃO |
| Gamificação, Nilo e Árvore de Talentos | Product Components | FUTURO / NÃO BLOQUEIA FECHAMENTO | Produto + UX | Evolução controlada | NÃO |
| Brand mark oficial da sidebar recolhida | Identity | FUTURO / NÃO BLOQUEIA FECHAMENTO | Asset oficial | Marca/Identity | NÃO |
| React Router, rotas reais e Breadcrumb | Navigation / Arquitetura | FUTURO / NÃO BLOQUEIA FECHAMENTO | Rotas reais | Arquitetura | NÃO |

Itens marcados como `NÃO` na coluna "Bloqueia fechamento do DS?" continuam registrados como pendências reais, mas não devem impedir o fechamento documental do Design System v1. Eles devem seguir para Produto, Arquitetura/Integração, Legal/LGPD ou fase futura conforme a dependência indicada.

## Registros Detalhados

### 1. Checkbox "Lembrar acesso"

- **Categoria do Design System:** Selection Controls / Checkbox.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `AuthScreen`.
- **Estado atual:** usa `Checkbox` oficial em `remember-access`.
- **O que foi decidido na época:** migrar apenas este checkbox por ser não controlado, simples e de baixo risco.
- **Por que não ficou pendente:** a migração foi concluída em PR pequeno.
- **Dependência:** nenhuma.
- **Próxima fase prevista:** manter como referência de migração conservadora.
- **Risco de resolver agora:** resolvido; risco é reabrir sem necessidade.
- **Documento/contrato relacionado:** `components-v1.md`, seção Checkbox.
- **Status:** RESOLVIDO.

### 2. Checkbox de Termos/Política no cadastro

- **Categoria do Design System:** Selection Controls / Legal.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `AuthScreen`, cadastro público.
- **Estado atual:** `<input type="checkbox">` inline dentro de `label`, com links/botões para Termos e Privacidade.
- **O que foi decidido na época:** não migrar junto com "Lembrar acesso".
- **Por que não foi implementado:** envolve aceite legal, links dentro do label, possível impacto em clique, submit e prova de consentimento.
- **Dependência:** Produto + Legal/LGPD.
- **Próxima fase prevista:** revisão de Auth/Legal antes de migrar para Checkbox oficial ou Pattern de aceite.
- **Risco de resolver agora:** alterar comportamento de aceite obrigatório, acessibilidade ou navegação para Termos/Privacidade.
- **Documento/contrato relacionado:** `components-v1.md` Checkbox; `guia-implementacao-design-system-front-end.md` sobre não misturar regra legal com migração visual.
- **Status:** EXCEÇÃO CONSCIENTE.

### 3. Checkbox de confirmação de envio

- **Categoria do Design System:** Selection Controls / Interview.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `InterviewConfirmScreen`.
- **Estado atual:** `<input type="checkbox">` inline controlado por `confirm`.
- **O que foi decidido na época:** não migrar no primeiro PR estrutural de Checkbox.
- **Por que não foi implementado:** faz parte de ação sensível de envio de entrevista e confirmação difícil de reverter.
- **Dependência:** Produto / Regra de Negócio da entrevista.
- **Próxima fase prevista:** fluxo de entrevista, quando a confirmação de envio for revisada.
- **Risco de resolver agora:** alterar a experiência de confirmação antes de estabilizar envio real, mídia e autorização.
- **Documento/contrato relacionado:** `product-components-v1.md`, InterviewSubmitStatus; `patterns-layout-v1.md`, InterviewFlowPattern.
- **Status:** EXCEÇÃO CONSCIENTE.

### 4. Consentimento obrigatório de gravação

- **Categoria do Design System:** Selection Controls / Legal.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `ConsentScreen`.
- **Estado atual:** pseudo-checkbox visual com `div`, `Check` e `onClick`.
- **O que foi decidido na época:** não migrar para Checkbox oficial durante Bloco 1.2.
- **Por que não foi implementado:** é consentimento obrigatório para imagem/voz, com implicação legal e de autorização.
- **Dependência:** Produto + Legal/LGPD.
- **Próxima fase prevista:** revisão de Consentimentos, com semântica, registro e acessibilidade adequados.
- **Risco de resolver agora:** mudar a semântica de aceite, foco por teclado ou rastreabilidade de consentimento.
- **Documento/contrato relacionado:** `patterns-layout-v1.md` estados de permissão/acesso; `product-components-v1.md` entrevista e mídia.
- **Status:** EXCEÇÃO CONSCIENTE.

### 5. Consentimento opcional de IA

- **Categoria do Design System:** Selection Controls / Legal.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `ConsentScreen` e `SettingsScreen`.
- **Estado atual:** pseudo-checkbox visual na tela de consentimento e controles próprios em configurações.
- **O que foi decidido na época:** manter fora da migração de Checkbox.
- **Por que não foi implementado:** consentimento de IA é separado, opcional, revogável e depende de decisão legal/produto.
- **Dependência:** Legal/LGPD + Produto/IA.
- **Próxima fase prevista:** frente de consentimentos e privacidade.
- **Risco de resolver agora:** sugerir autorização de IA sem contrato legal final ou sem persistência real.
- **Documento/contrato relacionado:** `guia-implementacao-design-system-front-end.md`, regras de entrevista multimodal e privacidade.
- **Status:** EXCEÇÃO CONSCIENTE.

### 6. Checkbox oficial 20px

- **Categoria do Design System:** Selection Controls / Checkbox.
- **Arquivo/tela:** `apps/web/src/app/components/ui/checkbox.tsx`.
- **Estado atual:** primitive usa `size-5`, alinhada ao contrato visual aproximado de 20px.
- **O que foi decidido na época:** validar a diferença 16px x 20px antes de tocar globalmente na primitive.
- **Por que não ficou pendente:** na aplicação experimental integral, o ajuste foi feito no primitive oficial para alinhar o contrato do DS.
- **Dependência:** nenhuma no estado atual.
- **Próxima fase prevista:** manter e validar visualmente nos checkboxes que ainda são exceção por Legal/Produto.
- **Risco de resolver agora:** resolvido; risco é reintroduzir tamanhos locais divergentes.
- **Documento/contrato relacionado:** `components-v1.md`, Checkbox com tamanho visual 20px.
- **Status:** RESOLVIDO.

### 7. Toggle local x Switch oficial

- **Categoria do Design System:** Selection Controls / Switch.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, helper local `Toggle` em `SettingsScreen`.
- **Estado atual:** button local com `role="switch"` e `aria-checked={on}`.
- **O que foi decidido na época:** melhorar semântica mínima, sem substituir pelo Switch oficial.
- **Por que não foi implementado:** Switch oficial tem tamanho/API/DOM diferentes e poderia gerar regressão visual em Settings. A semântica atual já está correta para a fase experimental.
- **Dependência:** UX/Componentes.
- **Próxima fase prevista:** revisão visual de Switch e Settings, sem bloquear o fechamento do DS.
- **Risco de resolver agora:** alteração visual e de interação em controles de configuração sem validação específica.
- **Documento/contrato relacionado:** `components-v1.md`, Switch e Toggle separados.
- **Status:** EXCEÇÃO CONSCIENTE.

### 8. AuthScreen: Entrar/Criar conta x Tabs

- **Categoria do Design System:** Navigation / Tabs.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `AuthScreen`.
- **Estado atual:** botões com estado `tab` e `aria-pressed`.
- **O que foi decidido na época:** adicionar semântica mínima, sem migrar para Tabs oficial.
- **Por que não foi implementado:** troca para `Tabs/TabsList/TabsTrigger/TabsContent` mudaria DOM e poderia afetar o fluxo de Auth.
- **Dependência:** UX/Auth.
- **Próxima fase prevista:** extração estrutural de Auth.
- **Risco de resolver agora:** alterar foco, teclado, estrutura de conteúdo condicional e fluxo de login/cadastro.
- **Documento/contrato relacionado:** `components-v1.md`, Tabs; `guia-implementacao-design-system-front-end.md`, Auth por etapa própria.
- **Status:** EXCEÇÃO CONSCIENTE.

### 9. SettingsScreen: navegação de seções x Tabs

- **Categoria do Design System:** Navigation / Section Navigation.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `SettingsScreen`.
- **Estado atual:** botões de navegação local com `aria-pressed`, controlados por `tab`.
- **O que foi decidido na época:** não transformar em Tabs oficial.
- **Por que não foi implementado:** funciona mais como navegação lateral de seções do que tabs horizontais simples.
- **Dependência:** UX/Arquitetura de Settings.
- **Próxima fase prevista:** revisão de Settings/Layout.
- **Risco de resolver agora:** aplicar Tabs onde a semântica real é navegação de seção e não um tablist simples.
- **Documento/contrato relacionado:** `components-v1.md`, Tabs estado depende do contexto; `patterns-layout-v1.md`, layouts estruturais.
- **Status:** EXCEÇÃO CONSCIENTE.

### 10. Filtros de Histórico e Materiais

- **Categoria do Design System:** Filters & Selection.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `InterviewHistoryScreen` e `MaterialsScreen`.
- **Estado atual:** botões pill com `aria-pressed`.
- **O que foi decidido na época:** preservar como button e adicionar semântica mínima.
- **Por que não ficou pendente:** acessibilidade mínima do padrão atual foi concluída.
- **Dependência:** nenhuma no estado atual.
- **Próxima fase prevista:** manter até existir FilterPattern/FilterChip oficial.
- **Risco de resolver agora:** criar componente prematuro para dois casos ainda ligados ao App.tsx.
- **Documento/contrato relacionado:** `components-v1.md`, FilterChip como Pattern de filtros.
- **Status:** RESOLVIDO.

### 10.1. Card base impondo layout interno

- **Categoria do Design System:** Surfaces / Card.
- **Arquivo/tela:** `apps/web/src/app/components/ui/card.tsx`; impacto observado em `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `landing-screen.tsx` e `development-screen.tsx`.
- **Estado atual:** o `Card` oficial é estruturalmente neutro: aplica surface, texto, borda, sombra, radius e padding conforme a API existente, sem impor `flex`, `flex-col` ou `gap` ao conteúdo.
- **O que foi decidido na época:** no fechamento do BLOCO 1 — Actions + Surfaces, o `Card` base não deve impor direção de layout interna aos consumidores.
- **Por que não ficou pendente:** a regressão visual causada por `flex flex-col gap-5` no root foi corrigida no primitive oficial.
- **Dependência:** nenhuma.
- **Próxima fase prevista:** manter contrato neutro; composições como Metric/Stat card devem ser avaliadas apenas em etapa própria.
- **Risco de resolver agora:** resolvido; risco é reintroduzir layout interno no `Card` base e voltar a empilhar cards horizontais.
- **Documento/contrato relacionado:** `components-v1.md`, Card; `design-system-foundations-v1.md`, surfaces, radius e shadow.
- **Status:** RESOLVIDO.

### 10.2. Botões textuais de retorno com seta/ícone

- **Categoria do Design System:** Actions / Button.
- **Arquivo/tela:** `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`, `onboarding-screens.tsx`.
- **Estado atual:** ações textuais simples de retorno usam texto sem seta/ícone, preservando labels específicos como "Voltar", "Voltar à Lista", "Voltar à página inicial" e "Voltar ao login".
- **O que foi decidido na época:** retorno textual simples deve ser apenas texto; setas ficam reservadas para icon-only, navegação estrutural, scroll, sidebar, "Anterior" ou ações em que o ícone tenha função própria.
- **Por que não ficou pendente:** os call sites auditados em `apps/web/src` foram padronizados sem alterar fluxo, handler, variante, tamanho ou regra.
- **Dependência:** nenhuma.
- **Próxima fase prevista:** manter padrão em novas telas e revisar apenas se houver componente/pattern específico de navegação no futuro.
- **Risco de resolver agora:** resolvido; risco é voltar a misturar ação textual simples de retorno com ícone decorativo.
- **Documento/contrato relacionado:** `components-v1.md`, Button/IconButton/TextLink; `guia-implementacao-design-system-front-end.md`, aplicação gradual sem alterar navegação.
- **Status:** RESOLVIDO.

### 11. FilterChip oficial

- **Categoria do Design System:** Filters & Selection.
- **Arquivo/tela:** `apps/web/src/app/components/ui/filter-chip.tsx`; usos em `InterviewHistoryScreen`, `MaterialsScreen`, `AdminCandidatesScreen` e `EvalQueueScreen`.
- **Estado atual:** `FilterChip` oficial existe e compõe `Button`, preservando semântica de `button`, `aria-pressed` e aparência pill.
- **O que foi decidido na época:** criar apenas o padrão selectable seguro, sem transformar Badge/StatusBadge em controle interativo.
- **Por que não ficou pendente:** a aplicação experimental consolidou os grupos equivalentes sem alterar filtros, handlers ou regras.
- **Dependência:** nenhuma no padrão selectable atual.
- **Próxima fase prevista:** criar variante applied/removable apenas quando houver caso real.
- **Risco de resolver agora:** resolvido; risco é usar FilterChip para status, metadata ou botão comum.
- **Documento/contrato relacionado:** `components-v1.md`, seção FilterChip.
- **Status:** RESOLVIDO.

### 12. Dropdown de categoria em Materiais

- **Categoria do Design System:** Select/Dropdown.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `MaterialsScreen`.
- **Estado atual:** button custom que abre menu absoluto com buttons de categoria.
- **O que foi decidido na época:** não alterar no PR de acessibilidade mínima dos filtros nem no BLOCO 2 — Advanced Forms.
- **Por que não foi implementado:** poderia exigir `Select`, `DropdownMenu`, `aria-expanded`, navegação por teclado e ajustes mobile. No Bloco 2, foi mantido como dropdown custom porque não é um select nativo simples e pertence melhor a Filters/Selection.
- **Dependência:** UX/Pattern de filtros.
- **Próxima fase prevista:** bloco de Dropdown/Select de filtros, se a equipe decidir padronizar o pattern.
- **Risco de resolver agora:** mudar comportamento do filtro de materiais ou acessibilidade de menu sem escopo próprio.
- **Documento/contrato relacionado:** `components-v1.md`, Select/NativeSelect e DropdownMenu; `patterns-layout-v1.md`, FilterPattern.
- **Status:** EXCEÇÃO CONSCIENTE.

### 13. Seleção de vaga como card clicável

- **Categoria do Design System:** SelectableCard / RadioGroup.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `InterviewSetupScreen`.
- **Estado atual:** botões card-like com estado `selected`, `type="button"` e `aria-pressed`.
- **O que foi decidido na época:** não implementar SelectableCard nem RadioGroup estrutural; aplicar apenas semântica mínima segura.
- **Por que não foi implementado:** escolha de vaga é seleção exclusiva com regra de produto e impacto no fluxo de entrevista.
- **Dependência:** UX + Produto da entrevista.
- **Próxima fase prevista:** entrevista / escolha de contexto, sem bloquear o fechamento do DS.
- **Risco de resolver agora:** alterar semântica, teclado, foco e estado selecionado em etapa crítica do fluxo.
- **Documento/contrato relacionado:** `components-v1.md`, SelectableCard e RadioGroup; `product-components-v1.md`, InterviewSetupCard.
- **Status:** EXCEÇÃO CONSCIENTE.

### 14. RadioGroup em escolhas exclusivas futuras

- **Categoria do Design System:** Selection Controls / RadioGroup.
- **Arquivo/tela:** escolhas exclusivas atuais e futuras no `App.tsx`.
- **Estado atual:** não há uso real consolidado de RadioGroup nas telas principais auditadas.
- **O que foi decidido na época:** não forçar escolhas visuais existentes a virar RadioGroup sem validação.
- **Por que não foi implementado:** nem toda seleção exclusiva do protótipo é formulário; algumas são card selection ou fluxo de produto.
- **Dependência:** UX/Form semantics.
- **Próxima fase prevista:** Forms/Entrevista.
- **Risco de resolver agora:** trocar cards ou botões de fluxo por radio sem equivalência visual ou funcional.
- **Documento/contrato relacionado:** `components-v1.md`, RadioGroup com Radix + fieldset/legend.
- **Status:** FUTURO / NÃO BLOQUEIA FECHAMENTO.

### 15. SearchInput nomeado

- **Categoria do Design System:** Forms / Filters.
- **Arquivo/tela:** buscas em `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`.
- **Estado atual:** `SearchInput` oficial existe em `apps/web/src/app/components/ui/search-input.tsx` e foi aplicado aos call sites seguros: `MaterialsScreen`, `AdminCandidatesScreen`, `AdminInterviewsScreen`, `AdminQuestionsScreen`, `AdminAuditScreen`, `EvalQueueScreen` e `EvalHistoryScreen`.
- **O que foi decidido na época:** criar composição nomeada baseada no `Input` oficial, adicionando apenas ícone de busca, padding de composição, clear action opcional e semântica `searchbox`.
- **Por que não ficou pendente:** o Bloco 2 criou o componente e migrou os usos seguros, preservando comportamento, filtros e layout.
- **Dependência:** nenhuma no estado atual.
- **Próxima fase prevista:** manter como composição oficial e validar novos usos caso a caso.
- **Risco de resolver agora:** resolvido; risco é recriar foco, altura, borda ou aparência paralela em novas buscas.
- **Documento/contrato relacionado:** `components-v1.md`, SearchInput como composição nomeada.
- **Status:** RESOLVIDO.

### 16. NativeSelect oficial

- **Categoria do Design System:** Forms / Select.
- **Arquivo/tela:** `apps/web/src/app/components/ui/native-select.tsx`; `App.tsx` helper `FieldSelect`; `admin-screens.tsx`, `AdminQuestionFormScreen` e `AdminEvaluatorFormScreen`.
- **Estado atual:** `NativeSelect` oficial existe como wrapper de `<select>` nativo, usando a linguagem visual validada de `Input`/`SelectTrigger`.
- **O que foi decidido na época:** criar componente oficial apenas para casos em que o comportamento nativo deve ser preservado, sem reproduzir Radix Select.
- **Por que não ficou pendente:** o Bloco 2 criou o componente e migrou os selects nativos seguros identificados.
- **Dependência:** nenhuma no estado atual.
- **Próxima fase prevista:** manter para selects nativos simples; avaliar novos selects por risco de comportamento.
- **Risco de resolver agora:** resolvido; risco é trocar selects nativos por Radix sem necessidade ou criar classes locais paralelas.
- **Documento/contrato relacionado:** `components-v1.md`, Select + NativeSelect; `design-system-foundations-v1.md`, foco discreto de Forms.
- **Status:** RESOLVIDO.

### 17. PasswordInput nomeado

- **Categoria do Design System:** Forms.
- **Arquivo/tela:** `App.tsx` Field com `type="password"`; `eval-screens.tsx` ativação do avaliador.
- **Estado atual:** `PasswordInput` oficial existe em `apps/web/src/app/components/ui/password-input.tsx`; `Field` em `App.tsx` usa `PasswordInput` quando `type="password"` e `EvalActivateScreen` usa `PasswordInput` preservando estados independentes.
- **O que foi decidido na época:** centralizar apenas o trailing action Eye/EyeOff, `type="button"`, `aria-label` dinâmico e padding direito, mantendo `Input` oficial como única fonte visual.
- **Por que não ficou pendente:** o Bloco 2 criou o componente e migrou os usos seguros sem alterar Auth/token, validação de senha ou regra de negócio.
- **Dependência:** nenhuma no estado atual.
- **Próxima fase prevista:** manter como composição oficial.
- **Risco de resolver agora:** resolvido; risco é voltar a implementar toggles locais divergentes.
- **Documento/contrato relacionado:** `components-v1.md`, PasswordInput.
- **Status:** RESOLVIDO.

### 18. FormField amplo e mensagens de campo

- **Categoria do Design System:** Forms.
- **Arquivo/tela:** formulários em `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx` e futuros fluxos com validação.
- **Estado atual:** labels, hints, mensagens de erro e `aria-describedby` ainda aparecem por composição local ou caso a caso.
- **O que foi decidido na época:** não criar `FormField` amplo no BLOCO 2.
- **Por que não foi implementado:** um `FormField` amplo pode acoplar estrutura visual, mensagens, acessibilidade e futura integração com `react-hook-form`; isso exige contrato próprio para não alterar validações, DOM ou fluxo.
- **Dependência:** Forms/a11y e possível estratégia futura com `react-hook-form`.
- **Próxima fase prevista:** Forms avançados/acessibilidade de formulários, se necessário.
- **Risco de resolver agora:** alterar relação label/campo/mensagem, ids, `aria-describedby`, validações e comportamento de formulário antes de contrato específico.
- **Documento/contrato relacionado:** `components-v1.md`, FormField; `guia-implementacao-design-system-front-end.md`, aplicação incremental sem alterar validações.
- **Status:** FUTURO / NÃO BLOQUEIA FECHAMENTO.

### 19. Selects Radix sem necessidade atual de migração

- **Categoria do Design System:** Forms / Select.
- **Arquivo/tela:** componentes existentes baseados em `Select`/`SelectTrigger` e usos futuros que exigem comportamento custom.
- **Estado atual:** `SelectTrigger` oficial já possui foco discreto e contrato visual validado; usos que não exigiam alteração permaneceram intocados.
- **O que foi decidido na época:** não mexer em Select Radix quando não houver necessidade visual ou funcional.
- **Por que não foi implementado:** a etapa `NativeSelect` tratou apenas selects nativos seguros; migrar ou reestruturar Select Radix sem necessidade poderia alterar DOM, teclado, portal, menu e comportamento mobile.
- **Dependência:** validação por uso.
- **Próxima fase prevista:** manter; revisar apenas quando um fluxo exigir Select custom.
- **Risco de resolver agora:** trocar comportamento nativo/custom indevidamente ou gerar regressão de acessibilidade.
- **Documento/contrato relacionado:** `components-v1.md`, Select + NativeSelect.
- **Status:** EXCEÇÃO CONSCIENTE.

### 20. Scores, notas e desempenho

- **Categoria do Design System:** Status / Product Components.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `ReportScreen`, `InterviewHistoryScreen`, dashboards.
- **Estado atual:** notas como `{nota}/10`, textos como "Bom desempenho" e cores por regra numérica permanecem fora de Badge/StatusBadge.
- **O que foi decidido na época:** não migrar automaticamente score/métrica para Badge ou StatusBadge.
- **Por que não foi implementado:** score não é metadata simples nem status operacional; depende de regra de produto.
- **Dependência:** Regra de Negócio da avaliação/relatório.
- **Próxima fase prevista:** Relatório/Avaliação.
- **Risco de resolver agora:** oficializar semântica visual de nota antes da regra final de cálculo/liberação.
- **Documento/contrato relacionado:** `product-components-v1.md`, ScoreSummaryCard e CriteriaScoreList.
- **Status:** FUTURO / NÃO BLOQUEIA FECHAMENTO.

### 21. ScoreSummaryCard e métricas de relatório

- **Categoria do Design System:** Product Components.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, `ReportScreen`.
- **Estado atual:** relatório ainda é composição de tela, com cards, radar e dados mockados.
- **O que foi decidido na época:** não extrair Product Component durante a aplicação de Components básicos.
- **Por que não foi implementado:** componentes de relatório dependem de avaliação humana, critérios e regra de liberação.
- **Dependência:** Produto/Avaliação.
- **Próxima fase prevista:** branch de Relatório/Avaliação.
- **Risco de resolver agora:** encapsular cálculo, classificação ou narrativa antes do contrato de produto.
- **Documento/contrato relacionado:** `product-components-v1.md`, ReportHeaderCard, ScoreSummaryCard, CriteriaScoreList e FeedbackBlock.
- **Status:** FUTURO / NÃO BLOQUEIA FECHAMENTO.

### 22. Toast wrapper

- **Categoria do Design System:** Feedback.
- **Arquivo/tela:** `apps/web/src/app/App.tsx`, uso direto de `sonner`.
- **Estado atual:** `Toaster` oficial é usado via `components/ui/sonner`; restam poucas chamadas diretas de `toast` em interações pontuais do protótipo.
- **O que foi decidido na época:** não criar wrapper de Toast quando a repetição atual não justifica uma nova camada.
- **Por que não foi implementado:** consolidar wrapper agora não reduziria duplicação relevante e poderia alterar timing, posição, wording ou comportamento de feedback transitório.
- **Dependência:** baixa repetição atual.
- **Próxima fase prevista:** manter uso direto de Sonner; criar wrapper apenas se novas telas repetirem padrões de toast.
- **Risco de resolver agora:** adicionar abstração sem ganho real e criar divergência de comportamento.
- **Documento/contrato relacionado:** `components-v1.md`, Toast; `aderencia-front-design-system-v0.1.md`, wrapper DS recomendado.
- **Status:** EXCEÇÃO CONSCIENTE.

### 23. Alerts e mensagens locais

- **Categoria do Design System:** Feedback.
- **Arquivo/tela:** `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`.
- **Estado atual:** `Alert` oficial possui variantes `info`, `success`, `warning` e `destructive`; alertas persistentes seguros foram migrados em `App.tsx`, `admin-screens.tsx` e `eval-screens.tsx`.
- **O que foi decidido na época:** migrar apenas feedback persistente inequívoco e manter `role="alert"` contextual.
- **Por que não ficou pendente:** a rodada experimental de Feedback consolidou os casos seguros sem alterar textos, fluxo ou comportamento.
- **Dependência:** nenhuma no escopo atual.
- **Próxima fase prevista:** manter `Alert` oficial; novos casos devem escolher role somente quando houver erro/bloqueio semântico.
- **Risco de resolver agora:** resolvido; risco é usar `role="alert"` indiscriminadamente.
- **Documento/contrato relacionado:** `components-v1.md`, Alert visual x ARIA contextual.
- **Status:** RESOLVIDO.

### 24.1. EmptyState e Spinner oficiais

- **Categoria do Design System:** Feedback / Patterns.
- **Arquivo/tela:** `apps/web/src/app/components/ui/empty-state.tsx`, `apps/web/src/app/components/ui/spinner.tsx`; usos seguros em listas, histórico, materiais, notificações, avaliações em andamento e botões de envio.
- **Estado atual:** `EmptyState` e `Spinner` oficiais existem e são usados nos call sites equivalentes seguros.
- **O que foi decidido na época:** consolidar apenas estados vazios e loading inline com repetição real e sem regra de produto específica.
- **Por que não ficou pendente:** a aplicação experimental criou os componentes e migrou os usos seguros.
- **Dependência:** nenhuma no escopo atual.
- **Próxima fase prevista:** manter; novos usos devem compor `Card`/`Button` oficiais e preservar semântica.
- **Risco de resolver agora:** resolvido; risco é recriar spinners/empty states locais sem necessidade.
- **Documento/contrato relacionado:** `patterns-layout-v1.md`; `components-v1.md`, itens fora de Components v1 básico.
- **Status:** RESOLVIDO.

### 24.2. LoadingState/ErrorState nomeados

- **Categoria do Design System:** Feedback / Patterns.
- **Arquivo/tela:** fluxos simulados de envio, mídia, entrevista e futuras integrações.
- **Estado atual:** não há repetição estável suficiente para justificar `LoadingState` ou `ErrorState` nomeados além de `Spinner`, `Alert` e composições locais específicas.
- **O que foi decidido na época:** não criar componentes genéricos para estados que ainda dependem de contexto de produto, mídia ou integração.
- **Por que não foi implementado:** criar `LoadingState`/`ErrorState` agora poderia esconder regras específicas de fluxo e gerar abstração prematura.
- **Dependência:** repetição real em fluxos futuros.
- **Próxima fase prevista:** criar quando houver padrões recorrentes após integração ou fluxos reais.
- **Risco de resolver agora:** criar API genérica demais e enfraquecer feedback contextual.
- **Documento/contrato relacionado:** `patterns-layout-v1.md`, System States.
- **Status:** EXCEÇÃO CONSCIENTE.

### 25. AppShell e layouts por perfil

- **Categoria do Design System:** Patterns/Layout.
- **Arquivo/tela:** `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`.
- **Estado atual:** App Shell, CandidateLayout, AdminLayout e EvaluatorLayout existem informalmente/parcialmente.
- **O que foi decidido na época:** não extrair layouts por perfil em massa.
- **Por que não foi implementado:** layout ainda está acoplado a `screenMap`, navegação local e protótipo.
- **Dependência:** Arquitetura Front-end.
- **Próxima fase prevista:** layouts por perfil após extrações seguras.
- **Risco de resolver agora:** big bang refactor, regressão visual e quebra de navegação local.
- **Documento/contrato relacionado:** `patterns-layout-v1.md`, App Shell; `guia-implementacao-design-system-front-end.md`, layouts maiores depois.
- **Status:** FUTURO / NÃO BLOQUEIA FECHAMENTO.

### 26. Product Components estáveis candidatos ao ciclo atual

- **Categoria do Design System:** Product Components.
- **Arquivo/tela:** `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`.
- **Estado atual:** candidatos documentais foram auditados contra o código atual, mas não houve repetição segura suficiente para extração sem tocar em Produto, fluxo ou estrutura de telas.
- **O que foi decidido na época:** não extrair Product Components por oportunidade; consolidar somente quando houver correspondência real, repetição e regra estável.
- **Por que não foi implementado:** nesta branch experimental, os candidatos aparecem acoplados a telas específicas, dados mockados ou regras ainda sensíveis de entrevista/avaliação/relatório.
- **Dependência:** evolução por fluxo e validação de produto.
- **Próxima fase prevista:** Produto por fluxo ou refino de Product Components quando houver contrato estável.
- **Risco de resolver agora:** transformar regra de tela em componente reutilizável prematuro.
- **Documento/contrato relacionado:** `product-components-v1.md`, regra de implementação segura.
- **Status:** FUTURO / NÃO BLOQUEIA FECHAMENTO.

### 27. Product Components dependentes de Produto

- **Categoria do Design System:** Product Components.
- **Arquivo/tela:** `development-screen.tsx`, `App.tsx` e futuras telas de produto.
- **Estado atual:** itens como `NiloGuideCard`, `GamificationOverviewCard`, `CurrentMissionCard`, `TalentTreePreview` e outros blocos dependentes de regra de negócio ainda não possuem comportamento final estável.
- **O que foi decidido na época:** não tratar automaticamente todos os Product Components como parte do fechamento imediato do Design System.
- **Por que não foi implementado:** dependem de decisões de Produto sobre progressão, missões, Nilo, Árvore, exposição de desempenho, escopo por fluxo e regras de negócio.
- **Dependência:** Produto + UX.
- **Próxima fase prevista:** branch de Produto ou fluxo específico aprovado.
- **Risco de resolver agora:** cristalizar regras de produto ainda instáveis como se fossem contrato de Design System.
- **Documento/contrato relacionado:** `product-components-v1.md`; `guia-implementacao-design-system-front-end.md`.
- **Status:** FUTURO / NÃO BLOQUEIA FECHAMENTO.

### 28. Gamificação, Nilo e Árvore de Talentos

- **Categoria do Design System:** Product Components / DevelopmentPattern.
- **Arquivo/tela:** `apps/web/src/app/components/development-screen.tsx` e `App.tsx` como navegação para desenvolvimento.
- **Estado atual:** área visual/controlada, sem lógica final.
- **O que foi decidido na época:** não mexer dentro da migração estrutural do Design System sem tarefa específica.
- **Por que não foi implementado:** regras finais de XP, missões, conquistas, gatilhos da Árvore e evolução do Nilo seguem fora da migração de Components básicos.
- **Dependência:** Produto + UX.
- **Próxima fase prevista:** evolução controlada de gamificação.
- **Risco de resolver agora:** criar competição, ranking, promessa de contratação ou impacto indevido na avaliação.
- **Documento/contrato relacionado:** `product-components-v1.md`, Parte VII; `guia-implementacao-design-system-front-end.md`, regras específicas para gamificação, Nilo e Árvore.
- **Status:** FUTURO / NÃO BLOQUEIA FECHAMENTO.

### 29. Brand mark oficial da sidebar recolhida

- **Categoria do Design System:** Identity.
- **Arquivo/tela:** sidebars em `App.tsx`, `admin-screens.tsx`, `eval-screens.tsx`; `rh-connect-logo.tsx`; `apps/web/src/assets/brand`.
- **Estado atual:** logo completa oficial usa `RHConnectLogo`; sidebar recolhida ainda usa símbolo RH inline para evitar logo completa minúscula.
- **O que foi decidido na época:** não usar logo completa na sidebar recolhida e não recortar a marca por CSS.
- **Por que não foi implementado:** não existe asset oficial separado de brand mark no app.
- **Dependência:** asset oficial de marca.
- **Próxima fase prevista:** Identity/Brand assets.
- **Risco de resolver agora:** reconstruir ou recortar a marca de forma não oficial.
- **Documento/contrato relacionado:** `components-v1.md`, Identity; `design-system-foundations-v1.md`, uso de asset oficial da logo.
- **Status:** FUTURO / NÃO BLOQUEIA FECHAMENTO.

### 30. React Router, rotas reais e Breadcrumb

- **Categoria do Design System:** Navigation / Arquitetura.
- **Arquivo/tela:** `App.tsx`, `screenMap`, navegação local e `components/ui/breadcrumb.tsx`.
- **Estado atual:** navegação ainda usa `screenMap`/`onNavigate`; Breadcrumb fica sem aplicação real.
- **O que foi decidido na época:** não introduzir React Router nem Breadcrumb enquanto layouts e rotas não estiverem estabilizados.
- **Por que não foi implementado:** depende de hierarquia real de páginas, rotas, permissões e arquitetura.
- **Dependência:** Arquitetura Front-end.
- **Próxima fase prevista:** rotas reais após layouts por perfil.
- **Risco de resolver agora:** misturar Design System com reestruturação de navegação e quebrar o protótipo.
- **Documento/contrato relacionado:** `components-v1.md`, Breadcrumb adiado; `patterns-layout-v1.md`, App Shell e navegação por perfil.
- **Status:** FUTURO / NÃO BLOQUEIA FECHAMENTO.

## Bloqueia Fechamento do DS

Não há bloqueadores reais restantes identificados dentro do escopo da aplicação experimental atual do Design System v1.

Os itens que não foram implementados agora foram classificados como exceção consciente ou futuro/não bloqueante porque dependem de Produto, Arquitetura, Legal/LGPD, repetição real ainda inexistente ou validação por fluxo.

## Resolvido no Ciclo Experimental Atual

- Checkbox "Lembrar acesso" com Checkbox oficial.
- Checkbox oficial alinhado ao tamanho visual de 20px.
- Filtros de Histórico, Materiais, Admin e Avaliador com `FilterChip` oficial quando eram filtros selecionáveis seguros.
- Card base estruturalmente neutro.
- Botões textuais simples de retorno sem seta/ícone.
- SearchInput, NativeSelect e PasswordInput oficiais.
- Alert oficial com variantes `info`, `success`, `warning` e `destructive`.
- EmptyState e Spinner oficiais nos call sites seguros.
- Status reais inequívocos com StatusBadge.
- Metadata/tag/categoria segura com Badge oficial.

## Não bloqueia DS — levar para Produto

- Checkbox de confirmação de envio.
- Scores, notas e desempenho.
- ScoreSummaryCard e métricas de relatório.
- Product Components dependentes de decisões de Produto:
  - `NiloGuideCard`
  - `GamificationOverviewCard`
  - `CurrentMissionCard`
  - `TalentTreePreview`
  - outros cuja regra de negócio ainda não esteja estável.
- Gamificação, Nilo e Árvore de Talentos.
- Product Components estáveis quando forem tratados por fluxo real:
  - `JobContextSummary`
  - `InterviewSetupCard`
  - `QuestionCard`
  - `CandidateAnswerInput`
  - `CandidateAnswerViewer`
  - `EvaluationCriteriaPanel`
  - `ReportHeaderCard`
  - `CandidateSummary`
  - `InterviewStatusCard`
  - `EvaluatorQueueItem`
  - `EvaluationCard`
  - `EvaluationReviewSummary`
  - `FeedbackBlock`

## Não bloqueia DS — levar para Arquitetura/Integração

- AuthScreen: Entrar/Criar conta x Tabs, se virar Tabs real no futuro.
- SettingsScreen: navegação de seções x Tabs, se a equipe decidir transformar em componente/pattern próprio.
- AppShell e layouts por perfil.
- React Router, rotas reais e Breadcrumb.
- Separação estrutural de `App.tsx` em páginas/features.
- Integração com API apenas quando houver contrato real com Back-end.
- Brand mark oficial da sidebar recolhida, quando houver asset oficial de marca.
- Dropdown de categoria em Materiais, enquanto não houver decisão de Pattern/Dropdown específica.
- FormField amplo/acoplado a `react-hook-form` e padronização completa de helper/hint/error/`aria-describedby`.
- Selects Radix que não precisam de migração agora.
- Toggle local x Switch oficial, pois o Toggle já tem semântica mínima correta e trocar agora poderia causar regressão visual.
- AuthScreen e SettingsScreen como navegação local, sem migração forçada para Tabs.
- LoadingState/ErrorState nomeados, até existir repetição real que justifique componente/pattern.
- Toast wrapper, enquanto houver poucas chamadas diretas de Sonner e sem repetição suficiente.
- Tooltips artesanais dos gráficos, porque controlam hover/touch e seleção visual das barras.

## Não bloqueia DS — Legal/LGPD

- Checkbox de Termos/Política no cadastro.
- Consentimento obrigatório de gravação.
- Consentimento opcional de IA.
- Revogação, persistência e versionamento de consentimentos.

## Itens Resolvidos Que Não Devem Ser Reabertos Sem Evidência Nova

- Checkbox "Lembrar acesso" já usa Checkbox oficial.
- Filtros de Histórico e Materiais já possuem `aria-pressed` e permanecem como `button`.
- Metadata/tag/categoria segura já foi centralizada em Badge oficial quando aplicável.
- Status reais inequívocos já foram migrados para StatusBadge em Admin, Avaliador e App.tsx.
- Inputs/Textarea/SelectTrigger oficiais já usam foco discreto documentado.
- Card base oficial é estruturalmente neutro e não impõe `flex`, `flex-col` ou `gap` ao conteúdo.
- Botões textuais simples de retorno foram padronizados sem seta/ícone.
- SearchInput oficial foi criado e aplicado aos call sites seguros do Bloco 2.
- NativeSelect oficial foi criado e aplicado aos selects nativos seguros do Bloco 2.
- PasswordInput oficial foi criado e aplicado aos usos seguros do Bloco 2.
- FilterChip oficial foi criado e aplicado aos filtros selecionáveis seguros.
- Alert oficial foi ampliado e aplicado a feedback persistente seguro.
- EmptyState e Spinner oficiais foram criados e aplicados onde havia equivalência segura.

## Distribuição por Status

| Status | Quantidade |
|---|---:|
| RESOLVIDO | 11 |
| EXCEÇÃO CONSCIENTE | 12 |
| FUTURO / NÃO BLOQUEIA FECHAMENTO | 10 |
| BLOQUEIA FECHAMENTO DO DS | 0 |

**Total de registros:** 33
**Pendências abertas ou exceções conscientes:** 22
**Resolvidos registrados para evitar retrabalho:** 11

## Distribuição por Bloqueio do Fechamento do DS

| Bloqueia fechamento do DS? | Quantidade |
|---|---:|
| SIM | 0 |
| NÃO | 33 |

**Itens formalmente adiados e não resolvidos:** 22
**Itens resolvidos que também não bloqueiam:** 11

## Itens Com Dúvida de Classificação

- **SettingsScreen x Tabs:** classificado como EXCEÇÃO CONSCIENTE, mas pode virar FUTURO/NÃO BLOQUEANTE se a equipe decidir criar navegação de seção própria.
- **Dropdown de categoria em Materiais:** classificado como EXCEÇÃO CONSCIENTE; pode virar FUTURO/NÃO BLOQUEANTE se a equipe decidir padronizar dropdowns de filtro.
- **Seleção de vaga:** classificada como EXCEÇÃO CONSCIENTE porque já recebeu semântica mínima, mas o componente `SelectableCard` depende do fluxo de entrevista.
- **Scores/notas:** classificados como FUTURO/NÃO BLOQUEANTE; podem virar pendência de Produto se a decisão envolver narrativa/UX de relatório além de cálculo.

## Confirmação

Este documento foi criado apenas para registrar pendências e adiamentos conscientes. Nenhuma pendência foi implementada por este documento.
