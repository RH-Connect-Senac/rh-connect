import { Module } from '@nestjs/common';
import { MaterialConsolidatedRecommendationsController } from './material-consolidated-recommendations.controller';
import { MaterialConsolidatedRecommendationsService } from './material-consolidated-recommendations.service';
import { MaterialRecommendationResultService } from './material-recommendation-result.service';
import { MaterialRecommendationSnapshotService } from './material-recommendation-snapshot.service';

// Módulo mínimo: serviços de snapshot, de montagem do resultado e da lista
// consolidada (R7A, `GET /candidate/materials/recommendations`; a rota do
// resultado continua sendo a do candidato em InterviewsController). O
// PrismaService vem do PrismaModule global. Fica fora de
// `material-recommendations/` de propósito: aquela pasta é o núcleo puro,
// protegido por guard contra Prisma e módulos de entrevista.
@Module({
  controllers: [MaterialConsolidatedRecommendationsController],
  providers: [
    MaterialRecommendationSnapshotService,
    MaterialRecommendationResultService,
    MaterialConsolidatedRecommendationsService,
  ],
  exports: [
    MaterialRecommendationSnapshotService,
    MaterialRecommendationResultService,
    MaterialConsolidatedRecommendationsService,
  ],
})
export class MaterialRecommendationSnapshotModule {}
