import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CANCEL_OFFLINE_MESSAGE,
  cancelRealInterview,
  createRealInterview,
  generateRealQuestions,
  getRealInterview,
  getRealQuestions,
  getRealQuestionsStateForResume,
  listInProgressInterviews,
  getRealQuestionsState,
  saveRealAnswer,
  saveRealAnswerDraft,
  saveRealEvaluationMode,
  submitRealInterview,
} from "./candidate-interviews-service";
import { listPendingAssignmentInterviews } from "./admin-interviews-service";
import type { JobInterviewContext } from "./interview-context-service";

const INTERVIEW_ID = "11111111-1111-4111-8111-111111111111";
const Q_IDS = [1, 2, 3, 4, 5].map((n) => `00000000-0000-4000-8000-00000000000${n}`);
const TYPES = ["TECHNICAL", "TECHNICAL", "BEHAVIORAL", "BEHAVIORAL", "CAREER"];

const context: JobInterviewContext = {
  sourceUrl: "https://vagas.example.com/1",
  title: "Analista de Dados",
  company: "ACME",
  summary: "Resumo",
  activities: ["Analisar"],
  requirements: ["SQL"],
  location: null,
  contractType: null,
  workMode: "REMOTE",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function interviewBody(overrides: Record<string, unknown> = {}) {
  return {
    id: INTERVIEW_ID,
    status: "IN_PROGRESS",
    evaluationMode: null,
    submittedAt: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
    context: { title: "Analista de Dados", company: "ACME" },
    ...overrides,
  };
}

function questionsBody(answers: Record<string, string> = {}) {
  return {
    interviewId: INTERVIEW_ID,
    questions: Q_IDS.map((id, index) => ({
      id,
      position: index + 1,
      type: TYPES[index],
      text: `Pergunta ${index + 1}`,
      answer: answers[id] ?? null,
      answeredAt: answers[id] ? "2026-10-01T10:05:00.000Z" : null,
    })),
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function lastCall(index = 0) {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return { url, init, body: init.body ? JSON.parse(init.body as string) : undefined };
}

describe("candidate-interviews-service (Fase 2B)", () => {
  it("cria uma Interview real: POST /interviews só com o contexto, sem candidateId/status/modo/id", async () => {
    fetchMock.mockResolvedValueOnce(json(interviewBody(), 201));
    const result = await createRealInterview(context);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.id).toBe(INTERVIEW_ID);
    const { url, init, body } = lastCall();
    expect(url).toMatch(/\/interviews$/);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(body.title).toBe("Analista de Dados");
    expect(Object.keys(body)).not.toEqual(
      expect.arrayContaining(["candidateId", "id", "status", "evaluationMode"]),
    );
  });

  it("rejeita resposta cujo id não é UUID (nunca aceita id gerado/forjado)", async () => {
    fetchMock.mockResolvedValueOnce(json(interviewBody({ id: "interview-123" }), 201));
    const result = await createRealInterview(context);
    expect(result.ok).toBe(false);
  });

  it("gera perguntas pela API e devolve os UUIDs reais com tipos mapeados para a UI", async () => {
    fetchMock.mockResolvedValueOnce(json(questionsBody()));
    const result = await generateRealQuestions(INTERVIEW_ID);

    expect(lastCall().url).toMatch(new RegExp(`/interviews/${INTERVIEW_ID}/questions/generate$`));
    expect(lastCall().init.method).toBe("POST");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.map((q) => q.id)).toEqual(Q_IDS);
      expect(result.data.map((q) => q.type)).toEqual([
        "Tecnica",
        "Tecnica",
        "Comportamental",
        "Comportamental",
        "Carreira",
      ]);
    }
  });

  it("rejeita perguntas com id numérico (1..5 locais não são identidade de persistência)", async () => {
    const body = questionsBody();
    body.questions[0].id = 1 as unknown as string;
    fetchMock.mockResolvedValueOnce(json(body));
    const result = await generateRealQuestions(INTERVIEW_ID);
    expect(result.ok).toBe(false);
  });

  it("relê perguntas e respostas persistidas (fonte da verdade)", async () => {
    fetchMock.mockResolvedValueOnce(json(questionsBody({ [Q_IDS[0]]: "Minha resposta" })));
    const result = await getRealQuestions(INTERVIEW_ID);
    expect(result.ok && result.data[0].answer).toBe("Minha resposta");
  });

  it("salva a resposta via PUT com interviewId e questionId reais", async () => {
    const question = questionsBody({ [Q_IDS[2]]: "Resposta" }).questions[2];
    fetchMock.mockResolvedValueOnce(json(question));
    const result = await saveRealAnswer(INTERVIEW_ID, Q_IDS[2], "Resposta", 3);

    const { url, init, body } = lastCall();
    expect(url).toMatch(new RegExp(`/interviews/${INTERVIEW_ID}/questions/${Q_IDS[2]}/answer$`));
    expect(init.method).toBe("PUT");
    // a confirmação oficial leva a versão do rascunho conhecida (controle otimista)
    expect(body).toEqual({ answer: "Resposta", draftVersion: 3 });
    expect(result.ok && result.data.answer).toBe("Resposta");
  });

  it("GET traz o rascunho (texto, data, versão) separado da resposta oficial", async () => {
    const body = questionsBody({ [Q_IDS[0]]: "oficial" });
    Object.assign(body.questions[0], {
      draftText: "oficial editada",
      draftUpdatedAt: "2026-10-10T10:00:00.000Z",
      draftVersion: 4,
    });
    fetchMock.mockResolvedValueOnce(json(body));

    const result = await getRealQuestions(INTERVIEW_ID);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data[0].answer).toBe("oficial");
      expect(result.data[0].draftText).toBe("oficial editada");
      expect(result.data[0].draftVersion).toBe(4);
      // sem campos de rascunho (Back antigo): defaults seguros
      expect(result.data[1].draftText).toBe(null);
      expect(result.data[1].draftVersion).toBe(0);
    }
  });

  it("salva o RASCUNHO em endpoint próprio (PUT .../answer/draft) com a versão base", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ id: Q_IDS[1], draftText: "parcial", draftUpdatedAt: "2026-10-10T10:00:00.000Z", draftVersion: 5 }),
    );

    const result = await saveRealAnswerDraft(INTERVIEW_ID, Q_IDS[1], "parcial", 4);

    const { url, init, body } = lastCall();
    expect(url).toMatch(new RegExp(`/interviews/${INTERVIEW_ID}/questions/${Q_IDS[1]}/answer/draft$`));
    expect(init.method).toBe("PUT");
    expect(body).toEqual({ draft: "parcial", version: 4 });
    expect(result.ok && result.data.draftVersion).toBe(5);
  });

  it("o endpoint oficial de resposta NÃO é usado pelo autosave", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: Q_IDS[1], draftText: null, draftUpdatedAt: null, draftVersion: 1 }));
    await saveRealAnswerDraft(INTERVIEW_ID, Q_IDS[1], "x", 0);
    const { url } = lastCall();
    expect(url.endsWith("/answer")).toBe(false);
    expect(url.endsWith("/answer/draft")).toBe(true);
  });

  it("409 de versão devolve o estado vigente do Back (conflict) sem inventar sucesso", async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        {
          statusCode: 409,
          code: "DRAFT_VERSION_CONFLICT",
          message: "O rascunho foi alterado em outro dispositivo. Recarregue para continuar.",
          draftText: "texto do B",
          draftUpdatedAt: "2026-10-10T10:00:00.000Z",
          draftVersion: 7,
        },
        409,
      ),
    );

    const result = await saveRealAnswerDraft(INTERVIEW_ID, Q_IDS[1], "texto do A", 6);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("conflict");
      expect(result.conflict?.draftText).toBe("texto do B");
      expect(result.conflict?.draftVersion).toBe(7);
    }
  });

  it("409 de entrevista já enviada não traz conflito de versão", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ statusCode: 409, message: "Esta entrevista já foi enviada e não aceita novos rascunhos." }, 409),
    );
    const result = await saveRealAnswerDraft(INTERVIEW_ID, Q_IDS[1], "x", 0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("conflict");
      expect(result.conflict).toBeUndefined();
      expect(result.message).toContain("já foi enviada");
    }
  });

  it("falha de rede no rascunho vira erro explícito (a cópia local segue protegendo)", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    const result = await saveRealAnswerDraft(INTERVIEW_ID, Q_IDS[1], "x", 0);
    expect(result.ok).toBe(false);
  });

  it("a resposta oficial devolve a versão do rascunho (limpo na confirmação)", async () => {
    const question = {
      ...questionsBody({ [Q_IDS[2]]: "Resposta" }).questions[2],
      draftText: null,
      draftUpdatedAt: null,
      draftVersion: 6,
    };
    fetchMock.mockResolvedValueOnce(json(question));
    const result = await saveRealAnswer(INTERVIEW_ID, Q_IDS[2], "Resposta", 6);
    expect(result.ok && result.data.draftText).toBe(null);
    expect(result.ok && result.data.draftVersion).toBe(6);
  });

  it("GET de perguntas traz interviewStatus (revalidação) sem remover os demais campos", async () => {
    fetchMock.mockResolvedValueOnce(json({ ...questionsBody(), interviewStatus: "PENDING_ASSIGNMENT" }));
    const state = await getRealQuestionsState(INTERVIEW_ID);
    expect(state.ok && state.data.interviewStatus).toBe("PENDING_ASSIGNMENT");
    expect(state.ok && state.data.questions).toHaveLength(5);

    // Back que não informa o status: tolerado (null), sem inventar IN_PROGRESS
    fetchMock.mockResolvedValueOnce(json(questionsBody()));
    const legacy = await getRealQuestionsState(INTERVIEW_ID);
    expect(legacy.ok && legacy.data.interviewStatus).toBe(null);

    // getRealQuestions continua devolvendo só a lista
    fetchMock.mockResolvedValueOnce(json({ ...questionsBody(), interviewStatus: "IN_PROGRESS" }));
    const list = await getRealQuestions(INTERVIEW_ID);
    expect(list.ok && Array.isArray(list.data)).toBe(true);
  });

  it("409 DRAFT_VERSION_CONFLICT no PUT oficial devolve o estado vigente em `conflict` (sem depender do texto)", async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        {
          statusCode: 409,
          code: "DRAFT_VERSION_CONFLICT",
          message: "qualquer texto",
          answer: "Resposta A",
          draftText: null,
          draftUpdatedAt: null,
          draftVersion: 5,
        },
        409,
      ),
    );
    const result = await saveRealAnswer(INTERVIEW_ID, Q_IDS[2], "Resposta B", 4);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("conflict");
      expect(result.conflict).toEqual({
        id: "",
        answer: "Resposta A",
        draftText: null,
        draftUpdatedAt: null,
        draftVersion: 5,
      });
    }
  });

  it("409 INTERVIEW_NOT_IN_PROGRESS vira reason not_in_progress em TODOS os endpoints de escrita", async () => {
    const body = { statusCode: 409, code: "INTERVIEW_NOT_IN_PROGRESS", message: "msg", interviewStatus: "PENDING_ASSIGNMENT" };

    fetchMock.mockResolvedValueOnce(json(body, 409));
    const answer = await saveRealAnswer(INTERVIEW_ID, Q_IDS[0], "x", 0);
    expect(!answer.ok && answer.reason).toBe("not_in_progress");
    expect(!answer.ok && answer.interviewStatus).toBe("PENDING_ASSIGNMENT");

    fetchMock.mockResolvedValueOnce(json(body, 409));
    const draft = await saveRealAnswerDraft(INTERVIEW_ID, Q_IDS[0], "x", 0);
    expect(!draft.ok && draft.reason).toBe("not_in_progress");

    fetchMock.mockResolvedValueOnce(json(body, 409));
    const mode = await saveRealEvaluationMode(INTERVIEW_ID, "AI");
    expect(!mode.ok && mode.reason).toBe("not_in_progress");

    fetchMock.mockResolvedValueOnce(json(body, 409));
    const submit = await submitRealInterview(INTERVIEW_ID, "AI");
    expect(!submit.ok && submit.reason).toBe("not_in_progress");
  });

  it("409 sem code continua sendo `conflict` genérico", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "A entrevista foi alterada durante o envio." }, 409));
    const result = await submitRealInterview(INTERVIEW_ID, "AI");
    expect(!result.ok && result.reason).toBe("conflict");
  });

  it("erro ao salvar resposta NÃO finge sucesso e traz mensagem segura", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "boom interno" }, 500));
    const result = await saveRealAnswer(INTERVIEW_ID, Q_IDS[0], "x", 0);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("error");
      expect(result.message).not.toContain("boom");
    }
  });

  it("falha de rede vira erro explícito (sem fallback)", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    const result = await saveRealAnswer(INTERVIEW_ID, Q_IDS[0], "x", 0);
    expect(result.ok).toBe(false);
  });

  it("propaga a mensagem de negócio do Back em 400 (ex.: texto acima do limite)", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: ["title deve ter no máximo 80 caracteres."] }, 400));
    const result = await createRealInterview(context);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("validation");
      expect(result.message).toContain("80");
    }
  });

  it("salva a modalidade via PATCH", async () => {
    fetchMock.mockResolvedValueOnce(json(interviewBody({ evaluationMode: "HUMAN" })));
    const result = await saveRealEvaluationMode(INTERVIEW_ID, "HUMAN");
    const { url, init, body } = lastCall();
    expect(url).toMatch(new RegExp(`/interviews/${INTERVIEW_ID}/evaluation-mode$`));
    expect(init.method).toBe("PATCH");
    expect(body).toEqual({ evaluationMode: "HUMAN" });
    expect(result.ok && result.data.evaluationMode).toBe("HUMAN");
  });

  it("envio HUMAN => PENDING_ASSIGNMENT", async () => {
    fetchMock.mockResolvedValueOnce(
      json(interviewBody({ status: "PENDING_ASSIGNMENT", evaluationMode: "HUMAN", submittedAt: "2026-10-01T11:00:00.000Z" })),
    );
    const result = await submitRealInterview(INTERVIEW_ID, "HUMAN");
    expect(lastCall().url).toMatch(new RegExp(`/interviews/${INTERVIEW_ID}/submit$`));
    expect(result.ok && result.data.status).toBe("PENDING_ASSIGNMENT");
  });

  it("envio AI => PENDING_AI_EVALUATION e NÃO chama /interviews/ai/evaluate", async () => {
    fetchMock.mockResolvedValueOnce(
      json(interviewBody({ status: "PENDING_AI_EVALUATION", evaluationMode: "AI", submittedAt: "2026-10-01T11:00:00.000Z" })),
    );
    const result = await submitRealInterview(INTERVIEW_ID, "AI");
    expect(result.ok && result.data.status).toBe("PENDING_AI_EVALUATION");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/interviews/ai/"))).toBe(false);
  });

  it("401 renova o token uma vez e repete a chamada", async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({}, 200))
      .mockResolvedValueOnce(json(interviewBody(), 201));
    const result = await createRealInterview(context);
    expect(result.ok).toBe(true);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/refresh$/);
  });

  it("não usa localStorage (fonte da verdade é o Back)", async () => {
    const getItem = vi.fn();
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", { getItem, setItem, removeItem: vi.fn() });
    fetchMock.mockResolvedValueOnce(json(interviewBody(), 201));
    await createRealInterview(context);
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  // Contrato ponta a ponta do cliente contra um Back simulado em memória:
  // a entrevista HUMAN enviada pelo candidato é a MESMA que a fila do Admin lista.
  it("HUMAN: o que o candidato envia aparece na fila REAL do Admin (contrato simulado)", async () => {
    const db = { status: "IN_PROGRESS", mode: null as string | null, answers: {} as Record<string, string> };
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      const path = String(url).replace(/^https?:\/\/[^/]+/, "");
      const method = init?.method ?? "GET";
      if (path === "/interviews" && method === "POST") return json(interviewBody(), 201);
      if (path.endsWith("/questions/generate")) return json(questionsBody());
      if (path.endsWith("/answer")) {
        const qid = path.split("/").slice(-2)[0];
        db.answers[qid] = JSON.parse(init!.body as string).answer;
        return json(questionsBody(db.answers).questions.find((q) => q.id === qid));
      }
      if (path.endsWith("/evaluation-mode")) {
        db.mode = JSON.parse(init!.body as string).evaluationMode;
        return json(interviewBody({ evaluationMode: db.mode }));
      }
      if (path.endsWith("/submit")) {
        if (Object.keys(db.answers).length < 5) return json({ message: "Faltam respostas." }, 400);
        db.status = db.mode === "HUMAN" ? "PENDING_ASSIGNMENT" : "PENDING_AI_EVALUATION";
        return json(interviewBody({ status: db.status, evaluationMode: db.mode, submittedAt: "2026-10-01T11:00:00.000Z" }));
      }
      if (path === "/admin/interviews/pending-assignment") {
        const queue = db.status === "PENDING_ASSIGNMENT" && db.mode === "HUMAN"
          ? [{
              id: INTERVIEW_ID, status: db.status, evaluationMode: "HUMAN",
              submittedAt: "2026-10-01T11:00:00.000Z", createdAt: "2026-10-01T10:00:00.000Z",
              context: { title: "Analista de Dados", company: "ACME" },
              candidate: { id: 7, name: "Cand Real", email: "c@x.com", professionalTitle: null },
              questionCount: 5,
            }]
          : [];
        return json({ total: queue.length, interviews: queue });
      }
      return json({ message: "rota inesperada" }, 404);
    });

    const created = await createRealInterview(context);
    expect(created.ok).toBe(true);
    const id = created.ok ? created.data.id : "";
    const generated = await generateRealQuestions(id);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    // Envio sem responder tudo é bloqueado pelo Back e o cliente reporta o erro.
    expect((await submitRealInterview(id, "HUMAN")).ok).toBe(false);

    for (const question of generated.data) {
      expect((await saveRealAnswer(id, question.id, `Resposta ${question.position}`, 0)).ok).toBe(true);
    }
    expect((await saveRealEvaluationMode(id, "HUMAN")).ok).toBe(true);
    const submitted = await submitRealInterview(id, "HUMAN");
    expect(submitted.ok && submitted.data.status).toBe("PENDING_ASSIGNMENT");

    const queue = await listPendingAssignmentInterviews();
    expect(queue.ok && queue.data.map((item) => item.id)).toEqual([id]);
  });
});

