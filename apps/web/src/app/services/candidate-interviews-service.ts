/**
 * Entrevista REAL do candidato (Fase 2B) — cliente dos endpoints das Fases 1 e 2.
 *
 *   POST  /interviews                                 cria a Interview (IN_PROGRESS)
 *   GET   /interviews/:id                             lê a Interview
 *   POST  /interviews/:id/questions/generate          gera/recupera as 5 perguntas (idempotente)
 *   GET   /interviews/:id/questions                   lê perguntas + respostas persistidas
 *   PUT   /interviews/:id/questions/:qid/answer       grava a resposta
 *   PATCH /interviews/:id/evaluation-mode             grava a modalidade (AI | HUMAN)
 *   POST  /interviews/:id/submit                      envia (HUMAN → PENDING_ASSIGNMENT,
 *                                                     AI → PENDING_AI_EVALUATION)
 *
 * Regras:
 *  - O banco é a fonte da verdade. Nada aqui usa armazenamento do navegador.
 *  - O id da Interview e os ids das perguntas (UUID) vêm SEMPRE da API;
 *    o navegador nunca gera id nem envia o dono da entrevista (ele vem do JWT).
 *  - Sem fallback/mock: em erro devolve `{ ok:false }` com mensagem segura.
 *  - A avaliação por IA NÃO é chamada aqui (Fase 3 pausada).
 */

import type { JobInterviewContext } from "./interview-context-service";

const API_BASE_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
    .env?.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export type RealEvaluationMode = "AI" | "HUMAN";

export type RealInterviewStatus =
  | "IN_PROGRESS"
  | "PENDING_AI_EVALUATION"
  | "PENDING_ASSIGNMENT"
  | "ASSIGNED"
  | "COMPLETED";

/** Tipos usados pela UI do wizard (mesmos rótulos de antes). */
export type WizardQuestionType = "Tecnica" | "Comportamental" | "Carreira";

export type RealInterviewQuestion = {
  /** UUID real (`interview_question.question_id`). */
  id: string;
  position: number;
  type: WizardQuestionType;
  text: string;
  answer: string | null;
};

export type RealInterview = {
  id: string;
  status: RealInterviewStatus;
  evaluationMode: RealEvaluationMode | null;
  submittedAt: string | null;
  createdAt: string;
  title: string;
  company: string | null;
};

export type CandidateInterviewFailure =
  | "validation"
  | "not_found"
  | "conflict"
  | "unauthorized"
  | "forbidden"
  | "error";

export type CandidateInterviewResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: CandidateInterviewFailure; message: string };

const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
const INVALID_RESPONSE_MESSAGE = "Resposta inválida do servidor. Tente novamente.";

const STATUSES: RealInterviewStatus[] = [
  "IN_PROGRESS",
  "PENDING_AI_EVALUATION",
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "COMPLETED",
];

const QUESTION_TYPE_LABEL: Record<string, WizardQuestionType> = {
  TECHNICAL: "Tecnica",
  BEHAVIORAL: "Comportamental",
  CAREER: "Carreira",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toQuestion(payload: unknown): RealInterviewQuestion | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  const type = typeof item.type === "string" ? QUESTION_TYPE_LABEL[item.type] : undefined;
  if (
    !isUuid(item.id) ||
    typeof item.position !== "number" ||
    !type ||
    typeof item.text !== "string" ||
    !item.text.trim()
  ) {
    return null;
  }
  return {
    id: item.id,
    position: item.position,
    type,
    text: item.text,
    answer: nullableString(item.answer),
  };
}

function toInterview(payload: unknown): RealInterview | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  const context = item.context as Record<string, unknown> | undefined;
  if (
    !isUuid(item.id) ||
    typeof item.status !== "string" ||
    !STATUSES.includes(item.status as RealInterviewStatus) ||
    typeof item.createdAt !== "string" ||
    !context ||
    typeof context !== "object" ||
    typeof context.title !== "string"
  ) {
    return null;
  }
  return {
    id: item.id,
    status: item.status as RealInterviewStatus,
    evaluationMode:
      item.evaluationMode === "AI" || item.evaluationMode === "HUMAN"
        ? item.evaluationMode
        : null,
    submittedAt: nullableString(item.submittedAt),
    createdAt: item.createdAt,
    title: context.title,
    company: nullableString(context.company),
  };
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

type RequestInitLite = { method: "GET" | "POST" | "PUT" | "PATCH"; body?: unknown };

// Num 401 tenta renovar o token UMA vez e repete (mesmo padrão dos serviços Admin).
async function request(path: string, init: RequestInitLite): Promise<Response | null> {
  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      method: init.method,
      credentials: "include",
      ...(init.body !== undefined
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(init.body),
          }
        : {}),
    });

  try {
    const response = await doFetch();
    if (response.status !== 401) return response;
    if (!(await refreshAccessToken())) return response;
    return await doFetch();
  } catch {
    return null;
  }
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const payload: unknown = await response.json();
    return payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

async function readServerMessage(response: Response): Promise<string | null> {
  const body = await readJson(response);
  if (!body) return null;
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  if (Array.isArray(body.message)) {
    const messages = body.message.filter((m): m is string => typeof m === "string");
    if (messages.length) return messages.join(" ");
  }
  return null;
}

