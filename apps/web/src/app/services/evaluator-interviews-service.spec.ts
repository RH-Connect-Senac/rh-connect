import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAssignedInterview,
  listAssignedInterviews,
} from "./evaluator-interviews-service";

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ID = "11111111-1111-4111-8111-111111111111";

const queueItem = {
  interviewId: ID,
  status: "ASSIGNED",
  candidate: {
    name: "Maria Candidata",
    professionalTitle: "Secretária",
    city: "Brasília",
    state: "DF",
  },
  jobTitle: "Secretária Comercial",
  company: "Clínica Exemplo",
  location: "Três Lagoas/MS",
  workMode: "HYBRID",
  assignedAt: "2026-10-09T12:00:00.000Z",
  submittedAt: "2026-10-09T11:00:00.000Z",
  questionCount: 5,
};

const detail = {
  interviewId: ID,
  status: "ASSIGNED",
  evaluationMode: "HUMAN",
  assignedAt: "2026-10-09T12:00:00.000Z",
  submittedAt: "2026-10-09T11:00:00.000Z",
  candidate: queueItem.candidate,
  context: {
    sourceUrl: "https://www.empregare.com/pt-br/vaga-x_1",
    title: "Secretária Comercial",
    company: "Clínica Exemplo",
    summary: "Resumo",
    activities: ["Agendar consultas"],
    requirements: ["Pacote Office"],
    location: "Três Lagoas/MS",
    contractType: "PJ",
    workMode: "HYBRID",
  },
  questions: [
    {
      id: "q2",
      position: 2,
      type: "BEHAVIORAL",
      text: "Conte uma situação difícil.",
      answer: "Resolvi em equipe.\n\nCom diálogo.",
      answeredAt: "2026-10-09T11:00:00.000Z",
    },
    {
      id: "q1",
      position: 1,
      type: "TECHNICAL",
      text: "Como você organiza agendas?",
      answer: "Uso calendário compartilhado.",
      answeredAt: "2026-10-09T10:50:00.000Z",
    },
  ],
};

describe("evaluator-interviews-service", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fila: GET /evaluator/interviews com cookies, sem corpo e sem identidade enviada", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { total: 1, interviews: [queueItem] }));

    const result = await listAssignedInterviews();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/evaluator\/interviews$/);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(init.body).toBeUndefined();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([
        {
          id: ID,
          status: "ASSIGNED",
          candidate: queueItem.candidate,
          jobTitle: "Secretária Comercial",
          company: "Clínica Exemplo",
          location: "Três Lagoas/MS",
          workMode: "HYBRID",
          assignedAt: queueItem.assignedAt,
          submittedAt: queueItem.submittedAt,
          questionCount: 5,
        },
      ]);
    }
  });

  it("fila vazia é sucesso (estado vazio real), nunca lista fictícia", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { total: 0, interviews: [] }));
    expect(await listAssignedInterviews()).toEqual({ ok: true, data: [] });
  });

  it("detalhe: GET /evaluator/interviews/:id com cookies e id codificado", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, detail));

    const result = await getAssignedInterview(ID);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`/evaluator/interviews/${ID}$`));
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(result.ok).toBe(true);
  });

  it("detalhe: perguntas ordenadas por posição e respostas com quebras de linha preservadas", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, detail));

    const result = await getAssignedInterview(ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.questions.map((q) => q.position)).toEqual([1, 2]);
      expect(result.data.questions[1].answer).toBe("Resolvi em equipe.\n\nCom diálogo.");
      expect(result.data.context.requirements).toEqual(["Pacote Office"]);
      expect(result.data.candidate.name).toBe("Maria Candidata");
    }
  });

  it("401 segue o mecanismo de refresh: renova uma vez e repete a chamada", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: "x" }))
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, { total: 0, interviews: [] }));

    const result = await listAssignedInterviews();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/refresh$/);
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    expect(fetchMock.mock.calls[1][1].credentials).toBe("include");
    expect(result).toEqual({ ok: true, data: [] });
  });

  it("401 com refresh falhando => unauthorized, sem dados", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: "x" }));
    expect(await listAssignedInterviews()).toMatchObject({ ok: false, reason: "unauthorized" });
  });

  it("detalhe: 404 => not_found com mensagem fixa e segura", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { message: "Entrevista não encontrada." }));

    expect(await getAssignedInterview(ID)).toEqual({
      ok: false,
      reason: "not_found",
      message: "Entrevista não encontrada ou indisponível.",
    });
  });

  it.each([
    [403, "forbidden"],
    [500, "error"],
  ])("HTTP %i => %s, sem repassar texto técnico do servidor", async (status, reason) => {
    fetchMock.mockResolvedValue(jsonResponse(status, { message: "stack: at Prisma.client" }));

    const list = await listAssignedInterviews();
    const one = await getAssignedInterview(ID);

    for (const result of [list, one]) {
      expect(result).toMatchObject({ ok: false, reason });
      if (!result.ok) expect(result.message).not.toMatch(/stack|Prisma/);
    }
  });

  it("erro de rede => erro explícito, nunca mock nem lista de fallback", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    const list = await listAssignedInterviews();
    const one = await getAssignedInterview(ID);

    expect(list).toMatchObject({ ok: false, reason: "error" });
    expect(one).toMatchObject({ ok: false, reason: "error" });
    expect(list).not.toHaveProperty("data");
    expect(one).not.toHaveProperty("data");
  });

  it("item ou detalhe inválido => resposta inválida (sem dado parcial)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { interviews: [{ interviewId: 1 }] }));
    expect(await listAssignedInterviews()).toMatchObject({ ok: false, reason: "error" });

    fetchMock.mockResolvedValue(jsonResponse(200, { interviewId: ID }));
    expect(await getAssignedInterview(ID)).toMatchObject({ ok: false, reason: "error" });
  });
});
