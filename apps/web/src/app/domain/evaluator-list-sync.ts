/**
 * Sincronização leve das LISTAS do avaliador (Fase 6A.3): Dashboard, Fila,
 * Em Andamento (mesma fonte, `GET /evaluator/interviews`) e Histórico
 * (`GET /evaluator/history`). Sem React, sem storage, sem biblioteca de cache.
 *
 *  - carga INICIAL (`load`): mostra loading e, se falhar, o erro normal da tela;
 *  - refresh SILENCIOSO (`refresh`, usado pelo polling/focus/visible/online):
 *    nunca volta a "loading", nunca troca dados válidos por erro, não expõe
 *    mensagem técnica; em falha mantém o último estado e tenta no próximo ciclo;
 *  - cada request recebe uma geração: resposta antiga NUNCA sobrescreve a mais
 *    nova; e nunca há duas requests em voo (o refresh é ignorado se houver uma);
 *  - 401/403 (já depois da renovação de sessão feita pelo service) encerram o
 *    polling em vez de insistir com sessão inválida;
 *  - o agendamento (intervalo, pausa hidden/offline, focus/visible/online,
 *    dedupe, backoff) é o motor compartilhado `attachInterviewSyncPolling`.
 */

import {
  attachInterviewSyncPolling,
  type InterviewSyncResult,
  type SyncScheduler,
} from "./interview-sync-poller";

// Dashboard / Fila / Em Andamento.
export const EVALUATOR_QUEUE_SYNC_INTERVAL_MS = 15000;
export const EVALUATOR_QUEUE_SYNC_MAX_BACKOFF_MS = 60000;
// Histórico (muda só quando o próprio avaliador conclui algo).
export const EVALUATOR_HISTORY_SYNC_INTERVAL_MS = 30000;
export const EVALUATOR_HISTORY_SYNC_MAX_BACKOFF_MS = 120000;

export type EvaluatorListState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; items: T[] };

export type EvaluatorListResult<T> =
  | { ok: true; data: T[] }
  | { ok: false; reason: string; message: string };

// Sessão inválida/sem permissão: não adianta repetir.
export function isTerminalFailure(reason: string): boolean {
  return reason === "unauthorized" || reason === "forbidden";
}

export function applyListResult<T>(
  prev: EvaluatorListState<T>,
  result: EvaluatorListResult<T>,
  options: { silent: boolean },
): EvaluatorListState<T> {
  if (result.ok) return { status: "ready", items: result.data };
  if (options.silent) return prev;
  return { status: "error", message: result.message };
}

export class EvaluatorListLoader<T> {
  private state: EvaluatorListState<T> = { status: "loading" };
  private generation = 0;
  private pendingGeneration: number | null = null;
  private disposed = false;

  constructor(
    private readonly deps: {
      fetch: () => Promise<EvaluatorListResult<T>>;
      onState: (state: EvaluatorListState<T>) => void;
    },
  ) {}

  getState(): EvaluatorListState<T> {
    return this.state;
  }

  // Carga inicial / "Tentar novamente": mostra loading; substitui qualquer
  // request anterior (a resposta antiga será descartada).
  async load(): Promise<boolean> {
    if (this.disposed) return false;
    this.publish({ status: "loading" });
    const result = await this.request();
    if (!result) return false;
    this.publish(applyListResult(this.state, result.value, { silent: false }));
    return result.value.ok;
  }

  // Refresh silencioso para o poller. Nunca sobrepõe uma request em voo.
  async refresh(): Promise<InterviewSyncResult> {
    if (this.disposed || this.pendingGeneration !== null) return "ok";
    const result = await this.request();
    if (!result) return "ok"; // resposta obsoleta / desmontado
    const next = applyListResult(this.state, result.value, { silent: true });
    if (next !== this.state) this.publish(next);
    if (result.value.ok) return "ok";
    return isTerminalFailure(result.value.reason) ? "stop" : "error";
  }

  dispose() {
    this.disposed = true;
    this.generation += 1;
    this.pendingGeneration = null;
  }

  private publish(next: EvaluatorListState<T>) {
    if (this.disposed) return;
    this.state = next;
    this.deps.onState(next);
  }

  // Executa o fetch e devolve o resultado só se ainda for a geração mais nova.
  private async request(): Promise<{ value: EvaluatorListResult<T> } | null> {
    const generation = ++this.generation;
    this.pendingGeneration = generation;
    let value: EvaluatorListResult<T>;
    try {
      value = await this.deps.fetch();
    } catch {
      value = { ok: false, reason: "error", message: "" };
    }
    if (this.pendingGeneration === generation) this.pendingGeneration = null;
    if (this.disposed || generation !== this.generation) return null;
    return { value };
  }
}

type Target = {
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

export function attachEvaluatorListSync(input: {
  win: Target;
  doc: Target & { visibilityState?: string };
  refresh: () => Promise<InterviewSyncResult | void>;
  intervalMs: number;
  maxBackoffMs: number;
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
    intervalMs: input.intervalMs,
    maxBackoffMs: input.maxBackoffMs,
  });
}
