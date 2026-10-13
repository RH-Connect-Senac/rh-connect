import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Fase 7A.1: guardas de código-fonte da Gestão de Entrevistas real do Admin.
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
const LIST_SCREEN = sliceFrom("export function AdminInterviewsScreen", "export function AdminAssignScreen");
const DETAIL_SCREEN = sliceFrom("export function AdminCandidateDetailScreen", "export function AdminEvaluatorFormScreen");
const HOOK = sliceFrom("function useAdminInterviews", "function useAdminDashboard");
const FORBIDDEN = /rhconnect:interviews:v1|getAdminVisibleInterviews|mocks\/interviews|\/interviews-service"|localStorage|sessionStorage/;

describe("Gestão de Entrevistas real (7A.1): fonte dos dados", () => {
  it("as duas telas não dependem de mock nem de storage", () => {
    expect(LIST_SCREEN).not.toMatch(FORBIDDEN);
    expect(DETAIL_SCREEN).not.toMatch(FORBIDDEN);
    expect(HOOK).not.toMatch(FORBIDDEN);
    expect(SCREENS).not.toMatch(/getAdminVisibleInterviews|rhconnect:interviews:v1|mocks\/interviews/);
  });

  it("o hook usa o service real e não tem fallback nem polling", () => {
    expect(HOOK).toContain("listAdminInterviews(");
    expect(HOOK).not.toMatch(/setInterval|visibilitychange|attachCandidateLiveSync|useCandidateLiveResource|addEventListener/);
    const service = code(read("services/admin-interviews-service.ts"));
    expect(service).toContain('"/admin/interviews"');
    expect(service).toContain("requestAdminApi");
    expect(service).toContain("candidateId");
  });

  it("lista: erro amigável, tentar novamente, vazio e sem Exportar", () => {
    expect(LIST_SCREEN).toContain("Tentar novamente");
    expect(LIST_SCREEN).toContain("ADMIN_INTERVIEWS_LOAD_ERROR_MESSAGE");
    expect(LIST_SCREEN).toContain("ADMIN_INTERVIEWS_EMPTY_MESSAGE");
    expect(LIST_SCREEN).not.toMatch(/Exportar|Download|este mês/);
    expect(LIST_SCREEN).toContain("summarizeAdminInterviews");
    expect(LIST_SCREEN).toContain("filterAdminInterviews");
  });

  it("detalhe: entrevistas do candidato via candidateId e seleção segura", () => {
    expect(DETAIL_SCREEN).toContain("useAdminInterviews(");
    expect(DETAIL_SCREEN).toContain("candidateId: candidateIdParam");
    expect(DETAIL_SCREEN).toContain("skip: true");
    expect(DETAIL_SCREEN).toContain("pickCandidateInterview");
    expect(DETAIL_SCREEN).toContain("buildCandidateTimeline");
    expect(DETAIL_SCREEN).not.toMatch(/#E-0|criteriaScores|strengths|summary/);
  });

  it("o domínio não acessa storage nem rede", () => {
    const view = code(read("domain/admin-interviews-view.ts"));
    expect(view).not.toMatch(/localStorage|sessionStorage|fetch\(|requestAdminApi/);
  });
});
