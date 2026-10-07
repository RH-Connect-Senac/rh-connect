/**
 * Validação de FORMULÁRIO (apresentação) das seções do Perfil Profissional.
 *
 * Só impede envios óbvios e dá feedback imediato; a API continua sendo a
 * autoridade (limites, regras de datas, completude) e seus erros também são
 * exibidos. As regras abaixo espelham o contrato atual do Back.
 */
import {
  MAX_WORKLOAD_HOURS,
  PROFILE_FIELD_LIMITS,
  currentApiMonth,
  MIN_YEAR,
  isWellFormedMonthYear,
  monthYearToApi,
  type AcademicLevel,
  type CourseStatus,
  type EducationStatus,
} from "./professional-profile";

export type FormErrors<T> = Partial<Record<keyof T, string>>;

export type FormResult<Form, Payload> =
  | { ok: true; payload: Payload }
  | { ok: false; errors: FormErrors<Form> };

const FORMAT_ERROR = "Use o formato MM/AAAA.";

function tooLong(value: string, limit: number, label: string) {
  return value.trim().length > limit
    ? `${label} deve ter no máximo ${limit} caracteres.`
    : null;
}

type MonthCheck = { api: string | null; error: string | null };

// Aceita valor ausente (undefined/null) além de string: campos opcionais podem
// nem chegar no payload. Ausente/vazio => "não informado".
// Formato correto porém abaixo do piso técnico (1900) gera mensagem específica
// de data antiga (nunca "Use o formato MM/AAAA."). Antiguidade acima do piso não
// é erro: vira aviso em professional-plausibility.ts.
function checkMonth(
  value: string | null | undefined,
  { required, allowFuture }: { required: boolean; allowFuture: boolean },
  now: Date,
): MonthCheck {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return { api: null, error: required ? "Informe a data (MM/AAAA)." : null };
  }
  const api = monthYearToApi(trimmed);
  if (!api) {
    if (isWellFormedMonthYear(trimmed)) {
      return { api: null, error: `A data não pode ser anterior a 01/${MIN_YEAR}.` };
    }
    return { api: null, error: FORMAT_ERROR };
  }
  if (!allowFuture && api > currentApiMonth(now)) {
    return { api, error: "A data não pode ser futura." };
  }
  return { api, error: null };
}

// ── Formação ────────────────────────────────────────────────────────────────

export type EducationForm = {
  academicLevel: AcademicLevel | "";
  status: EducationStatus | "";
  degree: string;
  educationInstitution: string;
  startDate: string; // MM/AAAA
  endDate: string; // MM/AAAA
};

export type EducationPayload = {
  degree: string | null;
  educationInstitution: string;
  academicLevel: AcademicLevel;
  status: EducationStatus;
  startDate: string;
  endDate: string | null;
};

export const EMPTY_EDUCATION_FORM: EducationForm = {
  academicLevel: "",
  status: "",
  degree: "",
  educationInstitution: "",
  startDate: "",
  endDate: "",
};

// Níveis em que o curso/formação é opcional (espelha a API).
export const LEVELS_WITHOUT_REQUIRED_DEGREE: readonly AcademicLevel[] = [
  "ENSINO_FUNDAMENTAL",
  "ENSINO_MEDIO",
];

export function isDegreeRequired(level: AcademicLevel | ""): boolean {
  return level !== "" && !LEVELS_WITHOUT_REQUIRED_DEGREE.includes(level);
}

