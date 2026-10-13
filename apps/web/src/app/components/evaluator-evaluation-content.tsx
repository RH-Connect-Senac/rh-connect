/** RH Connect — Conteúdo REAL da avaliação humana em rascunho (Fase 5C.2)
 *
 * Apresentação pura: recebe o estado do formulário e os callbacks do
 * container (`evaluator-real-screens.tsx`). Não importa mocks, identidade de
 * demonstração nem localStorage. Uma pergunta por vez, painel de critérios
 * clicável (sem rolagem interna). A conclusão acontece na tela de revisão (Fase 5C.3).
 */

import { AlertCircle, ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { Alert } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { EmptyState } from "./ui/empty-state";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import {
  BUTTON_CLASS,
  CARD_CLASS,
  ErrorBlock,
  LoadingBlock,
  formatDateTimePtBr,
  formatQuestionType,
  formatWorkMode,
} from "./evaluator-real-content";
import {
  EVALUATION_CRITERIA,
  MAX_SUMMARY_LENGTH,
  previewOverallScore,
  summaryLength,
  type CriterionKey,
  type EvaluationDraft,
  type EvaluationFormState,
  type FormValidation,
} from "../domain/evaluator-evaluation-form";
import { describeSync, type AutosaveStatus } from "../domain/evaluator-autosave";
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
  type ScoreTone,
} from "../domain/evaluator-evaluation-view";
import type { EvaluatorInterviewDetail } from "../services/evaluator-interviews-service";

export type EvaluationScreenState =
  | { status: "loading" }
  | { status: "not_found"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; interview: EvaluatorInterviewDetail; draft: EvaluationDraft };

export type SaveFeedback =
  | { kind: "error"; message: string }
  | null;

export type EvaluationFormUi = {
  form: EvaluationFormState;
  validation: FormValidation;
  dirty: boolean;
  saving: boolean;
  feedback: SaveFeedback;
  // Estado de sincronização do autosave (ausente = derivado de `dirty`/`saving`).
  syncStatus?: AutosaveStatus;
  lastSave?: "auto" | "manual" | null;
  // Houve cópia local (ainda não salva) aplicada ao abrir a tela.
  restoredFromLocal?: boolean;
  // Revisão (Fase 5C.3): liberada só com os 7 critérios válidos + comentário.
  canReview?: boolean;
  reviewing?: boolean;
  reviewError?: string | null;
  onReview?: () => void;
  onScoreChange: (key: CriterionKey, value: string) => void;
  onSummaryChange: (value: string) => void;
};

const TONE_FILLED: Record<ScoreTone, string> = {
  none: "bg-muted text-muted-foreground",
  low: "bg-amber-500 text-white",
  mid: "bg-blue-500 text-white",
  high: "bg-green-500 text-white",
};
const TONE_TEXT: Record<ScoreTone, string> = {
  none: "text-muted-foreground",
  low: "text-amber-600",
  mid: "text-blue-600",
  high: "text-green-600",
};

// Campos usam o <Input>/<Textarea> compartilhados (mesmo padrão de Configurações e
// Histórico: borda, foco azul, erro por aria-invalid). Aqui só o tamanho compacto
// do campo de nota; borda/foco/erro vêm do componente, nunca sobrescritos.
const SCORE_INPUT_CLASS = "w-16 bg-white px-2 py-1.5 text-center font-semibold";
const LABEL_CLASS = "mb-1.5 block text-sm font-semibold text-foreground";

function formatOverall(value: number | null): string {
  return value === null ? "—" : value.toFixed(1).replace(".", ",");
}

