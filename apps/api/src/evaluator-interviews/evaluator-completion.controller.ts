import {
  Controller,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EvaluatorCompletionService } from './evaluator-completion.service';

function userIdOf(req: Request): number {
  return (req.user as { id: number }).id;
}

// Sem corpo: nada de status, nota final ou avaliador vem do cliente.
@Controller('evaluator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluatorCompletionController {
  constructor(private readonly completionService: EvaluatorCompletionService) {}

  @Post('interviews/:id/evaluation/complete')
  @HttpCode(200)
  @Roles('EVALUATOR')
  complete(@Req() req: Request, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.completionService.complete(userIdOf(req), id);
  }
}
