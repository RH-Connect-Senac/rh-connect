/**
 * Perfil Profissional do candidato — contrato com a API real
 * (`/candidate/profile`, Fluxo 02).
 *
 * O banco/API é a ÚNICA fonte de verdade: nada aqui é persistido no navegador.
 * A regra de completude (`isComplete` / `missingSections`) também vem da API;
 * os helpers deste arquivo servem apenas à APRESENTAÇÃO (rótulos, percentual,
 * máscara de mês/ano).
 */

// Espelham os VARCHAR do banco / DTOs do Back (limites validados com o professor).
export const PROFILE_FIELD_LIMITS = {
  professionalTitle: 60,
  desiredPosition: 60,
  professionalSummary: 600,
  degree: 80,
  educationInstitution: 80,
  courseName: 80,
  courseInstitution: 80,
  companyName: 80,
  jobRole: 60,
  description: 800,
  skillName: 60,
} as const;

export const MAX_WORKLOAD_HOURS = 10000;

export type ProfileSectionKey =
  | "objective"
  | "education"
  | "courses"
  | "experience"
  | "technicalSkills"
  | "behavioralSkills";

export type ObjectiveFieldKey =
  | "professionalTitle"
  | "professionalArea"
  | "professionalSubarea"
  | "desiredPosition"
  | "professionalLevel"
  | "contractType"
  | "professionalSummary";

export type AcademicLevel =
  | "ENSINO_FUNDAMENTAL"
  | "ENSINO_MEDIO"
  | "TECNICO"
  | "TECNOLOGO"
  | "GRADUACAO"
  | "POS_GRADUACAO"
  | "MESTRADO"
  | "DOUTORADO";

export type EducationStatus =
  | "EM_ANDAMENTO"
  | "CONCLUIDO"
  | "TRANCADO"
  | "INTERROMPIDO";

export type CourseStatus = "EM_ANDAMENTO" | "CONCLUIDO";

export type ProfessionalLevel = "TRAINEE" | "JUNIOR" | "PLENO" | "SENIOR";
export type ContractType = "CLT" | "ESTAGIO" | "PJ" | "TEMPORARIO";
export type SkillType = "TECHNICAL" | "BEHAVIORAL";

export type ProfileEducation = {
  id: number;
  degree: string | null;
  educationInstitution: string;
  academicLevel: AcademicLevel;
  status: EducationStatus;
  startDate: string; // "AAAA-MM"
  endDate: string | null;
};

export type ProfileCourse = {
  id: number;
  courseName: string;
  courseInstitution: string | null;
  workloadHours: number | null;
  status: CourseStatus;
  startDate: string | null; // "AAAA-MM" (opcional)
  completedAt: string | null; // "AAAA-MM" (conclusão, ou previsão se em andamento)
};

export type ProfileExperience = {
  id: number;
  companyName: string;
  jobRole: string;
  startDate: string; // "AAAA-MM"
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
};

export type ProfileSkill = { id: number; name: string };

export type ProfileDeclarations = {
  noCourses: boolean;
  noExperience: boolean;
  noTechnicalSkills: boolean;
};

export type ProfessionalProfile = {
  professionalTitle: string | null;
  professionalArea: string | null;
  professionalSubarea: string | null;
  desiredPosition: string | null;
  professionalLevel: ProfessionalLevel | null;
  contractType: ContractType | null;
  professionalSummary: string | null;
  educations: ProfileEducation[];
  courses: ProfileCourse[];
  experiences: ProfileExperience[];
  technicalSkills: ProfileSkill[];
  behavioralSkills: ProfileSkill[];
  declarations: ProfileDeclarations;
  /** Perfil Profissional inteiro completo. */
  isComplete: boolean;
  /** Objetivo Profissional completo: único requisito do perfil para entrevistar. */
  isInterviewReady: boolean;
  missingSections: ProfileSectionKey[];
  missingObjectiveFields: ObjectiveFieldKey[];
  updatedAt: string;
};

