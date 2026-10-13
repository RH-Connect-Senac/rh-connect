import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignInterviewToEvaluator,
  listAdminEvaluators,
  listPendingAssignmentInterviews,
} from "./admin-interviews-service";

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const queueItem = {
  id: "11111111-1111-4111-8111-111111111111",
  status: "PENDING_ASSIGNMENT",
  evaluationMode: "HUMAN",
  submittedAt: "2026-10-09T12:00:00.000Z",
  createdAt: "2026-10-09T11:00:00.000Z",
  context: { title: "Desenvolvedor Front-end", company: "ACME" },
  candidate: {
    id: 5,
    name: "Maria Candidata",
    email: "maria@gmail.com",
    professionalTitle: "Desenvolvedora",
  },
  questionCount: 5,
};

describe("admin-interviews-service", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fila: GET /admin/interviews/pending-assignment com cookies e candidato real", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { total: 1, interviews: [queueItem] }));

    const result = await listPendingAssignmentInterviews();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/interviews\/pending-assignment$/);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        {
          id: queueItem.id,
          status: "PENDING_ASSIGNMENT",
          submittedAt: queueItem.submittedAt,
          createdAt: queueItem.createdAt,
          jobTitle: "Desenvolvedor Front-end",
          jobCompany: "ACME",
          questionCount: 5,
          candidate: {
            id: "5",
            name: "Maria Candidata",
            email: "maria@gmail.com",
            professionalTitle: "Desenvolvedora",
          },
        },
      ]);
    }
  });

  it("fila vazia é sucesso (estado vazio real), nunca lista fictícia", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { total: 0, interviews: [] }));
    expect(await listPendingAssignmentInterviews()).toEqual({ ok: true, data: [] });
  });

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [500, "error"],
  ])("fila: HTTP %i => %s", async (status, reason) => {
    // 401 tenta /auth/refresh uma vez; a resposta do refresh também falha.
    fetchMock.mockResolvedValue(jsonResponse(status, { message: "x" }));
    expect(await listPendingAssignmentInterviews()).toMatchObject({ ok: false, reason });
  });

  it("fila: erro de rede => erro explícito", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(await listPendingAssignmentInterviews()).toMatchObject({ ok: false, reason: "error" });
  });

  it("fila: item inválido => resposta inválida", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { interviews: [{ id: 1 }] }));
    expect(await listPendingAssignmentInterviews()).toMatchObject({ ok: false, reason: "error" });
  });

  it("avaliadores: GET /admin/evaluators e elegibilidade vinda do Back", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        evaluators: [
          { id: 3, name: "Beatriz Lima", email: "b@gmail.com", accountStatus: "ACTIVE", eligible: true, area: "RH", assignedCount: 2 },
          { id: 4, name: "Patricia Gomes", email: "p@gmail.com", accountStatus: "INVITED", eligible: false, area: null, assignedCount: 0 },
        ],
      }),
    );

    const result = await listAdminEvaluators();

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/admin\/evaluators$/);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.map((e) => [e.name, e.eligible])).toEqual([
        ["Beatriz Lima", true],
        ["Patricia Gomes", false],
      ]);
    }
  });

  it("atribuir: POST com SOMENTE evaluatorId (sem Admin/status no corpo)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: queueItem.id, status: "ASSIGNED" }));

    const result = await assignInterviewToEvaluator(queueItem.id, 3);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`/admin/interviews/${queueItem.id}/assign$`));
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(JSON.parse(init.body)).toEqual({ evaluatorId: 3 });
    expect(result).toEqual({ ok: true, data: { interviewId: queueItem.id, status: "ASSIGNED" } });
  });

  it("atribuir: 409 devolve a mensagem de negócio do Back (sem reatribuição)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { message: "Esta entrevista já foi atribuída a um avaliador e não pode ser reatribuída." }),
    );

    expect(await assignInterviewToEvaluator(queueItem.id, 3)).toEqual({
      ok: false,
      reason: "conflict",
      message: "Esta entrevista já foi atribuída a um avaliador e não pode ser reatribuída.",
    });
  });

  it("atribuir: 404 => not_found", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { message: "Avaliador não encontrado." }));
    expect(await assignInterviewToEvaluator(queueItem.id, 999)).toMatchObject({
      ok: false,
      reason: "not_found",
      message: "Avaliador não encontrado.",
    });
  });

  it("avaliadores: expõe especialização e assignedCount reais (sem métricas inventadas)", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        evaluators: [
          { id: 3, name: "Beatriz Lima", email: "b@gmail.com", accountStatus: "ACTIVE", eligible: true, area: "RH", specialization: "R&S", assignedCount: 2 },
        ],
      }),
    );
    const result = await listAdminEvaluators();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.keys(result.data[0]).sort()).toEqual(["accountStatus", "area", "assignedCount", "eligible", "email", "id", "name", "specialization"]);
      expect(result.data[0]).toMatchObject({ specialization: "R&S", assignedCount: 2 });
    }
  });
});
