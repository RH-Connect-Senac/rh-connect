import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MaterialRecommendationResultService } from '../material-recommendation-snapshots/material-recommendation-result.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { SetEvaluationModeDto } from './dto/set-evaluation-mode.dto';
import { SubmitInterviewDto } from './dto/submit-interview.dto';
import { InterviewsService } from './interviews.service';

function userIdOf(req: Request): number {
  return (req.user as { id: number }).id;
}

// `RolesGuard` lê o metadata `roles` apenas do handler (não da classe), por
// isso `@Roles('CANDIDATE')` fica em cada rota. O dono da entrevista é sempre
// o usuário do JWT: nenhum candidateId é aceito do cliente.
@Controller('interviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InterviewsController {
  constructor(
    private readonly interviewsService: InterviewsService,
    private readonly materialRecommendations: MaterialRecommendationResultService,
  ) {}

  @Post()
  @Roles('CANDIDATE')
  create(@Req() req: Request, @Body() dto: CreateInterviewDto) {
    return this.interviewsService.create(userIdOf(req), dto);
  }

  // DECLARADA ANTES de `:id`: senão "in-progress" seria lida como id (e rejeitada
  // pelo ParseUUIDPipe). Lista as entrevistas IN_PROGRESS do próprio candidato.
  @Get('in-progress')
  @Roles('CANDIDATE')
  listInProgress(@Req() req: Request) {
    return this.interviewsService.listInProgress(userIdOf(req));
  }

  // Histórico real do candidato (todas as entrevistas dele, mais recente
  // primeiro). DECLARADA sem parâmetro: não conflita com `:id`.
  @Get()
  @Roles('CANDIDATE')
  list(@Req() req: Request) {
    return this.interviewsService.listHistory(userIdOf(req));
  }

  // Resultado persistido (HUMAN concluída). `:id/result` não conflita com `:id`.
  // `getResult` decide TUDO sobre acesso (dono no WHERE, HUMAN, COMPLETED; senão
  // 404/409). Só depois disso entram as recomendações de materiais (snapshot,
  // gerado sob demanda se faltar). Falha nelas nunca derruba o resultado: o
  // serviço não lança e a lista vem vazia.
  @Get(':id/result')
  @Roles('CANDIDATE')
  async getResult(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const result = await this.interviewsService.getResult(userIdOf(req), id);
    const materialRecommendations =
      await this.materialRecommendations.listForInterview(id);
    return { ...result, materialRecommendations };
  }

  @Get(':id')
  @Roles('CANDIDATE')
  getById(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.interviewsService.getOwned(userIdOf(req), id);
  }

  @Patch(':id/evaluation-mode')
  @Roles('CANDIDATE')
  setEvaluationMode(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SetEvaluationModeDto,
  ) {
    return this.interviewsService.setEvaluationMode(
      userIdOf(req),
      id,
      dto.evaluationMode,
    );
  }

  // Ação explícita e GLOBAL: encerra a entrevista IN_PROGRESS do próprio candidato
  // (todos os dispositivos). Idempotente para CANCELLED.
  @Post(':id/cancel')
  @HttpCode(200)
  @Roles('CANDIDATE')
  cancel(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.interviewsService.cancel(userIdOf(req), id);
  }

  @Post(':id/submit')
  @HttpCode(200)
  @Roles('CANDIDATE')
  submit(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitInterviewDto,
  ) {
    return this.interviewsService.submit(userIdOf(req), id, dto.evaluationMode);
  }
}
