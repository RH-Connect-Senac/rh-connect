import { describe, expect, it } from "vitest";
import {
  buildResumePlan,
  chooseResumePoint,
  formatInProgressProgress,
  mergeInProgressEntries,
  resolveNewInterviewGate,
  resolveHighestReached,
  resolveResumeTarget,
  type InProgressListItem,
  type ResumeQuestion,
} from "./interview-resume";

function q(position: number, over: Partial<ResumeQuestion> = {}): ResumeQuestion {
  return {
    id: `q-${position}`,
    position,
    answer: null,
    draftText: null,
    draftUpdatedAt: null,
    ...over,
  };
}
const five = (over: Record<number, Partial<ResumeQuestion>> = {}) =>
  [1, 2, 3, 4, 5].map((n) => q(n, over[n]));

const item = (id: string, over: Partial<InProgressListItem> = {}): InProgressListItem => ({
  id,
  title: `Vaga ${id}`,
  company: "ACME",
  evaluationMode: "AI",
  createdAt: "2026-10-01T10:00:00.000Z",
  questionCount: 5,
  answeredQuestionCount: 2,
  latestDraftUpdatedAt: null,
  ...over,
});

describe("chooseResumePoint (regra de retomada da pergunta)", () => {
  it("cenário PC→celular: Q1/Q2 respondidas e rascunho na Q3 → Q3, sem contar o rascunho como resposta", () => {
    const questions = five({
      1: { answer: "a" },
      2: { answer: "b" },
      3: { draftText: "rascunho", draftUpdatedAt: "2026-10-01T10:00:00.000Z" },
    });
    expect(chooseResumePoint(questions)).toEqual({ kind: "question", index: 2 });
    const plan = buildResumePlan({
      interview: { id: "i", status: "IN_PROGRESS", evaluationMode: "AI" },
      questions,
      questionsInterviewStatus: "IN_PROGRESS",
    });
    expect(plan.ok && Object.keys(plan.answers)).toEqual(["q-1", "q-2"]);
  });

  it("escolhe o rascunho de draftUpdatedAt mais recente", () => {
    const questions = five({
      2: { draftText: "x", draftUpdatedAt: "2026-10-01T10:00:00.000Z" },
      4: { draftText: "y", draftUpdatedAt: "2026-10-01T11:00:00.000Z" },
    });
    expect(chooseResumePoint(questions)).toEqual({ kind: "question", index: 3 });
  });

  it("sem rascunho: primeira pergunta sem resposta oficial", () => {
    expect(chooseResumePoint(five({ 1: { answer: "a" }, 2: { answer: "b" } }))).toEqual({
      kind: "question",
      index: 2,
    });
  });

  it("resposta em branco não conta como respondida", () => {
    expect(chooseResumePoint(five({ 1: { answer: "   " } }))).toEqual({ kind: "question", index: 0 });
  });

  it("tudo respondido → revisão", () => {
    const all = five({ 1: { answer: "a" }, 2: { answer: "a" }, 3: { answer: "a" }, 4: { answer: "a" }, 5: { answer: "a" } });
    expect(chooseResumePoint(all)).toEqual({ kind: "review" });
  });

  it("rascunho vazio/sem data é ignorado", () => {
    const questions = five({ 2: { draftText: "  ", draftUpdatedAt: "2026-10-01T10:00:00.000Z" }, 3: { draftText: "z", draftUpdatedAt: null } });
    expect(chooseResumePoint(questions)).toEqual({ kind: "question", index: 0 });
  });
});

describe("resolveHighestReached", () => {
  it("máximo entre respondidas, com rascunho e a escolhida", () => {
    const questions = five({ 1: { answer: "a" }, 4: { draftText: "d", draftUpdatedAt: "2026-10-01T10:00:00.000Z" } });
    expect(resolveHighestReached(questions, 1)).toBe(3);
    expect(resolveHighestReached(five(), 2)).toBe(2);
  });
});

describe("resolveHighestReached: mesma regra do F5 do wizard", () => {
  it("Q1 e Q2 oficiais: a Q3 fica acessível; só rascunho na Q3 não a torna respondida", () => {
    const questions = five({ 1: { answer: "a" }, 2: { answer: "b" }, 3: { draftText: "rascunho", draftUpdatedAt: "2026-10-01T10:00:00.000Z" } });
    expect(resolveHighestReached(questions, 0)).toBe(2);
    expect(questions[2].answer).toBeNull();
    expect(resolveHighestReached(five({ 1: { answer: "a" }, 2: { answer: "b" } }), 0)).toBe(2);
  });
});

describe("resolveResumeTarget (etapa do wizard)", () => {
  it("sem perguntas → etapa anterior (setup)", () => {
    expect(resolveResumeTarget({ questions: [], evaluationMode: null }).screen).toBe("interview-setup");
  });
  it("perguntas sem modalidade → evaluation-mode", () => {
    expect(resolveResumeTarget({ questions: five(), evaluationMode: null }).screen).toBe("evaluation-mode");
  });
  it("com modalidade → interview na regra da pergunta", () => {
    const target = resolveResumeTarget({ questions: five({ 1: { answer: "a" } }), evaluationMode: "HUMAN" });
    expect(target).toMatchObject({ screen: "interview", currentQuestionIndex: 1, highestQuestionIndex: 1 });
  });
  it("tudo respondido → review", () => {
    const all = five({ 1: { answer: "a" }, 2: { answer: "a" }, 3: { answer: "a" }, 4: { answer: "a" }, 5: { answer: "a" } });
    expect(resolveResumeTarget({ questions: all, evaluationMode: "AI" })).toMatchObject({ screen: "review", highestQuestionIndex: 4 });
  });
});

