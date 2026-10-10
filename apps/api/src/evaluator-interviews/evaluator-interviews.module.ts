import { Module } from '@nestjs/common';
import { EvaluatorEvaluationController } from './evaluator-evaluation.controller';
import { EvaluatorEvaluationService } from './evaluator-evaluation.service';
import { EvaluatorInterviewsController } from './evaluator-interviews.controller';
import { EvaluatorInterviewsService } from './evaluator-interviews.service';

@Module({
  controllers: [EvaluatorInterviewsController, EvaluatorEvaluationController],
  providers: [EvaluatorInterviewsService, EvaluatorEvaluationService],
})
export class EvaluatorInterviewsModule {}
