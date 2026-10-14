import { Injectable, Logger } from '@nestjs/common';
import type {
  MaterialAreaKey,
  MaterialSource,
  NeedKey,
} from '../material-recommendations/recommendation.types';
import type { RecommendationMatchKind } from '../material-recommendations/recommendation-reasons';
import { PrismaService } from '../prisma/prisma.service';
import {
  loadCurrentResources,
  resolveOperationalState,
} from './material-current-state';
import type {
  CurrentResources,
  MaterialAvailability,
} from './material-current-state';
import {
  MAX_CONSOLIDATED_RECOMMENDATIONS,
  consolidateMaterials,
  selectRecentInterviewIds,
} from './material-recommendation-consolidation';
import type { InterviewSnapshotItems } from './material-recommendation-consolidation';
import type { MaterialSnapshotItem } from './material-recommendation-snapshot.service';

// Contrato de `GET /candidate/materials/recommendations`. Somente o que a tela
// precisa: sem material_ref, external_key, ids de snapshot/recomendação/
// entrevista/recurso, position, matchedNeed ou matchKind.
export interface ConsolidatedMaterialRecommendation {
  source: MaterialSource;
  title: string;
  resourceType: string;
  area: MaterialAreaKey;
  reason: string;
  // Em quantas das entrevistas consideradas o material foi recomendado.
  recommendationCount: number;
  internalSlug: string | null;
  availability: MaterialAvailability;
  directLinkAvailable: boolean;
  url: string | null;
  coverUrl: string | null;
}

export interface ConsolidatedMaterialRecommendations {
  recommendations: ConsolidatedMaterialRecommendation[];
}

// Visão DINÂMICA derivada dos snapshots JÁ EXISTENTES das entrevistas do
// candidato autenticado. Não gera snapshot (sem lazy em massa), não chama o
// engine (`deriveNeeds`/`recommendMaterials`) e não depende da modalidade da
// avaliação: vale qualquer entrevista COMPLETED que tenha snapshot, então um
// snapshot de IA futuro é absorvido sem mudar nada aqui.
@Injectable()
export class MaterialConsolidatedRecommendationsService {
  private readonly logger = new Logger(
    MaterialConsolidatedRecommendationsService.name,
  );

  constructor(private readonly prisma: PrismaService) {}

  async listForCandidate(
    candidateUserId: number,
  ): Promise<ConsolidatedMaterialRecommendations> {
    // Consulta 1 (leve, sem itens): entrevistas concluídas DO candidato com
    // snapshot. O dono está no WHERE; nada vem do cliente.
    const interviews = await this.prisma.interview.findMany({
      where: {
        candidate_user_id: candidateUserId,
        status: 'COMPLETED',
        material_snapshot: { isNot: null },
      },
      select: {
        interview_id: true,
        updated_at: true,
        evaluation: { select: { completed_at: true } },
      },
    });
    const recentIds = selectRecentInterviewIds(
      interviews.map((row) => ({
        interviewId: row.interview_id,
        completedAt: row.evaluation?.completed_at ?? null,
        fallbackAt: row.updated_at,
      })),
    );
    if (recentIds.length === 0) return { recommendations: [] };

    // Consulta 2: itens dos snapshots das entrevistas recentes, de uma vez.
    const rows = await this.prisma.interview_material_recommendation.findMany({
      where: { snapshot: { interview_id: { in: recentIds } } },
      select: {
        position: true,
        source: true,
        material_ref: true,
        title_snapshot: true,
        resource_type_snapshot: true,
        area_snapshot: true,
        matched_need: true,
        match_kind: true,
        reason_snapshot: true,
        snapshot: { select: { interview_id: true } },
      },
    });

    const itemsByInterview = new Map<string, MaterialSnapshotItem[]>();
    for (const row of rows) {
      const list = itemsByInterview.get(row.snapshot.interview_id) ?? [];
      list.push({
        position: row.position,
        source: row.source as MaterialSource,
        materialRef: row.material_ref,
        title: row.title_snapshot,
        resourceType: row.resource_type_snapshot,
        area: row.area_snapshot as MaterialAreaKey,
        matchedNeed: row.matched_need as NeedKey | null,
        matchKind: row.match_kind as RecommendationMatchKind,
        reason: row.reason_snapshot,
      });
      itemsByInterview.set(row.snapshot.interview_id, list);
    }
    // Snapshot vazio não gera linha: a entrevista só ocupa uma "vaga" da janela.
    const newestFirst: InterviewSnapshotItems[] = recentIds.map((id) => ({
      interviewId: id,
      items: itemsByInterview.get(id) ?? [],
    }));

    const ranked = consolidateMaterials(newestFirst);

    // Consulta 3: catálogo externo atual de todos os candidatos de uma vez.
    const current = await this.resolveCurrent(ranked);

    const recommendations: ConsolidatedMaterialRecommendation[] = [];
    for (const material of ranked) {
      const state = resolveOperationalState(
        { source: material.source, materialRef: material.materialRef },
        current,
      );
      // Lista ATIVA: só o que o candidato consegue usar. Externo comprovadamente
      // removido/inativo e RH Connect que saiu da taxonomia (sem rota) não
      // ocupam vaga; ficam apenas nos snapshots/resultados históricos.
      if (state.availability === 'UNAVAILABLE') continue;
      if (material.source === 'RH_CONNECT' && state.internalSlug === null) continue;

      const { representative } = material;
      recommendations.push({
        source: material.source,
        title: representative.title,
        resourceType: representative.resourceType,
        area: representative.area,
        reason: representative.reason,
        recommendationCount: material.recommendationCount,
        ...state,
      });
      if (recommendations.length === MAX_CONSOLIDATED_RECOMMENDATIONS) break;
    }
    return { recommendations };
  }

  // Falha técnica no catálogo externo não derruba a lista: `null` => UNKNOWN.
  private async resolveCurrent(
    ranked: ReadonlyArray<{ source: MaterialSource; materialRef: string }>,
  ): Promise<CurrentResources | null> {
    try {
      return await loadCurrentResources(this.prisma, ranked);
    } catch (error) {
      this.logger.error(
        'Falha ao consultar o catálogo atual de materiais; recomendações consolidadas sem link.',
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }
}
