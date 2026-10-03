export type MockUserRole = "CANDIDATE" | "EVALUATOR" | "ADMIN";

// Espelha o enum `account_status` do Back (schema.prisma). `PENDING_VERIFICATION`
// é reconhecido aqui só como contrato — nenhuma tela/fluxo de verificação de
// e-mail foi implementada; contas reais nunca recebem esse status hoje.
export type MockAccountStatus =
  | "ACTIVE"
  | "PENDING_VERIFICATION"
  | "INVITED"
  | "BLOCKED"
  | "INACTIVE";

export type MockAuthUser = {
  id: string;
  name: string;
  email: string;
  role: MockUserRole;
  accountStatus: MockAccountStatus;
  onboardingCompleted: boolean;
};

export type MockAuthSession = {
  version: 1;
  authenticated: boolean;
  user: MockAuthUser | null;
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
