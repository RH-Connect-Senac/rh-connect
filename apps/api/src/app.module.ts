import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InterviewsAiModule } from './interviews-ai/interviews-ai.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ExternalResourcesModule } from './external-resources/external-resources.module';
import { AdminCandidatesModule } from './admin-candidates/admin-candidates.module';
import { CandidateProfileModule } from './candidate-profile/candidate-profile.module';
import { InterviewsModule } from './interviews/interviews.module';
import { AdminInterviewsModule } from './admin-interviews/admin-interviews.module';
import { EvaluatorInterviewsModule } from './evaluator-interviews/evaluator-interviews.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    InterviewsAiModule,
    ExternalResourcesModule,
    FeedbackModule,
    AdminCandidatesModule,
    CandidateProfileModule,
    InterviewsModule,
    AdminInterviewsModule,
    EvaluatorInterviewsModule,
    AdminDashboardModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
