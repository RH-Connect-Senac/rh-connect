/**
 * Avisos de PLAUSIBILIDADE por duração (apenas apresentação).
 *
 * Dois tipos de aviso, ambos só de apresentação:
 *  - ANTIGUIDADE: data (de início) mais de 70 anos atrás, em relação ao mês atual
 *    (móvel, mês e ano). Em 10/2026: 10/1956 não avisa; 09/1956 avisa.
 *  - DURAÇÃO: formação > 15 anos, curso > 10 anos, experiência > 50 anos.
 *
 * Warnings nunca bloqueiam o salvamento e não fazem parte de `validate*Form`,
 * do payload, da API, de `isComplete` ou de `isInterviewReady`. Datas que falham
 * nas regras rígidas (formato, piso técnico de 1900, cronologia, futuro, campos
 * obrigatórios) NÃO geram warning: o erro correspondente tem prioridade.
 *
 * Combinação: no máximo UM warning por registro. Se a data é antiga, a
 * antiguidade é a causa provável e vence; o aviso de duração só aparece depois
 * (quando a data deixar de ser antiga). O aviso de antiguidade fica no campo
 * da data antiga (início; ou conclusão/previsão do curso sem início).
 *
 * As regras valem para qualquer curso/profissão/instituição (sem exceções por
 * nome). Comparação estrita: exatamente o limite não avisa.
 */
import { currentApiMonth, monthYearToApi } from "./professional-profile";
import {
  validateCourseForm,
  validateEducationForm,
  validateExperienceForm,
  type CourseForm,
  type EducationForm,
  type ExperienceForm,
} from "./professional-profile-forms";

export const ANTIQUITY_YEARS = 70;
export const EDUCATION_MAX_YEARS = 15;
export const COURSE_MAX_YEARS = 10;
export const EXPERIENCE_MAX_YEARS = 50;

export const EDUCATION_DURATION_WARNING =
  "Esse período de formação parece incomum. Confira se as datas estão corretas.";
export const COURSE_DURATION_WARNING =
  "Esse período de curso parece incomum. Confira se as datas estão corretas.";
export const EXPERIENCE_DURATION_WARNING =
  "Esse período de experiência parece incomum. Confira se as datas estão corretas.";

export const EDUCATION_ANTIQUITY_WARNING =
  "Essa formação possui uma data muito antiga. Confira se ela está correta.";
export const COURSE_ANTIQUITY_WARNING =
  "Esse curso possui uma data muito antiga. Confira se ela está correta.";
export const EXPERIENCE_ANTIQUITY_WARNING =
  "Essa experiência possui uma data muito antiga. Confira se ela está correta.";

export type FormWarnings<T> = Partial<Record<keyof T, string>>;

/** Meses entre dois valores "AAAA-MM" (end - start). */
export function monthsBetween(startApi: string, endApi: string): number {
  const toIndex = (value: string) => Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7));
  return toIndex(endApi) - toIndex(startApi);
}

/** Mês de corte ("AAAA-MM"): mesmo mês de hoje, 70 anos atrás. Datas ANTERIORES a ele são antigas. */
export function antiquityCutoffMonth(now: Date = new Date()): string {
  const current = currentApiMonth(now);
  const year = Number(current.slice(0, 4)) - ANTIQUITY_YEARS;
  return `${String(year).padStart(4, "0")}-${current.slice(5)}`;
}

function isAntique(monthApi: string, now: Date): boolean {
  return monthApi < antiquityCutoffMonth(now);
}

function exceeds(startApi: string, endApi: string, maxYears: number): boolean {
  return monthsBetween(startApi, endApi) > maxYears * 12;
}

function parsed(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? monthYearToApi(trimmed) : null;
}

/** Formação: início -> conclusão/previsão (ou mês atual se em andamento sem previsão). */
export function getEducationWarnings(
  form: EducationForm,
  now: Date = new Date(),
): FormWarnings<EducationForm> {
  const result = validateEducationForm(form, now);
  if (!result.ok && (result.errors.startDate || result.errors.endDate)) return {};

  const start = parsed(form.startDate);
  if (!start) return {};
  if (isAntique(start, now)) return { startDate: EDUCATION_ANTIQUITY_WARNING };
  const end = parsed(form.endDate) ?? (form.status === "EM_ANDAMENTO" && !form.endDate.trim() ? currentApiMonth(now) : null);
  if (!end) return {};
  return exceeds(start, end, EDUCATION_MAX_YEARS) ? { endDate: EDUCATION_DURATION_WARNING } : {};
}

/** Curso: sem início não há duração. Em andamento sem previsão compara com o mês atual. */
export function getCourseWarnings(
  form: CourseForm,
  now: Date = new Date(),
): FormWarnings<CourseForm> {
  const result = validateCourseForm(form, now);
  if (!result.ok && (result.errors.startDate || result.errors.completedAt)) return {};

  const start = parsed(form.startDate);
  const completed = parsed(form.completedAt);
  if (start && isAntique(start, now)) return { startDate: COURSE_ANTIQUITY_WARNING };
  // Sem início não há duração, mas conclusão/previsão antiga ainda gera antiguidade.
  if (!start) {
    return completed && isAntique(completed, now) ? { completedAt: COURSE_ANTIQUITY_WARNING } : {};
  }
  const end = completed ?? (form.status === "EM_ANDAMENTO" && !form.completedAt.trim() ? currentApiMonth(now) : null);
  if (!end) return {};
  return exceeds(start, end, COURSE_MAX_YEARS) ? { completedAt: COURSE_DURATION_WARNING } : {};
}

/**
 * Experiência: início -> fim; com "trabalha atualmente" compara com o mês atual
 * e o aviso de duração aparece no campo de início (o fim fica desabilitado).
 */
export function getExperienceWarnings(
  form: ExperienceForm,
  now: Date = new Date(),
): FormWarnings<ExperienceForm> {
  const result = validateExperienceForm(form, now);
  if (!result.ok && (result.errors.startDate || result.errors.endDate)) return {};

  const start = parsed(form.startDate);
  if (!start) return {};
  if (isAntique(start, now)) return { startDate: EXPERIENCE_ANTIQUITY_WARNING };
  if (form.isCurrent) {
    return exceeds(start, currentApiMonth(now), EXPERIENCE_MAX_YEARS)
      ? { startDate: EXPERIENCE_DURATION_WARNING }
      : {};
  }
  const end = parsed(form.endDate);
  if (!end) return {};
  return exceeds(start, end, EXPERIENCE_MAX_YEARS) ? { endDate: EXPERIENCE_DURATION_WARNING } : {};
}
