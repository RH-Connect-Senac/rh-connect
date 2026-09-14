export const ROUTER_BASENAME = "/rhconnect";

export type AppScreen =
  | "landing" | "terms" | "privacy"
  | "auth" | "register" | "email-verify" | "forgot-password" | "reset-password"
  | "candidate-onboarding" | "eval-activate" | "eval-onboarding" | "admin-onboarding"
  | "dashboard" | "profile" | "settings" | "materials" | "notifications"
  | "interview-history" | "development" | "disc-test"
  | "interview-setup" | "consent" | "prep" | "interview" | "review" | "interview-confirm" | "interview-done"
  | "pending" | "report"
  | "eval-dashboard" | "eval-queue" | "eval-active" | "eval-screen" | "eval-review" | "eval-done" | "eval-history" | "eval-criteria" | "eval-settings"
  | "admin-dashboard" | "admin-candidates" | "admin-candidate-detail" | "admin-evaluators" | "admin-evaluator-form"
  | "admin-interviews" | "admin-assign"
  | "admin-questions" | "admin-question-form" | "admin-roles" | "admin-criteria"
  | "admin-consent" | "admin-audit" | "admin-settings";

type RouteGroup = "public" | "candidate" | "evaluator" | "admin";
type RoutePriority = "P0" | "P1" | "P2" | "P3";
type RouteStatus = "visual" | "mockado" | "simulado";

export type AppRoute = {
  screen: AppScreen;
  path: string;
  label: string;
  group: RouteGroup;
  priority: RoutePriority;
  status: RouteStatus;
  backDependency: "nao imediata" | "sim" | "talvez";
  notes?: string;
};

