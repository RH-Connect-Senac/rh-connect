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
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
