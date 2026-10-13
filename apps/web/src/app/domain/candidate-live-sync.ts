/**
 * Sincronização leve das telas REAIS do candidato (Fase 6A.6): Dashboard e Histórico
 * (`GET /interviews`) e Acompanhamento (`GET /interviews/:id`). Sem React, sem storage.
 *
 *  - carga INICIAL / "Tentar novamente" (`load`): mostra loading e, se falhar, o erro normal da tela;
 *  - refresh SILENCIOSO (`refresh`, usado pelo polling/focus/visible/online): nunca volta a
 *    "loading", nunca troca dados válidos por erro e não publica nada se o dado não mudou
 *    (sem re-render, sem piscar);
 *  - cada request recebe uma geração: resposta antiga NUNCA sobrescreve a mais nova, e nunca há
 *    duas requests em voo (o refresh é ignorado se houver uma);
 *  - 401/403 (já depois da renovação de sessão feita pelo service) e estado terminal
 *    (`isTerminal`) devolvem "stop": o polling se encerra em vez de insistir;
 *  - agendamento (intervalo, pausa hidden/offline, focus/visible/online, dedupe, backoff) é o
 *    motor compartilhado `attachInterviewSyncPolling`, sem alterações.
 */

import {
  attachInterviewSyncPolling,
  type InterviewSyncResult,
  type SyncScheduler,
} from "./interview-sync-poller";

// Dashboard: mantém o intervalo do sync que já existia (15 s); aqui só é usado como referência/teste.
// Histórico (muda quando uma entrevista é atribuída/concluída): mais espaçado.
export const CANDIDATE_HISTORY_SYNC_INTERVAL_MS = 30000;
export const CANDIDATE_HISTORY_SYNC_MAX_BACKOFF_MS = 120000;
// Acompanhamento de UMA entrevista (PENDING/ASSIGNED): só enquanto não for terminal.
export const CANDIDATE_TRACKING_SYNC_INTERVAL_MS = 15000;
export const CANDIDATE_TRACKING_SYNC_MAX_BACKOFF_MS = 60000;

export type LiveState<T> =
  | { status: "loading" }
  | { status: "error"; reason: string; message: string }
  | { status: "ready"; value: T };

export type LiveResult<T> = { ok: true; data: T } | { ok: false; reason: string; message: string };

/** Sessão inválida/sem permissão: não adianta repetir. */
export function isAuthFailure(reason: string): boolean {
  return reason === "unauthorized" || reason === "forbidden";
}

function sameValue(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function applyLiveResult<T>(prev: LiveState<T>, result: LiveResult<T>, options: { silent: boolean }): LiveState<T> {
  if (result.ok) {
    // Refresh silencioso com o mesmo conteúdo: mantém o MESMO objeto (nenhum re-render).
    if (prev.status === "ready" && sameValue(prev.value, result.data)) return prev;
    return { status: "ready", value: result.data };
  }
  if (options.silent) return prev;
  return { status: "error", reason: result.reason, message: result.message };
}

export class LiveResourceLoader<T> {
  private state: LiveState<T> = { status: "loading" };
  private generation = 0;
  private pendingGeneration: number | null = null;
  private disposed = false;

  constructor(
    private readonly deps: {
      fetch: () => Promise<LiveResult<T>>;
      onState: (state: LiveState<T>) => void;
      /** Estado terminal confirmado: o polling para (ex.: entrevista COMPLETED/CANCELLED). */
      isTerminal?: (value: T) => boolean;
    },
  ) {}

  getState(): LiveState<T> {
    return this.state;
  }

  // Carga inicial / "Tentar novamente": mostra loading; substitui qualquer request anterior
  // (a resposta antiga será descartada).
  async load(): Promise<boolean> {
    if (this.disposed) return false;
    // Estado inicial já é "loading": não publica de novo (sem render extra nem frame intermediário).
    if (this.state.status !== "loading") this.publish({ status: "loading" });
    const result = await this.request();
    if (!result) return false;
    this.publish(applyLiveResult(this.state, result.value, { silent: false }));
    return result.value.ok;
  }

  // Refresh silencioso para o poller. Nunca sobrepõe uma request em voo e não consulta o Back
  // quando o estado já é terminal.
  // `supersede` (Admin 4.2, ex.: logo após uma atribuição): em vez de ser ignorado por haver uma
  // request em voo, descarta a resposta dela (geração antiga) e lê o estado já alterado. Continua
  // silencioso: não volta a "loading" nem troca dado válido por erro.
  async refresh(options: { supersede?: boolean } = {}): Promise<InterviewSyncResult> {
    if (this.disposed) return "stop";
    if (this.isTerminalNow()) return "stop";
    if (this.pendingGeneration !== null && !options.supersede) return "ok";
    const result = await this.request();
    if (!result) return "ok"; // resposta obsoleta / desmontado
    const next = applyLiveResult(this.state, result.value, { silent: true });
    if (next !== this.state) this.publish(next);
    if (result.value.ok) return this.isTerminalNow() ? "stop" : "ok";
    return isAuthFailure(result.value.reason) ? "stop" : "error";
  }

  dispose() {
    this.disposed = true;
    this.generation += 1;
    this.pendingGeneration = null;
  }

  private isTerminalNow(): boolean {
    return this.state.status === "ready" && Boolean(this.deps.isTerminal?.(this.state.value));
  }

  private publish(next: LiveState<T>) {
    if (this.disposed) return;
    this.state = next;
    this.deps.onState(next);
  }

  // Executa o fetch e devolve o resultado só se ainda for a geração mais nova.
  private async request(): Promise<{ value: LiveResult<T> } | null> {
    const generation = ++this.generation;
    this.pendingGeneration = generation;
    let value: LiveResult<T>;
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

export function attachCandidateLiveSync(input: {
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