describe("buildResumePlan", () => {
  const base = { evaluationMode: "AI" as const };
  it("recusa entrevista que não está IN_PROGRESS (enviada entre a lista e o clique)", () => {
    for (const status of ["PENDING_AI_EVALUATION", "PENDING_ASSIGNMENT", "ASSIGNED", "COMPLETED", "CANCELLED"]) {
      expect(buildResumePlan({ interview: { id: "i", status, ...base }, questions: five(), questionsInterviewStatus: "IN_PROGRESS" })).toEqual({ ok: false, reason: "not_in_progress" });
    }
  });
  it("recusa quando as perguntas informam status diferente", () => {
    expect(buildResumePlan({ interview: { id: "i", status: "IN_PROGRESS", ...base }, questions: five(), questionsInterviewStatus: "COMPLETED" })).toEqual({ ok: false, reason: "not_in_progress" });
  });
  it("aceita status de perguntas desconhecido (Back antigo) e ordena por position", () => {
    const plan = buildResumePlan({ interview: { id: "i", status: "IN_PROGRESS", ...base }, questions: [q(2), q(1)], questionsInterviewStatus: null });
    expect(plan.ok && plan.questions.map((x) => x.position)).toEqual([1, 2]);
  });
});

describe("mergeInProgressEntries (reconciliação Back × localStorage)", () => {
  it("lista do Back é autoritativa, sem duplicar o local do mesmo interviewId", () => {
    const entries = mergeInProgressEntries({ server: [item("a"), item("b")], localInterviewId: "a", localActive: true });
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ source: "server", hasLocalProgress: true });
    expect(entries[1]).toMatchObject({ source: "server", hasLocalProgress: false });
  });
  it("várias IN_PROGRESS isoladas por interviewId, na ordem recebida", () => {
    const ids = mergeInProgressEntries({ server: [item("c"), item("b"), item("a")], localInterviewId: null, localActive: false })
      .map((e) => (e.source === "server" ? e.item.id : "local"));
    expect(ids).toEqual(["c", "b", "a"]);
  });
  it("local sem correspondente não aparece quando a lista do Back já chegou", () => {
    expect(mergeInProgressEntries({ server: [], localInterviewId: "x", localActive: true })).toEqual([]);
  });
  it("lista indisponível (carregando/erro): rascunho local vira fallback", () => {
    expect(mergeInProgressEntries({ server: null, localInterviewId: "x", localActive: true })).toEqual([{ source: "local", interviewId: "x" }]);
    expect(mergeInProgressEntries({ server: null, localInterviewId: null, localActive: false })).toEqual([]);
  });
  it("ids repetidos do Back não duplicam", () => {
    expect(mergeInProgressEntries({ server: [item("a"), item("a")], localInterviewId: null, localActive: false })).toHaveLength(1);
  });
});

describe("formatInProgressProgress", () => {
  it("mostra progresso e o caso sem perguntas", () => {
    expect(formatInProgressProgress({ answeredQuestionCount: 2, questionCount: 5 })).toBe("2 de 5 perguntas respondidas");
    expect(formatInProgressProgress({ answeredQuestionCount: 0, questionCount: 0 })).toBe("Perguntas ainda não geradas");
  });
});

describe("resolveNewInterviewGate (UX preventiva da regra V1)", () => {
  it("sem entrevista em andamento: não bloqueia", () => {
    expect(resolveNewInterviewGate([])).toEqual({ blocked: false });
  });
  it("só CANCELLED existe (lista do Back sem IN_PROGRESS) e o rascunho local já foi descartado: gate não aparece",() => {
    const entries = mergeInProgressEntries({ server: [], localInterviewId: null, localActive: false });
    expect(resolveNewInterviewGate(entries)).toEqual({ blocked: false });
  });
  it("com a única IN_PROGRESS do Back: bloqueia e oferece continuar essa entrevista", () => {
    const entries = mergeInProgressEntries({ server: [item("a")], localInterviewId: "a", localActive: true });
    expect(resolveNewInterviewGate(entries)).toEqual({ blocked: true, resume: { source: "server", interviewId: "a" } });
  });
  it("lista indisponível mas com rascunho local: bloqueia e continua pelo local", () => {
    const entries = mergeInProgressEntries({ server: null, localInterviewId: "x", localActive: true });
    expect(resolveNewInterviewGate(entries)).toEqual({ blocked: true, resume: { source: "local" } });
  });
  it("registros legados (várias): oferece a mais recente, sem esconder as demais da lista", () => {
    const entries = mergeInProgressEntries({ server: [item("novo"), item("velho")], localInterviewId: null, localActive: false });
    expect(entries).toHaveLength(2);
    expect(resolveNewInterviewGate(entries)).toEqual({ blocked: true, resume: { source: "server", interviewId: "novo" } });
  });
});
