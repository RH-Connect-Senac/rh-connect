# Mapa de Telas do Front-end — RH Connect
## Versão atualizada para rotas reais do Front

**Projeto:** RH Connect
**Versão:** v2.1
**Data de atualização:** 10/09/2026
**Referência principal:** Front real em `apps/web/src/app/App.tsx` e implantação inicial de React Router

---

# 1. Objetivo

Este documento organiza as telas atuais do Front-end do RH Connect e indica:

- qual perfil utiliza cada tela;
- prioridade;
- se entra ou não na entrega de 10/09;
- estado atual;
- dependência com Back-end;
- rota futura sugerida;
- prioridade de migração;
- observações de produto e integração.

O mapa deve ser usado em conjunto com:

- Escopo da Entrega Testável 10/09;
- Plano Operacional Front-end — Semana 1;
- Plano de Migração Estrutural do Front-end;
- Plano Operacional Back-end — Preparação para Integração;
- Design System.

## Resultado desta branch

A branch `work/mapa-telas-e-rotas` implementa rotas reais no Front usando `react-router`, sem integração de Auth real e sem bloqueio de perfil nesta fase.

O `App.tsx` deixou de renderizar a tela principal por `screenMap` e `useState<Screen>`. A navegação visual existente foi preservada por um adaptador temporário `onNavigate(screen) -> path`, permitindo que layouts, sidebars, headers, popovers e telas continuem funcionando enquanto a migração estrutural avança.

O Vite continua com `base: '/rhconnect/'`, e o roteador usa `basename="/rhconnect"` para funcionar sob o subpath publicado.

---

# 2. Status utilizados

- **Visual**: tela representada visualmente, sem comportamento real completo.
- **Mockado**: usa dados fictícios/hardcoded.
- **Simulado**: fluxo ou ação representada por estado local, `setTimeout`, navegação fake ou lógica apenas visual.
- **Real parcial**: parte do comportamento já pode existir, mas ainda depende de integração ou persistência.
- **Futuro**: não entra no caminho crítico de 10/09 ou depende de evolução posterior.
- **Pendente de decisão**: depende de uma decisão de produto ainda não fechada.

## Prioridade de migração

- **P0**: caminho crítico da entrega; migrar primeiro.
- **P1**: necessária para suportar o fluxo principal.
- **P2**: importante, mas pode ser migrada depois das telas críticas.
- **P3**: futura ou fora do recorte obrigatório.

---

# 2.1 Rotas implementadas nesta branch

Estas são as rotas reais disponíveis no Front após a migração inicial para React Router. As telas continuam visuais, mockadas ou simuladas conforme indicado; nenhuma rota aplica autenticação ou autorização real nesta fase.

