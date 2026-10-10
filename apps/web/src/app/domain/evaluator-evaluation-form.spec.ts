import { describe, expect, it, vi } from "vitest";
import {
  EVALUATION_CRITERIA,
  MAX_SUMMARY_LENGTH,
  buildDraftPayload,
  canSubmit,
  emptyForm,
  formFromDraft,
  isDirty,
  parseScoreInput,
  previewOverallScore,
  runSaveDraft,
  summaryLength,
  validateForm,
  type EvaluationDraft,
} from "./evaluator-evaluation-form";

const ID = "11111111-1111-4111-8111-111111111111";

const draft = (over: Partial<EvaluationDraft> = {}): EvaluationDraft => ({
  interviewId: ID,
  status: "DRAFT",
  criteriaScores: {},
  summary: null,
  overallScore: null,
  updatedAt: null,
  ...over,
});

describe("critérios canônicos", () => {
  it("são os 7 do Back, com chaves persistidas estáveis e rótulos em português", () => {
    expect(EVALUATION_CRITERIA.map((c) => c.key)).toEqual([
      "clarity",
      "coherence",
      "objectivity",
      "domain_knowledge",
      "organization",
      "requirements_alignment",
      "examples",
    ]);
    expect(EVALUATION_CRITERIA.map((c) => c.label)).toEqual([
      "Clareza",
      "Coerência",
      "Objetividade",
      "Domínio",
      "Organização",
      "Aderência aos requisitos",
      "Capacidade de exemplificar",
    ]);
  });
});

describe("nota por critério", () => {
  it.each([["0", 0], ["10", 10], ["7", 7], ["7.5", 7.5], ["7,5", 7.5], [" 8 ", 8], ["10.0", 10], ["0,25", 0.25]])(
    "aceita %s",
    (raw, value) => {
      expect(parseScoreInput(raw)).toEqual({ kind: "ok", value });
    },
  );

  it.each([["-1"], ["-0,1"], ["10.1"], ["11"], ["100"], ["abc"], ["1e3"], ["7,5,2"], ["NaN"], ["Infinity"], ["7."]])(
    "rejeita %s sem converter em nota válida",
    (raw) => {
      expect(parseScoreInput(raw).kind).toBe("invalid");
    },
  );

  it("vazio não é erro nem nota", () => {
    expect(parseScoreInput("")).toEqual({ kind: "empty" });
    expect(parseScoreInput("   ")).toEqual({ kind: "empty" });
  });
});

describe("validação do formulário", () => {
  it("nota abaixo de 0 e acima de 10 bloqueiam o envio", () => {
    const form = emptyForm();
    form.scores.clarity = "-1";
    form.scores.coherence = "10.5";

    const result = validateForm(form, {});

    expect(result.valid).toBe(false);
    expect(Object.keys(result.scoreErrors).sort()).toEqual(["clarity", "coherence"]);
    expect(result.parsedScores).toEqual({});
  });

  it("decimal e extremos 0 e 10 são aceitos", () => {
    const form = emptyForm();
    form.scores.clarity = "0";
    form.scores.coherence = "10";
    form.scores.objectivity = "7,5";

    const result = validateForm(form, {});

    expect(result.valid).toBe(true);
    expect(result.parsedScores).toEqual({ clarity: 0, coherence: 10, objectivity: 7.5 });
  });

  it("comentário: 2000 caracteres passa e 2001 bloqueia; emoji conta como 1", () => {
    const ok = emptyForm();
    ok.summary = "a".repeat(MAX_SUMMARY_LENGTH);
    expect(validateForm(ok, {}).valid).toBe(true);

    const over = emptyForm();
    over.summary = "a".repeat(MAX_SUMMARY_LENGTH + 1);
    const result = validateForm(over, {});
    expect(result.valid).toBe(false);
    expect(result.summaryError).toMatch(/2000/);

    expect(summaryLength("😀".repeat(2000))).toBe(2000);
    const emoji = emptyForm();
    emoji.summary = "😀".repeat(2000);
    expect(validateForm(emoji, {}).valid).toBe(true);
  });

  it("não deixa apagar nota já salva (o Back não remove critério)", () => {
    const form = emptyForm();
    form.scores.clarity = "";

    const result = validateForm(form, { clarity: 8 });

    expect(result.valid).toBe(false);
    expect(result.scoreErrors.clarity).toMatch(/não pode ser apagada/);
  });

  it("comentário vazio é válido (DRAFT)", () => {
    expect(validateForm(emptyForm(), {}).valid).toBe(true);
  });
});

