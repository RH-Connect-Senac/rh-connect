/**
 * Retomada de entrevistas IN_PROGRESS pelo Dashboard — parte PURA (sem React,
 * sem rede, sem armazenamento do navegador).
 *
 * O Back (PostgreSQL) é a fonte da verdade: respostas oficiais, rascunhos e
 * versões vêm de `GET /interviews/:id/questions`. O localStorage só guarda
 * progresso de UX/edições ainda não sincronizadas e é reconciliado por
 * `interviewId` (nunca duplica a entrevista no Dashboard).
 */

import { deriveHighestReachedIndex } from "../services/interview-ux-state";

export type ResumeQuestion = {
  id: string;
  position: number;
  answer: string | null;
  draftText: string | null;
  draftUpdatedAt: string | null;
};

export type ResumePoint = { kind: "question"; index: number } | { kind: "review" };

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Só a resposta OFICIAL conta como respondida. `draftText` nunca conta. */
export function isQuestionAnswered(question: Pick<ResumeQuestion, "answer">): boolean {
  return hasText(question.answer);
}

function timeOf(value: string | null): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

/**
 * Regra de retomada da pergunta:
 *  1. pergunta com rascunho (texto) de `draftUpdatedAt` MAIS RECENTE no Back;
 *  2. senão, a primeira pergunta sem resposta oficial;
 *  3. senão (tudo respondido), a revisão.
 * `questions` deve estar ordenada por `position`.
 */
export function chooseResumePoint(questions: ResumeQuestion[]): ResumePoint {
  let bestIndex = -1;
  let bestTime = Number.NEGATIVE_INFINITY;
  questions.forEach((question, index) => {
    if (!hasText(question.draftText)) return;
    const time = timeOf(question.draftUpdatedAt);
    if (Number.isNaN(time)) return;
    // Empate: mantém a primeira (índice menor).
    if (time > bestTime) {
      bestTime = time;
      bestIndex = index;
    }
  });
  if (bestIndex >= 0) return { kind: "question", index: bestIndex };

  const firstPending = questions.findIndex((question) => !isQuestionAnswered(question));
  if (firstPending >= 0) return { kind: "question", index: firstPending };
  return { kind: "review" };
}

/**
 * Maior pergunta já alcançada: máximo entre respondidas, com rascunho e a
 * escolhida para retomar (permite navegar de volta para as anteriores).
 */
export function resolveHighestReached(questions: ResumeQuestion[], chosenIndex: number): number {
  // Mesma regra única do wizard (também usada no F5): ver deriveHighestReachedIndex.
  return deriveHighestReachedIndex({
    currentIndex: Math.max(0, chosenIndex),
    answeredIndexes: questions.flatMap((question, index) => (isQuestionAnswered(question) ? [index] : [])),
    draftedIndexes: questions.flatMap((question, index) => (hasText(question.draftText) ? [index] : [])),
    questionCount: questions.length,
  });
}

export type ResumeScreen =
  | "interview-setup"
  | "evaluation-mode"
  | "interview"
  | "review";

export type ResumeTarget = {
  screen: ResumeScreen;
  currentQuestionIndex: number;
  highestQuestionIndex: number;
};

/** Etapa do wizard para a qual a retomada deve levar. */
export function resolveResumeTarget(input: {
  questions: ResumeQuestion[];
  evaluationMode: "AI" | "HUMAN" | null;
}): ResumeTarget {
  const { questions, evaluationMode } = input;
  if (questions.length === 0) {
    return { screen: "interview-setup", currentQuestionIndex: 0, highestQuestionIndex: 0 };
  }
  if (!evaluationMode) {
    return { screen: "evaluation-mode", currentQuestionIndex: 0, highestQuestionIndex: 0 };
  }
  const point = chooseResumePoint(questions);
  if (point.kind === "review") {
    const last = questions.length - 1;
    return {
      screen: "review",
      currentQuestionIndex: last,
      highestQuestionIndex: resolveHighestReached(questions, last),
    };
  }
  return {
    screen: "interview",
    currentQuestionIndex: point.index,
    highestQuestionIndex: resolveHighestReached(questions, point.index),
  };
}

export type ResumeSourceInterview = {
  id: string;
  status: string;
  evaluationMode: "AI" | "HUMAN" | null;
};

export type ResumePlanResult<Q extends ResumeQuestion> =
  | {
      ok: true;
      interviewId: string;
      evaluationMode: "AI" | "HUMAN" | null;
      questions: Q[];
      /** Respostas OFICIAIS por id de pergunta (nunca inclui rascunho). */
      answers: Record<string, string>;
      target: ResumeTarget;
    }
  | { ok: false; reason: "not_in_progress" };

/**
 * Plano de retomada a partir do que o Back devolveu. Reconfere IN_PROGRESS
 * (tanto no GET da entrevista quanto no `interviewStatus` das perguntas):
 * qualquer outro status → sem plano (nenhum wizard, nenhum estado local falso).
 */
