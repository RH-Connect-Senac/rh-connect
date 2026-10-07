/**
 * Perfil Profissional REAL do candidato (Fluxo 02).
 *
 * Consome `/candidate/profile` (protegido por JWT + `@Roles('CANDIDATE')` no
 * Back). O banco/API é a única fonte de verdade: não há cache, fallback nem
 * qualquer leitura/gravação no armazenamento do navegador. Toda operação de escrita devolve
 * o perfil completo já recalculado pelo Back (`isComplete` / `missingSections`),
 * e a tela só reflete o que a API confirmou (sem atualização otimista).
 */
import type {
  AcademicLevel,
  ContractType,
  DeclarationSection,
  CourseStatus,
  EducationStatus,
  ObjectiveFieldKey,
  ProfessionalLevel,
  ProfessionalProfile,
  ProfileSectionKey,
  SkillType,
} from "../domain/professional-profile";
import type {
  CoursePayload,
  EducationPayload,
  ExperiencePayload,
} from "../domain/professional-profile-forms";

const API_BASE_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
    .env?.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

const PROFILE_PATH = "/candidate/profile";

export type ProfileFailureReason =
  | "unauthorized" // 401 (sessão expirada) / 403
  | "not_found" // 404
  | "conflict" // 409
  | "invalid" // 400
  | "network" // sem resposta
  | "error"; // 5xx / payload inesperado

export type ProfileResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ProfileFailureReason; message: string };

export type ObjectivePatch = {
  professionalTitle?: string | null;
  professionalArea?: string | null;
  professionalSubarea?: string | null;
  desiredPosition?: string | null;
  professionalLevel?: ProfessionalLevel | null;
  contractType?: ContractType | null;
  professionalSummary?: string | null;
};

// ── Transporte ──────────────────────────────────────────────────────────────

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

