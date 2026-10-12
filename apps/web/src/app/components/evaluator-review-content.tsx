/** RH Connect — Revisão e sucesso da avaliação humana (Fase 5C.3)
 *
 * Apresentação pura. Recebe os dados REAIS (GET detalhe + GET rascunho) e os
 * callbacks do container (`evaluator-real-screens.tsx`). A média exibida é só
 * conferência: a conclusão não envia nota, critérios nem comentário — o Back
 * lê o rascunho do banco e recalcula a nota final.
 */

import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown } from "lucide-react";
import { Alert } from "./ui/alert";
import { EmptyState } from "./ui/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  BUTTON_CLASS,
  CARD_CLASS,
  ErrorBlock,
  LoadingBlock,
  formatDateTimePtBr,
  formatQuestionType,
} from "./evaluator-real-content";
import type { EvaluationDraft } from "../domain/evaluator-evaluation-form";
import { formatScore } from "../domain/evaluator-evaluation-view";
import {
  draftReadiness,
  formatAverage,
  reviewAverage,
  reviewRows,
  type ReviewRow,
  type CompletionNavState,
} from "../domain/evaluator-review";
import type { CompletionSnapshot } from "../domain/evaluator-completion-flow";
import type { EvaluatorInterviewDetail } from "../services/evaluator-interviews-service";

export type ReviewScreenState =
  | { status: "loading" }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; interview: EvaluatorInterviewDetail; draft: EvaluationDraft };

export type ReviewUi = {
  completion: CompletionSnapshot;
  onBackToEdit: () => void;
  onBackToQueue: () => void;
  onRequestConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirm: () => void;
  onRetry?: () => void;
};

export const CONFIRM_TITLE = "Concluir avaliação?";
export const CONFIRM_DESCRIPTION =
  "Após a conclusão, esta avaliação será finalizada e não poderá mais ser editada.";

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

// Mensagem clara por tipo de falha da conclusão.
export function completionErrorText(
  error: NonNullable<CompletionSnapshot["error"]>,
): { message: string; hint: "edit" | "queue" | "retry" } {
  switch (error.reason) {
    case "invalid":
      return { message: error.message, hint: "edit" };
    case "not_found":
      return { message: "Entrevista não encontrada ou indisponível.", hint: "queue" };
    case "conflict":
      return {
        message:
          "O estado desta avaliação mudou (talvez já tenha sido concluída). Volte para a fila ou recarregue.",
        hint: "queue",
      };
    default:
      return { message: error.message, hint: "retry" };
  }
}

export function CompleteConfirmDialog({
  open,
  submitting,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Enquanto envia, o diálogo não fecha (sem cancelar a conclusão em curso).
        if (!next && !submitting) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{CONFIRM_TITLE}</AlertDialogTitle>
          <AlertDialogDescription>{CONFIRM_DESCRIPTION}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting} onClick={onCancel}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting}
            aria-busy={submitting ? "true" : "false"}
            onClick={(event: { preventDefault: () => void }) => {
              // Mantém o diálogo aberto até o POST terminar.
              event.preventDefault();
              if (!submitting) onConfirm();
            }}
          >
            {submitting ? "Concluindo..." : "Concluir avaliação"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Largura da barra: a nota real (0–10) em % da escala. Sem pesos: só apoio visual.
export function barPercent(score: number | null): number {
  if (score === null || !Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score * 10)));
}

// Cor só como apoio visual (o número sempre aparece em texto); não é aprovação/reprovação.
function barColor(score: number | null): string {
  if (score === null) return "bg-muted-foreground/30";
  return score < 5 ? "bg-amber-500" : "bg-blue-500";
}

