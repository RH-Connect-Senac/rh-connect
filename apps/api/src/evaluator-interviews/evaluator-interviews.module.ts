import { Module } from '@nestjs/common';
import { MaterialRecommendationSnapshotModule } from '../material-recommendation-snapshots/material-recommendation-snapshot.module';
import { EvaluatorCompletionController } from './evaluator-completion.controller';
import { EvaluatorCompletionService } from './evaluator-completion.service';
import { EvaluatorEvaluationController } from './evaluator-evaluation.controller';
import { EvaluatorEvaluationService } from './evaluator-evaluation.service';
import { EvaluatorHistoryController } from './evaluator-history.controller';
import { EvaluatorHistoryService } from './evaluator-history.service';
import { EvaluatorInterviewsController } from './evaluator-interviews.controller';
import { EvaluatorInterviewsService } from './evaluator-interviews.service';

@Module({
  imports: [MaterialRecommendationSnapshotModule],
  controllers: [
    EvaluatorInterviewsController,
    EvaluatorEvaluationController,
    EvaluatorCompletionController,
    EvaluatorHistoryController,
  ],
  providers: [
    EvaluatorInterviewsService,
    EvaluatorEvaluationService,
    EvaluatorCompletionService,
    EvaluatorHistoryService,
  ],
})
export class EvaluatorInterviewsModule {}