| Rota final | Tela/componente | Perfil | Prioridade | Status atual | Dependência Back | Observações |
|---|---|---|---|---|---|---|
| `/` | `LandingScreen` | Público | P1 | Visual | Não imediata | Entrada pública do produto. |
| `/login` | `AuthScreen` | Público | P0 | Simulado | Sim | Usa a aba inicial de login. |
| `/register` | `AuthScreen` | Público | P0 | Simulado | Sim | Usa a aba inicial de cadastro. |
| `/verify-email` | `EmailVerifyScreen` | Público | P2 | Simulado | Sim | Visual existente; validação real futura. |
| `/forgot-password` | `ForgotPasswordScreen` | Público | P3 | Simulado | Sim | Existe visualmente, fora do foco atual. |
| `/reset-password` | `ResetPasswordScreen` | Público | P3 | Simulado | Sim | Existe visualmente, fora do foco atual. |
| `/terms` | `TermsScreen` | Público | P2 | Visual | Talvez | Conteúdo deve seguir decisões legais/privacidade. |
| `/privacy` | `PrivacyScreen` | Público | P2 | Visual | Talvez | Conteúdo deve seguir decisões de consentimento e dados. |
| `/candidate/onboarding` | `CandidateOnboardingScreen` | Candidato | P0 | Simulado | Sim | Onboarding visual do candidato. |
| `/candidate/dashboard` | `DashboardScreen` | Candidato | P0 | Mockado | Sim | Dashboard com dados fictícios. |
| `/candidate/profile` | `ProfileScreen` | Candidato | P0 | Mockado | Sim | Perfil profissional mockado/simulado. |
| `/candidate/settings` | `SettingsScreen` | Candidato | P3 | Simulado | Sim | Preservada para o protótipo; fora do caminho crítico. |
| `/candidate/materials` | `MaterialsScreen` | Candidato | P3 | Mockado | Talvez | Preservada para o protótipo; fora do caminho crítico. |
| `/candidate/notifications` | `NotificationsScreen` | Candidato | P3 | Mockado | Sim | Preservada para o protótipo; notificações reais futuras. |
| `/candidate/jobs` | `JobListScreen` | Candidato | P2 | Mockado | Sim | Provisória; depende da decisão vaga x área/subárea. |
| `/candidate/jobs/new` | `JobScreen` | Candidato | P2 | Simulado | Sim | Provisória; depende da decisão vaga x área/subárea. |
| `/candidate/jobs/:id` | `JobListScreen` | Candidato | P2 | Mockado | Sim | Rota preservada, mas `job-detail` ainda não tem tela própria. |
| `/candidate/interviews` | `InterviewHistoryScreen` | Candidato | P2 | Mockado | Sim | Histórico preservado. |
| `/candidate/development` | `DevelopmentScreen` | Candidato | P1 | Mockado | Sim/parcial | Desenvolvimento, gamificação base e árvore visual. |
| `/candidate/interviews/new` | `InterviewSetupScreen` | Candidato | P0 | Simulado | Sim | Seleção de contexto antes da entrevista. |
| `/candidate/interviews/new/consent` | `ConsentScreen` | Candidato | P0 | Simulado | Sim | Consentimento visual; registro real futuro. |
| `/candidate/interviews/new/preparation` | `PrepScreen` | Candidato | P0 | Visual | Não imediata | Orientações pré-entrevista. |
| `/candidate/interviews/new/device-check` | `DeviceScreen` | Candidato | P0 | Simulado | Talvez | Teste de câmera/microfone ainda simulado. |
| `/candidate/interviews/new/record` | `InterviewScreen` | Candidato | P0 | Simulado | Sim | Gravação ainda simulada. |
| `/candidate/interviews/new/review` | `ReviewScreen` | Candidato | P0 | Simulado | Sim | Revisão/envio ainda simulados. |
| `/candidate/interviews/new/submit` | `InterviewConfirmScreen` | Candidato | P0 | Simulado | Sim | Confirmação de envio visual. |
| `/candidate/interviews/:id/success` | `InterviewDoneScreen` | Candidato | P0 | Simulado | Sim | Sucesso após envio simulado. |
| `/candidate/interviews/:id/status` | `PendingScreen` | Candidato | P0 | Mockado | Sim | Acompanhamento de avaliação mockado. |
| `/candidate/reports/:id` | `ReportScreen` | Candidato | P0 | Mockado | Sim | Relatório mockado. |
| `/evaluator/activate` | `EvalActivateScreen` | Avaliador | P1 | Simulado | Sim | Visual preservado; token real fica para Auth futura. |
| `/evaluator/onboarding` | `EvalOnboardingScreen` | Avaliador | P1 | Simulado | Sim | Onboarding visual. |
| `/evaluator/dashboard` | `EvalDashboardScreen` | Avaliador | P0 | Mockado | Sim | Dashboard do avaliador. |
| `/evaluator/evaluations` | `EvalQueueScreen` | Avaliador | P0 | Mockado | Sim | Fila de avaliações mockada. |
| `/evaluator/evaluations/active` | `EvalActiveScreen` | Avaliador | P2 | Mockado | Sim | Preservada para o protótipo. |
| `/evaluator/evaluations/:id` | `EvalScreenView` | Avaliador | P0 | Simulado | Sim | Tela de avaliação com vídeo/critério simulados. |
| `/evaluator/evaluations/:id/review` | `EvalReviewScreen` | Avaliador | P0 | Simulado | Sim | Revisão antes de concluir. |
| `/evaluator/evaluations/:id/success` | `EvalDoneScreen` | Avaliador | P0 | Simulado | Sim | Sucesso após avaliação simulada. |
| `/evaluator/history` | `EvalHistoryScreen` | Avaliador | P3 | Mockado | Sim | Histórico fora do caminho crítico. |
| `/evaluator/criteria` | `EvalCriteriaScreen` | Avaliador | P2 | Mockado | Sim | Guia de critérios. |
| `/evaluator/settings` | `EvalSettingsScreen` | Avaliador | P3 | Simulado | Sim | Configurações fora do caminho crítico. |
| `/admin/onboarding` | `AdminOnboardingScreen` | Admin | P2 | Simulado | Sim | Onboarding visual. |
| `/admin/dashboard` | `AdminDashboardScreen` | Admin | P0 | Mockado | Sim | Dashboard operacional mínimo. |
| `/admin/candidates` | `AdminCandidatesScreen` | Admin | P2 | Mockado | Sim | Gestão/listagem preservada. |
| `/admin/candidates/:id` | `AdminCandidateDetailScreen` | Admin | P2 | Mockado | Sim | Detalhe mockado. |
| `/admin/evaluators` | `AdminEvaluatorsScreen` | Admin | P0 | Mockado | Sim | Gestão de avaliadores com convite local visual. |
| `/admin/evaluators/new` | `AdminEvaluatorFormScreen` | Admin | P1 | Simulado | Sim | Formulário visual. |
| `/admin/interviews` | `AdminInterviewsScreen` | Admin | P0 | Mockado | Sim | Acompanhamento de entrevistas. |
| `/admin/assignments` | `AdminAssignScreen` | Admin | P0 | Simulado | Sim | Atribuição ainda local/simulada. |
| `/admin/questions` | `AdminQuestionsScreen` | Admin | P1 | Mockado | Sim | Banco de perguntas mockado. |
| `/admin/questions/new` | `AdminQuestionFormScreen` | Admin | P3 | Simulado | Sim | Formulário fora do caminho crítico. |
| `/admin/roles` | `AdminRolesScreen` | Admin | P3 | Mockado | Sim | Cargos/áreas fora do caminho crítico. |
| `/admin/criteria` | `AdminCriteriaScreen` | Admin | P1 | Mockado | Sim | Critérios administrativos. |
| `/admin/consents` | `AdminConsentScreen` | Admin | P3 | Mockado | Sim | Tela preservada; operação real futura. |
| `/admin/audit` | `AdminAuditScreen` | Admin | P3 | Mockado | Sim | Auditoria avançada futura. |
| `/admin/settings` | `AdminSettingsScreen` | Admin | P3 | Simulado | Sim | Configurações fora do caminho crítico. |

