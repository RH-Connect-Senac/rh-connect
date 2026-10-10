import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guarda de código-fonte do wizard do candidato. Os trechos são comparados sem
// depender de formatação (espaços/quebras de linha são normalizados).
const here = dirname(fileURLToPath(import.meta.url));
const read = (relative: string) =>
  readFileSync(join(here, "..", relative), "utf8").replace(/\s+/g, " ");
const app = read("App.tsx");
const service = read("services/candidate-interviews-service.ts");
const suggestedSection = read("components/suggested-jobs-section.tsx");

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

  it("o serviço não usa armazenamento do navegador, não envia o dono e não gera ids", () => {
    expect(service).not.toMatch(/localStorage|sessionStorage/);
    expect(service).not.toMatch(/candidateId/);
    expect(service).not.toMatch(/randomUUID|Math\.random|Date\.now/);
    expect(service).not.toMatch(/\/interviews\/ai\//);
  });

  it("cria a Interview na confirmação do contexto, com trava contra clique duplo", () => {
    const handler = block("const handleContinue = async () => {", "useEffect(() => {");
    expect(handler).toContain("continuingRef.current");
    expect(handler).toContain("createRealInterview(");
    expect(handler).toContain("generateRealQuestions(");
    expect(handler).toMatch(/if \(!interviewId\) \{.*createRealInterview/);
  });

  it("novo contexto descarta o interviewId anterior", () => {
    expect(app).toMatch(/interviewId:\s*undefined,\s*context,\s*questions:\s*\[\]/);
  });

  it("responder: salva no Back antes de avançar", () => {
    const screen = block("function InterviewScreen({", "function ReviewScreen(");
    expect(screen).toContain("saveRealAnswer(");
    expect(screen).toContain("getRealQuestions(");
    expect(screen).toMatch(/await persistAnswer\(question, answer\)/);
    expect(screen).toContain("Próxima");
  });

  it("Enter no textarea de resposta não avança nem salva (só o botão avança)", () => {
    const screen = block("function InterviewScreen({", "function ReviewScreen(");
    expect(screen).not.toMatch(/key\s*===\s*["']Enter["']/);
    expect(screen).not.toContain("onKeyDown");
    expect(screen).not.toContain("<form");
    expect(screen).toMatch(/onClick=\{\(\) => void goNext\(\)\}/);
  });

  it("o rascunho de resposta não é enviado ao Back sem a ação normal", () => {
    const screen = block("function InterviewScreen({", "function ReviewScreen(");
    // saveRealAnswer só é chamado dentro de persistAnswer (ação Próxima/Anterior/Revisar)
    expect(screen.match(/saveRealAnswer\(/g)?.length).toBe(1);
  });

  it("modalidade é gravada no Back antes de ir às orientações", () => {
    const screen = block("function EvaluationModeScreen({", "function InterviewConfirmScreen({");
    expect(screen).toContain("saveRealEvaluationMode(");
    expect(screen).toContain("savingModeRef.current");
  });

  it("envio usa POST submit real, trava duplo clique e não avalia IA", () => {
    const screen = block("function InterviewConfirmScreen({", "function InterviewDoneScreen({");
    expect(screen).toContain("submitRealInterview(");
    expect(screen).toContain("sendingRef.current");
    expect(screen).not.toMatch(/completeAiEvaluation|\/candidate\/reports\//);
  });

  it("a tela de sucesso lê a entrevista da API, não do localStorage", () => {
    const screen = block("function InterviewDoneScreen({", "// ─── Fase B: AUT-003");
    expect(screen).toContain("getRealInterview(");
    expect(screen).not.toContain("getInterviewById");
  });

  it("a revisão preserva visualmente as quebras de linha da resposta", () => {
    const screen = block("function ReviewScreen(", "// ─── Fase A: CAN-007");
    expect(screen).toContain("whitespace-pre-line");
  });

  it("rascunho legado (ids numéricos, sem interviewId) é descartado", () => {
    expect(app).toContain("isUuid(question?.id)");
  });

  it("a pergunta salva é preservada ao recarregar (não é zerada pela URL)", () => {
    expect(app).toContain("restoredQuestionIndex");
    expect(app).toContain("resolveInitialQuestionIndex(");
  });

  it("limpa rascunhos de resposta no envio final e ao descartar/trocar de vaga", () => {
    expect(app).toMatch(/const completeCurrentDraft = \(\) => \{ clearAnswerDraftsForInterview\(/);
    expect(app).toMatch(/const discardSavedDraft = \(\) => \{ clearAnswerDraftsForInterview\(/);
    expect(app).toMatch(/clearAnswerDraftsForInterview\(getCandidateIdentity\(session\)\.id, draft\.interviewId\)/);
  });
});

describe("painel Progresso: estados de navegação", () => {
  it("desktop e mobile usam a mesma regra (navStateAt + isQuestionNavigable)", () => {
    const mobile = block('<Card className="p-4 sm:hidden">', '<Card className="hidden p-5 sm:block">');
    const desktop = block('<Card className="hidden p-5 sm:block">', '<div className="flex gap-3"> <Btn variant="outline"');
    for (const part of [mobile, desktop]) {
      expect(part).toContain("navStateAt(item, index)");
      expect(part).toContain("isQuestionNavigable(navState)");
      expect(part).not.toContain("isValidInterviewAnswer(");
    }
  });

  it("o maior índice alcançado sobrevive ao F5 pelo progresso local já existente", () => {
    expect(app).toContain("highestQuestionIndex?: number;");
    expect(app).toContain("restoredHighestIndex={draftProgress.highestQuestionIndex}");
    expect(app).toContain("deriveHighestReachedIndex({");
  });

  it("o contador e a revisão continuam baseados em respostas válidas", () => {
    expect(app).toMatch(/const answeredCount = questions\.filter\(\(item\) => isValidInterviewAnswer\(draft\.answers\[item\.id\]\)\)\.length;/);
    expect(app).toContain("getFirstPendingQuestionIndex(draft)");
    expect(app).toContain("Responda todas as perguntas antes de revisar.");
  });
});

describe("Copiar link: aviso contextual junto ao campo de URL", () => {
  it("só é marcado pelo clique e some ao analisar ou editar o campo", () => {
    const copy = block("const handleSuggestedLinkCopied = (copiedUrl: string) => {", "const contextReady");
    expect(copy).toContain("setCopiedLinkUrl(linkEffect.nextUrl)");
    const analyze = block("const handleAnalyze = async () => {", "const context = await analyzeJobUrl");
    expect(analyze).toContain("setCopiedLinkUrl(null)");
    expect(app).toContain("setCopiedLinkUrl(null); setUrl(event.target.value);");
    expect(app).toContain("shouldShowCopiedLinkNotice(copiedLinkUrl, url)");
  });

  it("a seção de vagas não exibe mais o aviso no rodapé", () => {
    expect(suggestedSection).not.toContain("Agora toque em Analisar");
  });
});

describe("Copiar link: só prefill de UX, sem requisição", () => {
  it("a seção de vagas sugeridas não faz requisição nem lê o clipboard", () => {
    expect(suggestedSection).not.toMatch(/\bfetch\(|XMLHttpRequest|readText|clipboard\.read/);
    expect(suggestedSection).toContain("onLinkCopied?.(job.url)");
  });

  it("o handler grava o prefill separado do rascunho do wizard e não dispara análise", () => {
    const handler = block("const handleSuggestedLinkCopied = (copiedUrl: string) => {", "const contextReady");
    expect(handler).toContain("storeInterviewUrlPrefill(copiedUrl)");
    expect(handler).not.toMatch(/analyzeJobUrl|handleAnalyze|createRealInterview|fetch\(/);
  });

  it("copiar link usa a regra pura (substitui a URL e invalida contexto de outra vaga)", () => {
    const handler = block("const handleSuggestedLinkCopied = (copiedUrl: string) => {", "const contextReady");
    expect(handler).toContain("resolveLinkCopyEffect(");
    expect(handler).toContain("setUrl(linkEffect.nextUrl)");
    expect(handler).not.toMatch(/analyzeJobUrl|handleAnalyze|createRealInterview|fetch\(/);
  });

  it("a quebra de linha da resposta não é achatada no App", () => {
    expect(app).not.toMatch(/function normalizeInterviewAnswer/);
    expect(app).toContain("normalizeInterviewAnswer,");
  });

  it("a nova entrevista lê o prefill sem sobrescrever vaga já carregada", () => {
    expect(app).toMatch(/draft\.context\?\.sourceUrl \?\? peekInterviewUrlPrefill\(\) \?\? ""/);
  });
});
