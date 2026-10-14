/**
 * Recomendações consolidadas na página Materiais (R7B) — parte PURA (sem React, rede ou storage).
 *
 * Traduz o contrato consolidado (`GET /candidate/materials/recommendations`) em apresentação,
 * reaproveitando a mesma regra de fonte/disponibilidade/CTA/aviso/capa da R6
 * (`buildRecommendedMaterialCard`): nada de regra grande duplicada.
 *  - ordem e seleção vêm prontas do Back (nada é reordenado, filtrado ou completado);
 *  - `recommendationCount` fica no view model para uso futuro, mas NÃO vira texto agora;
 *  - UNAVAILABLE (já excluído pelo Back) seguiria a semântica da R6: card visível com aviso, sem CTA;
 *  - a aba "Recomendados" é fixa na navegação: loading, vazio e erro são estados DENTRO da aba.
 */

import type { ConsolidatedMaterialRecommendation } from "../services/candidate-material-recommendations-service";
import {
  buildRecommendedMaterialCard,
  type RecommendedMaterialCard,
  type RecommendedMaterialsOptions,
} from "./candidate-report-materials-view";

export const CONSOLIDATED_RECOMMENDATIONS_TAB_ID = "recomendados";
export const CONSOLIDATED_RECOMMENDATIONS_TITLE = "Recomendados para você";
export const CONSOLIDATED_RECOMMENDATIONS_LIST_LABEL = "Materiais recomendados para você";
export const CONSOLIDATED_RECOMMENDATIONS_LOADING_LABEL = "Carregando suas recomendações";
export const CONSOLIDATED_RECOMMENDATIONS_EMPTY_MESSAGE =
  "Suas recomendações aparecerão aqui após suas entrevistas avaliadas.";

export type ConsolidatedRecommendationCard = RecommendedMaterialCard & {
  /** Em quantas entrevistas recentes foi recomendado. Disponível para uso futuro; não é exibido. */
  recommendationCount: number;
};

export type ConsolidatedRecommendationsView = {
  cards: ConsolidatedRecommendationCard[];
};

/** `null` quando não há recomendação: nada é renderizado (sem "nenhuma recomendação"). */
export function buildConsolidatedRecommendationsView(
  items: readonly ConsolidatedMaterialRecommendation[] | null | undefined,
  options: RecommendedMaterialsOptions,
): ConsolidatedRecommendationsView | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  return {
    cards: items.map((item, index) => ({
      ...buildRecommendedMaterialCard(item, options, `${item.source}-${index}`),
      recommendationCount: item.recommendationCount,
    })),
  };
}

export type ConsolidatedPanelState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; view: ConsolidatedRecommendationsView | null };

type LiveLike =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; value: readonly ConsolidatedMaterialRecommendation[] };

export function toConsolidatedPanelState(live: LiveLike, options: RecommendedMaterialsOptions): ConsolidatedPanelState {
  if (live.status === "ready") {
    return { status: "ready", view: buildConsolidatedRecommendationsView(live.value, options) };
  }
  if (live.status === "error") return { status: "error", message: live.message };
  return { status: "loading" };
}
