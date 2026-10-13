import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Fase 4.3B: guardas de código-fonte do Dashboard Admin real.
const read = (relative: string) => readFileSync(resolve(__dirname, "..", relative), "utf8");
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const SCREENS = code(read("components/admin-screens.tsx"));
const sliceFrom = (from: string, to: string) => {
  const start = SCREENS.indexOf(from);
  const end = SCREENS.indexOf(to, start + from.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return SCREENS.slice(start, end);
};
const DASHBOARD = sliceFrom("export function AdminDashboardScreen", "export function AdminCandidatesScreen");
const BLOCK = sliceFrom("type DashboardChartPeriod", "export function AdminCandidatesScreen");

describe("Dashboard Admin real (4.3B): fonte dos dados", () => {
  it("usa o service real via recurso vivo e o endpoint único", () => {
    expect(BLOCK).toContain("useCandidateLiveResource<AdminDashboardSnapshot>");
    expect(BLOCK).toContain("getAdminDashboard()");
    expect(BLOCK).toContain("ADMIN_DASHBOARD_SYNC_INTERVAL_MS");
    expect(BLOCK).toContain("ADMIN_DASHBOARD_SYNC_MAX_BACKOFF_MS");
    const service = code(read("services/admin-dashboard-service.ts"));
    expect(service).toContain('requestAdminApi("/admin/dashboard"');
    expect(service).not.toMatch(/fetch\(/);
  });

  it("sem mocks, storage ou cálculo local no Dashboard", () => {
    expect(BLOCK).not.toMatch(/EVALUATORS\b|getAdminVisibleInterviews|getPendingAdminInterviews|createAdminInterviewRows|getAverageScore|buildMonthlyInterviewData/);
    expect(BLOCK).not.toMatch(/localStorage|sessionStorage|"Sistema"/);
    expect(BLOCK).not.toMatch(/useAdminCandidatesList|new Date\(\)/);
    expect(SCREENS).not.toMatch(/const EVALUATORS\b|MONTH_SHORT_LABELS|getPendingAdminInterviews/);
  });

  it("não cria timers/listeners próprios", () => {
    expect(BLOCK).not.toMatch(/setInterval|visibilitychange|attachInterviewSyncPolling|attachCandidateLiveSync|addEventListener/);
  });
});

describe("Dashboard Admin real (4.3B): UI", () => {
  it("cards com os rótulos novos", () => {
    expect(DASHBOARD).toContain('label="Candidatos cadastrados"');
    expect(DASHBOARD).toContain('label="Avaliadores ativos"');
    expect(DASHBOARD).toContain('label="Aguardando atribuição"');
    expect(DASHBOARD).toContain('label="Pontuação média"');
    expect(DASHBOARD).not.toContain("Avaliações pendentes");
    expect(DASHBOARD).toContain("formatDashboardScore(summary.averageScore)");
  });

  it("loading mostra '—' (nunca 0) e erro tem 'Tentar novamente'", () => {
    expect(DASHBOARD).toContain('summary ? summary.candidateCount : "—"');
    expect(DASHBOARD).toContain("Tentar novamente");
    expect(DASHBOARD).toContain("onClick={reload}");
    expect(DASHBOARD).toContain('state.status === "error"');
  });

  it("ações rápidas: sem 'Adicionar pergunta' e sem 'logs de auditoria'; badges vêm do summary", () => {
    expect(DASHBOARD).not.toMatch(/admin-question-form|admin-audit|Adicionar pergunta|logs de auditoria/);
    expect(DASHBOARD).toContain('label: "Atribuir entrevistas"');
    expect(DASHBOARD).not.toContain("Atribuir avaliações pendentes");
    expect(DASHBOARD).toContain('"admin-assign"');
    expect(DASHBOARD).toContain('"admin-candidates"');
    expect(DASHBOARD).toContain('"admin-evaluators"');
    expect(DASHBOARD).toContain("summary.pendingAssignmentCount");
  });

  it("gráfico usa interviewsByMonth e mantém o toggle 6/12 meses", () => {
    expect(DASHBOARD).toContain("interviewsByMonth");
    expect(BLOCK).toContain("buildChartData(interviewsByMonth, period)");
    expect(BLOCK).toContain('"6 meses"');
    expect(BLOCK).toContain('"12 meses"');
  });

  it("atividade usa describeActivity(recentActivity)", () => {
    expect(DASHBOARD).toContain("dashboard.recentActivity.map(describeActivity)");
  });

  it("header global, SENAC-DF e notificações não foram tocados", () => {
    expect(SCREENS).toContain("SENAC-DF");
    expect(SCREENS).toContain("ADMIN_NOTIFS");
  });
});