async function failureFromResponse(
  response: Response,
  fallbackMessage: string,
): Promise<{ ok: false; reason: CandidateInterviewFailure; message: string }> {
  if (response.status === 401) {
    return {
      ok: false,
      reason: "unauthorized",
      message: "Sua sessão expirou. Entre novamente para continuar.",
    };
  }
  if (response.status === 403) {
    return {
      ok: false,
      reason: "forbidden",
      message: "Você não tem permissão para realizar esta ação.",
    };
  }
  // 400/404/409 trazem mensagem de negócio do Back (ex.: texto acima do limite).
  if (response.status === 400 || response.status === 404 || response.status === 409) {
    return {
      ok: false,
      reason:
        response.status === 400 ? "validation" : response.status === 404 ? "not_found" : "conflict",
      message: (await readServerMessage(response)) ?? fallbackMessage,
    };
  }
  return { ok: false, reason: "error", message: fallbackMessage };
}

function networkFailure(): { ok: false; reason: "error"; message: string } {
  return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
}

function invalidResponse(): { ok: false; reason: "error"; message: string } {
  return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
}

function idPath(interviewId: string) {
  return `/interviews/${encodeURIComponent(interviewId)}`;
}

/** Cria a Interview. Envia SOMENTE o contexto da vaga (nunca dono/status/modo). */
export async function createRealInterview(
  context: JobInterviewContext,
): Promise<CandidateInterviewResult<RealInterview>> {
  const response = await request("/interviews", {
    method: "POST",
    body: {
      sourceUrl: context.sourceUrl,
      title: context.title,
      company: context.company || undefined,
      summary: context.summary || undefined,
      activities: context.activities ?? [],
      requirements: context.requirements ?? [],
      location: context.location ?? undefined,
      contractType: context.contractType ?? undefined,
      workMode: context.workMode ?? undefined,
    },
  });
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(response, "Não foi possível iniciar a entrevista. Tente novamente.");
  }
  const interview = toInterview(await readJson(response));
  return interview ? { ok: true, data: interview } : invalidResponse();
}

export async function getRealInterview(
  interviewId: string,
): Promise<CandidateInterviewResult<RealInterview>> {
  const response = await request(idPath(interviewId), { method: "GET" });
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(response, "Não foi possível carregar a entrevista. Tente novamente.");
  }
  const interview = toInterview(await readJson(response));
  return interview ? { ok: true, data: interview } : invalidResponse();
}

function parseQuestions(
  body: Record<string, unknown> | null,
): CandidateInterviewResult<RealInterviewQuestion[]> {
  if (!body || !Array.isArray(body.questions)) return invalidResponse();
  const questions = body.questions.map(toQuestion);
  if (questions.length === 0 || questions.some((q) => q === null)) return invalidResponse();
  return {
    ok: true,
    data: (questions as RealInterviewQuestion[]).sort((a, b) => a.position - b.position),
  };
}

/** Gera (ou recupera, se já existem) as perguntas persistidas. Idempotente. */
export async function generateRealQuestions(
  interviewId: string,
): Promise<CandidateInterviewResult<RealInterviewQuestion[]>> {
  const response = await request(`${idPath(interviewId)}/questions/generate`, { method: "POST" });
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível gerar as perguntas da entrevista. Tente novamente.",
    );
  }
  return parseQuestions(await readJson(response));
}

/** Lê as perguntas e as respostas JÁ persistidas (fonte da verdade). */
export async function getRealQuestions(
  interviewId: string,
): Promise<CandidateInterviewResult<RealInterviewQuestion[]>> {
  const response = await request(`${idPath(interviewId)}/questions`, { method: "GET" });
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível carregar as perguntas da entrevista. Tente novamente.",
    );
  }
  return parseQuestions(await readJson(response));
}

/** Grava a resposta (resposta em branco limpa a resposta no Back). */
export async function saveRealAnswer(
  interviewId: string,
  questionId: string,
  answer: string,
): Promise<CandidateInterviewResult<RealInterviewQuestion>> {
  const response = await request(
    `${idPath(interviewId)}/questions/${encodeURIComponent(questionId)}/answer`,
    { method: "PUT", body: { answer } },
  );
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível salvar sua resposta. Tente novamente.",
    );
  }
  const question = toQuestion(await readJson(response));
  return question ? { ok: true, data: question } : invalidResponse();
}

export async function saveRealEvaluationMode(
  interviewId: string,
  evaluationMode: RealEvaluationMode,
): Promise<CandidateInterviewResult<RealInterview>> {
  const response = await request(`${idPath(interviewId)}/evaluation-mode`, {
    method: "PATCH",
    body: { evaluationMode },
  });
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível salvar a modalidade de avaliação. Tente novamente.",
    );
  }
  const interview = toInterview(await readJson(response));
  return interview ? { ok: true, data: interview } : invalidResponse();
}

/**
 * Envia a entrevista. Não chama IA: AI → PENDING_AI_EVALUATION (aguarda a
 * Fase 3), HUMAN → PENDING_ASSIGNMENT (entra na fila do Admin).
 */
export async function submitRealInterview(
  interviewId: string,
  evaluationMode: RealEvaluationMode,
): Promise<CandidateInterviewResult<RealInterview>> {
  const response = await request(`${idPath(interviewId)}/submit`, {
    method: "POST",
    body: { evaluationMode },
  });
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível enviar a entrevista. Tente novamente.",
    );
  }
  const interview = toInterview(await readJson(response));
  return interview ? { ok: true, data: interview } : invalidResponse();
}
