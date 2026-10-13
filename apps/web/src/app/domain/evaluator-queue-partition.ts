/**
 * Partição ÚNICA da fila do avaliador (Fase 6A.2).
 *
 * Uma só resposta de `GET /evaluator/interviews` é dividida em:
 *  - pendentes   (Fila): ainda não iniciadas, ou com rascunho sem progresso real;
 *  - em andamento: rascunho persistido com progresso real.
 *
 * Quem decide "progresso real" é o servidor (`evaluation.inProgress`); aqui só
 * se consome o resultado. Sem `evaluation` (ou `inProgress` diferente de `true`)
 * a entrevista fica na Fila. Cada entrevista cai em exatamente UMA das listas,
 * preservando a ordem recebida. Nada de localStorage nem de requisição.
 */

import type { EvaluatorQueueItem } from "../services/evaluator-interviews-service";

export type QueuePartition = {
  pending: EvaluatorQueueItem[];
  inProgress: EvaluatorQueueItem[];
};

export function isInProgress(item: EvaluatorQueueItem): boolean {
  return item.evaluation?.inProgress === true;
}

export function partitionQueue(items: readonly EvaluatorQueueItem[]): QueuePartition {
  const pending: EvaluatorQueueItem[] = [];
  const inProgress: EvaluatorQueueItem[] = [];
  for (const item of items) {
    (isInProgress(item) ? inProgress : pending).push(item);
  }
  return { pending, inProgress };
}

// Texto "X / 7 critérios" do cartão de Em Andamento.
export function criteriaProgressLabel(filled: number, total: number): string {
  return `${filled} / ${total} ${total === 1 ? "critério" : "critérios"}`;
}
