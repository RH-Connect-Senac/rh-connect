import { describe, expect, it } from "vitest";
import {
  CANDIDATE_HISTORY_SYNC_INTERVAL_MS,
  CANDIDATE_HISTORY_SYNC_MAX_BACKOFF_MS,
  CANDIDATE_TRACKING_SYNC_INTERVAL_MS,
  CANDIDATE_TRACKING_SYNC_MAX_BACKOFF_MS,
  LiveResourceLoader,
  applyLiveResult,
  attachCandidateLiveSync,
  isAuthFailure,
  type LiveResult,
  type LiveState,
} from "./candidate-live-sync";
import { isTrackingTerminal } from "./interview-tracking-view";
import { buildDashboardRecent, buildDashboardSummary } from "./candidate-dashboard-view";
import { countByFilter, filterHistory } from "./candidate-history-view";
import type { RealHistoryItem, RealInterviewHistory, RealInterviewStatus } from "../services/candidate-interviews-service";
import { DASHBOARD_INTERVIEWS_SYNC_INTERVAL_MS } from "./dashboard-interviews-sync";
import { INTERVIEW_SYNC_INTERVAL_MS, type InterviewSyncResult, type SyncScheduler } from "./interview-sync-poller";

type Interview = { id: string; status: string };
const interview = (status: string): Interview => ({ id: "i1", status });
const ok = <T,>(data: T): LiveResult<T> => ({ ok: true, data });
const fail = (reason: string): LiveResult<never> => ({ ok: false, reason, message: "Mensagem amigável." });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function loaderWith(fetchImpl: () => Promise<LiveResult<Interview>>, isTerminal?: (value: Interview) => boolean) {
  const states: LiveState<Interview>[] = [];
  let calls = 0;
  const loader = new LiveResourceLoader<Interview>({
    fetch: () => {
      calls += 1;
      return fetchImpl();
    },
    onState: (state) => states.push(state),
    isTerminal,
  });
  return { loader, states, calls: () => calls };
}

describe("sync do candidato (6A.6): frequências", () => {
  it("Dashboard 15 s (ciclo existente), Histórico 30 s, Acompanhamento 15 s; nada mais agressivo que o wizard (4 s)", () => {
    expect(DASHBOARD_INTERVIEWS_SYNC_INTERVAL_MS).toBe(15000);
    expect(CANDIDATE_HISTORY_SYNC_INTERVAL_MS).toBe(30000);
    expect(CANDIDATE_TRACKING_SYNC_INTERVAL_MS).toBe(15000);
    for (const interval of [CANDIDATE_HISTORY_SYNC_INTERVAL_MS, CANDIDATE_TRACKING_SYNC_INTERVAL_MS]) {
      expect(interval).toBeGreaterThan(INTERVIEW_SYNC_INTERVAL_MS);
    }
    expect(CANDIDATE_HISTORY_SYNC_MAX_BACKOFF_MS).toBeGreaterThan(CANDIDATE_HISTORY_SYNC_INTERVAL_MS);
    expect(CANDIDATE_TRACKING_SYNC_MAX_BACKOFF_MS).toBeGreaterThan(CANDIDATE_TRACKING_SYNC_INTERVAL_MS);
  });
});

