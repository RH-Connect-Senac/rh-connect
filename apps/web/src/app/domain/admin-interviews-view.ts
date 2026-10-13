/**
 * RH Connect — Gestão de Entrevistas do Admin (domínio PURO, 7A.1).
 *
 * Só transforma o que `GET /admin/interviews` já entrega: rótulos de status,
 * contadores dos cards, busca local, ID abreviado, nota e linha do tempo. Não
 * lê nem grava storage, não faz requisição e NUNCA recalcula nota: o
 * `overallScore` vem pronto do Back (HUMAN com avaliação concluída).
 */

import type { AdminInterviewListItem } from "../services/admin-interviews-service";

export type AdminInterviewTone = "default" | "success" | "warning" | "error" | "info" | "purple";

export const ADMIN_INTERVIEWS_EMPTY_MESSAGE = "Nenhuma entrevista registrada.";
export const ADMIN_INTERVIEWS_EMPTY_SEARCH_MESSAGE = "Nenhuma entrevista encontrada para a busca.";
export const ADMIN_INTERVIEWS_AWAITING_SCORE = "Aguardando avaliação";

/** Status visual a partir do status real + da avaliação (nunca de texto do mock). */
export function getAdminInterviewStatusLabel(
  item: Pick<AdminInterviewListItem, "status" | "evaluation">,
): string {
  switch (item.status) {
    case "PENDING_ASSIGNMENT":
      return "Aguardando atribuição";
    case "ASSIGNED":
      return item.evaluation?.status === "DRAFT" ? "Em avaliação" : "Atribuída";
    case "COMPLETED":
      return "Concluída";
    case "PENDING_AI_EVALUATION":
      return "Aguardando avaliação por IA";
  }
}

export function getAdminInterviewStatusTone(
  item: Pick<AdminInterviewListItem, "status" | "evaluation">,
): AdminInterviewTone {
  switch (item.status) {
    case "PENDING_ASSIGNMENT":
    case "PENDING_AI_EVALUATION":
      return "warning";
    case "ASSIGNED":
      return "info";
    case "COMPLETED":
      return "success";
  }
}

export type AdminInterviewsSummary = {
  pendingAssignment: number;
  inEvaluation: number;
  completed: number;
};

/** Cards: cada contagem é exatamente o rótulo visual da tabela (sem "este mês"). */
export function summarizeAdminInterviews(
  items: readonly Pick<AdminInterviewListItem, "status" | "evaluation">[],
): AdminInterviewsSummary {
  let pendingAssignment = 0;
  let inEvaluation = 0;
  let completed = 0;
  for (const item of items) {
    const label = getAdminInterviewStatusLabel(item);
    if (label === "Aguardando atribuição") pendingAssignment += 1;
    else if (label === "Em avaliação") inEvaluation += 1;
    else if (label === "Concluída") completed += 1;
  }
  return { pendingAssignment, inEvaluation, completed };
}

/** Busca local (sem backend): nome do candidato e título da vaga, sem diferenciar maiúsculas. */
export function filterAdminInterviews<T extends Pick<AdminInterviewListItem, "jobTitle" | "candidate">>(
  items: readonly T[],
  term: string,
): T[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [...items];
  return items.filter(
    (item) =>
      item.candidate.name.toLowerCase().includes(needle) || item.jobTitle.toLowerCase().includes(needle),
  );
}

/** ID abreviado só para exibição ("#1A2B3C4D"); o valor real continua sendo `item.id`. */
export function formatAdminInterviewShortId(id: string): string {
  return `#${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** Data de referência da linha: envio; criação só como último recurso. */
export function adminInterviewReferenceDate(item: Pick<AdminInterviewListItem, "submittedAt" | "createdAt">): string {
  return item.submittedAt ?? item.createdAt;
}

/** Nota exibida: a do Back quando existe; senão "—". Nunca calcula média. */
export function formatAdminInterviewScore(score: number | null | undefined): string {
  return typeof score === "number" && Number.isFinite(score) ? score.toFixed(1) : "—";
}

export function adminInterviewScoreTone(score: number): "success" | "info" {
  return score >= 8 ? "success" : "info";
}

export function adminInterviewEvaluatorName(item: Pick<AdminInterviewListItem, "evaluator">): string {
  return item.evaluator?.name ?? "—";
}

/**
 * Entrevista exibida no detalhe do candidato. Considera SOMENTE entrevistas do
 * próprio candidato (defesa extra: o Back já filtra por `candidateId`). Com
 * `interviewId` de outro candidato (ou inexistente) cai na mais recente do
 * candidato — nunca mostra dado de terceiros.
 */
export function pickCandidateInterview(
  items: readonly AdminInterviewListItem[],
  candidateId: string | undefined,
  interviewId: string | undefined,
): AdminInterviewListItem | null {
  const ownerId = candidateId !== undefined && /^\d+$/.test(candidateId) ? Number(candidateId) : null;
  if (ownerId === null) return null;
  const own = items.filter((item) => item.candidate.id === ownerId);
  if (own.length === 0) return null;
  if (interviewId) {
    const match = own.find((item) => item.id === interviewId);
    if (match) return match;
  }
  return own.reduce((latest, item) =>
    adminInterviewReferenceDate(item) > adminInterviewReferenceDate(latest) ? item : latest,
  );
}

export type AdminTimelineIcon = "account" | "onboarding" | "created" | "submitted" | "assigned" | "completed";

export type AdminTimelineEvent = { icon: AdminTimelineIcon; label: string; at: string };

/** Linha do tempo apenas com timestamps reais (conta + entrevista). Ausente => omitido. */
export function buildCandidateTimeline(
  account: { createdAt?: string | null; onboardingCompletedAt?: string | null },
  interview: AdminInterviewListItem | null,
): AdminTimelineEvent[] {
  const events: AdminTimelineEvent[] = [];
  if (account.createdAt) events.push({ icon: "account", label: "Cadastro criado", at: account.createdAt });
  if (account.onboardingCompletedAt) {
    events.push({ icon: "onboarding", label: "Onboarding concluído", at: account.onboardingCompletedAt });
  }
  if (interview) {
    events.push({ icon: "created", label: "Entrevista criada", at: interview.createdAt });
    if (interview.submittedAt) events.push({ icon: "submitted", label: "Entrevista enviada", at: interview.submittedAt });
    if (interview.assignedAt) events.push({ icon: "assigned", label: "Avaliador atribuído", at: interview.assignedAt });
    if (interview.evaluation?.completedAt) {
      events.push({ icon: "completed", label: "Avaliação concluída", at: interview.evaluation.completedAt });
    }
  }
  return events;
}