Redirecionamentos implementados:

```text
/candidate -> /candidate/dashboard
/evaluator -> /evaluator/dashboard
/admin -> /admin/dashboard
* -> /
```

---

# 3. Públicas e autenticação

| Tela | Arquivo/componente provável | Perfil | Prioridade | 10/09 | Status atual | Dependência Back | Rota futura sugerida | Migração | Observações |
|---|---|---|---|---|---|---|---|---|---|
| Landing | `landing-screen.tsx` / `LandingScreen` | Público | Alta | Sim | Visual | Não imediata | `/` | P1 | Entrada principal do produto. Manter alinhada ao Design System. |
| Login | `App.tsx` / `AuthScreen` | Público | Alta | Sim | Simulado | Sim | `/login` | P0 | Deve virar login real e redirecionar por perfil. |
| Cadastro de candidato | `App.tsx` / `AuthScreen` | Público | Alta | Sim | Simulado | Sim | `/register` | P0 | Cadastro público apenas para candidato. |
| Verificação de e-mail | `App.tsx` / `EmailVerifyScreen` | Público | Média | A validar | Simulado | Sim | `/verify-email` | P2 | Só entra se estiver confirmada como parte do fluxo real de cadastro. Não deve bloquear login/cadastro mínimo. |
| Esqueci senha | `App.tsx` / `ForgotPasswordScreen` | Público | Baixa | Não | Simulado | Sim | `/forgot-password` | P3 | Fora do foco de 10/09. |
| Redefinir senha | `App.tsx` / `ResetPasswordScreen` | Público | Baixa | Não | Simulado | Sim | `/reset-password` | P3 | Fora do foco de 10/09. |
| Termos de uso | `App.tsx` / `TermsScreen` | Público | Média | Sim | Visual | Talvez | `/terms` | P2 | Texto precisa estar coerente com uso de dados, imagem e vídeo. |
| Privacidade | `App.tsx` / `PrivacyScreen` | Público | Média | Sim | Visual | Talvez | `/privacy` | P2 | Deve alinhar com consentimento, vídeo, acesso e retenção. |

