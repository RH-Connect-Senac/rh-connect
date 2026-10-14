import { Injectable, Logger } from '@nestjs/common';
import type { RecommendationMatchKind } from '../material-recommendations/recommendation-reasons';
import type {
  MaterialAreaKey,
  MaterialSource,
  NeedKey,
} from '../material-recommendations/recommendation.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  loadCurrentResources,
  resolveOperationalState,
} from './material-current-state';
import type {
  CurrentResources,
  MaterialAvailability,
} from './material-current-state';
import { MaterialRecommendationSnapshotService } from './material-recommendation-snapshot.service';
import type { MaterialSnapshotItem } from './material-recommendation-snapshot.service';

export type { MaterialAvailability };

// Contrato de `materialRecommendations` no resultado do candidato. Os oito
// primeiros campos são o snapshot HISTÓRICO (nunca trocados por dado atual);
// os quatro últimos são operacionais e vêm do catálogo atual quando possível.
// `internalSlug` só existe para RH_CONNECT: é o SLUG da taxonomia atual
// (a rota interna do aplicativo localiza por slug, não por id). Fica null nos
// externos e quando o material histórico não existe mais na taxonomia. Sem
// material_ref, external_key, UUID de snapshot ou de item.
export interface MaterialRecommendationView {
  position: number;
  source: MaterialSource;
  title: string;
  resourceType: string;
  area: MaterialAreaKey;
  matchedNeed: NeedKey | null;
  matchKind: RecommendationMatchKind;
  reason: string;
  availability: MaterialAvailability;
  internalSlug: string | null;
  directLinkAvailable: boolean;
  url: string | null;
  coverUrl: string | null;
}

function toView(
  item: MaterialSnapshotItem,
  current: CurrentResources | null,
): MaterialRecommendationView {
  return {
    position: item.position,
    source: item.source,
    title: item.title,
    resourceType: item.resourceType,
    area: item.area,
    matchedNeed: item.matchedNeed,
    matchKind: item.matchKind,
    reason: item.reason,
    // Disponibilidade, slug e links: regra única e compartilhada (R7A).
    ...resolveOperationalState(item, current),
  };
}

// Monta `materialRecommendations` do resultado do candidato a partir do
// snapshot IMUTÁVEL. A autorização (dono + HUMAN + COMPLETED) já foi decidida
// por quem chama; aqui o foco é ser resiliente: NUNCA lança. Qualquer falha
// vira log e lista vazia (ou itens históricos sem link), e o resultado
// principal da entrevista continua válido.
@Injectable()
export class MaterialRecommendationResultService {
  private readonly logger = new Logger(MaterialRecommendationResultService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snapshots: MaterialRecommendationSnapshotService,
  ) {}

  async listForInterview(
    interviewId: string,
  ): Promise<MaterialRecommendationView[]> {
    let items: MaterialSnapshotItem[];
    try {
      // Lazy: devolve o snapshot existente (inclusive vazio) ou gera um.
      const outcome = await this.snapshots.getOrCreateSnapshot(interviewId);
      if (outcome.kind === 'ineligible') {
        this.logger.warn(
          `Recomendações de materiais indisponíveis (entrevista ${interviewId}): ${outcome.reason}`,
        );
        return [];
      }
      items = outcome.snapshot.items;
    } catch (error) {
      this.logger.error(
        `Falha ao obter o snapshot de materiais da entrevista ${interviewId}; o resultado segue sem recomendações.`,
        error instanceof Error ? error.stack : String(error),
      );
      return [];
    }

    const current = await this.resolveCurrentResources(interviewId, items);
    // Sempre por position ASC; nada é reordenado por disponibilidade.
    return [...items]
      .sort((a, b) => a.position - b.position)
      .map((item) => toView(item, current));
  }

  // UMA consulta para todos os externos do snapshot (no máximo 3 itens).
  // Falha aqui não derruba nada: os itens históricos saem sem link e com
  // disponibilidade UNKNOWN (devolve `null`, diferente de "não encontrado").
  private async resolveCurrentResources(
    interviewId: string,
    items: readonly MaterialSnapshotItem[],
  ): Promise<CurrentResources | null> {
    try {
      return await loadCurrentResources(this.prisma, items);
    } catch (error) {
      this.logger.error(
        `Falha ao consultar o catálogo atual de materiais (entrevista ${interviewId}); recomendações históricas sem link.`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }
}
