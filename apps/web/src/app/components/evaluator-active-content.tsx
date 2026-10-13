/** RH Connect — Conteúdo REAL de "Em Andamento" do Avaliador (Fase 6A.2)
 *
 * Apresentação pura: recebe a lista JÁ filtrada (entrevistas com
 * `evaluation.inProgress === true`, decidido pelo servidor) e não importa mock,
 * localStorage nem serviço. "Continuar" abre a rota real da avaliação, que
 * carrega o rascunho persistido e NÃO cria uma avaliação nova.
 */

import { Clock } from "lucide-react";
import { EmptyState } from "./ui/empty-state";
import {
  CARD_CLASS,
  ErrorBlock,
  LoadingBlock,
  formatDateTimePtBr,
  type EvaluatorQueueState,
} from "./evaluator-real-content";
import { criteriaProgressLabel } from "../domain/evaluator-queue-partition";
import type { EvaluatorQueueItem } from "../services/evaluator-interviews-service";

export type EvaluatorActiveState = EvaluatorQueueState;

const PRIMARY_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90";

function jobLine(item: EvaluatorQueueItem): string {
  return [item.jobTitle, item.company].filter(Boolean).join(" · ");
}

export function EvaluatorActiveContent({
  state,
  onContinue,
  onGoToQueue,
  onRetry,
}: {
  state: EvaluatorActiveState;
  // Abre /evaluator/evaluations/:id com o UUID real.
  onContinue: (interviewId: string) => void;
  onGoToQueue: () => void;
  onRetry?: () => void;
}) {
  if (state.status === "loading") {
    return <LoadingBlock label="Carregando avaliações em andamento..." />;
  }
  if (state.status === "error") {
    return <ErrorBlock message={state.message} onRetry={onRetry} />;
  }
  if (state.items.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhuma em andamento"
        description="Inicie uma avaliação da fila para aparecer aqui."
        className="p-12"
        action={
          <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={onGoToQueue}>
            Ir para a Fila
          </button>
        }
      />
    );
  }

  return (
    <ul className="space-y-3" aria-label="Avaliações em andamento">
      {state.items.map((item) => {
        const evaluation = item.evaluation;
        const filled = evaluation?.filledCriteria ?? 0;
        const total = evaluation?.totalCriteria ?? 0;
        return (
          <li key={item.id} className={`${CARD_CLASS} p-4 sm:p-5`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-foreground">{item.candidate.name}</p>
                <p className="mt-1 text-sm text-foreground">{jobLine(item)}</p>
                {total > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      {criteriaProgressLabel(filled, total)}
                    </p>
                    <div
                      role="progressbar"
                      aria-label="Critérios preenchidos"
                      aria-valuemin={0}
                      aria-valuemax={total}
                      aria-valuenow={filled}
                      className="h-2 w-full rounded-full bg-muted"
                    >
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.min(100, (filled / total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:items-end">
                <span>Iniciada em {formatDateTimePtBr(evaluation?.startedAt ?? null)}</span>
                <span>Última atualização em {formatDateTimePtBr(evaluation?.updatedAt ?? null)}</span>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  className={PRIMARY_BUTTON_CLASS}
                  onClick={() => onContinue(item.id)}
                >
                  Continuar
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
