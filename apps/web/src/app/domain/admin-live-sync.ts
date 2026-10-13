/**
 * Sincronização leve das telas REAIS do Admin (Fase 4.2): fila de atribuição, lista de candidatos
 * e lista de avaliadores. Sem React, sem storage.
 *
 * O motor é o MESMO das demais telas: `LiveResourceLoader` + `attachInterviewSyncPolling`
 * (via `useCandidateLiveResource`). Aqui ficam só as frequências e dois helpers puros.
 *
 *  - fila (muda quando um candidato envia entrevista ou outro Admin atribui): 15 s, teto 60 s;
 *  - candidatos e avaliadores (mudam devagar): 30 s, teto 120 s;
 *  - nunca abaixo de 10 s.
 */

import type { LiveResult } from "./candidate-live-sync";
import type { AdminEvaluator, AdminQueueInterview } from "../services/admin-interviews-service";

export const ADMIN_QUEUE_SYNC_INTERVAL_MS = 15000;
export const ADMIN_QUEUE_SYNC_MAX_BACKOFF_MS = 60000;
export const ADMIN_CANDIDATES_SYNC_INTERVAL_MS = 30000;
export const ADMIN_CANDIDATES_SYNC_MAX_BACKOFF_MS = 120000;
export const ADMIN_EVALUATORS_SYNC_INTERVAL_MS = 30000;
export const ADMIN_EVALUATORS_SYNC_MAX_BACKOFF_MS = 120000;

export type AdminQueueData = {
  interviews: AdminQueueInterview[];
  evaluators: AdminEvaluator[];
};

type AnyResult<T> = { ok: true; data: T } | { ok: false; reason: string; message: string };

/** Fila + avaliadores formam UM recurso: se qualquer um falha, o ciclo todo falha (e o refresh silencioso mantém o dado antigo). */
export function combineQueueResults(
  queue: AnyResult<AdminQueueInterview[]>,
  evaluators: AnyResult<AdminEvaluator[]>,
): LiveResult<AdminQueueData> {
  if (!queue.ok) return { ok: false, reason: queue.reason, message: queue.message };
  if (!evaluators.ok) return { ok: false, reason: evaluators.reason, message: evaluators.message };
  return { ok: true, data: { interviews: queue.data, evaluators: evaluators.data } };
}

/** A entrevista selecionada some da fila (outro Admin atribuiu): a seleção é descartada, nunca enviada. */
export function resolveSelection(selected: string | null, interviews: ReadonlyArray<{ id: string }>): string | null {
  if (selected === null) return null;
  return interviews.some((interview) => interview.id === selected) ? selected : null;
}
