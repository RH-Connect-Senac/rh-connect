import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeEvaluation,
  getAssignedInterview,
  getEvaluationDraft,
  listAssignedInterviews,
  saveEvaluationDraft,
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

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("evaluator-interviews-service", () => {
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
          evaluation: null,
        },
      ]);
    }
  });

  describe("fila: bloco evaluation (6A.2)", () => {
    const evaluationBlock = {
      status: "DRAFT",
      startedAt: "2026-10-09T12:00:00.000Z",
      updatedAt: "2026-10-10T12:00:00.000Z",
      filledCriteria: 3,
      totalCriteria: 7,
      hasSummary: true,
      inProgress: true,
    };

    async function parsed(evaluation: unknown) {
      fetchMock.mockResolvedValue(
        jsonResponse(200, { total: 1, interviews: [{ ...queueItem, evaluation }] }),
      );
      const result = await listAssignedInterviews();
      if (!result.ok) throw new Error("esperava sucesso");
      return result.data[0].evaluation;
    }

    it("lê o progresso devolvido pelo servidor, sem recalcular", async () => {
      expect(await parsed(evaluationBlock)).toEqual(evaluationBlock);
    });

    it("respeita inProgress=false do servidor mesmo com números altos", async () => {
      const result = await parsed({ ...evaluationBlock, inProgress: false });
      expect(result?.inProgress).toBe(false);
      expect(result?.filledCriteria).toBe(3);
    });

    it("evaluation null ou ausente => null (fica na Fila)", async () => {
      expect(await parsed(null)).toBeNull();
      expect(await parsed(undefined)).toBeNull();
    });

    it("bloco inválido é tolerado como null, sem derrubar a lista", async () => {
      expect(await parsed("x")).toBeNull();
      expect(await parsed({ ...evaluationBlock, status: "COMPLETED" })).toBeNull();
      expect(await parsed({ ...evaluationBlock, filledCriteria: "3" })).toBeNull();
      expect(await parsed({ ...evaluationBlock, filledCriteria: -1 })).toBeNull();
      expect(await parsed({ ...evaluationBlock, totalCriteria: 0 })).toBeNull();
      expect(await parsed({ ...evaluationBlock, inProgress: "true" })).toBeNull();
      expect(await parsed({ ...evaluationBlock, hasSummary: undefined })).toBeNull();
    });

    it("datas ausentes viram null, mas o bloco continua válido", async () => {
      const result = await parsed({ ...evaluationBlock, startedAt: undefined, updatedAt: 5 });
      expect(result?.startedAt).toBeNull();
      expect(result?.updatedAt).toBeNull();
      expect(result?.inProgress).toBe(true);
    });
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

const draftBody = {
  interviewId: ID,
  status: "DRAFT",
  criteriaScores: { clarity: 8, coherence: 7.5, inventado: 9 },
  summary: "Linha 1\nLinha 2",
  overallScore: 7.8,
  updatedAt: "2026-10-10T10:00:00.000Z",
};

describe("evaluator-interviews-service: rascunho da avaliação", () => {
  it("GET /evaluator/interviews/:id/evaluation com cookies; só critérios canônicos", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, draftBody));

    const result = await getEvaluationDraft(ID);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`/evaluator/interviews/${ID}/evaluation$`));
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.criteriaScores).toEqual({ clarity: 8, coherence: 7.5 });
      expect(result.data.summary).toBe("Linha 1\nLinha 2");
      expect(result.data.overallScore).toBe(7.8);
    }
  });

  it("GET: estado vazio do Back (nada criado) vira rascunho vazio", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { interviewId: ID, status: "DRAFT", criteriaScores: {}, summary: null, overallScore: null, updatedAt: null }),
    );

    expect(await getEvaluationDraft(ID)).toEqual({
      ok: true,
      data: { interviewId: ID, status: "DRAFT", criteriaScores: {}, summary: null, overallScore: null, updatedAt: null },
    });
  });

  it("PUT /evaluator/interviews/:id/evaluation com cookies e JSON", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, draftBody));

    const result = await saveEvaluationDraft(ID, { criteriaScores: { clarity: 8 }, summary: "x" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`/evaluator/interviews/${ID}/evaluation$`));
    expect(init.method).toBe("PUT");
    expect(init.credentials).toBe("include");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(result.ok).toBe(true);
  });

  it("PUT manda SOMENTE campos permitidos (criteriaScores e summary)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, draftBody));

    await saveEvaluationDraft(ID, {
      criteriaScores: { clarity: 8 },
      summary: "a\nb",
      // campos que nunca devem sair do Front, mesmo se alguém tentar passar:
      ...({ status: "COMPLETED", overallScore: 10, evaluatorId: 4 } as object),
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      criteriaScores: { clarity: 8 },
      summary: "a\nb",
    });
  });

  it("PUT parcial: omite o que não foi informado", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, draftBody));

    await saveEvaluationDraft(ID, { summary: null });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ summary: null });
  });

  it("PUT: 401 renova a sessão uma vez e repete o PUT", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: "x" }))
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, draftBody));

    const result = await saveEvaluationDraft(ID, { summary: "x" });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/refresh$/);
    expect(fetchMock.mock.calls[2][1].method).toBe("PUT");
    expect(result.ok).toBe(true);
  });

  it("GET: 401 com refresh falhando => unauthorized", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: "x" }));
    expect(await getEvaluationDraft(ID)).toMatchObject({ ok: false, reason: "unauthorized" });
  });

  it("404 => not_found com mensagem fixa (GET e PUT)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { message: "Entrevista não encontrada." }));

    for (const result of [await getEvaluationDraft(ID), await saveEvaluationDraft(ID, { summary: "x" })]) {
      expect(result).toEqual({
        ok: false,
        reason: "not_found",
        message: "Entrevista não encontrada ou indisponível.",
      });
    }
  });

  it("PUT: 400 e 409 repassam a mensagem de negócio em português", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { message: 'A nota de "clarity" deve ser um número entre 0 e 10.' }),
    );
    expect(await saveEvaluationDraft(ID, { criteriaScores: { clarity: 11 } })).toEqual({
      ok: false,
      reason: "invalid",
      message: 'A nota de "clarity" deve ser um número entre 0 e 10.',
    });

    fetchMock.mockResolvedValueOnce(
      jsonResponse(409, { message: "A avaliação foi alterada em outra requisição. Tente novamente." }),
    );
    expect(await saveEvaluationDraft(ID, { summary: "x" })).toMatchObject({
      ok: false,
      reason: "conflict",
      message: "A avaliação foi alterada em outra requisição. Tente novamente.",
    });
  });

  it("PUT: 500 e mensagem técnica não vazam; usa texto padrão", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: "PrismaClientKnownRequestError stack" }));

    const result = await saveEvaluationDraft(ID, { summary: "x" });

    expect(result).toEqual({
      ok: false,
      reason: "error",
      message: "Não foi possível salvar o rascunho. Tente novamente.",
    });
  });

  it("erro de rede em GET/PUT => erro explícito, sem mock nem localStorage", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));

    const get = await getEvaluationDraft(ID);
    const put = await saveEvaluationDraft(ID, { summary: "x" });

    for (const result of [get, put]) {
      expect(result).toMatchObject({ ok: false, reason: "error" });
      expect(result).not.toHaveProperty("data");
    }
  });

  it("resposta inválida => erro de resposta inválida", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { interviewId: ID, status: "OUTRO" }));
    expect(await getEvaluationDraft(ID)).toMatchObject({ ok: false, reason: "error" });
  });
});

