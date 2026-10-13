import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ADMIN_INTERVIEWS_LOAD_ERROR_MESSAGE,
  buildAdminInterviewsPath,
  listAdminInterviews,
  normalizeAdminCandidateId,
  parseAdminInterviewList,
} from "./admin-interviews-service";

// Fase 7A.1: GET /admin/interviews[?candidateId=] (substitui o mock em localStorage).
const ID = "11111111-1111-4111-8111-111111111111";

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function item(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    status: "COMPLETED",
    evaluationMode: "HUMAN",
    jobTitle: "Desenvolvedor Front-end",
    jobCompany: "ACME",
    createdAt: "2026-10-09T11:00:00.000Z",
    submittedAt: "2026-10-09T12:00:00.000Z",
    assignedAt: "2026-10-10T09:00:00.000Z",
    candidate: { id: 5, name: "Maria Candidata", email: "maria@gmail.com" },
    evaluator: { id: 3, userId: 9, name: "Carlos Avaliador" },
    evaluation: { status: "COMPLETED", overallScore: 8.5, completedAt: "2026-10-11T12:00:00.000Z" },
    ...overrides,
  };
}

const page = (interviews: unknown[] = [item()]) => ({ total: interviews.length, interviews });

describe("buildAdminInterviewsPath / normalizeAdminCandidateId", () => {
  it("sem filtro: caminho limpo", () => {
    expect(buildAdminInterviewsPath()).toBe("/admin/interviews");
    expect(buildAdminInterviewsPath({})).toBe("/admin/interviews");
  });

  it("candidateId vira query param", () => {
    expect(buildAdminInterviewsPath({ candidateId: "7" })).toBe("/admin/interviews?candidateId=7");
    expect(buildAdminInterviewsPath({ candidateId: 7 })).toBe("/admin/interviews?candidateId=7");
  });

  it("nunca envia search, status, page, cursor nem outro parâmetro", () => {
    expect(buildAdminInterviewsPath({ candidateId: "7", search: "x", status: "ASSIGNED" } as never)).toBe(
      "/admin/interviews?candidateId=7",
    );
  });

  it("candidateId inválido é descartado do caminho", () => {
    for (const value of ["", "0", "-1", "1.5", "abc", "1e3", "007", "2147483648", " 5"]) {
      expect(normalizeAdminCandidateId(value)).toBeNull();
    }
    expect(normalizeAdminCandidateId("2147483647")).toBe("2147483647");
  });
});

describe("parseAdminInterviewList", () => {
  it("aceita o contrato completo", () => {
    expect(parseAdminInterviewList(page())).toEqual(page());
  });

  it("aceita pendente (sem avaliador nem avaliação) e rascunho sem nota", () => {
    const pending = item({
      id: "22222222-2222-4222-8222-222222222222",
      status: "PENDING_ASSIGNMENT",
      assignedAt: null,
      evaluator: null,
      evaluation: null,
    });
    const draft = item({
      id: "33333333-3333-4333-8333-333333333333",
      status: "ASSIGNED",
      evaluation: { status: "DRAFT", overallScore: null, completedAt: null },
    });
    expect(parseAdminInterviewList(page([pending, draft]))?.interviews).toHaveLength(2);
  });

  it("lista vazia é válida", () => {
    expect(parseAdminInterviewList({ total: 0, interviews: [] })).toEqual({ total: 0, interviews: [] });
  });

  it("aceita AI sem nota e jobCompany/evaluationMode nulos", () => {
    const ai = item({
      status: "PENDING_AI_EVALUATION",
      evaluationMode: "AI",
      jobCompany: null,
      evaluator: null,
      assignedAt: null,
      evaluation: null,
    });
    expect(parseAdminInterviewList(page([ai]))).not.toBeNull();
    expect(parseAdminInterviewList(page([item({ evaluationMode: null, evaluation: null })]))).not.toBeNull();
  });

  it("rejeita envelope inválido", () => {
    for (const payload of [null, [], {}, { total: 1 }, { total: "1", interviews: [] }, { total: -1, interviews: [] }, { total: 1.5, interviews: [] }, { total: 1, interviews: {} }]) {
      expect(parseAdminInterviewList(payload)).toBeNull();
    }
  });

  it("um único item inválido invalida a lista inteira (sem mock, sem parcial)", () => {
    expect(parseAdminInterviewList({ total: 2, interviews: [item(), { id: "x" }] })).toBeNull();
  });

  it.each([
    ["id fora do formato UUID", { id: "abc" }],
    ["status desconhecido", { status: "IN_PROGRESS" }],
    ["status cancelado", { status: "CANCELLED" }],
    ["modalidade desconhecida", { evaluationMode: "MIXED" }],
    ["jobTitle vazio", { jobTitle: "  " }],
    ["jobTitle ausente", { jobTitle: undefined }],
    ["createdAt não ISO", { createdAt: "ontem" }],
    ["createdAt sem milissegundos", { createdAt: "2026-10-09T11:00:00Z" }],
    ["data impossível", { submittedAt: "2026-02-31T10:00:00.000Z" }],
    ["assignedAt inválido", { assignedAt: "2026-10-10" }],
    ["candidato ausente", { candidate: null }],
    ["candidato com id string", { candidate: { id: "5", name: "A", email: "a@a.com" } }],
    ["candidato com id zero", { candidate: { id: 0, name: "A", email: "a@a.com" } }],
    ["candidato sem e-mail", { candidate: { id: 5, name: "A" } }],
    ["avaliador sem userId", { evaluator: { id: 3, name: "C" } }],
    ["avaliador não objeto", { evaluator: "Carlos" }],
    ["avaliação com status inválido", { evaluation: { status: "PENDING", overallScore: null, completedAt: null } }],
    ["nota acima de 10", { evaluation: { status: "COMPLETED", overallScore: 11, completedAt: null } }],
    ["nota negativa", { evaluation: { status: "COMPLETED", overallScore: -1, completedAt: null } }],
    ["nota em texto", { evaluation: { status: "COMPLETED", overallScore: "8.5", completedAt: null } }],
    ["completedAt inválido", { evaluation: { status: "COMPLETED", overallScore: 8, completedAt: "hoje" } }],
    ["nota em avaliação em rascunho", { evaluation: { status: "DRAFT", overallScore: 7, completedAt: null } }],
    ["nota em entrevista AI", { evaluationMode: "AI", evaluation: { status: "COMPLETED", overallScore: 9, completedAt: "2026-10-11T12:00:00.000Z" } }],
  ])("rejeita: %s", (_name, patch) => {
    expect(parseAdminInterviewList(page([item(patch as Record<string, unknown>)]))).toBeNull();
  });

  it("não propaga campos extras sensíveis do payload", () => {
    const parsed = parseAdminInterviewList(
      page([item({ password_hash: "x", summary: "texto", criteriaScores: { clarity: 9 } })]),
    );
    expect(JSON.stringify(parsed)).not.toMatch(/password|summary|criteriaScores/);
  });
});