describe("sync do candidato (6A.6): loader — carga inicial vs refresh silencioso", () => {
  it("recurso sem dado já NASCE em loading (sem idle/vazio antes) e vai direto a ready", async () => {
    const h = loaderWith(async () => ok(interview("PENDING_ASSIGNMENT")));
    expect(h.loader.getState().status).toBe("loading");
    await h.loader.load();
    // nenhuma publicação intermediária: loading (inicial) → ready
    expect(h.states.map((s) => s.status)).toEqual(["ready"]);
  });

  it("'Tentar novamente' depois de erro ou dado volta a loading; só então vai a ready", async () => {
    let n = 0;
    const h = loaderWith(async () => (n++ === 0 ? fail("network") : ok(interview("ASSIGNED"))));
    await h.loader.load();
    expect(h.loader.getState().status).toBe("error");
    h.states.length = 0;
    await h.loader.load();
    expect(h.states.map((s) => s.status)).toEqual(["loading", "ready"]);
  });

  it("com dado existente, refresh silencioso (e erro silencioso) nunca voltam a loading nem apagam o dado", async () => {
    let n = 0;
    const h = loaderWith(async () => (n++ === 0 ? ok(interview("ASSIGNED")) : fail("network")));
    await h.loader.load();
    h.states.length = 0;
    expect(await h.loader.refresh()).toBe("error");
    expect(h.states).toEqual([]);
    const state = h.loader.getState();
    expect(state.status).toBe("ready");
  });

  it("refresh silencioso NUNCA volta a loading e troca o dado quando muda (PENDING → ASSIGNED → COMPLETED)", async () => {
    const sequence = ["PENDING_ASSIGNMENT", "ASSIGNED", "COMPLETED"];
    let i = 0;
    const h = loaderWith(async () => ok(interview(sequence[Math.min(i++, 2)])), (value) => isTrackingTerminal(value.status as "COMPLETED"));
    await h.loader.load();
    h.states.length = 0;
    expect(await h.loader.refresh()).toBe("ok");
    expect(await h.loader.refresh()).toBe("stop"); // COMPLETED confirmado
    expect(h.states.map((s) => s.status)).toEqual(["ready", "ready"]);
    expect(h.states.some((s) => s.status === "loading")).toBe(false);
    const last = h.states[h.states.length - 1];
    expect(last.status === "ready" && last.value.status).toBe("COMPLETED");
  });

  it("dado igual não publica nada (sem re-render nem flicker)", async () => {
    const h = loaderWith(async () => ok(interview("ASSIGNED")));
    await h.loader.load();
    h.states.length = 0;
    expect(await h.loader.refresh()).toBe("ok");
    expect(h.states).toHaveLength(0);
    const prev: LiveState<Interview> = { status: "ready", value: interview("ASSIGNED") };
    expect(applyLiveResult(prev, ok(interview("ASSIGNED")), { silent: true })).toBe(prev);
  });

  it("erro no refresh silencioso mantém os dados, não vira erro e devolve 'error' (backoff do motor)", async () => {
    let n = 0;
    const h = loaderWith(async () => (n++ === 0 ? ok(interview("ASSIGNED")) : fail("error")));
    await h.loader.load();
    h.states.length = 0;
    expect(await h.loader.refresh()).toBe("error");
    expect(h.states).toHaveLength(0);
    const state = h.loader.getState();
    expect(state.status === "ready" && state.value.status).toBe("ASSIGNED");
  });

  it("falha da carga inicial vira erro; um refresh posterior bem-sucedido recupera", async () => {
    let n = 0;
    const h = loaderWith(async () => (n++ === 0 ? fail("error") : ok(interview("ASSIGNED"))));
    await h.loader.load();
    expect(h.loader.getState().status).toBe("error");
    await h.loader.refresh();
    expect(h.loader.getState().status).toBe("ready");
  });

  it("401/403 encerram o polling ('stop') e preservam os dados", async () => {
    let n = 0;
    const h = loaderWith(async () => (n++ === 0 ? ok(interview("ASSIGNED")) : fail(n === 2 ? "unauthorized" : "forbidden")));
    await h.loader.load();
    expect(await h.loader.refresh()).toBe("stop");
    expect(h.loader.getState().status).toBe("ready");
    expect(isAuthFailure("unauthorized")).toBe(true);
    expect(isAuthFailure("forbidden")).toBe(true);
    expect(isAuthFailure("error")).toBe(false);
  });
});

