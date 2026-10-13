/**
 * Histórico do candidato (6A.4) — parte PURA (sem React, sem rede, sem armazenamento).
 *
 * A fonte é `GET /interviews` (já ordenada pelo Back por createdAt DESC; a ordem é preservada).
 * Esta camada só traduz status + modalidade + carimbos reais em rótulo, filtro, data, nota e ações:
 * - `overallScore` e `resultAvailable` vêm do Back; nada é recalculado nem inferido pelo status;
 * - "Ver resultado" só existe com `resultAvailable === true`;
 * - nenhum campo ausente vira placeholder; nenhuma data é inventada.
 */

import { formatTrackingDate } from "./interview-tracking-view";
import type { RealHistoryItem, RealInterviewStatus } from "../services/candidate-interviews-service";

export type HistoryFilter = "all" | "in-progress" | "waiting" | "completed";

export const HISTORY_FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "in-progress", label: "Em andamento" },
  { key: "waiting", label: "Aguardando" },
  { key: "completed", label: "Concluídas" },
];

/**
 * Decisão de UX (6A.4): entrevistas CANCELLED continuam existindo no Back e na API, mas NÃO são
 * exibidas no Histórico do candidato (nem em lista, nem em contagem, nem em filtro).
 * Cada status visível pertence a exatamente um filtro.
 */
const FILTER_BY_STATUS: Partial<Record<RealInterviewStatus, Exclude<HistoryFilter, "all">>> = {
  IN_PROGRESS: "in-progress",
  PENDING_ASSIGNMENT: "waiting",
  ASSIGNED: "waiting",
  PENDING_AI_EVALUATION: "waiting",
  COMPLETED: "completed",
};

export type HistoryTone = "info" | "warning" | "success" | "neutral";

export type HistoryActionKind = "resume" | "track" | "result" | "details";

export type HistoryAction = {
  kind: HistoryActionKind;
  label: string;
  variant: "primary" | "outline" | "secondary";
};

export type HistoryItemView = {
  id: string;
  title: string;
  statusLabel: string;
  tone: HistoryTone;
  evaluationMode: "AI" | "HUMAN" | null;
  /** Só campos com valor, na ordem de exibição (empresa, local, contrato, modalidade, perguntas). */
  meta: string[];
  /** "Enviada em 10/10/2026 14:30" etc.; null quando o Back não informou o carimbo. */
  dateText: string | null;
  /** Nota formatada (ex.: "5,6"); só em COMPLETED com resultado disponível e nota informada. */
  score: string | null;
  actions: HistoryAction[];
};

const WORK_MODE_LABEL: Record<string, string> = {
  REMOTE: "Remoto",
  HYBRID: "Híbrido",
  ONSITE: "Presencial",
};

const STATUS_VIEW: Record<RealInterviewStatus, { label: string; tone: HistoryTone }> = {
  IN_PROGRESS: { label: "Em andamento", tone: "info" },
  PENDING_ASSIGNMENT: { label: "Aguardando atribuição", tone: "warning" },
  ASSIGNED: { label: "Em avaliação", tone: "warning" },
  PENDING_AI_EVALUATION: { label: "Aguardando avaliação por IA", tone: "warning" },
  COMPLETED: { label: "Concluída", tone: "success" },
  CANCELLED: { label: "Cancelada", tone: "neutral" },
};

/** null = status que o Histórico não exibe (CANCELLED). */
export function historyFilterOf(status: RealInterviewStatus): Exclude<HistoryFilter, "all"> | null {
  return FILTER_BY_STATUS[status] ?? null;
}

/** Itens exibíveis no Histórico (sem CANCELLED), na mesma ordem do Back. */
export function visibleHistoryItems(items: RealHistoryItem[]): RealHistoryItem[] {
  return items.filter((item) => historyFilterOf(item.status) !== null);
}

export function filterHistory(items: RealHistoryItem[], filter: HistoryFilter): RealHistoryItem[] {
  const visible = visibleHistoryItems(items);
  return filter === "all" ? visible : visible.filter((item) => historyFilterOf(item.status) === filter);
}

