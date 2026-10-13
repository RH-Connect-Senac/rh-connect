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
const START = APP_TSX.indexOf("function PendingScreen(");
const END = APP_TSX.indexOf("function ReportScreen(");
const PENDING = APP_TSX.slice(START, END);
const VIEW = code(read("domain/interview-tracking-view.ts"));

describe("PendingScreen real (6A.2): fonte de dados", () => {
  it("localiza a tela", () => {
    expect(START).toBeGreaterThan(0);
    expect(END).toBeGreaterThan(START);
  });

  it("lê a Interview pelo serviço real (GET /interviews/:id) e valida o id como UUID", () => {
    expect(PENDING).toContain("getRealInterview(id)");
    expect(PENDING).toContain("isUuid(id)");
  });

  it("não usa mock de entrevistas, relatório mock, candidateId artificial nem storage", () => {
    expect(PENDING).not.toMatch(/getInterviewById|getReportByInterviewId|getEvaluationByInterviewId|getCandidateInterviews|interviews-service|mocks\//);
    expect(PENDING).not.toMatch(/getCandidateIdentity|candidateId|session\b/);
    expect(PENDING).not.toMatch(/localStorage|sessionStorage/);
  });

  it("não chama o endpoint de resultado nem Python/Groq: o resultado é só um link para o relatório", () => {
    expect(PENDING).not.toMatch(/\/result\b|getRealQuestions|submitRealInterview|cancelRealInterview|groq|python|interview-ai/i);
    expect(PENDING).toContain("/candidate/reports/${interview.id}");
  });

  it("não implementa polling nem listeners de atualização", () => {
    expect(PENDING).not.toMatch(/setInterval|setTimeout|visibilitychange|addEventListener|useInterviewSyncPolling|useDashboardInterviewsSync/);
    expect(VIEW).not.toMatch(/setInterval|setTimeout|fetch\(|localStorage/);
  });

  it("tem loading real, erro com retry e usa o módulo puro de visão", () => {
    expect(PENDING).toContain('status: "loading"');
    expect(PENDING).toContain("Carregando o acompanhamento");
    expect(PENDING).toContain("describeTrackingFailure(");
    expect(PENDING).toContain("buildTrackingView(");
    expect(PENDING).toContain("setReloadKey");
  });

  it("IN_PROGRESS retoma pelo caminho já existente (resumeInterviewFromServer)", () => {
    expect(PENDING).toContain("onResumeInterview(interview.id)");
    expect(APP_TSX).toMatch(/<PendingScreen [^>]*onResumeInterview=\{resumeInterviewFromServer\}/);
  });

  it("não exibe texto técnico cru", () => {
    expect(PENDING).not.toMatch(/Failed to fetch|Prisma|stack/i);
  });
});

describe("rotas preservadas", () => {
  it("status e relatório continuam nos mesmos caminhos", () => {
    expect(APP_ROUTES.find((route) => route.screen === "pending")?.path).toBe("/candidate/interviews/:id/status");
    expect(APP_ROUTES.find((route) => route.screen === "report")?.path).toBe("/candidate/reports/:id");
  });

  it("o pós-envio e o histórico continuam navegando para /status", () => {
    expect(APP_TSX).toContain("`/candidate/interviews/${interview.id}/status`");
    // Histórico real (6A.4): o destino de "Acompanhar" vive no módulo puro do Histórico.
    expect(readFileSync(join(APP, "domain/candidate-history-view.ts"), "utf8")).toContain("`/candidate/interviews/${id}/status`");
  });
});

// Trecho do handler de envio e da tela terminal legada.
const CONFIRM = APP_TSX.slice(APP_TSX.indexOf("function InterviewConfirmScreen("), APP_TSX.indexOf("function InterviewDoneScreen("));
const HANDLE_SEND = CONFIRM.slice(CONFIRM.indexOf("const handleSend = async"), CONFIRM.indexOf("return (", CONFIRM.indexOf("const handleSend = async")));
const DONE = APP_TSX.slice(APP_TSX.indexOf("function InterviewDoneScreen("), APP_TSX.indexOf("function EmailVerifyScreen("));

describe("submit HUMAN navega sozinho ao acompanhamento (6A.2)", () => {
  it("localiza o handler e a tela terminal", () => {
    expect(HANDLE_SEND).toContain("submitRealInterview(");
    expect(DONE).toContain("getRealInterview(id)");
  });

  it("decide o destino pelo que o backend devolveu (result.data), não pelo rascunho local", () => {
    expect(HANDLE_SEND).toContain("resolveSubmitDestination(result.data)");
    expect(HANDLE_SEND).toContain("`/candidate/interviews/${result.data.id}/status`");
  });

  it("só navega depois do POST: await, falha retorna antes e a navegação vem por último", () => {
    const submit = HANDLE_SEND.indexOf("await submitRealInterview(");
    const failureGuard = HANDLE_SEND.indexOf("if (!result.ok)");
    const navigate = HANDLE_SEND.indexOf("routerNavigate(");
    expect(submit).toBeGreaterThan(-1);
    expect(failureGuard).toBeGreaterThan(submit);
    expect(navigate).toBeGreaterThan(failureGuard);
    // toda saída do bloco de falha é return (nenhuma navegação dentro dele)
    const failureBlock = HANDLE_SEND.slice(failureGuard, navigate);
    expect(failureBlock).not.toContain("routerNavigate(");
    expect(failureBlock).toMatch(/toast\.error\(result\.message\);\s*return;/);
    // uma única navegação, e ela é a última coisa do handler
    expect(HANDLE_SEND.match(/routerNavigate\(/g)).toHaveLength(1);
  });

  it("sem timeout artificial, sem storage e sem depender do clique em 'Acompanhar'", () => {
    expect(HANDLE_SEND).not.toMatch(/setTimeout|setInterval|localStorage|sessionStorage/);
    expect(HANDLE_SEND).not.toContain("Acompanhar");
  });

  it("AI preserva o destino existente (/success), sem lógica nova de IA", () => {
    expect(HANDLE_SEND).toContain("`/candidate/interviews/${result.data.id}/success`");
    expect(HANDLE_SEND).not.toMatch(/groq|python|PENDING_AI_EVALUATION/i);
    expect(DONE).toContain("Aguardando avaliação por IA");
    expect(DONE).toContain("IA Avaliadora");
  });

  it("a tela terminal legada redireciona HUMAN para o acompanhamento (nem por link/reload fica nela)", () => {
    expect(DONE).toContain("resolveSubmitDestination(interview)");
    expect(DONE).toMatch(/<Navigate to=\{`\/candidate\/interviews\/\$\{interview\.id\}\/status`\} replace \/>/);
  });

  it("a rota /success continua existindo (consumidor válido: AI)", () => {
    expect(APP_TSX).toContain('path="/candidate/interviews/:id/success"');
  });
});

describe("aviso de 72h na PendingScreen (6A.2)", () => {
  it("é renderizado a partir do módulo de visão, sem copy duplicada na tela", () => {
    expect(PENDING).toContain("view.deadlineNotice");
    expect(PENDING).not.toMatch(/72 horas|72h/);
    expect((VIEW.match(/72 horas/g) ?? []).length).toBe(1);
  });

  it("sem contagem regressiva nem timer", () => {
    expect(PENDING).not.toMatch(/setInterval|setTimeout|Date\.now|countdown/i);
  });
});
