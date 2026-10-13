/**
 * Dashboard Admin REAL (Fase 4.3B).
 *
 * Lê `GET /admin/dashboard` (protegido por `@Roles('ADMIN')` no Back) reaproveitando o mesmo
 * helper de requisição/refresh de sessão das demais telas Admin (`requestAdminApi`: 401 →
 * `/auth/refresh` uma vez → repete). Não há fallback: se a API falhar, o resultado é um erro
 * explícito — nunca números fictícios. Nada é lido ou gravado em localStorage.
 */

import { FRIENDLY_ERROR_MESSAGES, sanitizeServerMessage } from "../domain/user-friendly-error";
import { requestAdminApi } from "./admin-interviews-service";

export type AdminDashboardActivityType =
  | "candidate_registered"
  | "interview_submitted"
  | "interview_assigned"
  | "evaluation_completed";

export type AdminDashboardActivity = {
  id: string;
  type: AdminDashboardActivityType;
  occurredAt: string;
  candidateName: string;
  jobTitle: string | null;
  evaluatorName: string | null;
  actorName: string | null;
  score: number | null;
};

export type AdminDashboard = {
  generatedAt: string;
  summary: {
    candidateCount: number;
    activeEvaluatorCount: number;
    pendingAssignmentCount: number;
    averageScore: number | null;
    averageScoreSample: number;
  };
  interviewsByMonth: Array<{ month: string; total: number }>;
  recentActivity: AdminDashboardActivity[];
};

export type AdminDashboardFailure = "unauthorized" | "forbidden" | "error";

export type AdminDashboardResult =
  | { ok: true; data: AdminDashboard }
  | { ok: false; reason: AdminDashboardFailure; message: string };

const NETWORK_ERROR_MESSAGE = FRIENDLY_ERROR_MESSAGES.network;
const INVALID_RESPONSE_MESSAGE = FRIENDLY_ERROR_MESSAGES.generic;
const LOAD_FALLBACK_MESSAGE = "Não foi possível carregar o dashboard. Tente novamente.";

const ACTIVITY_TYPES: ReadonlyArray<AdminDashboardActivityType> = [
  "candidate_registered",
  "interview_submitted",
  "interview_assigned",
  "evaluation_completed",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function nullableText(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? (value.trim() ? value : null) : undefined;
}

function toActivity(payload: unknown): AdminDashboardActivity | null {
  if (!isRecord(payload)) return null;
  const id = text(payload.id);
  const occurredAt = text(payload.occurredAt);
  const candidateName = text(payload.candidateName);
  const type = ACTIVITY_TYPES.find((item) => item === payload.type);
  const jobTitle = nullableText(payload.jobTitle);
  const evaluatorName = nullableText(payload.evaluatorName);
  const actorName = nullableText(payload.actorName);
  const score =
    payload.score === null || payload.score === undefined
      ? null
      : typeof payload.score === "number" && Number.isFinite(payload.score)
        ? payload.score
        : undefined;
  if (!id || !occurredAt || !candidateName || !type) return null;
  if (jobTitle === undefined || evaluatorName === undefined || actorName === undefined || score === undefined) return null;
  return { id, type, occurredAt, candidateName, jobTitle, evaluatorName, actorName, score };
}

export function parseAdminDashboard(payload: unknown): AdminDashboard | null {
  if (!isRecord(payload) || !isRecord(payload.summary)) return null;
  const generatedAt = text(payload.generatedAt);
  const candidateCount = count(payload.summary.candidateCount);
  const activeEvaluatorCount = count(payload.summary.activeEvaluatorCount);
  const pendingAssignmentCount = count(payload.summary.pendingAssignmentCount);
  const averageScoreSample = count(payload.summary.averageScoreSample);
  const rawAverage = payload.summary.averageScore;
  const averageScore =
    rawAverage === null ? null : typeof rawAverage === "number" && Number.isFinite(rawAverage) ? rawAverage : undefined;
  if (
    !generatedAt ||
    candidateCount === null ||
    activeEvaluatorCount === null ||
    pendingAssignmentCount === null ||
    averageScoreSample === null ||
    averageScore === undefined
  ) {
    return null;
  }
  if (!Array.isArray(payload.interviewsByMonth) || !Array.isArray(payload.recentActivity)) return null;

  const interviewsByMonth: AdminDashboard["interviewsByMonth"] = [];
  for (const item of payload.interviewsByMonth) {
    if (!isRecord(item)) return null;
    const month = text(item.month);
    const total = count(item.total);
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || total === null) return null;
    interviewsByMonth.push({ month, total });
  }

  const recentActivity: AdminDashboardActivity[] = [];
  for (const item of payload.recentActivity) {
    const activity = toActivity(item);
    if (!activity) return null;
    recentActivity.push(activity);
  }

  return {
    generatedAt,
    summary: { candidateCount, activeEvaluatorCount, pendingAssignmentCount, averageScore, averageScoreSample },
    interviewsByMonth,
    recentActivity,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getAdminDashboard(): Promise<AdminDashboardResult> {
  const response = await requestAdminApi("/admin/dashboard", { method: "GET" });
  if (!response) return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };

  if (response.status === 401) {
    return { ok: false, reason: "unauthorized", message: "Sua sessão expirou. Entre novamente para continuar." };
  }
  if (response.status === 403) {
    return { ok: false, reason: "forbidden", message: "Você não tem permissão para ver o dashboard administrativo." };
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: "error",
      message: sanitizeServerMessage(null, { status: response.status, fallback: LOAD_FALLBACK_MESSAGE, scope: "admin-dashboard" }),
    };
  }

  const data = parseAdminDashboard(await readJson(response));
  if (!data) return { ok: false, reason: "error", message: INVALID_RESPONSE_MESSAGE };
  return { ok: true, data };
}
