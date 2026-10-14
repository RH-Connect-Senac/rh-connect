/**
 * Entrevista REAL do candidato (Fase 2B) — cliente dos endpoints das Fases 1 e 2.
 *
 *   POST  /interviews                                 cria a Interview (IN_PROGRESS)
 *   GET   /interviews                                 histórico do candidato (uma chamada, sem N+1)
 *   GET   /interviews/:id                             lê a Interview
 *   GET   /interviews/:id/result                      resultado HUMAN concluído (relatório do candidato)
 *   POST  /interviews/:id/questions/generate          gera/recupera as 5 perguntas (idempotente)
 *   GET   /interviews/:id/questions                   lê perguntas + respostas persistidas
 *   PUT   /interviews/:id/questions/:qid/answer       grava a resposta OFICIAL (confirmação)
 *   PUT   /interviews/:id/questions/:qid/answer/draft grava o RASCUNHO (autosave; nunca é resposta)
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
import { FRIENDLY_ERROR_MESSAGES, sanitizeServerMessage } from "../domain/user-friendly-error";

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
  | "COMPLETED"
  // Encerrada pelo candidato (POST /interviews/:id/cancel). Nunca é retomada nem vira enviada.
  | "CANCELLED";

/** Tipos usados pela UI do wizard (mesmos rótulos de antes). */
export type WizardQuestionType = "Tecnica" | "Comportamental" | "Carreira";

export type RealInterviewQuestion = {
  /** UUID real (`interview_question.question_id`). */
  id: string;
  position: number;
  type: WizardQuestionType;
  text: string;
  /** Resposta OFICIAL (confirmada). Só ela conta como "respondida". */
  answer: string | null;
  /** Rascunho em andamento (pode atravessar dispositivos; NÃO é resposta). */
  draftText: string | null;
  draftUpdatedAt: string | null;
  /** Versão do rascunho (controle otimista entre dispositivos). */
  draftVersion: number;
};

export type RealAnswerDraft = {
  id: string;
  draftText: string | null;
  draftUpdatedAt: string | null;
  draftVersion: number;
};

/** Estado vigente da pergunta no Back devolvido num 409 DRAFT_VERSION_CONFLICT. */
export type RealAnswerConflict = RealAnswerDraft & {
  /** Resposta OFICIAL vigente no Back (null = nenhuma). */
  answer: string | null;
};

/** Códigos estáveis dos 409 do Back (a decisão nunca depende do texto da mensagem). */
export const DRAFT_VERSION_CONFLICT_CODE = "DRAFT_VERSION_CONFLICT";
export const INTERVIEW_NOT_IN_PROGRESS_CODE = "INTERVIEW_NOT_IN_PROGRESS";
export const INTERVIEW_ALREADY_IN_PROGRESS_CODE = "INTERVIEW_ALREADY_IN_PROGRESS";
/** 409 de `GET /interviews/:id/result`: a avaliação ainda não foi concluída/não existe resultado. */
export const INTERVIEW_RESULT_NOT_AVAILABLE_CODE = "INTERVIEW_RESULT_NOT_AVAILABLE";

export type SaveDraftResult =
  | { ok: true; data: RealAnswerDraft }
  | {
      ok: false;
      reason: CandidateInterviewFailure;
      message: string;
      conflict?: RealAnswerDraft;
      interviewStatus?: RealInterviewStatus;
    };

export type SaveAnswerResult =
  | { ok: true; data: RealInterviewQuestion }
  | {
      ok: false;
      reason: CandidateInterviewFailure;
      message: string;
      /** Só em `conflict` por versão: estado vigente para reconciliar. */
      conflict?: RealAnswerConflict;
      /** Só em `not_in_progress`: status vigente da entrevista, quando o Back informa. */
      interviewStatus?: RealInterviewStatus;
    };

/** Perguntas + status vigente da entrevista (uma única chamada para revalidar). */
export type RealQuestionsState = {
  questions: RealInterviewQuestion[];
  /** null = o Back não informou (cliente tolerante a Back mais antigo). */
  interviewStatus: RealInterviewStatus | null;
};

export type RealInterview = {
  id: string;
  status: RealInterviewStatus;
  evaluationMode: RealEvaluationMode | null;
  submittedAt: string | null;
  createdAt: string;
  /** Carimbos reais do Back (6A.1). null = não informado ou ainda não ocorreu. */
  assignedAt: string | null;
  /** Só preenchido quando a avaliação HUMANA foi concluída (nunca `updated_at`). */
  completedAt: string | null;
  title: string;
  company: string | null;
  /** Contexto COMPLETO da vaga (necessário para reconstruir o wizard em outro dispositivo). */
  context: JobInterviewContext;
};

