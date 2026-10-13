/**
 * Dashboard do candidato (6A.5) — parte PURA (sem React, sem rede, sem armazenamento).
 *
 * A fonte é `GET /interviews` (a mesma lista do Histórico, já ordenada pelo Back por createdAt DESC).
 * Regras:
 * - CANCELLED existe no Back e na API, mas NÃO conta nas métricas nem aparece em destaque
 *   (reaproveita `visibleHistoryItems` da 6A.4);
 * - `overallScore` e `resultAvailable` vêm do Back: nada é recalculado nem inferido pelo status;
 * - só entram na pontuação entrevistas COMPLETED com `resultAvailable` e nota numérica;
 * - as ações são as mesmas do Histórico (uma única definição), mostrando só a principal.
 */

import {
  buildHistoryItemView,
  historyActionPath,
  visibleHistoryItems,
  type HistoryAction,
  type HistoryTone,
} from "./candidate-history-view";
import type { RealHistoryItem, RealInterviewStatus } from "../services/candidate-interviews-service";

export type DashboardSummary = {
  /** Entrevistas úteis (todas menos CANCELLED). */
  total: number;
  /** IN_PROGRESS. */
  inProgress: number;
  /** ASSIGNED + PENDING_AI_EVALUATION (já há avaliador/IA responsável). PENDING_ASSIGNMENT NÃO conta: ainda aguarda o Admin atribuir. */
  waiting: number;
  /** COMPLETED. */
  completed: number;
  /** COMPLETED com `resultAvailable` (o relatório pode ser aberto). */
  resultsAvailable: number;
  /** Maior `overallScore` do Back entre as COMPLETED com resultado; null quando não há nenhuma. */
  bestScore: number | null;
};

const WAITING: RealInterviewStatus[] = ["ASSIGNED", "PENDING_AI_EVALUATION"];

/** Entrevista COMPLETED com resultado disponível e nota numérica informada pelo Back. */
function scoredResult(item: RealHistoryItem): number | null {
  return item.status === "COMPLETED" && item.resultAvailable && typeof item.overallScore === "number" && Number.isFinite(item.overallScore)
    ? item.overallScore
    : null;
}

export function buildDashboardSummary(items: RealHistoryItem[]): DashboardSummary {
  const visible = visibleHistoryItems(items);
  const scores = visible.map(scoredResult).filter((score): score is number => score !== null);
  return {
    total: visible.length,
    inProgress: visible.filter((item) => item.status === "IN_PROGRESS").length,
    waiting: visible.filter((item) => WAITING.includes(item.status)).length,
    completed: visible.filter((item) => item.status === "COMPLETED").length,
    resultsAvailable: visible.filter((item) => item.status === "COMPLETED" && item.resultAvailable).length,
    bestScore: scores.length ? Math.max(...scores) : null,
  };
}

export const formatDashboardScore = (score: number | null) => (score === null ? "—" : score.toFixed(1).replace(".", ","));

/**
 * Prioridade do destaque (menor = mais importante). CANCELLED não é elegível.
 * Dentro da mesma categoria vale a ordem do Back.
 */
const FEATURED_PRIORITY: Partial<Record<RealInterviewStatus, number>> = {
  IN_PROGRESS: 1,
  PENDING_ASSIGNMENT: 2,
  ASSIGNED: 3,
  PENDING_AI_EVALUATION: 4,
  COMPLETED: 5,
};

export function pickFeaturedInterview(items: RealHistoryItem[]): RealHistoryItem | null {
  let featured: RealHistoryItem | null = null;
  let best = Infinity;
  for (const item of visibleHistoryItems(items)) {
    const priority = FEATURED_PRIORITY[item.status] ?? Infinity;
    // estritamente menor: empate mantém o primeiro (ordem do Back)
    if (priority < best) {
      best = priority;
      featured = item;
    }
  }
  return featured;
}

export type DashboardRecentItem = {
  id: string;
  title: string;
  company: string | null;
  dateText: string | null;
  statusLabel: string;
  tone: HistoryTone;
  evaluationMode: "AI" | "HUMAN" | null;
  /** Ação principal do status (mesma regra do Histórico); null quando não há. */
  action: HistoryAction | null;
};

export const DASHBOARD_RECENT_LIMIT = 3;

/** Destaque primeiro; os demais seguem na ordem do Back (mais recentes). Sem CANCELLED. */
export function buildDashboardRecent(items: RealHistoryItem[], limit = DASHBOARD_RECENT_LIMIT): DashboardRecentItem[] {
  const visible = visibleHistoryItems(items);
  const featured = pickFeaturedInterview(visible);
  const ordered = featured ? [featured, ...visible.filter((item) => item.id !== featured.id)] : visible;
  return ordered.slice(0, limit).map((item) => {
    const view = buildHistoryItemView(item);
    return {
      id: item.id,
      title: item.title,
      company: item.company,
      dateText: view.dateText,
      statusLabel: view.statusLabel,
      tone: view.tone,
      evaluationMode: view.evaluationMode,
      action: view.actions[0] ?? null,
    };
  });
}

/** Destino da ação principal (rotas reais existentes); "resume" é tratada pela tela. */
export function dashboardActionPath(action: HistoryAction, id: string): string | null {
  return historyActionPath(action.kind, id);
}

export const DASHBOARD_RECENT_EMPTY = {
  title: "Nenhuma entrevista enviada ainda",
  description: "Quando você concluir uma entrevista, ela aparecerá aqui com o status da avaliação.",
};

export type DashboardFailureView = { title: string; description: string; canRetry: boolean };

/** Falha de `GET /interviews` no Dashboard → texto localizado (a mensagem já vem sanitizada pelo serviço). */
export function describeDashboardInterviewsFailure(reason: string, message: string): DashboardFailureView {
  if (reason === "unauthorized" || reason === "forbidden") {
    return { title: "Não foi possível carregar suas entrevistas", description: message, canRetry: false };
  }
  return { title: "Não foi possível carregar suas entrevistas", description: message, canRetry: true };
}
