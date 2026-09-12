# Plano V1 — Fluxos de Autenticação, Ativação e Onboarding

> Implementação dos fluxos corretos de login, cadastro, verificação, ativação de conta e onboarding para os três perfis (Candidato, Avaliador, Administrador), conforme o documento `rh-connect-v1-flows.md`.
> Não altera dashboards, sidebars, identidade visual, nem qualquer tela fora dos fluxos descritos abaixo.

---

## Contexto

O protótipo atual tem os fluxos de auth parcialmente implementados. Problemas identificados:
- Login sempre navega para `"dashboard"` (candidato), sem simulação de routing por perfil
- EmailVerifyScreen: "Já confirmei" vai direto ao dashboard, pulando onboarding; "Reenviar e-mail" não tem onClick
- AuthScreen: tem um checkbox opcional de consentimento de IA no cadastro (deve ser removido)
- Nenhum perfil possui tela de onboarding/primeiro acesso (não existem as screens)
- Avaliador não tem fluxo de ativação via convite; o botão "Adicionar" no admin é só um form inline sem simulação de convite
- Administrador não tem introdução operacional de primeiro acesso

---

## Escopo de mudanças

### 1. Novos Screen IDs a adicionar (App.tsx — tipo `Screen` e `STEPS`)

| ID | Perfil | Descrição |
|---|---|---|
| `"candidate-onboarding"` | Candidato | Onboarding completo pós-verificação de e-mail |
| `"eval-activate"` | Avaliador | Ativação de conta via link de convite (definir senha) |
| `"eval-onboarding"` | Avaliador | Onboarding operacional curto (3–4 passos) |
| `"admin-onboarding"` | Administrador | Introdução operacional curta (2–4 passos) |

---

### 2. Modificações em `App.tsx`

#### 2a. `AuthScreen` — registro (linha ~700)
- **Remover** o checkbox opcional de consentimento de IA anônima (linhas ~700–706)
- Manter: nome completo, e-mail, senha, confirmar senha, aceite termos, aceite privacidade
- Navegação após "Criar minha conta" já está correta: `"email-verify"` ✅

#### 2b. `AuthScreen` — login (linha ~682)
- O botão "Entrar na plataforma" permanece navegando para `"dashboard"` (login de candidato retornante — comportamento padrão)
- O fluxo de primeiro acesso do candidato é ativado apenas pelo caminho: registro → email-verify → `"candidate-onboarding"` → dashboard
- Não transformar o login em seleção de perfil
- **Atalhos de demonstração do protótipo**: adicionar, FORA do formulário de login, uma área com separação visual clara (borda, fundo distinto, ou fora do card de login) que seja explicitamente rotulada como recurso de navegação do protótipo — exemplo: um pequeno bloco abaixo do card com ícone de olho ou tag "DEMO" e dois links discretos para Avaliador e Administrador. Essa área NÃO deve parecer parte da UX real de autenticação. No produto real, a role é identificada automaticamente. Os atalhos:
  - "Avaliador" → `"eval-onboarding"`
  - "Administrador" → `"admin-onboarding"`

#### 2c. `EmailVerifyScreen` (linha ~2377)
- "Já confirmei meu e-mail" → `"candidate-onboarding"` (era `"dashboard"`)
- "Reenviar e-mail" → adicionar `onClick={() => toast.info("E-mail reenviado! Verifique sua caixa de entrada.")}` (já existe Toaster no App)
- "Usar outro e-mail" → mantém `"auth"` ✅

#### 2d. `ForgotPasswordScreen` — confirmação (linha ~2443)
- Mensagem pós-submissão atual é correta e já não revela existência de conta ✅
- Manter exatamente como está: "Se esse e-mail estiver cadastrado, você receberá as instruções em breve."

#### 2e. `screenMap` (linha ~3384)
- Adicionar entradas para os 4 novos screens:
  ```tsx
  "candidate-onboarding": <CandidateOnboardingScreen onNavigate={navigate} />,
  "eval-activate":        <EvalActivateScreen        onNavigate={navigate} />,
  "eval-onboarding":      <EvalOnboardingScreen      onNavigate={navigate} />,
  "admin-onboarding":     <AdminOnboardingScreen     onNavigate={navigate} />,
  ```
