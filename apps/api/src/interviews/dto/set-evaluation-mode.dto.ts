import { IsIn } from 'class-validator';
import { EVALUATION_MODES, type EvaluationMode } from '../interview-flow';

// Corpo de PATCH /interviews/:id/evaluation-mode.
export class SetEvaluationModeDto {
  @IsIn(EVALUATION_MODES, { message: 'Modalidade de avaliação inválida.' })
  evaluationMode: EvaluationMode;
}
