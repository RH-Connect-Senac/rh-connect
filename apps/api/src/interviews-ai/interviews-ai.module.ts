import { Module } from '@nestjs/common';

import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { AiRateLimiter } from './ai-rate-limiter';
import { InterviewsAiController } from './interviews-ai.controller';
import { InterviewsAiService } from './interviews-ai.service';

// `AiRateLimiter` é exportado para que os guards usados em outros módulos
// (ex.: geração de perguntas) compartilhem O MESMO contador.
@Module({
  controllers: [InterviewsAiController],
  providers: [InterviewsAiService, AiRateLimiter, AiRateLimitGuard],
  exports: [InterviewsAiService, AiRateLimiter],
})
export class InterviewsAiModule {}