- `CandidateOnboardingScreen` ficará em novo arquivo `src/app/components/onboarding-screens.tsx`
- `EvalActivateScreen` e `EvalOnboardingScreen` ficam em `eval-screens.tsx`
- `AdminOnboardingScreen` fica em `admin-screens.tsx`

#### 2f. `AUTH_SCREENS` — classificação correta
- `"eval-activate"` → adicionar a AUTH_SCREENS (tela pública de ativação, sem sidebar)
- `"candidate-onboarding"`, `"eval-onboarding"`, `"admin-onboarding"` → **NÃO adicionar** a AUTH_SCREENS; são telas de primeiro acesso pós-autenticação que usam layout sem sidebar por necessidade visual, sem serem parte do fluxo de autenticação em si
- Essas 3 telas usarão um wrapper próprio (sem sidebar, sem nav lateral) apenas para o layout da tela de onboarding

#### 2g. Imports (linha ~17–26)
- Adicionar import de `CandidateOnboardingScreen` do novo arquivo
- Adicionar imports de `EvalActivateScreen`, `EvalOnboardingScreen` do eval-screens
- Adicionar import de `AdminOnboardingScreen` do admin-screens

---

### 3. Novo arquivo `src/app/components/onboarding-screens.tsx`

Contém `CandidateOnboardingScreen`. Usa o mesmo padrão dos arquivos de componentes extraídos (duplica Btn, Badge, Card localmente; usa `type NavFn = (s: string) => void`).

**Conteúdo da tela:**
- Layout simples sem sidebar (tela de primeiro acesso — usar um wrapper centrado parecido com AuthLayout, porém com o nome do usuário e um avatar/mascote representando o Nilo)
- Stepper com 4 etapas:
  1. **Boas-vindas** — "Olá! Sou o Nilo, seu guia no RH Connect." Explica o propósito da plataforma
  2. **Seu perfil** — Preencher/confirmar informações básicas (campos visuais apenas, sem backend)
  3. **Como funciona** — Explica vagas, entrevista simulada, avaliação e relatório
  4. **Tudo pronto!** — CTA "Ir para o Dashboard"
- Ao final → `onNavigate("dashboard")`
- Manter identidade visual do sistema (cores, fontes, cards, botões do design system atual)

---

### 4. `eval-screens.tsx` — novas telas

#### 4a. `EvalActivateScreen` (tela de ativação via convite)
- Layout sem sidebar (público — não usa EvalLayout)
- Usa o mesmo AuthLayout-like wrapper visual das telas de auth
- Conteúdo:
  - Cabeçalho: logo RH Connect + "Ative sua conta de Avaliador"
  - Identificação do convite: "Você foi convidado por SENAC-DF para atuar como Avaliador"
  - Campo: Criar senha
  - Campo: Confirmar senha  
  - Indicador de força de senha (mesmo padrão do ResetPasswordScreen)
  - Botão "Ativar minha conta" → navega para `"auth"` (login) com toast de sucesso
- Também adicionar link para essa tela no fluxo de convite do admin (ver item 5)

#### 4b. `EvalOnboardingScreen` (onboarding operacional do avaliador)
- Layout sem sidebar (primeiro acesso — similar ao candidate onboarding)
- Stepper com 3–4 etapas curtas e diretas:
  1. **Bem-vindo ao ambiente de Avaliador** — explica papel
  2. **Fila de avaliações** — como funciona a fila, entrevistas atribuídas
  3. **Critérios e avaliação** — scores, rascunho, submissão final
  4. **Tudo pronto!** — CTA "Ir para o Dashboard"
- Ao final → `onNavigate("eval-dashboard")`

---

### 5. `admin-screens.tsx` — nova tela + ajuste no convite

#### 5a. `AdminOnboardingScreen` (introdução operacional do administrador)
- Layout sem sidebar (primeiro acesso), curto e direto
- Stepper com **3 etapas** (não mais que isso):
  1. **Gestão de usuários e avaliadores** — candidatos registrados, convidar avaliadores
  2. **Entrevistas e atribuições** — atribuir avaliações, acompanhar status
  3. **Perguntas e critérios** — banco de perguntas, critérios de avaliação
