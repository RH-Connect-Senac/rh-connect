/**
 * Acompanhamento da entrevista do candidato (6A.2) — parte PURA (sem React, sem rede,
 * sem armazenamento do navegador).
 *
 * A fonte da verdade é a Interview persistida (`GET /interviews/:id`). Esta camada só traduz
 * `status` + `evaluationMode` + carimbos reais (`submittedAt`, `assignedAt`, `completedAt`) em
 * texto, linha do tempo e CTA. Regras:
 * - uma etapa só aparece como concluída se o status/carimbo a sustenta;
 * - não há prazo prometido, nome de avaliador nem nota aqui;
 * - o resultado só é oferecido para HUMAN + COMPLETED (o relatório em si é carregado pela
 *   tela de relatório, nunca por esta).
 */

import type { RealInterview } from "../services/candidate-interviews-service";

export type TrackingInterview = Pick<
  RealInterview,
  "status" | "evaluationMode" | "createdAt" | "submittedAt" | "assignedAt" | "completedAt"
>;

export type TrackingKind =
  | "pending-assignment"
  | "assigned"
  | "completed"
  | "cancelled"
  | "in-progress"
  | "pending-ai"
  /** Combinação sem acompanhamento definido nesta fase (ex.: IA concluída legada). */
  | "unsupported";

export type TrackingTone = "warning" | "info" | "success" | "neutral";
export type TrackingStepState = "done" | "current" | "upcoming";

export type TrackingStep = {
  key: string;
  label: string;
  /** Data formatada; null quando o Back não informou o carimbo daquela etapa. */
  date: string | null;
  state: TrackingStepState;
};

/**
 * Regra de negócio da avaliação HUMANA (referência conceitual: `submittedAt`). Definida só aqui
 * e exibida apenas enquanto o resultado ainda não existe. É um aviso: não há contagem regressiva
 * e o resultado nunca é bloqueado por prazo.
 */
export const HUMAN_RESULT_DEADLINE_NOTICE =
  "O resultado ficará disponível em até 72 horas após o envio da entrevista.";

export type TrackingCta = "view-result" | "resume-interview" | "back-to-history";

export type TrackingView = {
  kind: TrackingKind;
  title: string;
  description: string;
  /** Aviso de prazo (só HUMAN aguardando atribuição/avaliação); null nos demais estados. */
  deadlineNotice: string | null;
  badgeLabel: string;
  badgeTone: TrackingTone;
  /** Mostra o pulso "em andamento" no selo (só estados que ainda vão mudar). */
  badgeLive: boolean;
  steps: TrackingStep[];
  /** CTA principal; "back-to-history" é o fallback neutro. */
  primaryCta: TrackingCta;
  primaryCtaLabel: string;
};

export function formatTrackingDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function step(key: string, label: string, state: TrackingStepState, date: string | null = null): TrackingStep {
  return { key, label, state, date: state === "upcoming" ? null : date };
}

function humanSteps(interview: TrackingInterview): TrackingStep[] {
  const status = interview.status;
  const submitted = formatTrackingDate(interview.submittedAt);
  const assigned = formatTrackingDate(interview.assignedAt);
  const completed = formatTrackingDate(interview.completedAt);
  const isAssigned = status === "ASSIGNED" || status === "COMPLETED";
  const isCompleted = status === "COMPLETED";
  return [
    step("submitted", "Entrevista enviada", "done", submitted),
    step(
      "assigned",
      isAssigned ? "Atribuída a um avaliador" : "Aguardando atribuição",
      isAssigned ? "done" : "current",
      assigned,
    ),
    step(
      "evaluation",
      isCompleted ? "Avaliação concluída" : "Em avaliação",
      isCompleted ? "done" : status === "ASSIGNED" ? "current" : "upcoming",
      completed,
    ),
    step("result", "Resultado disponível", isCompleted ? "done" : "upcoming", completed),
  ];
}

function aiSteps(interview: TrackingInterview): TrackingStep[] {
  return [
    step("submitted", "Entrevista enviada", "done", formatTrackingDate(interview.submittedAt)),
    step("processing", "Avaliação em processamento", "current"),
    step("result", "Resultado disponível", "upcoming"),
  ];
}