/** Pergunta/resposta do resultado: só o que foi persistido (HUMAN não tem nota por pergunta). */
export type RealResultQuestion = {
  id: string;
  position: number;
  type: WizardQuestionType;
  text: string;
  answer: string | null;
  answeredAt: string | null;
};

/** Fonte de um material recomendado (contrato do Back; `GET /interviews/:id/result`). */
export type MaterialRecommendationSource = "RH_CONNECT" | "CACHOLA" | "ORANGO";
export type MaterialRecommendationArea = "TI" | "RH" | "SECRETARIADO" | "GERAL";
export type MaterialRecommendationMatchKind = "primary" | "secondary" | "general_preparation";
/**
 * Disponibilidade resolvida pelo Back no momento da leitura:
 * - IN_APP: material do RH Connect (abre dentro do app);
 * - AVAILABLE: externo ativo; UNAVAILABLE: externo inativo/removido;
 * - UNKNOWN: o Back não conseguiu verificar (NÃO significa indisponível).
 */
export type MaterialRecommendationAvailability = "AVAILABLE" | "UNAVAILABLE" | "IN_APP" | "UNKNOWN";

/**
 * Material recomendado ao candidato nesta entrevista. `title`, `resourceType`, `area` e `reason`
 * são o histórico gravado na época; `availability`/`url`/`coverUrl` são o estado ATUAL.
 * `matchedNeed`/`matchKind`/`position` são metadados internos: nunca exibidos como texto.
 */
export type MaterialRecommendation = {
  position: number;
  source: MaterialRecommendationSource;
  title: string;
  resourceType: string;
  area: MaterialRecommendationArea;
  matchedNeed: string | null;
  matchKind: MaterialRecommendationMatchKind;
  reason: string;
  availability: MaterialRecommendationAvailability;
  /** Só RH_CONNECT; identifica o material na rota interna. */
  internalSlug: string | null;
  directLinkAvailable: boolean;
  url: string | null;
  coverUrl: string | null;
};

/** `GET /interviews/:id/result` (avaliação HUMANA concluída). Tudo persistido: nada é recalculado. */
export type RealInterviewResult = {
  interview: RealInterview;
  evaluation: {
    /** Nota geral gravada pelo Back (o cliente não recalcula). */
    overallScore: number;
    /** Chaves canônicas do Back (`clarity`, `domain_knowledge`...) com nota finita. */
    criteriaScores: Record<string, number>;
    summary: string;
    completedAt: string | null;
  };
  questions: RealResultQuestion[];
  /** Aditivo: payload antigo (sem o campo) ou inválido vira []. Ordenado por `position`. */
  materialRecommendations: MaterialRecommendation[];
};

/** Item de `GET /interviews/in-progress` (sem texto de resposta/rascunho). */
export type RealInProgressInterview = {
  id: string;
  title: string;
  company: string | null;
  evaluationMode: RealEvaluationMode | null;
  interviewStatus: "IN_PROGRESS";
  createdAt: string;
  questionCount: number;
  answeredQuestionCount: number;
  latestDraftUpdatedAt: string | null;
};

/**
 * Item de `GET /interviews` (6A.4): resumo do Histórico. Sem perguntas/respostas (só a contagem).
 * `overallScore` e `resultAvailable` vêm do Back e são a verdade da UI (nada é recalculado).
 */
export type RealHistoryItem = {
  id: string;
  status: RealInterviewStatus;
  evaluationMode: RealEvaluationMode | null;
  title: string;
  company: string | null;
  location: string | null;
  contractType: string | null;
  workMode: "REMOTE" | "HYBRID" | "ONSITE" | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  assignedAt: string | null;
  completedAt: string | null;
  questionCount: number;
  overallScore: number | null;
  resultAvailable: boolean;
};

export type RealInterviewHistory = {
  /** Total informado pelo Back (pode superar `interviews.length` se houver teto de segurança). */
  total: number;
  /** Mesma ordem do Back (createdAt DESC, desempate por id). */
  interviews: RealHistoryItem[];
};