export function buildResumePlan<Q extends ResumeQuestion>(input: {
  interview: ResumeSourceInterview;
  questions: Q[];
  questionsInterviewStatus: string | null;
}): ResumePlanResult<Q> {
  const { interview, questionsInterviewStatus } = input;
  if (interview.status !== "IN_PROGRESS") return { ok: false, reason: "not_in_progress" };
  if (questionsInterviewStatus !== null && questionsInterviewStatus !== "IN_PROGRESS") {
    return { ok: false, reason: "not_in_progress" };
  }
  const questions = [...input.questions].sort((a, b) => a.position - b.position);
  const answers: Record<string, string> = {};
  for (const question of questions) {
    if (isQuestionAnswered(question)) answers[question.id] = question.answer as string;
  }
  return {
    ok: true,
    interviewId: interview.id,
    evaluationMode: interview.evaluationMode,
    questions,
    answers,
    target: resolveResumeTarget({ questions, evaluationMode: interview.evaluationMode }),
  };
}

export type InProgressListItem = {
  id: string;
  title: string;
  company: string | null;
  evaluationMode: "AI" | "HUMAN" | null;
  createdAt: string;
  questionCount: number;
  answeredQuestionCount: number;
  latestDraftUpdatedAt: string | null;
};

export type DashboardInProgressEntry =
  | { source: "server"; item: InProgressListItem; hasLocalProgress: boolean }
  | { source: "local"; interviewId: string | null };

/**
 * Reconciliação Dashboard: a lista do Back é autoritativa (mais recentes
 * primeiro, sem duplicar). O rascunho local do mesmo `interviewId` apenas marca
 * `hasLocalProgress`. Enquanto a lista não chegou (carregando/erro), um
 * rascunho local aparece como fallback; com a lista carregada, um local sem
 * correspondente NÃO é exibido (o Back diz que não está mais em andamento).
 */
export function mergeInProgressEntries(input: {
  server: InProgressListItem[] | null;
  localInterviewId: string | null | undefined;
  localActive: boolean;
}): DashboardInProgressEntry[] {
  const { server, localInterviewId, localActive } = input;
  if (server === null) {
    return localActive ? [{ source: "local", interviewId: localInterviewId ?? null }] : [];
  }
  const seen = new Set<string>();
  const entries: DashboardInProgressEntry[] = [];
  for (const item of server) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    entries.push({
      source: "server",
      item,
      hasLocalProgress: Boolean(localActive && localInterviewId && localInterviewId === item.id),
    });
  }
  return entries;
}

export function formatInProgressProgress(item: {
  answeredQuestionCount: number;
  questionCount: number;
}): string {
  if (item.questionCount === 0) return "Perguntas ainda não geradas";
  return `${item.answeredQuestionCount} de ${item.questionCount} perguntas respondidas`;
}

export const NEW_INTERVIEW_BLOCKED_MESSAGE =
  "Você já possui uma entrevista em andamento. Continue essa entrevista antes de iniciar outra.";

export type NewInterviewGate =
  | { blocked: false }
  | { blocked: true; resume: { source: "server"; interviewId: string } | { source: "local" } };

/**
 * UX preventiva (V1: uma IN_PROGRESS por candidato): se o Dashboard já sabe que
 * existe uma entrevista em andamento, "Nova entrevista" não abre outro wizard e
 * oferece "Continuar entrevista". O Back continua sendo a barreira real (409).
 * Registros legados (várias IN_PROGRESS): oferece a mais recente (1ª da lista).
 */
export function resolveNewInterviewGate(entries: DashboardInProgressEntry[]): NewInterviewGate {
  const first = entries[0];
  if (!first) return { blocked: false };
  return first.source === "server"
    ? { blocked: true, resume: { source: "server", interviewId: first.item.id } }
    : { blocked: true, resume: { source: "local" } };
}

export type DashboardInterviewAccess = {
  /** "start": abre o fluxo de nova entrevista; "continue": abre a IN_PROGRESS existente. */
  action: "start" | "continue";
  main: { title: string; description: string; cta: string };
  quick: { title: string; description: string };
};

/**
 * Conteúdo dos dois acessos à entrevista no Dashboard (card principal e atalho).
 * É derivado só do gate (lista real de IN_PROGRESS): a interface informa a ação ANTES do clique.
 */
export function resolveDashboardInterviewAccess(gate: NewInterviewGate): DashboardInterviewAccess {
  if (gate.blocked) {
    return {
      action: "continue",
      main: {
        title: "Entrevista em andamento",
        description: "Você tem uma entrevista que ainda não foi concluída. Continue de onde parou.",
        cta: "Continuar entrevista",
      },
      quick: { title: "Continuar entrevista", description: "Retome sua prática de onde parou." },
    };
  }
  return {
    action: "start",
    main: {
      title: "Nova entrevista",
      description: "Cole a URL da vaga e pratique com perguntas contextualizadas.",
      cta: "Praticar",
    },
    quick: { title: "Nova entrevista", description: "Use o link da vaga para contextualizar sua prática" },
  };
}