export function CompactQuestions({
  interview,
}: {
  interview: Pick<EvaluatorInterviewDetail, "questions">;
}) {
  if (interview.questions.length === 0) return null;
  return (
    <section className={`${CARD_CLASS} p-5 sm:p-6`} aria-label="Perguntas e respostas">
      <h3 className="mb-4 font-bold text-foreground">Perguntas e respostas</h3>
      <ol className="space-y-2">
        {interview.questions.map((question, index) => {
          const answered = Boolean(question.answer && question.answer.trim() !== "");
          return (
            <li key={question.id}>
              <details className="group rounded-xl border border-border bg-white text-sm">
                <summary className="flex cursor-pointer list-none items-start gap-3 rounded-xl px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
                  <span
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-foreground">
                      <span className="sr-only">Pergunta {index + 1}: </span>
                      {question.text}
                    </span>
                    <span className="mt-1 inline-block rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      {formatQuestionType(question.type)}
                    </span>
                  </span>
                  <ChevronDown
                    className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <div className="border-t border-border px-3 pb-3 pt-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      Resposta do candidato
                    </p>
                    {answered ? (
                      <p className="whitespace-pre-wrap break-words text-foreground">{question.answer}</p>
                    ) : (
                      <p className="italic text-muted-foreground">Sem resposta registrada.</p>
                    )}
                  </div>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Bloco de resultado (média, critérios e comentário) compartilhado entre a
// revisão (editável, antes de concluir) e o histórico (somente leitura). Só
// apresentação: não conhece conclusão, autosave nem diálogo de confirmação.
export function ReviewSummarySections({
  rows,
  average,
  summary,
  averageLabel,
  note,
}: {
  rows: ReviewRow[];
  average: number | null;
  summary: string | null;
  averageLabel: string;
  note: string | null;
}) {
  return (
    <>
      <section className={`${CARD_CLASS} p-5 sm:p-6`} aria-label="Resumo da avaliação">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-bold text-foreground">Resumo da avaliação</h3>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-3 text-center sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {averageLabel}
            </p>
            <p className="text-primary">
              <span className="text-4xl font-bold" data-testid="review-average">
                {formatAverage(average)}
              </span>
              {average !== null && <span className="ml-1 text-base font-semibold"> / 10</span>}
            </p>
          </div>
        </div>
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.key} data-criterion={row.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 font-medium text-foreground">{row.label}</span>
                <span
                  className="shrink-0 whitespace-nowrap font-bold text-foreground"
                  data-testid={`review-score-${row.key}`}
                >
                  {formatScore(row.score)}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${row.label}: ${row.score === null ? "sem nota" : `${formatScore(row.score)}`}`}
                aria-valuemin={0}
                aria-valuemax={10}
                aria-valuenow={row.score ?? undefined}
                aria-valuetext={row.score === null ? "sem nota" : formatScore(row.score)}
                className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
              >
                <div
                  data-testid={`review-bar-${row.key}`}
                  data-percent={barPercent(row.score)}
                  className={`h-full rounded-full ${barColor(row.score)}`}
                  style={{ width: `${barPercent(row.score)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
        {note && (
          <p className="mt-5 border-t border-border pt-3 text-xs text-muted-foreground">{note}</p>
        )}
      </section>

      <section className={`${CARD_CLASS} p-5 sm:p-6`} aria-label="Comentário do avaliador">
        <h3 className="mb-3 font-bold text-foreground">Comentário do avaliador</h3>
        {/* Leitura (não é campo): faixa lateral azul + fundo suave, como os destaques das páginas legais. */}
        <div
          className="rounded-xl border border-l-4 border-blue-100 border-l-primary bg-blue-50/60 p-4 sm:p-5"
          data-testid="review-comment-block"
        >
          <p
            className="whitespace-pre-wrap break-words text-base leading-relaxed text-foreground"
            data-testid="review-summary"
          >
            {summary && summary.trim() !== "" ? summary : "Sem comentário."}
          </p>
        </div>
      </section>
    </>
  );
}

export function EvaluatorReviewContent({
  state,
  ui,
}: {
  state: ReviewScreenState;
  ui: ReviewUi;
}) {
  const backToQueue = (
    <button type="button" className={BUTTON_CLASS} onClick={ui.onBackToQueue}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      Voltar para a fila
    </button>
  );

  if (state.status === "loading") {
    return <LoadingBlock label="Carregando revisão da avaliação..." />;
  }
  if (state.status === "not_found") {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Entrevista não encontrada ou indisponível"
        description={state.message}
        className="p-12"
        action={
          <button type="button" className={BUTTON_CLASS} onClick={ui.onBackToQueue}>
            Voltar para a fila
          </button>
        }
      />
    );
  }
  if (state.status === "error") {
    return (
      <div className="space-y-4">
        <ErrorBlock message={state.message} onRetry={ui.onRetry} />
        <div>{backToQueue}</div>
      </div>
    );
  }

  const { interview, draft } = state;
  const readiness = draftReadiness(draft);
  const rows = reviewRows(draft.criteriaScores);
  const average = reviewAverage(draft.criteriaScores);
  const { phase, error } = ui.completion;
  const submitting = phase === "submitting";
  const failure = phase === "error" && error ? completionErrorText(error) : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Revisar avaliação</h2>
        <p className="text-sm font-medium text-foreground" data-testid="review-subtitle">
          {interview.candidate.name} · {interview.context.title}
        </p>
        {interview.context.company && (
          <p className="text-xs text-muted-foreground">{interview.context.company}</p>
        )}
      </header>

      <ReviewSummarySections
        rows={rows}
        average={average}
        summary={draft.summary}
        averageLabel="Média prevista"
        note="A média exibida é apenas para conferência. A nota final é calculada pelo servidor ao concluir."
      />

      <CompactQuestions interview={interview} />

      {!readiness.ready && (
        <Alert variant="error" role="alert" className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            A avaliação está incompleta. Volte e preencha os 7 critérios e o comentário para
            concluir.
          </p>
        </Alert>
      )}

      {failure && (
        <Alert variant="error" role="alert" className="flex items-start gap-2" data-testid="completion-error">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{failure.message}</p>
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            data-action="back-to-edit"
            className={`${BUTTON_CLASS} justify-center disabled:cursor-not-allowed disabled:opacity-50`}
            disabled={submitting}
            onClick={ui.onBackToEdit}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar e editar
          </button>
          {failure && failure.hint === "queue" && (
            <button
              type="button"
              data-action="back-to-queue"
              className={`${BUTTON_CLASS} justify-center`}
              onClick={ui.onBackToQueue}
            >
              Voltar para a fila
            </button>
          )}
        </div>
        <button
          type="button"
          data-action="complete"
          className={`${PRIMARY_BUTTON_CLASS} px-6 py-2.5`}
          disabled={!readiness.ready || submitting}
          aria-busy={submitting ? "true" : "false"}
          onClick={ui.onRequestConfirm}
        >
          {submitting ? "Concluindo..." : "Concluir avaliação"}
        </button>
      </div>

      <CompleteConfirmDialog
        open={phase === "confirming" || phase === "submitting"}
        submitting={submitting}
        onCancel={ui.onCancelConfirm}
        onConfirm={ui.onConfirm}
      />
    </div>
  );
}

export function EvaluatorSuccessContent({
  info,
  onBackToQueue,
}: {
  // null: tela aberta sem o contexto da conclusão (ex.: recarregou a página).
  info: CompletionNavState | null;
  onBackToQueue: () => void;
}) {
  const backButton = (
    <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={onBackToQueue}>
      Voltar para a fila
    </button>
  );

  if (!info) {
    return (
      <div className={`${CARD_CLASS} mx-auto max-w-xl space-y-3 p-8 text-center`}>
        <CheckCircle2 className="mx-auto size-10 text-green-600" aria-hidden="true" />
        <h2 className="text-xl font-bold text-foreground">Avaliação concluída</h2>
        <p className="text-sm text-muted-foreground" data-testid="success-unavailable">
          Resultado indisponível nesta tela. A avaliação já foi finalizada e não aparece mais na fila.
        </p>
        <div>{backButton}</div>
      </div>
    );
  }

  return (
    <div className={`${CARD_CLASS} mx-auto max-w-xl space-y-3 p-8 text-center`}>
      <CheckCircle2 className="mx-auto size-10 text-green-600" aria-hidden="true" />
      <h2 className="text-xl font-bold text-foreground">Avaliação concluída</h2>
      <p className="text-sm text-foreground" data-testid="success-message">
        A avaliação de {info.candidateName} foi concluída com sucesso.
      </p>
      <p className="text-xs text-muted-foreground">{info.jobTitle}</p>
      {info.overallScore !== null && (
        <div>
          <p className="text-xs text-muted-foreground">Média final</p>
          <p className="text-3xl font-bold text-primary" data-testid="success-score">
            {formatAverage(info.overallScore)}
          </p>
        </div>
      )}
      {info.completedAt && (
        <p className="text-xs text-muted-foreground" data-testid="success-completed-at">
          Concluída em {formatDateTimePtBr(info.completedAt)}
        </p>
      )}
      <div>{backButton}</div>
    </div>
  );
}
