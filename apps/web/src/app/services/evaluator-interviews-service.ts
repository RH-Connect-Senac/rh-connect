/**
 * Fila e detalhe REAIS das entrevistas atribuídas ao Avaliador (Fase 5C.1).
 *
 * Lê `GET /evaluator/interviews` e `GET /evaluator/interviews/:id`, protegidos
 * por `@Roles('EVALUATOR')` no Back. O avaliador é sempre o do cookie/JWT: o
 * Front não envia (nem conhece) `evaluator_profile_id`. Não existe fallback:
 * se a API falhar, o resultado é um erro explícito — nunca uma lista mock. Nada
 * é lido ou gravado em localStorage.
 */

import {
  EVALUATION_CRITERIA,
  type CriterionKey,
  type EvaluationDraft,
} from "../domain/evaluator-evaluation-form";

const API_BASE_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
    .env?.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export type EvaluatorCandidate = {
  name: string;
  professionalTitle: string | null;
  city: string | null;
  state: string | null;
};

export type EvaluatorQueueItem = {
  // interviewId (UUID) real: é o único identificador usado na navegação.
  id: string;
  status: string;
  candidate: EvaluatorCandidate;
  jobTitle: string;
  company: string | null;
  location: string | null;
  workMode: string | null;
  assignedAt: string | null;
  submittedAt: string | null;
  questionCount: number;
};

export type EvaluatorInterviewQuestion = {
  id: string;
  position: number;
  type: string;
  text: string;
  // Texto exatamente como persistido (quebras de linha preservadas).
  answer: string | null;
  answeredAt: string | null;
};

export type EvaluatorInterviewDetail = {
  id: string;
  status: string;
  evaluationMode: string | null;
  assignedAt: string | null;
  submittedAt: string | null;
  candidate: EvaluatorCandidate;
  context: {
    sourceUrl: string | null;
    title: string;
    company: string | null;
    summary: string | null;
    activities: string[];
    requirements: string[];
    location: string | null;
    contractType: string | null;
    workMode: string | null;
  };
  questions: EvaluatorInterviewQuestion[];
};

export type EvaluatorInterviewsFailure =
  | "not_found"
  | "forbidden"
  | "unauthorized"
  | "invalid"
  | "conflict"
  | "error";

export type EvaluatorInterviewsResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: EvaluatorInterviewsFailure; message: string };

const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
const INVALID_RESPONSE_MESSAGE = "Resposta inválida do servidor. Tente novamente.";
export const NOT_FOUND_MESSAGE = "Entrevista não encontrada ou indisponível.";

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toCandidate(payload: unknown): EvaluatorCandidate | null {
  const item = asRecord(payload);
  if (!item || typeof item.name !== "string") return null;
  return {
    name: item.name,
    professionalTitle: nullableString(item.professionalTitle),
    city: nullableString(item.city),
    state: nullableString(item.state),
  };
}

function toQueueItem(payload: unknown): EvaluatorQueueItem | null {
  const item = asRecord(payload);
  if (!item) return null;
  const candidate = toCandidate(item.candidate);
  if (
    typeof item.interviewId !== "string" ||
    typeof item.status !== "string" ||
    typeof item.jobTitle !== "string" ||
    !candidate
  ) {
    return null;
  }
  return {
    id: item.interviewId,
    status: item.status,
    candidate,
    jobTitle: item.jobTitle,
    company: nullableString(item.company),
    location: nullableString(item.location),
    workMode: nullableString(item.workMode),
    assignedAt: nullableString(item.assignedAt),
    submittedAt: nullableString(item.submittedAt),
    questionCount: typeof item.questionCount === "number" ? item.questionCount : 0,
  };
}

function toQuestion(payload: unknown): EvaluatorInterviewQuestion | null {
  const item = asRecord(payload);
  if (
    !item ||
    typeof item.id !== "string" ||
    typeof item.position !== "number" ||
    typeof item.type !== "string" ||
    typeof item.text !== "string"
  ) {
    return null;
  }
  return {
    id: item.id,
    position: item.position,
    type: item.type,
    text: item.text,
    answer: nullableString(item.answer),
    answeredAt: nullableString(item.answeredAt),
  };
}

