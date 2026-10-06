import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  CONTRACT_TYPES,
  FIELD_LIMITS,
  PROFESSIONAL_AREA_IDS,
  PROFESSIONAL_LEVELS,
  PROFESSIONAL_SUBAREA_IDS,
} from '../profile-catalog';

// PATCH parcial: campo ausente = não altera; null ou "" = limpa o campo.
// A compatibilidade área/subárea é checada no service (depende do estado atual).
export class UpdateCandidateProfileDto {
  @IsOptional()
  @IsString({ message: 'Título profissional inválido.' })
  @MaxLength(FIELD_LIMITS.professionalTitle, {
    message: `O título profissional deve ter no máximo ${FIELD_LIMITS.professionalTitle} caracteres.`,
  })
  professionalTitle?: string | null;

  @IsOptional()
  @IsIn(PROFESSIONAL_AREA_IDS, { message: 'Área profissional inválida.' })
  professionalArea?: string | null;

  @IsOptional()
  @IsIn(PROFESSIONAL_SUBAREA_IDS, { message: 'Subárea profissional inválida.' })
  professionalSubarea?: string | null;

  @IsOptional()
  @IsString({ message: 'Cargo desejado inválido.' })
  @MaxLength(FIELD_LIMITS.desiredPosition, {
    message: `O cargo desejado deve ter no máximo ${FIELD_LIMITS.desiredPosition} caracteres.`,
  })
  desiredPosition?: string | null;

  @IsOptional()
  @IsIn(PROFESSIONAL_LEVELS, { message: 'Senioridade inválida.' })
  professionalLevel?: string | null;

  @IsOptional()
  @IsIn(CONTRACT_TYPES, { message: 'Tipo de contrato inválido.' })
  contractType?: string | null;

  @IsOptional()
  @IsString({ message: 'Resumo profissional inválido.' })
  @MaxLength(FIELD_LIMITS.professionalSummary, {
    message: `O resumo profissional deve ter no máximo ${FIELD_LIMITS.professionalSummary} caracteres.`,
  })
  professionalSummary?: string | null;
}