// Formação válida = nível + situação + instituição + início. Curso/formação
// obrigatório exceto em Ensino Fundamental/Médio. Conclusão: obrigatória e não
// futura se "Concluído"; opcional se "Em andamento" (previsão, pode ser futura);
// nunca anterior ao início.
export function validateEducationForm(
  form: EducationForm,
  now: Date = new Date(),
): FormResult<EducationForm, EducationPayload> {
  const errors: FormErrors<EducationForm> = {};

  if (!form.academicLevel) errors.academicLevel = "Selecione o nível.";
  if (!form.status) errors.status = "Selecione a situação.";

  const degree = form.degree.trim();
  if (!degree) {
    if (isDegreeRequired(form.academicLevel)) {
      errors.degree = "Informe o curso/formação.";
    }
  } else {
    errors.degree = tooLong(degree, PROFILE_FIELD_LIMITS.degree, "O curso") ?? undefined;
  }

  const institution = form.educationInstitution.trim();
  if (!institution) errors.educationInstitution = "Informe a instituição.";
  else {
    errors.educationInstitution =
      tooLong(institution, PROFILE_FIELD_LIMITS.educationInstitution, "A instituição") ?? undefined;
  }

  const start = checkMonth(form.startDate, { required: true, allowFuture: false }, now);
  if (start.error) errors.startDate = start.error;

  const end = checkMonth(
    form.endDate,
    { required: form.status === "CONCLUIDO", allowFuture: form.status === "EM_ANDAMENTO" },
    now,
  );
  if (end.error) errors.endDate = end.error;
  else if (start.api && end.api && end.api < start.api) {
    errors.endDate = "A conclusão não pode ser anterior ao início.";
  }

  const cleaned = Object.fromEntries(
    Object.entries(errors).filter(([, message]) => Boolean(message)),
  ) as FormErrors<EducationForm>;
  if (Object.keys(cleaned).length > 0) return { ok: false, errors: cleaned };

  return {
    ok: true,
    payload: {
      degree: degree || null,
      educationInstitution: institution,
      academicLevel: form.academicLevel as AcademicLevel,
      status: form.status as EducationStatus,
      startDate: start.api as string,
      endDate: end.api,
    },
  };
}

// ── Curso complementar ──────────────────────────────────────────────────────

export type CourseForm = {
  courseName: string;
  courseInstitution?: string; // opcional
  workloadHours?: string; // opcional, só dígitos
  status: CourseStatus | "";
  startDate?: string; // MM/AAAA (opcional)
  completedAt: string; // MM/AAAA (conclusão ou previsão)
};

export type CoursePayload = {
  courseName: string;
  courseInstitution: string | null;
  workloadHours: number | null;
  status: CourseStatus;
  startDate: string | null;
  completedAt: string | null;
};

export const EMPTY_COURSE_FORM: CourseForm = {
  courseName: "",
  courseInstitution: "",
  workloadHours: "",
  status: "",
  startDate: "",
  completedAt: "",
};

export function validateCourseForm(
  form: CourseForm,
  now: Date = new Date(),
): FormResult<CourseForm, CoursePayload> {
  const errors: FormErrors<CourseForm> = {};

  const name = form.courseName.trim();
  if (!name) errors.courseName = "Informe o nome do curso.";
  else errors.courseName = tooLong(name, PROFILE_FIELD_LIMITS.courseName, "O curso") ?? undefined;

  const institution = (form.courseInstitution ?? "").trim();
  errors.courseInstitution =
    tooLong(institution, PROFILE_FIELD_LIMITS.courseInstitution, "A instituição/plataforma") ?? undefined;

  let workload: number | null = null;
  const workloadRaw = (form.workloadHours ?? "").trim();
  if (workloadRaw) {
    if (!/^\d+$/.test(workloadRaw)) {
      errors.workloadHours = "Use apenas números (horas).";
    } else {
      workload = Number(workloadRaw);
      if (workload < 1 || workload > MAX_WORKLOAD_HOURS) {
        errors.workloadHours = `A carga horária deve ficar entre 1 e ${MAX_WORKLOAD_HOURS} horas.`;
      }
    }
  }

  // Início: sempre opcional. Concluído: conclusão obrigatória e não futura.
  // Em andamento: conclusão opcional (previsão), pode ser futura. Se início e
  // conclusão/previsão existirem, a conclusão não pode ser anterior ao início.
  if (!form.status) errors.status = "Selecione a situação.";
  const start = checkMonth(form.startDate, { required: false, allowFuture: true }, now);
  if (start.error) errors.startDate = start.error;
  const completed = checkMonth(
    form.completedAt,
    { required: form.status === "CONCLUIDO", allowFuture: form.status === "EM_ANDAMENTO" },
    now,
  );
  if (completed.error) errors.completedAt = completed.error;
  else if (start.api && completed.api && completed.api < start.api) {
    errors.completedAt =
      form.status === "EM_ANDAMENTO"
        ? "A previsão não pode ser anterior ao início."
        : "A conclusão não pode ser anterior ao início.";
  }

  const cleaned = Object.fromEntries(
    Object.entries(errors).filter(([, message]) => Boolean(message)),
  ) as FormErrors<CourseForm>;
  if (Object.keys(cleaned).length > 0) return { ok: false, errors: cleaned };

  return {
    ok: true,
    payload: {
      courseName: name,
      courseInstitution: institution || null,
      workloadHours: workload,
      status: form.status as CourseStatus,
      startDate: start.api,
      completedAt: completed.api,
    },
  };
}