describe("completeEvaluation (POST /evaluation/complete)", () => {
  const completed = {
    interviewId: ID,
    status: "COMPLETED",
    evaluationStatus: "COMPLETED",
    overallScore: 7.8,
    completedAt: "2026-10-10T13:00:00.000Z",
  };

  it("POST na rota certa, com cookies e SEM corpo", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, completed));
    const result = await completeEvaluation(ID);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`/evaluator/interviews/${ID}/evaluation/complete$`));
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.body).toBeUndefined();
    expect(result.ok).toBe(true);
  });

  it("não envia nota, critérios, comentário nem status (nenhum campo do cliente)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, completed));
    await (completeEvaluation as (id: string, ...extra: unknown[]) => Promise<unknown>)(ID, {
      overallScore: 10,
      criteriaScores: { clarity: 10 },
      summary: "x",
      status: "COMPLETED",
    });
    const init = fetchMock.mock.calls[0][1];
    expect(init.body).toBeUndefined();
    expect(JSON.stringify(init)).not.toMatch(/overallScore|criteriaScores|summary/);
  });

  it("sucesso devolve overallScore e completedAt do servidor", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, completed));
    expect(await completeEvaluation(ID)).toEqual({
      ok: true,
      data: {
        interviewId: ID,
        status: "COMPLETED",
        evaluationStatus: "COMPLETED",
        overallScore: 7.8,
        completedAt: "2026-10-10T13:00:00.000Z",
      },
    });
  });

  it("200 com corpo vazio/estranho continua sendo sucesso (repetir o POST daria 404)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200));
    const result = await completeEvaluation(ID);
    expect(result).toMatchObject({ ok: true, data: { overallScore: null, completedAt: null } });
  });

  it("401 renova a sessão uma vez e repete o POST", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: "x" }))
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, completed));
    const result = await completeEvaluation(ID);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/refresh$/);
    expect(fetchMock.mock.calls[2][1].method).toBe("POST");
    expect(result.ok).toBe(true);
  });

  it("400 => invalid com a mensagem de negócio", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { message: "Preencha todos os critérios." }));
    expect(await completeEvaluation(ID)).toEqual({
      ok: false,
      reason: "invalid",
      message: "Preencha todos os critérios.",
    });
  });

  it("404 => not_found com mensagem fixa", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { message: "qualquer" }));
    expect(await completeEvaluation(ID)).toEqual({
      ok: false,
      reason: "not_found",
      message: "Entrevista não encontrada ou indisponível.",
    });
  });

  it("409 => conflict", async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { message: "A avaliação já foi concluída." }));
    expect(await completeEvaluation(ID)).toMatchObject({ ok: false, reason: "conflict" });
  });

  it("500 => error genérico e rede => error (sem vazar detalhes)", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { message: "stack trace secreto" }));
    const server = await completeEvaluation(ID);
    expect(server).toMatchObject({ ok: false, reason: "error" });
    expect(JSON.stringify(server)).not.toContain("secreto");

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    expect(await completeEvaluation(ID)).toMatchObject({ ok: false, reason: "error" });
  });
});
