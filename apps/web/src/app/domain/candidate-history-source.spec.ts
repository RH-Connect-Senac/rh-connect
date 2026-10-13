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
const START = APP_TSX.indexOf("function InterviewHistoryScreen(");
const END = APP_TSX.indexOf("function ContextInfoRow(");
const HISTORY = APP_TSX.slice(START, END);
const VIEW = code(read("domain/candidate-history-view.ts"));
const SERVICE = code(read("services/candidate-interviews-service.ts"));

describe("Histórico real (6A.4): fonte de dados", () => {
  it("localiza a tela", () => {
    expect(START).toBeGreaterThan(0);
    expect(END).toBeGreaterThan(START);
  });

  it("lê o histórico pelo serviço real (GET /interviews), uma única chamada", () => {
    expect(HISTORY).toContain("listRealInterviewHistory()");
    expect(HISTORY.match(/listRealInterviewHistory\(/g)).toHaveLength(1);
    expect(SERVICE).toMatch(/request\("\/interviews", \{ method: "GET" \}\)/);
  });

  it("não usa mocks, candidateId artificial, relatório/avaliação mock nem storage como fonte", () => {
    expect(HISTORY).not.toMatch(/getCandidateInterviews|getAvailableCandidateReports|getInterviewById|getReportByInterviewId|getEvaluationByInterviewId|statusLabelFromInterview|interviews-service|mocks\//);
    expect(HISTORY).not.toMatch(/getCandidateIdentity|candidateId|session\b|activeDraftEntry|StoredInterviewDraft/);
    expect(HISTORY).not.toMatch(/localStorage|sessionStorage/);
    expect(VIEW).not.toMatch(/localStorage|sessionStorage|fetch\(/);
  });

  it("não monta a lista com /result, N+1 por entrevista nem Python/Groq", () => {
    expect(HISTORY).not.toMatch(/getRealInterviewResult|getRealInterview\(|getRealQuestions|\/result\b|groq|python|interview-ai/i);
    expect(HISTORY).not.toMatch(/\.map\([^)]*(getRealInterview|listRealInterviewHistory)/);
  });

  it("não implementa polling nem refresh automático (6A.6)", () => {
    expect(HISTORY).not.toMatch(/setInterval|setTimeout|visibilitychange|addEventListener|"focus"|"online"|"offline"|backoff/);
  });

  it("não recalcula nota: usa o formatador de apresentação do domínio", () => {
    expect(VIEW).toContain("item.overallScore");
    expect(VIEW).not.toMatch(/reduce\(|Math\.round|\/ *item\.questionCount|criteriaScores/);
  });
});

describe("Histórico real (6A.4): sem 'Praticar novamente'", () => {
  it("nem a tela nem o domínio têm o botão, a ação ou navegação para nova entrevista", () => {
    // O CTA do ESTADO VAZIO (lista sem nenhuma entrevista) é outro elemento e não faz parte dos cards.
    const cards = HISTORY.slice(HISTORY.indexOf("filtered.map("));
    expect(cards).not.toMatch(/Praticar novamente|"practice"|interview-setup|Nova entrevista/);
    expect(HISTORY).not.toMatch(/Praticar novamente|"practice"/);
    expect(VIEW).not.toMatch(/Praticar novamente|"practice"|Nova entrevista/);
  });
});

describe("Histórico real (6A.4): CANCELLED oculta só na UI", () => {
  it("a tela usa a lista visível (sem CANCELLED) para lista, contagens e estado vazio", () => {
    expect(HISTORY).toContain("visibleHistoryItems(loadState.history.interviews)");
    expect(HISTORY).not.toMatch(/Canceladas|CANCELLED|"cancelled"/);
    expect(HISTORY.match(/visibleHistoryItems\(/g)?.length).toBe(2);
  });

  it("o filtro vive no domínio; o serviço continua aceitando CANCELLED e chamando GET /interviews uma vez", () => {
    expect(VIEW).toContain("visibleHistoryItems");
    expect(VIEW).not.toMatch(/label: "Canceladas"/);
    expect(SERVICE).toContain('"CANCELLED"');
    expect(HISTORY.match(/listRealInterviewHistory\(/g)).toHaveLength(1);
    expect(HISTORY).not.toMatch(/\?status=|cancelled=|CANCELLED/);
  });
});

describe("Histórico real (6A.4): estados e navegação", () => {
  it("tem loading, erro com retry e estado vazio próprios", () => {
    expect(HISTORY).toContain('status: "loading"');
    expect(HISTORY).toContain("Carregando o seu histórico de entrevistas...");
    expect(HISTORY).toContain("Tentar novamente");
    expect(HISTORY).toContain("HISTORY_EMPTY_VIEW");
    expect(VIEW).toContain("Você ainda não realizou entrevistas.");
  });

  it("o estado vazio só aparece com a lista carregada (nunca durante o loading)", () => {
    const loadingIdx = HISTORY.indexOf('loadState.status === "loading"');
    const emptyIdx = HISTORY.indexOf("visibleHistoryItems(loadState.history.interviews).length === 0");
    expect(loadingIdx).toBeGreaterThan(-1);
    expect(emptyIdx).toBeGreaterThan(loadingIdx);
  });

  it("usa as rotas reais: continuar via resume existente; /status; /reports", () => {
    expect(HISTORY).toContain("onResumeInterview(id)");
    expect(VIEW).toContain("`/candidate/interviews/${id}/status`");
    expect(VIEW).toContain("`/candidate/reports/${id}`");
    expect(VIEW).toContain("item.resultAvailable");
  });

  it("a rota do Histórico passa o resume real e não depende mais de sessão/rascunho local", () => {
    const route = read("App.tsx").split("\n").find((line) => line.includes('path="/candidate/interviews"')) ?? "";
    expect(route).toContain("<InterviewHistoryScreen onNavigate={navigate} onResumeInterview={resumeInterviewFromServer} />");
    expect(APP_ROUTES.some((entry) => entry.path === "/candidate/interviews")).toBe(true);
  });

  it("não cria rotas paralelas para o Histórico", () => {
    expect(APP_ROUTES.filter((entry) => entry.path.startsWith("/candidate/interviews") && entry.screen.includes("history"))).toHaveLength(1);
  });
});
