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

type MockLoginUser = MockAuthUser & {
  password?: string;
};

export type MockCandidateAccount = Pick<MockAuthUser, "id" | "name" | "email" | "accountStatus" | "onboardingCompleted"> & {
  createdAt?: string;
  password?: string;
};

export const REMEMBERED_EMAIL_STORAGE_KEY = "rhconnect:auth-remembered-email:v1";
const AUTH_CANDIDATES_STORAGE_KEY = "rhconnect:auth-candidates:v1";
const MOCK_PASSWORD = "RhConnect@2026";

// Prompt 10 — Parte da limpeza do Auth mock: os dados abaixo (MOCK_LOGIN_USERS)
// e as funções que dependem deles NÃO são mais usados para autenticação real
// (login/sessão/registro/logout/onboarding já são 100% reais desde os
// Prompts 02–03). O que resta aqui é usado apenas como dado de NEGÓCIO/DEMO
// para telas que ainda apresentam candidatos de exemplo (ex.: listagem do
// Admin em admin-screens.tsx, via `getMockCandidateAccounts`) — por isso
// foi mantido. As funções de autenticação mock propriamente ditas
// (loginMockUser, loginMockWithCredentials, registerMockCandidate,
// completeMockOnboarding, logoutMockUser, getMockAuthSession,
// saveMockAuthSession, isMockEmailRegistered) e os helpers exclusivos delas
// foram removidos por não terem mais nenhum consumidor real.
const MOCK_LOGIN_USERS: MockLoginUser[] = [
  {
    id: "admin-demo",
    name: "Admin RH Connect",
    email: "admin.rhconnect@gmail.com",
    password: MOCK_PASSWORD,
    role: "ADMIN",
    accountStatus: "ACTIVE",
    onboardingCompleted: true,
  },
  {
    id: "candidate-demo",
    name: "João Lima",
    email: "candidato1.rhconnect@gmail.com",
    password: MOCK_PASSWORD,
    role: "CANDIDATE",
    accountStatus: "ACTIVE",
    onboardingCompleted: true,
  },
  {
    id: "candidate-new-demo",
    name: "Novo candidato",
    email: "candidato2.rhconnect@gmail.com",
    password: MOCK_PASSWORD,
    role: "CANDIDATE",
    accountStatus: "ACTIVE",
    onboardingCompleted: false,
  },
  {
    id: "evaluator-demo",
    name: "Carlos Andrade",
    email: "carlos.andrade@gmail.com",
    password: MOCK_PASSWORD,
    role: "EVALUATOR",
    accountStatus: "ACTIVE",
    onboardingCompleted: true,
  },
  {
    id: "evaluator-invited-demo",
    name: "Patricia Gomes",
    email: "patricia.gomes@gmail.com",
    role: "EVALUATOR",
    accountStatus: "INVITED",
    onboardingCompleted: false,
  },
];

function toCandidateAccount(user: MockLoginUser | MockAuthUser, createdAt?: string): MockCandidateAccount | null {
  if (user.role !== "CANDIDATE") return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    accountStatus: user.accountStatus,
    onboardingCompleted: user.onboardingCompleted,
    createdAt,
    password: "password" in user && typeof user.password === "string" ? user.password : undefined,
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isValidAccountStatus(value: unknown): value is MockAccountStatus {
  return value === "ACTIVE" || value === "INVITED" || value === "BLOCKED" || value === "INACTIVE";
}

function normalizeCandidateAccount(value: unknown): MockCandidateAccount | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<MockCandidateAccount>;
  if (typeof candidate.id !== "string" || typeof candidate.name !== "string" || typeof candidate.email !== "string") return null;
  if (!isValidAccountStatus(candidate.accountStatus)) return null;
  if (typeof candidate.onboardingCompleted !== "boolean") return null;
  if (candidate.createdAt !== undefined && typeof candidate.createdAt !== "string") return null;
  if (candidate.password !== undefined && typeof candidate.password !== "string") return null;
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    accountStatus: candidate.accountStatus,
    onboardingCompleted: candidate.onboardingCompleted,
    createdAt: candidate.createdAt,
    password: candidate.password,
  };
}

function getStoredCandidateAccounts(): MockCandidateAccount[] {
  if (!canUseStorage()) return [];
  const raw = window.localStorage.getItem(AUTH_CANDIDATES_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeCandidateAccount).filter(Boolean) as MockCandidateAccount[];
  } catch {
    window.localStorage.removeItem(AUTH_CANDIDATES_STORAGE_KEY);
    return [];
  }
}

// Usado hoje só como dado de NEGÓCIO/DEMO (Admin — `admin-screens.tsx`).
// `getStoredCandidateAccounts()` continua sendo lido para não perder
// candidatos que já tenham sido gravados aqui no passado pelo antigo fluxo
// de cadastro mock (removido neste prompt); nada volta a escrever nessa
// chave a partir de agora, já que o cadastro real (Prompt 02) nunca
// alimentou este storage.
export function getMockCandidateAccounts(): MockCandidateAccount[] {
  const seeded = MOCK_LOGIN_USERS
    .map((user) => toCandidateAccount(user))
    .filter(Boolean) as MockCandidateAccount[];
  const merged = new Map<string, MockCandidateAccount>();
  seeded.forEach((candidate) => merged.set(candidate.id, candidate));
  getStoredCandidateAccounts().forEach((candidate) => merged.set(candidate.id, candidate));
  return Array.from(merged.values());
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
