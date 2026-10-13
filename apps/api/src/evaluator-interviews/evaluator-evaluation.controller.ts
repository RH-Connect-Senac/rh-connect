import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EvaluatorEvaluationService } from './evaluator-evaluation.service';

function userIdOf(req: Request): number {
  return (req.user as { id: number }).id;
}

// O corpo é validado por `parseDraftInput` (chaves dinâmicas de critério), não
// por class-validator. A identidade do avaliador vem só do JWT.
@Controller('evaluator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluatorEvaluationController {
  constructor(private readonly evaluationService: EvaluatorEvaluationService) {}

  @Get('interviews/:id/evaluation')
  @Roles('EVALUATOR')
  get(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.evaluationService.getEvaluation(userIdOf(req), id);
  }

  @Put('interviews/:id/evaluation')
  @Roles('EVALUATOR')
  save(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    return this.evaluationService.saveDraft(userIdOf(req), id, body);
  }
}
