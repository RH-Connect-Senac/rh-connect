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
const VIEW = code(read("domain/candidate-dashboard-view.ts"));
const HOOK = code(read("hooks/use-candidate-interview-history.ts"));

describe("Dashboard real (6A.5): fonte de dados", () => {
  it("localiza a tela", () => {
    expect(START).toBeGreaterThan(0);
    expect(END).toBeGreaterThan(START);
  });

  it("lê as entrevistas por GET /interviews (listRealInterviewHistory), via hook, uma vez", () => {
    expect(DASHBOARD).toContain("useCandidateInterviewHistory()");
    expect(APP_TSX.match(/useCandidateInterviewHistory\(\)/g)).toHaveLength(1);
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
    expect(DASHBOARD).toContain("Carregando suas entrevistas...");
    expect(DASHBOARD).toContain("describeDashboardInterviewsFailure(");
    expect(DASHBOARD).toContain("reloadInterviewsHistory()");
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
    expect(DASHBOARD).toContain("useDashboardInterviewsSync(inProgress.refresh)");
    expect(DASHBOARD).toContain("resolveNewInterviewGate(inProgressEntries)");
    expect(DASHBOARD).toContain("resolveDashboardInterviewAccess(newInterviewGate)");
  });
});

describe("Dashboard real (6A.5): sem polling novo", () => {
  it("o hook e o módulo novos não têm timers, listeners, backoff nem refresh silencioso", () => {
    for (const source of [VIEW, HOOK]) {
      expect(source).not.toMatch(/setInterval|setTimeout|visibilitychange|addEventListener|"focus"|"online"|"offline"|backoff|silent|refresh/i);
    }
  });

  it("o Dashboard continua com um único uso do sync existente e nenhum novo para o histórico", () => {
    expect(APP_TSX.match(/useDashboardInterviewsSync\(/g)).toHaveLength(1);
    expect(DASHBOARD).not.toMatch(/useDashboardInterviewsSync\(interviewsHistory/);
  });
});
