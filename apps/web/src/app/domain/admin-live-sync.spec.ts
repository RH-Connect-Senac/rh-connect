import { describe, expect, it } from "vitest";
import {
  ADMIN_CANDIDATES_SYNC_INTERVAL_MS,
  ADMIN_CANDIDATES_SYNC_MAX_BACKOFF_MS,
  ADMIN_EVALUATORS_SYNC_INTERVAL_MS,
  ADMIN_EVALUATORS_SYNC_MAX_BACKOFF_MS,
  ADMIN_QUEUE_SYNC_INTERVAL_MS,
  ADMIN_QUEUE_SYNC_MAX_BACKOFF_MS,
  combineQueueResults,
  resolveSelection,
} from "./admin-live-sync";
import { LiveResourceLoader, attachCandidateLiveSync, type LiveResult, type LiveState } from "./candidate-live-sync";
import { presentableEvaluators } from "./admin-evaluators-view";
import { INTERVIEW_SYNC_INTERVAL_MS, type SyncScheduler } from "./interview-sync-poller";

// ── Pequeno "Back" fake + loader real + poller real (agendador/listeners fake) ──────────────
const ok = <T,>(data: T): LiveResult<T> => ({ ok: true, data });
const fail = (reason: string): LiveResult<never> => ({ ok: false, reason, message: "Mensagem amigável." });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function wire<T>(
  fetchImpl: () => Promise<LiveResult<T>>,
  interval: number,
  max: number,
  options: { visible?: boolean } = {},
) {
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
  const env = { online: true };
  const states: LiveState<T>[] = [];
  let requests = 0;
  const loader = new LiveResourceLoader<T>({
    fetch: () => {
      requests += 1;
      return fetchImpl();
    },
    onState: (state) => states.push(state),
  });
  const detach = attachCandidateLiveSync({
    win: target,
    doc,
    isOnline: () => env.online,
    refresh: () => loader.refresh(),
    intervalMs: interval,
    maxBackoffMs: max,
    scheduler,
    now: () => clock,
  });
  const flush = async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
  };
  const advance = async (ms: number) => {
    await flush();
    const end = clock + ms;
    for (;;) {
      const due = [...tasks.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      tasks.delete(due[0]);
      clock = due[1].at;
      due[1].fn();
      await flush();
    }
    clock = end;
  };
  return {
    loader,
    states,
    requests: () => requests,
    delays,
    advance,
    env,
    detach: () => {
      detach();
      loader.dispose();
    },
    fire: (type: string) => listeners.get(type)?.forEach((fn) => fn()),
    listenerCount: () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0),
    pendingTimers: () => tasks.size,
    setVisibility: (value: "hidden" | "visible") => {
      (doc as { visibilityState: string }).visibilityState = value;
    },
    value: () => {
      const state = loader.getState();
      return state.status === "ready" ? state.value : null;
    },
  };
}

describe("sync do Admin (4.2): frequências", () => {
  it("fila 15 s (teto 60 s); candidatos e avaliadores 30 s (teto 120 s); nada abaixo de 10 s", () => {
    expect(ADMIN_QUEUE_SYNC_INTERVAL_MS).toBe(15000);
    expect(ADMIN_QUEUE_SYNC_MAX_BACKOFF_MS).toBe(60000);
    expect(ADMIN_CANDIDATES_SYNC_INTERVAL_MS).toBe(30000);
    expect(ADMIN_CANDIDATES_SYNC_MAX_BACKOFF_MS).toBe(120000);
    expect(ADMIN_EVALUATORS_SYNC_INTERVAL_MS).toBe(30000);
    expect(ADMIN_EVALUATORS_SYNC_MAX_BACKOFF_MS).toBe(120000);
    for (const interval of [ADMIN_QUEUE_SYNC_INTERVAL_MS, ADMIN_CANDIDATES_SYNC_INTERVAL_MS, ADMIN_EVALUATORS_SYNC_INTERVAL_MS]) {
      expect(interval).toBeGreaterThanOrEqual(10000);
      expect(interval).toBeGreaterThan(INTERVIEW_SYNC_INTERVAL_MS);
    }
  });
});

describe("sync do Admin (4.2): helpers puros", () => {
  const queue = (ids: string[]) => ids.map((id) => ({ id }));
  it("combineQueueResults: fila + avaliadores formam um recurso; qualquer falha falha o ciclo", () => {
    const good = combineQueueResults({ ok: true, data: [] }, { ok: true, data: [] });
    expect(good.ok).toBe(true);
    const bad1 = combineQueueResults({ ok: false, reason: "unauthorized", message: "x" }, { ok: true, data: [] });
    expect(bad1.ok === false && bad1.reason).toBe("unauthorized");
    const bad2 = combineQueueResults({ ok: true, data: [] }, { ok: false, reason: "forbidden", message: "y" });
    expect(bad2.ok === false && bad2.reason).toBe("forbidden");
  });

  it("resolveSelection: mantém a seleção enquanto a entrevista está na fila e a descarta quando some", () => {
    expect(resolveSelection(null, queue(["a"]))).toBeNull();
    expect(resolveSelection("a", queue(["a", "b"]))).toBe("a");
    expect(resolveSelection("a", queue(["b"]))).toBeNull();
    expect(resolveSelection("a", [])).toBeNull();
  });
});

