import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsNotBlank } from '../../auth/validators/is-not-blank.validator';
import { IsMonth } from '../validators/is-month.validator';
import {
  ACADEMIC_LEVELS,
  EDUCATION_STATUSES,
  FIELD_LIMITS,
} from '../profile-catalog';

// Formação válida = nível + situação + instituição + início. O curso/formação
// (`degree`) é obrigatório exceto em Ensino Fundamental/Médio, e o término
// depende da situação; essas regras entre campos ficam em record-rules, sobre o
// estado resultante.
export class CreateEducationDto {
  @IsOptional()
  @IsString({ message: 'Curso/formação inválido.' })
  @MaxLength(FIELD_LIMITS.degree, {
    message: `O curso deve ter no máximo ${FIELD_LIMITS.degree} caracteres.`,
  })
  degree?: string | null;

  @IsString({ message: 'Informe a instituição.' })
  @IsNotBlank({ message: 'Informe a instituição.' })
  @MaxLength(FIELD_LIMITS.educationInstitution, {
    message: `A instituição deve ter no máximo ${FIELD_LIMITS.educationInstitution} caracteres.`,
  })
  educationInstitution: string;

  @IsIn(ACADEMIC_LEVELS, { message: 'Nível de formação inválido.' })
  academicLevel: string;

  @IsIn(EDUCATION_STATUSES, { message: 'Situação da formação inválida.' })
  status: string;

  @IsMonth({ message: 'O início deve estar no formato AAAA-MM.' })
  startDate: string;

  @IsOptional()
  @IsMonth({ message: 'A conclusão deve estar no formato AAAA-MM.' })
  endDate?: string | null;
}

// PATCH parcial. Instituição, nível, situação e início não aceitam null; curso
// e término aceitam null para limpar (regras entre campos checadas no service).
export class UpdateEducationDto {
  @IsOptional()
  @IsString({ message: 'Curso/formação inválido.' })
  @MaxLength(FIELD_LIMITS.degree, {
    message: `O curso deve ter no máximo ${FIELD_LIMITS.degree} caracteres.`,
  })
  degree?: string | null;

  @ValidateIf((_o, v) => v !== undefined)
  @IsString({ message: 'Informe a instituição.' })
  @IsNotBlank({ message: 'Informe a instituição.' })
  @MaxLength(FIELD_LIMITS.educationInstitution, {
    message: `A instituição deve ter no máximo ${FIELD_LIMITS.educationInstitution} caracteres.`,
  })
  educationInstitution?: string;

  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(ACADEMIC_LEVELS, { message: 'Nível de formação inválido.' })
  academicLevel?: string;

  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(EDUCATION_STATUSES, { message: 'Situação da formação inválida.' })
  status?: string;

  @ValidateIf((_o, v) => v !== undefined)
  @IsMonth({ message: 'O início deve estar no formato AAAA-MM.' })
  startDate?: string;

  @IsOptional()
  @IsMonth({ message: 'A conclusão deve estar no formato AAAA-MM.' })
  endDate?: string | null;
}
