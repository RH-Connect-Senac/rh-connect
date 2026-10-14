/**
 * Materiais recomendados no relatório do candidato (R6) — parte PURA (sem React, rede ou storage).
 *
 * A fonte é `materialRecommendations` de `GET /interviews/:id/result`. Aqui só se traduz o contrato
 * da API em apresentação; nenhuma regra do Back é duplicada:
 * - ordem, seleção e motivo vêm prontos do Back (nada é reordenado, filtrado ou reescrito);
 * - `availability` já vem resolvida pelo Back; o cliente só decide COMO mostrar cada estado;
 * - `matchedNeed`, `matchKind` e `position` são internos e NÃO chegam ao view model visual.
 *
 * Separação: o card carrega o dado HISTÓRICO (título, tipo, área, motivo); o estado de
 * AÇÃO/NAVEGAÇÃO (`action`) é derivado da disponibilidade atual.
 */

import type {
  MaterialRecommendation,
  MaterialRecommendationArea,
  MaterialRecommendationSource,
} from "../services/candidate-interviews-service";

export const RECOMMENDED_MATERIALS_TITLE = "Materiais recomendados para você";
export const RECOMMENDED_MATERIALS_SUBTITLE = "Selecionados com base no seu desempenho nesta entrevista.";

export const MATERIAL_UNAVAILABLE_NOTICE = "Conteúdo indisponível no momento";
export const MATERIAL_UNKNOWN_NOTICE = "Não foi possível verificar o acesso agora";

const SOURCE_LABEL: Record<MaterialRecommendationSource, string> = {
  RH_CONNECT: "RH Connect",
  CACHOLA: "Cachola · Parceiro",
  ORANGO: "Orango · Parceiro",
};

const EXTERNAL_CTA_LABEL: Record<Exclude<MaterialRecommendationSource, "RH_CONNECT">, string> = {
  CACHOLA: "Acessar na Cachola",
  ORANGO: "Acessar no Orango",
};

const EXTERNAL_PLATFORM_NOTICE: Record<Exclude<MaterialRecommendationSource, "RH_CONNECT">, string> = {
  CACHOLA: "Este conteúdo abre pela plataforma Cachola.",
  ORANGO: "Este conteúdo abre pela plataforma Orango.",
};

/** Área geral não vira rótulo (não agrega informação ao candidato). */
const AREA_LABEL: Record<MaterialRecommendationArea, string | null> = {
  TI: "Tecnologia",
  RH: "Recursos Humanos",
  SECRETARIADO: "Secretariado",
  GERAL: null,
};

export const MATERIALS_AREA_PATH = "/candidate/materials";

/** Rota REAL de detalhe do material RH Connect (`/candidate/materials/:materialId`, por slug). */
export function internalMaterialPath(slug: string): string {
  return `${MATERIALS_AREA_PATH}/${encodeURIComponent(slug)}`;
}

export type RecommendedMaterialNotice = {
  text: string;
  /** "unavailable"/"unknown" nunca dependem só da cor: sempre vêm com texto. */
  tone: "unavailable" | "unknown" | "info";
};

export type RecommendedMaterialAction =
  | { kind: "internal"; label: string; path: string }
  | { kind: "external"; label: string; href: string }
  | { kind: "none"; notice: RecommendedMaterialNotice };

export type RecommendedMaterialCard = {
  /** Chave estável de lista (não é exibida). */
  key: string;
  source: MaterialRecommendationSource;
  title: string;
  sourceLabel: string;
  typeLabel: string | null;
  areaLabel: string | null;
  reason: string | null;
  /** Só URL http(s). Ausente = card sem capa (o layout não depende dela). */
  coverUrl: string | null;
  external: boolean;
  action: RecommendedMaterialAction;
};

export type RecommendedMaterialsView = {
  title: string;
  subtitle: string;
  cards: RecommendedMaterialCard[];
};

export type RecommendedMaterialsOptions = {
  /** O slug informado pelo Back existe no catálogo do app? (evita CTA para uma rota que não abre). */
  hasInternalMaterial: (slug: string) => boolean;
};

/** Aceita só http(s): qualquer outro esquema (javascript:, data:, ...) é descartado. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function resolveAction(
  item: MaterialRecommendation,
  options: RecommendedMaterialsOptions,
): RecommendedMaterialAction {
  if (item.availability === "UNAVAILABLE") {
    return { kind: "none", notice: { text: MATERIAL_UNAVAILABLE_NOTICE, tone: "unavailable" } };
  }
  if (item.availability === "UNKNOWN") {
    return { kind: "none", notice: { text: MATERIAL_UNKNOWN_NOTICE, tone: "unknown" } };
  }

  if (item.source === "RH_CONNECT") {
    if (item.availability === "IN_APP" && item.internalSlug && options.hasInternalMaterial(item.internalSlug)) {
      return { kind: "internal", label: "Abrir material", path: internalMaterialPath(item.internalSlug) };
    }
    // Slug ausente/desconhecido: não inventa rota; leva à área de Materiais (rota existente).
    return { kind: "internal", label: "Ir para Materiais", path: MATERIALS_AREA_PATH };
  }

  // Externo (Cachola/Orango) disponível.
  if (item.availability === "AVAILABLE") {
    const href = safeHttpUrl(item.url);
    if (item.directLinkAvailable && href) {
      return { kind: "external", label: EXTERNAL_CTA_LABEL[item.source], href };
    }
    return { kind: "none", notice: { text: EXTERNAL_PLATFORM_NOTICE[item.source], tone: "info" } };
  }

  // Combinação fora do contrato (externo IN_APP): não afirma nada sobre o acesso.
  return { kind: "none", notice: { text: MATERIAL_UNKNOWN_NOTICE, tone: "unknown" } };
}

/**
 * Seção "Materiais recomendados". `null` quando não há recomendação (a seção não é renderizada:
 * entrevistas antigas ou sem recomendação não mostram card vazio nem "nenhuma recomendação").
 * Preserva a ordem recebida (já por `position`).
 */
export function buildRecommendedMaterialsView(
  items: readonly MaterialRecommendation[] | null | undefined,
  options: RecommendedMaterialsOptions,
): RecommendedMaterialsView | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  return {
    title: RECOMMENDED_MATERIALS_TITLE,
    subtitle: RECOMMENDED_MATERIALS_SUBTITLE,
    cards: items.map((item, index) => ({
      key: `${item.source}-${item.position}-${index}`,
      source: item.source,
      title: item.title,
      sourceLabel: SOURCE_LABEL[item.source],
      typeLabel: item.resourceType || null,
      areaLabel: AREA_LABEL[item.area],
      reason: item.reason || null,
      coverUrl: safeHttpUrl(item.coverUrl),
      external: item.source !== "RH_CONNECT",
      action: resolveAction(item, options),
    })),
  };
}
