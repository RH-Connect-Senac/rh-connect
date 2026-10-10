import { Module } from '@nestjs/common';
import { EvaluatorInterviewsController } from './evaluator-interviews.controller';
import { EvaluatorInterviewsService } from './evaluator-interviews.service';

@Module({
  controllers: [EvaluatorInterviewsController],
  providers: [EvaluatorInterviewsService],
})
export class EvaluatorInterviewsModule {}