---

# 4. Onboarding

O onboarding entra na entrega e deve acontecer **após autenticação**.

| Tela | Arquivo/componente provável | Perfil | Prioridade | 10/09 | Status atual | Dependência Back | Rota futura sugerida | Migração | Observações |
|---|---|---|---|---|---|---|---|---|---|
| Onboarding do candidato | `onboarding-screens.tsx` / `CandidateOnboardingScreen` | Candidato | Alta | Sim | Simulado | Sim | `/candidate/onboarding` | P0 | Curto. Nilo pode aparecer apenas estático. |
| Onboarding do avaliador | `eval-screens.tsx` / `EvalOnboardingScreen` | Avaliador | Média | Sim | Simulado | Sim | `/evaluator/onboarding` | P1 | Deve ser curto e não representar cadastro público. |
| Onboarding do admin | `admin-screens.tsx` / `AdminOnboardingScreen` | Admin | Média | Sim | Simulado | Sim | `/admin/onboarding` | P2 | Pode ser introdução rápida e simplificada. |

---

# 5. Candidato — núcleo do fluxo

| Tela | Arquivo/componente provável | Prioridade | 10/09 | Status atual | Dependência Back | Rota futura sugerida | Migração | Observações |
|---|---|---|---|---|---|---|---|---|
| Dashboard | `App.tsx` / `DashboardScreen` | Alta | Sim | Mockado | Sim | `/candidate/dashboard` | P0 | Deve refletir estado real do candidato e próxima ação. |
| Perfil | `App.tsx` / `ProfileScreen` | Alta | Sim | Mockado | Sim | `/candidate/profile` | P0 | Dados mínimos necessários para sustentar a jornada. |
| Configurações | `App.tsx` / `SettingsScreen` | Baixa | Não obrigatório | Simulado | Sim | `/candidate/settings` | P3 | Fora do caminho crítico; manter apenas se simples. |
| Notificações | `App.tsx` / `NotificationsScreen` | Baixa | Não obrigatório | Mockado | Sim | `/candidate/notifications` | P3 | Notificações reais não fazem parte do recorte principal. |
| Histórico de entrevistas | `App.tsx` / `InterviewHistoryScreen` | Média | Pode entrar | Mockado | Sim | `/candidate/interviews` | P2 | Útil, mas não deve bloquear o fluxo principal. |
| Relatório | `App.tsx` / `ReportScreen` | Alta | Sim | Mockado | Sim | `/candidate/reports/:id` | P0 | Só deve liberar resultado após avaliação concluída. |

---

# 6. Candidato — contexto de treinamento

Esta área permanece **pendente de decisão de produto**.

A equipe ainda precisa validar se o contexto da entrevista será baseado em:

```text
Vaga
OU
Área/Subárea relacionada ao perfil
```

Enquanto a decisão não for fechada, o Front não deve eliminar definitivamente as telas atuais de vaga nem consolidar toda a navegação em torno delas.

| Tela/Área | Arquivo/componente provável | Prioridade | 10/09 | Status atual | Dependência Back | Rota futura sugerida | Migração | Observações |
|---|---|---|---|---|---|---|---|---|
| Minhas vagas | `App.tsx` / `JobListScreen` | Pendente | Pendente | Mockado | Sim | `/candidate/context` ou `/candidate/jobs` | P2 | Manter até decisão vaga x área/subárea. |
| Nova vaga | `App.tsx` / `JobScreen` | Pendente | Pendente | Simulado | Sim | `/candidate/context/new` ou `/candidate/jobs/new` | P2 | Não consolidar como fluxo definitivo antes da decisão. |
| Detalhe de vaga | `App.tsx` / `JobListScreen` reaproveitado | Pendente | Pendente | Mockado | Sim | `/candidate/jobs/:id` | P2 | Pode deixar de existir se o produto migrar para áreas/subáreas. |
| Selecionar contexto | `App.tsx` / `InterviewSetupScreen` | Alta | Sim | Simulado | Sim | `/candidate/interviews/new` | P0 | Deve existir como etapa funcional, independentemente do modelo final. |
| Explorar áreas/subáreas | Ainda não consolidado | Pendente | Pendente | Futuro / decisão | Sim | `/candidate/explore` | P2 | Só implementar após validação de produto. |

