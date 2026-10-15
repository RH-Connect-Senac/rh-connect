import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AiRateLimitGuard } from './ai-rate-limit.guard';
import { EvaluateDto } from './dto/evaluate.dto';
import { JobContextDto } from './dto/job-context.dto';
import { QuestionsDto } from './dto/questions.dto';
import { InterviewsAiService } from './interviews-ai.service';

// Todas as rotas exigem JWT + papel + cota de IA (nessa ordem: quem não está
// autenticado/autorizado nem consome cota). `RolesGuard` lê o metadata `roles`
// apenas do handler, por isso `@Roles` fica em CADA rota.
//
// - job-context: usado pelo wizard do candidato (único fluxo real que chama
//   estas rotas). Só candidato; a URL é restrita à Empregare (ver job-url.ts).
// - questions / evaluate: nenhuma tela as chama (a geração real é
//   `POST /interviews/:id/questions/generate`, que usa o serviço direto, com
//   dono da entrevista no WHERE). Como recebem contexto/respostas arbitrários
//   e não têm entrevista para validar propriedade, ficam restritas a ADMIN
//   (diagnóstico). O executor da avaliação automática NÃO passa por HTTP.
@Controller('interviews/ai')
@UseGuards(JwtAuthGuard, RolesGuard, AiRateLimitGuard)
export class InterviewsAiController {
  constructor(private readonly interviewsAiService: InterviewsAiService) {}

  @Post('job-context')
  @Roles('CANDIDATE')
  getJobContext(@Body() dto: JobContextDto) {
    return this.interviewsAiService.getJobContext({ url: dto.url });
  }

  @Post('questions')
  @Roles('ADMIN')
  generateQuestions(@Body() dto: QuestionsDto) {
    return this.interviewsAiService.generateQuestions({ ...dto });
  }

  @Post('evaluate')
  @Roles('ADMIN')
  evaluate(@Body() dto: EvaluateDto) {
    return this.interviewsAiService.evaluate({ ...dto });
  }
}