- Nenhuma gamificação, nenhum elemento visual extra
- Botão final "Ir para o Dashboard" → `onNavigate("admin-dashboard")`

#### 5b. `AdminEvaluatorsScreen` — melhorar fluxo de convite
- Renomear o botão "Adicionar" → "Convidar Avaliador"
- O form inline existente (já tem nome, e-mail, área) fica como está
- Alterar o botão "Salvar Avaliador" → "Enviar Convite"
- Ao clicar "Enviar Convite": mostrar estado de sucesso inline com mensagem "Convite enviado! O avaliador receberá um e-mail com instruções para ativar a conta." + link "Ver simulação da ativação" → `onNavigate("eval-activate")`
- O campo do form mantém o padrão visual atual

---

### 6. Verificação de navegação completa pós-implementação

| Fluxo | Sequência |
|---|---|
| Cadastro Candidato | `auth` (registro) → `email-verify` → `candidate-onboarding` → `dashboard` |
| Login Candidato retornante | `auth` (login) → `dashboard` |
| Primeiro acesso Candidato | `auth` (registro) → `email-verify` → `candidate-onboarding` → `dashboard` |
| Login Avaliador (demo) | `auth` → clica "Avaliador" → `eval-onboarding` → `eval-dashboard` |
| Login Admin (demo) | `auth` → clica "Administrador" → `admin-onboarding` → `admin-dashboard` |
| Convite Avaliador | `admin-evaluators` → form inline → "Enviar Convite" → estado de sucesso → link `eval-activate` |
| Ativação Avaliador | `eval-activate` → define senha → `auth` (login) |
| Esqueci minha senha | `auth` → `forgot-password` → `reset-password` → `auth` ✅ (já correto) |

---

## Arquivos a modificar

| Arquivo | Mudanças |
|---|---|
| `src/app/App.tsx` | Screen type (+4), STEPS (+4), AUTH_SCREENS (+1: `eval-activate`), AuthScreen (remover AI checkbox + demo links), EmailVerifyScreen (navegação + reenviar), screenMap (+4 entradas), imports (+3 novos) |
| `src/app/components/eval-screens.tsx` | +`EvalActivateScreen`, +`EvalOnboardingScreen` |
| `src/app/components/admin-screens.tsx` | +`AdminOnboardingScreen`, ajuste no convite do avaliador |
| `src/app/components/onboarding-screens.tsx` | **NOVO** — `CandidateOnboardingScreen` |

---

# Auditoria Completa — RH Connect (histórico)

> Diagnóstico das telas existentes, incompletas, ausentes e problemas de navegação nos três perfis.
> Nenhuma alteração foi feita. Este documento deve ser aprovado antes de qualquer modificação.

---

## 1. PERFIL CANDIDATO

### 1.1 Telas existentes e funcionais
| Screen ID | Componente | Status |
|---|---|---|
| `landing` | `LandingScreen` → `LandingScreenComponent` | ✅ Completa |
| `auth` | `AuthScreen` | ⚠️ Incompleta (ver bugs) |
| `email-verify` | `EmailVerifyScreen` | ⚠️ Órfã — inacessível pelo fluxo normal |
| `forgot-password` | `ForgotPasswordScreen` | ✅ Completa |
| `reset-password` | `ResetPasswordScreen` | ⚠️ Órfã — inacessível pelo fluxo normal |
| `dashboard` | `DashboardScreen` | ⚠️ Incompleta (link quebrado) |
| `profile` | `ProfileScreen` | ⚠️ Incompleta (botões "Adicionar" sem ação) |
| `settings` | `SettingsScreen` | ⚠️ Incompleta (botão "Solicitar cópia" vazio) |
| `materials` | `MaterialsScreen` | ⚠️ Incompleta ("Abrir material" sem ação) |
| `notifications` | `NotificationsScreen` | ✅ Completa |
| `job-list` | `JobListScreen` | ✅ Completa |
| `job` | `JobScreen` | ⚠️ Incompleta (bypassa fluxo obrigatório) |
| `job-detail` | alias de `JobListScreen` | ❌ Sem tela própria — mostra lista |
| `interview-setup` | `InterviewSetupScreen` | ✅ Completa |
| `consent` | `ConsentScreen` | ✅ Completa |
| `prep` | `PrepScreen` | ⚠️ Incompleta (back errado) |
| `device` | `DeviceScreen` | ✅ Completa |
| `interview` | `InterviewScreen` | ⚠️ Incompleta (começa na Q2) |
| `review` | `ReviewScreen` | ⚠️ Incompleta (bypassa confirm + done) |
| `interview-confirm` | `InterviewConfirmScreen` | ⚠️ Órfã — inacessível pelo fluxo normal |
| `interview-done` | `InterviewDoneScreen` | ⚠️ Órfã — inacessível pelo fluxo normal |
| `pending` | `PendingScreen` | ✅ Completa |
| `report` | `ReportScreen` | ⚠️ Incompleta ("Exportar PDF" sem ação) |
| `interview-history` | `InterviewHistoryScreen` | ⚠️ Incompleta (filtros decorativos) |
| `development` | `DevelopmentScreen` + `DevelopmentContent` | ⚠️ Incompleta ("Acessar curso" sem ação) |

