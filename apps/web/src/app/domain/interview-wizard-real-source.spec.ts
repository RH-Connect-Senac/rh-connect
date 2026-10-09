import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guarda de código-fonte (Fase 2B): o wizard do candidato usa a API real e não
// volta a tratar localStorage/mocks como fonte da verdade da entrevista.
const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) => readFileSync(join(here, "..", relative), "utf8").replace(/\r\n/g, "\n");
const app = read("App.tsx");
const service = read("services/candidate-interviews-service.ts");

function block(startMarker: string, endMarker: string) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return app.slice(start, end);
}

describe("wizard do candidato usa a API real", () => {
  it("não importa mais o fluxo antigo (mock/localStorage/IA direta)", () => {
    expect(app).not.toMatch(/\bsubmitInterview\b/);
    expect(app).not.toMatch(/\bcompleteAiEvaluation\b/);
    expect(app).not.toMatch(/\bevaluateInterviewWithAi\b/);
    expect(app).not.toMatch(/\bgenerateInterviewQuestions\b/);
  });

  it("o serviço não usa localStorage, não envia candidateId e não gera ids", () => {
    expect(service).not.toMatch(/localStorage|sessionStorage/);
    expect(service).not.toMatch(/candidateId/);
    expect(service).not.toMatch(/randomUUID|Math\.random|Date\.now/);
    expect(service).not.toMatch(/\/interviews\/ai\//);
  });

  it("cria a Interview na confirmação do contexto, com trava contra clique duplo", () => {
    const handler = block("const handleContinue = async () => {", "useEffect(() => {\n    if (hadContextRef");
    expect(handler).toContain("continuingRef.current");
    expect(handler).toContain("createRealInterview(");
    expect(handler).toContain("generateRealQuestions(");
    // só cria se ainda não existe interviewId (voltar/avançar não duplica)
    expect(handler).toMatch(/if \(!interviewId\) \{[\s\S]*createRealInterview/);
  });

  it("novo contexto descarta o interviewId anterior", () => {
    expect(app).toMatch(/interviewId: undefined, context, questions: \[\]/);
  });

  it("responder: salva no Back antes de avançar e bloqueia em erro", () => {
    const screen = block("function InterviewScreen({", "// ─── Screen 9: Revisão e Envio");
    expect(screen).toContain("saveRealAnswer(");
    expect(screen).toContain("getRealQuestions(");
    expect(screen).toMatch(/if \(await persistAnswer\(question, answer\)\) action\(\)/);
    expect(screen).not.toMatch(/onChange=\{[^}]*saveRealAnswer/); // sem HTTP por tecla
  });

  it("modalidade é gravada no Back antes de ir às orientações", () => {
    const screen = block("function EvaluationModeScreen({", "function InterviewConfirmScreen({");
    expect(screen).toContain("saveRealEvaluationMode(");
    expect(screen).toContain("savingModeRef.current");
    expect(screen).not.toMatch(/onClick=\{\(\) => onNavigate\("prep"\)\}/);
  });

  it("envio usa POST submit real, trava duplo clique e não avalia IA", () => {
    const screen = block("function InterviewConfirmScreen({", "function InterviewDoneScreen({");
    expect(screen).toContain("submitRealInterview(");
    expect(screen).toContain("sendingRef.current");
    expect(screen).not.toMatch(/evaluate|completeAiEvaluation|\/candidate\/reports\//);
  });

  it("a tela de sucesso lê a entrevista da API, não do localStorage", () => {
    const screen = block("function InterviewDoneScreen({", "// ─── Fase B: AUT-003");
    expect(screen).toContain("getRealInterview(");
    expect(screen).not.toContain("getInterviewById");
  });

  it("rascunho legado (ids numéricos, sem interviewId) é descartado", () => {
    expect(app).toContain("isUuid(question?.id)");
  });
});
