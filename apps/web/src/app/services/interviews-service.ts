import type {
  Assignment,
  Evaluation,
  EvaluationScores,
  Interview,
  InterviewsMockState,
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
    interviews: candidate.interviews,
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
    status: "PENDING_EVALUATION",
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

export function getInterviewById(interviewId?: string) {
  if (!interviewId) return null;
  return getInterviewsState().interviews.find((interview) => interview.id === interviewId) ?? null;
}

export function getEvaluationByInterviewId(interviewId?: string) {
  if (!interviewId) return null;
  return getInterviewsState().evaluations.find((evaluation) => evaluation.interviewId === interviewId) ?? null;
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

export function getAssignedInterviews(evaluatorId = DEFAULT_EVALUATOR.id) {
  return getInterviewsState().interviews.filter((interview) =>
    interview.assignedEvaluatorId === evaluatorId &&
    (interview.status === "ASSIGNED" || interview.status === "IN_EVALUATION")
  );
}

export function getCompletedEvaluations(evaluatorId = DEFAULT_EVALUATOR.id) {
  const state = getInterviewsState();
  return state.evaluations
    .filter((evaluation) => evaluation.evaluatorId === evaluatorId && evaluation.status === "COMPLETED")
    .map((evaluation) => {
      const interview = state.interviews.find((item) => item.id === evaluation.interviewId);
      return interview ? { evaluation, interview } : null;
    })
    .filter(Boolean) as { evaluation: Evaluation; interview: Interview }[];
}

export function startEvaluation(interviewId: string, evaluatorId = DEFAULT_EVALUATOR.id) {
  const evaluator = EVALUATOR_DIRECTORY.find((item) => item.id === evaluatorId) ?? DEFAULT_EVALUATOR;
  const timestamp = nowIso();
  let evaluation: Evaluation | null = null;

  updateInterviewsState((state) => {
    const interview = state.interviews.find((item) => item.id === interviewId);
    if (!interview || interview.assignedEvaluatorId !== evaluator.id) return state;

    const existing = state.evaluations.find((item) => item.interviewId === interviewId);
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

export function saveEvaluationDraft(interviewId: string, scores: EvaluationScores, comment = "", evaluatorId = DEFAULT_EVALUATOR.id) {
  const existing = getEvaluationByInterviewId(interviewId) ?? startEvaluation(interviewId, evaluatorId);
  if (!existing) return null;
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

export function completeEvaluation(interviewId: string, scores: EvaluationScores, comment = "", evaluatorId = DEFAULT_EVALUATOR.id) {
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

export function statusLabelFromInterview(status: Interview["status"]) {
  const labels = {
    IN_PROGRESS: "Em andamento",
    PENDING_EVALUATION: "Aguardando avaliação",
    ASSIGNED: "Atribuída",
    IN_EVALUATION: "Em avaliação",
    EVALUATED: "Avaliada",
  } satisfies Record<Interview["status"], string>;
  return labels[status];
}
