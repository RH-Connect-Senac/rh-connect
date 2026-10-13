import { describe, expect, it, vi } from "vitest";
import {
  EVALUATOR_HISTORY_SYNC_INTERVAL_MS,
  EVALUATOR_HISTORY_SYNC_MAX_BACKOFF_MS,
  EVALUATOR_QUEUE_SYNC_INTERVAL_MS,
  EVALUATOR_QUEUE_SYNC_MAX_BACKOFF_MS,
  EvaluatorListLoader,
  applyListResult,
  attachEvaluatorListSync,
  isTerminalFailure,
  type EvaluatorListResult,
  type EvaluatorListState,
} from "./evaluator-list-sync";
import type { SyncScheduler } from "./interview-sync-poller";

type Item = { id: string };
const ok = (...ids: string[]): EvaluatorListResult<Item> => ({ ok: true, data: ids.map((id) => ({ id })) });
const fail = (reason = "error", message = "Falha amigável"): EvaluatorListResult<Item> => ({ ok: false, reason, message });
const flush = async () => {
  for (let i = 0; i < 12; i += 1) await Promise.resolve();
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function makeLoader(fetchImpl: () => Promise<EvaluatorListResult<Item>>) {
  const states: EvaluatorListState<Item>[] = [];
  const fetch = vi.fn(fetchImpl);
  const loader = new EvaluatorListLoader<Item>({ fetch, onState: (s) => states.push(s) });
  return { loader, states, fetch };
}

describe("constantes de intervalo", () => {
  it("fila 15 s/60 s e histórico 30 s/120 s", () => {
    expect(EVALUATOR_QUEUE_SYNC_INTERVAL_MS).toBe(15000);
    expect(EVALUATOR_QUEUE_SYNC_MAX_BACKOFF_MS).toBe(60000);
    expect(EVALUATOR_HISTORY_SYNC_INTERVAL_MS).toBe(30000);
    expect(EVALUATOR_HISTORY_SYNC_MAX_BACKOFF_MS).toBe(120000);
  });
});

describe("applyListResult", () => {
  const ready: EvaluatorListState<Item> = { status: "ready", items: [{ id: "a" }] };

  it("sucesso (inicial ou silencioso) vira ready", () => {
    expect(applyListResult({ status: "loading" }, ok("x"), { silent: false })).toEqual({ status: "ready", items: [{ id: "x" }] });
    expect(applyListResult(ready, ok("x", "y"), { silent: true })).toEqual({ status: "ready", items: [{ id: "x" }, { id: "y" }] });
  });

  it("erro inicial mostra a mensagem amigável", () => {
    expect(applyListResult({ status: "loading" }, fail(), { silent: false })).toEqual({ status: "error", message: "Falha amigável" });
  });

  it("erro silencioso preserva exatamente o estado anterior (mesma referência)", () => {
    expect(applyListResult(ready, fail(), { silent: true })).toBe(ready);
  });

  it("401/403 são terminais; outros erros não", () => {
    expect(isTerminalFailure("unauthorized")).toBe(true);
    expect(isTerminalFailure("forbidden")).toBe(true);
    expect(isTerminalFailure("error")).toBe(false);
    expect(isTerminalFailure("not_found")).toBe(false);
  });
});

describe("EvaluatorListLoader: carga inicial x refresh silencioso", () => {
  it("carga inicial mostra loading e depois popula os dados", async () => {
    const t = makeLoader(async () => ok("a"));
    const done = t.loader.load();
    expect(t.states[0]).toEqual({ status: "loading" });
    expect(await done).toBe(true);
    expect(t.states[t.states.length - 1]).toEqual({ status: "ready", items: [{ id: "a" }] });
  });

  it("erro inicial mostra erro normal da tela", async () => {
    const t = makeLoader(async () => fail());
    await t.loader.load();
    expect(t.loader.getState()).toEqual({ status: "error", message: "Falha amigável" });
  });

  it("refresh silencioso NÃO emite loading e atualiza a lista", async () => {
    let next = ok("a");
    const t = makeLoader(async () => next);
    await t.loader.load();
    const before = t.states.length;
    next = ok("a", "b");
    expect(await t.loader.refresh()).toBe("ok");
    const emitted = t.states.slice(before);
    expect(emitted.some((s) => s.status === "loading")).toBe(false);
    expect(t.loader.getState()).toEqual({ status: "ready", items: [{ id: "a" }, { id: "b" }] });
  });

  it("refresh silencioso com erro preserva os dados, não emite estado e devolve 'error'", async () => {
    let next: EvaluatorListResult<Item> = ok("a");
    const t = makeLoader(async () => next);
    await t.loader.load();
    const before = t.states.length;
    const kept = t.loader.getState();
    next = fail("error", "Mensagem técnica");
    expect(await t.loader.refresh()).toBe("error");
    expect(t.states.length).toBe(before);
    expect(t.loader.getState()).toBe(kept);
    // sucesso posterior recupera
    next = ok("c");
    expect(await t.loader.refresh()).toBe("ok");
    expect(t.loader.getState()).toEqual({ status: "ready", items: [{ id: "c" }] });
  });

  it("fetch que lança exceção é tratado como erro silencioso", async () => {
    let boom = false;
    const t = makeLoader(async () => {
      if (boom) throw new Error("rede");
      return ok("a");
    });
    await t.loader.load();
    boom = true;
    expect(await t.loader.refresh()).toBe("error");
    expect(t.loader.getState()).toEqual({ status: "ready", items: [{ id: "a" }] });
  });

  it("erro inicial + refresh com sucesso se recupera sozinho", async () => {
    let next: EvaluatorListResult<Item> = fail();
    const t = makeLoader(async () => next);
    await t.loader.load();
    expect(t.loader.getState().status).toBe("error");
    next = ok("a");
    await t.loader.refresh();
    expect(t.loader.getState()).toEqual({ status: "ready", items: [{ id: "a" }] });
  });

  it("401/403 em refresh silencioso devolvem 'stop' e mantêm os dados", async () => {
    let next: EvaluatorListResult<Item> = ok("a");
    const t = makeLoader(async () => next);
    await t.loader.load();
    next = fail("unauthorized");
    expect(await t.loader.refresh()).toBe("stop");
    next = fail("forbidden");
    expect(await t.loader.refresh()).toBe("stop");
    expect(t.loader.getState()).toEqual({ status: "ready", items: [{ id: "a" }] });
  });
});

describe("EvaluatorListLoader: request em voo e resposta antiga", () => {
  it("refresh durante request em voo não dispara outra", async () => {
    const gate = deferred<EvaluatorListResult<Item>>();
    const t = makeLoader(() => gate.promise);
    const first = t.loader.refresh();
    expect(await t.loader.refresh()).toBe("ok");
    expect(t.fetch).toHaveBeenCalledTimes(1);
    gate.resolve(ok("a"));
    await first;
    expect(t.loader.getState()).toEqual({ status: "ready", items: [{ id: "a" }] });
  });

  it("A inicia, B inicia depois, B termina primeiro: a resposta de A NÃO sobrescreve B", async () => {
    const gates = [deferred<EvaluatorListResult<Item>>(), deferred<EvaluatorListResult<Item>>()];
    let call = 0;
    const t = makeLoader(() => gates[call++].promise);
    const a = t.loader.load(); // A
    const b = t.loader.load(); // B (ex.: "Tentar novamente")
    gates[1].resolve(ok("novo"));
    await b;
    gates[0].resolve(ok("antigo"));
    await a;
    expect(t.loader.getState()).toEqual({ status: "ready", items: [{ id: "novo" }] });
  });

  it("depois que o load B substitui um refresh A em voo, A é descartado", async () => {
    const gates = [deferred<EvaluatorListResult<Item>>(), deferred<EvaluatorListResult<Item>>()];
    let call = 0;
    const t = makeLoader(() => gates[call++].promise);
    const a = t.loader.refresh();
    const b = t.loader.load();
    gates[1].resolve(ok("b"));
    await b;
    gates[0].resolve(ok("a"));
    expect(await a).toBe("ok");
    expect(t.loader.getState()).toEqual({ status: "ready", items: [{ id: "b" }] });
  });

  it("dispose descarta a resposta em voo e não emite mais estado", async () => {
    const gate = deferred<EvaluatorListResult<Item>>();
    const t = makeLoader(() => gate.promise);
    const pending = t.loader.load();
    const emitted = t.states.length;
    t.loader.dispose();
    gate.resolve(ok("a"));
    await pending;
    expect(t.states.length).toBe(emitted);
    expect(await t.loader.refresh()).toBe("ok");
    expect(t.fetch).toHaveBeenCalledTimes(1);
  });
});

// ── Integração com o motor compartilhado (focus/visible/online/hidden/offline) ──
function harness(options: { intervalMs: number; maxBackoffMs: number; results: () => EvaluatorListResult<Item> }) {
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
  const doc = { ...target, visibilityState: "visible" };
  const env = { online: true };
  const fire = (type: string) => listeners.get(type)?.forEach((fn) => fn());
  const fetch = vi.fn(async () => options.results());
  const states: EvaluatorListState<Item>[] = [];
  const loader = new EvaluatorListLoader<Item>({ fetch, onState: (s) => states.push(s) });
  const detach = attachEvaluatorListSync({
    win: target,
    doc,
    isOnline: () => env.online,
    refresh: () => loader.refresh(),
    intervalMs: options.intervalMs,
    maxBackoffMs: options.maxBackoffMs,
    scheduler,
    now: () => clock,
  });
  const advance = async (ms: number) => {
    clock += ms;
    for (const [id, task] of [...tasks.entries()].sort((a, b) => a[1].at - b[1].at)) {
      if (task.at <= clock && tasks.has(id)) {
        tasks.delete(id);
        task.fn();
        await flush();
      }
    }
    await flush();
  };
  const listenerCount = () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0);
  return { advance, fire, doc, env, fetch, loader, states, detach, delays, pendingTimers: () => tasks.size, listenerCount };
}

