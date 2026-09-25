import {
  CANDIDATE_PROFILE_STORAGE_KEY,
  CANDIDATE_PROFILE_VERSION,
  type CandidateCourse,
  type CandidateExperience,
  type CandidateFormation,
  type CandidateProfile,
  type CandidateProfilePatch,
  type CandidateProfilesStorage,
} from "../domain/candidate-profile";
import { DEFAULT_CANDIDATE } from "../mocks/interviews";
import type { MockAuthUser } from "./auth-service";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function createEmptyCandidateProfile(candidateId: string): CandidateProfile {
  return {
    version: CANDIDATE_PROFILE_VERSION,
    candidateId,
    professionalSummary: "",
    areaId: "",
    subareaId: "",
    desiredRole: "",
    seniority: "",
    contractType: "",
    formations: [],
    courses: [],
    experiences: [],
    technicalSkills: [],
    behavioralSkills: [],
    updatedAt: nowIso(),
  };
}

function createDemoCandidateProfile(): CandidateProfile {
  return {
    ...createEmptyCandidateProfile(DEFAULT_CANDIDATE.id),
    professionalSummary: "Profissional em busca da primeira oportunidade na área de Tecnologia da Informação.",
    areaId: "information-technology",
    subareaId: "frontend-development",
    desiredRole: "Desenvolvedor Front-end",
    seniority: "Júnior",
    contractType: "CLT",
    formations: [
      {
        id: "demo-formation-ads",
        title: "Análise e Desenvolvimento de Sistemas",
        institution: "SENAC-DF",
        level: "Tecnólogo",
        status: "Em andamento",
        startDate: "2025",
        endDate: "2026",
        period: "2025 – 2026",
      },
    ],
    courses: [],
    experiences: [],
    technicalSkills: ["JavaScript", "React", "Git", "Testes", "SQL", "Comunicação técnica"],
    behavioralSkills: ["Comunicação", "Trabalho em equipe", "Criatividade", "Proatividade"],
    updatedAt: nowIso(),
  };
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function hasAnyText(values: string[]) {
  return values.some((value) => value.trim().length > 0);
}

function normalizeFormation(value: unknown): CandidateFormation | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<CandidateFormation>;
  if (typeof item.id !== "string") return null;

  const startDate = normalizeString(item.startDate);
  const endDate = normalizeString(item.endDate);
  const period = normalizeString(item.period);

  return {
    id: item.id,
    title: normalizeString(item.title),
    institution: normalizeString(item.institution),
    level: normalizeString(item.level),
    status: normalizeString(item.status),
    startDate: startDate || period,
    endDate,
    period,
  };
}

function normalizeCourse(value: unknown): CandidateCourse | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<CandidateCourse>;
  if (typeof item.id !== "string") return null;

  return {
    id: item.id,
    name: normalizeString(item.name),
    institution: normalizeString(item.institution),
    workload: normalizeString(item.workload),
    completedAt: normalizeString(item.completedAt),
  };
}

function normalizeExperience(value: unknown): CandidateExperience | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<CandidateExperience>;
  if (typeof item.id !== "string") return null;

  return {
    id: item.id,
    company: normalizeString(item.company),
    role: normalizeString(item.role),
    startDate: normalizeString(item.startDate),
    endDate: normalizeString(item.endDate),
    current: item.current === true,
    description: normalizeString(item.description),
  };
}

function normalizeProfile(value: unknown): CandidateProfile | null {
  if (!value || typeof value !== "object") return null;
  const profile = value as Partial<CandidateProfile>;
  if (typeof profile.candidateId !== "string") return null;

  return {
    version: CANDIDATE_PROFILE_VERSION,
    candidateId: profile.candidateId,
    professionalSummary: normalizeString(profile.professionalSummary),
    areaId: normalizeString(profile.areaId),
    subareaId: normalizeString(profile.subareaId),
    desiredRole: normalizeString(profile.desiredRole),
    seniority: normalizeString(profile.seniority),
    contractType: normalizeString(profile.contractType),
    formations: Array.isArray(profile.formations)
      ? profile.formations.map(normalizeFormation).filter((item): item is CandidateFormation => item !== null)
      : [],
    courses: Array.isArray(profile.courses)
      ? profile.courses.map(normalizeCourse).filter((item): item is CandidateCourse => item !== null)
      : [],
    experiences: Array.isArray(profile.experiences)
      ? profile.experiences.map(normalizeExperience).filter((item): item is CandidateExperience => item !== null)
      : [],
    technicalSkills: normalizeStringArray(profile.technicalSkills),
    behavioralSkills: normalizeStringArray(profile.behavioralSkills),
    updatedAt: normalizeString(profile.updatedAt) || nowIso(),
  };
}

function normalizeStorage(value: unknown): CandidateProfilesStorage | null {
  if (!value || typeof value !== "object") return null;
  const storage = value as Partial<CandidateProfilesStorage>;
  if (storage.version !== CANDIDATE_PROFILE_VERSION || !Array.isArray(storage.profiles)) return null;

  const byCandidateId = new Map<string, CandidateProfile>();
  for (const rawProfile of storage.profiles) {
    const profile = normalizeProfile(rawProfile);
    if (profile) byCandidateId.set(profile.candidateId, profile);
  }

  return {
    version: CANDIDATE_PROFILE_VERSION,
    profiles: Array.from(byCandidateId.values()),
  };
}

