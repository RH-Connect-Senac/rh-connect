import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { parseCandidateIdFilter } from './admin-rules';
import { AdminInterviewsService } from './admin-interviews.service';
import { AssignInterviewDto } from './dto/assign-interview.dto';

function userIdOf(req: Request): number {
  return (req.user as { id: number }).id;
}

// `RolesGuard` lê o metadata `roles` apenas do handler (não da classe), por
// isso `@Roles('ADMIN')` fica em cada rota. `pending-assignment` é declarada
// ANTES de `interviews/:id` (e `:id` exige UUID), então nunca é capturada por ela.
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminInterviewsController {
  constructor(
    private readonly adminInterviewsService: AdminInterviewsService,
  ) {}

  // Listagem geral (7A.1). Único filtro: `candidateId` (inteiro positivo).
  @Get('interviews')
  @Roles('ADMIN')
  list(@Query('candidateId') candidateId?: string) {
    const parsed = parseCandidateIdFilter(candidateId);
    if (parsed === null) {
      throw new BadRequestException('Candidato inválido.');
    }
    return this.adminInterviewsService.list(parsed);
  }

  @Get('interviews/pending-assignment')
  @Roles('ADMIN')
  listPendingAssignment() {
    return this.adminInterviewsService.listPendingAssignment();
  }

  @Get('interviews/:id')
  @Roles('ADMIN')
  getById(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.adminInterviewsService.getById(id);
  }

  @Post('interviews/:id/assign')
  @HttpCode(200)
  @Roles('ADMIN')
  assign(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignInterviewDto,
  ) {
    return this.adminInterviewsService.assign(
      userIdOf(req),
      id,
      dto.evaluatorId,
    );
  }

  @Get('evaluators')
  @Roles('ADMIN')
  listEvaluators() {
    return this.adminInterviewsService.listEvaluators();
  }
}