export type DeclarationSection = "courses" | "experience" | "technicalSkills";

type Option<T extends string> = { value: T; label: string };

export const ACADEMIC_LEVEL_OPTIONS: Option<AcademicLevel>[] = [
  { value: "ENSINO_FUNDAMENTAL", label: "Ensino Fundamental" },
  { value: "ENSINO_MEDIO", label: "Ensino Médio" },
  { value: "TECNICO", label: "Técnico" },
  { value: "TECNOLOGO", label: "Tecnólogo" },
  { value: "GRADUACAO", label: "Graduação" },
  { value: "POS_GRADUACAO", label: "Pós-graduação" },
  { value: "MESTRADO", label: "Mestrado" },
  { value: "DOUTORADO", label: "Doutorado" },
];

export const EDUCATION_STATUS_OPTIONS: Option<EducationStatus>[] = [
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "TRANCADO", label: "Trancado" },
  { value: "INTERROMPIDO", label: "Interrompido" },
];

export const COURSE_STATUS_OPTIONS: Option<CourseStatus>[] = [
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "CONCLUIDO", label: "Concluído" },
];

export const PROFESSIONAL_LEVEL_OPTIONS: Option<ProfessionalLevel>[] = [
  { value: "TRAINEE", label: "Trainee" },
  { value: "JUNIOR", label: "Júnior" },
  { value: "PLENO", label: "Pleno" },
  { value: "SENIOR", label: "Sênior" },
];

export const CONTRACT_TYPE_OPTIONS: Option<ContractType>[] = [
  { value: "CLT", label: "CLT" },
  { value: "ESTAGIO", label: "Estágio" },
  { value: "PJ", label: "PJ" },
  { value: "TEMPORARIO", label: "Temporário" },
];

// Regra contrato x senioridade (espelha o Back, igual para todas as áreas):
// estágio não tem senioridade; PJ e temporário não têm trainee.
export const ALLOWED_LEVELS_BY_CONTRACT: Record<ContractType, ProfessionalLevel[]> = {
  ESTAGIO: [],
  CLT: ["TRAINEE", "JUNIOR", "PLENO", "SENIOR"],
  PJ: ["JUNIOR", "PLENO", "SENIOR"],
  TEMPORARIO: ["JUNIOR", "PLENO", "SENIOR"],
};

/** Texto exibido no select de senioridade desabilitado (estágio). */
export const LEVEL_NOT_APPLICABLE_LABEL = "Não se aplica";

/** Senioridade só deixa de se aplicar para estágio. */
export function isLevelApplicable(contract: string | null | undefined): boolean {
  return contract !== "ESTAGIO";
}

/** Opções de senioridade válidas para o contrato (sem contrato: todas). */
export function getLevelOptionsForContract(contract: string | null | undefined): Option<ProfessionalLevel>[] {
  const allowed = ALLOWED_LEVELS_BY_CONTRACT[contract as ContractType];
  if (!allowed) return PROFESSIONAL_LEVEL_OPTIONS;
  return PROFESSIONAL_LEVEL_OPTIONS.filter((option) => allowed.includes(option.value));
}

/**
 * Valor de senioridade a manter após escolher o contrato: o atual se continuar
 * compatível; caso contrário "" (limpa — o candidato escolhe outra; nada é
 * selecionado automaticamente).
 */
export function levelAfterContractChange(contract: string | null | undefined, level: string): string {
  if (!level) return "";
  const allowed = ALLOWED_LEVELS_BY_CONTRACT[contract as ContractType];
  if (!allowed) return level;
  return (allowed as string[]).includes(level) ? level : "";
}

/** Senioridade a enviar à API: null para estágio ou vazio. */
export function levelForApi(contract: string | null | undefined, level: string): ProfessionalLevel | null {
  if (!isLevelApplicable(contract)) return null;
  return levelAfterContractChange(contract, level) ? (level as ProfessionalLevel) : null;
}