---

# 7. Candidato — fluxo de entrevista com vídeo

A entrevista com vídeo é obrigatória para 10/09.

| Tela | Arquivo/componente provável | Prioridade | 10/09 | Status atual | Dependência Back | Rota futura sugerida | Migração | Observações |
|---|---|---|---|---|---|---|---|---|
| Consentimento | `App.tsx` / `ConsentScreen` | Alta | Sim | Simulado | Sim | `/candidate/interviews/new/consent` | P0 | Consentimento precisa ser registrado. |
| Orientações | `App.tsx` / `PrepScreen` | Alta | Sim | Visual | Não imediata | `/candidate/interviews/new/preparation` | P0 | Orientação curta antes da gravação. |
| Teste técnico | `App.tsx` / `DeviceScreen` | Alta | Sim | Simulado | Talvez | `/candidate/interviews/new/device-check` | P0 | Teste real de câmera/microfone no mínimo necessário. |
| Entrevista | `App.tsx` / `InterviewScreen` | Alta | Sim | Simulado | Sim | `/candidate/interviews/new/record` | P0 | Precisa gravar vídeo real. |
| Revisão | `App.tsx` / `ReviewScreen` | Alta | Sim | Simulado | Sim | `/candidate/interviews/new/review` | P0 | Revisão da gravação antes do envio. |
| Confirmar envio | `App.tsx` / `InterviewConfirmScreen` | Alta | Sim | Simulado | Sim | `/candidate/interviews/new/submit` | P0 | Deve realizar envio/registro real. |
| Entrevista concluída | `App.tsx` / `InterviewDoneScreen` | Alta | Sim | Simulado | Sim | `/candidate/interviews/:id/success` | P0 | Estado final após envio confirmado. |
| Aguardando avaliação | `App.tsx` / `PendingScreen` | Alta | Sim | Mockado | Sim | `/candidate/interviews/:id/status` | P0 | Deve usar status real da entrevista/avaliação. |

---

# 8. Candidato — Desenvolvimento, Gamificação, Nilo e Árvore

A área de Desenvolvimento muda de classificação em relação ao mapa anterior.

Gamificação base, Nilo estático e Árvore de Talentos reformulada **entram em 10/09**.

| Tela/Área | Arquivo/componente provável | Prioridade | 10/09 | Status atual | Dependência Back | Rota futura sugerida | Migração | Observações |
|---|---|---|---|---|---|---|---|---|
| Meu Desenvolvimento / Gamificação base | `development-screen.tsx` / `DevelopmentContent` | Alta | Sim | Mockado | Sim/Parcial | `/candidate/development` | P1 | Deve ser reformulado conforme escopo atual. |
| Árvore de Talentos | `development-screen.tsx` / componente a consolidar | Alta | Sim | Visual / a reformular | Parcial | `/candidate/development` | P1 | Representa progresso dentro da jornada, não senioridade profissional. |
| Nilo estático | componentes/telas aprovadas | Média | Sim | Visual | Não imediata | Integrado às telas | P1 | Guia visual. Sem voz, lip-sync ou avaliação. |
| Missão / próxima ação | `development-screen.tsx` | Média | Sim, base | Mockado | Sim/Parcial | `/candidate/development` | P1 | Pode refletir etapa real da jornada. |
| Centro de Desenvolvimento | `development-screen.tsx` | Baixa | Não | Mockado/Futuro | Talvez | `/candidate/development-center` | P3 | Fora do escopo obrigatório. |
| Materiais | `App.tsx` / `MaterialsScreen` | Baixa | Não | Mockado | Talvez | `/candidate/materials` | P3 | Evolução futura. |

---

# 9. Avaliador