export type CandidateInterviewFailure =
  | "validation"
  | "not_found"
  | "conflict"
  // 409 INTERVIEW_NOT_IN_PROGRESS: a entrevista já foi enviada/encerrada.
  | "not_in_progress"
  // 409 INTERVIEW_ALREADY_IN_PROGRESS: regra V1 (uma IN_PROGRESS por candidato).
  | "already_in_progress"
  // 409 INTERVIEW_RESULT_NOT_AVAILABLE: a entrevista ainda não tem resultado para o candidato.
  | "result_not_available"
  | "unauthorized"
  | "forbidden"
  | "error";

export type CandidateInterviewResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      reason: CandidateInterviewFailure;
      message: string;
      interviewStatus?: RealInterviewStatus;
      /** Só em `already_in_progress`: a entrevista IN_PROGRESS existente. */
      existingInterviewId?: string;
    };

const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";
const INVALID_RESPONSE_MESSAGE = FRIENDLY_ERROR_MESSAGES.generic;

const STATUSES: RealInterviewStatus[] = [
  "IN_PROGRESS",
  "PENDING_AI_EVALUATION",
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "COMPLETED",
  "CANCELLED",
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
    draftText: nullableString(item.draftText),
    draftUpdatedAt: nullableString(item.draftUpdatedAt),
    draftVersion:
      typeof item.draftVersion === "number" && Number.isInteger(item.draftVersion) && item.draftVersion >= 0
        ? item.draftVersion
        : 0,
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
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
    assignedAt: nullableString(item.assignedAt),
    completedAt: nullableString(item.completedAt),
    title: context.title,
    company: nullableString(context.company),
    context: {
      sourceUrl: typeof context.sourceUrl === "string" ? context.sourceUrl : "",
      title: context.title,
      company: typeof context.company === "string" ? context.company : "",
      summary: typeof context.summary === "string" ? context.summary : "",
      activities: toStringArray(context.activities),
      requirements: toStringArray(context.requirements),
      location: nullableString(context.location),
      contractType: nullableString(context.contractType),
      workMode:
        context.workMode === "REMOTE" || context.workMode === "HYBRID" || context.workMode === "ONSITE"
          ? context.workMode
          : null,
    },
  };
}

function toResultQuestion(payload: unknown): RealResultQuestion | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  const type = typeof item.type === "string" ? QUESTION_TYPE_LABEL[item.type] : undefined;
  if (!isUuid(item.id) || typeof item.position !== "number" || !type || typeof item.text !== "string") {
    return null;
  }
  return {
    id: item.id,
    position: item.position,
    type,
    text: item.text,
    answer: nullableString(item.answer),
    answeredAt: nullableString(item.answeredAt),
  };
}

const MATERIAL_SOURCES: readonly MaterialRecommendationSource[] = ["RH_CONNECT", "CACHOLA", "ORANGO"];
const MATERIAL_AREAS: readonly MaterialRecommendationArea[] = ["TI", "RH", "SECRETARIADO", "GERAL"];
const MATERIAL_MATCH_KINDS: readonly MaterialRecommendationMatchKind[] = ["primary", "secondary", "general_preparation"];
const MATERIAL_AVAILABILITIES: readonly MaterialRecommendationAvailability[] = ["AVAILABLE", "UNAVAILABLE", "IN_APP", "UNKNOWN"];

function nonEmptyStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function toMaterialRecommendation(payload: unknown): MaterialRecommendation | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const item = payload as Record<string, unknown>;
  const source = MATERIAL_SOURCES.find((candidate) => candidate === item.source);
  const area = MATERIAL_AREAS.find((candidate) => candidate === item.area);
  const matchKind = MATERIAL_MATCH_KINDS.find((candidate) => candidate === item.matchKind);
  const availability = MATERIAL_AVAILABILITIES.find((candidate) => candidate === item.availability);
  if (
    !source ||
    !area ||
    !matchKind ||
    !availability ||
    typeof item.position !== "number" ||
    !Number.isInteger(item.position) ||
    typeof item.title !== "string" ||
    !item.title.trim() ||
    typeof item.resourceType !== "string" ||
    typeof item.reason !== "string"
  ) {
    return null;
  }
  return {
    position: item.position,
    source,
    title: item.title.trim(),
    resourceType: item.resourceType.trim(),
    area,
    matchedNeed: nonEmptyStringOrNull(item.matchedNeed),
    matchKind,
    reason: item.reason.trim(),
    availability,
    internalSlug: nonEmptyStringOrNull(item.internalSlug),
    directLinkAvailable: item.directLinkAvailable === true,
    url: nonEmptyStringOrNull(item.url),
    coverUrl: nonEmptyStringOrNull(item.coverUrl),
  };
}

