import { Module } from '@nestjs/common';

import { InterviewsAiController } from './interviews-ai.controller';
import { InterviewsAiService } from './interviews-ai.service';

@Module({
  controllers: [InterviewsAiController],
  providers: [InterviewsAiService],
})
export class InterviewsAiModule {}