describe("retomada pelo Dashboard (serviço)", () => {
  const listItem = {
    id: INTERVIEW_ID,
    title: "Analista de Dados",
    company: "ACME",
    evaluationMode: "AI",
    interviewStatus: "IN_PROGRESS",
    createdAt: "2026-10-01T10:00:00.000Z",
    questionCount: 5,
    answeredQuestionCount: 2,
    latestDraftUpdatedAt: null,
  };

  it("GET /interviews/in-progress devolve a lista tipada, sem corpo nem dono", async () => {
    fetchMock.mockResolvedValueOnce(json([listItem]));
    const result = await listInProgressInterviews();
    expect(result.ok && result.data).toEqual([listItem]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/interviews\/in-progress$/);
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("lista vazia é sucesso; item inválido ou não-lista é resposta inválida", async () => {
    fetchMock.mockResolvedValueOnce(json([]));
    expect((await listInProgressInterviews()).ok).toBe(true);
    fetchMock.mockResolvedValueOnce(json([{ ...listItem, interviewStatus: "COMPLETED" }]));
    expect((await listInProgressInterviews()).ok).toBe(false);
    fetchMock.mockResolvedValueOnce(json({ items: [] }));
    expect((await listInProgressInterviews()).ok).toBe(false);
  });

  it("erro de rede/403 não devolve dados", async () => {
    fetchMock.mockRejectedValueOnce(new Error("net"));
    expect((await listInProgressInterviews()).ok).toBe(false);
    fetchMock.mockResolvedValueOnce(json({ message: "x" }, 403));
    const forbidden = await listInProgressInterviews();
    expect(!forbidden.ok && forbidden.reason).toBe("forbidden");
  });

  it("getRealInterview mapeia o contexto COMPLETO da vaga", async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        interviewBody({
          context: {
            sourceUrl: "https://vagas.example.com/1",
            title: "Analista de Dados",
            company: "ACME",
            summary: "Resumo",
            activities: ["Analisar"],
            requirements: ["SQL"],
            location: "SP",
            contractType: "CLT",
            workMode: "HYBRID",
          },
        }),
      ),
    );
    const result = await getRealInterview(INTERVIEW_ID);
    expect(result.ok && result.data.context).toEqual({
      sourceUrl: "https://vagas.example.com/1",
      title: "Analista de Dados",
      company: "ACME",
      summary: "Resumo",
      activities: ["Analisar"],
      requirements: ["SQL"],
      location: "SP",
      contractType: "CLT",
      workMode: "HYBRID",
    });
  });

  it("getRealQuestionsStateForResume aceita lista vazia; getRealQuestionsState continua recusando", async () => {
    fetchMock.mockResolvedValueOnce(json({ interviewId: INTERVIEW_ID, interviewStatus: "IN_PROGRESS", questions: [] }));
    const lenient = await getRealQuestionsStateForResume(INTERVIEW_ID);
    expect(lenient.ok && lenient.data.questions).toEqual([]);
    fetchMock.mockResolvedValueOnce(json({ interviewId: INTERVIEW_ID, interviewStatus: "IN_PROGRESS", questions: [] }));
    expect((await getRealQuestionsState(INTERVIEW_ID)).ok).toBe(false);
  });
});

