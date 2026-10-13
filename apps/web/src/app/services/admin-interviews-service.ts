/**
 * Fila de atribuição e avaliadores REAIS para o Admin (Fase 4).
 *
 * Lê/grava nos endpoints `GET /admin/interviews/pending-assignment`,
 * `GET /admin/evaluators`, `POST /admin/interviews/:id/assign` e (7A.1)
 * `GET /admin/interviews`, protegidos por
 * `@Roles('ADMIN')` no Back. Não existe fallback: se a API falhar, o resultado
 * é um erro explícito — nunca uma lista fictícia. Nada é lido ou gravado em
 * localStorage, e nenhuma identidade (Admin, status) é enviada no corpo.
 */

import { FRIENDLY_ERROR_MESSAGES, sanitizeServerMessage } from "../domain/user-friendly-error";
const API_BASE_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
    .env?.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export type AdminQueueInterview = {
  id: string;
  status: string;
  submittedAt: string | null;
  createdAt: string;
  jobTitle: string;
  jobCompany: string | null;
  questionCount: number;
  candidate: {
    id: string;
    name: string;
    email: string;
    professionalTitle: string | null;
  };
};

export type AdminEvaluator = {
  // `evaluator_profile_id` do Back (é o valor enviado em `evaluatorId`).
  id: number;
  name: string;
  email: string;
  accountStatus: string;
  // Somente contas ACTIVE podem receber entrevistas.
  eligible: boolean;
  area: string | null;
  specialization: string | null;
  // Entrevistas atualmente ASSIGNED a este avaliador (não são "concluídas").
  assignedCount: number;
};

export type AdminInterviewsFailure =
  | "not_found"
  | "conflict"
  | "forbidden"
  | "unauthorized"
  | "error";

export type AdminInterviewsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: AdminInterviewsFailure; message: string };

const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
const INVALID_RESPONSE_MESSAGE = FRIENDLY_ERROR_MESSAGES.generic;

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toQueueInterview(payload: unknown): AdminQueueInterview | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  const candidate = item.candidate as Record<string, unknown> | undefined;
  const context = item.context as Record<string, unknown> | undefined;

  if (
    typeof item.id !== "string" ||
    typeof item.status !== "string" ||
    typeof item.createdAt !== "string" ||
    !candidate ||
    typeof candidate !== "object" ||
    (typeof candidate.id !== "number" && typeof candidate.id !== "string") ||
    typeof candidate.name !== "string" ||
    typeof candidate.email !== "string" ||
    !context ||
    typeof context !== "object" ||
    typeof context.title !== "string"
  ) {
    return null;
  }

  return {
    id: item.id,
    status: item.status,
    submittedAt: nullableString(item.submittedAt),
    createdAt: item.createdAt,
    jobTitle: context.title,
    jobCompany: nullableString(context.company),
    questionCount: typeof item.questionCount === "number" ? item.questionCount : 0,
    candidate: {
      id: String(candidate.id),
      name: candidate.name,
      email: candidate.email,
      professionalTitle: nullableString(candidate.professionalTitle),
    },
  };
}

function toEvaluator(payload: unknown): AdminEvaluator | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;

  if (
    typeof item.id !== "number" ||
    typeof item.name !== "string" ||
    typeof item.email !== "string" ||
    typeof item.accountStatus !== "string" ||
    typeof item.eligible !== "boolean"
  ) {
    return null;
  }

  return {
    id: item.id,
    name: item.name,
    email: item.email,
    accountStatus: item.accountStatus,
    eligible: item.eligible,
    area: nullableString(item.area),
    specialization: nullableString(item.specialization),
    assignedCount: typeof item.assignedCount === "number" ? item.assignedCount : 0,
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

// O access token dura 15 minutos: num 401 tenta renovar uma única vez via
// `/auth/refresh` (mesmo fluxo de `admin-candidates-service.ts`) e repete.
export async function requestAdminApi(
  path: string,
  init: { method: "GET" } | { method: "POST"; body: unknown },
): Promise<Response | null> {
  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      method: init.method,
      credentials: "include",
      ...("body" in init
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

async function readServerMessage(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
    if (Array.isArray(body.message) && typeof body.message[0] === "string") {
      return body.message[0];
    }
  } catch {
    // corpo ausente/inválido: usa a mensagem padrão
  }
  return null;
}

async function failureFromResponse(
  response: Response,
  fallbackMessage: string,
): Promise<{ ok: false; reason: AdminInterviewsFailure; message: string }> {
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
      message: "Você não tem permissão para gerenciar atribuições.",
    };
  }
  // 404/409 trazem a mensagem de negócio do Back (ex.: "já foi atribuída").
  if (response.status === 404 || response.status === 409) {
    return {
      ok: false,
      reason: response.status === 404 ? "not_found" : "conflict",
      message: sanitizeServerMessage(await readServerMessage(response), { status: response.status, fallback: fallbackMessage, scope: "admin-interviews" }),
    };
  }
  return { ok: false, reason: "error", message: sanitizeServerMessage(null, { status: response.status, fallback: fallbackMessage, scope: "admin-interviews" }) };
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

export async function listPendingAssignmentInterviews(): Promise<
  AdminInterviewsResult<AdminQueueInterview[]>
> {
  const response = await requestAdminApi("/admin/interviews/pending-assignment", {
    method: "GET",
  });

  if (!response) {
    return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
  }
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível carregar a fila de atribuição. Tente novamente.",
    );
  }

  const body = await readJson(response);
  if (!body || !Array.isArray(body.interviews)) {
    return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  }

  const interviews = body.interviews.map(toQueueInterview);
  if (interviews.some((item) => item === null)) {
    return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  }

  return { ok: true, data: interviews as AdminQueueInterview[] };
}

