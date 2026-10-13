import { readCriteriaScores } from '../evaluator-interviews/evaluation-criteria';
import {
  QUESTION_SELECT,
  toQuestionResponse,
  type QuestionRecord,
} from './interview-flow';
import {
  INTERVIEW_SELECT,
  toInterviewResponse,
  type InterviewRecord,
} from './interview-projection';

// Leitura do CANDIDATO sobre o que já está persistido (6A.1): acompanhamento,
// histórico e resultado. Tudo é projeção de interview + interview_question +
// interview_evaluation (não existe tabela `report`). Nada aqui chama Python/IA,
// recalcula nota ou grava no banco. `select` explícito, nunca `include`: o
// candidato nunca recebe candidate_user_id, evaluator_profile_id, quem atribuiu
// nem o rascunho de uma avaliação ainda não concluída.

// Teto de segurança do histórico (a paginação entra aqui depois, sem mudar o
// contrato de cada item). `total` informa quantas existem de fato.
export const MAX_HISTORY_SIZE = 200;

interface EvaluationStatusRecord {
  status: string;
  completed_at: Date | null;
}

interface EvaluationScoreRecord extends EvaluationStatusRecord {
  overall_score: { toString(): string } | number | null;
}

// Detalhe do acompanhamento (GET /interviews/:id): a base de sempre mais os dois
// carimbos de tempo que o banco já tem (atribuição e conclusão).
export const CANDIDATE_DETAIL_SELECT = {
  ...INTERVIEW_SELECT,
  assigned_at: true,
  evaluation: { select: { status: true, completed_at: true } },
} as const;

export interface CandidateDetailRecord extends InterviewRecord {
  assigned_at?: Date | null;
  evaluation?: EvaluationStatusRecord | null;
}

// Item da listagem (GET /interviews): só o necessário para Histórico/Dashboard.
// Sem perguntas/respostas (só a contagem, via _count, sem N+1).
export const HISTORY_LIST_SELECT = {
  interview_id: true,
  status: true,
  evaluation_mode: true,
  job_title: true,
  job_company: true,
  job_location: true,
  job_contract_type: true,
  job_work_mode: true,
  submitted_at: true,
  created_at: true,
  updated_at: true,
  assigned_at: true,
  evaluation: {
    select: { status: true, overall_score: true, completed_at: true },
  },
  _count: { select: { questions: true } },
} as const;

export interface HistoryListRecord {
  interview_id: string;
  status: string;
  evaluation_mode: string | null;
  job_title: string;
  job_company: string | null;
  job_location: string | null;
  job_contract_type: string | null;
  job_work_mode: string | null;
  submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  assigned_at: Date | null;
  evaluation: EvaluationScoreRecord | null;
  _count: { questions: number };
}

// Resultado (GET /interviews/:id/result): entrevista + avaliação + perguntas e
// respostas. Um único findFirst (sem uma consulta por pergunta).
export const RESULT_SELECT = {
  ...INTERVIEW_SELECT,
  assigned_at: true,
  evaluation: {
    select: {
      status: true,
      criteria_scores: true,
      summary: true,
      overall_score: true,
      completed_at: true,
    },
  },
  questions: { orderBy: { position: 'asc' }, select: QUESTION_SELECT },
} as const;

export interface ResultRecord extends InterviewRecord {
  assigned_at: Date | null;
  evaluation: {
    status: string;
    criteria_scores: unknown;
    summary: string | null;
    overall_score: { toString(): string } | number | null;
    completed_at: Date | null;
  } | null;
  questions: QuestionRecord[];
}

// Única regra de "avaliação concluída e visível ao candidato": a entrevista E a
// avaliação estão COMPLETED. Rascunho (DRAFT) do avaliador nunca é exposto.
function completedEvaluation<T extends EvaluationStatusRecord>(
  interviewStatus: string,
  evaluation: T | null | undefined,
): T | null {
  return interviewStatus === 'COMPLETED' && evaluation?.status === 'COMPLETED'
    ? evaluation
    : null;
}

// Única regra de "existe resultado para o candidato" (v1: somente HUMAN; o
// resultado de IA continua bloqueado pela Fase 3/6B).
export function isResultAvailable(
  interviewStatus: string,
  evaluationMode: string | null,
  evaluation: EvaluationStatusRecord | null | undefined,
): boolean {
  return (
    evaluationMode === 'HUMAN' &&
    completedEvaluation(interviewStatus, evaluation) !== null
  );
}

function toScore(
  value: { toString(): string } | number | null | undefined,
): number | null {
  return value === null || value === undefined ? null : Number(value);
}

// GET /interviews/:id: mesma projeção de sempre + assignedAt/completedAt
// (aditivos; quem já consome o contrato antigo continua funcionando).
export function toCandidateInterviewResponse(record: CandidateDetailRecord) {
  const done = completedEvaluation(record.status, record.evaluation);
  return {
    ...toInterviewResponse(record),
    assignedAt: record.assigned_at ?? null,
    completedAt: done?.completed_at ?? null,
  };
}

export function toHistoryItem(record: HistoryListRecord) {
  const done = completedEvaluation(record.status, record.evaluation);
  return {
    id: record.interview_id,
    status: record.status,
    evaluationMode: record.evaluation_mode,
    title: record.job_title,
    company: record.job_company,
    location: record.job_location,
    contractType: record.job_contract_type,
    workMode: record.job_work_mode,
    submittedAt: record.submitted_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    assignedAt: record.assigned_at,
    completedAt: done?.completed_at ?? null,
    questionCount: record._count.questions,
    // Resumo mínimo, só com avaliação concluída (o Histórico/Dashboard precisam
    // da nota; o detalhe completo fica em /result).
    overallScore: done ? toScore(done.overall_score) : null,
    resultAvailable: isResultAvailable(
      record.status,
      record.evaluation_mode,
      record.evaluation,
    ),
  };
}

// Avaliação HUMANA: só a nota geral, os critérios canônicos e o parecer. NÃO há
// nota por pergunta (não existe no modelo humano); perguntas e respostas vão
// como contexto, sem campo de score.
export function toResult(
  record: ResultRecord & {
    evaluation: NonNullable<ResultRecord['evaluation']>;
  },
) {
  const evaluation = record.evaluation;
  return {
    interview: toCandidateInterviewResponse(record),
    evaluation: {
      overallScore: toScore(evaluation.overall_score),
      criteriaScores: readCriteriaScores(evaluation.criteria_scores),
      summary: evaluation.summary,
      completedAt: evaluation.completed_at,
    },
    questions: record.questions.map(toQuestionResponse),
  };
}
