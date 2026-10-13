import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCompletedEvaluation,
  listCompletedEvaluations,
} from "./evaluator-interviews-service";

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const ID = "11111111-1111-4111-8111-111111111111";

const candidate = {
  name: "Maria Candidata",
  professionalTitle: "Secretária",
  city: "Brasília",
  state: "DF",
};

const listItem = {
  interviewId: ID,
  candidate,
  jobTitle: "Secretária Comercial",
  company: "Clínica Exemplo",
  overallScore: 8.1,
  assignedAt: "2026-10-09T12:00:00.000Z",
  completedAt: "2026-10-11T12:00:00.000Z",
  questionCount: 5,
};

const detail = {
  interviewId: ID,
  status: "COMPLETED",
  evaluationMode: "HUMAN",
  submittedAt: "2026-10-09T11:00:00.000Z",
  candidate,
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
    { id: "q2", position: 2, type: "BEHAVIORAL", text: "Conte um desafio.", answer: "Resolvi.", answeredAt: null },
    { id: "q1", position: 1, type: "TECHNICAL", text: "Como organiza agendas?", answer: "Calendário.", answeredAt: null },
  ],
  evaluation: {
    status: "COMPLETED",
    criteriaScores: { clarity: 9, coherence: 8, hacker: 10 },
    summary: "Boa comunicação.",
    overallScore: 8.5,
    completedAt: "2026-10-11T12:00:00.000Z",
  },
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("histórico do avaliador: listCompletedEvaluations", () => {
  it("GET /evaluator/history com cookies, sem corpo e sem identidade enviada", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { total: 1, evaluations: [listItem] }));

    const result = await listCompletedEvaluations();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/evaluator\/history$/);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(init.body).toBeUndefined();
    expect(result).toEqual({
      ok: true,
      data: [
        {
          id: ID,
          candidate,
          jobTitle: "Secretária Comercial",
          company: "Clínica Exemplo",
          overallScore: 8.1,
          assignedAt: "2026-10-09T12:00:00.000Z",
          completedAt: "2026-10-11T12:00:00.000Z",
          questionCount: 5,
        },
      ],
    });
  });

  it("assignedAt: null e ausente viram null; string inválida ou tipo errado invalida a resposta", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { total: 1, evaluations: [{ ...listItem, assignedAt: null }] }));
    const nullResult = await listCompletedEvaluations();
    expect(nullResult.ok && nullResult.data[0].assignedAt).toBe(null);

    const { assignedAt: _omitted, ...withoutAssignedAt } = listItem;
    fetchMock.mockResolvedValue(jsonResponse(200, { total: 1, evaluations: [withoutAssignedAt] }));
    const missingResult = await listCompletedEvaluations();
    expect(missingResult.ok && missingResult.data[0].assignedAt).toBe(null);

    for (const invalid of ["ontem", "", 1790000000000, {}, true]) {
      fetchMock.mockResolvedValue(jsonResponse(200, { total: 1, evaluations: [{ ...listItem, assignedAt: invalid }] }));
      const result = await listCompletedEvaluations();
      expect(result.ok).toBe(false);
    }
  });

  it("histórico vazio é sucesso (estado vazio real), nunca lista fictícia", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { total: 0, evaluations: [] }));
    expect(await listCompletedEvaluations()).toEqual({ ok: true, data: [] });
  });

  it("nota ausente ou inválida vira null", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { total: 1, evaluations: [{ ...listItem, overallScore: "8" }] }),
    );
    const result = await listCompletedEvaluations();
    expect(result.ok && result.data[0].overallScore).toBe(null);
  });

  it("corpo fora do padrão => erro com mensagem amigável", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { evaluations: [{ interviewId: ID }] }));
    const result = await listCompletedEvaluations();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("error");
      expect(result.message).not.toMatch(/undefined|TypeError|Prisma|stack/i);
    }
  });

  it("401 sem refresh => sessão expirada; 403 => sem acesso", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(403, { message: "Forbidden resource" }));

    const expired = await listCompletedEvaluations();
    const forbidden = await listCompletedEvaluations();

    expect(expired.ok === false && expired.reason).toBe("unauthorized");
    expect(forbidden.ok === false && forbidden.reason).toBe("forbidden");
    expect(forbidden.ok === false && forbidden.message).not.toMatch(/Forbidden resource/);
  });

  it("5xx e erro de rede não vazam texto técnico", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(500, { message: "PrismaClientKnownRequestError at x (y)" }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const server = await listCompletedEvaluations();
    const network = await listCompletedEvaluations();

    expect(server.ok).toBe(false);
    expect(network.ok).toBe(false);
    for (const result of [server, network]) {
      if (!result.ok) {
        expect(result.reason).toBe("error");
        expect(result.message).not.toMatch(/Prisma|Failed to fetch|TypeError|at x/);
      }
    }
  });
});

describe("histórico do avaliador: getCompletedEvaluation", () => {
  it("GET /evaluator/history/:id com cookies, id codificado e sem corpo", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, detail));

    const result = await getCompletedEvaluation(ID);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`/evaluator/history/${ID}$`));
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(init.body).toBeUndefined();
    expect(result.ok).toBe(true);
  });

  it("mapeia contexto, perguntas ordenadas e avaliação concluída (só critérios canônicos)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, detail));

    const result = await getCompletedEvaluation(ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(ID);
      expect(result.data.candidate).toEqual(candidate);
      expect(result.data.context.title).toBe("Secretária Comercial");
      expect(result.data.context.activities).toEqual(["Agendar consultas"]);
      expect(result.data.questions.map((q) => q.position)).toEqual([1, 2]);
      expect(result.data.evaluation).toEqual({
        criteriaScores: { clarity: 9, coherence: 8 },
        summary: "Boa comunicação.",
        overallScore: 8.5,
        completedAt: "2026-10-11T12:00:00.000Z",
      });
    }
  });

  it("detalhe cuja avaliação não está COMPLETED é rejeitado", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { ...detail, evaluation: { ...detail.evaluation, status: "DRAFT" } }),
    );
    const result = await getCompletedEvaluation(ID);
    expect(result.ok).toBe(false);
  });

  it("404 => not_found com mensagem fixa (não revela se existe)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { message: "Avaliação não encontrada." }));
    const result = await getCompletedEvaluation(ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_found");
      expect(result.message).toBe("Entrevista não encontrada ou indisponível.");
    }
  });

  it("5xx e erro de rede => erro amigável", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(503, { message: "ECONNREFUSED 127.0.0.1:5001" }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const server = await getCompletedEvaluation(ID);
    const network = await getCompletedEvaluation(ID);

    for (const result of [server, network]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("error");
        expect(result.message).not.toMatch(/ECONNREFUSED|Failed to fetch|TypeError/);
      }
    }
  });

  it("só faz GET: nenhum PUT/POST de avaliação", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, detail));
    await getCompletedEvaluation(ID);
    await listCompletedEvaluations().catch(() => undefined);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.method).toBe("GET");
    }
  });
});