/**
 * `materialRecommendations` do resultado. Defensivo: campo ausente (payload antigo), que não seja
 * array ou item estruturalmente inválido NUNCA derrubam o resultado principal (item inválido é
 * ignorado). A ordem é a de `position` (empate mantém a ordem recebida); não reordena por fonte
 * nem por disponibilidade.
 */
export function toMaterialRecommendations(payload: unknown): MaterialRecommendation[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .map((raw, index) => ({ item: toMaterialRecommendation(raw), index }))
    .filter((entry): entry is { item: MaterialRecommendation; index: number } => entry.item !== null)
    .sort((a, b) => a.item.position - b.item.position || a.index - b.index)
    .map((entry) => entry.item);
}

function toInterviewResult(payload: unknown): RealInterviewResult | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as Record<string, unknown>;
  const interview = toInterview(body.interview);
  const evaluation = body.evaluation as Record<string, unknown> | null | undefined;
  if (
    !interview ||
    !evaluation ||
    typeof evaluation !== "object" ||
    typeof evaluation.overallScore !== "number" ||
    !Number.isFinite(evaluation.overallScore) ||
    !Array.isArray(body.questions)
  ) {
    return null;
  }
  const criteriaScores: Record<string, number> = {};
  if (evaluation.criteriaScores && typeof evaluation.criteriaScores === "object") {
    for (const [key, value] of Object.entries(evaluation.criteriaScores as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) criteriaScores[key] = value;
    }
  }
  const questions = body.questions.map(toResultQuestion);
  if (questions.some((question) => question === null)) return null;
  return {
    interview,
    evaluation: {
      overallScore: evaluation.overallScore,
      criteriaScores,
      summary: typeof evaluation.summary === "string" ? evaluation.summary : "",
      completedAt: nullableString(evaluation.completedAt),
    },
    questions: (questions as RealResultQuestion[]).sort((a, b) => a.position - b.position),
    materialRecommendations: toMaterialRecommendations(body.materialRecommendations),
  };
}

function toHistoryItem(payload: unknown): RealHistoryItem | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  const status = STATUSES.find((candidate) => candidate === item.status);
  if (
    !isUuid(item.id) ||
    !status ||
    typeof item.title !== "string" ||
    typeof item.createdAt !== "string" ||
    typeof item.resultAvailable !== "boolean" ||
    typeof item.questionCount !== "number" ||
    !Number.isInteger(item.questionCount) ||
    item.questionCount < 0
  ) {
    return null;
  }
  if (item.overallScore !== null && item.overallScore !== undefined) {
    if (typeof item.overallScore !== "number" || !Number.isFinite(item.overallScore)) return null;
  }
  return {
    id: item.id,
    status,
    evaluationMode:
      item.evaluationMode === "AI" || item.evaluationMode === "HUMAN" ? item.evaluationMode : null,
    title: item.title,
    company: nullableString(item.company),
    location: nullableString(item.location),
    contractType: nullableString(item.contractType),
    workMode:
      item.workMode === "REMOTE" || item.workMode === "HYBRID" || item.workMode === "ONSITE"
        ? item.workMode
        : null,
    submittedAt: nullableString(item.submittedAt),
    createdAt: item.createdAt,
    updatedAt: nullableString(item.updatedAt),
    assignedAt: nullableString(item.assignedAt),
    completedAt: nullableString(item.completedAt),
    questionCount: item.questionCount,
    overallScore: typeof item.overallScore === "number" ? item.overallScore : null,
    resultAvailable: item.resultAvailable,
  };
}

