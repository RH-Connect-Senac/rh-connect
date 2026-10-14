import { Module } from '@nestjs/common';
import { InterviewsAiModule } from '../interviews-ai/interviews-ai.module';
import { MaterialRecommendationSnapshotModule } from '../material-recommendation-snapshots/material-recommendation-snapshot.module';
import { InterviewQuestionsController } from './interview-questions.controller';
import { InterviewQuestionsService } from './interview-questions.service';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

@Module({
  imports: [InterviewsAiModule, MaterialRecommendationSnapshotModule],
  controllers: [InterviewsController, InterviewQuestionsController],
  providers: [InterviewsService, InterviewQuestionsService],
  exports: [InterviewsService, InterviewQuestionsService],
})
export class InterviewsModule {}