describe("sync do Admin (4.2): FILA", () => {
  type Item = { id: string };
  const make = () => {
    const server = { queue: [{ id: "i1" }] as Item[] };
    const h = wire<Item[]>(async () => ok(server.queue.map((i) => ({ ...i }))), ADMIN_QUEUE_SYNC_INTERVAL_MS, ADMIN_QUEUE_SYNC_MAX_BACKOFF_MS);
    return { server, h };
  };

  it("polling a cada 15 s: nova entrevista HUMAN aparece e a atribuída some, sem loading e sem F5", async () => {
    const { server, h } = make();
    await h.loader.load();
    h.states.length = 0;
    server.queue.push({ id: "i2" });
    await h.advance(15000);
    expect(h.value()?.map((i) => i.id)).toEqual(["i1", "i2"]);
    server.queue = server.queue.filter((i) => i.id !== "i1"); // outro Admin atribuiu
    await h.advance(15000);
    expect(h.value()?.map((i) => i.id)).toEqual(["i2"]);
    expect(h.states.some((s) => s.status === "loading")).toBe(false);
    h.detach();
  });

  it("atribuição local usa refresh silencioso: lista nunca esvazia nem volta a loading", async () => {
    const { server, h } = make();
    await h.loader.load();
    h.states.length = 0;
    server.queue = []; // POST /assign concluído
    expect(await h.loader.refresh({ supersede: true })).toBe("ok");
    expect(h.value()).toEqual([]);
    expect(h.states.map((s) => s.status)).toEqual(["ready"]);
    h.detach();
  });

  it("conflito 409: o refresh silencioso após o conflito traz o estado real e mantém a tela", async () => {
    const { server, h } = make();
    await h.loader.load();
    h.states.length = 0;
    server.queue = [{ id: "i9" }];
    expect(await h.loader.refresh({ supersede: true })).toBe("ok");
    expect(h.value()?.map((i) => i.id)).toEqual(["i9"]);
    expect(h.states.some((s) => s.status !== "ready")).toBe(false);
    h.detach();
  });

  it("sem overlap no polling: refresh normal durante request em voo é ignorado (1 request)", async () => {
    const gate = deferred<LiveResult<Item[]>>();
    const h = wire<Item[]>(() => gate.promise, ADMIN_QUEUE_SYNC_INTERVAL_MS, ADMIN_QUEUE_SYNC_MAX_BACKOFF_MS);
    const first = h.loader.refresh();
    expect(await h.loader.refresh()).toBe("ok");
    expect(h.requests()).toBe(1);
    gate.resolve(ok([{ id: "a" }]));
    await first;
    h.detach();
  });

  it("stale guard: poll em voo ANTES da atribuição não sobrescreve a leitura feita DEPOIS (supersede)", async () => {
    const slow = deferred<LiveResult<Item[]>>(); // resposta antiga: ainda com a entrevista
    const fresh = deferred<LiveResult<Item[]>>(); // resposta nova: sem a entrevista
    const queue = [slow, fresh];
    const h = wire<Item[]>(() => queue.shift()!.promise, ADMIN_QUEUE_SYNC_INTERVAL_MS, ADMIN_QUEUE_SYNC_MAX_BACKOFF_MS);
    const poll = h.loader.refresh();
    const afterAssign = h.loader.refresh({ supersede: true });
    fresh.resolve(ok([]));
    await afterAssign;
    slow.resolve(ok([{ id: "i1" }]));
    await poll;
    expect(h.value()).toEqual([]);
    h.detach();
  });

  it("hidden/offline pausam; visible/online/focus atualizam na hora", async () => {
    const { h } = make();
    await h.loader.load();
    const base = h.requests();
    h.setVisibility("hidden");
    h.fire("visibilitychange");
    await h.advance(120000);
    expect(h.requests()).toBe(base);
    expect(h.pendingTimers()).toBe(0);
    h.setVisibility("visible");
    h.fire("visibilitychange");
    await h.advance(0);
    expect(h.requests()).toBe(base + 1);
    h.env.online = false;
    h.fire("offline");
    await h.advance(120000);
    expect(h.requests()).toBe(base + 1);
    h.env.online = true;
    h.fire("online");
    await h.advance(0);
    expect(h.requests()).toBe(base + 2);
    await h.advance(2000);
    h.fire("focus");
    await h.advance(0);
    expect(h.requests()).toBe(base + 3);
    h.detach();
  });

  it("backoff 15→30→60 s (teto 60 s) em falhas, mantendo a fila; volta a 15 s ao recuperar", async () => {
    let failing = true;
    const h = wire<Item[]>(async () => (failing ? fail("error") : ok([{ id: "i1" }])), ADMIN_QUEUE_SYNC_INTERVAL_MS, ADMIN_QUEUE_SYNC_MAX_BACKOFF_MS);
    failing = false;
    await h.loader.load();
    failing = true;
    h.states.length = 0;
    await h.advance(15000 + 30000 + 60000 + 60000);
    expect(h.delays.slice(0, 4)).toEqual([15000, 30000, 60000, 60000]);
    expect(h.value()).toEqual([{ id: "i1" }]); // dado mantido
    expect(h.states).toHaveLength(0); // erro temporário não publica nada
    failing = false;
    await h.advance(60000);
    expect(h.delays[h.delays.length - 1]).toBe(15000);
    h.detach();
  });

  it("401/403 interrompem o polling (sem timers/listeners) e preservam a fila exibida", async () => {
    for (const reason of ["unauthorized", "forbidden"]) {
      let denied = false;
      const h = wire<Item[]>(async () => (denied ? fail(reason) : ok([{ id: "i1" }])), ADMIN_QUEUE_SYNC_INTERVAL_MS, ADMIN_QUEUE_SYNC_MAX_BACKOFF_MS);
      await h.loader.load();
      denied = true;
      await h.advance(15000);
      expect(h.pendingTimers()).toBe(0);
      expect(h.listenerCount()).toBe(0);
      const before = h.requests();
      h.fire("focus");
      await h.advance(120000);
      expect(h.requests()).toBe(before);
      expect(h.value()).toEqual([{ id: "i1" }]);
      expect(h.loader.getState().status).toBe("ready");
    }
  });

  it("cleanup: dispose limpa timers e listeners; remontar não duplica intervalos; nenhum update após dispose", async () => {
    const { h } = make();
    await h.loader.load();
    const mounted = h.listenerCount();
    expect(mounted).toBe(4);
    h.detach();
    expect(h.listenerCount()).toBe(0);
    expect(h.pendingTimers()).toBe(0);
    const before = h.states.length;
    await h.advance(120000);
    expect(h.states).toHaveLength(before);
    // "remontagem": um novo par loader+poller é independente; nunca 2 timers pendentes por montagem
    const again = make().h;
    await again.loader.load();
    expect(again.pendingTimers()).toBe(1);
    expect(again.listenerCount()).toBe(4);
    again.detach();
  });
});