describe("409 INTERVIEW_ALREADY_IN_PROGRESS (regra V1)", () => {
  const body = {
    statusCode: 409,
    error: "Conflict",
    code: "INTERVIEW_ALREADY_IN_PROGRESS",
    message: "Você já possui uma entrevista em andamento.",
    interviewId: INTERVIEW_ID,
  };

  it("createRealInterview devolve reason already_in_progress com o id existente (não é erro genérico)", async () => {
    fetchMock.mockResolvedValueOnce(json(body, 409));
    const result = await createRealInterview(context);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("already_in_progress");
    expect(result.existingInterviewId).toBe(INTERVIEW_ID);
    expect(result.message).toBe("Você já possui uma entrevista em andamento.");
  });

  it("id inválido no corpo é ignorado (nunca vira id de navegação)", async () => {
    fetchMock.mockResolvedValueOnce(json({ ...body, interviewId: "../../x" }, 409));
    const result = await createRealInterview(context);
    expect(!result.ok && result.reason).toBe("already_in_progress");
    expect(!result.ok && result.existingInterviewId).toBeUndefined();
  });

  it("outros 409 continuam como conflict", async () => {
    fetchMock.mockResolvedValueOnce(json({ statusCode: 409, message: "x" }, 409));
    const result = await createRealInterview(context);
    expect(!result.ok && result.reason).toBe("conflict");
  });
});

