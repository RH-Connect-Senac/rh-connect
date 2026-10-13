/**
 * Regras PURAS de apresentação da tela de avaliação (Fase 5C.3-UX).
 *
 * Navegação pergunta a pergunta e aparência dos controles de nota. Nada aqui
 * toca em dados persistidos: navegar entre perguntas não salva nem altera
 * notas, e nenhum valor calculado aqui é enviado ao backend.
 */

import {
  EVALUATION_CRITERIA,
  parseScoreInput,
  type EvaluationFormState,
} from "./evaluator-evaluation-form";

// Notas clicáveis do controle principal (inteiros). 0 e decimais entram pelo
// campo numérico complementar, que aceita o mesmo intervalo do backend (0–10).
export const SCORE_BUTTONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function clampQuestionIndex(index: number, total: number): number {
  if (!Number.isFinite(index) || total <= 0) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), total - 1);
}

export function canGoPrevious(index: number, total: number): boolean {
  return total > 0 && clampQuestionIndex(index, total) > 0;
}

export function canGoNext(index: number, total: number): boolean {
  return total > 0 && clampQuestionIndex(index, total) < total - 1;
}

export function previousQuestionIndex(index: number, total: number): number {
  return clampQuestionIndex(index - 1, total);
}

export function nextQuestionIndex(index: number, total: number): number {
  return clampQuestionIndex(index + 1, total);
}

// Cabeçalho da tela de avaliação. Desktop: "Avaliando: <nome>" + vaga. Mobile
// (cabeçalho disputa espaço com menu/sino/avatar): título curto + progresso;
// o nome completo e a vaga aparecem no conteúdo (ver JobContextSummary).
export function evaluationHeader(input: {
  isMobile: boolean;
  candidateName: string | null;
  jobTitle: string | null;
  questionIndex: number;
  totalQuestions: number;
}): { title: string; subtitle: string; showProgressBadge: boolean } {
  const { candidateName, jobTitle } = input;
  if (candidateName === null || jobTitle === null) {
    return { title: "Avaliação", subtitle: "Avaliação da entrevista", showProgressBadge: false };
  }
  if (input.isMobile) {
    return {
      title: "Avaliação",
      subtitle: questionProgressLabel(input.questionIndex, input.totalQuestions),
      showProgressBadge: false,
    };
  }
  return {
    title: `Avaliando: ${candidateName}`,
    subtitle: jobTitle,
    showProgressBadge: input.totalQuestions > 0,
  };
}

export function questionProgressLabel(index: number, total: number): string {
  if (total <= 0) return "Sem perguntas";
  return `Questão ${clampQuestionIndex(index, total) + 1} de ${total}`;
}

export function questionProgressPercent(index: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(((clampQuestionIndex(index, total) + 1) / total) * 100);
}

export type ScoreTone = "none" | "low" | "mid" | "high";

export function scoreTone(value: number | null): ScoreTone {
  if (value === null) return "none";
  if (value >= 8) return "high";
  if (value >= 6) return "mid";
  return "low";
}

// Nota interpretada do texto digitado/clicado; texto vazio ou inválido = null.
export function currentScore(text: string): number | null {
  const parsed = parseScoreInput(text);
  return parsed.kind === "ok" ? parsed.value : null;
}

// Botão `n` fica preenchido quando a nota atual o alcança (7,5 preenche 1–7).
export function isScoreButtonFilled(n: number, value: number | null): boolean {
  return value !== null && value >= n;
}

// Botão `n` é a seleção EXATA (nota inteira igual a n).
export function isScoreButtonSelected(n: number, value: number | null): boolean {
  return value !== null && value === n;
}

export function formatScore(value: number | null): string {
  return value === null ? "—" : `${String(value).replace(".", ",")}/10`;
}

// Quantos dos 7 critérios têm nota válida no formulário atual.
export function countScoredCriteria(form: EvaluationFormState): number {
  return EVALUATION_CRITERIA.filter(
    (criterion) => currentScore(form.scores[criterion.key]) !== null,
  ).length;
}
