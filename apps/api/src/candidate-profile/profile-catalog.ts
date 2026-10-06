// Catálogo de áreas/subáreas profissionais aceito pelo backend. Os ids seguem
// o mesmo formato usado hoje pelo front (apps/web/src/app/domain/
// professional-catalog.ts) e são guardados como texto em candidate_profile
// (professional_area / professional_subarea). Mudar o catálogo NÃO exige
// migration — só atualizar este arquivo (e o front).
export const PROFESSIONAL_AREA_SUBAREAS: Readonly<
  Record<string, readonly string[]>
> = {
  'information-technology': [
    'frontend-development',
    'backend-development',
    'full-stack-development',
    'mobile-development',
    'ux-ui-design',
    'technical-support',
    'networks-infrastructure',
    'information-security',
    'data-business-intelligence',
    'data-science',
    'quality-testing',
    'it-project-management',
  ],
  'hr-management': ['people-management', 'recruitment-selection'],
  secretariat: ['executive-secretariat', 'executive-assistance'],
};

export const PROFESSIONAL_AREA_IDS: readonly string[] = Object.keys(
  PROFESSIONAL_AREA_SUBAREAS,
);

export const PROFESSIONAL_SUBAREA_IDS: readonly string[] = Object.values(
  PROFESSIONAL_AREA_SUBAREAS,
).flat();

export function isSubareaOfArea(
  area: string | null | undefined,
  subarea: string | null | undefined,
): boolean {
  if (!area || !subarea) return false;
  return (PROFESSIONAL_AREA_SUBAREAS[area] ?? []).includes(subarea);
}

export const PROFESSIONAL_LEVELS = [
  'TRAINEE',
  'JUNIOR',
  'PLENO',
  'SENIOR',
] as const;

export const CONTRACT_TYPES = ['CLT', 'ESTAGIO', 'PJ', 'TEMPORARIO'] as const;

export const ACADEMIC_LEVELS = [
  'ENSINO_FUNDAMENTAL',
  'ENSINO_MEDIO',
  'TECNICO',
  'TECNOLOGO',
  'GRADUACAO',
  'POS_GRADUACAO',
  'MESTRADO',
  'DOUTORADO',
] as const;

export const EDUCATION_STATUSES = [
  'EM_ANDAMENTO',
  'CONCLUIDO',
  'TRANCADO',
  'INTERROMPIDO',
] as const;

export const COURSE_STATUSES = ['EM_ANDAMENTO', 'CONCLUIDO'] as const;

export const SKILL_TYPES = ['TECHNICAL', 'BEHAVIORAL'] as const;

// Limites de caracteres (validados com o professor) — espelham os VARCHAR do banco.
export const FIELD_LIMITS = {
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

// Teto de registros por seção (proteção contra abuso; não é regra de negócio).
export const RECORD_LIMITS = {
  educations: 10,
  courses: 30,
  experiences: 20,
  skillsPerType: 30,
} as const;

export const MAX_WORKLOAD_HOURS = 10000;