// ── Experiência ─────────────────────────────────────────────────────────────

export type ExperienceForm = {
  companyName: string;
  jobRole: string;
  startDate: string; // MM/AAAA
  endDate: string; // MM/AAAA
  isCurrent: boolean;
  description: string;
};

export type ExperiencePayload = {
  companyName: string;
  jobRole: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
};

export const EMPTY_EXPERIENCE_FORM: ExperienceForm = {
  companyName: "",
  jobRole: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
};

export function validateExperienceForm(
  form: ExperienceForm,
  now: Date = new Date(),
): FormResult<ExperienceForm, ExperiencePayload> {
  const errors: FormErrors<ExperienceForm> = {};

  const company = form.companyName.trim();
  if (!company) errors.companyName = "Informe a empresa.";
  else errors.companyName = tooLong(company, PROFILE_FIELD_LIMITS.companyName, "A empresa") ?? undefined;

  const role = form.jobRole.trim();
  if (!role) errors.jobRole = "Informe o cargo.";
  else errors.jobRole = tooLong(role, PROFILE_FIELD_LIMITS.jobRole, "O cargo") ?? undefined;

  const description = form.description.trim();
  errors.description = tooLong(description, PROFILE_FIELD_LIMITS.description, "A descrição") ?? undefined;

  const start = checkMonth(form.startDate, { required: true, allowFuture: false }, now);
  if (start.error) errors.startDate = start.error;

  // Trabalha atualmente: o término fica vazio (e é ignorado no envio).
  // Sem "trabalha atualmente", o término é obrigatório e não pode ser anterior ao início.
  let endApi: string | null = null;
  if (!form.isCurrent) {
    const end = checkMonth(form.endDate, { required: true, allowFuture: false }, now);
    if (end.error) errors.endDate = end.error;
    else if (start.api && end.api && end.api < start.api) {
      errors.endDate = "O término não pode ser anterior ao início.";
    }
    endApi = end.api;
  }

  const cleaned = Object.fromEntries(
    Object.entries(errors).filter(([, message]) => Boolean(message)),
  ) as FormErrors<ExperienceForm>;
  if (Object.keys(cleaned).length > 0) return { ok: false, errors: cleaned };

  return {
    ok: true,
    payload: {
      companyName: company,
      jobRole: role,
      startDate: start.api as string,
      endDate: form.isCurrent ? null : endApi,
      isCurrent: form.isCurrent,
      description: description || null,
    },
  };
}

// ── Habilidade ──────────────────────────────────────────────────────────────

/** Normaliza (trim + espaços colapsados) e valida o nome de uma habilidade. */
export function validateSkillName(
  raw: string,
): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Digite uma habilidade antes de adicionar." };
  if (name.length > PROFILE_FIELD_LIMITS.skillName) {
    return {
      ok: false,
      error: `A habilidade deve ter no máximo ${PROFILE_FIELD_LIMITS.skillName} caracteres.`,
    };
  }
  return { ok: true, name };
}
