import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDefined,
  IsInt,
  IsObject,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AiJobContextDto } from './ai-job-context.dto';

// Limites alinhados ao banco: pergunta VARCHAR(500), resposta VARCHAR(1000).
export const AI_EVALUATION_LIMITS = {
  maxAnswers: 20,
  questionText: 500,
  questionType: 30,
  answer: 1000,
} as const;

export class AiAnswerDto {
  @IsInt()
  @Min(1)
  @Max(AI_EVALUATION_LIMITS.maxAnswers)
  questionId: number;

  @IsString()
  @MaxLength(AI_EVALUATION_LIMITS.questionText)
  questionText: string;

  @IsString()
  @MaxLength(AI_EVALUATION_LIMITS.questionType)
  questionType: string;

  // Pode ser vazia: o serviço Python limita a nota de resposta ausente a 0.
  @IsString()
  @MaxLength(AI_EVALUATION_LIMITS.answer)
  answer: string;
}

export class EvaluateDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => AiJobContextDto)
  context: AiJobContextDto;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(AI_EVALUATION_LIMITS.maxAnswers)
  @ArrayUnique((answer: AiAnswerDto) => answer.questionId)
  @ValidateNested({ each: true })
  @Type(() => AiAnswerDto)
  answers: AiAnswerDto[];
}