function cleanStringArray(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value) return false;
      const key = value.toLocaleLowerCase("pt-BR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cleanFormations(values: CandidateFormation[]) {
  return values.filter((item) => hasAnyText([
    item.title,
    item.institution,
    item.level,
    item.startDate,
    item.endDate,
    item.status,
  ]));
}

function cleanCourses(values: CandidateCourse[]) {
  return values.filter((item) => hasAnyText([
    item.name,
    item.institution,
    item.workload,
    item.completedAt,
  ]));
}

function cleanExperiences(values: CandidateExperience[]) {
  return values.filter((item) => hasAnyText([
    item.company,
    item.role,
    item.startDate,
    item.endDate,
    item.description,
  ]));
}

function createInitialStorage(): CandidateProfilesStorage {
  return {
    version: CANDIDATE_PROFILE_VERSION,
    profiles: [createDemoCandidateProfile()],
  };
}

function readStorage(): CandidateProfilesStorage {
  if (!canUseStorage()) return createInitialStorage();

  const raw = window.localStorage.getItem(CANDIDATE_PROFILE_STORAGE_KEY);
  if (!raw) {
    const initial = createInitialStorage();
    saveStorage(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(raw);
    const normalized = normalizeStorage(parsed);
    if (normalized) return normalized;
  } catch {
    // Invalid localStorage data is safely replaced by a clean profile state.
  }

  const reset = createInitialStorage();
  saveStorage(reset);
  return reset;
}

function saveStorage(storage: CandidateProfilesStorage) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(CANDIDATE_PROFILE_STORAGE_KEY, JSON.stringify(storage));
}

// Prompt 10: o desempate por `sessionUser?.id === "candidate-demo"` foi
// removido — dependia do Auth mock (`loginMockUser`/`loginMockWithCredentials`,
// removidos neste mesmo prompt), que era a única forma de uma sessão real
// carregar esse id. `candidateId === DEFAULT_CANDIDATE.id` sozinho já cobre
// o caso de negócio que continua vivo (Admin visualizando o perfil do
// candidato demo via `admin-screens.tsx`, que chama `getCandidateProfile`
// sem `sessionUser`). O parâmetro `sessionUser` foi mantido na assinatura
// (não removido) para não forçar mudança nos call sites existentes.
function resolveProfileSeed(candidateId: string) {
  if (candidateId === DEFAULT_CANDIDATE.id) {
    return createDemoCandidateProfile();
  }

  return createEmptyCandidateProfile(candidateId);
}

export function getCandidateProfile(candidateId: string, sessionUser?: Pick<MockAuthUser, "id" | "role"> | null) {
  const storage = readStorage();
  const existing = storage.profiles.find((profile) => profile.candidateId === candidateId);
  if (existing) return existing;

  const profile = resolveProfileSeed(candidateId);
  saveStorage({
    version: CANDIDATE_PROFILE_VERSION,
    profiles: [...storage.profiles, profile],
  });
  return profile;
}

export function saveCandidateProfile(candidateId: string, patch: CandidateProfilePatch) {
  const storage = readStorage();
  const current = storage.profiles.find((profile) => profile.candidateId === candidateId) ?? createEmptyCandidateProfile(candidateId);
  const next: CandidateProfile = {
    ...current,
    ...patch,
    version: CANDIDATE_PROFILE_VERSION,
    candidateId,
    formations: cleanFormations(patch.formations ?? current.formations),
    courses: cleanCourses(patch.courses ?? current.courses),
    experiences: cleanExperiences(patch.experiences ?? current.experiences),
    technicalSkills: cleanStringArray(patch.technicalSkills ?? current.technicalSkills),
    behavioralSkills: cleanStringArray(patch.behavioralSkills ?? current.behavioralSkills),
    updatedAt: nowIso(),
  };

  saveStorage({
    version: CANDIDATE_PROFILE_VERSION,
    profiles: [
      ...storage.profiles.filter((profile) => profile.candidateId !== candidateId),
      next,
    ],
  });

  return next;
}

export function getCandidateProfileCompleteness(profile: CandidateProfile) {
  const fields = [
    profile.professionalSummary,
    profile.areaId,
    profile.subareaId,
    profile.desiredRole,
    profile.seniority,
    profile.contractType,
    profile.formations.some((item) => hasAnyText([item.title, item.institution, item.level, item.startDate, item.endDate, item.status])) ? "filled" : "",
    profile.courses.some((item) => hasAnyText([item.name, item.institution, item.workload, item.completedAt])) ? "filled" : "",
    profile.experiences.some((item) => hasAnyText([item.company, item.role, item.startDate, item.endDate, item.description])) ? "filled" : "",
    profile.technicalSkills.some((value) => value.trim().length > 0) ? "filled" : "",
    profile.behavioralSkills.some((value) => value.trim().length > 0) ? "filled" : "",
  ];

  const filled = fields.filter((value) => value.trim().length > 0).length;
  return Math.round((filled / fields.length) * 100);
}

export function isCandidateProfileReadyForInterview(profile: CandidateProfile) {
  return [
    profile.areaId,
    profile.subareaId,
    profile.desiredRole,
    profile.seniority,
    profile.contractType,
    profile.professionalSummary,
  ].every((value) => value.trim().length > 0);
}