export async function listAdminEvaluators(): Promise<
  AdminInterviewsResult<AdminEvaluator[]>
> {
  const response = await requestAdminApi("/admin/evaluators", { method: "GET" });

  if (!response) {
    return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
  }
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível carregar os avaliadores. Tente novamente.",
    );
  }

  const body = await readJson(response);
  if (!body || !Array.isArray(body.evaluators)) {
    return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  }

  const evaluators = body.evaluators.map(toEvaluator);
  if (evaluators.some((item) => item === null)) {
    return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  }

  return { ok: true, data: evaluators as AdminEvaluator[] };
}

// ─── Listagem geral de entrevistas (7A.1) ────────────────────────────────────
// `GET /admin/interviews[?candidateId=]`: entrevistas ENVIADAS (HUMAN e AI) vindas
// do banco. Substitui por completo o mock em localStorage. Sem fallback: erro é
// erro. A nota (`overallScore`) vem pronta do Back, só para HUMAN concluída.

export const ADMIN_INTERVIEWS_LOAD_ERROR_MESSAGE =
  "Não foi possível carregar as entrevistas. Tente novamente.";

export const ADMIN_INTERVIEW_STATUSES = [
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "COMPLETED",
  "PENDING_AI_EVALUATION",
] as const;
export type AdminInterviewStatus = (typeof ADMIN_INTERVIEW_STATUSES)[number];

export const ADMIN_INTERVIEW_EVALUATION_MODES = ["HUMAN", "AI"] as const;
export type AdminInterviewEvaluationMode = (typeof ADMIN_INTERVIEW_EVALUATION_MODES)[number];

export const ADMIN_INTERVIEW_EVALUATION_STATUSES = ["DRAFT", "COMPLETED"] as const;
export type AdminInterviewEvaluationStatus = (typeof ADMIN_INTERVIEW_EVALUATION_STATUSES)[number];

export type AdminInterviewListItem = {
  id: string;
  status: AdminInterviewStatus;
  /** O banco permite `null`; na prática toda entrevista enviada tem modalidade. */
  evaluationMode: AdminInterviewEvaluationMode | null;
  jobTitle: string;
  jobCompany: string | null;
  createdAt: string;
  submittedAt: string | null;
  assignedAt: string | null;
  candidate: { id: number; name: string; email: string };
  evaluator: { id: number; userId: number; name: string } | null;
  evaluation: {
    status: AdminInterviewEvaluationStatus;
    overallScore: number | null;
    completedAt: string | null;
  } | null;
};

export type AdminInterviewList = {
  total: number;
  interviews: AdminInterviewListItem[];
};

export type AdminInterviewsFilters = { candidateId?: string | number };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// O Back serializa com `Date#toISOString()`: sempre `YYYY-MM-DDTHH:mm:ss.sssZ`.
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CANDIDATE_ID_PATTERN = /^[1-9]\d{0,9}$/;
const MAX_POSTGRES_INT = 2147483647;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function oneOf<T extends string>(list: readonly T[], value: unknown): T | null {
  return typeof value === "string" && (list as readonly string[]).includes(value) ? (value as T) : null;
}

function isoInstant(value: unknown): string | null {
  if (typeof value !== "string" || !ISO_INSTANT_PATTERN.test(value)) return null;
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && new Date(time).toISOString() === value ? value : null;
}

function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= MAX_POSTGRES_INT
    ? value
    : null;
}

/** `candidateId` válido (inteiro positivo, limite do Int do banco) ou `null`. */
export function normalizeAdminCandidateId(value: string | number | undefined): string | null {
  if (value === undefined) return null;
  const text = String(value);
  if (!CANDIDATE_ID_PATTERN.test(text) || Number(text) > MAX_POSTGRES_INT) return null;
  return text;
}

export function buildAdminInterviewsPath(filters: AdminInterviewsFilters = {}): string {
  const candidateId = normalizeAdminCandidateId(filters.candidateId);
  return candidateId ? `/admin/interviews?candidateId=${candidateId}` : "/admin/interviews";
}

