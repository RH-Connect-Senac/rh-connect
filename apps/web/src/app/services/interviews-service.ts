import type {
  Assignment,
  Evaluation,
  EvaluationScores,
  Interview,
  InterviewsMockState,
  QuestionEvaluation,
  Report,
  SubmitInterviewInput,
} from "../domain/interviews";
import {
  DEFAULT_EVALUATOR,
  EVALUATOR_DIRECTORY,
  INTERVIEWS_MOCK_STORAGE_KEY,
  INTERVIEWS_MOCK_VERSION,
  createInitialInterviewsMockState,
} from "../mocks/interviews";

export const EVALUATION_CRITERIA = [
  "Clareza",
  "Coerência",
  "Objetividade",
  "Domínio",
  "Organização",
  "Aderência aos requisitos",
  "Capacidade de exemplificar",
];

export function createEmptyEvaluationScores(): EvaluationScores {
  return EVALUATION_CRITERIA.reduce((acc, criterion) => {
    acc[criterion] = 0;
    return acc;
  }, {} as EvaluationScores);
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeState(parsed: unknown): InterviewsMockState {
  if (!parsed || typeof parsed !== "object") return createInitialInterviewsMockState();
  const candidate = parsed as Partial<InterviewsMockState>;
  if (candidate.version !== INTERVIEWS_MOCK_VERSION) return createInitialInterviewsMockState();
  if (!Array.isArray(candidate.interviews) || !Array.isArray(candidate.evaluations) || !Array.isArray(candidate.reports) || !Array.isArray(candidate.assignments)) {
    return createInitialInterviewsMockState();
  }

  return {
    version: INTERVIEWS_MOCK_VERSION,
    interviews: candidate.interviews.map((interview) => ({
      ...interview,
      evaluationMode: interview.evaluationMode ?? "HUMAN",
    })),
    evaluations: candidate.evaluations,
    reports: candidate.reports,
    assignments: candidate.assignments,
  };
}

export function getInterviewsState(): InterviewsMockState {
  if (typeof window === "undefined") return createInitialInterviewsMockState();
  try {
    const raw = window.localStorage.getItem(INTERVIEWS_MOCK_STORAGE_KEY);
    if (!raw) return createInitialInterviewsMockState();
    const normalized = normalizeState(JSON.parse(raw));
    if (JSON.stringify(normalized) !== raw) {
      saveInterviewsState(normalized);
    }
    return normalized;
  } catch {
    const resetState = createInitialInterviewsMockState();
    saveInterviewsState(resetState);
    return resetState;
  }
}

function saveInterviewsState(state: InterviewsMockState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTERVIEWS_MOCK_STORAGE_KEY, JSON.stringify(state));
}

function updateInterviewsState(updater: (state: InterviewsMockState) => InterviewsMockState) {
  const current = getInterviewsState();
  const next = updater(current);
  saveInterviewsState(next);
  return next;
}

export function resetInterviewsState() {
  const state = createInitialInterviewsMockState();
  saveInterviewsState(state);
  return state;
}

