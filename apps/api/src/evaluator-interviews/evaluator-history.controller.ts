import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EvaluatorHistoryService } from './evaluator-history.service';

function userIdOf(req: Request): number {
  return (req.user as { id: number }).id;
}

// Histórico (avaliações COMPLETED) separado do fluxo ativo (`/evaluator/interviews`,
// ASSIGNED). Somente leitura: só GET. A identidade do avaliador vem SEMPRE do JWT;
// nenhuma rota aceita id de avaliador por corpo, query ou parâmetro.
@Controller('evaluator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluatorHistoryController {
  constructor(private readonly historyService: EvaluatorHistoryService) {}

  @Get('history')
  @Roles('EVALUATOR')
  list(@Req() req: Request) {
    return this.historyService.listCompleted(userIdOf(req));
  }

  @Get('history/:id')
  @Roles('EVALUATOR')
  getById(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.historyService.getCompletedById(userIdOf(req), id);
  }
}
