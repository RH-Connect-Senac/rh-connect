import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "../router/routes";

const APP = join(__dirname, "..");
const read = (relative: string) => readFileSync(join(APP, relative), "utf8");

// Remove comentários para testar só o código executável.
function code(source: string) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const APP_TSX = code(read("App.tsx"));
const START = APP_TSX.indexOf("function ReportScreen(");
const END = APP_TSX.indexOf("function InterviewHistoryScreen(");
const REPORT = APP_TSX.slice(START, END);
const VIEW = code(read("domain/candidate-report-view.ts"));

describe("ReportScreen real (6A.3): fonte de dados", () => {
  it("localiza a tela", () => {
    expect(START).toBeGreaterThan(0);
    expect(END).toBeGreaterThan(START);
  });

  it("lê pelo serviço real (GET /interviews/:id/result) e valida o id como UUID", () => {
    expect(REPORT).toContain("getRealInterviewResult(id)");
    expect(REPORT).toContain("isUuid(id)");
  });

  it("não usa mock de relatório/entrevista, candidateId artificial nem storage", () => {
    expect(REPORT).not.toMatch(/getReportByInterviewId|getEvaluationByInterviewId|getInterviewById|getAvailableCandidateReports|getAverageScore|interviews-service|mocks\//);
    expect(REPORT).not.toMatch(/getCandidateIdentity|candidateId|session\b/);
    expect(REPORT).not.toMatch(/localStorage|sessionStorage/);
    expect(VIEW).not.toMatch(/localStorage|sessionStorage|fetch\(/);
  });

  it("não recalcula a nota no cliente: usa overallScore do Back", () => {
    expect(REPORT).toContain("view.overallScore");
    expect(REPORT).not.toMatch(/reduce\(|computedAverage|\/ radarData\.length|\.length\s*\)\s*\*/);
    expect(VIEW).not.toMatch(/reduce\(|\/\s*criteria\.length|Math\.round/);
  });

  it("não inventa nota/justificativa por pergunta nem blocos que o Back não entrega", () => {
    expect(REPORT).not.toMatch(/strengths|improvements|recommendations|Pontos fortes|Oportunidades de melhoria/);
    expect(REPORT).not.toMatch(/question\.(score|comment|feedback|justification)/);
  });

  it("não chama Python/Groq, não implementa IA nem polling", () => {
    expect(REPORT).not.toMatch(/groq|python|interview-ai/i);
    expect(REPORT).not.toMatch(/setInterval|setTimeout|visibilitychange|addEventListener|useInterviewSyncPolling/);
    expect(REPORT).toContain("isSupportedReportResult(");
  });

  it("tem loading real antes de qualquer 'não encontrado' e erro com retry", () => {
    const loading = REPORT.indexOf('loadState.status === "loading"');
    const error = REPORT.indexOf('loadState.status === "error"');
    expect(loading).toBeGreaterThan(-1);
    expect(error).toBeGreaterThan(loading);
    expect(REPORT).toContain("Carregando o relatório");
    expect(REPORT).toContain("setReloadKey");
  });

  it("409 volta ao acompanhamento real; sem exportação fake de PDF", () => {
    expect(REPORT).toContain("`/candidate/interviews/${id}/status`");
    expect(REPORT).not.toMatch(/PDF gerado|Exportar PDF/);
  });

  it("não exibe texto técnico cru", () => {
    expect(REPORT).not.toMatch(/Failed to fetch|Prisma|stack/i);
  });
});

describe("ReportScreen real (R6): materiais recomendados", () => {
  const SECTION = code(read("components/materials/recommended-materials-section.tsx"));
  const MATERIALS_VIEW = code(read("domain/candidate-report-materials-view.ts"));
  const CARD = code(read("components/materials/editorial-material-card.tsx"));

  it("renderiza a seção a partir de view.materials, depois dos dados da entrevista e antes das perguntas", () => {
    const details = REPORT.indexOf("Sobre a entrevista");
    const section = REPORT.indexOf("<RecommendedMaterialsSection");
    const questions = REPORT.indexOf("Perguntas e respostas");
    expect(section).toBeGreaterThan(details);
    expect(questions).toBeGreaterThan(section);
    expect(REPORT).toContain("view={view.materials}");
  });

  it("navega por rota interna do router (sem window.open nem location)", () => {
    expect(REPORT).toContain("routerNavigate(path, { state: { from: location.pathname } })");
    expect(REPORT).not.toMatch(/window\.(open|location)/);
  });

  it("view model e seção são puros: sem rede, storage, IA ou rota por suposição", () => {
    for (const source of [SECTION, MATERIALS_VIEW]) {
      expect(source).not.toMatch(/localStorage|sessionStorage|fetch\(|groq|python|interview-ai|window\.open/i);
    }
    expect(MATERIALS_VIEW).toContain("/candidate/materials");
  });

  it("link externo usa nova aba protegida", () => {
    expect(CARD).toContain('target="_blank"');
    expect(CARD).toContain('rel="noopener noreferrer"');
  });

  const DETAIL_START = APP_TSX.indexOf("function MaterialDetailScreen(");
  const DETAIL = APP_TSX.slice(DETAIL_START, APP_TSX.indexOf("function NotificationsScreen(", DETAIL_START));
  const LIST_START = APP_TSX.indexOf("function MaterialsScreen(");
  const LIST = APP_TSX.slice(LIST_START, DETAIL_START);

  it("B/C. o resultado envia o relatório exato (pathname) como origem ao abrir o material", () => {
    expect(REPORT).toContain("<RecommendedMaterialsSection");
    expect(REPORT).toContain("state: { from: location.pathname }");
  });

  it("o detalhe resolve a origem por função validada (sem navigate(-1) nem destino cru do state)", () => {
    expect(DETAIL_START).toBeGreaterThan(0);
    expect(DETAIL).toContain("resolveMaterialDetailOrigin(");
    expect(DETAIL).toContain("routerNavigate(backOrigin.path)");
    expect(DETAIL).toContain("{backOrigin.label}");
    expect(DETAIL).not.toMatch(/navigate\(-1\)|history\.back|routerNavigate\(location\.state|routerNavigate\(from/);
    expect(APP_TSX).not.toMatch(/navigate\(-1\)/);
  });

  it("A/F. a entrada por Materiais e os cards Cachola/Orango continuam como estavam", () => {
    expect(LIST).toContain("routerNavigate(`/candidate/materials/${material.slug}`)");
    expect(LIST).toContain("openExternalResource(");
    expect(code(read("components/materials/editorial-material-card.tsx"))).toContain('rel="noopener noreferrer"');
  });

  it("G. rota de detalhe e relatório inalteradas", () => {
    expect(APP_TSX).toContain('path="/candidate/materials/:materialId"');
    expect(APP_ROUTES.find((route) => route.screen === "report")?.path).toBe("/candidate/reports/:id");
  });

  it("nenhuma rota nova foi criada para os materiais recomendados", () => {
    expect(APP_ROUTES.map((route) => route.path).filter((path) => /recommend|recomend/i.test(path))).toEqual([]);
  });
});

describe("rotas e navegação preservadas", () => {
  it("a rota do relatório continua /candidate/reports/:id e a ReportScreen não recebe mais sessão", () => {
    expect(APP_ROUTES.find((route) => route.screen === "report")?.path).toBe("/candidate/reports/:id");
    expect(APP_TSX).toMatch(/path="\/candidate\/reports\/:id" element=\{protect\("CANDIDATE", <ReportScreen onNavigate=\{navigate\} \/>\)\}/);
  });

  it("o CTA 'Ver resultado' da PendingScreen continua levando ao relatório", () => {
    expect(APP_TSX).toContain("`/candidate/reports/${interview.id}`");
  });
});
