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

export const AUTH_STORAGE_KEY = "rhconnect:auth-session:v1";

const EMPTY_SESSION: MockAuthSession = {
  version: 1,
  authenticated: false,
  user: null,
};

const MOCK_USERS: Record<MockUserRole, MockAuthUser> = {
  CANDIDATE: {
    id: "candidate-demo",
    name: "Joao da Silva",
    email: "candidato.rhconnect@gmail.com",
    role: "CANDIDATE",
    accountStatus: "ACTIVE",
    onboardingCompleted: true,
  },
  EVALUATOR: {
    id: "evaluator-demo",
    name: "Carlos Andrade",
    email: "avaliador.ativo.rhconnect@gmail.com",
    role: "EVALUATOR",
    accountStatus: "ACTIVE",
    onboardingCompleted: true,
  },
  ADMIN: {
    id: "admin-demo",
    name: "Ana Martins",
    email: "admin.rhconnect@gmail.com",
    role: "ADMIN",
    accountStatus: "ACTIVE",
    onboardingCompleted: true,
  },
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

export function registerMockCandidate() {
  return loginMockUser("CANDIDATE", {
    id: "candidate-new-demo",
    name: "Novo candidato",
    email: "novo.candidato@gmail.com",
    onboardingCompleted: false,
  });
}

export function completeMockOnboarding() {
  const session = getMockAuthSession();
  if (!session.authenticated || !session.user) return session;
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
