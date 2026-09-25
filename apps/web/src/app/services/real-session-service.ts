import type {
  MockAccountStatus,
  MockAuthSession,
  MockAuthUser,
  MockUserRole,
} from "./auth-service";

/**
 * Login e sessão REAIS, para os três perfis (CANDIDATE, EVALUATOR, ADMIN) —
 * Fluxo 01 / Prompt 03.
 *
 * Reaproveita o MESMO formato de sessão do Auth mock (`MockAuthSession` /
 * `MockAuthUser`, importados aqui só como TIPO) para não precisar tocar nas
 * dezenas de telas que já leem `session.user.*`, `getCandidateIdentity()`,
 * etc. — só a ORIGEM dos dados muda: de localStorage/mock para a API real,
 * via cookies httpOnly (`access_token`/`refresh_token`), geridos
 * inteiramente pelo Back (`AuthController`/`AuthService`).
 *
 * Sem dual-write e sem fallback silencioso para o Auth mock: se a API
 * falhar, a sessão resultante é sempre "não autenticada".
 */

const API_BASE_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
    .env?.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

const UNAUTHENTICATED_SESSION: MockAuthSession = {
  version: 1,
  authenticated: false,
  user: null,
};

type ApiUserResponse = {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  role?: unknown;
  accountStatus?: unknown;
  onboardingCompleted?: unknown;
};

function isValidRole(value: unknown): value is MockUserRole {
  return value === "CANDIDATE" || value === "EVALUATOR" || value === "ADMIN";
}

function isValidAccountStatus(value: unknown): value is MockAccountStatus {
  return (
    value === "ACTIVE" ||
    value === "PENDING_VERIFICATION" ||
    value === "INVITED" ||
    value === "BLOCKED" ||
    value === "INACTIVE"
  );
}

// A API retorna `id` numérico (`user_id`); o restante do Front já trabalha
// com `MockAuthUser.id` como string (ids mock como "candidate-demo"), então
// convertemos aqui, uma única vez, na borda.
function toSessionUser(payload: unknown): MockAuthUser | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as ApiUserResponse;

  if (
    (typeof candidate.id !== "number" && typeof candidate.id !== "string") ||
    typeof candidate.name !== "string" ||
    typeof candidate.email !== "string" ||
    !isValidRole(candidate.role) ||
    !isValidAccountStatus(candidate.accountStatus) ||
    typeof candidate.onboardingCompleted !== "boolean"
  ) {
    return null;
  }

  return {
    id: String(candidate.id),
    name: candidate.name,
    email: candidate.email,
    role: candidate.role,
    accountStatus: candidate.accountStatus,
    onboardingCompleted: candidate.onboardingCompleted,
  };
}

async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: unknown };

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }

    if (Array.isArray(payload.message) && payload.message.length > 0) {
      return payload.message.map(String).join(" ");
    }
  } catch {
    // Mantém a mensagem padrão quando a API não retorna JSON.
  }

  return fallback;
}

type CurrentUserResult =
  | { status: "authenticated"; user: MockAuthUser }
  // Especificamente um 401 — o único caso em que faz sentido tentar
  // renovar o access token expirado via `/auth/refresh`.
  | { status: "unauthorized" }
  // Qualquer outra falha (erro de rede, 5xx, payload inválido/inesperado):
  // não é "token expirado", então NÃO deve disparar uma tentativa de
  // refresh — apenas tratamos a sessão como não restaurada.
  | { status: "error" };

async function fetchCurrentUser(): Promise<CurrentUserResult> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    return { status: "error" };
  }

  if (response.status === 401) {
    return { status: "unauthorized" };
  }

  if (!response.ok) {
    return { status: "error" };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: "error" };
  }

  const user = toSessionUser(payload);
  if (!user) {
    return { status: "error" };
  }

  return { status: "authenticated", user };
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

/**
 * Restaura a sessão a partir do cookie httpOnly já existente (chamada uma
 * vez, no boot do app). Tenta `/auth/me`; SOMENTE quando a resposta for
 * especificamente 401 (access token ausente/expirado/inválido) tenta
 * renovar via `/auth/refresh` e repete `/auth/me` uma única vez antes de
 * desistir. Erro de rede, 5xx ou payload inesperado NÃO disparam refresh —
 * só resultam em sessão não restaurada.
 */
export async function restoreRealSession(): Promise<MockAuthSession> {
  const result = await fetchCurrentUser();

  if (result.status === "authenticated") {
    return { version: 1, authenticated: true, user: result.user };
  }

  if (result.status !== "unauthorized") {
    return UNAUTHENTICATED_SESSION;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    return UNAUTHENTICATED_SESSION;
  }

  const retryResult = await fetchCurrentUser();
  if (retryResult.status === "authenticated") {
    return { version: 1, authenticated: true, user: retryResult.user };
  }

  return UNAUTHENTICATED_SESSION;
}

export type RealLoginResult =
  | { ok: true; session: MockAuthSession }
  | { ok: false; message: string };

/**
 * Login real via API. Atende os três perfis (CANDIDATE, EVALUATOR, ADMIN) —
 * sem restrição de domínio Gmail, que é regra exclusiva do cadastro. A
 * senha é enviada exatamente como digitada (sem trim).
 */
export async function loginRealWithCredentials(
  email: string,
  password: string,
): Promise<RealLoginResult> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return {
      ok: false,
      message:
        "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      message: await readErrorMessage(response, "E-mail ou senha inválidos."),
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      message: "Resposta inválida do servidor. Tente novamente.",
    };
  }

  const user = toSessionUser(payload);

  if (!user) {
    return {
      ok: false,
      message: "Resposta inválida do servidor. Tente novamente.",
    };
  }

  return { ok: true, session: { version: 1, authenticated: true, user } };
}

/**
 * Encerra a sessão real: chama `/auth/logout` (revoga o refresh token no
 * Back e limpa os cookies). Sempre devolve uma sessão não autenticada,
 * mesmo se a chamada de rede falhar — sem fallback para sessão mock.
 */
export async function logoutRealSession(): Promise<MockAuthSession> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Mesmo com falha de rede, a sessão local é tratada como encerrada.
  }

  return UNAUTHENTICATED_SESSION;
}

const ONBOARDING_ENDPOINT_BY_ROLE: Record<MockUserRole, string> = {
  CANDIDATE: "/auth/candidate/onboarding",
  EVALUATOR: "/auth/evaluator/onboarding",
  ADMIN: "/auth/admin/onboarding",
};

/**
 * Marca o onboarding do usuário autenticado como concluído, usando um dos
 * endpoints reais já existentes no Back (um por perfil). Necessário para
 * manter a sessão real coerente: sem persistir isso no Back,
 * `onboardingCompleted` voltaria a `false` a cada restauração de sessão
 * (`/auth/me`) via reload de página.
 */
export async function completeRealOnboarding(
  role: MockUserRole,
): Promise<MockAuthUser | null> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}${ONBOARDING_ENDPOINT_BY_ROLE[role]}`,
      {
        method: "PUT",
        credentials: "include",
      },
    );
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  try {
    return toSessionUser(await response.json());
  } catch {
    return null;
  }
}
