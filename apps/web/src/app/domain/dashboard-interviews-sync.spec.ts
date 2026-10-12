import { describe, expect, it } from "vitest";
import {
  DASHBOARD_INTERVIEWS_SYNC_INTERVAL_MS,
  applyInProgressResult,
  attachDashboardInterviewsSync,
  type InProgressInterviewsState,
} from "./dashboard-interviews-sync";
import { INTERVIEW_SYNC_INTERVAL_MS, type InterviewSyncResult, type SyncScheduler } from "./interview-sync-poller";
import { resolveDashboardInterviewAccess, resolveNewInterviewGate, mergeInProgressEntries, type InProgressListItem } from "./interview-resume";

function harness(options: { visible?: boolean; online?: boolean } = {}) {
  let clock = 0;
  let nextId = 1;
  const tasks = new Map<number, { at: number; ms: number; fn: () => void }>();
  const delays: number[] = [];
  const scheduler: SyncScheduler = {
    set: (fn, ms) => {
      const id = nextId++;
      delays.push(ms);
      tasks.set(id, { at: clock + ms, ms, fn });
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
  const refresh = () => {
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
  const detach = attachDashboardInterviewsSync({ win: target, doc, refresh, scheduler, isOnline: () => state.online, now: () => clock });
  return {
    detach, calls, delays, advance, flush, fire, doc, state, listenerCount,
    pendingTimers: () => tasks.size,
    setMode: (v: "instant" | "manual") => void (mode = v),
    setResult: (v: InterviewSyncResult) => void (nextResult = v),
    resolveAll: async (v: InterviewSyncResult = "ok") => { pending.splice(0).forEach((r) => r(v)); await flush(); },
  };
}

describe("Dashboard: sincronização entre dispositivos (polling de 15 s)", () => {
  it("usa 15000 ms e nunca o intervalo de 4 s do wizard", () => {
    expect(DASHBOARD_INTERVIEWS_SYNC_INTERVAL_MS).toBe(15000);
    expect(INTERVIEW_SYNC_INTERVAL_MS).toBe(4000); // polling do wizard inalterado
    const h = harness();
    expect(h.delays).toEqual([15000]);
    expect(h.delays).not.toContain(4000);
    h.detach();
  });

  it("o polling dispara a cada 15 s, não antes", async () => {
    const h = harness();
    await h.advance(14999);
    expect(h.calls).toHaveLength(0);
    await h.advance(1);
    expect(h.calls).toHaveLength(1);
    await h.advance(15000);
    expect(h.calls).toHaveLength(2);
    h.detach();
  });

  it("hidden pausa; voltar a visible faz refresh imediato e retoma os 15 s", async () => {
    const h = harness();
    h.doc.visibilityState = "hidden";
    h.fire("visibilitychange");
    await h.advance(60000);
    expect(h.calls).toHaveLength(0);
    expect(h.pendingTimers()).toBe(0);
    h.doc.visibilityState = "visible";
    h.fire("visibilitychange");
    await h.flush();
    expect(h.calls).toHaveLength(1);
    await h.advance(15000);
    expect(h.calls).toHaveLength(2);
    h.detach();
  });

  it("focus faz refresh imediato", async () => {
    const h = harness();
    await h.advance(5000);
    h.fire("focus");
    await h.flush();
    expect(h.calls).toHaveLength(1);
    h.detach();
  });

  it("focus + visible quase juntos geram uma única chamada", async () => {
    const h = harness();
    await h.advance(5000);
    h.fire("visibilitychange");
    h.fire("focus");
    await h.flush();
    expect(h.calls).toHaveLength(1);
    h.detach();
  });

  it("offline pausa; online faz refresh imediato", async () => {
    const h = harness();
    h.state.online = false;
    h.fire("offline");
    await h.advance(60000);
    expect(h.calls).toHaveLength(0);
    h.state.online = true;
    h.fire("online");
    await h.flush();
    expect(h.calls).toHaveLength(1);
    h.detach();
  });

  it("aba hidden ou offline ao montar não consulta nada", async () => {
    const hidden = harness({ visible: false });
    await hidden.advance(60000);
    expect(hidden.calls).toHaveLength(0);
    hidden.detach();
    const offline = harness({ online: false });
    await offline.advance(60000);
    expect(offline.calls).toHaveLength(0);
    offline.detach();
  });

  it("requisições não se sobrepõem: o próximo ciclo só depois que a atual termina", async () => {
    const h = harness();
    h.setMode("manual");
    await h.advance(15000);
    expect(h.calls).toHaveLength(1);
    h.fire("focus");
    await h.advance(20000);
    expect(h.calls).toHaveLength(1);
    expect(h.pendingTimers()).toBe(0);
    await h.resolveAll();
    expect(h.pendingTimers()).toBe(1);
    h.detach();
  });

  it("cleanup ao sair do Dashboard remove timers e listeners", async () => {
    const h = harness();
    expect(h.listenerCount()).toBeGreaterThan(0);
    h.detach();
    expect(h.listenerCount()).toBe(0);
    expect(h.pendingTimers()).toBe(0);
    h.fire("focus");
    await h.advance(60000);
    expect(h.calls).toHaveLength(0);
  });

  it("erro de polling é silencioso: tenta de novo no próximo ciclo, sem backoff agressivo", async () => {
    const h = harness();
    h.setResult("error");
    await h.advance(15000);
    expect(h.calls).toHaveLength(1);
    expect(h.pendingTimers()).toBe(1);
    await h.advance(16000);
    expect(h.calls).toHaveLength(2);
    h.setResult("ok");
    await h.advance(16000);
    await h.advance(15000);
    expect(h.calls.length).toBeGreaterThan(2);
    h.detach();
  });
});

const item = (id: string) => ({ id, title: "Dev", company: "Acme", createdAt: "2026-10-01T10:00:00Z", latestDraftUpdatedAt: null, answeredQuestionCount: 1, questionCount: 5, evaluationMode: null, status: "IN_PROGRESS" }) as unknown as InProgressListItem;
type S = InProgressInterviewsState<InProgressListItem>;
const ready = (items: InProgressListItem[]): S => ({ status: "ready", items, error: null });
const accessOf = (state: S) =>
  resolveDashboardInterviewAccess(resolveNewInterviewGate(mergeInProgressEntries({ server: state.items, localInterviewId: null, localActive: false })));

describe("Dashboard: estado de in-progress ao receber leituras remotas", () => {
  it("erro de polling (silencioso) mantém o último estado conhecido, sem virar erro", () => {
    const prev = ready([item("a")]);
    const next = applyInProgressResult(prev, { ok: false, message: "falhou" }, { silent: true });
    expect(next).toBe(prev);
    expect(accessOf(next).action).toBe("continue");
    // sem mensagem de erro no estado → nada para exibir (sem toast/banner repetido)
    expect(next.error).toBeNull();
  });

  it("carga normal com erro continua virando 'error' (comportamento atual)", () => {
    expect(applyInProgressResult(ready([]), { ok: false, message: "x" }, { silent: false })).toEqual({ status: "error", items: null, error: "x" });
  });

  it("leitura silenciosa bem-sucedida recupera de um erro anterior", () => {
    const failed: S = { status: "error", items: null, error: "x" };
    expect(applyInProgressResult(failed, { ok: true, data: [] }, { silent: true }).status).toBe("ready");
  });

  it("nova IN_PROGRESS remota muda os dois cards para continuação", () => {
    const after = applyInProgressResult(ready([]), { ok: true, data: [item("novo")] }, { silent: true });
    const access = accessOf(after);
    expect(access.action).toBe("continue");
    expect(access.main.title).toBe("Entrevista em andamento");
    expect(access.main.cta).toBe("Continuar entrevista");
    expect(access.quick.title).toBe("Continuar entrevista");
  });

  it("CANCELLED remoto: a entrevista some da lista e os dois cards voltam para 'Nova entrevista'", () => {
    const after = applyInProgressResult(ready([item("a")]), { ok: true, data: [] }, { silent: true });
    const access = accessOf(after);
    expect(access.action).toBe("start");
    expect(access.main).toMatchObject({ title: "Nova entrevista", cta: "Praticar" });
    expect(access.quick.title).toBe("Nova entrevista");
  });

  it("envio remoto (deixa de ser IN_PROGRESS): mesmo retorno ao estado de nova prática", () => {
    const after = applyInProgressResult(ready([item("a")]), { ok: true, data: [] }, { silent: true });
    expect(accessOf(after).main.cta).toBe("Praticar");
  });

  it("card pequeno acompanha o principal em ambos os estados", () => {
    for (const items of [[], [item("a")]]) {
      const access = accessOf(ready(items));
      const continuing = access.action === "continue";
      expect(access.quick.title === "Continuar entrevista").toBe(continuing);
      expect(access.main.cta === "Continuar entrevista").toBe(continuing);
    }
  });
});
