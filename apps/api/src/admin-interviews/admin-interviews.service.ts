import {
  ConflictException,
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

// Limite de segurança da fila. Quando a base crescer, a paginação entra aqui
// sem mudar o contrato de cada item.
const MAX_QUEUE_SIZE = 500;

// `select` explícito (nunca `include`): password_hash, sessões, tokens e
// aceites de termos jamais saem do banco nestas rotas.
const CANDIDATE_SELECT = {
  user_id: true,
  name: true,
  email: true,
  candidate_profile: {
    select: { professional_title: true, city: true, state: true },
  },
} as const;

const QUEUE_SELECT = {
  ...INTERVIEW_SELECT,
  candidate: { select: CANDIDATE_SELECT },
  _count: { select: { questions: true } },
} as const;

const DETAIL_SELECT = {
  ...INTERVIEW_SELECT,
  assigned_at: true,
  candidate: { select: CANDIDATE_SELECT },
  questions: { orderBy: { position: 'asc' }, select: QUESTION_SELECT },
  evaluator_profile: {
    select: {
      evaluator_profile_id: true,
      app_user: { select: { name: true, email: true } },
    },
  },
  assigned_by: { select: { user_id: true, name: true } },
} as const;

interface CandidateRecord {
  user_id: number;
  name: string;
  email: string;
  candidate_profile: {
    professional_title: string | null;
    city: string | null;
    state: string | null;
  } | null;
}

interface QueueRecord extends InterviewRecord {
  candidate: CandidateRecord;
  _count: { questions: number };
}

interface DetailRecord extends InterviewRecord {
  assigned_at: Date | null;
  candidate: CandidateRecord;
  questions: QuestionRecord[];
  evaluator_profile: {
    evaluator_profile_id: number;
    app_user: { name: string; email: string };
  } | null;
  assigned_by: { user_id: number; name: string } | null;
}

function toCandidate(record: CandidateRecord) {
  return {
    id: record.user_id,
    name: record.name,
    email: record.email,
    professionalTitle: record.candidate_profile?.professional_title ?? null,
    city: record.candidate_profile?.city ?? null,
    state: record.candidate_profile?.state ?? null,
  };
}

function toQueueItem(record: QueueRecord) {
  return {
    ...toInterviewResponse(record),
    candidate: toCandidate(record.candidate),
    questionCount: record._count.questions,
  };
}

function toDetail(record: DetailRecord) {
  return {
    ...toInterviewResponse(record),
    candidate: toCandidate(record.candidate),
    questions: record.questions.map(toQuestionResponse),
    assignment: record.evaluator_profile
      ? {
          evaluatorId: record.evaluator_profile.evaluator_profile_id,
          evaluatorName: record.evaluator_profile.app_user.name,
          evaluatorEmail: record.evaluator_profile.app_user.email,
          assignedAt: record.assigned_at,
          assignedBy: record.assigned_by
            ? { id: record.assigned_by.user_id, name: record.assigned_by.name }
            : null,
        }
      : null,
  };
}

function notAssignableMessage(status: string): string {
  switch (status) {
    case 'ASSIGNED':
      return 'Esta entrevista já foi atribuída a um avaliador e não pode ser reatribuída.';
    case 'COMPLETED':
      return 'Esta entrevista já foi concluída e não pode ser atribuída.';
    case 'IN_PROGRESS':
      return 'Esta entrevista ainda não foi enviada pelo candidato.';
    default:
      return 'Esta entrevista não está aguardando atribuição.';
  }
}

// Fila e atribuição de entrevistas HUMAN pelo Admin. O Admin vem SEMPRE do
// JWT (controller); nada de identidade/status é aceito do corpo.
@Injectable()
export class AdminInterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // Somente HUMAN + PENDING_ASSIGNMENT, mais antigas primeiro.
  async listPendingAssignment() {
    const where = {
      evaluation_mode: 'HUMAN',
      status: 'PENDING_ASSIGNMENT',
    } as const;

    const [records, total] = await Promise.all([
      this.prisma.interview.findMany({
        where,
        select: QUEUE_SELECT,
        orderBy: [{ submitted_at: 'asc' }, { created_at: 'asc' }],
        take: MAX_QUEUE_SIZE,
      }),
      this.prisma.interview.count({ where }),
    ]);

    return { total, interviews: records.map(toQueueItem) };
  }

  // Detalhe para o Admin: só entrevistas já enviadas (rascunhos IN_PROGRESS e
  // entrevistas CANCELLED pelo candidato não são visíveis).
  async getById(interviewId: string) {
    const record = await this.prisma.interview.findFirst({
      where: {
        interview_id: interviewId,
        status: { notIn: ['IN_PROGRESS', 'CANCELLED'] },
      },
      select: DETAIL_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Entrevista não encontrada.');
    }

    return toDetail(record);
  }

  // Todos os avaliadores reais, com o status da conta. `eligible` é a única
  // regra de elegibilidade (conta ACTIVE): INVITED aparece, mas não recebe.
  async listEvaluators() {
    const records = await this.prisma.evaluator_profile.findMany({
      where: { app_user: { user_role: 'EVALUATOR' } },
      orderBy: [{ app_user: { name: 'asc' } }, { evaluator_profile_id: 'asc' }],
      select: {
        evaluator_profile_id: true,
        user_id: true,
        area: true,
        specialization: true,
        availability_status: true,
        app_user: {
          select: { name: true, email: true, account_status: true },
        },
        _count: {
          select: { interview: { where: { status: 'ASSIGNED' } } },
        },
      },
    });

    return {
      evaluators: records.map((record) => ({
        id: record.evaluator_profile_id,
        userId: record.user_id,
        name: record.app_user.name,
        email: record.app_user.email,
        accountStatus: record.app_user.account_status,
        eligible: record.app_user.account_status === 'ACTIVE',
        area: record.area,
        specialization: record.specialization,
        availabilityStatus: record.availability_status,
        assignedCount: record._count.interview,
      })),
    };
  }

  // PENDING_ASSIGNMENT -> ASSIGNED (sem reatribuição na v1). O UPDATE é
  // condicionado ao estado esperado e confere as linhas afetadas: de dois
  // Admins simultâneos, só um altera a linha; o outro recebe 409.
  async assign(
    adminUserId: number,
    interviewId: string,
    evaluatorProfileId: number,
  ) {
    const interview = await this.prisma.interview.findUnique({
      where: { interview_id: interviewId },
      select: { interview_id: true, status: true, evaluation_mode: true },
    });

    if (!interview) {
      throw new NotFoundException('Entrevista não encontrada.');
    }

    if (interview.evaluation_mode === 'AI') {
      throw new ConflictException(
        'Entrevistas avaliadas por IA não são atribuídas a avaliadores.',
      );
    }

    if (
      interview.status !== 'PENDING_ASSIGNMENT' ||
      interview.evaluation_mode !== 'HUMAN'
    ) {
      throw new ConflictException(notAssignableMessage(interview.status));
    }

    const evaluator = await this.prisma.evaluator_profile.findUnique({
      where: { evaluator_profile_id: evaluatorProfileId },
      select: {
        evaluator_profile_id: true,
        app_user: { select: { user_role: true, account_status: true } },
      },
    });

    if (!evaluator || evaluator.app_user.user_role !== 'EVALUATOR') {
      throw new NotFoundException('Avaliador não encontrado.');
    }

    if (evaluator.app_user.account_status !== 'ACTIVE') {
      throw new ConflictException(
        'Este avaliador ainda não está ativo e não pode receber entrevistas.',
      );
    }

    const now = new Date();
    const { count } = await this.prisma.interview.updateMany({
      where: {
        interview_id: interviewId,
        status: 'PENDING_ASSIGNMENT',
        evaluation_mode: 'HUMAN',
        evaluator_profile_id: null,
      },
      data: {
        status: 'ASSIGNED',
        evaluator_profile_id: evaluator.evaluator_profile_id,
        assigned_at: now,
        assigned_by_user_id: adminUserId,
        updated_at: now,
      },
    });

    if (count === 0) {
      throw new ConflictException(
        'Esta entrevista não está mais aguardando atribuição. Atualize a fila.',
      );
    }

    return this.getById(interviewId);
  }
}