export const APP_ROUTES = [
  { screen: "landing", path: "/", label: "Inicio", group: "public", priority: "P1", status: "visual", backDependency: "nao imediata" },
  { screen: "auth", path: "/login", label: "Login", group: "public", priority: "P0", status: "simulado", backDependency: "sim", notes: "Compartilha AuthScreen com /register." },
  { screen: "register", path: "/register", label: "Cadastro", group: "public", priority: "P0", status: "simulado", backDependency: "sim", notes: "Compartilha AuthScreen com /login." },
  { screen: "email-verify", path: "/verify-email", label: "Verificacao de e-mail", group: "public", priority: "P2", status: "simulado", backDependency: "sim" },
  { screen: "forgot-password", path: "/forgot-password", label: "Esqueci senha", group: "public", priority: "P3", status: "simulado", backDependency: "sim" },
  { screen: "reset-password", path: "/reset-password", label: "Redefinir senha", group: "public", priority: "P3", status: "simulado", backDependency: "sim" },
  { screen: "terms", path: "/terms", label: "Termos", group: "public", priority: "P2", status: "visual", backDependency: "talvez" },
  { screen: "privacy", path: "/privacy", label: "Privacidade", group: "public", priority: "P2", status: "visual", backDependency: "talvez" },

  { screen: "candidate-onboarding", path: "/candidate/onboarding", label: "Onboarding candidato", group: "candidate", priority: "P0", status: "simulado", backDependency: "sim" },
  { screen: "dashboard", path: "/candidate/dashboard", label: "Dashboard candidato", group: "candidate", priority: "P0", status: "mockado", backDependency: "sim" },
  { screen: "profile", path: "/candidate/profile", label: "Perfil", group: "candidate", priority: "P0", status: "mockado", backDependency: "sim" },
  { screen: "settings", path: "/candidate/settings", label: "Configuracoes", group: "candidate", priority: "P3", status: "simulado", backDependency: "sim" },
  { screen: "materials", path: "/candidate/materials", label: "Materiais", group: "candidate", priority: "P3", status: "mockado", backDependency: "talvez" },
  { screen: "notifications", path: "/candidate/notifications", label: "Notificacoes", group: "candidate", priority: "P3", status: "mockado", backDependency: "sim" },
  { screen: "interview-history", path: "/candidate/interviews", label: "Historico de entrevistas", group: "candidate", priority: "P2", status: "mockado", backDependency: "sim" },
  { screen: "development", path: "/candidate/development", label: "Desenvolvimento", group: "candidate", priority: "P1", status: "mockado", backDependency: "sim" },
  { screen: "disc-test", path: "/candidate/disc", label: "Teste DISC", group: "candidate", priority: "P2", status: "simulado", backDependency: "nao imediata", notes: "Funcionalidade independente com persistencia local temporaria." },
  { screen: "interview-setup", path: "/candidate/interviews/new", label: "Nova entrevista", group: "candidate", priority: "P0", status: "simulado", backDependency: "sim", notes: "Recebe a URL da vaga, analisa contexto mockado e prepara as perguntas." },
  { screen: "consent", path: "/candidate/interviews/new/consent", label: "Consentimento", group: "candidate", priority: "P0", status: "simulado", backDependency: "sim" },
  { screen: "prep", path: "/candidate/interviews/new/preparation", label: "Orientacoes", group: "candidate", priority: "P0", status: "visual", backDependency: "nao imediata" },
  { screen: "interview", path: "/candidate/interviews/new/answers", label: "Perguntas e respostas", group: "candidate", priority: "P0", status: "simulado", backDependency: "sim" },
  { screen: "review", path: "/candidate/interviews/new/review", label: "Revisao", group: "candidate", priority: "P0", status: "simulado", backDependency: "sim" },
  { screen: "interview-confirm", path: "/candidate/interviews/new/submit", label: "Confirmar envio", group: "candidate", priority: "P0", status: "simulado", backDependency: "sim" },
  { screen: "interview-done", path: "/candidate/interviews/:id/success", label: "Entrevista concluida", group: "candidate", priority: "P0", status: "simulado", backDependency: "sim" },
  { screen: "pending", path: "/candidate/interviews/:id/status", label: "Aguardando avaliacao", group: "candidate", priority: "P0", status: "mockado", backDependency: "sim" },
  { screen: "report", path: "/candidate/reports/:id", label: "Relatorio", group: "candidate", priority: "P0", status: "mockado", backDependency: "sim" },

  { screen: "eval-activate", path: "/evaluator/activate", label: "Ativacao avaliador", group: "evaluator", priority: "P1", status: "simulado", backDependency: "sim" },
  { screen: "eval-onboarding", path: "/evaluator/onboarding", label: "Onboarding avaliador", group: "evaluator", priority: "P1", status: "simulado", backDependency: "sim" },
  { screen: "eval-dashboard", path: "/evaluator/dashboard", label: "Dashboard avaliador", group: "evaluator", priority: "P0", status: "mockado", backDependency: "sim" },
  { screen: "eval-queue", path: "/evaluator/evaluations", label: "Fila de avaliacoes", group: "evaluator", priority: "P0", status: "mockado", backDependency: "sim" },
  { screen: "eval-active", path: "/evaluator/evaluations/active", label: "Em andamento", group: "evaluator", priority: "P2", status: "mockado", backDependency: "sim" },
  { screen: "eval-screen", path: "/evaluator/evaluations/:id", label: "Tela de avaliacao", group: "evaluator", priority: "P0", status: "simulado", backDependency: "sim" },
  { screen: "eval-review", path: "/evaluator/evaluations/:id/review", label: "Revisao de avaliacao", group: "evaluator", priority: "P0", status: "simulado", backDependency: "sim" },
  { screen: "eval-done", path: "/evaluator/evaluations/:id/success", label: "Avaliacao enviada", group: "evaluator", priority: "P0", status: "simulado", backDependency: "sim" },
  { screen: "eval-history", path: "/evaluator/history", label: "Historico avaliador", group: "evaluator", priority: "P3", status: "mockado", backDependency: "sim" },
  { screen: "eval-criteria", path: "/evaluator/criteria", label: "Criterios avaliador", group: "evaluator", priority: "P2", status: "mockado", backDependency: "sim" },
  { screen: "eval-settings", path: "/evaluator/settings", label: "Configuracoes avaliador", group: "evaluator", priority: "P3", status: "simulado", backDependency: "sim" },

  { screen: "admin-onboarding", path: "/admin/onboarding", label: "Onboarding admin", group: "admin", priority: "P2", status: "simulado", backDependency: "sim" },
  { screen: "admin-dashboard", path: "/admin/dashboard", label: "Dashboard admin", group: "admin", priority: "P0", status: "mockado", backDependency: "sim" },
  { screen: "admin-candidates", path: "/admin/candidates", label: "Candidatos", group: "admin", priority: "P2", status: "mockado", backDependency: "sim" },
  { screen: "admin-candidate-detail", path: "/admin/candidates/:id", label: "Detalhe candidato", group: "admin", priority: "P2", status: "mockado", backDependency: "sim" },
  { screen: "admin-evaluators", path: "/admin/evaluators", label: "Avaliadores", group: "admin", priority: "P0", status: "mockado", backDependency: "sim" },
  { screen: "admin-evaluator-form", path: "/admin/evaluators/new", label: "Formulario avaliador", group: "admin", priority: "P1", status: "simulado", backDependency: "sim" },
  { screen: "admin-interviews", path: "/admin/interviews", label: "Entrevistas", group: "admin", priority: "P0", status: "mockado", backDependency: "sim" },
  { screen: "admin-assign", path: "/admin/assignments", label: "Atribuicoes", group: "admin", priority: "P0", status: "simulado", backDependency: "sim" },
  { screen: "admin-questions", path: "/admin/questions", label: "Perguntas", group: "admin", priority: "P1", status: "mockado", backDependency: "sim" },
  { screen: "admin-question-form", path: "/admin/questions/new", label: "Formulario pergunta", group: "admin", priority: "P3", status: "simulado", backDependency: "sim" },
  { screen: "admin-roles", path: "/admin/roles", label: "Cargos e areas", group: "admin", priority: "P3", status: "mockado", backDependency: "sim" },
  { screen: "admin-criteria", path: "/admin/criteria", label: "Criterios admin", group: "admin", priority: "P1", status: "mockado", backDependency: "sim" },
  { screen: "admin-consent", path: "/admin/consents", label: "Consentimentos", group: "admin", priority: "P3", status: "mockado", backDependency: "sim" },
  { screen: "admin-audit", path: "/admin/audit", label: "Auditoria", group: "admin", priority: "P3", status: "mockado", backDependency: "sim" },
  { screen: "admin-settings", path: "/admin/settings", label: "Configuracoes admin", group: "admin", priority: "P3", status: "simulado", backDependency: "sim" },
] satisfies AppRoute[];

export const DEFAULT_ROUTE_PARAMS: Partial<Record<AppScreen, string>> = {
  "interview-done": "interview-demo",
  pending: "interview-demo",
  report: "report-demo",
  "eval-screen": "evaluation-demo",
  "eval-review": "evaluation-demo",
  "eval-done": "evaluation-demo",
  "admin-candidate-detail": "candidate-demo",
};

export function getPathForScreen(screen: AppScreen) {
  const route = APP_ROUTES.find((item) => item.screen === screen);
  if (!route) return "/";

  return route.path.replace(/:id/g, DEFAULT_ROUTE_PARAMS[screen] ?? "demo");
}