describe("cancelamento real (serviço)", () => {
  const cancelled = interviewBody({ status: "CANCELLED", evaluationMode: "AI" });

  it("POST /interviews/:id/cancel sem corpo, devolve a entrevista CANCELLED", async () => {
    fetchMock.mockResolvedValueOnce(json(cancelled));
    const result = await cancelRealInterview(INTERVIEW_ID);
    expect(result.ok && result.data.status).toBe("CANCELLED");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(new RegExp(`/interviews/${INTERVIEW_ID}/cancel$`));
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  it("offline/sem resposta NÃO finge sucesso: falha com mensagem de que nada foi alterado", async () => {
    fetchMock.mockRejectedValueOnce(new Error("net"));
    const result = await cancelRealInterview(INTERVIEW_ID);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.message).toBe(CANCEL_OFFLINE_MESSAGE);
    expect(CANCEL_OFFLINE_MESSAGE).toContain("Nada foi alterado");
  });

  it("500 e resposta que não é CANCELLED também são falha", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "x" }, 500));
    expect((await cancelRealInterview(INTERVIEW_ID)).ok).toBe(false);
    fetchMock.mockResolvedValueOnce(json(interviewBody({ status: "PENDING_AI_EVALUATION" })));
    expect((await cancelRealInterview(INTERVIEW_ID)).ok).toBe(false);
  });

  it("409 de entrevista já enviada vira not_in_progress com o status vigente", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ statusCode: 409, code: "INTERVIEW_NOT_IN_PROGRESS", message: "enviada", interviewStatus: "PENDING_ASSIGNMENT" }, 409),
    );
    const result = await cancelRealInterview(INTERVIEW_ID);
    expect(!result.ok && result.reason).toBe("not_in_progress");
    expect(!result.ok && result.interviewStatus).toBe("PENDING_ASSIGNMENT");
  });

  it("getRealInterview reconhece o status CANCELLED", async () => {
    fetchMock.mockResolvedValueOnce(json(cancelled));
    const result = await getRealInterview(INTERVIEW_ID);
    expect(result.ok && result.data.status).toBe("CANCELLED");
  });

  it("perguntas de uma entrevista CANCELLED informam o status (o wizard não reabre)", async () => {
    fetchMock.mockResolvedValueOnce(json({ ...questionsBody(), interviewStatus: "CANCELLED" }));
    const result = await getRealQuestionsState(INTERVIEW_ID);
    expect(result.ok && result.data.interviewStatus).toBe("CANCELLED");
  });
});