function toInProgressInterview(payload: unknown): RealInProgressInterview | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  const count = (v: unknown) =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
  const questionCount = count(item.questionCount);
  const answeredQuestionCount = count(item.answeredQuestionCount);
  if (
    !isUuid(item.id) ||
    item.interviewStatus !== "IN_PROGRESS" ||
    typeof item.title !== "string" ||
    typeof item.createdAt !== "string" ||
    questionCount === null ||
    answeredQuestionCount === null
  ) {
    return null;
  }
  return {
    id: item.id,
    title: item.title,
    company: nullableString(item.company),
    evaluationMode:
      item.evaluationMode === "AI" || item.evaluationMode === "HUMAN" ? item.evaluationMode : null,
    interviewStatus: "IN_PROGRESS",
    createdAt: item.createdAt,
    questionCount,
    answeredQuestionCount,
    latestDraftUpdatedAt: nullableString(item.latestDraftUpdatedAt),
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

function messageFromBody(body: Record<string, unknown> | null): string | null {
  if (!body) return null;
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  if (Array.isArray(body.message)) {
    const messages = body.message.filter((m): m is string => typeof m === "string");
    if (messages.length) return messages.join(" ");
  }
  return null;
}

function toStatus(value: unknown): RealInterviewStatus | undefined {
  return typeof value === "string" && STATUSES.includes(value as RealInterviewStatus)
    ? (value as RealInterviewStatus)
    : undefined;
}

type Failure = {
  ok: false;
  reason: CandidateInterviewFailure;
  message: string;
  interviewStatus?: RealInterviewStatus;
  existingInterviewId?: string;
};

/** Falha a partir do status HTTP e do corpo JÁ lido (o corpo só pode ser lido uma vez). */
function failureFromBody(
  status: number,
  body: Record<string, unknown> | null,
  fallbackMessage: string,
): Failure {
  if (status === 401) {
    return {
      ok: false,
      reason: "unauthorized",
      message: "Sua sessão expirou. Entre novamente para continuar.",
    };
  }
  if (status === 403) {
    return {
      ok: false,
      reason: "forbidden",
      message: "Você não tem permissão para realizar esta ação.",
    };
  }
  // 400/404/409 trazem mensagem de negócio do Back (ex.: texto acima do limite).
  if (status === 400 || status === 404 || status === 409) {
    const message = sanitizeServerMessage(messageFromBody(body), { status, fallback: fallbackMessage, scope: "interviews" });
    if (status === 409 && body?.code === INTERVIEW_ALREADY_IN_PROGRESS_CODE) {
      return {
        ok: false,
        reason: "already_in_progress",
        message,
        ...(isUuid(body.interviewId) ? { existingInterviewId: body.interviewId } : {}),
      };
    }
    if (status === 409 && body?.code === INTERVIEW_RESULT_NOT_AVAILABLE_CODE) {
      const interviewStatus = toStatus(body.interviewStatus);
      return {
        ok: false,
        reason: "result_not_available",
        message,
        ...(interviewStatus ? { interviewStatus } : {}),
      };
    }
    if (status === 409 && body?.code === INTERVIEW_NOT_IN_PROGRESS_CODE) {
      const interviewStatus = toStatus(body.interviewStatus);
      return {
        ok: false,
        reason: "not_in_progress",
        message,
        ...(interviewStatus ? { interviewStatus } : {}),
      };
    }
    return {
      ok: false,
      reason: status === 400 ? "validation" : status === 404 ? "not_found" : "conflict",
      message,
    };
  }
  // 5xx/timeout/indisponível: texto do servidor nunca vai para a tela; o detalhe fica no console.
  return { ok: false, reason: "error", message: sanitizeServerMessage(null, { status, fallback: fallbackMessage, scope: "interviews" }) };
}

async function failureFromResponse(response: Response, fallbackMessage: string): Promise<Failure> {
  const needsBody =
    response.status === 400 || response.status === 404 || response.status === 409;
  return failureFromBody(
    response.status,
    needsBody ? await readJson(response) : null,
    fallbackMessage,
  );
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

/** Lista as entrevistas IN_PROGRESS do candidato logado (mais recente primeiro). */
export async function listInProgressInterviews(): Promise<
  CandidateInterviewResult<RealInProgressInterview[]>
> {
  const response = await request("/interviews/in-progress", { method: "GET" });
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(response, "Não foi possível carregar suas entrevistas em andamento.");
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return invalidResponse();
  }
  if (!Array.isArray(payload)) return invalidResponse();
  const items = payload.map(toInProgressInterview);
  if (items.some((i) => i === null)) return invalidResponse();
  return { ok: true, data: items as RealInProgressInterview[] };
}

/**
 * Histórico real do candidato (`GET /interviews`): UMA chamada, sem N+1 e sem `/result`.
 * Mantém a ordem do Back (createdAt DESC).
 */
export async function listRealInterviewHistory(): Promise<
  CandidateInterviewResult<RealInterviewHistory>
> {
  const response = await request("/interviews", { method: "GET" });
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(response, "Não foi possível carregar o histórico de entrevistas. Tente novamente.");
  }
  const body = await readJson(response);
  if (!body || !Array.isArray(body.interviews) || typeof body.total !== "number" || !Number.isFinite(body.total)) {
    return invalidResponse();
  }
  const items = body.interviews.map(toHistoryItem);
  if (items.some((item) => item === null)) return invalidResponse();
  return { ok: true, data: { total: body.total, interviews: items as RealHistoryItem[] } };
}

