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
    expect(handler).toContain("startInterviewForContext({");
    expect(handler).toContain("create: createRealInterview,");
    expect(handler).toContain("generate: generateRealQuestions,");
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

  it("autosave usa o endpoint de RASCUNHO; o oficial só é chamado pela confirmação", () => {
    const screen = block("function InterviewScreen({", "function ReviewScreen(");
    expect(screen).toContain("saveRealAnswerDraft(");
    expect(screen).toContain("confirmOfficialAnswer(");
    // um único ponto chama o PUT oficial: a confirmação (persistAnswer)
    expect(screen.match(/saveRealAnswer\(/g)?.length).toBe(1);
    expect(service).toMatch(/answer\/draft/);
  });

  it("digitar/ditar não grava resposta oficial: o texto em edição fica fora de draft.answers", () => {
    const screen = block("function InterviewScreen({", "function ReviewScreen(");
    const update = block("const updateAnswer = (value: string) => {", "const stopDictation");
    expect(update).toContain("setWorking(");
    expect(update).not.toContain("setDraft(");
    expect(screen).not.toMatch(/answers:\s*\{\s*\.\.\.current\.answers,\s*\[question\.id\]:\s*normalizedValue/);
    // só a confirmação escreve em draft.answers
    expect(screen).toContain("withOfficialAnswer(current.answers, target.id, outcome.answer)");
  });

  it("a confirmação considera o rascunho do Back: texto igual + rascunho ainda faz o PUT oficial", () => {
    const screen = block("function InterviewScreen({", "function ReviewScreen(");
    expect(screen).toContain("hasRemoteDraft: () =>");
    expect(screen).toContain("remoteDraftsRef.current[target.id] = { text: null, version: outcome.draftVersion");
  });

  it("contador e indicadores derivam da resposta OFICIAL (draft.answers), nunca do texto em edição", () => {
    const screen = block("function InterviewScreen({", "function ReviewScreen(");
    expect(screen).toContain("answered: isValidInterviewAnswer(draft.answers[item.id])");
    expect(screen).toContain("questions.filter((item) => isValidInterviewAnswer(draft.answers[item.id])).length");
    expect(screen).not.toMatch(/isValidInterviewAnswer\(workingText/);
    expect(screen).not.toMatch(/isValidInterviewAnswer\(autosave/);
  });

  it("Próxima/Anterior/número/Revisar confirmam a resposta oficial (withSavedAnswer -> persistAnswer)", () => {
    const screen = block("function InterviewScreen({", "function ReviewScreen(");
    expect(screen).toMatch(/const withSavedAnswer = async \(action: \(\) => void\) => \{.*await persistAnswer\(question, answer\)/);
    expect(screen).toContain("openQuestion = (index: number) => { void withSavedAnswer(");
    expect(screen).toContain("void withSavedAnswer(() => setQIdx(previous))");
  });

  it("mostra o estado do rascunho de forma discreta e oferece decisão no conflito", () => {
    const screen = block("function InterviewScreen({", "function ReviewScreen(");
    expect(screen).toContain("describeAnswerSync(");
    expect(screen).toContain("Manter meu texto");
    expect(screen).toContain("Usar a versão do outro dispositivo");
  });

  it("o envio final continua usando as respostas oficiais e limpa o rascunho local", () => {
    const screen = block("function InterviewConfirmScreen({", "function InterviewDoneScreen({");
    expect(screen).toContain("submitRealInterview(");
    expect(screen).not.toContain("saveRealAnswerDraft(");
    expect(app).toMatch(/const completeCurrentDraft = \(\) => \{ clearAnswerDraftsForInterview\(/);
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

describe("multi-dispositivo: PUT oficial versionado, sessão stale e saída", () => {
  const hook = read("hooks/use-interview-session-guard.ts");
  const guard = read("domain/interview-session-guard.ts");
  const interviewScreen = () => block("function InterviewScreen({", "function ReviewScreen(");

  it("o PUT oficial envia a versão do rascunho e o wizard a passa pela confirmação", () => {
    expect(service).toMatch(/body: \{ answer, draftVersion \}/);
    expect(interviewScreen()).toMatch(/saveRealAnswer\(interviewId, target\.id, normalized, draftVersion\)/);
    // a decisão do erro é pelo code, não pelo texto da mensagem
    expect(service).toContain('DRAFT_VERSION_CONFLICT_CODE = "DRAFT_VERSION_CONFLICT"');
    expect(service).toContain('INTERVIEW_NOT_IN_PROGRESS_CODE = "INTERVIEW_NOT_IN_PROGRESS"');
  });

  it("conflito de resposta: não navega, preserva o texto e mostra a decisão (sem last-write-wins)", () => {
    const persist = block("const persistAnswer = async", "// Executa uma ação que sai da pergunta atual");
    expect(persist).toMatch(/outcome\.reason === "conflict"/);
    // no conflito devolve false => withSavedAnswer não executa a navegação
    expect(persist).toMatch(/outcome\.reason === "conflict".*return false;/);
    expect(interviewScreen()).toContain("Escolha qual versão manter");
    expect(persist).toContain('controller?.getSnapshot().status === "conflict"');
  });

  it("revalida por focus/visibilidade, sem polling e sem WebSocket", () => {
    expect(hook).toContain("attachRevalidation(");
    expect(guard).toContain('"focus"');
    expect(guard).toContain('"visibilitychange"');
    expect(guard).toMatch(/visibilityState === "visible"/);
    for (const source of [hook, guard]) {
      expect(source).not.toMatch(/setInterval|WebSocket|EventSource/);
    }
    expect(read("services/candidate-interviews-service.ts")).toContain("export async function getRealQuestionsState");
  });

  it("wizard, revisão e confirmação usam a guarda de sessão", () => {
    expect(interviewScreen()).toContain("useInterviewSessionGuard(");
    expect(block("function ReviewScreen(", "function InterviewSetupScreen(").length).toBeGreaterThan(0);
    expect(block("function ReviewScreen(", "const handleSend").length).toBeGreaterThan(0);
    expect(block("function ReviewScreen(", "const handleSend")).toContain("useInterviewSessionGuard(");
    expect(block("function InterviewConfirmScreen(", "const handleSend")).toContain("useInterviewSessionGuard(");
  });

  it("sessão stale: trava o autosave, bloqueia edição/ações e oferece 'Voltar ao Dashboard'", () => {
    const screen = interviewScreen();
    expect(screen).toMatch(/onStale: \(\) => \{ controllerRef\.current\?\.lock\(\);/);
    expect(screen).toContain("readOnly={stale}");
    expect(screen).toMatch(/disabled=\{saving \|\| stale\}/);
    expect(screen).toMatch(/sessionGuard\.stale\) return;/);
    expect(app).toContain("Voltar ao Dashboard");
    expect(app).toContain("describeStaleInterview(");
    expect(read("domain/interview-session-guard.ts")).toContain(
      "Esta entrevista foi enviada em outro dispositivo e não pode mais ser editada.",
    );
  });

  it("ao ENTRAR numa entrevista já enviada em outro dispositivo, o wizard abre bloqueado (e o controlador nasce travado)", () => {
    const screen = interviewScreen();
    expect(screen).toContain("getRealQuestionsState(interviewIdForSync)");
    expect(screen).toContain("!isInterviewEditable(loaded.data.interviewStatus)");
    expect(screen).toContain("if (sessionGuard.stale) controller.lock();");
  });

  it("não redireciona sozinho: sair da sessão stale só acontece pelo clique no CTA", () => {
    // leaveStaleInterview só é passado como onStaleExit (chamado por onBack/clique)
    const uses = app.match(/leaveStaleInterview/g)?.length ?? 0;
    expect(uses).toBe(4); // definição + 3 telas
    expect(app).not.toMatch(/useEffect\(\(\) => \{[^}]*leaveStaleInterview/);
    // e não apaga o texto local ao descobrir: onStale só trava o autosave
    expect(interviewScreen()).not.toMatch(/onStale:[^}]*clearAnswerDraft/);
  });

  it("antes de Revisar o status é revalidado; no Submit, o 409 de status bloqueia sem recriar draft", () => {
    expect(interviewScreen()).toMatch(/sessionGuard\.revalidateNow\(\)\.then\(\(editable\) => \{ if \(editable\) onNavigate\("review"\)/);
    const confirmScreen = block("function InterviewConfirmScreen(", "// ─── Fase A");
    expect(confirmScreen).toMatch(/result\.reason === "not_in_progress"/);
    // reenvio idempotente (200) segue o fluxo normal de sucesso e descarta o rascunho local
    expect(confirmScreen).toContain("onDraftCompleted?.()");
  });

  it("'Sair e continuar depois' tenta o flush do rascunho, mas nunca prende a saída", () => {
    const modal = block("title={confirmCancelInterview ?", "onCancel={() => {");
    expect(modal).toContain("flushBeforeLeaving(leaveFlushRef.current)");
    // a proteção local acontece ANTES de esperar a rede
    expect(modal.indexOf("saveStoredInterviewDraft(")).toBeGreaterThan(-1);
    expect(modal.indexOf("saveStoredInterviewDraft(") < modal.indexOf("flushBeforeLeaving(")).toBe(true);
    // a saída continua mesmo se o flush falhar (try/finally, sem throw)
    expect(modal).toMatch(/try \{ await flushBeforeLeaving\(leaveFlushRef\.current\); \} finally \{/);
    expect(modal).not.toMatch(/sendBeacon/);
    expect(interviewScreen()).toContain("await controllerRef.current?.flush();");
    expect(interviewScreen()).toContain("registerLeaveFlush(async () => {");
    expect(app).not.toMatch(/sendBeacon/);
    // continua local: nenhuma chamada de cancelamento no Back
    expect(modal).not.toMatch(/Real[A-Z]\w*\(/);
  });

  it("limpar o estado local continua sendo uma função interna, sem chamar o Back", () => {
    const local = block("const discardSavedDraft = () => {", "// \"Cancelar\" na preparação");
    expect(local).not.toMatch(/Real[A-Z]\w*\(/);
    expect(local).not.toMatch(/fetch\(|request\(/);
    expect(local).toContain("clearStoredInterviewDraft(");
    expect(local).toContain("clearAnswerDraftsForInterview(");
  });
});

describe("retomada pelo Dashboard (código-fonte)", () => {
  it("Dashboard consulta a lista do Back e usa a reconciliação por interviewId", () => {
    expect(app).toContain("useInProgressInterviews()");
    expect(app).toContain("mergeInProgressEntries(");
    // 6A.5: o card principal ("Entrevista em andamento") vem do gate; a lista recente vem de GET /interviews.
    expect(read("domain/interview-resume.ts")).toContain("Entrevista em andamento");
    expect(app).toContain("Continuar entrevista");
  });

  it("retomar relê a entrevista e as perguntas no Back e reconfere IN_PROGRESS", () => {
    const resume = block("const resumeInterviewFromServer = async", "const discardSavedDraft = () => {");
    expect(resume).toContain("getRealInterview(interviewId)");
    expect(resume).toContain("getRealQuestionsStateForResume(interviewId)");
    expect(resume).toContain("buildResumePlan(");
    expect(resume).toContain("interview.context");
    expect(resume).toContain("navigateToStoredDraftProgress(");
    // falhas retornam antes de qualquer escrita local / abertura do wizard
    const firstWrite = resume.indexOf("setInterviewDraft(");
    expect(resume.indexOf("return { ok: false")).toBeGreaterThan(-1);
    expect(resume.indexOf("return { ok: false") < firstWrite).toBe(true);
    expect(resume).not.toMatch(/localStorage|saveStoredInterviewDraft/);
  });

  it("não há redirecionamento automático após o login para a entrevista em andamento", () => {
    expect(app).not.toMatch(/useInProgressInterviews\(\)[^;]{0,200}routerNavigate/);
    const hook = read("hooks/use-in-progress-interviews.ts");
    expect(hook).not.toMatch(/localStorage|sessionStorage|navigate/i);
    expect(service).toContain("/interviews/in-progress");
  });
});

describe("uma IN_PROGRESS por candidato (V1) no frontend", () => {
  const evaluatorContent = read("components/evaluator-evaluation-content.tsx");

  it("Dashboard: card principal e atalho são estados dinâmicos do gate; sem botão duplicado nem aviso extra", () => {
    expect(app).toContain("resolveNewInterviewGate(inProgressEntries)");
    expect(app).toContain("resolveDashboardInterviewAccess(newInterviewGate)");
    const grid = block('<div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6', "{/* Entrevistas recentes */}");
    // um único CTA no card principal, com texto vindo do estado
    expect(grid.match(/<Btn /g)?.length).toBe(1);
    expect(grid).toContain("{interviewAccess.main.title}");
    expect(grid).toContain("{interviewAccess.main.cta}");
    expect(grid).toContain("onClick={openInterviewAccess}");
    // bloco duplicado antigo removido
    expect(grid).not.toContain("NEW_INTERVIEW_BLOCKED_MESSAGE");
    expect(grid).not.toContain('role="alert"');
    expect(app).not.toContain("newInterviewBlocked");
    expect(grid).not.toMatch(/>\s*Praticar/);
    // atalho pequeno acompanha o estado e usa a mesma ação
    expect(app).toContain("label: interviewAccess.quick.title");
    expect(app).toContain("desc: interviewAccess.quick.description");
    expect(app).toContain('q.screen === "interview-setup" ? openInterviewAccess()');
  });

  it("Dashboard: com IN_PROGRESS nunca abre o setup; a ação 'continue' usa a retomada existente", () => {
    const start = block("const startNewInterview = () => {", "const openInterviewAccess");
    expect(start).toContain("continueExistingInterview()");
    expect(start).toContain('onNavigate("interview-setup")');
    const cont = block("const continueExistingInterview = () => {", "const startNewInterview");
    expect(cont).toContain("resumeInterview(newInterviewGate.resume.interviewId)");
    expect(cont).toContain("onContinueDraft?.()");
    expect(app).toContain('interviewAccess.action === "continue" ? continueExistingInterview : startNewInterview');
  });

  it("409 INTERVIEW_ALREADY_IN_PROGRESS: sem toast genérico, sem wizard falso e sem tocar no rascunho local", () => {
    const branch = block('if (outcome.kind === "already_in_progress") {', "} else {");
    expect(branch).toContain("setExistingInProgress({ id: outcome.existingInterviewId ?? null })");
    expect(branch).not.toMatch(/setDraft|toast|saveStoredInterviewDraft|localStorage|onNavigate|routerNavigate/);
  });

  it("'Continuar entrevista' do 409 só age após o clique do usuário (nada automático)", () => {
    const action = block("const continueExistingFromSetup = async () => {", "const setupActions = (");
    expect(action).toContain("onResumeInterview(existingInProgress.id)");
    expect(app).toContain('onClick={() => void continueExistingFromSetup()}');
    // nenhum efeito dispara a retomada sozinho
    expect(app).not.toMatch(/useEffect\(\(\) => \{[^}]{0,200}continueExistingFromSetup/);
  });

  it("card 'Nova entrevista' acompanha a altura da coluna ao lado, sem altura fixa (6A.5)", () => {
    const grid = block('<div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6', "{/* Entrevistas recentes */}");
    // a grade estica as colunas; o card cresce (flex-1) e distribui o conteúdo (topo/CTA no fim)
    expect(grid).toContain("items-stretch");
    expect(grid).not.toContain("items-start");
    expect(grid).toContain('data-testid="new-interview-card"');
    expect(grid).toContain('className="flex flex-col" data-testid="new-interview-card"');
    expect(grid).toContain("flex-1 rounded-2xl");
    expect(grid).toContain("flex flex-col justify-between");
    // sem altura rígida (quebraria em telas menores)
    expect(grid).not.toMatch(/style=\{\{[^}]*(?:height|minHeight)/);
    expect(grid).not.toMatch(/\b(?:h|min-h)-\[\d+px\]|\bmin-h-\d+/);
  });

  it("status do autosave do candidato usa a mesma semântica de cor do avaliador", () => {
    // avaliador: salvo = verde; demais estados = âmbar, texto xs/medium
    expect(evaluatorContent).toContain('syncStatus === "saved" ? "text-green-700" : "text-amber-700"');
    expect(evaluatorContent).toContain("text-xs font-medium");
    const autosave = read("domain/interview-answer-autosave.ts");
    expect(autosave).toContain('success: "text-green-700"');
    expect(autosave).toContain('warning: "text-amber-700"');
    expect(autosave).toContain('status === "saved" ? "success" : "warning"');
    expect(app).toContain("ANSWER_SYNC_TONE_CLASS[describeAnswerSyncTone(");
    expect(app).not.toMatch(/ml-3 text-muted-foreground">\s*\{syncLabel\}/);
  });

  it("a retomada cross-device continua ligada ao Dashboard e ao setup", () => {
    expect(app).toContain("onResumeInterview={resumeInterviewFromServer}");
    expect(app).toContain("getRealQuestionsStateForResume(interviewId)");
  });
});

describe("cancelamento REAL da entrevista (código-fonte)", () => {
  const modalBlock = () => block("title={confirmCancelInterview ?", "onCancel={() => {");
  const cancelFlow = () => block("const cancelActiveInterview = async () => {", "const completeCurrentDraft");
  const evaluator = read("components/evaluator-real-screens.tsx");
  const interviewScreen = () => block("function InterviewScreen({", "function ReviewScreen(");

  it("o modal diz 'Cancelar entrevista?' e deixa claro que vale para todos os dispositivos", () => {
    expect(app).toContain('"Cancelar entrevista?"');
    expect(app).toContain("Esta entrevista será encerrada e não poderá mais ser continuada em nenhum dispositivo. Você poderá iniciar uma nova entrevista depois.");
    expect(modalBlock()).toContain('cancelLabel={confirmCancelInterview ? "Voltar"');
    expect(modalBlock()).toContain("danger={confirmCancelInterview}");
  });

  it("nenhuma ação 'Descartar neste dispositivo' é exposta na interface", () => {
    expect(app).not.toContain("Descartar neste dispositivo");
    expect(app).not.toContain("Descartar progresso neste dispositivo?");
    expect(app).not.toContain("Descartar e iniciar nova");
    expect(app).not.toContain("onDiscardSavedDraft");
    // as ações do wizard são só estas duas
    expect(modalBlock()).toContain('"Sair e continuar depois"');
    expect(modalBlock()).toContain('cancelLabel={confirmCancelInterview ? "Voltar" : "Cancelar entrevista"}');
  });

  it("confirmar chama o endpoint real e só então limpa o estado local e volta ao Dashboard", () => {
    const flow = cancelFlow();
    expect(flow).toContain("cancelRealInterview(interviewId)");
    expect(service).toContain("/cancel");
    const failureReturn = flow.indexOf("return;");
    const stop = flow.indexOf("stopActivityRef.current?.()");
    const clear = flow.indexOf("discardSavedDraft()");
    const toDashboard = flow.indexOf('routerNavigate(getPathForScreen("dashboard"))');
    expect(failureReturn > -1 && stop > failureReturn).toBe(true);
    expect(clear > stop).toBe(true);
    expect(toDashboard > clear).toBe(true);
    // a falha devolve o erro ao modal (retry) e não limpa nada
    expect(flow).toMatch(/if \(!result\.ok\) \{ setCancelState\(\{ busy: false, error: result\.message \}\); return; \}/);
    expect(app).toContain('data-testid="cancel-interview-error"');
  });

  it("Dashboard relê as IN_PROGRESS ao abrir (hook carrega na montagem) depois do cancelamento", () => {
    expect(app).toContain("useInProgressInterviews()");
    expect(read("hooks/use-in-progress-interviews.ts")).toMatch(/useEffect\(\(\) => \{ void load\(\);/);
  });

  it("autosave e ditado são interrompidos pelo próprio InterviewScreen quando o cancelamento tem sucesso", () => {
    const screen = interviewScreen();
    const reg = screen.slice(screen.indexOf("registerStopActivity(() => {"), screen.indexOf("registerStopActivity(() => {") + 260);
    expect(reg).toContain("controllerRef.current?.lock()");
    expect(reg).toContain("recognitionRef.current?.stop()");
    expect(reg).toContain("setDictating(false)");
    expect(app).toContain("registerStopActivity={registerStopActivity}");
  });

  it("'Sair e continuar depois' continua sendo só uma pausa: sem cancel no Back", () => {
    const modal = modalBlock();
    const leave = modal.slice(modal.indexOf("if (leavingRef.current) return;"));
    expect(leave).toContain("flushBeforeLeaving(leaveFlushRef.current)");
    expect(leave).not.toMatch(/cancelRealInterview|cancelActiveInterview|Real[A-Z]\w*\(/);
    expect(leave).not.toMatch(/discardSavedDraft|clearStoredInterviewDraft/);
    // só o caminho de cancelamento chama cancelRealInterview
    expect(app.match(/cancelRealInterview\(/g)?.length).toBe(1);
  });

  it("CANCELLED em outro dispositivo bloqueia o wizard com mensagem própria (e sem redirecionar sozinho)", () => {
    expect(app).toContain("describeStaleInterview(sessionGuard.staleStatus)");
    expect(app).toContain("describeStaleInterview(staleStatus)");
    expect(app).not.toContain("INTERVIEW_SENT_ELSEWHERE_MESSAGE");
    expect(app).toContain("Voltar ao Dashboard");
    // o bloqueio reutiliza a guarda que trava autosave/ditado e bloqueia as ações
    expect(interviewScreen()).toMatch(/onStale: \(\) => \{ controllerRef\.current\?\.lock\(\);/);
    expect(interviewScreen()).toContain("recognitionRef.current?.stop()");
  });

  it("beforeunload só fica registrado enquanto a sessão é editável e CANCELLED remove a proteção", () => {
    expect(app).toContain("isExitProtectionActive({");
    expect(app).toContain("terminalStatus: terminalStatusForDraft");
    expect(app).toContain("return attachExitProtection(window,");
    expect(app).not.toContain('window.addEventListener("beforeunload"');
    expect(app).toContain("InterviewSessionTerminalContext.Provider");
    expect(read("hooks/use-interview-session-guard.ts")).toContain("reportTerminalRef.current?.(interviewIdRef.current, status)");
  });

  it("aviso de CANCELLED usa a variante de erro (vermelho); os demais continuam âmbar", () => {
    expect(app).toContain("const tone = staleNoticeTone(status);");
    expect(app).toContain('data-tone={tone}');
    expect(app).toContain("text-red-800");
    expect(app).toContain("text-amber-");
  });

  it("F5: o InterviewScreen deriva highestReached usando os rascunhos remotos", () => {
    expect(interviewScreen()).toContain("draftedIndexes");
    expect(interviewScreen()).toContain("remoteDraftsRef.current");
  });

  it("nova prática após CANCELLED: descarta o draft ao sair da sessão terminal e nunca reusa o id cancelado", () => {
    expect(app).toContain("shouldDiscardTerminalDraft({ terminalStatus: terminalStatusForDraft, screen: currentInterviewDraftScreen })");
    expect(app).toContain("startInterviewForContext({");
    expect(app).toContain("onObsolete: (staleId) => clearAnswerDraftsForInterview(");
    // handleContinue não cria nem gera direto: tudo passa pelo helper testado
    const cont = block("const handleContinue = async () => {", "useEffect(() => { if (hadContextRef.current");
    expect(cont).not.toContain("await createRealInterview(");
    expect(cont).not.toContain("await generateRealQuestions(");
  });

  it("sincronização entre dispositivos: polling só no wizard, só com sessão pronta e editável", () => {
    const screen = interviewScreen();
    expect(screen).toContain("useInterviewSyncPolling({");
    expect(screen).toContain('enabled: syncState === "ready" && !sessionGuard.stale && Boolean(draft.interviewId)');
    // fora do InterviewScreen (Dashboard etc.) o App não registra nenhum polling próprio
    const outside = app.replace(screen, "");
    expect(outside).not.toContain("useInterviewSyncPolling({");
    expect(read("hooks/use-interview-sync-polling.ts")).toContain("attachInterviewSyncPolling({");
    // revisão/confirmação acompanham só o STATUS
    expect(app.match(/pollStatus: true/g)?.length).toBe(2);
  });

  it("o ciclo do polling é silencioso e reaproveita o guard, o autosave e o conflito existentes", () => {
    const poll = block("const pollRemoteState = async", "useInterviewSyncPolling({");
    expect(poll).toContain("getRealQuestionsState(interviewId)");
    expect(poll).toContain("sessionGuard.markStale(");
    expect(poll).toContain('return "stop"');
    expect(poll).toContain("controller.receiveRemote(");
    expect(poll).toContain("diffServerState(");
    expect(poll).toContain("withOfficialAnswer(");
    // erro de rede/servidor: sem toast, sem erro em tela, sem apagar nada
    expect(poll).not.toMatch(/toast|setSyncError|setSaveError|setSyncState|clearAnswerDraft|setQIdx/);
    expect(poll).toContain('return "error"');
    // não move o usuário de pergunta e não roda durante a confirmação/avanço
    expect(poll).toContain("advancingRef.current");
  });

  it("'Sair e continuar depois' e cancelar pausam o polling deste dispositivo", () => {
    const screen = interviewScreen();
    expect(screen).toMatch(/registerLeaveFlush\(async \(\) => \{ \/\/[^\n]*syncPausedRef\.current = true;/);
    expect(screen).toMatch(/registerStopActivity\(\(\) => \{ syncPausedRef\.current = true;/);
  });

  it("não há cancelamento por avaliador/admin: a ação só existe no serviço do candidato", () => {
    expect(evaluator).not.toMatch(/cancelRealInterview/);
  });
});

describe("estado CANCELLED no wizard é somente leitura (refinamento visual)", () => {
  const screen = () => block("function InterviewScreen({", "function ReviewScreen(");

  it("o campo de resposta fica somente leitura quando a sessão está bloqueada e mantém o conteúdo", () => {
    const s = screen();
    expect(s).toContain("readOnly={stale}");
    expect(s).toContain("aria-readonly={stale || undefined}");
    expect(s).toContain("CANCELLED_TEXTAREA_CLASS");
    // o valor continua vindo da resposta atual (nada é apagado)
    expect(s).toMatch(/<Textarea value=\{answer\}/);
  });

  it("o ditado por voz não é renderizado quando cancelada", () => {
    const s = screen();
    expect(s).toMatch(/\{!cancelled && \( <Btn[^>]*onClick=\{toggleDictation\}[^>]*disabled=\{stale\}/);
  });

  it("Anterior e Próxima continuam bloqueados e a navegação para outras perguntas segue travada", () => {
    const s = screen();
    expect(s).toMatch(/disabled=\{qIdx === 0 \|\| saving \|\| stale\}/);
    expect(s).toMatch(/onClick=\{\(\) => void goNext\(\)\} disabled=\{saving \|\| stale\}/);
    expect(s.match(/disabled=\{!canOpenQuestion \|\| stale\}/g)?.length).toBe(2);
  });

  it("o destaque 'Em andamento' sai da pergunta atual apenas quando cancelada", () => {
    const s = screen();
    expect(s).toContain("resolveProgressVisual(navState, cancelled)");
    expect(s).toContain("{PROGRESS_LABELS[visual]}");
    // nenhum rótulo "Cancelada" por pergunta: a lista de progresso só usa PROGRESS_LABELS
    const progress = s.slice(s.indexOf("Progresso · {answeredCount}"), s.indexOf(">Anterior<") > -1 ? s.indexOf(">Anterior<") : undefined);
    expect(progress.length).toBeGreaterThan(0);
    expect(progress).not.toMatch(/Cancelada/);
  });

  it("o aviso vermelho inline e o CTA 'Voltar ao Dashboard' permanecem", () => {
    const s = screen();
    expect(s).toMatch(/<StaleInterviewNotice message=\{describeStaleInterview\(sessionGuard\.staleStatus\)\} status=\{sessionGuard\.staleStatus\} onBack=\{\(\) => onStaleExit\?\.\(\)\}/);
    expect(app).toContain("Voltar ao Dashboard");
  });
});

describe("Dashboard reativo entre dispositivos (código-fonte)", () => {
  const hook = read("hooks/use-in-progress-interviews.ts");
  const syncHook = read("hooks/use-dashboard-interviews-sync.ts");
  const domainSync = read("domain/dashboard-interviews-sync.ts");

  it("o Dashboard liga o sync com a fonte real de in-progress, só enquanto está montado", () => {
    const dash = block("const inProgress = useInProgressInterviews();", "const [resumingId");
    expect(dash).toContain("useDashboardInterviewsSync(inProgress.refresh)");
    // um único uso: nada de polling no site inteiro, wizard, admin, avaliador, histórico ou agenda
    expect(app.match(/useDashboardInterviewsSync\(/g)?.length).toBe(1);
    expect(app.match(/useInProgressInterviews\(\)/g)?.length).toBe(1);
    expect(syncHook).toMatch(/useEffect\(\(\) => \{.*return attachDashboardInterviewsSync\(/);
  });

  it("intervalo de 15 s, reaproveitando o agendador e sem polling de 4 s no Dashboard", () => {
    expect(domainSync).toContain("DASHBOARD_INTERVIEWS_SYNC_INTERVAL_MS = 15000");
    expect(domainSync).toContain("intervalMs: DASHBOARD_INTERVIEWS_SYNC_INTERVAL_MS");
    expect(domainSync).not.toMatch(/\b4000\b|INTERVIEW_SYNC_INTERVAL_MS\b(?!\s*,)/);
    expect(syncHook).not.toMatch(/WebSocket|EventSource|setInterval/);
  });

  it("a leitura de polling é silenciosa e não sobrepõe a requisição em andamento", () => {
    expect(hook).toContain("if (inFlight.current) return \"ok\"");
    expect(hook).toContain("applyInProgressResult(prev, result, { silent })");
    expect(hook).not.toMatch(/toast|alert\(|console\./);
  });

  it("o polling do wizard segue em 4 s e não foi tocado", () => {
    expect(read("domain/interview-sync-poller.ts")).toContain("INTERVIEW_SYNC_INTERVAL_MS = 4000");
    expect(read("hooks/use-interview-sync-polling.ts")).toContain("attachInterviewSyncPolling({");
    expect(app).toContain("useInterviewSyncPolling({");
  });

  it("carga inicial e ações locais reaproveitam o reload existente (sem chamada duplicada)", () => {
    expect(hook).toMatch(/useEffect\(\(\) => \{ void load\(\);/);
    expect(app).toContain("void reloadInProgress()");
  });
});

describe("modal 'Deseja sair da entrevista?': foco inicial seguro e focus-visible (código-fonte)", () => {
  const modal = () => block("function ConfirmModal({", "function SettingsScreen(");

  it("o foco inicial vem do modal (initialFocus), sem autoFocus e nunca no botão destrutivo", () => {
    const m = modal();
    expect(m).toContain("resolveInitialFocus({ showCancel, initialFocus })");
    expect(m).not.toMatch(/autoFocus/);
    // "Deseja sair": confirm = "Sair e continuar depois"; confirmação do cancelamento: "Voltar"
    expect(app).toContain('initialFocus={confirmCancelInterview ? "cancel" : "confirm"}');
    expect(app).toContain('"Sair e continuar depois"');
    expect(app).toContain('cancelLabel={confirmCancelInterview ? "Voltar" : "Cancelar entrevista"}');
  });

  it("botões, textos, ordem e ações do modal permanecem iguais", () => {
    const m = modal();
    expect(m.indexOf("ref={cancelRef}") < m.indexOf("ref={confirmRef}")).toBe(true);
    expect(m).toContain("onClick={onCancel}");
    expect(m).toContain("onClick={onConfirm}");
    expect(m).toContain('aria-label="Fechar"');
    expect(m).toContain("onClick={dismiss}");
    expect(m).toContain("AlertDialog open onOpenChange");
  });

  it("focus-visible continua nos botões (ring fino) e o teclado (Tab) reativa o ring em toque", () => {
    const m = modal();
    expect(m).toContain("CONFIRM_MODAL_FOCUS_RING");
    expect(m).toContain("CONFIRM_MODAL_DANGER_FOCUS_RING");
    expect(m).toMatch(/onKeyDownCapture=\{\(event\) => \{ if \(event\.key === "Tab"\) setKeyboardUsed\(true\); \}\}/);
    expect(m).not.toMatch(/outline-none focus:outline-none|focus:ring-0|focus-visible:outline-none/);
    // o X mantém o focus-visible que já tinha
    expect(m).toContain("focus-visible:ring-[4px]");
  });

  it("o cancelamento real não foi alterado por esta correção", () => {
    expect(app).toContain("await cancelActiveInterview();");
    expect(app).toContain("if (cancelBusyRef.current) return;");
  });
});
