import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsNotBlank } from '../../auth/validators/is-not-blank.validator';
import { IsMonth } from '../validators/is-month.validator';
import {
  COURSE_STATUSES,
  FIELD_LIMITS,
  MAX_WORKLOAD_HOURS,
} from '../profile-catalog';

export class CreateCourseDto {
  @IsNotBlank({ message: 'Informe o nome do curso.' })
  @MaxLength(FIELD_LIMITS.courseName, {
    message: `O nome do curso deve ter no máximo ${FIELD_LIMITS.courseName} caracteres.`,
  })
  courseName: string;

  // Instituição/plataforma é opcional.
  @IsOptional()
  @IsString({ message: 'Instituição inválida.' })
  @MaxLength(FIELD_LIMITS.courseInstitution, {
    message: `A instituição deve ter no máximo ${FIELD_LIMITS.courseInstitution} caracteres.`,
  })
  courseInstitution?: string | null;

  @IsOptional()
  @IsInt({ message: 'A carga horária deve ser um número inteiro de horas.' })
  @Min(1, { message: 'A carga horária deve ser de pelo menos 1 hora.' })
  @Max(MAX_WORKLOAD_HOURS, {
    message: `A carga horária deve ser de no máximo ${MAX_WORKLOAD_HOURS} horas.`,
  })
  workloadHours?: number | null;

  // CONCLUIDO exige a data (record-rules); EM_ANDAMENTO: previsão opcional.
  @IsIn(COURSE_STATUSES, { message: 'Situação do curso inválida.' })
  status: string;

  @IsOptional()
  @IsMonth({ message: 'O início deve estar no formato AAAA-MM.' })
  startDate?: string | null;

  @IsOptional()
  @IsMonth({ message: 'A data deve estar no formato AAAA-MM.' })
  completedAt?: string | null;
}

export class UpdateCourseDto {
  @ValidateIf((_o, v) => v !== undefined)
  @IsNotBlank({ message: 'Informe o nome do curso.' })
  @MaxLength(FIELD_LIMITS.courseName, {
    message: `O nome do curso deve ter no máximo ${FIELD_LIMITS.courseName} caracteres.`,
  })
  courseName?: string;

  @IsOptional()
  @IsString({ message: 'Instituição inválida.' })
  @MaxLength(FIELD_LIMITS.courseInstitution, {
    message: `A instituição deve ter no máximo ${FIELD_LIMITS.courseInstitution} caracteres.`,
  })
  courseInstitution?: string | null;

  @IsOptional()
  @IsInt({ message: 'A carga horária deve ser um número inteiro de horas.' })
  @Min(1, { message: 'A carga horária deve ser de pelo menos 1 hora.' })
  @Max(MAX_WORKLOAD_HOURS, {
    message: `A carga horária deve ser de no máximo ${MAX_WORKLOAD_HOURS} horas.`,
  })
  workloadHours?: number | null;

  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(COURSE_STATUSES, { message: 'Situação do curso inválida.' })
  status?: string;

  @IsOptional()
  @IsMonth({ message: 'O início deve estar no formato AAAA-MM.' })
  startDate?: string | null;

  @IsOptional()
  @IsMonth({ message: 'A data deve estar no formato AAAA-MM.' })
  completedAt?: string | null;
}
