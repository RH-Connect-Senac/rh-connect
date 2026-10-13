import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP = join(__dirname, "..");
const read = (relative: string) => readFileSync(join(APP, relative), "utf8");

// Remove comentários para testar só o código executável.
function code(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const APP_TSX = code(read("App.tsx"));
const START = APP_TSX.indexOf("function DashboardScreen(");
const END = APP_TSX.indexOf("function ProfileField(");
const DASHBOARD = APP_TSX.slice(START, END);
const SKELETON = APP_TSX.slice(APP_TSX.indexOf("function RecentInterviewsSkeleton("), START);
const SHELL = APP_TSX.slice(APP_TSX.indexOf("function RecentInterviewShell("), APP_TSX.indexOf("function RecentInterviewsSkeleton("));
const VIEW = code(read("domain/candidate-dashboard-view.ts"));
const HOOK = code(read("hooks/use-candidate-interview-history.ts"));

describe("Dashboard real (6A.5): fonte de dados", () => {
  it("localiza a tela", () => {
    expect(START).toBeGreaterThan(0);
    expect(END).toBeGreaterThan(START);
  });

  it("lê as entrevistas por GET /interviews (listRealInterviewHistory), via hook, uma vez", () => {
    expect(DASHBOARD).toContain("useCandidateInterviewHistory({ autoSync: false })");
    expect(APP_TSX.match(/useCandidateInterviewHistory\(\{ autoSync: false \}\)/g)).toHaveLength(1);
    expect(HOOK).toContain("listRealInterviewHistory()");
    expect(HOOK.match(/listRealInterviewHistory\(/g)).toHaveLength(1);
  });

  it("não usa mock, relatório mock, candidateId artificial nem localStorage para entrevistas", () => {
    expect(DASHBOARD).not.toMatch(/getCandidateInterviews|getAvailableCandidateReports|getReportByInterviewId|getEvaluationByInterviewId|getAverageScore|statusLabelFromInterview|getInterviewById|interviews-service|mocks\//);
    expect(DASHBOARD).not.toMatch(/candidateInterviews|availableReports|activeDraftRecentItem|draft: true/);
    expect(APP_TSX).not.toMatch(/from "\.\/services\/interviews-service"/);
    for (const source of [VIEW, HOOK]) {
      expect(source).not.toMatch(/localStorage|sessionStorage|fetch\(|mocks\//);
    }
  });

  it("não chama /result, não faz N+1 e não toca Python/Groq", () => {
    for (const source of [DASHBOARD, VIEW, HOOK]) {
      expect(source).not.toMatch(/getRealInterviewResult|getRealInterview\(|getRealQuestions|\/result\b|groq|python|interview-ai/i);
    }
    expect(DASHBOARD).not.toMatch(/interviews\.map\([^)]*(getRealInterview|listRealInterviewHistory)/);
  });

  it("não recalcula nota: só o overallScore do Back (sem somas/médias/critérios)", () => {
    expect(VIEW).toContain("item.overallScore");
    expect(VIEW).not.toMatch(/reduce\(|criteriaScores|Math\.round/);
  });
});

describe("Dashboard real (6A.5): CANCELLED, estados e navegação", () => {
  it("CANCELLED é excluído pela regra única da 6A.4 (visibleHistoryItems)", () => {
    expect(VIEW).toContain("visibleHistoryItems");
    expect(VIEW).not.toMatch(/"CANCELLED"/);
    expect(DASHBOARD).not.toMatch(/CANCELLED|Cancelada/);
  });

  it("tem loading, erro localizado com retry e estado vazio próprios; métricas sem zero falso", () => {
    expect(DASHBOARD).toContain('interviewsHistory.state.status === "loading"');
    expect(SKELETON).toContain("Carregando suas entrevistas...");
    expect(DASHBOARD).toContain("describeDashboardInterviewsFailure(");
    expect(DASHBOARD).toContain("interviewsHistory.reload()");
    expect(DASHBOARD).toContain("DASHBOARD_RECENT_EMPTY");
    // enquanto carrega/erro, as métricas são "—" (nunca 0)
    expect(DASHBOARD).toContain('dashboardSummary ? dashboardSummary.total : "—"');
  });

  it("o carregamento vem antes do vazio (sem vazio/mock durante o fetch)", () => {
    const loading = DASHBOARD.indexOf('interviewsHistory.state.status === "loading"');
    const error = DASHBOARD.indexOf('interviewsHistory.state.status === "error"');
    const empty = DASHBOARD.indexOf("DASHBOARD_RECENT_EMPTY");
    expect(loading).toBeGreaterThan(-1);
    expect(error).toBeGreaterThan(loading);
    expect(empty).toBeGreaterThan(error);
  });

  it("IN_PROGRESS retoma pelo resume real; demais ações usam as rotas existentes; sem rotas novas", () => {
    expect(DASHBOARD).toContain('item.action.kind === "resume"');
    expect(DASHBOARD).toContain("void resumeInterview(item.id)");
    expect(DASHBOARD).toContain("dashboardActionPath(item.action, item.id)");
    expect(code(read("domain/candidate-history-view.ts"))).toContain("`/candidate/interviews/${id}/status`");
    expect(code(read("domain/candidate-history-view.ts"))).toContain("`/candidate/reports/${id}`");
  });

  it("não reintroduz 'Praticar novamente' nem 'Nova entrevista' como ação dos itens", () => {
    const recent = DASHBOARD.slice(DASHBOARD.indexOf("recentItems.map("));
    expect(recent.slice(0, recent.indexOf("DASHBOARD_RECENT_EMPTY"))).not.toMatch(/Praticar novamente|Nova entrevista|interview-setup/);
  });

  it("gate de IN_PROGRESS, resume e sync de in-progress seguem intactos (não alterados nesta fase)", () => {
    expect(DASHBOARD).toContain("useInProgressInterviews()");
    expect(DASHBOARD).toContain("useDashboardInterviewsSync(async () => {");
    expect(DASHBOARD).toContain("inProgress.refresh()");
    expect(DASHBOARD).toContain("resolveNewInterviewGate(inProgressEntries)");
    expect(DASHBOARD).toContain("resolveDashboardInterviewAccess(newInterviewGate)");
  });
});

describe("Dashboard real (6A.6): um único ciclo de sync", () => {
  it("o módulo de visão não tem timers nem listeners; o hook do histórico não cria polling no Dashboard", () => {
    expect(VIEW).not.toMatch(/setInterval|setTimeout|visibilitychange|addEventListener|"focus"|"online"|"offline"|backoff|refresh/i);
    expect(HOOK).not.toMatch(/setInterval|setTimeout|addEventListener|visibilitychange/);
    // Dashboard: autoSync desligado => sem poller próprio para GET /interviews
    expect(DASHBOARD).toContain("useCandidateInterviewHistory({ autoSync: false })");
  });

  it("o ciclo antigo (15 s) atualiza as duas fontes juntas: um único uso, sem poller duplicado", () => {
    expect(APP_TSX.match(/useDashboardInterviewsSync\(/g)).toHaveLength(1);
    const cycle = DASHBOARD.slice(DASHBOARD.indexOf("useDashboardInterviewsSync(async () => {"));
    expect(cycle.slice(0, cycle.indexOf("});"))).toContain("Promise.all([inProgress.refresh(), refreshInterviewsHistory()])");
    expect(cycle.slice(0, cycle.indexOf("});"))).toContain('history === "stop"');
  });
});

describe("Dashboard real (6A.6): loading de 'Entrevistas recentes' sem layout shift", () => {
  it("o loading usa o skeleton estrutural (não um spinner baixo)", () => {
    expect(SKELETON.length).toBeGreaterThan(0);
    const loadingBranch = DASHBOARD.slice(DASHBOARD.indexOf('interviewsHistory.state.status === "loading"'), DASHBOARD.indexOf('interviewsHistory.state.status === "error"'));
    expect(loadingBranch).toContain("<RecentInterviewsSkeleton />");
    expect(loadingBranch).not.toContain("<Spinner");
  });

  it("o skeleton espelha até 3 cards reais; no desktop mostra os 3, abaixo de lg só o primeiro", () => {
    expect(SKELETON).toContain("[0, 1, 2].map(");
    expect(SKELETON).toContain('index > 0 ? "hidden lg:block" : ""');
    // mesma casca do card real: um único componente usado pelo item real e pelo skeleton
    expect(SKELETON).toContain("<RecentInterviewShell");
    expect(DASHBOARD).toContain("<RecentInterviewShell");
    expect(SHELL).toContain("p-3 sm:p-4 bg-muted/50 rounded-xl");
    expect(DASHBOARD).not.toContain("p-3 sm:p-4 bg-muted/50 rounded-xl");
    expect(DASHBOARD).toContain("recentItems.map(");
  });

  it("acessível e sem animação nova nem timers", () => {
    expect(SKELETON).toContain('role="status"');
    expect(SKELETON).toContain('aria-busy="true"');
    expect(SKELETON).not.toMatch(/animate-|setTimeout|opacity-0|invisible/);
  });

  it("a altura vem da coluna recentes (stretch + flex-1); o card azul não ganha altura fixa", () => {
    const grid = DASHBOARD.slice(DASHBOARD.indexOf("lg:grid-cols-3 gap-5 mb-6 items-stretch"), DASHBOARD.indexOf("Quick links"));
    expect(grid).toContain("items-stretch");
    expect(grid).toContain("flex-1 rounded-2xl");
    expect(grid).toContain('data-testid="new-interview-card"');
    // só os dois contêineres do card (o ícone interno w-10 h-10 não conta)
    const blue = grid.slice(0, grid.indexOf("<MessageSquare")).replace(/w-10 h-10/g, "");
    expect(blue).not.toMatch(/\b(?:min-h|h)-\[|\bmin-h-\d|\bh-\d|style=\{\{[^}]*height/);
    // abaixo de lg: uma coluna, altura natural
    expect(DASHBOARD).toContain("grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6 items-stretch");
  });

  it("primeiro render: o hook nasce em loading (sem estado idle) e o skeleton está no ramo de loading", () => {
    const resource = code(read("hooks/use-candidate-live-resource.ts"));
    expect(resource).toContain('useState<LiveState<T>>({ status: "loading" })');
    expect(resource).not.toMatch(/"idle"/);
    expect(HOOK).not.toMatch(/"idle"/);
    // o effect não troca o loading inicial por outro objeto (sem render extra)
    expect(resource).toContain('prev.status === "loading" ? prev');
    // o ramo de loading é o primeiro da cadeia: nunca há frame com a coluna vazia/curta
    const chain = DASHBOARD.slice(DASHBOARD.indexOf("{interviewsHistory.state.status"));
    expect(chain.startsWith('{interviewsHistory.state.status === "loading" ? (')).toBe(true);
    expect(code(read("domain/candidate-live-sync.ts"))).toContain('private state: LiveState<T> = { status: "loading" }');
  });
});
