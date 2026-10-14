import type { MaterialSource } from '../material-recommendations/recommendation.types';
import { RH_MATERIAL_TAXONOMY } from '../material-recommendations/rh-material-taxonomy';
import type { PrismaService } from '../prisma/prisma.service';

// Estado ATUAL (operacional) de um material recomendado, compartilhado pelo
// resultado histórico da entrevista (R5B) e pela lista consolidada (R7A). É
// a única fonte das regras de `availability`, `internalSlug`, `url`,
// `coverUrl` e `directLinkAvailable`: nada disso é duplicado nos serviços.
//
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

export interface CurrentResource {
  source: string;
  external_key: string;
  url: string | null;
  cover_url: string | null;
  direct_link_available: boolean;
  is_active: boolean;
}

export type CurrentResources = ReadonlyMap<string, CurrentResource>;

// Referência persistente de um material recomendado (nunca sai numa resposta).
export interface MaterialReference {
  source: MaterialSource;
  materialRef: string;
}

export interface MaterialOperationalState {
  availability: MaterialAvailability;
  internalSlug: string | null;
  directLinkAvailable: boolean;
  url: string | null;
  coverUrl: string | null;
}

export const keyOf = (source: string, ref: string) => `${source}:${ref}`;

// `material_ref` do RH Connect é o ID editorial; a rota interna usa o SLUG.
// Id e slug são campos distintos da taxonomia (hoje coincidem por convenção,
// mas nada depende disso). Ref que a taxonomia atual não conhece (snapshot
// antigo) resulta em null: a recomendação histórica continua, sem rota direta.
const RH_SLUG_BY_ID: ReadonlyMap<string, string> = new Map(
  RH_MATERIAL_TAXONOMY.map((entry) => [entry.id, entry.slug]),
);

export function rhSlugOf(materialRef: string): string | null {
  return RH_SLUG_BY_ID.get(materialRef) ?? null;
}

function nonEmpty(value: string | null | undefined): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

const NO_LINK = { directLinkAvailable: false, url: null, coverUrl: null };

// `current === null` = falha técnica na consulta ao catálogo externo (diferente
// de "não encontrado"): estado desconhecido, nunca "indisponível".
export function resolveOperationalState(
  material: MaterialReference,
  current: CurrentResources | null,
): MaterialOperationalState {
  if (material.source === 'RH_CONNECT') {
    return {
      availability: 'IN_APP',
      internalSlug: rhSlugOf(material.materialRef),
      ...NO_LINK,
    };
  }

  if (current === null) {
    return { availability: 'UNKNOWN', internalSlug: null, ...NO_LINK };
  }

  const resource =
    current.get(keyOf(material.source, material.materialRef)) ?? null;
  if (!resource || !resource.is_active) {
    return { availability: 'UNAVAILABLE', internalSlug: null, ...NO_LINK };
  }

  const url = nonEmpty(resource.url);
  return {
    availability: 'AVAILABLE',
    internalSlug: null,
    directLinkAvailable: url !== null && resource.direct_link_available,
    url,
    coverUrl: nonEmpty(resource.cover_url),
  };
}

// UMA consulta para todos os externos informados, sempre por (fonte, chave
// externa): nunca pelo UUID do recurso, que muda entre ambientes. Só RH
// Connect = nenhuma consulta. LANÇA em erro de banco: quem chama decide (log +
// `null` => UNKNOWN).
export async function loadCurrentResources(
  prisma: PrismaService,
  materials: readonly MaterialReference[],
): Promise<Map<string, CurrentResource>> {
  const bySource = new Map<string, string[]>();
  for (const material of materials) {
    if (material.source === 'RH_CONNECT') continue;
    const refs = bySource.get(material.source) ?? [];
    refs.push(material.materialRef);
    bySource.set(material.source, refs);
  }
  if (bySource.size === 0) return new Map();

  const rows = await prisma.external_learning_resource.findMany({
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
}