### 1.2 Telas ausentes (não existem)
| Screen ID | Descrição |
|---|---|
| `job-detail` | Detalhe de uma vaga específica — atualmente exibe a lista |

### 1.3 Problemas de navegação (candidato)

**Críticos — fluxo quebrado:**

| # | Onde | Problema | Impacto |
|---|---|---|---|
| BUG-01 | `DashboardScreen` quick link "Materiais de apoio" | `screen: null` → clicar não faz nada | Botão morto na tela principal |
| BUG-02 | `AuthScreen` (registro) | "Criar minha conta" vai direto a `dashboard`, pulando `email-verify` | Tela `email-verify` inacessível no fluxo |
| BUG-03 | `ReviewScreen` → `handleSend` | Vai para `pending`, pulando `interview-confirm` e `interview-done` | Duas telas completas nunca são acessadas |
| BUG-04 | `InterviewScreen` | `useState(1)` — inicia na pergunta 2; Q1 nunca é exibida | Candidato perde a primeira pergunta |
| BUG-05 | `JobScreen` "Iniciar entrevista" e "Salvar e iniciar" | Vai direto a `prep`, pulando `interview-setup` e `consent` | Tela de consentimento bypassed |
| BUG-06 | `PrepScreen` botão "← Voltar" | Navega para `job`; deveria ser `consent` | Retorno fora do fluxo oficial |

**Moderados — botões mortos:**

| # | Onde | Problema |
|---|---|---|
| BUG-07 | `ReportScreen` "Exportar PDF" | Sem `onClick` |
| BUG-08 | `MaterialsScreen` "Abrir material" | Sem `onClick` em todos os cards |
| BUG-09 | `DevelopmentContent` "Acessar curso" | Sem `onClick` nos dois cards |
| BUG-10 | `SettingsScreen` "Solicitar cópia dos dados" | `onClick={() => {}}` — inerte |

**Menores:**

| # | Onde | Problema |
|---|---|---|
| BUG-11 | `LandingScreen` footer "Termos de uso" / "Privacidade" | `href="#"` — não navega para `terms` / `privacy` |
| BUG-12 | `InterviewHistoryScreen` abas de filtro | Mudam estilo mas não filtram |
| BUG-13 | `ProfileScreen` botões "Adicionar" (cursos, experiências) | Sem `onClick` |

---

## 2. PERFIL AVALIADOR

### 2.1 Telas existentes
| Screen ID | Componente | Status |
|---|---|---|
| `eval-dashboard` | `EvalDashboardScreen` | ✅ Completa (dados mockados) |
| `eval-queue` | `EvalQueueScreen` | ⚠️ Incompleta (botão "Ver" sem ação) |
| `eval-active` | `EvalActiveScreen` | ⚠️ Incompleta ("Recomeçar" sem ação) |
| `eval-screen` | `EvalScreenView` | ⚠️ Incompleta (dados hardcoded, dots com lógica quebrada) |
| `eval-review` | `EvalReviewScreen` | ⚠️ Incompleta (sucesso inline, sem tela própria de conclusão) |
| `eval-history` | `EvalHistoryScreen` | ⚠️ Incompleta (Eye/Export sem ação) |
| `eval-criteria` | `EvalCriteriaScreen` | ✅ Completa |
| `eval-settings` | `EvalSettingsScreen` | ⚠️ Incompleta ("Cancelar" sem `onClick`) |