function labelOf<T extends string>(options: Option<T>[], value: T | null | undefined) {
  return options.find((option) => option.value === value)?.label ?? "";
}

export const professionalLevelLabel = (value: ProfessionalLevel | null | undefined) =>
  labelOf(PROFESSIONAL_LEVEL_OPTIONS, value);
export const contractTypeLabel = (value: ContractType | null | undefined) =>
  labelOf(CONTRACT_TYPE_OPTIONS, value);
export const academicLevelLabel = (value: AcademicLevel | null | undefined) =>
  labelOf(ACADEMIC_LEVEL_OPTIONS, value);
export const educationStatusLabel = (value: EducationStatus | null | undefined) =>
  labelOf(EDUCATION_STATUS_OPTIONS, value);

/**
 * Período do curso para a listagem (apenas apresentação). Nunca devolve
 * "undefined"/"null" nem separadores soltos:
 *  - concluído: "02/2023 – 02/2025" (sem início: "Concluído em 02/2025");
 *  - em andamento: "02/2025 – Previsão 12/2026" ou "02/2025 – Em andamento"
 *    (sem início: "Em andamento · previsão 12/2026" ou "Em andamento").
 */
export function formatCoursePeriod(course: {
  status: CourseStatus;
  startDate: string | null;
  completedAt: string | null;
}): string {
  const start = apiMonthToMonthYear(course.startDate);
  const end = apiMonthToMonthYear(course.completedAt);
  if (course.status === "CONCLUIDO") {
    if (start && end) return `${start} – ${end}`;
    if (end) return `Concluído em ${end}`;
    return start ? `${start} – Concluído` : "Concluído";
  }
  if (start) return end ? `${start} – Previsão ${end}` : `${start} – Em andamento`;
  return end ? `Em andamento · previsão ${end}` : "Em andamento";
}

/**
 * Visibilidade da declaração "não possuo ..." (cursos/experiência):
 * - declaração ativa: formulário escondido e só o desfazer aparece;
 * - sem declaração e SEM registros: formulário + opção de declarar;
 * - sem declaração e COM registros: só o formulário (opção escondida).
 */
export function getNoneDeclarationState(input: { recordCount: number; declared: boolean }) {
  if (input.declared) return { showForm: false, showOption: false, showUndo: true };
  return { showForm: true, showOption: input.recordCount === 0, showUndo: false };
}

export const PROFILE_SECTION_LABELS: Record<ProfileSectionKey, string> = {
  objective: "Objetivo profissional",
  education: "Formação acadêmica",
  courses: "Cursos complementares",
  experience: "Experiência profissional",
  technicalSkills: "Habilidades técnicas",
  behavioralSkills: "Competências comportamentais",
};

/** Rótulos legíveis das seções que a API informou como pendentes. */
export function describeMissingSections(sections: ProfileSectionKey[]): string[] {
  return sections.map((section) => PROFILE_SECTION_LABELS[section] ?? section);
}

/** Rótulos dos campos do Objetivo Profissional (iguais aos do formulário). */
export const OBJECTIVE_FIELD_LABELS: Record<ObjectiveFieldKey, string> = {
  professionalTitle: "Título profissional",
  professionalArea: "Área de interesse",
  professionalSubarea: "Subárea de interesse",
  desiredPosition: "Cargo desejado",
  professionalLevel: "Senioridade profissional",
  contractType: "Tipo de contrato",
  professionalSummary: "Resumo profissional",
};

/** Rótulos dos campos do objetivo que a API informou como pendentes. */
export function describeMissingObjectiveFields(fields: ObjectiveFieldKey[]): string[] {
  return fields.map((field) => OBJECTIVE_FIELD_LABELS[field] ?? field);
}

/**
 * Aviso do perfil (dashboard/tela de Perfil), decidido só pelos flags da API:
 *  - "objective-pending": objetivo incompleto — entrevista bloqueada;
 *  - "optional-sections": entrevista liberada, mas o perfil inteiro não está
 *    completo (apenas informativo, sem relação com a liberação);
 *  - "none": perfil completo.
 */
