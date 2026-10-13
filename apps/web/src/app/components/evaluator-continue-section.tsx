/** RH Connect — seção compacta "Continuar avaliando" do Dashboard do avaliador.
 *
 * Apresentação pura: recebe a lista "em andamento" JÁ particionada (mesma fonte
 * única de `useAssignedQueue`), sem request, armazenamento local nem polling
 * próprio. Fica oculta (sem espaço vazio) durante loading, erro ou quando não há
 * avaliação em andamento: a Fila logo abaixo já cuida desses estados.
 */

import { Clock } from "lucide-react";
import { CARD_CLASS, formatDateTimePtBr, type EvaluatorQueueState } from "./evaluator-real-content";
import { PRIMARY_BUTTON_CLASS } from "./evaluator-active-content";
import { criteriaProgressLabel } from "../domain/evaluator-queue-partition";
import { selectContinueItems } from "../domain/evaluator-dashboard-continue";

export function EvaluatorContinueSection({
  state,
  onContinue,
  onSeeAll,
}: {
  state: EvaluatorQueueState;
  // Abre /evaluator/evaluations/:id com o UUID real.
  onContinue: (interviewId: string) => void;
  // Abre a tela completa "Em Andamento".
  onSeeAll: () => void;
}) {
  if (state.status !== "ready" || state.items.length === 0) return null;
  const { items, hasMore } = selectContinueItems(state.items);

  return (
    <section className="space-y-3" aria-label="Continuar avaliando">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-bold text-foreground">
          <Clock className="size-4 text-primary" aria-hidden="true" /> Continuar avaliando
        </h3>
        {hasMore && (
          <button
            type="button"
            className="text-sm font-semibold text-primary hover:underline"
            onClick={onSeeAll}
          >
            Ver todas
          </button>
        )}
      </div>
      <ul className="space-y-3" aria-label="Avaliações em andamento">
        {items.map((item) => {
          const evaluation = item.evaluation;
          const filled = evaluation?.filledCriteria ?? 0;
          const total = evaluation?.totalCriteria ?? 0;
          const job = [item.jobTitle, item.company].filter(Boolean).join(" · ");
          return (
            <li key={item.id} className={`${CARD_CLASS} p-4`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold text-foreground">{item.candidate.name}</p>
                  {job && <p className="mt-0.5 break-words text-sm text-foreground">{job}</p>}
                  {total > 0 && (
                    <div className="mt-2 space-y-1.5">
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    Última atualização em {formatDateTimePtBr(evaluation?.updatedAt ?? null)}
                  </p>
                </div>
                <div className="shrink-0">
                  <button
                    type="button"
                    className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
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
    </section>
  );
}
