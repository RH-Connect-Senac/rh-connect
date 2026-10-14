import { Injectable, Logger } from '@nestjs/common';
import type { RecommendationMatchKind } from '../material-recommendations/recommendation-reasons';
import type {
  MaterialAreaKey,
  MaterialSource,
  NeedKey,
} from '../material-recommendations/recommendation.types';
import { RH_MATERIAL_TAXONOMY } from '../material-recommendations/rh-material-taxonomy';
import { PrismaService } from '../prisma/prisma.service';
import { MaterialRecommendationSnapshotService } from './material-recommendation-snapshot.service';
import type { MaterialSnapshotItem } from './material-recommendation-snapshot.service';

// Disponibilidade ATUAL do material (nunca altera o que foi recomendado):
// - AVAILABLE: recurso externo encontrado e ativo no catálogo atual;
// - UNAVAILABLE: recurso externo COMPROVADAMENTE removido ou inativo;
// - IN_APP: material do RH Connect (o conteúdo vive no aplicativo; o backend
//   não tem linha de catálogo para resolver, então não promete link);
// - UNKNOWN: a consulta ao catálogo falhou (erro técnico): não se sabe se o
//   recurso existe, então não se afirma que saiu do ar.
export type MaterialAvailability =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'IN_APP'
  | 'UNKNOWN';

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

interface CurrentResource {
  source: string;
  external_key: string;
  url: string | null;
  cover_url: string | null;
  direct_link_available: boolean;
  is_active: boolean;
}

const keyOf = (source: string, ref: string) => `${source}:${ref}`;

// `material_ref` do RH Connect é o ID editorial; a rota interna usa o SLUG.
// Id e slug são campos distintos da taxonomia (hoje coincidem por convenção,
// mas nada depende disso). Ref que a taxonomia atual não conhece (snapshot
// antigo) resulta em null: a recomendação histórica continua, sem rota direta.
const RH_SLUG_BY_ID: ReadonlyMap<string, string> = new Map(
  RH_MATERIAL_TAXONOMY.map((entry) => [entry.id, entry.slug]),
);

function nonEmpty(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function toView(
  item: MaterialSnapshotItem,
  current: ReadonlyMap<string, CurrentResource> | null,
): MaterialRecommendationView {
  const historical = {
    position: item.position,
    source: item.source,
    title: item.title,
    resourceType: item.resourceType,
    area: item.area,
    matchedNeed: item.matchedNeed,
    matchKind: item.matchKind,
    reason: item.reason,
  };
  const none = { directLinkAvailable: false, url: null, coverUrl: null };

  if (item.source === 'RH_CONNECT') {
    return {
      ...historical,
      availability: 'IN_APP',
      internalSlug: RH_SLUG_BY_ID.get(item.materialRef) ?? null,
      ...none,
    };
  }

  // Falha técnica na consulta (`current` nulo): estado desconhecido, nunca
  // "indisponível".
  if (current === null) {
    return { ...historical, availability: 'UNKNOWN', internalSlug: null, ...none };
  }

  const resource = current.get(keyOf(item.source, item.materialRef)) ?? null;
  if (!resource || !resource.is_active) {
    return {
      ...historical,
      availability: 'UNAVAILABLE',
      internalSlug: null,
      ...none,
    };
  }

  const url = nonEmpty(resource.url);
  return {
    ...historical,
    availability: 'AVAILABLE',
    internalSlug: null,
    directLinkAvailable: url !== null && resource.direct_link_available,
    url,
    coverUrl: nonEmpty(resource.cover_url),
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
  ): Promise<Map<string, CurrentResource> | null> {
    const bySource = new Map<string, string[]>();
    for (const item of items) {
      if (item.source === 'RH_CONNECT') continue;
      const refs = bySource.get(item.source) ?? [];
      refs.push(item.materialRef);
      bySource.set(item.source, refs);
    }
    if (bySource.size === 0) return new Map();

    try {
      const rows = await this.prisma.external_learning_resource.findMany({
        where: {
          OR: [...bySource].map(([source, refs]) => ({
            source,
            external_key: { in: refs },
          })),
        },
        select: {
          source: true,
          external_key: true,
          url: true,
          cover_url: true,
          direct_link_available: true,
          is_active: true,
        },
      });
      return new Map(rows.map((row) => [keyOf(row.source, row.external_key), row]));
    } catch (error) {
      this.logger.error(
        `Falha ao consultar o catálogo atual de materiais (entrevista ${interviewId}); recomendações históricas sem link.`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }
}