| Tela | Arquivo/componente provável | Prioridade | 10/09 | Status atual | Dependência Back | Rota futura sugerida | Migração | Observações |
|---|---|---|---|---|---|---|---|---|
| Ativação de conta | `eval-screens.tsx` / `EvalActivateScreen` | Média | Sim, se convite for usado | Simulado | Sim | `/evaluator/activate` | P1 | Avaliador não possui cadastro público. |
| Dashboard | `eval-screens.tsx` / `EvalDashboardScreen` | Alta | Sim | Mockado | Sim | `/evaluator/dashboard` | P0 | Deve refletir avaliações atribuídas. |
| Fila de avaliações | `eval-screens.tsx` / `EvalQueueScreen` | Alta | Sim | Mockado | Sim | `/evaluator/evaluations` | P0 | Precisa usar atribuições reais. |
| Em andamento | `eval-screens.tsx` / `EvalActiveScreen` | Média | Pode entrar | Mockado | Sim | `/evaluator/evaluations/active` | P2 | Pode ser simplificada. |
| Tela de avaliação | `eval-screens.tsx` / `EvalScreenView` | Alta | Sim | Simulado | Sim | `/evaluator/evaluations/:id` | P0 | Deve reproduzir vídeo autorizado e apresentar critérios. |
| Revisão de avaliação | `eval-screens.tsx` / `EvalReviewScreen` | Alta | Sim | Simulado | Sim | `/evaluator/evaluations/:id/review` | P0 | Revisão antes da conclusão. |
| Avaliação enviada | `eval-screens.tsx` / `EvalDoneScreen` | Alta | Sim | Simulado | Sim | `/evaluator/evaluations/:id/success` | P0 | Estado real de avaliação concluída. |
| Histórico | `eval-screens.tsx` / `EvalHistoryScreen` | Baixa | Não obrigatório | Mockado | Sim | `/evaluator/history` | P3 | Não deve bloquear entrega. |
| Critérios | `eval-screens.tsx` / `EvalCriteriaScreen` | Média | Pode entrar | Mockado | Sim | `/evaluator/criteria` | P2 | Pode ser apenas leitura dos critérios atuais. |
| Configurações | `eval-screens.tsx` / `EvalSettingsScreen` | Baixa | Não | Simulado | Sim | `/evaluator/settings` | P3 | Fora do caminho crítico. |

---

# 10. Administrador

O Admin entra em recorte mínimo para sustentar a operação do fluxo.

| Tela | Arquivo/componente provável | Prioridade | 10/09 | Status atual | Dependência Back | Rota futura sugerida | Migração | Observações |
|---|---|---|---|---|---|---|---|---|
| Dashboard | `admin-screens.tsx` / `AdminDashboardScreen` | Alta | Sim | Mockado | Sim | `/admin/dashboard` | P0 | Operação e acompanhamento mínimo. |
| Candidatos | `admin-screens.tsx` / `AdminCandidatesScreen` | Média | Pode entrar | Mockado | Sim | `/admin/candidates` | P2 | Não deve bloquear fluxo principal. |
| Detalhe do candidato | `admin-screens.tsx` / `AdminCandidateDetailScreen` | Média | Pode entrar | Mockado | Sim | `/admin/candidates/:id` | P2 | Depende de autorização e dados reais. |
| Avaliadores | `admin-screens.tsx` / `AdminEvaluatorsScreen` | Alta | Sim | Mockado | Sim | `/admin/evaluators` | P0 | Necessário para operação mínima. |
| Formulário de avaliador | `admin-screens.tsx` / `AdminEvaluatorFormScreen` | Média | Pode entrar | Simulado | Sim | `/admin/evaluators/new` | P1 | Pode apoiar convite/provisionamento controlado. |
| Entrevistas | `admin-screens.tsx` / `AdminInterviewsScreen` | Alta | Sim | Mockado | Sim | `/admin/interviews` | P0 | Acompanhamento mínimo do fluxo. |
| Atribuições | `admin-screens.tsx` / `AdminAssignScreen` | Alta | Sim | Simulado | Sim | `/admin/assignments` | P0 | Necessária para sustentar avaliação humana. |
| Perguntas | `admin-screens.tsx` / `AdminQuestionsScreen` | Média | Pode entrar | Mockado | Sim | `/admin/questions` | P1 | Gestão básica se necessária ao fluxo. |
| Formulário de pergunta | `admin-screens.tsx` / `AdminQuestionFormScreen` | Baixa | Não obrigatório | Simulado | Sim | `/admin/questions/new` | P3 | Pode ser substituído por dados pré-cadastrados. |
| Cargos/perfis | `admin-screens.tsx` / `AdminRolesScreen` | Baixa | Não | Mockado | Sim | `/admin/roles` | P3 | Fora do fluxo mínimo. |
| Critérios | `admin-screens.tsx` / `AdminCriteriaScreen` | Média | Sim ou pré-cadastrado | Mockado | Sim | `/admin/criteria` | P1 | Critérios precisam existir; UI completa pode ser simplificada. |
| Consentimentos | `admin-screens.tsx` / `AdminConsentScreen` | Baixa | Não obrigatório | Mockado | Sim | `/admin/consents` | P3 | Registro real deve existir no Back; tela administrativa pode esperar. |
| Auditoria | `admin-screens.tsx` / `AdminAuditScreen` | Baixa | Não | Mockado | Sim | `/admin/audit` | P3 | Evolução futura. |
| Configurações | `admin-screens.tsx` / `AdminSettingsScreen` | Baixa | Não | Simulado | Sim | `/admin/settings` | P3 | Fora do caminho crítico. |

