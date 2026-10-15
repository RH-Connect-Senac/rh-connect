import { Module } from '@nestjs/common';

import { AiEvaluationClaimRepository } from './ai-evaluation-claim.repository';
import { AiEvaluationPersistenceService } from './ai-evaluation-persistence.service';
import { AiEvaluationPipelineService } from './ai-evaluation-pipeline.service';
import {
  AI_EVALUATION_WORKER_ENV,
  AiEvaluationWorkerService,
} from './ai-evaluation-worker.service';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { AiRateLimiter } from './ai-rate-limiter';
import { InterviewsAiController } from './interviews-ai.controller';
import { InterviewsAiService } from './interviews-ai.service';

// `AiEvaluationPersistenceService` (R3.2), `AiEvaluationPipelineService`
// (R3.3a-3) e `AiEvaluationClaimRepository` (R3.3a-4a) não têm controller nem rota.
// `AiEvaluationWorkerService` (R3.3a-4c) é o único que os chama e fica DESABILITADO
// por padrão (AI_EVALUATION_WORKER_ENABLED): sem configuração explícita e válida
// não reivindica nem processa nada.
// `AiRateLimiter` é exportado para que os guards usados em outros módulos
// (ex.: geração de perguntas) compartilhem O MESMO contador.
@Module({
  controllers: [InterviewsAiController],
  providers: [
    InterviewsAiService,
    AiEvaluationPersistenceService,
    AiEvaluationPipelineService,
    AiEvaluationClaimRepository,
    AiEvaluationWorkerService,
    { provide: AI_EVALUATION_WORKER_ENV, useFactory: () => process.env },
    AiRateLimiter,
    AiRateLimitGuard,
  ],
  exports: [
    InterviewsAiService,
    AiEvaluationPersistenceService,
    AiEvaluationPipelineService,
    AiEvaluationClaimRepository,
    AiRateLimiter,
  ],
})
export class InterviewsAiModule {}
