import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminDashboard, parseAdminDashboard } from "./admin-dashboard-service";

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const valid = () => ({
  generatedAt: "2026-10-13T12:00:00.000Z",
  summary: { candidateCount: 3, activeEvaluatorCount: 3, pendingAssignmentCount: 3, averageScore: 7.3, averageScoreSample: 13 },
  interviewsByMonth: [
    { month: "2026-09", total: 0 },
    { month: "2026-10", total: 29 },
  ],
  recentActivity: [
    {
      id: "a1",
      type: "evaluation_completed",
      occurredAt: "2026-10-13T11:00:00.000Z",
      candidateName: "Maria",
      jobTitle: "Dev",
      evaluatorName: "Carlos",
      actorName: null,
      score: 8.5,
    },
    {
      id: "a2",
      type: "candidate_registered",
      occurredAt: "2026-10-12T11:00:00.000Z",
      candidateName: "João",
      jobTitle: null,
      evaluatorName: null,
      actorName: null,
      score: null,
    },
  ],
});

describe("admin-dashboard-service", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("GET /admin/dashboard com cookies, sem corpo", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, valid()));
    const result = await getAdminDashboard();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/dashboard$/);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(init.body).toBeUndefined();
    expect(result).toEqual({ ok: true, data: valid() });
  });

  it("preserva score null e meses com zero", () => {
    const payload = valid();
    payload.summary.averageScore = null as unknown as number;
    payload.summary.averageScoreSample = 0;
    const parsed = parseAdminDashboard(payload);
    expect(parsed?.summary.averageScore).toBeNull();
    expect(parsed?.interviewsByMonth[0]).toEqual({ month: "2026-09", total: 0 });
  });

  it("rejeita contrato inválido (campos faltando, tipos errados, atividade desconhecida)", () => {
    expect(parseAdminDashboard(null)).toBeNull();
    expect(parseAdminDashboard({})).toBeNull();
    const a = valid();
    (a.summary as Record<string, unknown>).candidateCount = "3";
    expect(parseAdminDashboard(a)).toBeNull();
    const b = valid();
    b.interviewsByMonth[0].month = "10/2026";
    expect(parseAdminDashboard(b)).toBeNull();
    const c = valid();
    (c.recentActivity[0] as Record<string, unknown>).type = "other";
    expect(parseAdminDashboard(c)).toBeNull();
    const d = valid();
    (d as Record<string, unknown>).recentActivity = undefined;
    expect(parseAdminDashboard(d)).toBeNull();
  });

  it("200 com corpo inválido vira erro amigável", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { foo: 1 }));
    const result = await getAdminDashboard();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("error");
  });

  it("401 tenta /auth/refresh uma vez e repete; refresh falho → unauthorized", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, valid()));
    const ok = await getAdminDashboard();
    expect(ok.ok).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/refresh$/);

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse(401)).mockResolvedValueOnce(jsonResponse(401));
    const fail = await getAdminDashboard();
    expect(fail).toMatchObject({ ok: false, reason: "unauthorized" });
  });

  it("403 → forbidden com mensagem própria", async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { message: "Forbidden resource" }));
    const result = await getAdminDashboard();
    expect(result).toMatchObject({ ok: false, reason: "forbidden" });
    if (!result.ok) expect(result.message).not.toMatch(/Forbidden resource/);
  });

  it("5xx não vaza texto técnico", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: "PrismaClientKnownRequestError at db" }));
    const result = await getAdminDashboard();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("error");
      expect(result.message).not.toMatch(/prisma|500|stack/i);
    }
  });

  it("falha de rede → mensagem amigável, sem texto cru do fetch", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const result = await getAdminDashboard();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("error");
      expect(result.message).toMatch(/conectar/);
      expect(result.message).not.toMatch(/fetch/i);
    }
  });
});