export const CANCEL_OFFLINE_MESSAGE =
  "Não foi possível cancelar a entrevista porque o servidor não respondeu. Verifique sua conexão e tente novamente. Nada foi alterado.";
export const CANCEL_GENERIC_ERROR_MESSAGE =
  "Não foi possível cancelar a entrevista. Tente novamente. Nada foi alterado.";

/**
 * CANCELA a entrevista no servidor (global: vale para todos os dispositivos).
 * Exige o servidor: sem rede devolve falha, nunca finge sucesso. Idempotente no
 * Back (cancelar uma já CANCELLED também é sucesso).
 */
export async function cancelRealInterview(
  interviewId: string,
): Promise<CandidateInterviewResult<RealInterview>> {
  const response = await request(`${idPath(interviewId)}/cancel`, { method: "POST" });
  if (!response) {
    return { ok: false, reason: "error", message: CANCEL_OFFLINE_MESSAGE };
  }
  if (!response.ok) {
    const failure = await failureFromResponse(response, CANCEL_GENERIC_ERROR_MESSAGE);
    // Falha de servidor no cancelamento mantém a garantia "Nada foi alterado" (sem copy genérica de status).
    return failure.reason === "error" ? { ...failure, message: CANCEL_GENERIC_ERROR_MESSAGE } : failure;
  }
  const interview = toInterview(await readJson(response));
  if (!interview || interview.status !== "CANCELLED") {
    return { ok: false, reason: "error", message: CANCEL_GENERIC_ERROR_MESSAGE };
  }
  return { ok: true, data: interview };
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

/**
 * Resultado real do candidato (`GET /interviews/:id/result`). 409
 * INTERVIEW_RESULT_NOT_AVAILABLE => `result_not_available`; 404 => `not_found`.
 */
export async function getRealInterviewResult(
  interviewId: string,
): Promise<CandidateInterviewResult<RealInterviewResult>> {
  const response = await request(`${idPath(interviewId)}/result`, { method: "GET" });
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(response, "Não foi possível carregar o resultado. Tente novamente.");
  }
  const result = toInterviewResult(await readJson(response));
  return result ? { ok: true, data: result } : invalidResponse();
}

function parseQuestionsState(
  body: Record<string, unknown> | null,
  options: { allowEmpty?: boolean } = {},
): CandidateInterviewResult<RealQuestionsState> {
  if (!body || !Array.isArray(body.questions)) return invalidResponse();
  const questions = body.questions.map(toQuestion);
  if ((questions.length === 0 && !options.allowEmpty) || questions.some((q) => q === null)) {
    return invalidResponse();
  }
  return {
    ok: true,
    data: {
      questions: (questions as RealInterviewQuestion[]).sort((a, b) => a.position - b.position),
      interviewStatus: toStatus(body.interviewStatus) ?? null,
    },
  };
}

function parseQuestions(
  body: Record<string, unknown> | null,
): CandidateInterviewResult<RealInterviewQuestion[]> {
  const parsed = parseQuestionsState(body);
  return parsed.ok ? { ok: true, data: parsed.data.questions } : parsed;
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
      "Não foi possível gerar as perguntas agora. Tente novamente em instantes.",
    );
  }
  return parseQuestions(await readJson(response));
}

/**
 * Lê as perguntas, as respostas JÁ persistidas e o status vigente da entrevista.
 * É a chamada usada para REVALIDAR a sessão (focus/visibilidade): se o status
 * deixou de ser IN_PROGRESS, o wizard bloqueia a edição.
 */
export async function getRealQuestionsState(
  interviewId: string,
): Promise<CandidateInterviewResult<RealQuestionsState>> {
  const response = await request(`${idPath(interviewId)}/questions`, { method: "GET" });
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível carregar as perguntas da entrevista. Tente novamente.",
    );
  }
  return parseQuestionsState(await readJson(response));
}