function toAdminInterviewListItem(payload: unknown): AdminInterviewListItem | null {
  if (!isRecord(payload)) return null;

  const id = typeof payload.id === "string" && UUID_PATTERN.test(payload.id) ? payload.id : null;
  const status = oneOf(ADMIN_INTERVIEW_STATUSES, payload.status);
  const evaluationMode =
    payload.evaluationMode === null ? null : oneOf(ADMIN_INTERVIEW_EVALUATION_MODES, payload.evaluationMode);
  const createdAt = isoInstant(payload.createdAt);
  const submittedAt = payload.submittedAt === null ? null : isoInstant(payload.submittedAt);
  const assignedAt = payload.assignedAt === null ? null : isoInstant(payload.assignedAt);
  const jobTitle = typeof payload.jobTitle === "string" && payload.jobTitle.trim() ? payload.jobTitle : null;
  const jobCompany = payload.jobCompany === null ? null : typeof payload.jobCompany === "string" ? payload.jobCompany : undefined;

  if (!id || !status || !createdAt || !jobTitle || jobCompany === undefined) return null;
  if ((payload.evaluationMode !== null && evaluationMode === null) || (payload.submittedAt !== null && !submittedAt)) return null;
  if (payload.assignedAt !== null && !assignedAt) return null;

  const rawCandidate = payload.candidate;
  if (!isRecord(rawCandidate)) return null;
  const candidateId = positiveInt(rawCandidate.id);
  if (
    candidateId === null ||
    typeof rawCandidate.name !== "string" ||
    typeof rawCandidate.email !== "string"
  ) {
    return null;
  }

  let evaluator: AdminInterviewListItem["evaluator"] = null;
  if (payload.evaluator !== null) {
    const raw = payload.evaluator;
    if (!isRecord(raw)) return null;
    const evaluatorId = positiveInt(raw.id);
    const evaluatorUserId = positiveInt(raw.userId);
    if (evaluatorId === null || evaluatorUserId === null || typeof raw.name !== "string") return null;
    evaluator = { id: evaluatorId, userId: evaluatorUserId, name: raw.name };
  }

  let evaluation: AdminInterviewListItem["evaluation"] = null;
  if (payload.evaluation !== null) {
    const raw = payload.evaluation;
    if (!isRecord(raw)) return null;
    const evaluationStatus = oneOf(ADMIN_INTERVIEW_EVALUATION_STATUSES, raw.status);
    const completedAt = raw.completedAt === null ? null : isoInstant(raw.completedAt);
    const score =
      raw.overallScore === null
        ? null
        : typeof raw.overallScore === "number" && Number.isFinite(raw.overallScore) && raw.overallScore >= 0 && raw.overallScore <= 10
          ? raw.overallScore
          : undefined;
    if (!evaluationStatus || score === undefined || (raw.completedAt !== null && !completedAt)) return null;
    // Coerência: nota só existe para avaliação HUMAN concluída (regra do Back).
    if (score !== null && (evaluationMode !== "HUMAN" || evaluationStatus !== "COMPLETED")) return null;
    evaluation = { status: evaluationStatus, overallScore: score, completedAt };
  }

  return {
    id,
    status,
    evaluationMode,
    jobTitle,
    jobCompany,
    createdAt,
    submittedAt,
    assignedAt,
    candidate: { id: candidateId, name: rawCandidate.name, email: rawCandidate.email },
    evaluator,
    evaluation,
  };
}

export function parseAdminInterviewList(payload: unknown): AdminInterviewList | null {
  if (!isRecord(payload) || !Array.isArray(payload.interviews)) return null;
  const total = payload.total;
  if (typeof total !== "number" || !Number.isInteger(total) || total < 0) return null;

  const interviews: AdminInterviewListItem[] = [];
  for (const raw of payload.interviews) {
    const item = toAdminInterviewListItem(raw);
    if (!item) return null;
    interviews.push(item);
  }
  return { total, interviews };
}

export async function listAdminInterviews(
  filters: AdminInterviewsFilters = {},
): Promise<AdminInterviewsResult<AdminInterviewList>> {
  // `candidateId` informado porém inválido: nem chega a consultar o Back.
  if (filters.candidateId !== undefined && normalizeAdminCandidateId(filters.candidateId) === null) {
    return { ok: false, reason: "error", message: ADMIN_INTERVIEWS_LOAD_ERROR_MESSAGE };
  }

  const response = await requestAdminApi(buildAdminInterviewsPath(filters), { method: "GET" });

  if (!response) {
    return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
  }
  if (!response.ok) {
    return failureFromResponse(response, ADMIN_INTERVIEWS_LOAD_ERROR_MESSAGE);
  }

  const data = parseAdminInterviewList(await readJson(response));
  if (!data) {
    return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  }
  return { ok: true, data };
}

// Envia SOMENTE o avaliador escolhido: o Admin vem do cookie/JWT e o status é
// decidido pelo Back. Não há reatribuição (409 se a entrevista já foi atribuída).
export async function assignInterviewToEvaluator(
  interviewId: string,
  evaluatorId: number,
): Promise<AdminInterviewsResult<{ interviewId: string; status: string }>> {
  const response = await requestAdminApi(
    `/admin/interviews/${encodeURIComponent(interviewId)}/assign`,
    { method: "POST", body: { evaluatorId } },
  );

  if (!response) {
    return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
  }
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível atribuir a entrevista. Tente novamente.",
    );
  }

  const body = await readJson(response);
  if (!body || typeof body.id !== "string" || typeof body.status !== "string") {
    return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  }

  return { ok: true, data: { interviewId: body.id, status: body.status } };
}