### 2.2 Telas ausentes (não existem)
| Screen ID | Descrição |
|---|---|
| `eval-done` | Tela de conclusão da avaliação — atualmente é estado inline dentro de `EvalReviewScreen` |

### 2.3 Problemas de navegação (avaliador)

| # | Onde | Problema |
|---|---|---|
| BUG-A01 | `EvalQueueScreen` botão "Ver" | Sem `onClick` — sem tela de detalhe da fila |
| BUG-A02 | `EvalActiveScreen` "Recomeçar" | Sem `onClick` |
| BUG-A03 | `EvalScreenView` "Salvar rascunho" | Sem `onClick` |
| BUG-A04 | `EvalHistoryScreen` ícone Eye por linha | Sem `onClick` — sem tela de detalhe do histórico |
| BUG-A05 | `EvalHistoryScreen` "Exportar" | Sem `onClick` |
| BUG-A06 | `EvalSettingsScreen` "Cancelar" | Sem `onClick` |
| BUG-A07 | `EvalScreenView` e `EvalReviewScreen` | Dados de candidato hardcoded ("Fernanda Oliveira") — nenhum dado é passado da seleção da fila |
| BUG-A08 | `EvalScreenView` dots de pergunta | Lógica de "respondido" sempre lê `scores["Clareza"]` — indicador visual incorreto |
| BUG-A09 | `eval-done` ausente | Sucesso inline em `EvalReviewScreen` com `current="eval-review"` — sidebar não destaca nenhum item no estado de conclusão |

---

## 3. PERFIL ADMINISTRADOR

### 3.1 Telas existentes
| Screen ID | Componente | Status |
|---|---|---|
| `admin-dashboard` | `AdminDashboardScreen` | ✅ Completa |
| `admin-candidates` | `AdminCandidatesScreen` | ⚠️ Incompleta (Eye/Edit sem ação) |
| `admin-evaluators` | `AdminEvaluatorsScreen` | ⚠️ Incompleta (edição não implementada) |
| `admin-interviews` | `AdminInterviewsScreen` | ⚠️ Incompleta (Eye sem ação) |
| `admin-assign` | `AdminAssignScreen` | ✅ Completa |
| `admin-questions` | `AdminQuestionsScreen` | ⚠️ Incompleta (edição sem tela própria) |
| `admin-question-form` | `AdminQuestionFormScreen` | ⚠️ Incompleta (criação apenas, sem modo de edição) |
| `admin-roles` | `AdminRolesScreen` | ⚠️ Incompleta (Edit/Delete sem ação) |
| `admin-criteria` | `AdminCriteriaScreen` | ⚠️ Incompleta (Edit sem ação) |
| `admin-consent` | `AdminConsentScreen` | ✅ Completa |
| `admin-audit` | `AdminAuditScreen` | ✅ Completa |
| `admin-settings` | `AdminSettingsScreen` | ✅ Completa |

### 3.2 Telas ausentes (não existem)
| Screen ID | Descrição |
|---|---|
| `admin-candidate-detail` | Detalhe de um candidato específico — botão Eye existe mas não navega |
| `admin-evaluator-form` | Formulário de cadastro/edição de avaliador — adição é inline, edição não existe |

### 3.3 Problemas de navegação (administrador)

