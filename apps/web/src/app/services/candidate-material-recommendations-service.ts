/**
 * Recomendações consolidadas de materiais do candidato (R7B): `GET /candidate/materials/recommendations`.
 *
 * O Back já entrega a lista pronta (janela de entrevistas, deduplicação, ranking e limite). Aqui
 * só se lê o contrato de forma defensiva:
 *  - NADA é reordenado, completado ou recalculado: a ordem é a recebida;
 *  - campo ausente/inválido vira lista vazia segura; item estruturalmente inválido é ignorado;
 *  - `recommendationCount` é preservado no modelo (uso futuro), sem ser exibido agora;
 *  - falha HTTP/rede vira mensagem amigável FIXA (o texto do servidor nunca chega à tela);
 *  - sem fallback/mock: erro nunca é disfarçado de "sem recomendações".
 */

import type {
  MaterialRecommendationArea,
  MaterialRecommendationAvailability,
  MaterialRecommendationSource,
} from "./candidate-interviews-service";

const API_BASE_URL = (
  (import.meta as ImportMeta & { env?: Record<string, string | undefined> })
    .env?.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");

export const CONSOLIDATED_RECOMMENDATIONS_ERROR_MESSAGE = "Não foi possível carregar suas recomendações agora.";

/** Recomendação consolidada (contrato de R7A). Sem identificadores técnicos. */
export type ConsolidatedMaterialRecommendation = {
  source: MaterialRecommendationSource;
  title: string;
  resourceType: string;
  area: MaterialRecommendationArea;
  reason: string;
  /** Em quantas das entrevistas recentes o material foi recomendado (≥ 1). Ainda não exibido. */
  recommendationCount: number;
  /** Slug da rota interna; só RH_CONNECT. */
  internalSlug: string | null;
  availability: MaterialRecommendationAvailability;
  directLinkAvailable: boolean;
  url: string | null;
  coverUrl: string | null;
};

export type ConsolidatedRecommendationsResult =
  | { ok: true; data: ConsolidatedMaterialRecommendation[] }
  | { ok: false; reason: "unauthorized" | "error"; message: string };

const SOURCES: readonly MaterialRecommendationSource[] = ["RH_CONNECT", "CACHOLA", "ORANGO"];
const AREAS: readonly MaterialRecommendationArea[] = ["TI", "RH", "SECRETARIADO", "GERAL"];
const AVAILABILITIES: readonly MaterialRecommendationAvailability[] = ["AVAILABLE", "UNAVAILABLE", "IN_APP", "UNKNOWN"];

function nonEmptyStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function toConsolidatedRecommendation(payload: unknown): ConsolidatedMaterialRecommendation | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const item = payload as Record<string, unknown>;
  const source = SOURCES.find((candidate) => candidate === item.source);
  const area = AREAS.find((candidate) => candidate === item.area);
  const availability = AVAILABILITIES.find((candidate) => candidate === item.availability);
  if (
    !source ||
    !area ||
    !availability ||
    typeof item.title !== "string" ||
    !item.title.trim() ||
    typeof item.resourceType !== "string" ||
    typeof item.reason !== "string" ||
    typeof item.recommendationCount !== "number" ||
    !Number.isInteger(item.recommendationCount) ||
    item.recommendationCount < 1
  ) {
    return null;
  }
  return {
    source,
    title: item.title.trim(),
    resourceType: item.resourceType.trim(),
    area,
    reason: item.reason.trim(),
    recommendationCount: item.recommendationCount,
    internalSlug: nonEmptyStringOrNull(item.internalSlug),
    availability,
    directLinkAvailable: item.directLinkAvailable === true,
    url: nonEmptyStringOrNull(item.url),
    coverUrl: nonEmptyStringOrNull(item.coverUrl),
  };
}

/**
 * `recommendations` da resposta. Corpo que não é objeto, campo ausente ou que não seja array vira
 * []; item inválido é ignorado. Preserva a ordem recebida (ranking do Back).
 */
export function toConsolidatedMaterialRecommendations(payload: unknown): ConsolidatedMaterialRecommendation[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const list = (payload as Record<string, unknown>).recommendations;
  if (!Array.isArray(list)) return [];
  return list
    .map(toConsolidatedRecommendation)
    .filter((item): item is ConsolidatedMaterialRecommendation => item !== null);
}

async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, { method: "POST", credentials: "include" });
    return response.ok;
  } catch {
    return false;
  }
}

// Num 401 tenta renovar o token UMA vez e repete (mesmo padrão dos demais serviços).
async function getWithRefresh(path: string): Promise<Response | null> {
  const doFetch = () => fetch(`${API_BASE_URL}${path}`, { method: "GET", credentials: "include" });
  try {
    const response = await doFetch();
    if (response.status !== 401) return response;
    if (!(await refreshAccessToken())) return response;
    return await doFetch();
  } catch {
    return null;
  }
}

/** Uma única chamada GET; o candidato vem só da sessão (cookie), nunca de parâmetro. */
export async function getConsolidatedMaterialRecommendations(): Promise<ConsolidatedRecommendationsResult> {
  const response = await getWithRefresh("/candidate/materials/recommendations");
  if (!response) {
    return { ok: false, reason: "error", message: CONSOLIDATED_RECOMMENDATIONS_ERROR_MESSAGE };
  }
  if (!response.ok) {
    return {
      ok: false,
      reason: response.status === 401 || response.status === 403 ? "unauthorized" : "error",
      message: CONSOLIDATED_RECOMMENDATIONS_ERROR_MESSAGE,
    };
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, reason: "error", message: CONSOLIDATED_RECOMMENDATIONS_ERROR_MESSAGE };
  }
  return { ok: true, data: toConsolidatedMaterialRecommendations(payload) };
}