// O access token dura 15 minutos: num 401 renova uma única vez via
// `/auth/refresh` (mesmo fluxo dos demais services reais) e repete.
async function requestApi(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<Response | null> {
  const doFetch = () =>
    fetch(`${API_BASE_URL}${PROFILE_PATH}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
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

const DEFAULT_MESSAGES: Record<ProfileFailureReason, string> = {
  unauthorized: "Sua sessão expirou. Faça login novamente.",
  not_found: "Registro não encontrado. Ele pode ter sido removido.",
  conflict: "Não foi possível concluir esta ação.",
  invalid: "Dados inválidos. Revise os campos e tente novamente.",
  network: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
  error: "Não foi possível concluir a operação. Tente novamente em instantes.",
};

function reasonFromStatus(status: number): ProfileFailureReason {
  if (status === 400 || status === 422) return "invalid";
  if (status === 401 || status === 403) return "unauthorized";
  if (status === 404) return "not_found";
  if (status === 409) return "conflict";
  return "error";
}

/** Extrai a(s) mensagem(ns) do erro padrão do Nest ({ message: string | string[] }). */
export async function extractApiMessage(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string" && body.message.trim()) return body.message;
    if (Array.isArray(body.message)) {
      const parts = body.message.filter((item): item is string => typeof item === "string");
      if (parts.length > 0) return parts.join(" ");
    }
  } catch {
    // corpo ausente ou não-JSON
  }
  return null;
}

async function run(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ProfileResult<ProfessionalProfile>> {
  const response = await requestApi(method, path, body);
  if (!response) {
    return { ok: false, reason: "network", message: DEFAULT_MESSAGES.network };
  }

  if (!response.ok) {
    const reason = reasonFromStatus(response.status);
    // 401/403 e 5xx usam sempre a mensagem padrão (não vazar detalhe técnico).
    const apiMessage =
      reason === "invalid" || reason === "conflict" || reason === "not_found"
        ? await extractApiMessage(response)
        : null;
    return { ok: false, reason, message: apiMessage ?? DEFAULT_MESSAGES[reason] };
  }

  try {
    const profile = parseProfessionalProfile(await response.json());
    if (profile) return { ok: true, data: profile };
  } catch {
    // cai no erro genérico abaixo
  }
  return { ok: false, reason: "error", message: DEFAULT_MESSAGES.error };
}

// ── Parsing defensivo da resposta ───────────────────────────────────────────

const SECTION_KEYS: ProfileSectionKey[] = [
  "objective",
  "education",
  "courses",
  "experience",
  "technicalSkills",
  "behavioralSkills",
];

const OBJECTIVE_KEYS: ObjectiveFieldKey[] = [
  "professionalTitle",
  "professionalArea",
  "professionalSubarea",
  "desiredPosition",
  "professionalLevel",
  "contractType",
  "professionalSummary",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;
const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

export function parseProfessionalProfile(payload: unknown): ProfessionalProfile | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.isComplete !== "boolean") return null;
  if (typeof payload.isInterviewReady !== "boolean") return null;
  if (!Array.isArray(payload.missingSections)) return null;
  if (!isRecord(payload.declarations)) return null;

  const declarations = payload.declarations;

  return {
    professionalTitle: asString(payload.professionalTitle),
    professionalArea: asString(payload.professionalArea),
    professionalSubarea: asString(payload.professionalSubarea),
    desiredPosition: asString(payload.desiredPosition),
    professionalLevel: asString(payload.professionalLevel) as ProfessionalLevel | null,
    contractType: asString(payload.contractType) as ContractType | null,
    professionalSummary: asString(payload.professionalSummary),
    educations: asArray(payload.educations).map((item) => ({
      id: Number(item.id),
      degree: asString(item.degree),
      educationInstitution: asString(item.educationInstitution) ?? "",
      academicLevel: item.academicLevel as AcademicLevel,
      status: item.status as EducationStatus,
      startDate: asString(item.startDate) ?? "",
      endDate: asString(item.endDate),
    })),
    courses: asArray(payload.courses).map((item) => ({
      id: Number(item.id),
      courseName: asString(item.courseName) ?? "",
      courseInstitution: asString(item.courseInstitution),
      workloadHours: typeof item.workloadHours === "number" ? item.workloadHours : null,
      status: (item.status === "EM_ANDAMENTO" ? "EM_ANDAMENTO" : "CONCLUIDO") as CourseStatus,
      startDate: asString(item.startDate),
      completedAt: asString(item.completedAt),
    })),
    experiences: asArray(payload.experiences).map((item) => ({
      id: Number(item.id),
      companyName: asString(item.companyName) ?? "",
      jobRole: asString(item.jobRole) ?? "",
      startDate: asString(item.startDate) ?? "",
      endDate: asString(item.endDate),
      isCurrent: item.isCurrent === true,
      description: asString(item.description),
    })),
    technicalSkills: asArray(payload.technicalSkills).map((item) => ({
      id: Number(item.id),
      name: asString(item.name) ?? "",
    })),
    behavioralSkills: asArray(payload.behavioralSkills).map((item) => ({
      id: Number(item.id),
      name: asString(item.name) ?? "",
    })),
    declarations: {
      noCourses: declarations.noCourses === true,
      noExperience: declarations.noExperience === true,
      noTechnicalSkills: declarations.noTechnicalSkills === true,
    },
    isComplete: payload.isComplete,
    isInterviewReady: payload.isInterviewReady,
    missingSections: payload.missingSections.filter((item): item is ProfileSectionKey =>
      SECTION_KEYS.includes(item as ProfileSectionKey),
    ),
    missingObjectiveFields: Array.isArray(payload.missingObjectiveFields)
      ? payload.missingObjectiveFields.filter((item): item is ObjectiveFieldKey =>
          OBJECTIVE_KEYS.includes(item as ObjectiveFieldKey),
        )
      : [],
    updatedAt: asString(payload.updatedAt) ?? "",
  };
}

// ── API pública ─────────────────────────────────────────────────────────────

export const getCandidateProfile = () => run("GET", "");

export const updateCandidateObjective = (patch: ObjectivePatch) => run("PATCH", "", patch);

export const addEducation = (payload: EducationPayload) => run("POST", "/educations", payload);
export const updateEducation = (id: number, payload: EducationPayload) =>
  run("PATCH", `/educations/${id}`, payload);
export const removeEducation = (id: number) => run("DELETE", `/educations/${id}`);

export const addCourse = (payload: CoursePayload) => run("POST", "/courses", payload);
export const updateCourse = (id: number, payload: CoursePayload) =>
  run("PATCH", `/courses/${id}`, payload);
export const removeCourse = (id: number) => run("DELETE", `/courses/${id}`);

export const addExperience = (payload: ExperiencePayload) => run("POST", "/experiences", payload);
export const updateExperience = (id: number, payload: ExperiencePayload) =>
  run("PATCH", `/experiences/${id}`, payload);
export const removeExperience = (id: number) => run("DELETE", `/experiences/${id}`);

export const addSkill = (type: SkillType, name: string) =>
  run("POST", "/skills", { type, name });
export const removeSkill = (id: number) => run("DELETE", `/skills/${id}`);

const DECLARATION_PATH: Record<DeclarationSection, string> = {
  courses: "/declarations/courses",
  experience: "/declarations/experience",
  technicalSkills: "/declarations/technical-skills",
};

/** "Não possuo…": a API recusa (409) se já houver registros na seção. */
export const declareNone = (section: DeclarationSection) =>
  run("PUT", DECLARATION_PATH[section]);
export const removeDeclaration = (section: DeclarationSection) =>
  run("DELETE", DECLARATION_PATH[section]);
