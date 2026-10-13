import { describe, expect, it } from "vitest";
import {
  draftReadiness,
  formatAverage,
  parseCompletionNavState,
  reviewAverage,
  reviewReadiness,
  reviewRows,
} from "./evaluator-review";
import {
  EVALUATION_CRITERIA,
  emptyForm,
  type CriteriaScores,
  type EvaluationDraft,
  type EvaluationFormState,
} from "./evaluator-evaluation-form";

const ID = "11111111-1111-4111-8111-111111111111";

function fullForm(value = "8", summary = "Bom candidato"): EvaluationFormState {
  const form = emptyForm();
  for (const criterion of EVALUATION_CRITERIA) form.scores[criterion.key] = value;
  form.summary = summary;
  return form;
}

function fullScores(value = 8): CriteriaScores {
  const scores: CriteriaScores = {};
  for (const criterion of EVALUATION_CRITERIA) scores[criterion.key] = value;
  return scores;
}

const draft = (over: Partial<EvaluationDraft> = {}): EvaluationDraft => ({
  interviewId: ID,
  status: "DRAFT",
  criteriaScores: fullScores(),
  summary: "ok",
  overallScore: 8,
  updatedAt: null,
  ...over,
});

describe("reviewReadiness (formulário de edição)", () => {
  it("7 critérios válidos + comentário: pronto", () => {
    expect(reviewReadiness(fullForm(), {}).ready).toBe(true);
  });
  it("aceita 0 e 10 e decimais com vírgula", () => {
    expect(reviewReadiness(fullForm("0"), {}).ready).toBe(true);
    expect(reviewReadiness(fullForm("10"), {}).ready).toBe(true);
    expect(reviewReadiness(fullForm("7,5"), {}).ready).toBe(true);
  });
  it("falta um critério: não pronto e aponta qual", () => {
    const form = fullForm();
    form.scores.clarity = "";
    const r = reviewReadiness(form, {});
    expect(r.ready).toBe(false);
    expect(r.missingCriteria).toEqual(["clarity"]);
  });
  it("comentário vazio ou só espaços: não pronto", () => {
    expect(reviewReadiness(fullForm("8", ""), {}).ready).toBe(false);
    const r = reviewReadiness(fullForm("8", "   \n "), {});
    expect(r.ready).toBe(false);
    expect(r.missingSummary).toBe(true);
  });
  it("nota inválida (11, -1, texto): não pronto", () => {
    for (const bad of ["11", "-1", "abc"]) {
      const form = fullForm();
      form.scores.coherence = bad;
      expect(reviewReadiness(form, {}).ready).toBe(false);
    }
  });
  it("formulário vazio: não pronto", () => {
    expect(reviewReadiness(emptyForm(), {}).ready).toBe(false);
  });
});

describe("draftReadiness (rascunho do servidor)", () => {
  it("completo e DRAFT: pronto", () => {
    expect(draftReadiness(draft()).ready).toBe(true);
  });
  it("sem comentário, com critério faltando ou já concluído: não pronto", () => {
    expect(draftReadiness(draft({ summary: null })).ready).toBe(false);
    expect(draftReadiness(draft({ summary: "  " })).ready).toBe(false);
    expect(draftReadiness(draft({ criteriaScores: { clarity: 8 } })).ready).toBe(false);
    expect(draftReadiness(draft({ status: "COMPLETED" as never })).ready).toBe(false);
  });
});

describe("conferência", () => {
  it("reviewRows lista os 7 critérios canônicos na ordem", () => {
    const rows = reviewRows({ clarity: 8 });
    expect(rows.map((r) => r.key)).toEqual(EVALUATION_CRITERIA.map((c) => c.key));
    expect(rows).toHaveLength(7);
    expect(rows[0].score).toBe(8);
    expect(rows[1].score).toBeNull();
  });
  it("média de conferência é a simples e formata com vírgula", () => {
    expect(reviewAverage(fullScores(8))).toBe(8);
    expect(formatAverage(7.8)).toBe("7,8");
    expect(formatAverage(null)).toBe("—");
  });
});

describe("parseCompletionNavState", () => {
  const raw = { interviewId: ID, candidateName: "Maria", jobTitle: "Vaga", overallScore: 7.8, completedAt: "2026-10-10T13:00:00.000Z" };
  it("aceita estado válido da mesma entrevista", () => {
    expect(parseCompletionNavState(raw, ID)).toEqual(raw);
  });
  it("rejeita ausente, de outra entrevista ou malformado", () => {
    expect(parseCompletionNavState(null, ID)).toBeNull();
    expect(parseCompletionNavState(raw, "outro")).toBeNull();
    expect(parseCompletionNavState({ ...raw, candidateName: 3 }, ID)).toBeNull();
  });
  it("nota/data ausentes viram null", () => {
    expect(parseCompletionNavState({ ...raw, overallScore: "x", completedAt: 5 }, ID)).toMatchObject({
      overallScore: null,
      completedAt: null,
    });
  });
});
