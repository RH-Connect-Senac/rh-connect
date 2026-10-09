import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidationOptions,
  registerDecorator,
} from 'class-validator';
import { IsNotBlank } from '../../auth/validators/is-not-blank.validator';
import {
  JOB_INPUT_LIMITS,
  JOB_LIMITS,
  JOB_WORK_MODES,
  normalizeMultiLine,
  normalizeSingleLine,
  textLength,
  type JobWorkMode,
} from '../job-context';

// Limite físico (VARCHAR) medido sobre o texto JÁ normalizado (espaços/trim),
// em pontos de código, exatamente como o banco conta. Acima do limite => 400;
// o conteúdo nunca é cortado em silêncio. null/undefined não são validados
// aqui (campos opcionais usam @IsOptional()).
function MaxNormalizedLength(
  max: number,
  mode: 'single' | 'multi',
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxNormalizedLength',
      target: object.constructor,
      propertyName,
      constraints: [max],
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return true; // @IsString cuida do tipo
          const text =
            mode === 'single'
              ? normalizeSingleLine(value)
              : normalizeMultiLine(value);
          return textLength(text) <= max;
        },
        defaultMessage() {
          return `${propertyName} deve ter no máximo ${max} caracteres.`;
        },
      },
    });
  };
}

// Corpo de POST /interviews: SOMENTE o contexto da vaga. Dono (candidato),
// status e modalidade nunca vêm do cliente. Campos extras (ex.: candidateId)
// são descartados pelo ValidationPipe global (`whitelist: true`).
export class CreateInterviewDto {
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(JOB_LIMITS.sourceUrl)
  sourceUrl: string;

  @IsNotBlank({ message: 'Informe o título da vaga.' })
  @MaxNormalizedLength(JOB_LIMITS.title, 'single', {
    message: `O título da vaga deve ter no máximo ${JOB_LIMITS.title} caracteres.`,
  })
  title: string;

  @IsOptional()
  @IsString()
  @MaxNormalizedLength(JOB_LIMITS.company, 'single', {
    message: `A empresa deve ter no máximo ${JOB_LIMITS.company} caracteres.`,
  })
  company?: string | null;

  @IsOptional()
  @IsString()
  @MaxNormalizedLength(JOB_LIMITS.summary, 'multi', {
    message: `O resumo da vaga deve ter no máximo ${JOB_LIMITS.summary} caracteres.`,
  })
  summary?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(JOB_INPUT_LIMITS.listMaxItems)
  @IsString({ each: true })
  @MaxLength(JOB_INPUT_LIMITS.text, { each: true })
  activities?: string[] | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(JOB_INPUT_LIMITS.listMaxItems)
  @IsString({ each: true })
  @MaxLength(JOB_INPUT_LIMITS.text, { each: true })
  requirements?: string[] | null;

  @IsOptional()
  @IsString()
  @MaxNormalizedLength(JOB_LIMITS.location, 'single', {
    message: `A localização deve ter no máximo ${JOB_LIMITS.location} caracteres.`,
  })
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxNormalizedLength(JOB_LIMITS.contractType, 'single', {
    message: `O tipo de contrato deve ter no máximo ${JOB_LIMITS.contractType} caracteres.`,
  })
  contractType?: string | null;

  @IsOptional()
  @IsIn(JOB_WORK_MODES, {
    message: 'workMode inválido (REMOTE, HYBRID ou ONSITE).',
  })
  workMode?: JobWorkMode | null;
}