describe("sync do candidato (6A.6): overlap, resposta antiga e descarte", () => {
  it("nunca há duas requests em voo: refresh durante uma request é ignorado", async () => {
    const gate = deferred<LiveResult<Interview>>();
    const h = loaderWith(() => gate.promise);
    const first = h.loader.refresh();
    expect(await h.loader.refresh()).toBe("ok");
    expect(h.calls()).toBe(1);
    gate.resolve(ok(interview("ASSIGNED")));
    await first;
  });

  it("resposta antiga não sobrescreve a mais nova", async () => {
    const slow = deferred<LiveResult<Interview>>();
    const fast = deferred<LiveResult<Interview>>();
    const queue = [slow, fast];
    const h = loaderWith(() => queue.shift()!.promise);
    const first = h.loader.load();
    const second = h.loader.load();
    fast.resolve(ok(interview("COMPLETED")));
    await second;
    slow.resolve(ok(interview("PENDING_ASSIGNMENT")));
    await first;
    const state = h.loader.getState();
    expect(state.status === "ready" && state.value.status).toBe("COMPLETED");
  });

  it("depois de dispose nada é publicado e não há nova request", async () => {
    const gate = deferred<LiveResult<Interview>>();
    const h = loaderWith(() => gate.promise);
    const pending = h.loader.load();
    const before = h.states.length;
    h.loader.dispose();
    gate.resolve(ok(interview("ASSIGNED")));
    await pending;
    expect(h.states).toHaveLength(before);
    expect(await h.loader.refresh()).toBe("stop");
    expect(h.calls()).toBe(1);
  });
});

describe("sync do candidato (6A.6): estados terminais do acompanhamento", () => {
  it("COMPLETED e CANCELLED são terminais; os demais seguem sincronizando", () => {
    expect(isTrackingTerminal("COMPLETED")).toBe(true);
    expect(isTrackingTerminal("CANCELLED")).toBe(true);
    for (const status of ["IN_PROGRESS", "PENDING_ASSIGNMENT", "ASSIGNED", "PENDING_AI_EVALUATION"] as const) {
      expect(isTrackingTerminal(status)).toBe(false);
    }
  });

  it("terminal confirmado: 'stop' e nenhuma nova request (COMPLETED e CANCELLED)", async () => {
    for (const status of ["COMPLETED", "CANCELLED"]) {
      const h = loaderWith(async () => ok(interview(status)), (value) => isTrackingTerminal(value.status as "COMPLETED"));
      await h.loader.load();
      expect(await h.loader.refresh()).toBe("stop");
      expect(await h.loader.refresh()).toBe("stop");
      expect(h.calls()).toBe(1);
    }
  });

  it("PENDING_AI_EVALUATION segue sincronizando (só o status; sem resultado)", async () => {
    const h = loaderWith(async () => ok(interview("PENDING_AI_EVALUATION")), (value) => isTrackingTerminal(value.status as "COMPLETED"));
    await h.loader.load();
    expect(await h.loader.refresh()).toBe("ok");
    expect(h.calls()).toBe(2);
  });
});