export type ProfileNotice = "objective-pending" | "optional-sections" | "none";

export function getProfileNotice(profile: Pick<ProfessionalProfile, "isComplete" | "isInterviewReady">): ProfileNotice {
  if (!profile.isInterviewReady) return "objective-pending";
  return profile.isComplete ? "none" : "optional-sections";
}

// Unidades de progresso: 7 campos do objetivo + 5 seções restantes.
const OBJECTIVE_FIELD_COUNT = 7;
const OTHER_SECTION_COUNT = 5;

/**
 * Percentual de APRESENTAÇÃO derivado do que a API devolveu. 100% se e somente
 * se `isComplete` for verdadeiro — nunca mostra 100% com perfil incompleto
 * (e nunca menos que 100% com perfil completo).
 */
export function getProfileCompletionPercent(
  profile: Pick<ProfessionalProfile, "isComplete" | "missingSections" | "missingObjectiveFields"> & {
    contractType?: ProfessionalProfile["contractType"];
  },
): number {
  if (profile.isComplete) return 100;
  // Estágio: senioridade não se aplica, então não entra no total.
  const objectiveFieldCount = isLevelApplicable(profile.contractType)
    ? OBJECTIVE_FIELD_COUNT
    : OBJECTIVE_FIELD_COUNT - 1;
  const total = objectiveFieldCount + OTHER_SECTION_COUNT;
  const missingObjective = profile.missingSections.includes("objective")
    ? Math.min(objectiveFieldCount, Math.max(1, profile.missingObjectiveFields.length))
    : 0;
  const missingOthers = profile.missingSections.filter((section) => section !== "objective").length;
  const filled = Math.max(0, total - missingObjective - missingOthers);
  return Math.min(99, Math.round((filled / total) * 100));
}

// ── Mês/ano: a UI mostra "MM/AAAA"; a API fala "AAAA-MM" ───────────────────

const MONTH_YEAR_PATTERN = /^(0[1-9]|1[0-2])\/(\d{4})$/;
const API_MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MIN_YEAR = 1900;

/** Máscara de digitação: só dígitos, formato MM/AAAA. */
export function maskMonthYear(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

/** "03/2024" -> "2024-03"; inválido -> null. */
export function monthYearToApi(value: string): string | null {
  const match = MONTH_YEAR_PATTERN.exec(value.trim());
  if (!match || Number(match[2]) < MIN_YEAR) return null;
  return `${match[2]}-${match[1]}`;
}

/** "2024-03" -> "03/2024"; null/inválido -> "". */
export function apiMonthToMonthYear(value: string | null | undefined): string {
  if (!value) return "";
  const match = API_MONTH_PATTERN.exec(value);
  return match ? `${match[2]}/${match[1]}` : "";
}

/** Período "MM/AAAA – MM/AAAA" (ou "Atual"); vazio quando não há datas. */
export function formatProfilePeriod(start: string | null, end: string | null, current = false) {
  const from = apiMonthToMonthYear(start);
  const to = current ? "Atual" : apiMonthToMonthYear(end);
  if (!from && !to) return "";
  return `${from || "—"} – ${to || "—"}`;
}

/** Período da formação: em andamento mostra a previsão de conclusão. */
export function formatEducationPeriod(item: {
  status: EducationStatus;
  startDate: string;
  endDate: string | null;
}): string {
  if (item.status === "EM_ANDAMENTO" && item.endDate) {
    return `${apiMonthToMonthYear(item.startDate)} · previsão ${apiMonthToMonthYear(item.endDate)}`;
  }
  return formatProfilePeriod(item.startDate, item.endDate);
}

/** Mês corrente em "AAAA-MM" (horário local do navegador). */
export function currentApiMonth(now: Date = new Date()): string {
  return `${String(now.getFullYear()).padStart(4, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
