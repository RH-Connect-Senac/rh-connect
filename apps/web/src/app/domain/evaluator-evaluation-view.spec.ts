import { describe, expect, it } from "vitest";
import {
  SCORE_BUTTONS,
  canGoNext,
  canGoPrevious,
  clampQuestionIndex,
  countScoredCriteria,
  currentScore,
  formatScore,
  isScoreButtonFilled,
  isScoreButtonSelected,
  nextQuestionIndex,
  previousQuestionIndex,
  questionProgressLabel,
  questionProgressPercent,
  scoreTone,
  evaluationHeader,
} from "./evaluator-evaluation-view";
import { emptyForm } from "./evaluator-evaluation-form";

describe("navegação entre perguntas", () => {
  it("clampQuestionIndex limita ao intervalo válido", () => {
    expect(clampQuestionIndex(-3, 5)).toBe(0);
    expect(clampQuestionIndex(2, 5)).toBe(2);
    expect(clampQuestionIndex(9, 5)).toBe(4);
    expect(clampQuestionIndex(1, 0)).toBe(0);
    expect(clampQuestionIndex(Number.NaN, 5)).toBe(0);
  });

  it("Anterior bloqueado na primeira; Próxima bloqueada na última", () => {
    expect(canGoPrevious(0, 5)).toBe(false);
    expect(canGoPrevious(1, 5)).toBe(true);
    expect(canGoNext(4, 5)).toBe(false);
    expect(canGoNext(3, 5)).toBe(true);
    expect(canGoPrevious(0, 0)).toBe(false);
    expect(canGoNext(0, 0)).toBe(false);
    expect(canGoNext(0, 1)).toBe(false);
  });

  it("anterior/próxima nunca saem do intervalo", () => {
    expect(previousQuestionIndex(0, 5)).toBe(0);
    expect(previousQuestionIndex(3, 5)).toBe(2);
    expect(nextQuestionIndex(4, 5)).toBe(4);
    expect(nextQuestionIndex(1, 5)).toBe(2);
  });

  it("rótulo 'Questão X de Y' e progresso", () => {
    expect(questionProgressLabel(0, 5)).toBe("Questão 1 de 5");
    expect(questionProgressLabel(2, 5)).toBe("Questão 3 de 5");
    expect(questionProgressLabel(0, 0)).toBe("Sem perguntas");
    expect(questionProgressPercent(0, 5)).toBe(20);
    expect(questionProgressPercent(4, 5)).toBe(100);
    expect(questionProgressPercent(0, 0)).toBe(0);
  });
});

describe("aparência dos controles de nota", () => {
  it("10 botões inteiros de 1 a 10", () => {
    expect([...SCORE_BUTTONS]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("currentScore interpreta inteiro, decimal e vírgula; vazio/inválido = null", () => {
    expect(currentScore("8")).toBe(8);
    expect(currentScore("7,5")).toBe(7.5);
    expect(currentScore("7.5")).toBe(7.5);
    expect(currentScore("0")).toBe(0);
    expect(currentScore("")).toBeNull();
    expect(currentScore("11")).toBeNull();
    expect(currentScore("abc")).toBeNull();
  });

  it("botão preenchido até a nota; seleção exata só para inteiro", () => {
    expect(isScoreButtonFilled(7, 7.5)).toBe(true);
    expect(isScoreButtonFilled(8, 7.5)).toBe(false);
    expect(isScoreButtonSelected(7, 7.5)).toBe(false);
    expect(isScoreButtonSelected(8, 8)).toBe(true);
    expect(isScoreButtonFilled(1, null)).toBe(false);
    expect(isScoreButtonFilled(1, 0)).toBe(false);
  });

  it("tom por faixa e formatação", () => {
    expect(scoreTone(null)).toBe("none");
    expect(scoreTone(5.9)).toBe("low");
    expect(scoreTone(6)).toBe("mid");
    expect(scoreTone(8)).toBe("high");
    expect(formatScore(null)).toBe("—");
    expect(formatScore(7.5)).toBe("7,5/10");
    expect(formatScore(8)).toBe("8/10");
  });

  it("countScoredCriteria conta só notas válidas", () => {
    const form = emptyForm();
    form.scores.clarity = "8";
    form.scores.coherence = "7,5";
    form.scores.objectivity = "99";
    form.scores.examples = "";
    expect(countScoredCriteria(form)).toBe(2);
  });
});

describe("evaluationHeader (desktop x mobile)", () => {
  const base = { candidateName: "Lucas Gabriel Costa Coutinho", jobTitle: "Assistente de TI", questionIndex: 1, totalQuestions: 5 };
  it("desktop: 'Avaliando: <nome completo>' + vaga e badge de progresso", () => {
    expect(evaluationHeader({ ...base, isMobile: false })).toEqual({
      title: "Avaliando: Lucas Gabriel Costa Coutinho",
      subtitle: "Assistente de TI",
      showProgressBadge: true,
    });
  });
  it("mobile: título curto + 'Questão X de Y', sem nome no cabeçalho e sem badge duplicado", () => {
    const header = evaluationHeader({ ...base, isMobile: true });
    expect(header).toEqual({ title: "Avaliação", subtitle: "Questão 2 de 5", showProgressBadge: false });
    expect(JSON.stringify(header)).not.toContain("Lucas");
  });
  it("sem dados carregados: título neutro nos dois", () => {
    for (const isMobile of [true, false]) {
      expect(evaluationHeader({ ...base, candidateName: null, jobTitle: null, isMobile }).title).toBe("Avaliação");
    }
  });
});
