import { IsIn, MaxLength } from 'class-validator';
import { IsNotBlank } from '../../auth/validators/is-not-blank.validator';
import { FIELD_LIMITS, SKILL_TYPES } from '../profile-catalog';

export class CreateSkillDto {
  @IsIn(SKILL_TYPES, {
    message: 'Tipo de habilidade inválido (TECHNICAL ou BEHAVIORAL).',
  })
  type: string;

  @IsNotBlank({ message: 'Informe o nome da habilidade.' })
  @MaxLength(FIELD_LIMITS.skillName, {
    message: `A habilidade deve ter no máximo ${FIELD_LIMITS.skillName} caracteres.`,
  })
  name: string;
}
