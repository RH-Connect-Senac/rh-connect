import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EVAL_ACCOUNT,
  resolveAccountConfig,
} from "../components/header-popovers";

const APP = join(__dirname, "..");
const read = (relative: string) => readFileSync(join(APP, relative), "utf8");

// Remove comentários para testar só o código executável.
function code(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const REAL_FILES = [
  "services/evaluator-interviews-service.ts",
  "components/evaluator-real-content.tsx",
  "components/evaluator-active-content.tsx",
  "domain/evaluator-queue-partition.ts",
  "components/evaluator-real-screens.tsx",
  "components/evaluator-evaluation-content.tsx",
  "domain/evaluator-evaluation-form.ts",
  "domain/evaluator-evaluation-view.ts",
  "domain/evaluator-autosave.ts",
  "domain/evaluator-save-notice.ts",
  "domain/evaluator-review.ts",
  "domain/evaluator-completion-flow.ts",
  "components/evaluator-review-content.tsx",
];

// Único módulo autorizado a tocar no storage do navegador (proteção local da
// avaliação, namespace próprio e novo). Nada de mocks.
const LOCAL_DRAFT_FILE = "domain/evaluator-local-draft.ts";

const FORBIDDEN =
  /DEFAULT_EVALUATOR|EVALUATOR_DIRECTORY|findEvaluatorIdByEmail|evaluator-carlos-andrade|evaluator-camila-dias|Carlos Andrade|carlos\.andrade|camila\.dias/;

describe("área real do avaliador: fonte de dados", () => {
  it.each(REAL_FILES)("%s não usa mocks, localStorage nem identidade fictícia", (file) => {
    const source = code(read(file));
    expect(source).not.toMatch(FORBIDDEN);
    expect(source).not.toMatch(/mocks\//);
    expect(source).not.toMatch(/services\/interviews-service"/);
    expect(source).not.toMatch(/localStorage|sessionStorage/);
  });

  it("as telas reais leem fila e detalhe do serviço real e navegam por interviewId (UUID) da API", () => {
    const screens = code(read("components/evaluator-real-screens.tsx"));
    expect(screens).toContain("listAssignedInterviews");
    expect(screens).toContain("getAssignedInterview");
    expect(screens).toMatch(/\$\{EVALUATION_ROUTE\}\/\$\{id\}/);
    expect(screens).not.toMatch(/evaluatorId/);
  });

  it("a fila e o dashboard NÃO levam mais ao detalhe: só Avaliar; a rota de detalhe segue existindo", () => {
    const screens = code(read("components/evaluator-real-screens.tsx"));
    const content = code(read("components/evaluator-real-content.tsx"));
    expect(content).not.toContain("Ver entrevista");
    expect(content).not.toMatch(/onOpen/);
    expect(screens).not.toMatch(/\/evaluator\/interviews/);
    expect(screens).not.toMatch(/onOpen=/);
    expect(screens.match(/onEvaluate=\{\(id\) => routerNavigate\(`\$\{EVALUATION_ROUTE\}\/\$\{id\}`\)\}/g)?.length).toBe(2);
    // implementação de detalhe preservada
    expect(screens).toContain("export function EvalInterviewDetailScreen");
    expect(screens).toContain("getAssignedInterview");
    const app = code(read("App.tsx"));
    expect(app).toMatch(/path="\/evaluator\/interviews\/:id"[^\n]*<EvalInterviewDetailScreen/);
  });

  it("Avaliar navega para /evaluator/evaluations/:interviewId com o UUID real", () => {
    const screens = code(read("components/evaluator-real-screens.tsx"));
    expect(screens).toContain('const EVALUATION_ROUTE = "/evaluator/evaluations"');
    expect(screens).toMatch(/\$\{EVALUATION_ROUTE\}\/\$\{interviewId\}/);
    expect(screens).toContain("getEvaluationDraft");
    expect(screens).toContain("saveEvaluationDraft");
  });

  it("cabeçalho da avaliação: 'Avaliando: <candidato real>' + vaga, 'Questão X de Y' e navegação só local", () => {
    const screens = code(read("components/evaluator-real-screens.tsx"));
    const view = code(read("domain/evaluator-evaluation-view.ts"));
    expect(view).toContain("`Avaliando: ${candidateName}`");
    expect(screens).toContain("evaluationHeader({");
    expect(screens).toContain("ready.interview.candidate.name");
    expect(screens).toContain("ready.interview.context.title");
    expect(screens).toContain("useIsMobile()");
    expect(screens).toContain("header.showProgressBadge");
    expect(view).toContain("questionProgressLabel(input.questionIndex, input.totalQuestions)");
    expect(screens).toMatch(/useState\(0\)/);
    // navegar entre perguntas não chama a API
    const handler = screens.slice(screens.indexOf("onQuestionChange="), screens.indexOf("onBack=", screens.indexOf("onQuestionChange=")));
    expect(handler).not.toMatch(/saveEvaluationDraft|getEvaluationDraft|fetch/);
  });

  it("proteção local: só o módulo próprio usa storage, com namespace novo, e a proteção local nunca chama a API", () => {
    const local = code(read(LOCAL_DRAFT_FILE));
    expect(local).toContain('"rhconnect:evaluator-evaluation-draft:v1"');
    expect(local).not.toMatch(FORBIDDEN);
    expect(local).not.toMatch(/mocks\//);
    expect(local).not.toMatch(/services\/interviews-service"/);
    expect(local).not.toMatch(/sessionStorage/);
    // a proteção local não conhece a API (nenhum fetch/serviço importado)
    expect(local).not.toMatch(/evaluator-interviews-service|\bfetch\(/);

    const screens = code(read("components/evaluator-real-screens.tsx"));
    expect(screens).not.toMatch(/localStorage|sessionStorage/);
    expect(screens).toContain("getBrowserStorage()");
    expect(screens).toContain("restoreForm(");
  });

  it("autosave: o container só usa o controlador; PUT único e injetado (sem autosave por tecla na UI)", () => {
    const screens = code(read("components/evaluator-real-screens.tsx"));
    expect(screens).toContain("new EvaluationAutosave(");
    expect(screens).toContain("save: saveEvaluationDraft");
    // saveEvaluationDraft só no import e injetado no controlador
    expect(screens.match(/saveEvaluationDraft/g)?.length).toBe(2);
    expect(screens).not.toMatch(/setTimeout|setInterval/);
    // aviso "Rascunho salvo" temporário vem do módulo próprio (2,5 s), não da tela
    expect(screens).toContain("new SavedNotice(");
    const notice = code(read("domain/evaluator-save-notice.ts"));
    expect(notice).toContain("SAVED_NOTICE_MS = 2500");
    expect(notice).not.toMatch(/evaluator-interviews-service|\bfetch\(|localStorage|saveEvaluationDraft/);
    expect(code(read("domain/evaluator-autosave.ts"))).not.toMatch(/Salvo automaticamente/);
    // edições passam por controller.edit; o botão por flush; a saída destrói o timer
    expect(screens).toMatch(/controller\.edit\(/);
    expect(screens).toContain(".flush()");
    expect(screens).toContain(".destroy()");

    const autosave = code(read("domain/evaluator-autosave.ts"));
    expect(autosave).toContain("AUTOSAVE_DELAY_MS = 2000");
    expect(autosave).not.toMatch(/evaluator-interviews-service|\bfetch\(|localStorage|sessionStorage/);
    expect(autosave).not.toMatch(FORBIDDEN);
    expect(autosave).not.toMatch(/mocks\//);
    // conclusão fora do autosave
    expect(autosave).not.toMatch(/complete|conclu/i);
  });

  it("conclusão: a ÚNICA chamada à API é o POST sem corpo, só pelo fluxo de confirmação", () => {
    const service = code(read("services/evaluator-interviews-service.ts"));
    const fn = service.slice(service.indexOf("export async function completeEvaluation"));
    expect(fn).toMatch(/evaluation\/complete/);
    expect(fn).toMatch(/\{ method: "POST" \}/);
    expect(fn).not.toMatch(/JSON\.stringify|body:/);
    for (const file of REAL_FILES.filter((f) => f !== "services/evaluator-interviews-service.ts")) {
      expect(code(read(file))).not.toMatch(/evaluation\/complete/);
    }
    const screens = code(read("components/evaluator-real-screens.tsx"));
    // completeEvaluation é só injetado no fluxo; nunca chamado direto no clique.
    expect(screens).toMatch(/complete: completeEvaluation,/);
    expect(screens).not.toMatch(/completeEvaluation\(/);
    const flow = code(read("domain/evaluator-completion-flow.ts"));
    expect(flow).toMatch(/this\.deps\.complete\(this\.deps\.interviewId\)/);
  });

  it("edição -> revisão: salva via syncNow (sem PUT paralelo) e só então navega", () => {
    const screens = code(read("components/evaluator-real-screens.tsx"));
    const body = screens.slice(screens.indexOf("const onReview = async"), screens.indexOf("// Erro do save MANUAL"));
    expect(body).toContain("controller.syncNow()");
    expect(body.indexOf("syncNow()") < body.indexOf("/review`")).toBe(true);
    expect(body).toMatch(/if \(!result\.ok\)[\s\S]*return;[\s\S]*routerNavigate/);
    expect(body).not.toMatch(/saveEvaluationDraft/);
    expect(body).toMatch(/reviewingRef\.current/);
  });

  it("a revisão e o sucesso não usam autosave, PUT nem escrita no localStorage", () => {
    const screens = code(read("components/evaluator-real-screens.tsx"));
    const review = screens.slice(screens.indexOf("export function EvalRealReviewScreen"));
    expect(review).not.toMatch(/EvaluationAutosave|saveEvaluationDraft|writeLocalDraft|syncLocalDraft|restoreForm/);
    expect(review).toContain("getAssignedInterview");
    expect(review).toContain("getEvaluationDraft");
    const success = review.slice(review.indexOf("export function EvalCompletionSuccessScreen"));
    expect(success).not.toMatch(/getAssignedInterview|getEvaluationDraft|listAssignedInterviews|completeEvaluation/);
    expect(success).toContain("parseCompletionNavState(location.state, id)");
  });

  it("sucesso: navega com replace e leva o contexto; o voltar não reabre a revisão", () => {
    const screens = code(read("components/evaluator-real-screens.tsx"));
    expect(screens).toMatch(/\/success`, \{\s*replace: true,\s*state:/);
    expect(screens).toMatch(/snapshot\.phase === "done"/);
  });

  it("limpeza local só no fluxo, apenas no sucesso (nunca no catch/erro)", () => {
    const flow = code(read("domain/evaluator-completion-flow.ts"));
    expect(flow.match(/clearLocalDraftOnCompletion\(/g)?.length).toBe(1);
    const okBranch = flow.slice(flow.indexOf("if (outcome.ok)"), flow.indexOf("} else {"));
    expect(okBranch).toContain("clearLocalDraftOnCompletion(");
    const elseBranch = flow.slice(flow.indexOf("} else {"));
    expect(elseBranch).not.toContain("clearLocalDraft");
  });

  it("rotas: revisão e sucesso reais; sem os mocks EvalReviewScreen/EvalDoneScreen no App", () => {
    const app = code(read("App.tsx"));
    expect(app).toContain("<EvalRealReviewScreen onNavigate={navigate} />");
    expect(app).toContain("<EvalCompletionSuccessScreen onNavigate={navigate} />");
    expect(app).not.toMatch(/EvalReviewScreen|EvalDoneScreen/);
    expect(app).toMatch(/path="\/evaluator\/evaluations\/:id\/review"/);
    expect(app).toMatch(/path="\/evaluator\/evaluations\/:id\/success"/);
  });

  it("autosave transparente: campos editáveis nunca são desabilitados/remontados/focados pelo código", () => {
    const content = code(read("components/evaluator-evaluation-content.tsx"));
    const form = content.slice(content.indexOf("export function EvaluationForm"), content.indexOf("export function EvaluatorEvaluationContent"));
    // disabled={saving} removia o foco do textarea/input ao iniciar o PUT.
    expect(form.match(/disabled=\{saving\}/g)).toBeNull();
    for (const tag of ["<Textarea", "<Input"]) {
      const start = form.indexOf(tag);
      const tagSrc = form.slice(start, form.indexOf("/>", start));
      expect(tagSrc).not.toMatch(/\bkey=|disabled/);
    }
    const screens = code(read("components/evaluator-real-screens.tsx"));
    expect(screens).not.toMatch(/\.focus\(|\.blur\(|setSelectionRange/);
    expect(content).not.toMatch(/\.focus\(|\.blur\(|setSelectionRange|autoFocus/);
    const autosave = code(read("domain/evaluator-autosave.ts"));
    expect(autosave).toMatch(/if \(isDirty\(this\.form, outcome\.form\)\) this\.form = outcome\.form;/);
  });

  it("campos da avaliação usam os componentes compartilhados (mesmo padrão de Configurações/Histórico)", () => {
    // Referência: Input/Textarea compartilhados (borda, foco azul e erro via aria-invalid).
    expect(code(read("components/ui/input.tsx"))).toContain("focus-visible:border-[#2563EB]");
    expect(code(read("components/ui/textarea.tsx"))).toContain("aria-invalid:border-destructive");
    const content = code(read("components/evaluator-evaluation-content.tsx"));
    expect(content).toContain('from "./ui/input"');
    expect(content).toContain('from "./ui/textarea"');
    // Nada de <input>/<textarea> crus nem foco/borda sobrescritos localmente.
    expect(content).not.toMatch(/<input[\s>]|<textarea[\s>]/);
    const formOnly = content.slice(content.indexOf("export function EvaluationForm"), content.indexOf("export function EvaluatorEvaluationContent"));
    expect(formOnly).not.toMatch(/focus:ring|focus:outline-none|focus:border/);
    expect(formOnly.slice(formOnly.indexOf("<Textarea"))).not.toMatch(/focus-visible:/);
    expect(content).toMatch(/<Textarea[\s\S]*?aria-invalid=/);
    expect(content).toMatch(/<Input[\s\S]*?aria-invalid=/);
  });

  it("painel de avaliação: sem scroll interno nem altura máxima (um único scroll da página)", () => {
    const content = code(read("components/evaluator-evaluation-content.tsx"));
    expect(content).not.toMatch(/overflow-y-|overflow-auto|overflow-scroll|max-h-|xl:sticky/);
  });

  it("nomenclatura da média: edição 'Média atual', revisão 'Média prevista', sucesso 'Média final'", () => {
    const edit = code(read("components/evaluator-evaluation-content.tsx"));
    const review = code(read("components/evaluator-review-content.tsx"));
    expect(edit).toContain("Média atual");
    expect(edit).not.toMatch(/Média parcial|Média final/);
    expect(review).toContain("Média prevista");
    expect(review).toContain("Média final");
    expect(review).not.toMatch(/Média final prevista|Nota final/);
  });

  it("Anterior/Próxima usam o Button compartilhado (outline/primary) com setas, sem classes locais de botão", () => {
    const content = code(read("components/evaluator-evaluation-content.tsx"));
    expect(content).toContain('from "./ui/button"');
    const nav = content.slice(content.indexOf("<nav"), content.indexOf("</nav>"));
    expect(nav).toMatch(/<Button[\s\S]*?variant="outline"[\s\S]*?<ArrowLeft[\s\S]*?Anterior/);
    expect(nav).toMatch(/<Button[\s\S]*?variant="primary"[\s\S]*?Próxima[\s\S]*?<ArrowRight/);
    expect(nav).not.toContain("BUTTON_CLASS");
    // a lógica de navegação segue as mesmas funções puras
    expect(nav).toContain("previousQuestionIndex(current, total)");
    expect(nav).toContain("nextQuestionIndex(current, total)");
    expect(nav).toContain("canGoPrevious(current, total)");
    expect(nav).toContain("canGoNext(current, total)");
  });

  it("a edição não tem mais 'Concluir avaliação' (só na revisão/diálogo)", () => {
    const content = code(read("components/evaluator-evaluation-content.tsx"));
    expect(content).not.toContain("Concluir avaliação");
    expect(content).toContain("Revisar avaliação");
  });

  it("o conteúdo usa os dados do serviço (candidato, vaga, perguntas e respostas)", () => {
    const content = code(read("components/evaluator-real-content.tsx"));
    for (const field of ["item.candidate.name", "item.jobTitle", "context.title", "question.text", "question.answer"]) {
      expect(content).toContain(field);
    }
  });

  it("App.tsx: sem ponte e-mail→id mock nem fallback para avaliador padrão", () => {
    const app = code(read("App.tsx"));
    expect(app).not.toMatch(/getEvaluatorIdentity|DEFAULT_EVALUATOR|findEvaluatorIdByEmail|EVALUATOR_DIRECTORY/);
    expect(app).not.toMatch(/evaluator-carlos|evaluator-camila/);
  });

  it("App.tsx: Dashboard, Fila e Detalhe do avaliador usam as telas reais", () => {
    const app = code(read("App.tsx"));
    expect(app).toContain('from "./components/evaluator-real-screens"');
    expect(app).toMatch(/path="\/evaluator\/dashboard"[^\n]*<EvalDashboardScreen onNavigate=\{navigate\} \/>/);
    expect(app).toMatch(/path="\/evaluator\/evaluations"[^\n]*<EvalQueueScreen onNavigate=\{navigate\} \/>/);
    expect(app).toMatch(/path="\/evaluator\/interviews\/:id"[^\n]*<EvalInterviewDetailScreen onNavigate=\{navigate\} \/>/);
    expect(app).toMatch(/path="\/evaluator\/evaluations\/:id"[^\n]*<EvalDraftEvaluationScreen onNavigate=\{navigate\} \/>/);
    expect(app).not.toMatch(/<EvalScreenView/);
  });

  it("nenhuma tela do avaliador recebe id por prop (Em Andamento ficou real na 6A.2): sem evaluatorSessionId nem id fictício", () => {
    const app = code(read("App.tsx"));
    expect(app).not.toMatch(/evaluatorSessionId/);
    expect(app).not.toMatch(/evaluatorId=\{/);
  });

  it("eval-screens.tsx: Dashboard/Fila mock removidos e Configurações sem dados fixos", () => {
    const screens = code(read("components/eval-screens.tsx"));
    expect(screens).not.toMatch(/export function EvalDashboardScreen|export function EvalQueueScreen/);
    expect(screens).not.toMatch(/Carlos|carlos\.andrade|Recursos Humanos|defaultValue="Carlos/);
    expect(screens).toMatch(/useContext\(SessionContext\)/);
  });
});

const sessionUser = (name: string, email: string) => ({ name, email });

describe("identidade do avaliador vem da sessão real", () => {
  it("a base do cabeçalho é neutra (nunca Carlos)", () => {
    expect(EVAL_ACCOUNT.name).toBe("Avaliador");
    expect(EVAL_ACCOUNT.email).toBe("");
    expect(JSON.stringify(EVAL_ACCOUNT)).not.toMatch(/Carlos|carlos|CA"/);
  });

  it.each([
    ["Camila Dias", "camila.dias@gmail.com", "CD"],
    ["Carlos Andrade", "carlos.andrade@gmail.com", "CA"],
    ["Beatriz Lima", "beatriz.lima@gmail.com", "BL"],
  ])("%s: nome, e-mail e iniciais são os dela/dele", (name, email, initials) => {
    const account = resolveAccountConfig(EVAL_ACCOUNT, sessionUser(name, email));
    expect(account.name).toBe(name);
    expect(account.email).toBe(email);
    expect(account.initials).toBe(initials);
  });

  it("Camila não recebe Carlos; Carlos não recebe Camila; Beatriz não cai em Carlos", () => {
    const camila = resolveAccountConfig(EVAL_ACCOUNT, sessionUser("Camila Dias", "camila.dias@gmail.com"));
    const carlos = resolveAccountConfig(EVAL_ACCOUNT, sessionUser("Carlos Andrade", "carlos.andrade@gmail.com"));
    const beatriz = resolveAccountConfig(EVAL_ACCOUNT, sessionUser("Beatriz Lima", "beatriz.lima@gmail.com"));

    expect(JSON.stringify(camila)).not.toMatch(/Carlos|carlos/);
    expect(JSON.stringify(carlos)).not.toMatch(/Camila|camila/);
    expect(JSON.stringify(beatriz)).not.toMatch(/Carlos|carlos|Camila|camila/);
  });

  it("sem sessão de avaliador, o cabeçalho cai no rótulo neutro e não em outra pessoa", () => {
    const account = resolveAccountConfig(EVAL_ACCOUNT, null);
    expect(account.name).toBe("Avaliador");
    expect(account.email).toBe("");
  });

  it("Configurações: sem especialização/área inventada (não há fonte real)", () => {
    const settings = code(read("components/eval-screens.tsx"));
    const start = settings.indexOf("export function EvalSettingsScreen");
    const body = settings.slice(start, settings.indexOf("// ─── Screen: Ativar Conta", start));
    expect(body).not.toMatch(/Especialização|defaultValue=/);
    expect(body).toContain("user?.name");
    expect(body).toContain("user?.email");
  });
});