---

# 11. Recursos futuros / “Em breve”

| Tela/Área | Perfil | 10/09 | Status | Observações |
|---|---|---|---|---|
| Centro de Desenvolvimento completo | Candidato | Não | Futuro | Fora do recorte obrigatório. |
| Materiais ricos | Candidato | Não | Futuro | Pode aparecer apenas como “Em breve” se aprovado. |
| Gamificação avançada | Candidato | Não | Futuro | Base entra; sistema completo fica para depois. |
| Nilo com voz/lip-sync | Candidato | Não | Futuro | Para 10/09, somente representação estática. |
| Árvore dinâmica avançada | Candidato | Não | Futuro | Para 10/09, versão visual reformulada. |
| IA supervisionada | Todos | Não | Futuro | Fora da entrega. |
| Recuperação de senha | Público | Não | Futuro | Fora do foco principal. |
| Auditoria operacional completa | Admin | Não | Futuro | Exige logs e Back-end mais avançado. |
| Analytics avançados | Todos/Adm | Não | Futuro | Não bloquear dashboards mínimos. |
| Notificações avançadas | Todos | Não | Futuro | Não bloquear fluxo principal. |

---

# 12. Telas que mudaram de classificação em relação ao mapa anterior

## Agora entram em 10/09

- Meu Desenvolvimento / Gamificação base;
- Nilo estático;
- Árvore de Talentos reformulada;
- onboarding curto dos três perfis;
- entrevista com vídeo real;
- teste técnico mínimo de câmera/microfone;
- envio/registro real do vídeo.

## Agora ficam fora do foco

- recuperação de senha;
- Centro de Desenvolvimento completo;
- Nilo com voz;
- lip-sync;
- gamificação avançada;
- Árvore dinâmica avançada.

## Permanecem pendentes

- `Minhas Vagas`;
- `Nova vaga`;
- `Detalhe de vaga`;
- eventual tela de Áreas/Subáreas.

Essas telas dependem da decisão de produto sobre o contexto de treinamento.

---

# 13. Rotas prioritárias para a migração

A proposta de rotas deve ser validada contra este mapa antes da implementação final.

## Públicas

```text
/
/login
/register
/terms
/privacy
```

## Candidato

```text
/candidate/onboarding
/candidate/dashboard
/candidate/profile
/candidate/interviews/new
/candidate/interviews/new/consent
/candidate/interviews/new/preparation
/candidate/interviews/new/device-check
/candidate/interviews/new/record
/candidate/interviews/new/review
/candidate/interviews/:id/status
/candidate/reports/:id
/candidate/development
```

## Avaliador

```text
/evaluator/onboarding
/evaluator/dashboard
/evaluator/evaluations
/evaluator/evaluations/:id
/evaluator/evaluations/:id/review
```

## Administrador

```text
/admin/onboarding
/admin/dashboard
/admin/evaluators
/admin/interviews
/admin/assignments
/admin/questions
/admin/criteria
```

## Pendentes da decisão vaga x área/subárea

```text
/candidate/jobs
/candidate/jobs/new
/candidate/jobs/:id
```

ou

```text
/candidate/explore
/candidate/areas
```

Não consolidar essas rotas antes da validação.

