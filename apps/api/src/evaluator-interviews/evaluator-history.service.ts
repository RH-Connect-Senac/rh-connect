import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  QUESTION_SELECT,
  toQuestionResponse,
  type QuestionRecord,
} from '../interviews/interview-flow';
import {
  INTERVIEW_SELECT,
  toInterviewResponse,
  type InterviewRecord,
} from '../interviews/interviews.service';
import { readCriteriaScores } from './evaluation-criteria';
import {
  CANDIDATE_SELECT,
  toCandidate,
  type CandidateRecord,
} from './evaluator-interviews.service';

// Mesmo teto de segurança da fila ativa; sem paginação nesta fase.
const MAX_HISTORY_SIZE = 500;

const NOT_FOUND_MESSAGE = 'Avaliação não encontrada.';

// Filtro DEDICADO do histórico (não reutiliza o `visibleTo` da fila ativa, que é
// ASSIGNED): entrevista HUMAN, do PRÓPRIO avaliador, COMPLETED, e com a avaliação
// também COMPLETED. Lista e detalhe usam o mesmo filtro, então "não existe",
// "é de outro avaliador", "é IA", "ainda ASSIGNED" e "COMPLETED sem avaliação
// concluída" produzem exatamente a mesma resposta (404 no detalhe).
function historyFilter(evaluatorProfileId: number) {
  return {
    evaluator_profile_id: evaluatorProfileId,
    evaluation_mode: 'HUMAN',
    status: 'COMPLETED',
    evaluation: { is: { status: 'COMPLETED' } },
  } as const;
}

// `select` explícito (nunca `include`): sem e-mail do candidato, hash, tokens,
// ids internos de avaliador nem quem atribuiu.
const EVALUATION_SELECT = {
  criteria_scores: true,
  summary: true,
  overall_score: true,
  completed_at: true,
} as const;

const LIST_SELECT = {
  interview_id: true,
  job_title: true,
  job_company: true,
  // Dashboard (gráfico "Recebidas"): momento em que a entrevista chegou ao avaliador.
  assigned_at: true,
  candidate: { select: CANDIDATE_SELECT },
  evaluation: { select: { overall_score: true, completed_at: true } },
  _count: { select: { questions: true } },
} as const;

const DETAIL_SELECT = {
  ...INTERVIEW_SELECT,
  candidate: { select: CANDIDATE_SELECT },
  questions: { orderBy: { position: 'asc' }, select: QUESTION_SELECT },
  evaluation: { select: EVALUATION_SELECT },
} as const;

type Score = { toString(): string } | number | null;

interface HistoryEvaluationRecord {
  overall_score: Score;
  completed_at: Date | null;
}

interface ListRecord {
  interview_id: string;
  job_title: string;
  job_company: string | null;
  assigned_at: Date | null;
  candidate: CandidateRecord;
  evaluation: HistoryEvaluationRecord | null;
  _count: { questions: number };
}

interface DetailRecord extends InterviewRecord {
  candidate: CandidateRecord;
  questions: QuestionRecord[];
  evaluation:
    | (HistoryEvaluationRecord & {
        criteria_scores: unknown;
        summary: string | null;
      })
    | null;
}

function toScore(value: Score): number | null {
  return value === null ? null : Number(value);
}

function toListItem(record: ListRecord) {
  return {
    interviewId: record.interview_id,
    candidate: toCandidate(record.candidate),
    jobTitle: record.job_title,
    company: record.job_company,
    overallScore: toScore(record.evaluation?.overall_score ?? null),
    assignedAt: record.assigned_at ?? null,
    completedAt: record.evaluation?.completed_at ?? null,
    questionCount: record._count.questions,
  };
}

function toDetail(record: DetailRecord) {
  const base = toInterviewResponse(record);
  const evaluation = record.evaluation;
  return {
    interviewId: base.id,
    status: base.status,
    evaluationMode: base.evaluationMode,
    submittedAt: base.submittedAt,
    candidate: toCandidate(record.candidate),
    context: base.context,
    questions: record.questions.map(toQuestionResponse),
    evaluation: {
      status: 'COMPLETED' as const,
      criteriaScores: readCriteriaScores(evaluation?.criteria_scores),
      summary: evaluation?.summary ?? null,
      overallScore: toScore(evaluation?.overall_score ?? null),
      completedAt: evaluation?.completed_at ?? null,
    },
  };
}

// Histórico SOMENTE LEITURA do avaliador (6A.1). O avaliador vem sempre do JWT:
// user_id -> evaluator_profile.user_id -> evaluator_profile_id. Nada aqui grava.
@Injectable()
export class EvaluatorHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  // Conta EVALUATOR sem evaluator_profile é inconsistência de cadastro: falha
  // fechada (403), sem fallback para outro avaliador.
  private async resolveEvaluatorProfileId(userId: number): Promise<number> {
    const profile = await this.prisma.evaluator_profile.findUnique({
      where: { user_id: userId },
      select: { evaluator_profile_id: true },
    });

    if (!profile) {
      throw new ForbiddenException('Perfil de avaliador não encontrado.');
    }

    return profile.evaluator_profile_id;
  }

  // Concluídas mais recentemente primeiro. Sem histórico => lista vazia.
  async listCompleted(userId: number) {
    const evaluatorProfileId = await this.resolveEvaluatorProfileId(userId);

    const records = await this.prisma.interview.findMany({
      where: historyFilter(evaluatorProfileId),
      select: LIST_SELECT,
      orderBy: [
        { evaluation: { completed_at: 'desc' } },
        { updated_at: 'desc' },
      ],
      take: MAX_HISTORY_SIZE,
    });

    return {
      total: records.length,
      evaluations: records.map(toListItem),
    };
  }

  async getCompletedById(userId: number, interviewId: string) {
    const evaluatorProfileId = await this.resolveEvaluatorProfileId(userId);

    const record = await this.prisma.interview.findFirst({
      where: {
        interview_id: interviewId,
        ...historyFilter(evaluatorProfileId),
      },
      select: DETAIL_SELECT,
    });

    if (!record) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return toDetail(record);
  }
}