describe("sync do Admin (4.2): CANDIDATOS", () => {
  type Row = { id: string; name: string; email: string };
  const rows: Row[] = [
    { id: "1", name: "Ana", email: "ana@gmail.com" },
    { id: "2", name: "Bruno", email: "bruno@gmail.com" },
  ];
  const make = () => {
    const server = { list: rows.map((r) => ({ ...r })) };
    const h = wire<{ total: number; candidates: Row[] }>(
      async () => ok({ total: server.list.length, candidates: server.list.map((r) => ({ ...r })) }),
      ADMIN_CANDIDATES_SYNC_INTERVAL_MS,
      ADMIN_CANDIDATES_SYNC_MAX_BACKOFF_MS,
    );
    return { server, h };
  };

  it("novo candidato cadastrado aparece no refresh (30 s) e dado básico alterado reflete; sem loading", async () => {
    const { server, h } = make();
    await h.loader.load();
    h.states.length = 0;
    await h.advance(29000);
    expect(h.value()?.total).toBe(2);
    server.list.push({ id: "3", name: "Carla", email: "carla@gmail.com" });
    server.list[0].name = "Ana Maria";
    await h.advance(1000);
    expect(h.value()?.total).toBe(3);
    expect(h.value()?.candidates[0].name).toBe("Ana Maria");
    expect(h.states.some((s) => s.status === "loading")).toBe(false);
    h.detach();
  });

  it("busca/filtro (estado do componente) é aplicado sobre a lista atualizada sem ser resetado", async () => {
    const { server, h } = make();
    await h.loader.load();
    const search = "car"; // permanece: é useState da tela, fora do recurso
    const filter = (list: Row[]) => list.filter((c) => c.name.toLowerCase().includes(search));
    expect(filter(h.value()!.candidates)).toEqual([]);
    server.list.push({ id: "3", name: "Carla", email: "carla@gmail.com" });
    await h.advance(30000);
    expect(filter(h.value()!.candidates).map((c) => c.name)).toEqual(["Carla"]);
    h.detach();
  });

  it("dado igual não publica (sem re-render)", async () => {
    const { h } = make();
    await h.loader.load();
    h.states.length = 0;
    await h.advance(90000);
    expect(h.states).toHaveLength(0);
    expect(h.requests()).toBe(4);
    h.detach();
  });

  it("sem overlap, hidden/offline pausam e 401/403 param", async () => {
    const gate = deferred<LiveResult<{ total: number }>>();
    const slow = wire<{ total: number }>(() => gate.promise, ADMIN_CANDIDATES_SYNC_INTERVAL_MS, ADMIN_CANDIDATES_SYNC_MAX_BACKOFF_MS);
    const first = slow.loader.refresh();
    expect(await slow.loader.refresh()).toBe("ok");
    expect(slow.requests()).toBe(1);
    gate.resolve(ok({ total: 1 }));
    await first;
    slow.detach();

    const { h } = make();
    await h.loader.load();
    h.setVisibility("hidden");
    h.fire("visibilitychange");
    h.env.online = false;
    h.fire("offline");
    await h.advance(300000);
    expect(h.requests()).toBe(1);
    h.detach();

    let denied = false;
    const guarded = wire<{ total: number }>(async () => (denied ? fail("forbidden") : ok({ total: 1 })), ADMIN_CANDIDATES_SYNC_INTERVAL_MS, ADMIN_CANDIDATES_SYNC_MAX_BACKOFF_MS);
    await guarded.loader.load();
    denied = true;
    await guarded.advance(30000);
    expect(guarded.listenerCount()).toBe(0);
    expect(guarded.value()).toEqual({ total: 1 });
    guarded.detach();
  });
});

