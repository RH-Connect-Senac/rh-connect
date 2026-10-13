import { describe, expect, it } from "vitest";
import {
  ADMIN_DASHBOARD_SYNC_INTERVAL_MS,
  ADMIN_DASHBOARD_SYNC_MAX_BACKOFF_MS,
} from "./admin-live-sync";
import { toDashboardSnapshot, type AdminDashboardSnapshot } from "./admin-dashboard-view";
import { LiveResourceLoader, type LiveResult, type LiveState } from "./candidate-live-sync";
import type { AdminDashboard } from "../services/admin-dashboard-service";

const dash = (generatedAt: string, candidateCount = 3): AdminDashboard => ({
  generatedAt,
  summary: { candidateCount, activeEvaluatorCount: 3, pendingAssignmentCount: 3, averageScore: 7.3, averageScoreSample: 13 },
  interviewsByMonth: [{ month: "2026-10", total: 29 }],
  recentActivity: [],
});

function setup(results: Array<LiveResult<AdminDashboardSnapshot>>) {
  const states: LiveState<AdminDashboardSnapshot>[] = [];
  let calls = 0;
  const loader = new LiveResourceLoader<AdminDashboardSnapshot>({
    fetch: async () => results[Math.min(calls++, results.length - 1)],
    onState: (s) => states.push(s),
  });
  return { loader, states, calls: () => calls };
}
const ok = (d: AdminDashboard): LiveResult<AdminDashboardSnapshot> => ({ ok: true, data: toDashboardSnapshot(d) });

describe("sync do Dashboard Admin (4.3B)", () => {
  it("frequência: 30 s com teto de backoff de 120 s", () => {
    expect(ADMIN_DASHBOARD_SYNC_INTERVAL_MS).toBe(30000);
    expect(ADMIN_DASHBOARD_SYNC_MAX_BACKOFF_MS).toBe(120000);
  });

  it("refresh com mesmo conteúdo (só generatedAt mudou) não publica novo estado", async () => {
    const { loader, states } = setup([ok(dash("2026-10-13T12:00:00Z")), ok(dash("2026-10-13T12:00:30Z"))]);
    await loader.load();
    expect(states).toHaveLength(1);
    expect(await loader.refresh()).toBe("ok");
    expect(states).toHaveLength(1);
  });

  it("refresh com número novo publica ready sem passar por loading", async () => {
    const { loader, states } = setup([ok(dash("a", 3)), ok(dash("b", 4))]);
    await loader.load();
    await loader.refresh();
    expect(states.map((s) => s.status)).toEqual(["ready", "ready"]);
    const last = states[1];
    expect(last.status === "ready" && last.value.summary.candidateCount).toBe(4);
  });

  it("falha silenciosa mantém o último dado válido e sinaliza erro (backoff)", async () => {
    const { loader, states } = setup([
      ok(dash("a")),
      { ok: false, reason: "error", message: "Falhou." },
    ]);
    await loader.load();
    expect(await loader.refresh()).toBe("error");
    expect(states).toHaveLength(1);
    expect(loader.getState().status).toBe("ready");
  });

  it("401/403 param o polling e mantêm os dados", async () => {
    for (const reason of ["unauthorized", "forbidden"]) {
      const { loader } = setup([ok(dash("a")), { ok: false, reason, message: "x" }]);
      await loader.load();
      expect(await loader.refresh()).toBe("stop");
      expect(loader.getState().status).toBe("ready");
    }
  });

  it("erro na carga inicial vira estado de erro com 'Tentar novamente' (load)", async () => {
    const { loader } = setup([{ ok: false, reason: "error", message: "Falhou." }, ok(dash("a"))]);
    await loader.load();
    expect(loader.getState()).toMatchObject({ status: "error", message: "Falhou." });
    await loader.load();
    expect(loader.getState().status).toBe("ready");
  });

  it("não sobrepõe requests: refresh durante outro em voo é ignorado", async () => {
    let release!: () => void;
    let calls = 0;
    const loader = new LiveResourceLoader<AdminDashboardSnapshot>({
      fetch: async () => {
        calls += 1;
        if (calls === 2) await new Promise<void>((r) => (release = r));
        return ok(dash("a"));
      },
      onState: () => {},
    });
    await loader.load();
    const first = loader.refresh();
    await Promise.resolve();
    expect(await loader.refresh()).toBe("ok");
    expect(calls).toBe(2);
    release();
    await first;
  });
});
