import { Module } from '@nestjs/common';

import { AiEvaluationPersistenceService } from './ai-evaluation-persistence.service';
import { AiEvaluationPipelineService } from './ai-evaluation-pipeline.service';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { AiRateLimiter } from './ai-rate-limiter';
import { InterviewsAiController } from './interviews-ai.controller';
import { InterviewsAiService } from './interviews-ai.service';

// `AiEvaluationPersistenceService` (R3.2) e `AiEvaluationPipelineService`
// (R3.3a-3) são INERTES: não há controller, rota, worker nem agendador que os
// chame ainda. São exportados para o executor (R3.3a-4) consumir.
// `AiRateLimiter` é exportado para que os guards usados em outros módulos
// (ex.: geração de perguntas) compartilhem O MESMO contador.
@Module({
  controllers: [InterviewsAiController],
  providers: [
    InterviewsAiService,
    AiEvaluationPersistenceService,
    AiEvaluationPipelineService,
    AiRateLimiter,
    AiRateLimitGuard,
  ],
  exports: [
    InterviewsAiService,
    AiEvaluationPersistenceService,
    AiEvaluationPipelineService,
    AiRateLimiter,
  ],
})
export class InterviewsAiModule {}