describe("estado do formulário vindo do Back", () => {
  it("valores persistidos e comentário reaparecem exatamente como salvos", () => {
    const form = formFromDraft(
      draft({
        criteriaScores: { clarity: 8, coherence: 7.5 },
        summary: "Linha 1\n\nLinha 3",
      }),
    );

    expect(form.scores.clarity).toBe("8");
    expect(form.scores.coherence).toBe("7.5");
    expect(form.scores.objectivity).toBe("");
    expect(form.summary).toBe("Linha 1\n\nLinha 3");
  });

  it("rascunho vazio gera formulário vazio (sem mock)", () => {
    expect(formFromDraft(draft())).toEqual(emptyForm());
  });

  it("isDirty compara com o último retrato do Back", () => {
    const saved = formFromDraft(draft({ criteriaScores: { clarity: 8 }, summary: "x" }));
    expect(isDirty(saved, saved)).toBe(false);

    const edited = { ...saved, scores: { ...saved.scores, clarity: "9" } };
    expect(isDirty(edited, saved)).toBe(true);
    expect(isDirty({ ...saved, summary: "x\n" }, saved)).toBe(true);
  });
});

describe("prévia da nota geral (mesma regra do Back)", () => {
  it("média só dos preenchidos, 1 casa; null sem critérios", () => {
    expect(previewOverallScore({})).toBeNull();
    expect(previewOverallScore({ clarity: 8, coherence: 7 })).toBe(7.5);
    expect(previewOverallScore({ clarity: 10, coherence: 9, examples: 9 })).toBe(9.3);
    expect(previewOverallScore({ clarity: 7.25 })).toBe(7.3);
  });
});

describe("payload do PUT", () => {
  it("só criteriaScores e summary; nunca status, nota final ou avaliador", () => {
    const form = emptyForm();
    form.scores.clarity = "8";
    form.summary = "Texto\ncom quebra";

    const payload = buildDraftPayload(form, validateForm(form, {}).parsedScores);

    expect(payload).toEqual({ criteriaScores: { clarity: 8 }, summary: "Texto\ncom quebra" });
    expect(Object.keys(payload).sort()).toEqual(["criteriaScores", "summary"]);
  });
});

describe("trava de duplo clique", () => {
  it("não envia enquanto salva, sem alteração ou com erro", () => {
    expect(canSubmit({ saving: false, dirty: true, valid: true })).toBe(true);
    expect(canSubmit({ saving: true, dirty: true, valid: true })).toBe(false);
    expect(canSubmit({ saving: false, dirty: false, valid: true })).toBe(false);
    expect(canSubmit({ saving: false, dirty: true, valid: false })).toBe(false);
  });
});

describe("salvar rascunho (runSaveDraft)", () => {
  const filled = () => {
    const form = emptyForm();
    form.scores.clarity = "8";
    form.scores.coherence = "7,5";
    form.summary = "Parecer\nem duas linhas";
    return form;
  };

  it("envia o PUT parcial e devolve o formulário do que o Back respondeu (overallScore do Back)", async () => {
    const save = vi.fn().mockResolvedValue({
      ok: true,
      data: draft({
        criteriaScores: { clarity: 8, coherence: 7.5 },
        summary: "Parecer\nem duas linhas",
        overallScore: 7.8,
      }),
    });

    const outcome = await runSaveDraft({ interviewId: ID, form: filled(), persisted: {}, save });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBe(ID);
    expect(save.mock.calls[0][1]).toEqual({
      criteriaScores: { clarity: 8, coherence: 7.5 },
      summary: "Parecer\nem duas linhas",
    });
    expect(outcome.kind).toBe("saved");
    if (outcome.kind === "saved") {
      expect(outcome.draft.overallScore).toBe(7.8);
      expect(outcome.form.scores.coherence).toBe("7.5");
      expect(outcome.form.summary).toBe("Parecer\nem duas linhas");
    }
  });

  it("formulário inválido não chama a API", async () => {
    const save = vi.fn();
    const form = filled();
    form.scores.clarity = "11";

    const outcome = await runSaveDraft({ interviewId: ID, form, persisted: {}, save });

    expect(outcome.kind).toBe("invalid");
    expect(save).not.toHaveBeenCalled();
  });

  it("erro do save devolve só a mensagem; o formulário digitado segue intacto com o chamador", async () => {
    const save = vi.fn().mockResolvedValue({ ok: false, message: "Não foi possível salvar o rascunho. Tente novamente." });
    const form = filled();
    const snapshot = JSON.stringify(form);

    const outcome = await runSaveDraft({ interviewId: ID, form, persisted: {}, save });

    expect(outcome).toEqual({ kind: "error", message: "Não foi possível salvar o rascunho. Tente novamente." });
    expect(JSON.stringify(form)).toBe(snapshot);
  });

  it("reabrir: o que o Back guardou volta a preencher o formulário", async () => {
    const stored = draft({ criteriaScores: { clarity: 8, coherence: 7.5 }, summary: "Comentário", overallScore: 7.8 });
    const reopened = formFromDraft(stored);

    expect(reopened.scores.clarity).toBe("8");
    expect(reopened.scores.coherence).toBe("7.5");
    expect(reopened.summary).toBe("Comentário");
    expect(isDirty(reopened, reopened)).toBe(false);
  });
});