describe("polling da fila (15 s) e do histórico (30 s)", () => {
  it("fila: dispara a cada 15 s e não antes", async () => {
    const h = harness({ intervalMs: EVALUATOR_QUEUE_SYNC_INTERVAL_MS, maxBackoffMs: EVALUATOR_QUEUE_SYNC_MAX_BACKOFF_MS, results: () => ok("a") });
    expect(h.delays[0]).toBe(15000);
    await h.advance(14999);
    expect(h.fetch).toHaveBeenCalledTimes(0);
    await h.advance(1);
    expect(h.fetch).toHaveBeenCalledTimes(1);
    await h.advance(15000);
    expect(h.fetch).toHaveBeenCalledTimes(2);
  });

  it("histórico: dispara a cada 30 s", async () => {
    const h = harness({ intervalMs: EVALUATOR_HISTORY_SYNC_INTERVAL_MS, maxBackoffMs: EVALUATOR_HISTORY_SYNC_MAX_BACKOFF_MS, results: () => ok("a") });
    expect(h.delays[0]).toBe(30000);
    await h.advance(29999);
    expect(h.fetch).toHaveBeenCalledTimes(0);
    await h.advance(1);
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it("backoff da fila 15 -> 30 -> 60 (teto) e volta a 15 s no sucesso; erros são silenciosos", async () => {
    let result: EvaluatorListResult<Item> = fail();
    const h = harness({ intervalMs: 15000, maxBackoffMs: 60000, results: () => result });
    await h.loader.load(); // erro inicial normal
    await h.advance(15000);
    await h.advance(30000);
    await h.advance(60000);
    await h.advance(60000);
    expect(h.delays.slice(0, 5)).toEqual([15000, 30000, 60000, 60000, 60000]);
    result = ok("a");
    await h.advance(60000);
    expect(h.delays[h.delays.length - 1]).toBe(15000);
    expect(h.loader.getState()).toEqual({ status: "ready", items: [{ id: "a" }] });
  });

  it("falha uma vez mantém os dados e o ciclo seguinte recupera", async () => {
    let result: EvaluatorListResult<Item> = ok("a");
    const h = harness({ intervalMs: 15000, maxBackoffMs: 60000, results: () => result });
    await h.loader.load();
    result = fail();
    await h.advance(15000);
    expect(h.loader.getState()).toEqual({ status: "ready", items: [{ id: "a" }] });
    result = ok("a", "b");
    await h.advance(30000);
    expect(h.loader.getState()).toEqual({ status: "ready", items: [{ id: "a" }, { id: "b" }] });
  });

  it("hidden pausa; voltar a visible atualiza na hora", async () => {
    const h = harness({ intervalMs: 15000, maxBackoffMs: 60000, results: () => ok("a") });
    h.doc.visibilityState = "hidden";
    h.fire("visibilitychange");
    expect(h.pendingTimers()).toBe(0);
    await h.advance(60000);
    expect(h.fetch).toHaveBeenCalledTimes(0);
    h.doc.visibilityState = "visible";
    h.fire("visibilitychange");
    await flush();
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it("offline pausa; online atualiza na hora", async () => {
    const h = harness({ intervalMs: 15000, maxBackoffMs: 60000, results: () => ok("a") });
    h.env.online = false;
    h.fire("offline");
    expect(h.pendingTimers()).toBe(0);
    await h.advance(60000);
    expect(h.fetch).toHaveBeenCalledTimes(0);
    h.env.online = true;
    h.fire("online");
    await flush();
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });

  it("focus atualiza na hora; focus+visible+online juntos geram UMA só request", async () => {
    const h = harness({ intervalMs: 15000, maxBackoffMs: 60000, results: () => ok("a") });
    await h.advance(20000);
    await h.advance(2000); // fora da janela de supressão do último sync
    const before = h.fetch.mock.calls.length;
    h.fire("focus");
    h.fire("visibilitychange");
    h.fire("online");
    await flush();
    expect(h.fetch.mock.calls.length - before).toBe(1);
  });

  it("eventos colados num sync recém-feito (< 1 s) são suprimidos", async () => {
    const h = harness({ intervalMs: 15000, maxBackoffMs: 60000, results: () => ok("a") });
    await h.advance(15000); // sync periódico
    const before = h.fetch.mock.calls.length;
    h.fire("focus");
    h.fire("online");
    await flush();
    expect(h.fetch.mock.calls.length).toBe(before);
  });

  it("401 em refresh automático encerra o polling (sem timers nem listeners)", async () => {
    let result: EvaluatorListResult<Item> = ok("a");
    const h = harness({ intervalMs: 15000, maxBackoffMs: 60000, results: () => result });
    await h.loader.load();
    result = fail("unauthorized");
    await h.advance(15000);
    expect(h.fetch.mock.calls.length).toBe(2);
    expect(h.pendingTimers()).toBe(0);
    expect(h.listenerCount()).toBe(0);
    await h.advance(120000);
    expect(h.fetch.mock.calls.length).toBe(2);
    expect(h.loader.getState()).toEqual({ status: "ready", items: [{ id: "a" }] });
  });

  it("cleanup remove timers e listeners", async () => {
    const h = harness({ intervalMs: 15000, maxBackoffMs: 60000, results: () => ok("a") });
    expect(h.listenerCount()).toBeGreaterThan(0);
    h.detach();
    expect(h.pendingTimers()).toBe(0);
    expect(h.listenerCount()).toBe(0);
    await h.advance(60000);
    expect(h.fetch).toHaveBeenCalledTimes(0);
  });

  it("busca digitada no histórico não faz parte do estado da lista (não é tocada pelo refresh)", async () => {
    const h = harness({ intervalMs: 30000, maxBackoffMs: 120000, results: () => ok("a") });
    const search = "maria";
    await h.advance(30000);
    expect(search).toBe("maria");
    expect(JSON.stringify(h.loader.getState())).not.toContain("maria");
  });
});
