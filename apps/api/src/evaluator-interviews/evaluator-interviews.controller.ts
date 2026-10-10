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
import { EvaluatorInterviewsService } from './evaluator-interviews.service';

function userIdOf(req: Request): number {
  return (req.user as { id: number }).id;
}

// `RolesGuard` lê o metadata `roles` apenas do handler (não da classe), por
// isso `@Roles('EVALUATOR')` fica em cada rota. Nenhuma rota aceita
// identidade do avaliador por corpo, query ou parâmetro: ela vem SEMPRE do
// JWT (user_id) e o serviço a resolve para o evaluator_profile.
@Controller('evaluator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluatorInterviewsController {
  constructor(
    private readonly evaluatorInterviewsService: EvaluatorInterviewsService,
  ) {}

  @Get('interviews')
  @Roles('EVALUATOR')
  list(@Req() req: Request) {
    return this.evaluatorInterviewsService.listAssigned(userIdOf(req));
  }

  @Get('interviews/:id')
  @Roles('EVALUATOR')
  getById(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.evaluatorInterviewsService.getAssignedById(userIdOf(req), id);
  }
}
