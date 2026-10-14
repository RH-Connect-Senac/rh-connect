import { Module } from '@nestjs/common';
import { MaterialRecommendationResultService } from './material-recommendation-result.service';
import { MaterialRecommendationSnapshotService } from './material-recommendation-snapshot.service';

// Módulo mínimo: serviços de snapshot e de montagem do resultado (sem
// controller próprio: a rota é a do resultado do candidato). O PrismaService vem do PrismaModule global. Fica fora de
// `material-recommendations/` de propósito: aquela pasta é o núcleo puro,
// protegido por guard contra Prisma e módulos de entrevista.
@Module({
  providers: [
    MaterialRecommendationSnapshotService,
    MaterialRecommendationResultService,
  ],
  exports: [
    MaterialRecommendationSnapshotService,
    MaterialRecommendationResultService,
  ],
})
export class MaterialRecommendationSnapshotModule {}