describe("mensagens de erro seguras (UX)", () => {
  const FORBIDDEN = /groq|llama|bad gateway|failed to fetch|econn|\b50[0-9]\b/i;
  it("gerar perguntas: 502 do provider vira mensagem de produto (sem Groq/502)", async () => {
    fetchMock.mockResolvedValueOnce(json({ statusCode: 502, error: "Bad Gateway", message: "Erro Groq 502" }, 502));
    const result = await generateRealQuestions(INTERVIEW_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(FORBIDDEN.test(result.message)).toBe(false);
      expect(result.message).toBe("Não foi possível gerar as perguntas agora. Tente novamente em instantes.");
    }
  });

  it("gerar perguntas: 503 e 504 diferenciam indisponibilidade e demora", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "Service Unavailable" }, 503));
    const unavailable = await generateRealQuestions(INTERVIEW_ID);
    expect(!unavailable.ok && unavailable.message).toBe("O serviço está temporariamente indisponível. Tente novamente em alguns instantes.");
    fetchMock.mockResolvedValueOnce(json({ message: "Gateway Timeout" }, 504));
    const timeout = await generateRealQuestions(INTERVIEW_ID);
    expect(!timeout.ok && timeout.message).toBe("A operação está demorando mais que o esperado. Tente novamente.");
  });

  it("gerar perguntas: sem rede, a mensagem é de conexão (nunca 'Failed to fetch')", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const result = await generateRealQuestions(INTERVIEW_ID);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(FORBIDDEN.test(result.message)).toBe(false);
      expect(result.message).toContain("Verifique sua conexão");
    }
  });

  it("erro desconhecido (4xx com texto técnico) usa o fallback amigável", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "ECONNREFUSED 127.0.0.1:5001" }, 400));
    const result = await generateRealQuestions(INTERVIEW_ID);
    expect(!result.ok && result.message).toBe("Não foi possível gerar as perguntas agora. Tente novamente em instantes.");
  });

  it("mensagens de domínio continuam específicas (cancelada, enviada, já em andamento)", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ statusCode: 409, code: "INTERVIEW_NOT_IN_PROGRESS", message: "Esta entrevista foi cancelada e não aceita mais alterações.", interviewStatus: "CANCELLED" }, 409),
    );
    const cancelled = await generateRealQuestions(INTERVIEW_ID);
    expect(!cancelled.ok && cancelled.reason).toBe("not_in_progress");
    expect(!cancelled.ok && cancelled.message).toBe("Esta entrevista foi cancelada e não aceita mais alterações.");
    fetchMock.mockResolvedValueOnce(
      json({ statusCode: 409, code: "INTERVIEW_ALREADY_IN_PROGRESS", message: "Você já possui uma entrevista em andamento." }, 409),
    );
    const inProgress = await createRealInterview(context);
    expect(!inProgress.ok && inProgress.message).toBe("Você já possui uma entrevista em andamento.");
  });

  it("conflito de rascunho entre dispositivos não vira mensagem genérica", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ statusCode: 409, code: "DRAFT_VERSION_CONFLICT", message: "Este rascunho foi alterado em outro dispositivo.", draftVersion: 3, draftText: "outro" }, 409),
    );
    const result = await saveRealAnswerDraft(INTERVIEW_ID, Q_IDS[0], "x", 1);
    expect(!result.ok && result.reason).toBe("conflict");
    expect(!result.ok && result.message).toBe("Este rascunho foi alterado em outro dispositivo.");
  });
});