/**
 * Retomada pelo Dashboard: igual a `getRealQuestionsState`, mas aceita lista
 * VAZIA (entrevista criada cujas perguntas ainda não foram geradas — o wizard
 * volta a uma etapa anterior em vez de tratar como erro).
 */
export async function getRealQuestionsStateForResume(
  interviewId: string,
): Promise<CandidateInterviewResult<RealQuestionsState>> {
  const response = await request(`${idPath(interviewId)}/questions`, { method: "GET" });
  if (!response) return networkFailure();
  if (!response.ok) {
    return failureFromResponse(
      response,
      "Não foi possível carregar as perguntas da entrevista. Tente novamente.",
    );
  }
  return parseQuestionsState(await readJson(response), { allowEmpty: true });
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

/**
 * CONFIRMA a resposta OFICIAL (resposta em branco limpa a resposta no Back).
 * `draftVersion` é a versão do rascunho que este dispositivo conhece: o Back só
 * confirma se ela ainda for a vigente. Versão antiga => 409
 * DRAFT_VERSION_CONFLICT com o estado vigente em `conflict` (nada é sobrescrito).
 */
export async function saveRealAnswer(
  interviewId: string,
  questionId: string,
  answer: string,
  draftVersion: number,
): Promise<SaveAnswerResult> {
  const response = await request(
    `${idPath(interviewId)}/questions/${encodeURIComponent(questionId)}/answer`,
    { method: "PUT", body: { answer, draftVersion } },
  );
  if (!response) return networkFailure();
  if (!response.ok) {
    const needsBody =
      response.status === 400 || response.status === 404 || response.status === 409;
    const body = needsBody ? await readJson(response) : null;
    const fallback = "Não foi possível salvar sua resposta. Tente novamente.";
    if (response.status === 409 && body?.code === DRAFT_VERSION_CONFLICT_CODE) {
      const state = toDraftState(body);
      const message =
        sanitizeServerMessage(messageFromBody(body), { status: 409, fallback: "A resposta foi alterada em outro dispositivo." });
      return state
        ? {
            ok: false,
            reason: "conflict",
            message,
            conflict: { ...state, answer: nullableString(body.answer) },
          }
        : { ok: false, reason: "conflict", message };
    }
    return failureFromBody(response.status, body, fallback);
  }
  const question = toQuestion(await readJson(response));
  return question ? { ok: true, data: question } : invalidResponse();
}

function toDraftState(payload: unknown): RealAnswerDraft | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  if (
    typeof item.draftVersion !== "number" ||
    !Number.isInteger(item.draftVersion) ||
    item.draftVersion < 0
  ) {
    return null;
  }
  return {
    id: typeof item.id === "string" ? item.id : "",
    draftText: nullableString(item.draftText),
    draftUpdatedAt: nullableString(item.draftUpdatedAt),
    draftVersion: item.draftVersion,
  };
}

/**
 * Autosave do RASCUNHO de uma pergunta. NÃO é a confirmação: o Back não toca
 * na resposta oficial. `version` é a versão do rascunho que este dispositivo
 * conhece; se outro dispositivo salvou depois, o Back responde 409 com o
 * estado vigente (`conflict`) e nada é sobrescrito.
 */
export async function saveRealAnswerDraft(
  interviewId: string,
  questionId: string,
  draft: string,
  version: number,
): Promise<SaveDraftResult> {
  const response = await request(
    `${idPath(interviewId)}/questions/${encodeURIComponent(questionId)}/answer/draft`,
    { method: "PUT", body: { draft, version } },
  );
  if (!response) return networkFailure();

  if (!response.ok) {
    const needsBody =
      response.status === 400 || response.status === 404 || response.status === 409;
    const body = needsBody ? await readJson(response) : null;
    if (response.status === 409 && body?.code === DRAFT_VERSION_CONFLICT_CODE) {
      const conflict = toDraftState(body);
      const message =
        sanitizeServerMessage(messageFromBody(body), { status: 409, fallback: "O rascunho foi alterado em outro dispositivo." });
      return conflict
        ? { ok: false, reason: "conflict", message, conflict }
        : { ok: false, reason: "conflict", message };
    }
    return failureFromBody(
      response.status,
      body,
      "Não foi possível salvar o rascunho. Tente novamente.",
    );
  }
  const state = toDraftState(await readJson(response));
  return state ? { ok: true, data: state } : invalidResponse();
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
