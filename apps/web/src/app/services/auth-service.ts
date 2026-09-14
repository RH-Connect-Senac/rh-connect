export type MockUserRole = "CANDIDATE" | "EVALUATOR" | "ADMIN";

export type MockAccountStatus = "ACTIVE" | "INVITED" | "BLOCKED" | "INACTIVE";

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

export const AUTH_STORAGE_KEY = "rhconnect:auth-session:v1";
export const REMEMBERED_EMAIL_STORAGE_KEY = "rhconnect:auth-remembered-email:v1";
const AUTH_CANDIDATES_STORAGE_KEY = "rhconnect:auth-candidates:v1";
const MOCK_PASSWORD = "RhConnect@2026";

const EMPTY_SESSION: MockAuthSession = {
  version: 1,
  authenticated: false,
  user: null,
};

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

function toPublicUser(user: MockLoginUser): MockAuthUser {
  const { password: _password, ...publicUser } = user;
  return publicUser;
}

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

const MOCK_USERS: Record<MockUserRole, MockAuthUser> = {
  CANDIDATE: toPublicUser(MOCK_LOGIN_USERS.find((user) => user.id === "candidate-demo")!),
  EVALUATOR: toPublicUser(MOCK_LOGIN_USERS.find((user) => user.id === "evaluator-demo")!),
  ADMIN: toPublicUser(MOCK_LOGIN_USERS.find((user) => user.id === "admin-demo")!),
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isValidRole(value: unknown): value is MockUserRole {
  return value === "CANDIDATE" || value === "EVALUATOR" || value === "ADMIN";
}

function isValidAccountStatus(value: unknown): value is MockAccountStatus {
  return value === "ACTIVE" || value === "INVITED" || value === "BLOCKED" || value === "INACTIVE";
}

function normalizeSession(value: unknown): MockAuthSession | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<MockAuthSession>;
  if (candidate.version !== 1 || typeof candidate.authenticated !== "boolean") return null;
  if (!candidate.authenticated) return EMPTY_SESSION;
  const user = candidate.user as Partial<MockAuthUser> | null | undefined;
  if (!user || typeof user.id !== "string" || typeof user.name !== "string" || typeof user.email !== "string") return null;
  if (!isValidRole(user.role) || !isValidAccountStatus(user.accountStatus)) return null;
  if (typeof user.onboardingCompleted !== "boolean") return null;
  return {
    version: 1,
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      onboardingCompleted: user.onboardingCompleted,
    },
  };
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

function saveRegisteredCandidateAccount(candidate: MockCandidateAccount) {
  if (!canUseStorage()) return;
  const stored = getStoredCandidateAccounts();
  const next = [candidate, ...stored.filter((item) => item.id !== candidate.id && item.email.toLowerCase() !== candidate.email.toLowerCase())];
  window.localStorage.setItem(AUTH_CANDIDATES_STORAGE_KEY, JSON.stringify(next));
}

function createDynamicCandidateId(email: string) {
  return `candidate-${email.replace(/@.*$/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || Date.now()}`;
}

function findStoredCandidateByEmail(email: string) {
  return getStoredCandidateAccounts().find((candidate) => candidate.email.toLowerCase() === email) ?? null;
}

export function getMockCandidateAccounts(): MockCandidateAccount[] {
  const seeded = MOCK_LOGIN_USERS
    .map((user) => toCandidateAccount(user))
    .filter(Boolean) as MockCandidateAccount[];
  const merged = new Map<string, MockCandidateAccount>();
  seeded.forEach((candidate) => merged.set(candidate.id, candidate));
  getStoredCandidateAccounts().forEach((candidate) => merged.set(candidate.id, candidate));
  return Array.from(merged.values());
}

function findMockLoginUserByEmail(email: string): MockLoginUser | null {
  const seeded = MOCK_LOGIN_USERS.find((candidate) => candidate.email.toLowerCase() === email);
  if (seeded) return seeded;

  const stored = findStoredCandidateByEmail(email);
  if (!stored) return null;

  return {
    id: stored.id,
    name: stored.name,
    email: stored.email,
    password: stored.password,
    role: "CANDIDATE",
    accountStatus: stored.accountStatus,
    onboardingCompleted: stored.onboardingCompleted,
  };
}

export function isMockEmailRegistered(email: string) {
  return Boolean(findMockLoginUserByEmail(email.trim().toLowerCase()));
}

export function getMockAuthSession(): MockAuthSession {
  if (!canUseStorage()) return EMPTY_SESSION;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return EMPTY_SESSION;
  try {
    const normalized = normalizeSession(JSON.parse(raw));
    if (normalized) return normalized;
  } catch {
    // Invalid persisted mock auth is reset without touching other local stores.
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  return EMPTY_SESSION;
}

export function saveMockAuthSession(session: MockAuthSession): MockAuthSession {
  if (canUseStorage()) {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }
  return session;
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

export function loginMockUser(role: MockUserRole = "CANDIDATE", overrides: Partial<MockAuthUser> = {}) {
  const baseUser = MOCK_USERS[role];
  return saveMockAuthSession({
    version: 1,
    authenticated: true,
    user: {
      ...baseUser,
      ...overrides,
      role,
    },
  });
}

export function loginMockWithCredentials(email: string, password: string): { ok: true; session: MockAuthSession } | { ok: false; message: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const user = findMockLoginUserByEmail(normalizedEmail);

  if (!user) {
    return { ok: false, message: "E-mail ou senha inválidos." };
  }

  if (user.accountStatus === "INVITED") {
    return { ok: false, message: "Conta convidada. Ative seu acesso pelo link de convite antes de fazer login." };
  }

  if (user.accountStatus !== "ACTIVE") {
    return { ok: false, message: "Conta indisponível para login. Entre em contato com o suporte do RH Connect." };
  }

  if (!user.password || user.password !== password) {
    return { ok: false, message: "E-mail ou senha inválidos." };
  }

  return {
    ok: true,
    session: saveMockAuthSession({
      version: 1,
      authenticated: true,
      user: toPublicUser(user),
    }),
  };
}

export function registerMockCandidate(data?: { name?: string; email?: string; password?: string }): { ok: true; candidate: MockCandidateAccount } | { ok: false; message: string } {
  const email = data?.email?.trim().toLowerCase() || "candidato2.rhconnect@gmail.com";
  if (isMockEmailRegistered(email)) {
    return { ok: false, message: "Este e-mail já está cadastrado. Use o login para acessar sua conta." };
  }

  const candidate = {
    id: createDynamicCandidateId(email),
    name: data?.name?.trim() || "Novo candidato",
    email,
    password: data?.password || MOCK_PASSWORD,
    accountStatus: "ACTIVE" as const,
    onboardingCompleted: false,
    createdAt: new Date().toISOString(),
  };
  saveRegisteredCandidateAccount(candidate);
  return { ok: true, candidate };
}

export function completeMockOnboarding() {
  const session = getMockAuthSession();
  if (!session.authenticated || !session.user) return session;
  if (session.user.role === "CANDIDATE") {
    const storedCandidate = getStoredCandidateAccounts().find((candidate) => candidate.id === session.user?.id);
    saveRegisteredCandidateAccount({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      accountStatus: session.user.accountStatus,
      onboardingCompleted: true,
      createdAt: storedCandidate?.createdAt,
      password: storedCandidate?.password,
    });
  }
  return saveMockAuthSession({
    ...session,
    user: {
      ...session.user,
      onboardingCompleted: true,
    },
  });
}

export function logoutMockUser() {
  if (canUseStorage()) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  return EMPTY_SESSION;
}