| # | Onde | Problema |
|---|---|---|
| BUG-B01 | `AdminCandidatesScreen` botão Eye | Sem `onClick` — sem `admin-candidate-detail` |
| BUG-B02 | `AdminCandidatesScreen` botão Edit | Sem `onClick` |
| BUG-B03 | `AdminInterviewsScreen` botão Eye | Sem `onClick` — sem tela de detalhe |
| BUG-B04 | `AdminEvaluatorsScreen` botão Edit | Sem `onClick` — sem `admin-evaluator-form` |
| BUG-B05 | `AdminEvaluatorsScreen` botão Delete | Sem `onClick` — sem modal de confirmação |
| BUG-B06 | `AdminRolesScreen` Edit/Delete | Sem `onClick` |
| BUG-B07 | `AdminCriteriaScreen` Edit | Sem `onClick` |
| BUG-B08 | `AdminQuestionsScreen` Edit por item | Sem `onClick` — `admin-question-form` não tem modo de edição |
| BUG-B09 | `AdminQuestionsScreen` Delete por item | Sem `onClick` |
| BUG-B10 | `AdminQuestionFormScreen` | `current="admin-questions"` — sidebar destaca item errado |

---

## 4. RESUMO QUANTITATIVO

| Perfil | Telas existentes | Telas incompletas | Telas ausentes | Bugs de navegação |
|---|---|---|---|---|
| Candidato | 25 | 14 | 1 (`job-detail`) | 13 |
| Avaliador | 8 | 6 | 1 (`eval-done`) | 9 |
| Administrador | 12 | 8 | 2 (`admin-candidate-detail`, `admin-evaluator-form`) | 10 |
| **Total** | **45** | **28** | **4** | **32** |

---

## 5. ORDEM RECOMENDADA DE CORREÇÃO/CRIAÇÃO

### Prioridade 1 — Correções de fluxo crítico (candidato)
Estes bugs quebram o fluxo principal e devem ser resolvidos primeiro por impactarem a jornada completa do candidato:

1. **BUG-04** — `InterviewScreen`: corrigir `useState(0)` (Q1 sempre pulada)
2. **BUG-03** — `ReviewScreen`: inserir navegação para `interview-confirm` antes de `pending`
3. **BUG-02** — `AuthScreen`: registro deve navegar para `email-verify` (com link de volta)
4. **BUG-05** — `JobScreen`: "Iniciar entrevista" deve ir para `interview-setup`
5. **BUG-06** — `PrepScreen`: botão voltar deve ir para `consent`
6. **BUG-01** — `DashboardScreen`: corrigir `screen: null` para `"materials"`

### Prioridade 2 — Telas ausentes (novas)
1. `eval-done` — tela de conclusão da avaliação (avaliador)
2. `admin-candidate-detail` — detalhe do candidato (admin)
3. `admin-evaluator-form` — formulário de avaliador com modo de criação e edição (admin)
4. `job-detail` — detalhe de uma vaga (candidato, opcional)

### Prioridade 3 — Botões mortos prioritários
1. `AdminQuestionsScreen` Edit → abrir `admin-question-form` em modo edição
2. `EvalQueueScreen` "Ver" → abrir detalhe da avaliação pendente
3. `EvalHistoryScreen` Eye → abrir relatório da avaliação concluída
4. `AdminCandidatesScreen` Eye → navegar para `admin-candidate-detail`
5. `AdminEvaluatorsScreen` Edit → abrir `admin-evaluator-form`

### Prioridade 4 — Botões mortos secundários
6. `MaterialsScreen` "Abrir material" — definir ação (modal ou nova tela)
7. `DevelopmentContent` "Acessar curso" — definir ação
8. `ReportScreen` "Exportar PDF" — definir ação (modal de feedback)
9. Filtros decorativos em `InterviewHistoryScreen`
10. `ProfileScreen` botões "Adicionar"

### Prioridade 5 — Melhorias pontuais
- Links do footer da LandingScreen (`terms`, `privacy`)
- `EvalScreenView`: corrigir lógica dos dots e desacoplar dados mockados
- `EvalSettingsScreen` "Cancelar"
- `AdminRolesScreen`, `AdminCriteriaScreen` Edit/Delete

---

## 6. VERIFICAÇÃO

Antes de qualquer implementação:
- Confirmar com o usuário quais prioridades executar primeiro
- Confirmar se `job-detail` deve ser implementada ou mantida como alias
- Confirmar se `eval-done` deve ser tela separada ou estado aprimorado inline
- Confirmar se a correção do fluxo de e-mail de confirmação é necessária neste protótipo
