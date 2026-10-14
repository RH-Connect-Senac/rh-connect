import { Module } from '@nestjs/common';
import { MaterialRecommendationSnapshotService } from './material-recommendation-snapshot.service';

// Módulo mínimo: só o serviço (sem controller; a leitura HTTP fica para a
// R5B). O PrismaService vem do PrismaModule global. Fica fora de
// `material-recommendations/` de propósito: aquela pasta é o núcleo puro,
// protegido por guard contra Prisma e módulos de entrevista.
@Module({
  providers: [MaterialRecommendationSnapshotService],
  exports: [MaterialRecommendationSnapshotService],
})
export class MaterialRecommendationSnapshotModule {}
