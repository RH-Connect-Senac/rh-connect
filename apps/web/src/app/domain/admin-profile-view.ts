/**
 * Apresentação (somente leitura) do Perfil Profissional REAL para o Admin.
 *
 * Recebe o contrato `ProfessionalProfile` devolvido por
 * `GET /admin/candidates/:id/profile` e monta textos prontos para a tela, sem
 * recalcular completude (isComplete/missingSections vêm do Back) e reusando
 * os rótulos/formatadores de `professional-profile.ts`.
 * Cidade/UF não fazem parte desta visão.
 */

import {
  getProfessionalAreaName,
  getProfessionalSubareaName,
  type ProfessionalAreaId,
  type ProfessionalSubareaId,
} from "./professional-catalog";
import {
  academicLevelLabel,
  contractTypeLabel,
  describeMissingSections,
  educationStatusLabel,
  formatCoursePeriod,
  formatEducationPeriod,
  formatProfilePeriod,
  professionalLevelLabel,
  type ProfessionalProfile,
} from "./professional-profile";

export const ADMIN_NOT_INFORMED = "Não informado";

export const ADMIN_PROFILE_EMPTY_MESSAGES = {
  educations: "Nenhuma formação cadastrada.",
  courses: "Nenhum curso complementar cadastrado.",
  experiences: "Nenhuma experiência cadastrada.",
  technicalSkills: "Nenhuma habilidade técnica cadastrada.",
  behavioralSkills: "Nenhuma competência comportamental cadastrada.",
} as const;

export const ADMIN_PROFILE_DECLARATION_MESSAGES = {
  courses: "O candidato declarou não possuir cursos complementares.",
  experiences: "O candidato declarou não possuir experiência profissional.",
  technicalSkills: "O candidato declarou não possuir habilidades técnicas.",
} as const;

export type AdminProfileView = {
  isComplete: boolean;
  missingSectionLabels: string[];
  objective: { label: string; value: string }[];
  summary: string;
  educations: { key: number; title: string; subtitle: string; period: string }[];
  educationsEmptyMessage: string;
  courses: { key: number; title: string; subtitle: string; period: string }[];
  coursesEmptyMessage: string;
  experiences: { key: number; title: string; period: string; description: string }[];
  experiencesEmptyMessage: string;
  technicalSkills: { key: number; name: string }[];
  technicalSkillsEmptyMessage: string;
  behavioralSkills: { key: number; name: string }[];
  behavioralSkillsEmptyMessage: string;
};

const join = (parts: (string | null | undefined)[], separator = " · ") =>
  parts.filter((part): part is string => Boolean(part && part.trim())).join(separator);

export function buildAdminProfileView(profile: ProfessionalProfile): AdminProfileView {
  const area = profile.professionalArea
    ? getProfessionalAreaName(profile.professionalArea as ProfessionalAreaId)
    : "";
  const subarea = profile.professionalSubarea
    ? getProfessionalSubareaName(profile.professionalSubarea as ProfessionalSubareaId)
    : "";

  return {
    isComplete: profile.isComplete,
    missingSectionLabels: profile.isComplete ? [] : describeMissingSections(profile.missingSections),
    objective: [
      { label: "Área", value: area },
      { label: "Subárea", value: subarea },
      { label: "Cargo desejado", value: profile.desiredPosition?.trim() ?? "" },
      { label: "Senioridade", value: professionalLevelLabel(profile.professionalLevel) },
      { label: "Tipo de contrato", value: contractTypeLabel(profile.contractType) },
      { label: "Título profissional", value: profile.professionalTitle?.trim() ?? "" },
    ].map((item) => ({ ...item, value: item.value || ADMIN_NOT_INFORMED })),
    summary: profile.professionalSummary?.trim() || ADMIN_NOT_INFORMED,
    educations: profile.educations.map((item) => ({
      key: item.id,
      title: item.degree?.trim() || ADMIN_NOT_INFORMED,
      subtitle:
        join([
          item.educationInstitution,
          academicLevelLabel(item.academicLevel),
          educationStatusLabel(item.status),
        ]) || ADMIN_NOT_INFORMED,
      period: formatEducationPeriod(item) || ADMIN_NOT_INFORMED,
    })),
    educationsEmptyMessage: ADMIN_PROFILE_EMPTY_MESSAGES.educations,
    courses: profile.courses.map((item) => ({
      key: item.id,
      title: item.courseName?.trim() || ADMIN_NOT_INFORMED,
      subtitle:
        join([
          item.courseInstitution,
          item.workloadHours !== null ? `${item.workloadHours}h` : null,
        ]) || ADMIN_NOT_INFORMED,
      period: formatCoursePeriod(item),
    })),
    coursesEmptyMessage: profile.declarations.noCourses
      ? ADMIN_PROFILE_DECLARATION_MESSAGES.courses
      : ADMIN_PROFILE_EMPTY_MESSAGES.courses,
    experiences: profile.experiences.map((item) => ({
      key: item.id,
      title: join([item.jobRole, item.companyName]) || ADMIN_NOT_INFORMED,
      period: formatProfilePeriod(item.startDate, item.endDate, item.isCurrent) || ADMIN_NOT_INFORMED,
      description: item.description?.trim() ?? "",
    })),
    experiencesEmptyMessage: profile.declarations.noExperience
      ? ADMIN_PROFILE_DECLARATION_MESSAGES.experiences
      : ADMIN_PROFILE_EMPTY_MESSAGES.experiences,
    technicalSkills: profile.technicalSkills.map((item) => ({ key: item.id, name: item.name })),
    technicalSkillsEmptyMessage: profile.declarations.noTechnicalSkills
      ? ADMIN_PROFILE_DECLARATION_MESSAGES.technicalSkills
      : ADMIN_PROFILE_EMPTY_MESSAGES.technicalSkills,
    behavioralSkills: profile.behavioralSkills.map((item) => ({ key: item.id, name: item.name })),
    behavioralSkillsEmptyMessage: ADMIN_PROFILE_EMPTY_MESSAGES.behavioralSkills,
  };
}
