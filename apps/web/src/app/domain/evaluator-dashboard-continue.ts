/**
 * Seleção da seção "Continuar avaliando" do Dashboard do avaliador.
 *
 * Recebe a lista JÁ particionada como "em andamento" (`partitionQueue`, regra do
 * servidor) e só escolhe quais mostrar: as mais recentemente atualizadas
 * (`evaluation.updatedAt`, depois `startedAt`), até o limite. Não faz request,
 * não muda a partição e não altera a lista original.
 */

import type { EvaluatorQueueItem } from "../services/evaluator-interviews-service";

export const DASHBOARD_CONTINUE_LIMIT = 2;

function timestamp(item: EvaluatorQueueItem): number {
  const value = item.evaluation?.updatedAt ?? item.evaluation?.startedAt ?? null;
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function selectContinueItems(
  inProgress: readonly EvaluatorQueueItem[],
  limit: number = DASHBOARD_CONTINUE_LIMIT,
): { items: EvaluatorQueueItem[]; hasMore: boolean } {
  // sort estável: empate mantém a ordem recebida
  const sorted = inProgress
    .map((item, index) => ({ item, index }))
    .sort((a, b) => timestamp(b.item) - timestamp(a.item) || a.index - b.index)
    .map(({ item }) => item);
  return { items: sorted.slice(0, limit), hasMore: sorted.length > limit };
}
