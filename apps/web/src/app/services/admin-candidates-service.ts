/**
 * Candidatos REAIS para o Admin (Etapa 2 da limpeza de mocks de candidato).
 *
 * Lê os endpoints `GET /admin/candidates` e `GET /admin/candidates/:id` da API
 * (protegidos por `@Roles('ADMIN')` no Back). Não existe fallback: se a API
 * falhar, o resultado é um erro explícito — nunca uma lista fictícia.
 *
 * Nenhum dado é lido ou gravado em localStorage.
 */

import type { MockAccountStatus } from "./auth-service";

const API_BASE_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
    .env?.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export type AdminCandidateProfileSummary = {
  professionalTitle: string | null;
  city: string | null;
  state: string | null;
};

export type AdminCandidate = {
  // `user_id` do Back convertido para string, igual a `session.user.id` —
  // é a mesma chave usada como `candidateId` nas entrevistas.
  id: string;
  name: string;
  email: string;
  accountStatus: MockAccountStatus;
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: AdminCandidateProfileSummary | null;
};

export type AdminCandidatesList = {
  total: number;
  candidates: AdminCandidate[];
};

export type AdminCandidatesFailure =
  | "not_found"
  | "forbidden"
  | "unauthorized"
  | "error";

export type AdminCandidatesResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: AdminCandidatesFailure; message: string };

const ACCOUNT_STATUSES: MockAccountStatus[] = [
  "ACTIVE",
  "PENDING_VERIFICATION",
  "INVITED",
  "BLOCKED",
  "INACTIVE",
];

function isAccountStatus(value: unknown): value is MockAccountStatus {
  return (
    typeof value === "string" &&
    (ACCOUNT_STATUSES as string[]).includes(value)
  );
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toAdminCandidate(payload: unknown): AdminCandidate | null {
  if (!payload || typeof payload !== "object") return null;

  const item = payload as Record<string, unknown>;

  if (
    (typeof item.id !== "number" && typeof item.id !== "string") ||
    typeof item.name !== "string" ||
    typeof item.email !== "string" ||
    !isAccountStatus(item.accountStatus) ||
    typeof item.onboardingCompleted !== "boolean" ||
    typeof item.createdAt !== "string" ||
    typeof item.updatedAt !== "string"
  ) {
    return null;
  }

  const rawProfile =
    item.profile && typeof item.profile === "object"
      ? (item.profile as Record<string, unknown>)
      : null;

  return {
    id: String(item.id),
    name: item.name,
    email: item.email,
    accountStatus: item.accountStatus,
    onboardingCompleted: item.onboardingCompleted,
    onboardingCompletedAt: nullableString(item.onboardingCompletedAt),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    profile: rawProfile
      ? {
          professionalTitle: nullableString(rawProfile.professionalTitle),
          city: nullableString(rawProfile.city),
          state: nullableString(rawProfile.state),
        }
      : null,
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
// `/auth/refresh` (mesmo fluxo de `real-session-service.ts`) e repete.
async function requestAdminApi(path: string): Promise<Response | null> {
  const doFetch = () =>
    fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      credentials: "include",
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

const NETWORK_ERROR_MESSAGE =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.";

function failureFromStatus(
  status: number,
  fallbackMessage: string,
): { ok: false; reason: AdminCandidatesFailure; message: string } {
  if (status === 404) {
    return {
      ok: false,
      reason: "not_found",
      message: "Candidato não encontrado.",
    };
  }

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
      message: "Você não tem permissão para ver os candidatos.",
    };
  }

  return { ok: false, reason: "error", message: fallbackMessage };
}

export async function listAdminCandidates(): Promise<
  AdminCandidatesResult<AdminCandidatesList>
> {
  const response = await requestAdminApi("/admin/candidates");

  if (!response) {
    return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
  }

  if (!response.ok) {
    return failureFromStatus(
      response.status,
      "Não foi possível carregar os candidatos. Tente novamente.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const body =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;

  if (!body || !Array.isArray(body.candidates)) {
    return {
      ok: false,
      reason: "error",
      message: "Resposta inválida do servidor. Tente novamente.",
    };
  }

  const candidates = body.candidates.map(toAdminCandidate);

  if (candidates.some((candidate) => candidate === null)) {
    return {
      ok: false,
      reason: "error",
      message: "Resposta inválida do servidor. Tente novamente.",
    };
  }

  return {
    ok: true,
    data: {
      total:
        typeof body.total === "number" ? body.total : candidates.length,
      candidates: candidates as AdminCandidate[],
    },
  };
}

export async function getAdminCandidate(
  id: string,
): Promise<AdminCandidatesResult<AdminCandidate>> {
  // O Back só aceita ids inteiros positivos; qualquer outra coisa na URL é
  // "não encontrado" sem nem chamar a API.
  if (!/^\d+$/.test(id)) {
    return failureFromStatus(404, "");
  }

  const response = await requestAdminApi(
    `/admin/candidates/${encodeURIComponent(id)}`,
  );

  if (!response) {
    return { ok: false, reason: "error", message: NETWORK_ERROR_MESSAGE };
  }

  if (!response.ok) {
    return failureFromStatus(
      response.status,
      "Não foi possível carregar o candidato. Tente novamente.",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const candidate = toAdminCandidate(payload);

  if (!candidate) {
    return {
      ok: false,
      reason: "error",
      message: "Resposta inválida do servidor. Tente novamente.",
    };
  }

  return { ok: true, data: candidate };
}
