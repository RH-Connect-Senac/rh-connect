/**
 * Sincronização quase em tempo real entre dispositivos por POLLING leve (sem WebSocket/SSE).
 * Parte pura (sem React): agenda UM sync por vez enquanto a aba está visível e online.
 *
 *  - intervalo fixo (`INTERVIEW_SYNC_INTERVAL_MS`); o próximo ciclo só é agendado DEPOIS que o
 *    anterior termina, então requests nunca se sobrepõem;
 *  - aba hidden ou offline: o timer é cancelado (pausa); ao voltar (visible/focus/online) faz um
 *    sync imediato e retoma o intervalo;
 *  - falha: sem UI e sem retry agressivo (o intervalo dobra até um teto e volta ao normal no sucesso);
 *  - o sync pode devolver "stop" (sessão terminal): o polling se encerra sozinho;
 *  - a função devolvida limpa listeners e timers (desmontagem, saída do wizard, sessão terminal).
 */

export const INTERVIEW_SYNC_INTERVAL_MS = 4000;
export const INTERVIEW_SYNC_MAX_BACKOFF_MS = 16000;
export const INTERVIEW_SYNC_MIN_GAP_MS = 1000;

export type InterviewSyncResult = "ok" | "error" | "stop";

type Target = {
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

export type SyncScheduler = {
  set: (callback: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
};

const defaultScheduler: SyncScheduler = {
  set: (callback, ms) => setTimeout(callback, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export function attachInterviewSyncPolling(input: {
  win: Target;
  doc: Target & { visibilityState?: string };
  sync: () => Promise<InterviewSyncResult | void>;
  isOnline?: () => boolean;
  intervalMs?: number;
  scheduler?: SyncScheduler;
  now?: () => number;
}): () => void {
  const intervalMs = input.intervalMs ?? INTERVIEW_SYNC_INTERVAL_MS;
  const scheduler = input.scheduler ?? defaultScheduler;
  const isOnline = input.isOnline ?? (() => true);
  const now = input.now ?? Date.now;

  let stopped = false;
  let running = false;
  let timer: unknown = null;
  let failures = 0;
  let lastStart = Number.NEGATIVE_INFINITY;

  const active = () => !stopped && input.doc.visibilityState !== "hidden" && isOnline();

  const clearTimer = () => {
    if (timer !== null) {
      scheduler.clear(timer);
      timer = null;
    }
  };

  const schedule = () => {
    if (timer !== null || !active() || running) return;
    const delay = Math.min(intervalMs * 2 ** failures, INTERVIEW_SYNC_MAX_BACKOFF_MS);
    timer = scheduler.set(() => {
      timer = null;
      if (active()) void run();
    }, delay);
  };

  const run = async () => {
    if (running || stopped) return;
    running = true;
    lastStart = now();
    let result: InterviewSyncResult | void;
    try {
      result = await input.sync();
    } catch {
      result = "error";
    } finally {
      running = false;
    }
    if (stopped) return;
    if (result === "stop") {
      dispose();
      return;
    }
    failures = result === "error" ? failures + 1 : 0;
    schedule();
  };

  // Voltou foco/visibilidade/rede: sync imediato (com um intervalo mínimo p/ eventos duplicados).
  const syncNow = () => {
    if (!active() || running) return;
    if (now() - lastStart < INTERVIEW_SYNC_MIN_GAP_MS) {
      schedule();
      return;
    }
    clearTimer();
    void run();
  };

  const onVisibility = () => {
    if (input.doc.visibilityState === "hidden") clearTimer();
    else syncNow();
  };
  const onOffline = () => clearTimer();

  const dispose = () => {
    if (stopped) return;
    stopped = true;
    clearTimer();
    input.win.removeEventListener("focus", syncNow);
    input.win.removeEventListener("online", syncNow);
    input.win.removeEventListener("offline", onOffline);
    input.doc.removeEventListener("visibilitychange", onVisibility);
  };

  input.win.addEventListener("focus", syncNow);
  input.win.addEventListener("online", syncNow);
  input.win.addEventListener("offline", onOffline);
  input.doc.addEventListener("visibilitychange", onVisibility);
  schedule();
  return dispose;
}