describe("acompanhamento real (6A.2): GET /interviews/:id", () => {
  it("mapeia assignedAt e completedAt reais do Back (sem inventar nenhum)", async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        interviewBody({
          status: "COMPLETED",
          evaluationMode: "HUMAN",
          submittedAt: "2026-10-12T13:00:00.000Z",
          assignedAt: "2026-10-13T01:00:00.000Z",
          completedAt: "2026-10-13T03:28:52.775Z",
        }),
      ),
    );
    const result = await getRealInterview(INTERVIEW_ID);
    expect(result.ok && result.data.assignedAt).toBe("2026-10-13T01:00:00.000Z");
    expect(result.ok && result.data.completedAt).toBe("2026-10-13T03:28:52.775Z");
  });

  it("Back mais antigo (sem os carimbos) ou com null: ambos viram null", async () => {
    fetchMock.mockResolvedValueOnce(json(interviewBody({ status: "PENDING_ASSIGNMENT", evaluationMode: "HUMAN" })));
    const missing = await getRealInterview(INTERVIEW_ID);
    expect(missing.ok && missing.data.assignedAt).toBeNull();
    expect(missing.ok && missing.data.completedAt).toBeNull();

    fetchMock.mockResolvedValueOnce(json(interviewBody({ assignedAt: null, completedAt: null })));
    const nulls = await getRealInterview(INTERVIEW_ID);
    expect(nulls.ok && nulls.data.completedAt).toBeNull();
  });

  it("lê só GET /interviews/:id (uma chamada; nunca /result, /questions nem POST)", async () => {
    fetchMock.mockResolvedValueOnce(json(interviewBody({ status: "COMPLETED", evaluationMode: "HUMAN" })));
    await getRealInterview(INTERVIEW_ID);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const { url, init } = lastCall();
    expect(url).toMatch(new RegExp(`/interviews/${INTERVIEW_ID}$`));
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
  });

  it("404 vira not_found; 5xx e rede viram mensagem amigável (sem texto técnico)", async () => {
    fetchMock.mockResolvedValueOnce(json({ statusCode: 404, message: "Entrevista não encontrada." }, 404));
    const notFound = await getRealInterview(INTERVIEW_ID);
    expect(!notFound.ok && notFound.reason).toBe("not_found");

    fetchMock.mockResolvedValueOnce(json({ message: "PrismaClientKnownRequestError at db" }, 500));
    const server = await getRealInterview(INTERVIEW_ID);
    expect(!server.ok && server.reason).toBe("error");
    expect(!server.ok && server.message).not.toMatch(/prisma|500|stack/i);

    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const network = await getRealInterview(INTERVIEW_ID);
    expect(!network.ok && network.reason).toBe("error");
    expect(!network.ok && network.message).not.toMatch(/failed to fetch/i);
  });
});
