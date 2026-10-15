import { Module } from '@nestjs/common';

import { AiEvaluationPersistenceService } from './ai-evaluation-persistence.service';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { AiRateLimiter } from './ai-rate-limiter';
import { InterviewsAiController } from './interviews-ai.controller';
import { InterviewsAiService } from './interviews-ai.service';

// `AiEvaluationPersistenceService` (R3.2) é INERTE: não há controller, rota nem
// executor que o chame ainda. É exportado para o executor da R4 consumir.
// `AiRateLimiter` é exportado para que os guards usados em outros módulos
// (ex.: geração de perguntas) compartilhem O MESMO contador.
@Module({
  controllers: [InterviewsAiController],
  providers: [
    InterviewsAiService,
    AiEvaluationPersistenceService,
    AiRateLimiter,
    AiRateLimitGuard,
  ],
  exports: [InterviewsAiService, AiEvaluationPersistenceService, AiRateLimiter],
})
export class InterviewsAiModule {}
