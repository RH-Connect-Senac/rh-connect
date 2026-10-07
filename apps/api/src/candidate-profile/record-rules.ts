import { currentMonth } from './month-date';

// Regras entre campos de cada registro (datas x situação). Funções puras que
// devolvem a lista de mensagens de erro (vazia = válido). Comparação de
// "AAAA-MM" como string é segura (formato fixo, ordem lexicográfica = cronológica).

export interface EducationRuleInput {
  status: string;
  academicLevel: string;
  degree: string | null;
  educationInstitution: string | null;
  startDate: string | null;
  endDate: string | null;
}

// Níveis em que o curso/formação (degree) é opcional.
const LEVELS_WITHOUT_REQUIRED_DEGREE = ['ENSINO_FUNDAMENTAL', 'ENSINO_MEDIO'];

function hasText(value: string | null): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

// Formação válida: nível + situação (validados no DTO), instituição e início
// obrigatórios; curso/formação obrigatório, exceto em Ensino Fundamental/Médio.
// Término: obrigatório quando CONCLUIDO (conclusão real, não futura); opcional
// quando EM_ANDAMENTO (previsão de conclusão, pode ser futura); nunca anterior
// ao início. Nas demais situações, se informado, não pode ser futuro.
export function validateEducationRules(
  data: EducationRuleInput,
  now: Date = new Date(),
): string[] {
  const errors: string[] = [];
  const nowMonth = currentMonth(now);
  if (!hasText(data.educationInstitution)) {
    errors.push('Informe a instituição.');
  }
  if (
    !LEVELS_WITHOUT_REQUIRED_DEGREE.includes(data.academicLevel) &&
    !hasText(data.degree)
  ) {
    errors.push('Informe o curso/formação.');
  }
  if (data.startDate === null) {
    errors.push('Informe a data de início da formação.');
  } else if (data.startDate > nowMonth) {
    errors.push('A data de início da formação não pode ser futura.');
  }
  if (data.status === 'CONCLUIDO' && data.endDate === null) {
    errors.push('Informe a data de conclusão da formação concluída.');
  }
  if (
    data.startDate !== null &&
    data.endDate !== null &&
    data.endDate < data.startDate
  ) {
    errors.push('A data de conclusão não pode ser anterior ao início.');
  }
  if (
    data.status !== 'EM_ANDAMENTO' &&
    data.endDate !== null &&
    data.endDate > nowMonth
  ) {
    errors.push('A data de conclusão não pode ser futura.');
  }
  return errors;
}

export interface CourseRuleInput {
  status: string;
  startDate: string | null;
  completedAt: string | null;
}

export function validateCourseRules(
  data: CourseRuleInput,
  now: Date = new Date(),
): string[] {
  const errors: string[] = [];
  // Início é sempre opcional. Conclusão/previsão nunca anterior ao início.
  // CONCLUIDO: conclusão real, obrigatória e não futura.
  // EM_ANDAMENTO: data opcional (previsão), pode ser futura.
  // Datas muito antigas (> 70 anos) não são erro: só aviso de plausibilidade no front.
  if (
    data.startDate !== null &&
    data.completedAt !== null &&
    data.completedAt < data.startDate
  ) {
    errors.push('A data de conclusão não pode ser anterior ao início do curso.');
  }
  if (data.status === 'CONCLUIDO') {
    if (data.completedAt === null) {
      errors.push('Informe a data de conclusão do curso concluído.');
    } else if (data.completedAt > currentMonth(now)) {
      errors.push('A data de conclusão do curso não pode ser futura.');
    }
  }
  return errors;
}

export interface ExperienceRuleInput {
  isCurrent: boolean;
  startDate: string;
  endDate: string | null;
}

export function validateExperienceRules(
  data: ExperienceRuleInput,
  now: Date = new Date(),
): string[] {
  const errors: string[] = [];
  const nowMonth = currentMonth(now);
  if (data.startDate > nowMonth) {
    errors.push('A data de início da experiência não pode ser futura.');
  }
  if (data.isCurrent) {
    if (data.endDate !== null) {
      errors.push('Experiência atual não deve ter data de término.');
    }
  } else if (data.endDate === null) {
    errors.push('Informe a data de término da experiência.');
  } else {
    if (data.endDate < data.startDate) {
      errors.push('A data de término não pode ser anterior ao início.');
    }
    if (data.endDate > nowMonth) {
      errors.push('A data de término não pode ser futura.');
    }
  }
  return errors;
}