export function submitInterview(input: SubmitInterviewInput): Interview {
  const timestamp = nowIso();
  const interview: Interview = {
    id: createId("interview"),
    candidateId: input.candidateId,
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    context: input.context,
    evaluationMode: input.evaluationMode,
    status: input.evaluationMode === "HUMAN" ? "PENDING_EVALUATION" : "PENDING_AI_EVALUATION",
    answers: input.answers,
    submittedAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const report: Report = {
    id: createId("report"),
    interviewId: interview.id,
    status: "UNAVAILABLE",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  updateInterviewsState((state) => ({
    ...state,
    interviews: [interview, ...state.interviews],
    reports: [report, ...state.reports],
  }));

  return interview;
}

export type CompleteAiEvaluationInput = {
  scores: EvaluationScores;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  summary: string;
  questionsEvaluation: QuestionEvaluation[];
};

export function completeAiEvaluation(interviewId: string, input: CompleteAiEvaluationInput) {
  const timestamp = nowIso();
  let completedEvaluation: Evaluation | null = null;

  updateInterviewsState((state) => {
    const interview = state.interviews.find((item) => item.id === interviewId);
    if (!interview || interview.evaluationMode !== "AI") {
      return state;
    }

    const existing = state.evaluations.find((item) => item.interviewId === interviewId);
    completedEvaluation = {
      id: existing?.id ?? createId("evaluation-ai"),
      interviewId,
      evaluatorId: "ai-evaluator",
      evaluatorName: "IA Avaliadora",
      status: "COMPLETED",
      scores: input.scores,
      comment: input.summary,
      overallScore: input.overallScore,
      strengths: input.strengths,
      improvements: input.improvements,
      recommendations: input.recommendations,
      summary: input.summary,
      questionsEvaluation: input.questionsEvaluation,
      completedAt: timestamp,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    return {
      ...state,
      interviews: state.interviews.map((item) =>
        item.id === interviewId
          ? { ...item, status: "EVALUATED", updatedAt: timestamp }
          : item,
      ),
      evaluations: existing
        ? state.evaluations.map((item) => item.id === existing.id ? completedEvaluation! : item)
        : [completedEvaluation!, ...state.evaluations],
      reports: state.reports.map((report) =>
        report.interviewId === interviewId
          ? { ...report, evaluationId: completedEvaluation!.id, status: "AVAILABLE", generatedAt: timestamp, updatedAt: timestamp }
          : report,
      ),
    };
  });

  return completedEvaluation;
}

export function getInterviewById(interviewId?: string) {
  if (!interviewId) return null;
  return getInterviewsState().interviews.find((interview) => interview.id === interviewId) ?? null;
}

// Leitura IRRESTRITA por interviewId — não verifica quem está pedindo.
// Prompt 09: mantida apenas para uso do Admin/interno (visão de negócio
// sobre qualquer entrevista/avaliação, comportamento já existente e fora do
// escopo desta correção) e como implementação interna de
// `saveEvaluationDraft`/`startEvaluation` (que já fazem sua própria checagem
// de propriedade por `evaluatorId` logo em seguida). O fluxo autenticado do
// Avaliador NÃO deve mais chamar esta função diretamente — usar
// `getEvaluationForEvaluator` abaixo, que aplica a checagem de propriedade
// na própria camada de leitura, sem depender só da rota/ProtectedRoute.
export function getEvaluationByInterviewId(interviewId?: string) {
  if (!interviewId) return null;
  return getInterviewsState().evaluations.find((evaluation) => evaluation.interviewId === interviewId) ?? null;
}

// Prompt 09: leitura restrita, para o fluxo autenticado do Avaliador. Só
// retorna a avaliação quando ela pertence realmente ao `evaluatorId`
// informado — antes, as telas de Avaliador liam via
// `getEvaluationByInterviewId(interviewId)` sem nenhuma checagem, então um
// avaliador autenticado que acessasse diretamente por URL a avaliação de
// outra entrevista (não atribuída a ele) conseguia ler notas/comentário já
// salvos por outro avaliador.
export function getEvaluationForEvaluator(interviewId: string | undefined, evaluatorId: string) {
  const evaluation = getEvaluationByInterviewId(interviewId);
  if (!evaluation || evaluation.evaluatorId !== evaluatorId) return null;
  return evaluation;
}

export function getReportByInterviewId(interviewId?: string) {
  if (!interviewId) return null;
  return getInterviewsState().reports.find((report) => report.interviewId === interviewId) ?? null;
}

export function getAssignmentByInterviewId(interviewId?: string) {
  if (!interviewId) return null;
  return getInterviewsState().assignments.find((assignment) => assignment.interviewId === interviewId) ?? null;
}

export function getCandidateInterviews(candidateId: string) {
  return getInterviewsState().interviews.filter((interview) => interview.candidateId === candidateId);
}

export function getAdminVisibleInterviews() {
  return getInterviewsState().interviews.filter((interview) => interview.status !== "IN_PROGRESS");
}

export function getPendingAdminInterviews() {
  return getInterviewsState().interviews.filter((interview) => interview.status === "PENDING_EVALUATION");
}

export function assignInterview(interviewId: string, evaluatorId: string) {
  const evaluator = EVALUATOR_DIRECTORY.find((item) => item.id === evaluatorId) ?? DEFAULT_EVALUATOR;
  const timestamp = nowIso();
  let assignment: Assignment | null = null;

  updateInterviewsState((state) => {
    const targetInterview = state.interviews.find((interview) => interview.id === interviewId);
    if (!targetInterview) return state;

    const interviews = state.interviews.map((interview) => {
      if (interview.id !== interviewId) return interview;
      return {
        ...interview,
        assignedEvaluatorId: evaluator.id,
        status: "ASSIGNED" as const,
        updatedAt: timestamp,
      };
    });
    assignment = {
      interviewId,
      evaluatorId: evaluator.id,
      evaluatorName: evaluator.name,
      assignedAt: timestamp,
    };
    return {
      ...state,
      interviews,
      assignments: [
        assignment,
        ...state.assignments.filter((item) => item.interviewId !== interviewId),
      ],
    };
  });

  return assignment;
}

export function getAssignedInterviews(evaluatorId: string) {
  return getInterviewsState().interviews.filter((interview) =>
    interview.assignedEvaluatorId === evaluatorId &&
    (interview.status === "ASSIGNED" || interview.status === "IN_EVALUATION")
  );
}

export function getCompletedEvaluations(evaluatorId: string) {
  const state = getInterviewsState();
  return state.evaluations
    .filter((evaluation) => evaluation.evaluatorId === evaluatorId && evaluation.status === "COMPLETED")
    .map((evaluation) => {
      const interview = state.interviews.find((item) => item.id === evaluation.interviewId);
      return interview ? { evaluation, interview } : null;
    })
    .filter(Boolean) as { evaluation: Evaluation; interview: Interview }[];
}

export function startEvaluation(interviewId: string, evaluatorId: string) {
  // Prompt 08: antes, um avaliador real autenticado sem correspondência em
  // `EVALUATOR_DIRECTORY` (ponte de compatibilidade sessão real → mock) caía
  // no fallback `?? DEFAULT_EVALUATOR` — o que SUBSTITUÍA silenciosamente a
  // identidade dele pela do avaliador demo ("Carlos Andrade") para fins da
  // checagem de atribuição logo abaixo, permitindo iniciar/gravar uma
  // avaliação de uma entrevista atribuída a outra pessoa. Um avaliador não
  // mapeado agora usa a própria identidade real (id/nome), então a checagem
  // de atribuição abaixo continua correta: só é aceito se a entrevista
  // realmente estiver atribuída a ELE, nunca ao avaliador demo por engano.
  const evaluator =
    EVALUATOR_DIRECTORY.find((item) => item.id === evaluatorId) ??
    { id: evaluatorId, name: evaluatorId };
  const timestamp = nowIso();
  let evaluation: Evaluation | null = null;

  updateInterviewsState((state) => {
    const interview = state.interviews.find((item) => item.id === interviewId);
    if (!interview || interview.assignedEvaluatorId !== evaluator.id) return state;

    const existing = state.evaluations.find((item) => item.interviewId === interviewId);
    if (existing && existing.evaluatorId !== evaluator.id) return state;
    evaluation = existing ?? {
      id: createId("evaluation"),
      interviewId,
      evaluatorId: evaluator.id,
      evaluatorName: evaluator.name,
      status: "DRAFT",
      scores: createEmptyEvaluationScores(),
      comment: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    return {
      ...state,
      interviews: state.interviews.map((item) =>
        item.id === interviewId && item.status === "ASSIGNED"
          ? { ...item, status: "IN_EVALUATION", updatedAt: timestamp }
          : item,
      ),
      evaluations: existing
        ? state.evaluations
        : [evaluation, ...state.evaluations],
    };
  });

  return evaluation;
}

export function saveEvaluationDraft(interviewId: string, scores: EvaluationScores, comment: string, evaluatorId: string) {
  // Mesmo motivo do fallback corrigido em `startEvaluation` acima: não
  // substituir a identidade de um avaliador real não mapeado pela do
  // avaliador demo.
  const evaluator =
    EVALUATOR_DIRECTORY.find((item) => item.id === evaluatorId) ??
    { id: evaluatorId, name: evaluatorId };
  const existing = getEvaluationByInterviewId(interviewId) ?? startEvaluation(interviewId, evaluator.id);
  if (!existing) return null;
  if (existing.evaluatorId !== evaluator.id) return null;
  const timestamp = nowIso();
  const nextEvaluation = {
    ...existing,
    scores,
    comment,
    status: "DRAFT" as const,
    updatedAt: timestamp,
  };

  updateInterviewsState((state) => ({
    ...state,
    evaluations: state.evaluations.map((item) => item.id === nextEvaluation.id ? nextEvaluation : item),
  }));

  return nextEvaluation;
}

export function completeEvaluation(interviewId: string, scores: EvaluationScores, comment: string, evaluatorId: string) {
  const existing = saveEvaluationDraft(interviewId, scores, comment, evaluatorId);
  if (!existing) return null;
  const timestamp = nowIso();
  const completedEvaluation = {
    ...existing,
    scores,
    comment,
    status: "COMPLETED" as const,
    completedAt: timestamp,
    updatedAt: timestamp,
  };

  updateInterviewsState((state) => ({
    ...state,
    interviews: state.interviews.map((interview) =>
      interview.id === interviewId
        ? { ...interview, status: "EVALUATED", updatedAt: timestamp }
        : interview,
    ),
    evaluations: state.evaluations.map((evaluation) =>
      evaluation.id === completedEvaluation.id ? completedEvaluation : evaluation,
    ),
    reports: state.reports.map((report) =>
      report.interviewId === interviewId
        ? { ...report, evaluationId: completedEvaluation.id, status: "AVAILABLE", generatedAt: timestamp, updatedAt: timestamp }
        : report,
    ),
  }));

  return completedEvaluation;
}

export function getAvailableCandidateReports(candidateId: string) {
  const state = getInterviewsState();
  return state.reports
    .filter((report) => report.status === "AVAILABLE")
    .map((report) => {
      const interview = state.interviews.find((item) => item.id === report.interviewId);
      const evaluation = report.evaluationId ? state.evaluations.find((item) => item.id === report.evaluationId) : undefined;
      return interview?.candidateId === candidateId ? { report, interview, evaluation } : null;
    })
    .filter(Boolean) as { report: Report; interview: Interview; evaluation?: Evaluation }[];
}

export function getAverageScore(scores?: EvaluationScores) {
  if (!scores) return null;
  const values = Object.values(scores).filter((score) => score > 0);
  if (values.length === 0) return null;
  return values.reduce((sum, score) => sum + score, 0) / values.length;
}

export function formatScore(score?: number | null) {
  return score == null ? "—" : score.toFixed(1);
}

export function statusLabelFromInterview(status: Interview["status"]) {
  const labels = {
    IN_PROGRESS: "Em andamento",
    PENDING_AI_EVALUATION: "Aguardando avaliação por IA",
    PENDING_EVALUATION: "Aguardando avaliação",
    ASSIGNED: "Atribuída",
    IN_EVALUATION: "Em avaliação",
    EVALUATED: "Avaliada",
  } satisfies Record<Interview["status"], string>;
  return labels[status];
}
