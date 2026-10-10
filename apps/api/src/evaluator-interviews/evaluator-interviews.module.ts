import { Module } from '@nestjs/common';
import { EvaluatorCompletionController } from './evaluator-completion.controller';
import { EvaluatorCompletionService } from './evaluator-completion.service';
import { EvaluatorEvaluationController } from './evaluator-evaluation.controller';
import { EvaluatorEvaluationService } from './evaluator-evaluation.service';
import { EvaluatorInterviewsController } from './evaluator-interviews.controller';
import { EvaluatorInterviewsService } from './evaluator-interviews.service';

@Module({
  controllers: [
    EvaluatorInterviewsController,
    EvaluatorEvaluationController,
    EvaluatorCompletionController,
  ],
  providers: [
    EvaluatorInterviewsService,
    EvaluatorEvaluationService,
    EvaluatorCompletionService,
  ],
})
export class EvaluatorInterviewsModule {}