// Lista secundária e recolhida por padrão (contexto informa, não domina a tela).
function ExpandableList({ title, items }: { title: string; items: string[] }) {
  return (
    <details className="group rounded-xl border border-border bg-white text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
        <span>
          {title} ({items.length})
        </span>
        <ChevronDown
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ul className="list-disc space-y-1 border-t border-border px-3 pb-3 pl-8 pt-3 text-foreground">
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

// Resumo compacto da vaga; requisitos e atividades ficam em blocos expansíveis.
export function JobContextSummary({ interview }: { interview: EvaluatorInterviewDetail }) {
  const { context } = interview;
  const chips = [
    context.company,
    context.location,
    formatWorkMode(context.workMode),
    context.contractType,
  ].filter((chip): chip is string => Boolean(chip));

  return (
    <section className={`${CARD_CLASS} p-4 sm:p-5`} aria-label="Contexto da vaga">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Contexto da vaga
      </p>
      {/* Mobile/tablet pequeno: o cabeçalho é curto; aqui o candidato fica identificado. */}
      <div className="mb-2 md:hidden" data-testid="candidate-identity">
        <p className="font-bold text-foreground">{interview.candidate.name}</p>
        <p className="text-sm text-foreground">{context.title}</p>
      </div>
      <h3 className="hidden font-bold text-foreground md:block">{context.title}</h3>
      {chips.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Dados da vaga">
          {chips.map((chip) => (
            <li key={chip} className="max-w-full">
              <Badge variant="neutral" className="max-w-full" title={chip}>
                <span className="truncate">{chip}</span>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      {(context.requirements.length > 0 || context.activities.length > 0) && (
        <div className="mt-3 space-y-2">
          {context.requirements.length > 0 && (
            <ExpandableList title="Requisitos" items={context.requirements} />
          )}
          {context.activities.length > 0 && (
            <ExpandableList title="Atividades" items={context.activities} />
          )}
        </div>
      )}
    </section>
  );
}

// Uma pergunta por vez. Navegar aqui é só leitura: não salva nem muda notas.
export function QuestionPanel({
  interview,
  index,
  onChange,
}: {
  interview: EvaluatorInterviewDetail;
  index: number;
  onChange: (index: number) => void;
}) {
  const total = interview.questions.length;
  if (total === 0) {
    return (
      <section className={`${CARD_CLASS} p-5`}>
        <p className="text-sm text-muted-foreground">Nenhuma pergunta registrada.</p>
      </section>
    );
  }
  const current = clampQuestionIndex(index, total);
  const question = interview.questions[current];
  const hasAnswer = Boolean(question.answer && question.answer.trim() !== "");

  return (
    <section className={`${CARD_CLASS} p-5`} aria-label="Pergunta atual">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="primary">{formatQuestionType(question.type)}</Badge>
      </div>

      <p className="mb-4 text-base font-semibold leading-relaxed text-foreground">{question.text}</p>

      <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-700">
          Resposta do candidato
        </p>
        {hasAnswer ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
            {question.answer}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground">Sem resposta registrada.</p>
        )}
        {question.answeredAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            Respondida em {formatDateTimePtBr(question.answeredAt)}
          </p>
        )}
      </div>

      {/* Progresso: separado da navegação */}
      <div className="mb-4">
        <p
          className="mb-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
          data-testid="question-progress"
        >
          {questionProgressLabel(current, total)}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${questionProgressPercent(current, total)}%` }}
          />
        </div>
      </div>

      {/* Mobile: indicadores numa linha (sem quebra) e Anterior/Próxima lado a lado,
          com área de toque confortável. sm+: tudo numa linha só. */}
      <nav
        className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-between"
        aria-label="Navegação entre perguntas"
      >
        <div className="order-first col-span-2 flex flex-nowrap justify-center gap-1.5 sm:order-none sm:col-span-1">
          {interview.questions.map((item, i) => {
            const active = i === current;
            const answered = Boolean(item.answer && item.answer.trim() !== "");
            return (
              <button
                key={item.id}
                type="button"
                data-question-index={i}
                aria-label={`Ir para a questão ${i + 1}`}
                aria-current={active ? "true" : undefined}
                className={`h-9 min-w-0 max-w-10 flex-1 rounded-full border text-xs font-bold transition-colors outline-none focus-visible:ring-[4px] focus-visible:ring-[rgba(29,78,216,0.24)] sm:size-7 sm:flex-none ${
                  active
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : answered
                      ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                      : "border-border bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                }`}
                onClick={() => onChange(i)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        {/* Mesmos Button/variants do fluxo do candidato: Anterior = outline, Próxima = primária. */}
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full sm:order-first sm:min-h-0 sm:w-auto"
          disabled={!canGoPrevious(current, total)}
          onClick={() => onChange(previousQuestionIndex(current, total))}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Anterior
        </Button>
        <Button
          type="button"
          variant="primary"
          className="min-h-11 w-full sm:min-h-0 sm:w-auto"
          disabled={!canGoNext(current, total)}
          onClick={() => onChange(nextQuestionIndex(current, total))}
        >
          Próxima
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </nav>
    </section>
  );
}

export function EvaluationForm({ draft, ui }: { draft: EvaluationDraft; ui: EvaluationFormUi }) {
  const { form, validation, dirty, saving, feedback, restoredFromLocal } = ui;
  const length = summaryLength(form.summary);
  const reviewEnabled = Boolean(ui.canReview) && !ui.reviewing && Boolean(ui.onReview);
  const scored = countScoredCriteria(form);
  const syncStatus: AutosaveStatus = ui.syncStatus ?? (saving ? "saving" : dirty ? "dirty" : "clean");
  const syncText = describeSync({ status: syncStatus, lastSave: ui.lastSave ?? null });
  // Prévia local = mesma média simples do Back (1 casa); com tudo salvo, vale o
  // `overallScore` devolvido pela API. Nada calculado aqui é enviado.
  const overall = dirty ? previewOverallScore(validation.parsedScores) : draft.overallScore;

  return (
    <section className={`${CARD_CLASS} p-4 sm:p-5`} aria-label="Avaliação do candidato">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-bold text-foreground">Critérios de avaliação</h3>
        <div className="text-right">
          <p className="text-xs text-muted-foreground" data-testid="overall-label">
            Média atual
          </p>
          <p className="text-2xl font-bold text-primary" data-testid="overall-value">
            {formatOverall(overall)}
          </p>
        </div>
      </div>

      <ul className="space-y-3.5">
        {EVALUATION_CRITERIA.map((criterion) => {
          const error = validation.scoreErrors[criterion.key];
          const inputId = `criterion-${criterion.key}`;
          const value = currentScore(form.scores[criterion.key]);
          const tone = scoreTone(value);
          return (
            <li key={criterion.key} data-criterion={criterion.key}>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label
                  htmlFor={inputId}
                  title={criterion.description}
                  className="min-w-0 text-sm font-medium text-foreground"
                >
                  {criterion.label}
                </label>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`text-sm font-bold ${TONE_TEXT[tone]}`} data-testid={`score-${criterion.key}`}>
                    {formatScore(value)}
                  </span>
                  <Input
                    id={inputId}
                    name={criterion.key}
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0–10"
                    title="Nota de 0 a 10 (aceita decimais, ex.: 7,5)"
                    className={SCORE_INPUT_CLASS}
                    value={form.scores[criterion.key]}
                    aria-invalid={error ? "true" : "false"}
                    onChange={(event) => ui.onScoreChange(criterion.key, event.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-1" role="group" aria-label={`Nota de ${criterion.label}`}>
                {SCORE_BUTTONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    data-score={n}
                    aria-pressed={isScoreButtonSelected(n, value) ? "true" : "false"}
                    aria-label={`${criterion.label}: nota ${n}`}
                    className={`h-7 min-w-0 flex-1 rounded text-[10px] font-bold transition-colors ${
                      isScoreButtonFilled(n, value)
                        ? TONE_FILLED[tone]
                        : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                    }`}
                    onClick={() => ui.onScoreChange(criterion.key, String(n))}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {error && (
                <p role="alert" className="mt-1 text-xs text-red-700">
                  {error}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground" data-testid="scored-count">
        {scored}/{EVALUATION_CRITERIA.length} critérios avaliados

      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {dirty ? "Prévia calculada aqui" : "Calculada pelo servidor"}; a média é a simples das notas
        preenchidas. O rascunho é salvo automaticamente.
      </p>

      <div className="mt-4">
        <label htmlFor="evaluation-summary" className={LABEL_CLASS}>
          Comentário do avaliador
        </label>
        <Textarea
          id="evaluation-summary"
          name="summary"
          rows={5}
          placeholder="Registre observações para a revisão final..."
          className="min-h-28 bg-white"
          value={form.summary}
          aria-invalid={validation.summaryError ? "true" : "false"}
          onChange={(event) => ui.onSummaryChange(event.target.value)}
        />
        <div className="mt-1 flex justify-between gap-3 text-xs">
          <span role={validation.summaryError ? "alert" : undefined} className="text-red-700">
            {validation.summaryError ?? ""}
          </span>
          <span className="text-muted-foreground" data-testid="summary-counter">
            {length}/{MAX_SUMMARY_LENGTH}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-3" aria-live="polite">
        {feedback?.kind === "error" && (
          <Alert variant="error" role="alert" className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{feedback.message}</p>
          </Alert>
        )}
      </div>

      {syncText && (
        <p
          className={`mt-3 text-xs font-medium ${syncStatus === "saved" ? "text-green-700" : "text-amber-700"}`}
          data-testid="unsaved-indicator"
          data-sync={syncStatus}
          aria-live="polite"
        >
          {syncText}
          {restoredFromLocal && (syncStatus === "dirty" || syncStatus === "invalid")
            ? " (recuperadas deste navegador)"
            : ""}
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          data-action="review"
          className="inline-flex items-center justify-center rounded-xl border border-transparent bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all outline-none hover:bg-[#1E40AF] active:bg-[#1E3A8A] focus-visible:ring-[4px] focus-visible:ring-[rgba(29,78,216,0.24)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!reviewEnabled}
          aria-busy={ui.reviewing ? "true" : "false"}
          onClick={ui.onReview}
        >
          {ui.reviewing ? "Salvando..." : "Revisar avaliação"}
        </button>
      </div>
      {ui.reviewError && (
        <Alert variant="error" role="alert" className="mt-3 flex items-start gap-2">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>{ui.reviewError}</p>
        </Alert>
      )}
      {!ui.canReview && (
        <p className="mt-2 text-xs text-muted-foreground" data-testid="review-hint">
          Preencha os 7 critérios (0–10) e o comentário para revisar a avaliação.
        </p>
      )}
    </section>
  );
}

export function EvaluatorEvaluationContent({
  state,
  ui,
  questionIndex = 0,
  onQuestionChange = () => undefined,
  onBack,
  onRetry,
}: {
  state: EvaluationScreenState;
  ui: EvaluationFormUi;
  // Índice (0-based) da pergunta exibida; estado local da tela, nunca persistido.
  questionIndex?: number;
  onQuestionChange?: (index: number) => void;
  onBack: () => void;
  onRetry?: () => void;
}) {
  const backButton = (
    <button type="button" className={BUTTON_CLASS} onClick={onBack}>
      <ArrowLeft className="size-4" aria-hidden="true" />
      Voltar para a fila
    </button>
  );

  if (state.status === "loading") {
    return <LoadingBlock label="Carregando entrevista e avaliação..." />;
  }
  if (state.status === "not_found") {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Entrevista não encontrada ou indisponível"
        description={state.message}
        className="p-12"
        action={
          <button type="button" className={BUTTON_CLASS} onClick={onBack}>
            Voltar para a fila
          </button>
        }
      />
    );
  }
  if (state.status === "error") {
    return (
      <div className="space-y-4">
        <ErrorBlock message={state.message} onRetry={onRetry} />
        <div>{backButton}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div>{backButton}</div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className="min-w-0 space-y-4">
          <JobContextSummary interview={state.interview} />
          <QuestionPanel interview={state.interview} index={questionIndex} onChange={onQuestionChange} />
        </div>
        <div className="min-w-0">
          <EvaluationForm draft={state.draft} ui={ui} />
        </div>
      </div>
    </div>
  );
}