function toDetail(payload: unknown): EvaluatorInterviewDetail | null {
  const item = asRecord(payload);
  if (!item) return null;
  const candidate = toCandidate(item.candidate);
  const context = asRecord(item.context);
  if (
    typeof item.interviewId !== "string" ||
    typeof item.status !== "string" ||
    !candidate ||
    !context ||
    typeof context.title !== "string" ||
    !Array.isArray(item.questions)
  ) {
    return null;
  }
  const questions = item.questions.map(toQuestion);
  if (questions.some((question) => question === null)) return null;

  return {
    id: item.interviewId,
    status: item.status,
    evaluationMode: nullableString(item.evaluationMode),
    assignedAt: nullableString(item.assignedAt),
    submittedAt: nullableString(item.submittedAt),
    candidate,
    context: {
      sourceUrl: nullableString(context.sourceUrl),
      title: context.title,
      company: nullableString(context.company),
      summary: nullableString(context.summary),
      activities: stringList(context.activities),
      requirements: stringList(context.requirements),
      location: nullableString(context.location),
      contractType: nullableString(context.contractType),
      workMode: nullableString(context.workMode),
    },
    questions: (questions as EvaluatorInterviewQuestion[]).sort(
      (a, b) => a.position - b.position,
    ),
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
// `/auth/refresh` (mesmo fluxo dos demais serviços reais) e repete.
async function requestEvaluatorApi(
  path: string,
  init: { method: "GET" } | { method: "POST" } | { method: "PUT"; body: unknown } = { method: "GET" },
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

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    return asRecord(await response.json());
  } catch {
    return null;
  }
}

// Mensagem de negócio do Back (400/409). Só texto simples em português; nunca
// stack nem detalhe técnico: se vier algo fora do padrão, usa a mensagem padrão.
async function readBusinessMessage(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { message?: unknown };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    if (
      typeof message === "string" &&
      message.trim() &&
      message.length <= 300 &&
      !/\bat\s+\S+\s*\(|Prisma|stack/i.test(message)
    ) {
      return message;
    }
  } catch {
    // corpo ausente/inválido: usa a mensagem padrão
  }
  return null;
}

// Mensagens fixas e seguras: nunca repassa texto técnico do servidor.
async function failureFromResponse(
  response: Response,
  fallbackMessage: string,
): Promise<{ ok: false; reason: EvaluatorInterviewsFailure; message: string }> {
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
      message: "Sua conta não tem acesso às avaliações. Fale com o administrador.",
    };
  }
  if (response.status === 404) {
    return { ok: false, reason: "not_found", message: NOT_FOUND_MESSAGE };
  }
  if (response.status === 400 || response.status === 409) {
    return {
      ok: false,
      reason: response.status === 400 ? "invalid" : "conflict",
      message: (await readBusinessMessage(response)) ?? fallbackMessage,
    };
  }
  return { ok: false, reason: "error", message: fallbackMessage };
}

export async function listAssignedInterviews(): Promise<
  EvaluatorInterviewsResult<EvaluatorQueueItem[]>
> {
  const response = await requestEvaluatorApi("/evaluator/interviews");

  if (!response) {
    return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
  }
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível carregar suas avaliações. Tente novamente.",
    );
  }

  const body = await readJson(response);
  if (!body || !Array.isArray(body.interviews)) {
    return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  }
  const items = body.interviews.map(toQueueItem);
  if (items.some((item) => item === null)) {
    return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  }

  return { ok: true, data: items as EvaluatorQueueItem[] };
}

export async function getAssignedInterview(
  interviewId: string,
): Promise<EvaluatorInterviewsResult<EvaluatorInterviewDetail>> {
  const response = await requestEvaluatorApi(
    `/evaluator/interviews/${encodeURIComponent(interviewId)}`,
  );

  if (!response) {
    return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
  }
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível carregar a entrevista. Tente novamente.",
    );
  }

  const detail = toDetail(await readJson(response));
  if (!detail) {
    return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  }
  return { ok: true, data: detail };
}

// ─── Rascunho da avaliação humana (Fase 5C.2) ────────────────────────────────

