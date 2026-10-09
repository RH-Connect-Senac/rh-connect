import { IsIn, IsOptional } from 'class-validator';
import { EVALUATION_MODES, type EvaluationMode } from '../interview-flow';

// Corpo (opcional) de POST /interviews/:id/submit. Se omitido, vale a
// modalidade já escolhida em PATCH /evaluation-mode.
export class SubmitInterviewDto {
  @IsOptional()
  @IsIn(EVALUATION_MODES, { message: 'Modalidade de avaliação inválida.' })
  evaluationMode?: EvaluationMode;
}
