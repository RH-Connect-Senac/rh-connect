/**
 * Regras PURAS da revisão e da conclusão da avaliação (Fase 5C.3).
 *
 * O backend decide o resultado final; aqui só se decide se a tela pode oferecer
 * "Revisar avaliação"/"Concluir avaliação" e como mostrar a conferência. A
 * média da revisão é apenas para conferência e nunca é enviada.
 */

import {
  EVALUATION_CRITERIA,
  previewOverallScore,
  validateForm,
  type CriteriaScores,
  type CriterionKey,
  type EvaluationDraft,
  type EvaluationFormState,
} from "./evaluator-evaluation-form";
import { currentScore } from "./evaluator-evaluation-view";

export type ReviewReadiness = {
  ready: boolean;
  missingCriteria: CriterionKey[];
  missingSummary: boolean;
  hasErrors: boolean;
};

// Formulário digitado: os 7 critérios com nota válida (0–10), comentário não
// vazio e nenhum erro de validação.
export function reviewReadiness(
  form: EvaluationFormState,
  persisted: CriteriaScores,
): ReviewReadiness {
  const validation = validateForm(form, persisted);
  const missingCriteria = EVALUATION_CRITERIA.filter(
    (criterion) => currentScore(form.scores[criterion.key]) === null,
  ).map((criterion) => criterion.key);
  const missingSummary = form.summary.trim() === "";
  const hasErrors = !validation.valid;
  return {
    ready: missingCriteria.length === 0 && !missingSummary && !hasErrors,
    missingCriteria,
    missingSummary,
    hasErrors,
  };
}

export type ReviewRow = { key: CriterionKey; label: string; score: number | null };

export function reviewRows(scores: CriteriaScores): ReviewRow[] {
  return EVALUATION_CRITERIA.map((criterion) => {
    const value = scores[criterion.key];
    return {
      key: criterion.key,
      label: criterion.label,
      score: typeof value === "number" && Number.isFinite(value) ? value : null,
    };
  });
}

// Rascunho vindo do servidor completo o bastante para concluir?
export function draftReadiness(draft: EvaluationDraft): ReviewReadiness {
  const missingCriteria = reviewRows(draft.criteriaScores)
    .filter((row) => row.score === null)
    .map((row) => row.key);
  const missingSummary = (draft.summary ?? "").trim() === "";
  return {
    ready: draft.status === "DRAFT" && missingCriteria.length === 0 && !missingSummary,
    missingCriteria,
    missingSummary,
    hasErrors: false,
  };
}

// Média de CONFERÊNCIA (mesma regra do Back; só leitura, nunca enviada).
export function reviewAverage(scores: CriteriaScores): number | null {
  return previewOverallScore(scores);
}

export function formatAverage(value: number | null): string {
  return value === null ? "—" : value.toFixed(1).replace(".", ",");
}

// Dados exibidos na tela de sucesso (vindos do response do POST + contexto da
// revisão, passados pela navegação). Nada é recarregado do GET ativo.
export type CompletionNavState = {
  interviewId: string;
  candidateName: string;
  jobTitle: string;
  overallScore: number | null;
  completedAt: string | null;
};

export function parseCompletionNavState(
  raw: unknown,
  routeInterviewId: string | undefined,
): CompletionNavState | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.interviewId !== "string" || item.interviewId !== routeInterviewId) return null;
  if (typeof item.candidateName !== "string" || typeof item.jobTitle !== "string") return null;
  return {
    interviewId: item.interviewId,
    candidateName: item.candidateName,
    jobTitle: item.jobTitle,
    overallScore:
      typeof item.overallScore === "number" && Number.isFinite(item.overallScore)
        ? item.overallScore
        : null,
    completedAt: typeof item.completedAt === "string" ? item.completedAt : null,
  };
}