describe("listAdminInterviews", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("GET /admin/interviews com cookies e sem corpo", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, page()));

    const result = await listAdminInterviews();

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/admin\/interviews$/);
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(init.body).toBeUndefined();
    expect(result).toEqual({ ok: true, data: page() });
  });

  it("candidateId vira ?candidateId= na URL", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, page([])));

    const result = await listAdminInterviews({ candidateId: "5" });

    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/admin\/interviews\?candidateId=5$/);
    expect(result.ok).toBe(true);
  });

  it("candidateId inválido nem chega ao Back", async () => {
    const result = await listAdminInterviews({ candidateId: "abc" });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, reason: "error", message: ADMIN_INTERVIEWS_LOAD_ERROR_MESSAGE });
  });

  it("401 renova a sessão uma vez e repete", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(200, {}))
      .mockResolvedValueOnce(jsonResponse(200, page()));

    const result = await listAdminInterviews();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/auth\/refresh$/);
    expect(result.ok).toBe(true);
  });

  it("401 sem refresh => unauthorized; 403 => forbidden", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401)).mockResolvedValueOnce(jsonResponse(401));
    expect(await listAdminInterviews()).toMatchObject({ ok: false, reason: "unauthorized" });

    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse(403, { message: "Forbidden resource" }));
    expect(await listAdminInterviews()).toMatchObject({ ok: false, reason: "forbidden" });
  });

  it("5xx devolve mensagem amigável, sem texto técnico", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: "PrismaClientKnownRequestError: boom" }));

    const result = await listAdminInterviews();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toBe(ADMIN_INTERVIEWS_LOAD_ERROR_MESSAGE);
      expect(result.message).not.toMatch(/prisma|500|boom/i);
    }
  });

  it("400 do Back também vira mensagem amigável", async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { message: "Candidato inválido." }));
    const result = await listAdminInterviews({ candidateId: "5" });
    expect(result).toMatchObject({ ok: false, reason: "error", message: ADMIN_INTERVIEWS_LOAD_ERROR_MESSAGE });
  });

  it("falha de rede => erro explícito, nunca lista local", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await listAdminInterviews();

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).not.toMatch(/failed to fetch/i);
  });

  it("corpo inválido => erro genérico, sem dados parciais", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { total: 1, interviews: [{ id: "x" }] }));
    expect(await listAdminInterviews()).toMatchObject({ ok: false, reason: "error" });

    fetchMock.mockResolvedValue(new Response("<html>", { status: 200 }));
    expect(await listAdminInterviews()).toMatchObject({ ok: false, reason: "error" });
  });
});