export type EvaluationDraftInput = {
  criteriaScores?: Partial<Record<CriterionKey, number>>;
  summary?: string | null;
};

const CRITERION_KEYS: readonly string[] = EVALUATION_CRITERIA.map((criterion) => criterion.key);

function toDraft(payload: unknown): EvaluationDraft | null {
  const item = asRecord(payload);
  if (
    !item ||
    typeof item.interviewId !== "string" ||
    (item.status !== "DRAFT" && item.status !== "COMPLETED")
  ) {
    return null;
  }
  const rawScores = asRecord(item.criteriaScores) ?? {};
  const criteriaScores: Partial<Record<CriterionKey, number>> = {};
  for (const key of CRITERION_KEYS) {
    const value = rawScores[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      criteriaScores[key as CriterionKey] = value;
    }
  }
  return {
    interviewId: item.interviewId,
    status: item.status,
    criteriaScores,
    summary: nullableString(item.summary),
    overallScore: typeof item.overallScore === "number" ? item.overallScore : null,
    updatedAt: nullableString(item.updatedAt),
  };
}

// GET: sem avaliação ainda, o Back devolve o estado vazio (200) — nada é criado.
export async function getEvaluationDraft(
  interviewId: string,
): Promise<EvaluatorInterviewsResult<EvaluationDraft>> {
  const response = await requestEvaluatorApi(
    `/evaluator/interviews/${encodeURIComponent(interviewId)}/evaluation`,
  );

  if (!response) {
    return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
  }
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível carregar a avaliação. Tente novamente.",
    );
  }

  const draft = toDraft(await readJson(response));
  if (!draft) {
    return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  }
  return { ok: true, data: draft };
}

// PUT: envia SOMENTE `criteriaScores` (parcial) e `summary`. Avaliador, status e
// nota final nunca vão no corpo — o Back decide tudo (e recalcula o overallScore).
export async function saveEvaluationDraft(
  interviewId: string,
  input: EvaluationDraftInput,
): Promise<EvaluatorInterviewsResult<EvaluationDraft>> {
  const body: EvaluationDraftInput = {};
  if (input.criteriaScores !== undefined) body.criteriaScores = input.criteriaScores;
  if (input.summary !== undefined) body.summary = input.summary;

  const response = await requestEvaluatorApi(
    `/evaluator/interviews/${encodeURIComponent(interviewId)}/evaluation`,
    { method: "PUT", body },
  );

  if (!response) {
    return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
  }
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível salvar o rascunho. Tente novamente.",
    );
  }

  const draft = toDraft(await readJson(response));
  if (!draft) {
    return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  }
  return { ok: true, data: draft };
}

// ─── Conclusão da avaliação humana (Fase 5C.3) ───────────────────────────────

export type EvaluationCompletion = {
  interviewId: string;
  status: "COMPLETED";
  evaluationStatus: "COMPLETED";
  // Nota FINAL recalculada pelo Back (média simples dos 7 critérios).
  overallScore: number | null;
  completedAt: string | null;
};

// POST sem corpo: nada de critérios, comentário, status ou nota final vem do
// cliente — o Back lê o rascunho do banco, valida e decide o resultado. Após
// concluir, os GET ativos (ASSIGNED) passam a devolver 404: isso é esperado.
export async function completeEvaluation(
  interviewId: string,
): Promise<EvaluatorInterviewsResult<EvaluationCompletion>> {
  const response = await requestEvaluatorApi(
    `/evaluator/interviews/${encodeURIComponent(interviewId)}/evaluation/complete`,
    { method: "POST" },
  );

  if (!response) {
    return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
  }
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível concluir a avaliação. Tente novamente.",
    );
  }

  // O Back já concluiu: um corpo fora do padrão NÃO vira erro (repetir o POST
  // daria 404). Os campos que faltarem aparecem como indisponíveis.
  const body = (await readJson(response)) ?? {};
  return {
    ok: true,
    data: {
      interviewId,
      status: "COMPLETED",
      evaluationStatus: "COMPLETED",
      overallScore:
        typeof body.overallScore === "number" && Number.isFinite(body.overallScore)
          ? body.overallScore
          : null,
      completedAt: nullableString(body.completedAt),
    },
  };
}
