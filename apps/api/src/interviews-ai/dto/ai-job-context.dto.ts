import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  JOB_LIMITS,
  JOB_WORK_MODES,
  type JobWorkMode,
} from '../../interviews/job-context';

// Contexto da vaga enviado ao provedor de IA. Os limites são os MESMOS da
// entrevista persistida (JOB_LIMITS): nada maior que o banco aceitaria chega
// ao prompt. Campos fora desta lista são descartados (whitelist global).
export class AiJobContextDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(JOB_LIMITS.title)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(JOB_LIMITS.company)
  company?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(JOB_LIMITS.summary)
  summary?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(JOB_LIMITS.listMaxItems)
  @IsString({ each: true })
  @MaxLength(JOB_LIMITS.listItemLength, { each: true })
  activities?: string[] | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(JOB_LIMITS.listMaxItems)
  @IsString({ each: true })
  @MaxLength(JOB_LIMITS.listItemLength, { each: true })
  requirements?: string[] | null;

  @IsOptional()
  @IsString()
  @MaxLength(JOB_LIMITS.location)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(JOB_LIMITS.contractType)
  contractType?: string | null;

  @IsOptional()
  @IsIn(JOB_WORK_MODES)
  workMode?: JobWorkMode | null;

  @IsOptional()
  @IsString()
  @MaxLength(JOB_LIMITS.sourceUrl)
  sourceUrl?: string | null;
}
