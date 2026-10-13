/**
 * Reatividade do Dashboard do candidato entre dispositivos (sem F5), só enquanto ele está montado.
 *
 *  - refresh imediato ao montar (o hook de in-progress já carrega ao montar);
 *  - refresh imediato em focus / visible / online (com intervalo mínimo contra eventos duplicados);
 *  - polling leve de 15 s como fallback, pausado com a aba hidden ou offline;
 *  - nunca duas requisições ao mesmo tempo (o próximo ciclo só é agendado depois do atual);
 *  - falha é silenciosa: mantém o último estado conhecido e tenta no próximo ciclo.
 *
 * Reaproveita o agendador genérico do wizard (`attachInterviewSyncPolling`) sem alterá-lo;
 * o Dashboard só muda o intervalo e não sincroniza rascunhos.
 */
import {
  attachInterviewSyncPolling,
  type InterviewSyncResult,
  type SyncScheduler,
} from "./interview-sync-poller";

export const DASHBOARD_INTERVIEWS_SYNC_INTERVAL_MS = 15000;

type Target = {
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

export function attachDashboardInterviewsSync(input: {
  win: Target;
  doc: Target & { visibilityState?: string };
  refresh: () => Promise<InterviewSyncResult | void>;
  isOnline?: () => boolean;
  scheduler?: SyncScheduler;
  now?: () => number;
}): () => void {
  return attachInterviewSyncPolling({
    win: input.win,
    doc: input.doc,
    sync: input.refresh,
    isOnline: input.isOnline,
    scheduler: input.scheduler,
    now: input.now,
    intervalMs: DASHBOARD_INTERVIEWS_SYNC_INTERVAL_MS,
  });
}

export type InProgressInterviewsState<T> =
  | { status: "loading"; items: null; error: null }
  | { status: "ready"; items: T[]; error: null }
  | { status: "error"; items: null; error: string };

export type InProgressFetchResult<T> = { ok: true; data: T[] } | { ok: false; message: string };

/**
 * Aplica o resultado de uma leitura de GET /interviews/in-progress.
 * - leitura normal (carga inicial/ação local): erro vira estado "error" (comportamento atual);
 * - leitura silenciosa (polling/focus): erro NUNCA altera o estado — mantém o último conhecido.
 */
export function applyInProgressResult<T>(
  prev: InProgressInterviewsState<T>,
  result: InProgressFetchResult<T>,
  options: { silent: boolean },
): InProgressInterviewsState<T> {
  if (result.ok) return { status: "ready", items: result.data, error: null };
  if (options.silent) return prev;
  return { status: "error", items: null, error: result.message };
}
