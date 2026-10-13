/**
 * Gestão de Avaliadores do Admin (Fase 4.1) — parte PURA (sem React, sem rede, sem storage).
 *
 * A fonte é `GET /admin/evaluators`. Decisão de apresentação: a tela mostra SOMENTE avaliadores
 * utilizáveis (conta ACTIVE e `eligible`). Contas INVITED (e qualquer outro estado) continuam
 * existindo no Back; só não são exibidas aqui. O fluxo de convite foi adiado.
 * Só existe o que a API realmente fornece: nada de métricas inventadas (concluídas, média).
 * `assignedCount` = entrevistas atualmente ASSIGNED ao avaliador ("Atribuídas"), nunca "concluídas".
 */

import type { AdminEvaluator } from "../services/admin-interviews-service";

/** Mesma regra do Back para receber entrevistas: conta ACTIVE e elegível. */
export function isPresentableEvaluator(evaluator: Pick<AdminEvaluator, "accountStatus" | "eligible">): boolean {
  return evaluator.accountStatus === "ACTIVE" && evaluator.eligible === true;
}

/** Avaliadores exibidos na gestão (ACTIVE + eligible), na ordem do Back (nome). */
export function presentableEvaluators(evaluators: AdminEvaluator[]): AdminEvaluator[] {
  return evaluators.filter(isPresentableEvaluator);
}

export function evaluatorsSubtitle(evaluators: AdminEvaluator[] | null): string {
  if (!evaluators) return "Avaliadores ativos";
  const total = presentableEvaluators(evaluators).length;
  return `${total} ${total === 1 ? "avaliador ativo" : "avaliadores ativos"}`;
}

export function evaluatorInitials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return letters || "?";
}

export function evaluatorAreaLine(evaluator: Pick<AdminEvaluator, "area" | "specialization">): string {
  const parts = [evaluator.area, evaluator.specialization].map((value) => value?.trim()).filter((value): value is string => Boolean(value));
  return parts.length ? parts.join(" · ") : "Área não informada";
}

export const EVALUATOR_ACTIVE_LABEL = "Ativo";
export const ASSIGNED_COUNT_LABEL = "Atribuídas";
export const ASSIGNED_COUNT_HINT = "Entrevistas atualmente atribuídas, em avaliação";

export const EVALUATORS_EMPTY = {
  title: "Nenhum avaliador ativo",
  description: "Quando houver avaliadores ativos, eles aparecerão aqui.",
};