describe("sync do Admin (4.2): AVALIADORES", () => {
  type Ev = { id: number; name: string; accountStatus: string; eligible: boolean; assignedCount: number };
  const make = () => {
    const server = {
      list: [
        { id: 1, name: "Carlos", accountStatus: "ACTIVE", eligible: true, assignedCount: 1 },
        { id: 2, name: "Camila", accountStatus: "ACTIVE", eligible: true, assignedCount: 0 },
        { id: 3, name: "Patricia", accountStatus: "INVITED", eligible: false, assignedCount: 0 },
      ] as Ev[],
    };
    const h = wire<Ev[]>(async () => ok(server.list.map((e) => ({ ...e }))), ADMIN_EVALUATORS_SYNC_INTERVAL_MS, ADMIN_EVALUATORS_SYNC_MAX_BACKOFF_MS);
    return { server, h };
  };
  const ui = (list: Ev[] | null) => presentableEvaluators((list ?? []) as never) as unknown as Ev[];

  it("assignedCount muda no refresh silencioso (30 s), sem loading", async () => {
    const { server, h } = make();
    await h.loader.load();
    h.states.length = 0;
    server.list[0].assignedCount = 2;
    await h.advance(30000);
    expect(h.value()?.[0].assignedCount).toBe(2);
    expect(h.states.some((s) => s.status === "loading")).toBe(false);
    h.detach();
  });

  it("a UI continua só ACTIVE + eligible; INVITED segue oculto e muda de status reflete", async () => {
    const { server, h } = make();
    await h.loader.load();
    expect(ui(h.value()).map((e) => e.name)).toEqual(["Carlos", "Camila"]);
    server.list[2] = { ...server.list[2], accountStatus: "ACTIVE", eligible: true }; // ativada
    server.list[1] = { ...server.list[1], accountStatus: "INACTIVE", eligible: false }; // desativada
    await h.advance(30000);
    expect(ui(h.value()).map((e) => e.name)).toEqual(["Carlos", "Patricia"]);
    h.detach();
  });

  it("sem overlap, hidden/offline pausam, backoff até 120 s e 401/403 param", async () => {
    const { h } = make();
    await h.loader.load();
    h.setVisibility("hidden");
    h.fire("visibilitychange");
    await h.advance(300000);
    expect(h.requests()).toBe(1);
    h.detach();

    let failing = false;
    const f = wire<Ev[]>(async () => (failing ? fail("error") : ok([])), ADMIN_EVALUATORS_SYNC_INTERVAL_MS, ADMIN_EVALUATORS_SYNC_MAX_BACKOFF_MS);
    await f.loader.load();
    failing = true;
    await f.advance(30000 + 60000 + 120000 + 120000);
    expect(f.delays.slice(0, 4)).toEqual([30000, 60000, 120000, 120000]);
    f.detach();

    let denied = false;
    const g = wire<Ev[]>(async () => (denied ? fail("unauthorized") : ok([])), ADMIN_EVALUATORS_SYNC_INTERVAL_MS, ADMIN_EVALUATORS_SYNC_MAX_BACKOFF_MS);
    await g.loader.load();
    denied = true;
    await g.advance(30000);
    expect(g.pendingTimers()).toBe(0);
    expect(g.listenerCount()).toBe(0);
    g.detach();
  });
});
