import { isLevelApplicable, isSubareaOfArea } from './profile-catalog';

// Regra de completude do Perfil Profissional — fonte da verdade no backend.
// Função pura: recebe o estado do perfil e devolve o que falta. O front só
// exibe; qualquer bloqueio (ex.: criar entrevista) deve repetir esta checagem
// no servidor.
export type ProfileSection =
  | 'objective'
  | 'education'
  | 'courses'
  | 'experience'
  | 'technicalSkills'
  | 'behavioralSkills';

export type ObjectiveField =
  | 'professionalTitle'
  | 'professionalArea'
  | 'professionalSubarea'
  | 'desiredPosition'
  | 'professionalLevel'
  | 'contractType'
  | 'professionalSummary';

export interface CompletenessInput {
  professionalTitle: string | null;
  professionalArea: string | null;
  professionalSubarea: string | null;
  desiredPosition: string | null;
  professionalLevel: string | null;
  contractType: string | null;
  professionalSummary: string | null;
  educationCount: number;
  courseCount: number;
  experienceCount: number;
  technicalSkillCount: number;
  behavioralSkillCount: number;
  coursesNoneDeclaredAt: Date | null;
  experienceNoneDeclaredAt: Date | null;
  technicalSkillsNoneDeclaredAt: Date | null;
}

export interface CompletenessResult {
  isComplete: boolean;
  missingSections: ProfileSection[];
  missingObjectiveFields: ObjectiveField[];
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getMissingObjectiveFields(
  input: Pick<
    CompletenessInput,
    | 'professionalTitle'
    | 'professionalArea'
    | 'professionalSubarea'
    | 'desiredPosition'
    | 'professionalLevel'
    | 'contractType'
    | 'professionalSummary'
  >,
): ObjectiveField[] {
  const missing: ObjectiveField[] = [];
  if (!hasText(input.professionalTitle)) missing.push('professionalTitle');
  if (!hasText(input.professionalArea)) missing.push('professionalArea');
  // Subárea só conta se for compatível com a área escolhida.
  if (!isSubareaOfArea(input.professionalArea, input.professionalSubarea)) {
    missing.push('professionalSubarea');
  }
  if (!hasText(input.desiredPosition)) missing.push('desiredPosition');
  // Estágio: senioridade não se aplica, então não é exigida.
  if (isLevelApplicable(input.contractType) && !input.professionalLevel) {
    missing.push('professionalLevel');
  }
  if (!input.contractType) missing.push('contractType');
  if (!hasText(input.professionalSummary)) missing.push('professionalSummary');
  return missing;
}

export function evaluateProfileCompleteness(
  input: CompletenessInput,
): CompletenessResult {
  const missingObjectiveFields = getMissingObjectiveFields(input);
  const missingSections: ProfileSection[] = [];

  if (missingObjectiveFields.length > 0) missingSections.push('objective');
  if (input.educationCount < 1) missingSections.push('education');
  if (input.courseCount < 1 && !input.coursesNoneDeclaredAt) {
    missingSections.push('courses');
  }
  if (input.experienceCount < 1 && !input.experienceNoneDeclaredAt) {
    missingSections.push('experience');
  }
  if (input.technicalSkillCount < 1 && !input.technicalSkillsNoneDeclaredAt) {
    missingSections.push('technicalSkills');
  }
  if (input.behavioralSkillCount < 1) missingSections.push('behavioralSkills');

  return {
    isComplete: missingSections.length === 0,
    missingSections,
    missingObjectiveFields,
  };
}
