import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRealInterview,
  generateRealQuestions,
  getRealQuestions,
  saveRealAnswer,
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
    const result = await saveRealAnswer(INTERVIEW_ID, Q_IDS[2], "Resposta");

    const { url, init, body } = lastCall();
    expect(url).toMatch(new RegExp(`/interviews/${INTERVIEW_ID}/questions/${Q_IDS[2]}/answer$`));
    expect(init.method).toBe("PUT");
    expect(body).toEqual({ answer: "Resposta" });
    expect(result.ok && result.data.answer).toBe("Resposta");
  });

  it("erro ao salvar resposta NÃO finge sucesso e traz mensagem segura", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "boom interno" }, 500));
    const result = await saveRealAnswer(INTERVIEW_ID, Q_IDS[0], "x");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("error");
      expect(result.message).not.toContain("boom");
    }
  });

  it("falha de rede vira erro explícito (sem fallback)", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network"));
    const result = await saveRealAnswer(INTERVIEW_ID, Q_IDS[0], "x");
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
      expect((await saveRealAnswer(id, question.id, `Resposta ${question.position}`)).ok).toBe(true);
    }
    expect((await saveRealEvaluationMode(id, "HUMAN")).ok).toBe(true);
    const submitted = await submitRealInterview(id, "HUMAN");
    expect(submitted.ok && submitted.data.status).toBe("PENDING_ASSIGNMENT");

    const queue = await listPendingAssignmentInterviews();
    expect(queue.ok && queue.data.map((item) => item.id)).toEqual([id]);
  });
});