export function countByFilter(items: RealHistoryItem[]): Record<HistoryFilter, number> {
  const visible = visibleHistoryItems(items);
  const counts: Record<HistoryFilter, number> = { all: visible.length, "in-progress": 0, waiting: 0, completed: 0 };
  for (const item of visible) {
    const key = historyFilterOf(item.status);
    if (key) counts[key] += 1;
  }
  return counts;
}

export const formatHistoryScore = (score: number) => score.toFixed(1).replace(".", ",");

function dateTextOf(item: RealHistoryItem): string | null {
  const dated = (label: string, value: string | null) => {
    const formatted = formatTrackingDate(value);
    return formatted ? `${label} ${formatted}` : null;
  };
  switch (item.status) {
    case "IN_PROGRESS":
      return dated("Iniciada em", item.createdAt);
    case "COMPLETED":
      return dated("Concluída em", item.completedAt) ?? dated("Enviada em", item.submittedAt);
    case "CANCELLED":
      return dated("Cancelada em", item.updatedAt);
    default:
      return dated("Enviada em", item.submittedAt) ?? dated("Iniciada em", item.createdAt);
  }
}

function actionsOf(item: RealHistoryItem): HistoryAction[] {
  const track: HistoryAction = { kind: "track", label: "Acompanhar", variant: "outline" };
  switch (item.status) {
    case "IN_PROGRESS":
      return [{ kind: "resume", label: "Continuar entrevista", variant: "primary" }];
    case "PENDING_ASSIGNMENT":
    case "ASSIGNED":
    case "PENDING_AI_EVALUATION":
      return [{ ...track, variant: "primary" }];
    case "COMPLETED":
      // O resultado só é oferecido quando o Back confirmou (`resultAvailable`), nunca só pelo status.
      return item.resultAvailable
        ? [{ kind: "result", label: "Ver resultado", variant: "primary" }, track]
        : [{ ...track, variant: "primary" }];
    case "CANCELLED":
      return [{ kind: "details", label: "Ver detalhes", variant: "outline" }];
    default:
      return [];
  }
}

export function buildHistoryItemView(item: RealHistoryItem): HistoryItemView {
  const meta: string[] = [];
  const add = (value: string | null | undefined) => {
    if (typeof value === "string" && value.trim()) meta.push(value.trim());
  };
  add(item.company);
  add(item.location);
  add(item.contractType);
  add(item.workMode ? WORK_MODE_LABEL[item.workMode] : null);
  meta.push(item.questionCount === 1 ? "1 pergunta" : `${item.questionCount} perguntas`);

  const status = STATUS_VIEW[item.status];
  const showScore = item.status === "COMPLETED" && item.resultAvailable && typeof item.overallScore === "number";
  return {
    id: item.id,
    title: item.title,
    statusLabel: status.label,
    tone: status.tone,
    evaluationMode: item.evaluationMode,
    meta,
    dateText: dateTextOf(item),
    score: showScore ? formatHistoryScore(item.overallScore as number) : null,
    actions: actionsOf(item),
  };
}

/** Destino de cada ação (rotas reais já existentes; "resume" é tratada pela tela). */
export function historyActionPath(kind: HistoryActionKind, id: string): string | null {
  switch (kind) {
    case "track":
    case "details":
      return `/candidate/interviews/${id}/status`;
    case "result":
      return `/candidate/reports/${id}`;
    default:
      return null;
  }
}

export const HISTORY_EMPTY_VIEW = {
  title: "Você ainda não realizou entrevistas.",
  description: "Comece uma nova entrevista para acompanhar aqui o seu histórico.",
  cta: "Iniciar nova entrevista",
};

export const HISTORY_FILTER_EMPTY_MESSAGE = "Nenhuma entrevista encontrada para este filtro.";

export type HistoryFailureView = { title: string; description: string; canRetry: boolean };

/** Falha de `GET /interviews` → texto de produto (a mensagem já vem sanitizada pelo serviço). */
export function describeHistoryFailure(reason: string, message: string): HistoryFailureView {
  if (reason === "unauthorized" || reason === "forbidden") {
    return { title: "Não foi possível abrir o histórico", description: message, canRetry: false };
  }
  return { title: "Não foi possível carregar o histórico", description: message, canRetry: true };
}
