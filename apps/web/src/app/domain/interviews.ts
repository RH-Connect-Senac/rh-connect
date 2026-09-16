import type { JobInterviewContext } from "../services/interview-context-service";

export type InterviewStatus =
  | "IN_PROGRESS"
  | "PENDING_EVALUATION"
  | "ASSIGNED"
  | "IN_EVALUATION"
  | "EVALUATED";

export type EvaluationStatus = "DRAFT" | "COMPLETED";

export type ReportStatus = "UNAVAILABLE" | "AVAILABLE";

export type InterviewAnswer = {
  questionId: number;
  questionText: string;
  questionType: string;
  answer: string;
};

export type Interview = {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  context: JobInterviewContext;
  status: InterviewStatus;
  answers: InterviewAnswer[];
  submittedAt?: string;
  assignedEvaluatorId?: string;
  createdAt: string;
  updatedAt: string;
};

export type EvaluationScores = Record<string, number>;

export type Evaluation = {
  id: string;
  interviewId: string;
  evaluatorId: string;
  evaluatorName: string;
  status: EvaluationStatus;
  scores: EvaluationScores;
  comment?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Report = {
  id: string;
  interviewId: string;
  evaluationId?: string;
  status: ReportStatus;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type Assignment = {
  interviewId: string;
  evaluatorId: string;
  evaluatorName: string;
  assignedAt: string;
};

export type InterviewsMockState = {
  version: number;
  interviews: Interview[];
  evaluations: Evaluation[];
  reports: Report[];
  assignments: Assignment[];
};

export type SubmitInterviewInput = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  context: JobInterviewContext;
  answers: InterviewAnswer[];
};
