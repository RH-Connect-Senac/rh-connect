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
import { computeEvaluationProgress } from './evaluation-criteria';

// Limite de segurança da fila do avaliador (a paginação entra aqui depois).
const MAX_QUEUE_SIZE = 500;

// Única regra de visibilidade desta área: entrevista HUMAN, ASSIGNED e do
// PRÓPRIO avaliador. Fila e detalhe usam o mesmo filtro, então "não existe",
// "é de outro avaliador", "é IA", "ainda não atribuída" e "já concluída"
// produzem exatamente a mesma resposta (404), sem revelar o registro.
function visibleTo(evaluatorProfileId: number) {
  return {
    evaluator_profile_id: evaluatorProfileId,
    evaluation_mode: 'HUMAN',
    status: 'ASSIGNED',
  } as const;
}

// `select` explícito (nunca `include`): e-mail do candidato, password_hash,
// sessões, tokens, ids internos de avaliador e quem atribuiu não saem daqui.
export const CANDIDATE_SELECT = {
  name: true,
  candidate_profile: {
    select: { professional_title: true, city: true, state: true },
  },
} as const;

const QUEUE_SELECT = {
  ...INTERVIEW_SELECT,
  assigned_at: true,
  candidate: { select: CANDIDATE_SELECT },
  // Só o necessário para derivar o progresso no servidor: o conteúdo cru das
  // notas e do comentário NÃO sai daqui (ver `toEvaluationProgress`).
  evaluation: {
    select: {
      status: true,
      criteria_scores: true,
      summary: true,
      created_at: true,
      updated_at: true,
    },
  },
  _count: { select: { questions: true } },
} as const;

const DETAIL_SELECT = {
  ...INTERVIEW_SELECT,
  assigned_at: true,
  candidate: { select: CANDIDATE_SELECT },
  questions: { orderBy: { position: 'asc' }, select: QUESTION_SELECT },
} as const;

export interface CandidateRecord {
  name: string;
  candidate_profile: {
    professional_title: string | null;
    city: string | null;
    state: string | null;
  } | null;
}

interface QueueEvaluationRecord {
  status: string;
  criteria_scores: unknown;
  summary: string | null;
  created_at: Date;
  updated_at: Date;
}

interface QueueRecord extends InterviewRecord {
  assigned_at: Date | null;
  candidate: CandidateRecord;
  evaluation?: QueueEvaluationRecord | null;
  _count: { questions: number };
}

interface DetailRecord extends InterviewRecord {
  assigned_at: Date | null;
  candidate: CandidateRecord;
  questions: QuestionRecord[];
}

export function toCandidate(record: CandidateRecord) {
  return {
    name: record.name,
    professionalTitle: record.candidate_profile?.professional_title ?? null,
    city: record.candidate_profile?.city ?? null,
    state: record.candidate_profile?.state ?? null,
  };
}

// Bloco `evaluation` da fila (6A.2): `null` quando não há avaliação persistida
// (ou quando ela não é um rascunho: uma avaliação concluída em entrevista ainda
// ASSIGNED é anomalia e nunca conta como "em andamento"). Nunca devolve as notas
// nem o comentário, só contagens e datas.
function toEvaluationProgress(
  record: QueueEvaluationRecord | null | undefined,
) {
  if (!record || record.status !== 'DRAFT') return null;

  return {
    status: 'DRAFT' as const,
    startedAt: record.created_at,
    updatedAt: record.updated_at,
    ...computeEvaluationProgress(record.criteria_scores, record.summary),
  };
}

function toQueueItem(record: QueueRecord) {
  return {
    interviewId: record.interview_id,
    status: record.status,
    candidate: toCandidate(record.candidate),
    jobTitle: record.job_title,
    company: record.job_company,
    location: record.job_location,
    workMode: record.job_work_mode,
    assignedAt: record.assigned_at,
    submittedAt: record.submitted_at,
    questionCount: record._count.questions,
    evaluation: toEvaluationProgress(record.evaluation),
  };
}

function toDetail(record: DetailRecord) {
  const base = toInterviewResponse(record);
  return {
    interviewId: base.id,
    status: base.status,
    evaluationMode: base.evaluationMode,
    assignedAt: record.assigned_at,
    submittedAt: base.submittedAt,
    candidate: toCandidate(record.candidate),
    context: base.context,
    questions: record.questions.map(toQuestionResponse),
  };
}

const NOT_FOUND_MESSAGE = 'Entrevista não encontrada.';

// Área do avaliador: entrevistas reais atribuídas a ele. O avaliador vem
// SEMPRE do JWT: user_id -> evaluator_profile.user_id -> evaluator_profile_id.
@Injectable()
export class EvaluatorInterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // Conta com papel EVALUATOR mas sem evaluator_profile é inconsistência de
  // cadastro: falha fechada, sem fallback para qualquer outro avaliador.
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

  // Atribuídas há mais tempo primeiro (ordem natural de uma fila de trabalho).
  async listAssigned(userId: number) {
    const evaluatorProfileId = await this.resolveEvaluatorProfileId(userId);

    const records = await this.prisma.interview.findMany({
      where: visibleTo(evaluatorProfileId),
      select: QUEUE_SELECT,
      orderBy: [
        { assigned_at: 'asc' },
        { submitted_at: 'asc' },
        { created_at: 'asc' },
      ],
      take: MAX_QUEUE_SIZE,
    });

    return {
      total: records.length,
      interviews: records.map(toQueueItem),
    };
  }

  // Mesma regra de posse do detalhe (própria, HUMAN, ASSIGNED), só confirmando
  // que existe (e devolvendo o perfil já resolvido do JWT): usada pelas rotas de
  // avaliação. Qualquer outro caso => 404.
  async assertAssignedTo(userId: number, interviewId: string): Promise<number> {
    const evaluatorProfileId = await this.resolveEvaluatorProfileId(userId);

    const record = await this.prisma.interview.findFirst({
      where: { interview_id: interviewId, ...visibleTo(evaluatorProfileId) },
      select: { interview_id: true },
    });

    if (!record) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return evaluatorProfileId;
  }

  async getAssignedById(userId: number, interviewId: string) {
    const evaluatorProfileId = await this.resolveEvaluatorProfileId(userId);

    const record = await this.prisma.interview.findFirst({
      where: { interview_id: interviewId, ...visibleTo(evaluatorProfileId) },
      select: DETAIL_SELECT,
    });

    if (!record) {
      throw new NotFoundException(NOT_FOUND_MESSAGE);
    }

    return toDetail(record);
  }
}
