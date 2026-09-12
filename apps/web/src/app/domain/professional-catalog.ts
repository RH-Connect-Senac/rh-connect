export type ProfessionalAreaId = "information-technology" | "hr-management" | "secretariat";

export type ProfessionalSubareaId =
  | "frontend-development"
  | "backend-development"
  | "full-stack-development"
  | "mobile-development"
  | "ux-ui-design"
  | "technical-support"
  | "networks-infrastructure"
  | "information-security"
  | "data-business-intelligence"
  | "data-science"
  | "quality-testing"
  | "it-project-management"
  | "people-management"
  | "recruitment-selection"
  | "executive-secretariat"
  | "executive-assistance";

export type SeniorityLevelId = "trainee" | "junior" | "mid-level" | "senior";

export type ProfessionalArea = {
  id: ProfessionalAreaId;
  name: string;
};

export type ProfessionalSubarea = {
  id: ProfessionalSubareaId;
  areaId: ProfessionalAreaId;
  name: string;
};

export type SeniorityLevel = {
  id: SeniorityLevelId;
  name: string;
};

export const PROFESSIONAL_AREAS: ProfessionalArea[] = [
  { id: "information-technology", name: "Tecnologia da Informação" },
  { id: "hr-management", name: "Gestão de RH" },
  { id: "secretariat", name: "Secretariado" },
];

export const PROFESSIONAL_SUBAREAS: ProfessionalSubarea[] = [
  { id: "frontend-development", areaId: "information-technology", name: "Desenvolvimento Front-end" },
  { id: "backend-development", areaId: "information-technology", name: "Desenvolvimento Back-end" },
  { id: "full-stack-development", areaId: "information-technology", name: "Desenvolvimento Full Stack" },
  { id: "mobile-development", areaId: "information-technology", name: "Desenvolvimento Mobile" },
  { id: "ux-ui-design", areaId: "information-technology", name: "UX/UI Design" },
  { id: "technical-support", areaId: "information-technology", name: "Suporte Técnico" },
  { id: "networks-infrastructure", areaId: "information-technology", name: "Redes e Infraestrutura" },
  { id: "information-security", areaId: "information-technology", name: "Segurança da Informação" },
  { id: "data-business-intelligence", areaId: "information-technology", name: "Dados e Business Intelligence" },
  { id: "data-science", areaId: "information-technology", name: "Ciência de Dados" },
  { id: "quality-testing", areaId: "information-technology", name: "Qualidade e Testes" },
  { id: "it-project-management", areaId: "information-technology", name: "Gestão de Projetos de TI" },
  { id: "people-management", areaId: "hr-management", name: "Gestão de Pessoas" },
  { id: "recruitment-selection", areaId: "hr-management", name: "Recrutamento e Seleção" },
  { id: "executive-secretariat", areaId: "secretariat", name: "Secretariado Executivo" },
  { id: "executive-assistance", areaId: "secretariat", name: "Assessoria Executiva" },
];

export const SENIORITY_LEVELS: SeniorityLevel[] = [
  { id: "trainee", name: "Trainee" },
  { id: "junior", name: "Júnior" },
  { id: "mid-level", name: "Pleno" },
  { id: "senior", name: "Sênior" },
];

export const PROFESSIONAL_AREA_OPTIONS = PROFESSIONAL_AREAS.map((area) => area.name);
export const SENIORITY_LEVEL_OPTIONS = SENIORITY_LEVELS.map((level) => level.name);

export function getProfessionalSubareasByArea(areaId: ProfessionalAreaId) {
  return PROFESSIONAL_SUBAREAS.filter((subarea) => subarea.areaId === areaId);
}

export function getProfessionalAreaName(areaId: ProfessionalAreaId) {
  return PROFESSIONAL_AREAS.find((area) => area.id === areaId)?.name ?? areaId;
}

export function getProfessionalSubareaName(subareaId: ProfessionalSubareaId) {
  return PROFESSIONAL_SUBAREAS.find((subarea) => subarea.id === subareaId)?.name ?? subareaId;
}

export function getSeniorityLevelName(seniorityId: SeniorityLevelId) {
  return SENIORITY_LEVELS.find((level) => level.id === seniorityId)?.name ?? seniorityId;
}
