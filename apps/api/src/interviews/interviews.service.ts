import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateInterviewDto } from './dto/create-interview.dto';
import type { EvaluationMode } from './interview-flow';
import { normalizeJobContext } from './job-context';

// Campos lidos do banco. Explícito (sem `include`): nunca expõe campos
// internos como candidate_user_id/evaluator_profile_id ao candidato.
export const INTERVIEW_SELECT = {
  interview_id: true,
  status: true,
  evaluation_mode: true,
  job_title: true,
  job_company: true,
  job_summary: true,
  job_activities: true,
  job_requirements: true,
  job_location: true,
  job_contract_type: true,
  job_work_mode: true,
  job_source_url: true,
  submitted_at: true,
  created_at: true,
  updated_at: true,
} as const;

export interface InterviewRecord {
  interview_id: string;
  status: string;
  evaluation_mode: string | null;
  job_title: string;
  job_company: string | null;
  job_summary: string | null;
  job_activities: unknown;
  job_requirements: unknown;
  job_location: string | null;
  job_contract_type: string | null;
  job_work_mode: string | null;
  job_source_url: string;
  submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function toInterviewResponse(record: InterviewRecord) {
  return {
    id: record.interview_id,
    status: record.status,
    evaluationMode: record.evaluation_mode,
    submittedAt: record.submitted_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    context: {
      sourceUrl: record.job_source_url,
      title: record.job_title,
      company: record.job_company,
      summary: record.job_summary,
      activities: toStringList(record.job_activities),
      requirements: toStringList(record.job_requirements),
      location: record.job_location,
      contractType: record.job_contract_type,
      workMode: record.job_work_mode,
    },
  };
}

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // `candidateUserId` vem SEMPRE do JWT (controller). Status inicial
  // IN_PROGRESS; evaluation_mode fica NULL até o candidato escolher a
  // modalidade (depois de gerar as perguntas).
  async create(candidateUserId: number, dto: CreateInterviewDto) {
    const context = normalizeJobContext(dto);

    const record = await this.prisma.interview.create({
      data: {
        candidate_user_id: candidateUserId,
        status: 'IN_PROGRESS',
        job_title: context.title,
        job_company: context.company,
        job_summary: context.summary,
        job_activities: context.activities,
        job_requirements: context.requirements,
        job_location: context.location,
        job_contract_type: context.contractType,
        job_work_mode: context.workMode,
        job_source_url: context.sourceUrl,
      },
      select: INTERVIEW_SELECT,
    });

    return toInterviewResponse(record);
  }

  // Ownership no WHERE: entrevista de outro candidato é indistinguível de uma
  // inexistente (404, sem confirmar que o id existe).
  async getOwned(candidateUserId: number, interviewId: string) {
    const record = await this.prisma.interview.findFirst({
      where: { interview_id: interviewId, candidate_user_id: candidateUserId },
      select: INTERVIEW_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Entrevista não encontrada.');
    }

    return toInterviewResponse(record);
  }

  // Escolha (ou troca) da modalidade enquanto a entrevista está IN_PROGRESS.
  // Propriedade e status são checados no próprio UPDATE.
  async setEvaluationMode(
    candidateUserId: number,
    interviewId: string,
    evaluationMode: EvaluationMode,
  ) {
    const { count } = await this.prisma.interview.updateMany({
      where: {
        interview_id: interviewId,
        candidate_user_id: candidateUserId,
        status: 'IN_PROGRESS',
      },
      data: { evaluation_mode: evaluationMode, updated_at: new Date() },
    });

    if (count === 0) {
      await this.failNotInProgress(candidateUserId, interviewId);
    }

    return this.getOwned(candidateUserId, interviewId);
  }

  // Envio real. IN_PROGRESS -> PENDING_AI_EVALUATION (AI) ou
  // PENDING_ASSIGNMENT (HUMAN), com submitted_at. Exige modalidade, ao menos
  // uma pergunta e TODAS respondidas (mesma regra do frontend). Reenviar uma
  // entrevista já enviada, sem trocar a modalidade, devolve o estado atual
  // (idempotente); tentar trocar a modalidade depois do envio => 409.
  async submit(
    candidateUserId: number,
    interviewId: string,
    requestedMode?: EvaluationMode,
  ) {
    const interview = await this.prisma.interview.findFirst({
      where: { interview_id: interviewId, candidate_user_id: candidateUserId },
      select: INTERVIEW_SELECT,
    });

    if (!interview) {
      throw new NotFoundException('Entrevista não encontrada.');
    }

    if (interview.status !== 'IN_PROGRESS') {
      if (!requestedMode || requestedMode === interview.evaluation_mode) {
        return toInterviewResponse(interview);
      }
      throw new ConflictException(
        'Esta entrevista já foi enviada e a modalidade não pode ser alterada.',
      );
    }

    const mode = requestedMode ?? interview.evaluation_mode;
    if (mode !== 'AI' && mode !== 'HUMAN') {
      throw new BadRequestException(
        'Escolha a modalidade de avaliação antes de enviar.',
      );
    }

    const questions = await this.prisma.interview_question.findMany({
      where: { interview_id: interviewId },
      select: { answer_text: true },
    });

    if (questions.length === 0) {
      throw new ConflictException('Gere as perguntas antes de enviar.');
    }
    if (questions.some((question) => !question.answer_text)) {
      throw new BadRequestException(
        'Responda todas as perguntas antes de enviar.',
      );
    }

    const now = new Date();
    // As condições de status e de "todas respondidas" são repetidas no WHERE
    // para que o envio seja atômico mesmo com respostas/envios concorrentes.
    const { count } = await this.prisma.interview.updateMany({
      where: {
        interview_id: interviewId,
        candidate_user_id: candidateUserId,
        status: 'IN_PROGRESS',
        questions: { some: {}, none: { answer_text: null } },
      },
      data: {
        status: mode === 'AI' ? 'PENDING_AI_EVALUATION' : 'PENDING_ASSIGNMENT',
        evaluation_mode: mode,
        submitted_at: now,
        updated_at: now,
      },
    });

    if (count === 0) {
      throw new ConflictException(
        'A entrevista foi alterada durante o envio. Revise e tente novamente.',
      );
    }

    return this.getOwned(candidateUserId, interviewId);
  }

  // Chamado quando o UPDATE condicional não alterou nada: 404 se a entrevista
  // não é do candidato; 409 se existe mas já saiu de IN_PROGRESS.
  private async failNotInProgress(
    candidateUserId: number,
    interviewId: string,
  ): Promise<never> {
    const owned = await this.prisma.interview.findFirst({
      where: { interview_id: interviewId, candidate_user_id: candidateUserId },
      select: { interview_id: true },
    });

    if (!owned) {
      throw new NotFoundException('Entrevista não encontrada.');
    }
    throw new ConflictException(
      'Esta entrevista já foi enviada e não pode mais ser alterada.',
    );
  }
}