// ── Motor de polling (agendador fake) ────────────────────────────────────────────────────────
function harness(options: { visible?: boolean; online?: boolean; interval?: number; max?: number } = {}) {
  let clock = 0;
  let nextId = 1;
  const tasks = new Map<number, { at: number; fn: () => void }>();
  const delays: number[] = [];
  const scheduler: SyncScheduler = {
    set: (fn, ms) => {
      const id = nextId++;
      delays.push(ms);
      tasks.set(id, { at: clock + ms, fn });
      return id;
    },
    clear: (handle) => void tasks.delete(handle as number),
  };
  const listeners = new Map<string, Set<() => void>>();
  const target = {
    addEventListener: (type: string, fn: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: () => void) => void listeners.get(type)?.delete(fn),
  };
  const doc = { ...target, visibilityState: options.visible === false ? "hidden" : "visible" };
  const env = { online: options.online !== false };
  const results: InterviewSyncResult[] = [];
  const calls: number[] = [];
  const detach = attachCandidateLiveSync({
    win: target,
    doc,
    isOnline: () => env.online,
    refresh: async () => {
      calls.push(clock);
      return results.shift() ?? "ok";
    },
    intervalMs: options.interval ?? CANDIDATE_TRACKING_SYNC_INTERVAL_MS,
    maxBackoffMs: options.max ?? CANDIDATE_TRACKING_SYNC_MAX_BACKOFF_MS,
    scheduler,
    now: () => clock,
  });
  const advance = async (ms: number) => {
    const end = clock + ms;
    for (;;) {
      const due = [...tasks.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      tasks.delete(due[0]);
      clock = due[1].at;
      due[1].fn();
      await Promise.resolve();
      await Promise.resolve();
    }
    clock = end;
  };
  return {
    calls,
    delays,
    detach,
    advance,
    results,
    env,
    doc,
    fire: (type: string) => listeners.get(type)?.forEach((fn) => fn()),
    listenerCount: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
    pendingTimers: () => tasks.size,
    setVisibility: (value: "hidden" | "visible") => {
      (doc as { visibilityState: string }).visibilityState = value;
    },
  };
}

describe("sync do candidato (6A.6): polling, pausa e retomada", () => {
  it("faz um refresh por intervalo enquanto visível e online", async () => {
    const h = harness();
    await h.advance(15000);
    expect(h.calls).toHaveLength(1);
    await h.advance(15000);
    expect(h.calls).toHaveLength(2);
    h.detach();
  });

  it("hidden e offline pausam; voltar (visible/online/focus) faz refresh imediato", async () => {
    const h = harness();
    h.setVisibility("hidden");
    h.fire("visibilitychange");
    await h.advance(60000);
    expect(h.calls).toHaveLength(0);
    expect(h.pendingTimers()).toBe(0);
    h.setVisibility("visible");
    h.fire("visibilitychange");
    await h.advance(0);
    expect(h.calls).toHaveLength(1);
    h.env.online = false;
    h.fire("offline");
    await h.advance(60000);
    expect(h.calls).toHaveLength(1);
    h.env.online = true;
    await h.advance(2000);
    h.fire("online");
    await h.advance(0);
    expect(h.calls).toHaveLength(2);
    h.detach();
  });

  it("'stop' (terminal ou 401/403) encerra: sem timers e sem listeners", async () => {
    const h = harness();
    h.results.push("stop");
    await h.advance(15000);
    expect(h.calls).toHaveLength(1);
    expect(h.pendingTimers()).toBe(0);
    expect(h.listenerCount()).toBe(0);
    h.fire("focus");
    await h.advance(120000);
    expect(h.calls).toHaveLength(1);
  });

  it("backoff em falhas repetidas (15→30→60 s, teto 60 s) e volta ao normal ao recuperar", async () => {
    const h = harness();
    h.results.push("error", "error", "error", "error", "ok");
    await h.advance(15000);
    await h.advance(30000);
    await h.advance(60000);
    await h.advance(60000);
    await h.advance(60000);
    expect(h.delays.slice(0, 6)).toEqual([15000, 30000, 60000, 60000, 60000, 15000]);
    h.detach();
  });

  it("cleanup remove timers e listeners (sem polling duplicado após remontar)", async () => {
    const h = harness();
    expect(h.listenerCount()).toBe(4);
    h.detach();
    expect(h.listenerCount()).toBe(0);
    expect(h.pendingTimers()).toBe(0);
    const again = harness();
    expect(again.listenerCount()).toBe(4);
    again.detach();
  });
});

// ── Histórico/Dashboard: snapshots sucessivos de GET /interviews ──────────────────────────────
function row(n: number, status: RealInterviewStatus, overrides: Partial<RealHistoryItem> = {}): RealHistoryItem {
  const completed = status === "COMPLETED";
  return {
    id: `00000000-0000-4000-8000-00000000000${n}`,
    status,
    evaluationMode: "HUMAN",
    title: `Vaga ${n}`,
    company: "ACME",
    location: null,
    contractType: null,
    workMode: null,
    submittedAt: "2026-10-12T13:00:00.000Z",
    createdAt: `2026-10-12T1${n}:00:00.000Z`,
    updatedAt: "2026-10-13T03:00:00.000Z",
    assignedAt: null,
    completedAt: completed ? "2026-10-13T03:28:00.000Z" : null,
    questionCount: 5,
    overallScore: completed ? 5.6 : null,
    resultAvailable: completed,
    ...overrides,
  };
}

describe("sync do candidato (6A.6): Histórico e Dashboard refletem mudanças sem F5", () => {
  const snapshots: RealInterviewHistory[] = [
    { total: 2, interviews: [row(2, "IN_PROGRESS"), row(1, "ASSIGNED")] },
    // nova entrevista enviada, a 1 concluída (com nota) e a IN_PROGRESS cancelada em outro dispositivo
    { total: 3, interviews: [row(3, "PENDING_ASSIGNMENT"), row(2, "CANCELLED"), row(1, "COMPLETED", { overallScore: 7.2 })] },
  ];

  async function twoRefreshes() {
    let i = 0;
    const states: LiveState<RealInterviewHistory>[] = [];
    const loader = new LiveResourceLoader<RealInterviewHistory>({
      fetch: async () => ok(snapshots[Math.min(i++, 1)]),
      onState: (state) => states.push(state),
    });
    await loader.load();
    const before = loader.getState();
    states.length = 0;
    await loader.refresh();
    return { before, after: loader.getState(), states };
  }

  it("o refresh substitui a lista em silêncio (sem loading)", async () => {
    const { states } = await twoRefreshes();
    expect(states.map((state) => state.status)).toEqual(["ready"]);
  });

  it("Histórico: nova entrevista aparece, status muda, COMPLETED ganha nota e CANCELLED some; filtro preservado", async () => {
    const { before, after } = await twoRefreshes();
    const items = (state: LiveState<RealInterviewHistory>) => (state.status === "ready" ? state.value.interviews : []);
    expect(filterHistory(items(before), "all").map((x) => x.title)).toEqual(["Vaga 2", "Vaga 1"]);
    expect(filterHistory(items(after), "all").map((x) => x.title)).toEqual(["Vaga 3", "Vaga 1"]);
    // "Concluídas" é só um valor de estado local da tela: continua válido e passa a ter a entrevista concluída
    expect(filterHistory(items(before), "completed")).toHaveLength(0);
    expect(filterHistory(items(after), "completed").map((x) => [x.title, x.overallScore, x.resultAvailable])).toEqual([["Vaga 1", 7.2, true]]);
    expect(countByFilter(items(after))).toEqual({ all: 2, "in-progress": 0, waiting: 1, completed: 1 });
  });

  it("Dashboard: métricas, lista recente e melhor pontuação mudam; CANCELLED sai", async () => {
    const { before, after } = await twoRefreshes();
    const items = (state: LiveState<RealInterviewHistory>) => (state.status === "ready" ? state.value.interviews : []);
    expect(buildDashboardSummary(items(before))).toMatchObject({ total: 2, inProgress: 1, waiting: 1, resultsAvailable: 0, bestScore: null });
    expect(buildDashboardSummary(items(after))).toMatchObject({ total: 2, inProgress: 0, waiting: 0, completed: 1, resultsAvailable: 1, bestScore: 7.2 });
    expect(buildDashboardRecent(items(after)).map((x) => x.title)).toEqual(["Vaga 3", "Vaga 1"]);
  });

  it("Dashboard: 'Aguardando avaliação' sobe na atribuição do Admin e cai na conclusão, só pelo GET /interviews (sem F5)", async () => {
    const steps: RealInterviewHistory[] = [
      { total: 1, interviews: [row(1, "PENDING_ASSIGNMENT")] },
      { total: 1, interviews: [row(1, "ASSIGNED", { assignedAt: "2026-10-13T04:00:00.000Z" })] },
      { total: 1, interviews: [row(1, "COMPLETED", { overallScore: 8.4 })] },
    ];
    let i = 0;
    const loader = new LiveResourceLoader<RealInterviewHistory>({
      fetch: async () => ok(steps[Math.min(i++, 2)]),
      onState: () => {},
    });
    const summary = () => {
      const state = loader.getState();
      return buildDashboardSummary(state.status === "ready" ? state.value.interviews : []);
    };
    await loader.load();
    expect(summary()).toMatchObject({ total: 1, waiting: 0, resultsAvailable: 0 });
    expect(await loader.refresh()).toBe("ok");
    expect(summary()).toMatchObject({ total: 1, waiting: 1, resultsAvailable: 0 });
    expect(await loader.refresh()).toBe("ok");
    expect(summary()).toMatchObject({ total: 1, waiting: 0, completed: 1, resultsAvailable: 1, bestScore: 8.4 });
  });
});
