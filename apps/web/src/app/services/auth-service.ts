import { api, getApiErrorMessage } from "../lib/api";

export type UserRole = "CANDIDATE" | "EVALUATOR" | "ADMIN";

export type AccountStatus = "PENDING_VERIFICATION" | "INVITED" | "ACTIVE" | "BLOCKED" | "INACTIVE";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  onboardingCompleted: boolean;
};

export type AuthSession = {
  authenticated: boolean;
  user: AuthUser | null;
};

export type AuthResult =
  | { ok: true; session: AuthSession }
  | { ok: false; message: string };

export type RegisterResult =
  | { ok: true; user: AuthUser }
  | { ok: false; message: string };

const EMPTY_SESSION: AuthSession = {
  authenticated: false,
  user: null,
};

export const REMEMBERED_EMAIL_STORAGE_KEY = "rhconnect:auth-remembered-email:v1";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getRememberedLoginEmail() {
  if (!canUseStorage()) return "";
  return window.localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY) ?? "";
}

export function saveRememberedLoginEmail(email: string) {
  if (canUseStorage()) {
    window.localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, email.trim().toLowerCase());
  }
}

export function clearRememberedLoginEmail() {
  if (canUseStorage()) {
    window.localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
  }
}

function isValidRole(value: unknown): value is UserRole {
  return value === "CANDIDATE" || value === "EVALUATOR" || value === "ADMIN";
}

function isValidAccountStatus(value: unknown): value is AccountStatus {
  return value === "PENDING_VERIFICATION" || value === "INVITED" || value === "ACTIVE" || value === "BLOCKED" || value === "INACTIVE";
}

function normalizeUser(value: unknown): AuthUser {
  const candidate = value as Partial<AuthUser>;
  return {
    id: typeof candidate.id === "string" || typeof candidate.id === "number" ? String(candidate.id) : "",
    name: typeof candidate.name === "string" ? candidate.name : "",
    email: typeof candidate.email === "string" ? candidate.email : "",
    role: isValidRole(candidate.role) ? candidate.role : "CANDIDATE",
    accountStatus: isValidAccountStatus(candidate.accountStatus) ? candidate.accountStatus : "ACTIVE",
    onboardingCompleted: candidate.onboardingCompleted === true,
  };
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<unknown>("/auth/me");
    return normalizeUser(data);
  } catch {
    return null;
  }
}

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<AuthResult> {
  try {
    const { data } = await api.post<unknown>("/auth/login", {
      email: email.trim().toLowerCase(),
      password,
    });
    return {
      ok: true,
      session: { authenticated: true, user: normalizeUser(data) },
    };
  } catch (error) {
    return {
      ok: false,
      message: getApiErrorMessage(error, "E-mail ou senha inválidos."),
    };
  }
}

export async function registerCandidate(data: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisterResult> {
  try {
    const response = await api.post<unknown>("/auth/register", {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
    });
    return { ok: true, user: normalizeUser(response.data) };
  } catch (error) {
    return {
      ok: false,
      message: getApiErrorMessage(error, "Não foi possível criar a conta."),
    };
  }
}

export async function activateEvaluatorAccount(
  token: string,
  password: string,
): Promise<{ ok: true; user: AuthUser } | { ok: false; message: string }> {
  try {
    const { data } = await api.post<unknown>("/auth/evaluator/activate", {
      token,
      password,
    });
    return { ok: true, user: normalizeUser(data) };
  } catch (error) {
    return {
      ok: false,
      message: getApiErrorMessage(error, "Não foi possível ativar a conta."),
    };
  }
}

export async function completeOnboarding(role: UserRole): Promise<AuthUser> {
  const { data } = await api.put<unknown>(`/auth/${role.toLowerCase()}/onboarding`);
  return normalizeUser(data);
}

export async function logoutUser(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } catch {
    // A sessão local é limpa pelo chamador de qualquer forma.
  }
}