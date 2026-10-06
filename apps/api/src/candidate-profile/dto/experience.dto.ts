import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { IsNotBlank } from '../../auth/validators/is-not-blank.validator';
import { IsMonth } from '../validators/is-month.validator';
import { FIELD_LIMITS } from '../profile-catalog';

export class CreateExperienceDto {
  @IsNotBlank({ message: 'Informe a empresa.' })
  @MaxLength(FIELD_LIMITS.companyName, {
    message: `A empresa deve ter no máximo ${FIELD_LIMITS.companyName} caracteres.`,
  })
  companyName: string;

  @IsNotBlank({ message: 'Informe o cargo.' })
  @MaxLength(FIELD_LIMITS.jobRole, {
    message: `O cargo deve ter no máximo ${FIELD_LIMITS.jobRole} caracteres.`,
  })
  jobRole: string;

  @IsMonth({ message: 'O início deve estar no formato AAAA-MM.' })
  startDate: string;

  @IsOptional()
  @IsMonth({ message: 'O término deve estar no formato AAAA-MM.' })
  endDate?: string | null;

  @IsBoolean({ message: 'isCurrent deve ser verdadeiro ou falso.' })
  isCurrent: boolean;

  @IsOptional()
  @IsString({ message: 'Descrição inválida.' })
  @MaxLength(FIELD_LIMITS.description, {
    message: `A descrição deve ter no máximo ${FIELD_LIMITS.description} caracteres.`,
  })
  description?: string | null;
}

export class UpdateExperienceDto {
  @ValidateIf((_o, v) => v !== undefined)
  @IsNotBlank({ message: 'Informe a empresa.' })
  @MaxLength(FIELD_LIMITS.companyName, {
    message: `A empresa deve ter no máximo ${FIELD_LIMITS.companyName} caracteres.`,
  })
  companyName?: string;

  @ValidateIf((_o, v) => v !== undefined)
  @IsNotBlank({ message: 'Informe o cargo.' })
  @MaxLength(FIELD_LIMITS.jobRole, {
    message: `O cargo deve ter no máximo ${FIELD_LIMITS.jobRole} caracteres.`,
  })
  jobRole?: string;

  @ValidateIf((_o, v) => v !== undefined)
  @IsMonth({ message: 'O início deve estar no formato AAAA-MM.' })
  startDate?: string;

  @IsOptional()
  @IsMonth({ message: 'O término deve estar no formato AAAA-MM.' })
  endDate?: string | null;

  @ValidateIf((_o, v) => v !== undefined)
  @IsBoolean({ message: 'isCurrent deve ser verdadeiro ou falso.' })
  isCurrent?: boolean;

  @IsOptional()
  @IsString({ message: 'Descrição inválida.' })
  @MaxLength(FIELD_LIMITS.description, {
    message: `A descrição deve ter no máximo ${FIELD_LIMITS.description} caracteres.`,
  })
  description?: string | null;
}