export function buildTrackingView(interview: TrackingInterview): TrackingView {
  const { status, evaluationMode } = interview;

  if (status === "CANCELLED") {
    return {
      kind: "cancelled",
      title: "Entrevista cancelada",
      description: "Esta entrevista foi cancelada e não gerou resultado. Você pode iniciar uma nova entrevista quando quiser.",
      deadlineNotice: null,
      badgeLabel: "Cancelada",
      badgeTone: "neutral",
      badgeLive: false,
      steps: [],
      primaryCta: "back-to-history",
      primaryCtaLabel: "Voltar ao histórico",
    };
  }

  if (status === "IN_PROGRESS") {
    return {
      kind: "in-progress",
      title: "Entrevista em andamento",
      description: "Esta entrevista ainda não foi enviada. Continue de onde parou para concluir o envio.",
      deadlineNotice: null,
      badgeLabel: "Em andamento",
      badgeTone: "info",
      badgeLive: false,
      steps: [],
      primaryCta: "resume-interview",
      primaryCtaLabel: "Continuar entrevista",
    };
  }

  if (evaluationMode === "HUMAN") {
    if (status === "PENDING_ASSIGNMENT") {
      return {
        kind: "pending-assignment",
        title: "Entrevista enviada",
        description:
          "Recebemos suas respostas. Sua entrevista está aguardando a atribuição a um avaliador. O resultado ainda não está disponível.",
        deadlineNotice: HUMAN_RESULT_DEADLINE_NOTICE,
        badgeLabel: "Aguardando atribuição",
        badgeTone: "warning",
        badgeLive: true,
        steps: humanSteps(interview),
        primaryCta: "back-to-history",
        primaryCtaLabel: "Voltar ao histórico",
      };
    }
    if (status === "ASSIGNED") {
      return {
        kind: "assigned",
        title: "Entrevista em avaliação",
        description: "Sua entrevista já foi atribuída a um avaliador e está sendo avaliada. O resultado ainda não está disponível.",
        deadlineNotice: HUMAN_RESULT_DEADLINE_NOTICE,
        badgeLabel: "Em avaliação",
        badgeTone: "warning",
        badgeLive: true,
        steps: humanSteps(interview),
        primaryCta: "back-to-history",
        primaryCtaLabel: "Voltar ao histórico",
      };
    }
    if (status === "COMPLETED") {
      return {
        kind: "completed",
        title: "Avaliação concluída",
        description: "A avaliação da sua entrevista foi concluída e o resultado já está disponível.",
        deadlineNotice: null,
        badgeLabel: "Resultado disponível",
        badgeTone: "success",
        badgeLive: false,
        steps: humanSteps(interview),
        primaryCta: "view-result",
        primaryCtaLabel: "Ver resultado",
      };
    }
  }

  if (evaluationMode === "AI" && status === "PENDING_AI_EVALUATION") {
    return {
      kind: "pending-ai",
      title: "Entrevista enviada",
      description: "Recebemos suas respostas e a avaliação por IA está em processamento. O resultado ainda não está disponível.",
      deadlineNotice: null,
      badgeLabel: "Aguardando avaliação por IA",
      badgeTone: "warning",
      badgeLive: true,
      steps: aiSteps(interview),
      primaryCta: "back-to-history",
      primaryCtaLabel: "Voltar ao histórico",
    };
  }

  return {
    kind: "unsupported",
    title: "Acompanhamento indisponível",
    description: "Ainda não conseguimos mostrar o acompanhamento desta entrevista por aqui. Consulte o histórico.",
    deadlineNotice: null,
    badgeLabel: "Indisponível",
    badgeTone: "neutral",
    badgeLive: false,
    steps: [],
    primaryCta: "back-to-history",
    primaryCtaLabel: "Voltar ao histórico",
  };
}

export type TrackingFailureView = {
  title: string;
  description: string;
  canRetry: boolean;
};

/**
 * Falha do `GET /interviews/:id` → texto de produto. A mensagem recebida já foi sanitizada pelo
 * serviço (já sem detalhe técnico); 404 ganha texto próprio.
 */
export function describeTrackingFailure(reason: string, message: string): TrackingFailureView {
  if (reason === "not_found" || reason === "validation") {
    return {
      title: "Não encontramos esta entrevista",
      description: "Ela não existe ou não está disponível para a sua conta. Acesse o histórico para ver suas entrevistas.",
      canRetry: false,
    };
  }
  if (reason === "unauthorized" || reason === "forbidden") {
    return { title: "Não foi possível abrir esta entrevista", description: message, canRetry: false };
  }
  return { title: "Não foi possível carregar o acompanhamento", description: message, canRetry: true };
}

export type SubmitDestination = "status" | "success";

/**
 * Destino após `POST /interviews/:id/submit` (6A.2). Decide pelo que o BACKEND confirmou
 * (modalidade e status devolvidos), nunca pelo rascunho local:
 * - HUMAN enviada (PENDING_ASSIGNMENT; ASSIGNED/COMPLETED se já tiver avançado) → acompanhamento real;
 * - qualquer outro caso (AI, resposta sem modalidade) → tela de envio já existente, sem mudança.
 */
export function resolveSubmitDestination(
  interview: Pick<RealInterview, "status" | "evaluationMode">,
): SubmitDestination {
  return interview.evaluationMode === "HUMAN" &&
    (interview.status === "PENDING_ASSIGNMENT" || interview.status === "ASSIGNED" || interview.status === "COMPLETED")
    ? "status"
    : "success";
}