---

# 14. Ordem de prioridade para a migração estrutural

## P0 — caminho crítico

1. Login/cadastro;
2. onboarding;
3. dashboard do candidato;
4. perfil;
5. início da entrevista;
6. consentimento;
7. preparação;
8. teste técnico;
9. gravação;
10. revisão/envio;
11. status;
12. dashboard/fila do avaliador;
13. tela de avaliação;
14. revisão/conclusão;
15. relatório;
16. dashboard/admin mínimo;
17. avaliadores;
18. entrevistas;
19. atribuições.

## P1 — suporte essencial

- Desenvolvimento/Gamificação base;
- Árvore de Talentos;
- Nilo estático;
- critérios;
- perguntas;
- ativação do avaliador quando aplicável.

## P2 — importantes, mas não bloqueantes

- histórico;
- detalhes administrativos;
- telas completas do contexto vaga x área/subárea;
- páginas auxiliares.

## P3 — futuras

- Centro de Desenvolvimento;
- materiais;
- configurações completas;
- recuperação de senha;
- auditoria avançada;
- gamificação avançada;
- Nilo animado/voz;
- IA.

---

# 15. Dependências principais com o Back-end

| Área Front | Dependência principal |
|---|---|
| Login/cadastro | Auth, User, Role |
| Onboarding | estado do usuário/onboarding |
| Perfil | CandidateProfile |
| Contexto | Job ou Area/Subarea, após decisão |
| Consentimento | Consent |
| Entrevista | Interview, Question, Response |
| Vídeo | MediaMetadata + armazenamento de mídia |
| Status | Interview/Evaluation status |
| Avaliador | Assignment |
| Avaliação | Evaluation, EvaluationCriteria |
| Relatório | Report |
| Gamificação base | progresso real da jornada / eventos definidos |
| Admin | usuários, avaliadores, entrevistas, atribuições, critérios |

---

# 16. Critério para considerar uma tela pronta para integração

Uma tela entra em integração quando houver:

```text
Page
+
Route
+
Contrato
+
Endpoint
```

Além disso:

- estado visual coerente;
- loading;
- erro;
- estado vazio quando aplicável;
- regra de acesso por perfil;
- comportamento real mínimo definido.

---

# 17. Critério para considerar uma tela pronta para 10/09

Uma tela do caminho crítico não deve ser considerada pronta apenas porque “abre”.

Ela deve:

- estar acessível pela navegação real;
- respeitar o perfil correto;
- exibir dados reais quando necessário;
- executar sua ação principal;
- apresentar erro/estado vazio quando aplicável;
- não depender de navegação fake;
- não apresentar mocks como se fossem dados reais;
- funcionar com responsividade mínima aceitável.

---

# 18. Observação sobre o estado atual dos arquivos

Os caminhos e componentes listados neste documento são baseados no mapeamento atual do protótipo.

Durante a migração estrutural, eles podem mudar para uma organização como:

```text
pages/
├── public/
├── candidate/
├── evaluator/
└── admin/

layouts/
├── CandidateLayout.tsx
├── EvaluatorLayout.tsx
└── AdminLayout.tsx
```

O objetivo não é preservar o arquivo atual.

O objetivo é preservar:

- tela;
- comportamento aprovado;
- identidade visual;
- regras de negócio;
- posição no fluxo.

---

# 19. Resumo final

O mapa atualizado passa a refletir o escopo atual da entrega:

```text
AUTENTICAÇÃO
↓
ONBOARDING
↓
PERFIL
↓
CONTEXTO DE TREINAMENTO
↓
ENTREVISTA COM VÍDEO
↓
AVALIAÇÃO HUMANA
↓
RELATÓRIO
↓
GAMIFICAÇÃO BASE
```

Com suporte de:

```text
ADMIN
+
NILO ESTÁTICO
+
ÁRVORE DE TALENTOS REFORMULADA
```

E mantendo fora do caminho crítico:

```text
RECUPERAÇÃO DE SENHA
CENTRO DE DESENVOLVIMENTO
NILO COM VOZ
GAMIFICAÇÃO AVANÇADA
ÁRVORE DINÂMICA AVANÇADA
IA
```

A decisão **vaga x área/subárea** permanece registrada como pendência e não deve bloquear as demais frentes.
