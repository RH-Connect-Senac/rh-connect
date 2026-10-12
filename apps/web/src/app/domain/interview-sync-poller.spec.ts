import { describe, expect, it } from "vitest";
import {
  INTERVIEW_SYNC_INTERVAL_MS,
  INTERVIEW_SYNC_MAX_BACKOFF_MS,
  attachInterviewSyncPolling,
  type InterviewSyncResult,
  type SyncScheduler,
} from "./interview-sync-poller";

function harness(options: { visible?: boolean; online?: boolean } = {}) {
  let clock = 0;
  let nextId = 1;
  const tasks = new Map<number, { at: number; fn: () => void }>();
  const scheduler: SyncScheduler = {
    set: (fn, ms) => {
      const id = nextId++;
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
  const state = { online: options.online !== false };
  const fire = (type: string) => listeners.get(type)?.forEach((fn) => fn());
  const calls: number[] = [];
  let pending: Array<(value: InterviewSyncResult) => void> = [];
  let mode: "instant" | "manual" = "instant";
  let nextResult: InterviewSyncResult = "ok";

  const sync = () => {
    calls.push(clock);
    if (mode === "manual") return new Promise<InterviewSyncResult>((resolve) => void pending.push(resolve));
    return Promise.resolve(nextResult);
  };
  const flush = async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  };
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
  const detach = attachInterviewSyncPolling({ win: target, doc, sync, scheduler, isOnline: () => state.online, now: () => clock });
  return {
    detach,
    calls,
    advance,
    flush,
    fire,
    doc,
    state,
    pendingTimers: () => tasks.size,
    listenerCount,
    setMode: (value: "instant" | "manual") => void (mode = value),
    setResult: (value: InterviewSyncResult) => void (nextResult = value),
    resolveNext: async (value: InterviewSyncResult = "ok") => {
      pending.shift()?.(value);
      await flush();
    },
    pendingRequests: () => pending.length,
  };
}

describe("polling de sincronização entre dispositivos", () => {
  it("usa 4000 ms e inicia agendando o primeiro ciclo (sem request imediata: a entrada já sincroniza)", async () => {
    expect(INTERVIEW_SYNC_INTERVAL_MS).toBe(4000);
    const h = harness();
    expect(h.calls.length).toBe(0);
    expect(h.pendingTimers()).toBe(1);
    await h.advance(3999);
    expect(h.calls.length).toBe(0);
    await h.advance(1);
    expect(h.calls.length).toBe(1);
  });

  it("repete a cada ciclo enquanto visível e online", async () => {
    const h = harness();
    await h.advance(4000);
    await h.advance(4000);
    await h.advance(4000);
    expect(h.calls.length).toBe(3);
  });

  it("aba escondida: pausa (nenhum timer, nenhuma request)", async () => {
    const h = harness();
    h.doc.visibilityState = "hidden";
    h.fire("visibilitychange");
    expect(h.pendingTimers()).toBe(0);
    await h.advance(20000);
    expect(h.calls.length).toBe(0);
  });

  it("volta a ficar visível: sync IMEDIATO e retoma o intervalo", async () => {
    const h = harness();
    h.doc.visibilityState = "hidden";
    h.fire("visibilitychange");
    await h.advance(10000);
    h.doc.visibilityState = "visible";
    h.fire("visibilitychange");
    await h.flush();
    expect(h.calls.length).toBe(1);
    expect(h.pendingTimers()).toBe(1);
    await h.advance(4000);
    expect(h.calls.length).toBe(2);
  });

  it("foco da janela também sincroniza na hora; focus+visibilitychange juntos não duplicam", async () => {
    const h = harness();
    await h.advance(5000);
    await h.advance(2000);
    const before = h.calls.length;
    h.fire("focus");
    h.fire("visibilitychange");
    await h.flush();
    expect(h.calls.length - before).toBe(1);
  });

  it("nunca sobrepõe requests: sync em andamento não deixa nascer outro", async () => {
    const h = harness();
    h.setMode("manual");
    await h.advance(4000);
    expect(h.pendingRequests()).toBe(1);
    await h.advance(30000);
    h.fire("focus");
    await h.flush();
    expect(h.calls.length).toBe(1);
    await h.resolveNext("ok");
    expect(h.pendingTimers()).toBe(1);
  });

  it("offline pausa; online volta com sync imediato", async () => {
    const h = harness();
    h.state.online = false;
    h.fire("offline");
    expect(h.pendingTimers()).toBe(0);
    await h.advance(20000);
    expect(h.calls.length).toBe(0);
    h.state.online = true;
    h.fire("online");
    await h.flush();
    expect(h.calls.length).toBe(1);
    expect(h.pendingTimers()).toBe(1);
  });

  it("falha de rede: sem retry agressivo (intervalo dobra até o teto) e volta ao normal no sucesso", async () => {
    const h = harness();
    h.setResult("error");
    await h.advance(4000); // 1ª falha
    expect(h.calls.length).toBe(1);
    await h.advance(4000); // ainda dentro do intervalo dobrado (8000)
    expect(h.calls.length).toBe(1);
    await h.advance(4000);
    expect(h.calls.length).toBe(2);
    for (let i = 0; i < 6; i += 1) await h.advance(INTERVIEW_SYNC_MAX_BACKOFF_MS);
    const settled = h.calls.length;
    await h.advance(INTERVIEW_SYNC_MAX_BACKOFF_MS - 1);
    expect(h.calls.length).toBe(settled);
    h.setResult("ok");
    await h.advance(INTERVIEW_SYNC_MAX_BACKOFF_MS);
    await h.advance(INTERVIEW_SYNC_INTERVAL_MS);
    expect(h.calls.length).toBeGreaterThan(settled);
  });

  it("sync que lança erro não derruba o polling", async () => {
    let clock = 0;
    const tasks: Array<() => void> = [];
    const target = { addEventListener: () => undefined, removeEventListener: () => undefined };
    let calls = 0;
    attachInterviewSyncPolling({
      win: target,
      doc: { ...target, visibilityState: "visible" },
      sync: async () => {
        calls += 1;
        throw new Error("boom");
      },
      scheduler: { set: (fn) => (tasks.push(fn), tasks.length), clear: () => undefined },
      now: () => clock++,
    });
    tasks.shift()!();
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
    expect(calls).toBe(1);
    expect(tasks.length).toBe(1); // próximo ciclo agendado
  });

  it("sessão terminal ('stop'): encerra sozinho e remove listeners/timers", async () => {
    const h = harness();
    h.setResult("stop");
    await h.advance(4000);
    expect(h.calls.length).toBe(1);
    expect(h.pendingTimers()).toBe(0);
    expect(h.listenerCount()).toBe(0);
    h.fire("focus");
    await h.advance(60000);
    expect(h.calls.length).toBe(1);
  });

  it("cleanup (desmontar / sair do wizard / 'Sair e continuar depois'): sem timer, listener nem request depois", async () => {
    const h = harness();
    h.detach();
    expect(h.pendingTimers()).toBe(0);
    expect(h.listenerCount()).toBe(0);
    h.fire("focus");
    await h.advance(60000);
    expect(h.calls.length).toBe(0);
  });

  it("cleanup durante um sync em andamento não agenda novo ciclo", async () => {
    const h = harness();
    h.setMode("manual");
    await h.advance(4000);
    h.detach();
    await h.resolveNext("ok");
    expect(h.pendingTimers()).toBe(0);
  });
});
