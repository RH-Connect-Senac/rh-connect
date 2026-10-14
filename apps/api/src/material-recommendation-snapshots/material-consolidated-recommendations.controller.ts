import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MaterialConsolidatedRecommendationsService } from './material-consolidated-recommendations.service';

function userIdOf(req: Request): number {
  return (req.user as { id: number }).id;
}

// Somente leitura. O candidato vem SEMPRE do JWT: a rota não aceita param,
// query nem body (nenhum candidateId do cliente). Segue o namespace
// `candidate/materials/*` já usado pelos recursos externos; `recommendations`
// é um segmento estático e não conflita com `external-resources`.
// `RolesGuard` lê o metadata apenas do handler: `@Roles` fica na rota.
@Controller('candidate/materials/recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialConsolidatedRecommendationsController {
  constructor(
    private readonly consolidated: MaterialConsolidatedRecommendationsService,
  ) {}

  @Get()
  @Roles('CANDIDATE')
  list(@Req() req: Request) {
    return this.consolidated.listForCandidate(userIdOf(req));
  }
}
