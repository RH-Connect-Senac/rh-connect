import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateInterviewDto } from './dto/create-interview.dto';
import {
  interviewAlreadyInProgress,
  interviewNotInProgress,
  interviewResultNotAvailable,
} from './interview-flow';
import type { EvaluationMode } from './interview-flow';
import { normalizeJobContext } from './job-context';
import {
  CANDIDATE_DETAIL_SELECT,
  HISTORY_LIST_SELECT,
  MAX_HISTORY_SIZE,
  RESULT_SELECT,
  isResultAvailable,
  toCandidateInterviewResponse,
  toHistoryItem,
  toResult,
} from './interview-history';
import {
  INTERVIEW_SELECT,
  toInterviewResponse,
  type InterviewRecord,
} from './interview-projection';

// Reexportados para manter os imports existentes (admin, avaliador, perguntas).
export { INTERVIEW_SELECT, toInterviewResponse };
export type { InterviewRecord };

@Injectable()
export class InterviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // `candidateUserId` vem SEMPRE do JWT (controller). Status inicial
  // IN_PROGRESS; evaluation_mode fica NULL até o candidato escolher a
  // modalidade (depois de gerar as perguntas).
  async create(candidateUserId: number, dto: CreateInterviewDto) {
    const context = normalizeJobContext(dto);

    // Regra V1: no máximo UMA IN_PROGRESS por candidato. Este SELECT é só o
    // caminho amigável (devolve o id existente); a garantia contra criação
    // concorrente (duas abas/dispositivos) é o índice único parcial do banco
    // (`uq_interview_one_in_progress_per_candidate`), tratado no catch abaixo.
    const existing = await this.findInProgressId(candidateUserId);
    if (existing) {
      throw interviewAlreadyInProgress(existing);
    }

    let record: InterviewRecord;
    try {
      record = await this.prisma.interview.create({
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
    } catch (error) {
      // Corrida: outra requisição criou a IN_PROGRESS entre o SELECT e o INSERT.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw interviewAlreadyInProgress(
          await this.findInProgressId(candidateUserId),
        );
      }
      throw error;
    }

    return toInterviewResponse(record);
  }

  private async findInProgressId(candidateUserId: number) {
    const found = await this.prisma.interview.findFirst({
      where: { candidate_user_id: candidateUserId, status: 'IN_PROGRESS' },
      orderBy: { created_at: 'desc' },
      select: { interview_id: true },
    });
    return found?.interview_id ?? null;
  }

  // Ownership no WHERE: entrevista de outro candidato é indistinguível de uma
  // inexistente (404, sem confirmar que o id existe).
  async getOwned(candidateUserId: number, interviewId: string) {
    const record = await this.prisma.interview.findFirst({
      where: { interview_id: interviewId, candidate_user_id: candidateUserId },
      select: CANDIDATE_DETAIL_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Entrevista não encontrada.');
    }

    // Contrato anterior + assignedAt/completedAt (aditivos). `status` já
    // distingue PENDING_ASSIGNMENT / ASSIGNED / COMPLETED / CANCELLED /
    // PENDING_AI_EVALUATION para a tela de acompanhamento.
    return toCandidateInterviewResponse(record);
  }

  // Histórico do candidato (6A.1): TODAS as entrevistas dele, em qualquer status
  // (IN_PROGRESS e CANCELLED incluídas: nada é escondido, o cliente decide o que
  // mostrar a partir de `status`/`resultAvailable`). Dono (JWT) no WHERE; mais
  // recente primeiro; uma consulta de lista + um count (sem N+1); sem
  // perguntas/respostas. O rascunho da avaliação nunca vaza (só avaliação
  // COMPLETED gera nota/data).
  async listHistory(candidateUserId: number) {
    const where = { candidate_user_id: candidateUserId };

    const [records, total] = await Promise.all([
      this.prisma.interview.findMany({
        where,
        select: HISTORY_LIST_SELECT,
        orderBy: [{ created_at: 'desc' }, { interview_id: 'desc' }],
        take: MAX_HISTORY_SIZE,
      }),
      this.prisma.interview.count({ where }),
    ]);

    return { total, interviews: records.map(toHistoryItem) };
  }

  // Resultado persistido de uma entrevista HUMAN concluída. Só leitura: não chama
  // Python/Groq, não recalcula nota e não cria registro. Entrevista de outro
  // candidato ou inexistente => 404 (ownership no WHERE). Existe mas ainda sem
  // resultado (IN_PROGRESS, PENDING_ASSIGNMENT, ASSIGNED, PENDING_AI_EVALUATION,
  // CANCELLED, IA ou concluída sem avaliação concluída) => 409 com `code`
  // INTERVIEW_RESULT_NOT_AVAILABLE, `interviewStatus` e `evaluationMode`.
  async getResult(candidateUserId: number, interviewId: string) {
    const record = await this.prisma.interview.findFirst({
      where: { interview_id: interviewId, candidate_user_id: candidateUserId },
      select: RESULT_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Entrevista não encontrada.');
    }

    if (
      !record.evaluation ||
      !isResultAvailable(
        record.status,
        record.evaluation_mode,
        record.evaluation,
      )
    ) {
      throw interviewResultNotAvailable(record.status, record.evaluation_mode);
    }

    return toResult({ ...record, evaluation: record.evaluation });
  }

  // Entrevistas IN_PROGRESS do candidato (descoberta entre dispositivos). Dono
  // (JWT) e status no WHERE; mais recente primeiro. Devolve só o necessário para
  // o Dashboard e para a retomada: NUNCA o texto de resposta/rascunho (isso só é
  // lido ao continuar, em GET /interviews/:id/questions). Na V1 há no máximo uma
  // (índice único parcial), mas a resposta segue como LISTA para a evolução futura
  // e para registros legados criados antes da regra.
  async listInProgress(candidateUserId: number) {
    const records = await this.prisma.interview.findMany({
      where: { candidate_user_id: candidateUserId, status: 'IN_PROGRESS' },
      orderBy: { created_at: 'desc' },
      select: {
        interview_id: true,
        status: true,
        evaluation_mode: true,
        job_title: true,
        job_company: true,
        created_at: true,
        questions: {
          select: {
            answer_text: true,
            draft_text: true,
            draft_updated_at: true,
          },
        },
      },
    });

    return records.map((record) => {
      // Só a resposta OFICIAL (answer_text) conta como respondida: rascunho não.
      const answeredQuestionCount = record.questions.filter(
        (question) => question.answer_text !== null,
      ).length;
      const draftDates = record.questions
        .filter((question) => question.draft_text !== null)
        .flatMap((question) =>
          question.draft_updated_at ? [question.draft_updated_at] : [],
        );
      const latestDraftUpdatedAt = draftDates.length
        ? new Date(Math.max(...draftDates.map((date) => date.getTime())))
        : null;

      return {
        id: record.interview_id,
        title: record.job_title,
        company: record.job_company,
        evaluationMode: record.evaluation_mode,
        interviewStatus: record.status,
        createdAt: record.created_at,
        questionCount: record.questions.length,
        answeredQuestionCount,
        latestDraftUpdatedAt,
      };
    });
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

    // CANCELADA nunca vira "enviada": o reenvio idempotente abaixo vale só para
    // entrevistas realmente enviadas.
    if (interview.status === 'CANCELLED') {
      throw interviewNotInProgress(
        'Esta entrevista foi cancelada e não pode ser enviada.',
        interview.status,
      );
    }

    if (interview.status !== 'IN_PROGRESS') {
      if (!requestedMode || requestedMode === interview.evaluation_mode) {
        return toInterviewResponse(interview);
      }
      throw interviewNotInProgress(
        'Esta entrevista já foi enviada e a modalidade não pode ser alterada.',
        interview.status,
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
    // TRANSAÇÃO: envio + limpeza dos rascunhos são um bloco só (ou tudo, ou nada).
    // As condições de status e de "todas respondidas" ficam no WHERE para que o
    // envio seja atômico mesmo com respostas/envios concorrentes. Se a limpeza
    // falhar, a transação desfaz o envio: nunca há entrevista enviada com
    // rascunho residual. A versão do rascunho AVANÇA (não volta a 0), para que um
    // dispositivo antigo nunca confunda o estado novo com o dele.
    const submitted = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.interview.updateMany({
        where: {
          interview_id: interviewId,
          candidate_user_id: candidateUserId,
          status: 'IN_PROGRESS',
          questions: { some: {}, none: { answer_text: null } },
        },
        data: {
          status:
            mode === 'AI' ? 'PENDING_AI_EVALUATION' : 'PENDING_ASSIGNMENT',
          evaluation_mode: mode,
          submitted_at: now,
          updated_at: now,
        },
      });

      if (count === 0) {
        return false;
      }

      await tx.interview_question.updateMany({
        where: { interview_id: interviewId },
        data: {
          draft_text: null,
          draft_updated_at: null,
          draft_version: { increment: 1 },
        },
      });
      return true;
    });

    if (!submitted) {
      // Perdeu a corrida para um cancelamento: informa o estado vigente.
      const current = await this.prisma.interview.findFirst({
        where: {
          interview_id: interviewId,
          candidate_user_id: candidateUserId,
        },
        select: { status: true },
      });
      if (current?.status === 'CANCELLED') {
        throw interviewNotInProgress(
          'Esta entrevista foi cancelada e não pode ser enviada.',
          current.status,
        );
      }
      throw new ConflictException(
        'A entrevista foi alterada durante o envio. Revise e tente novamente.',
      );
    }

    return this.getOwned(candidateUserId, interviewId);
  }

  // CANCELAMENTO REAL (global, todos os dispositivos): IN_PROGRESS -> CANCELLED.
  // A entrevista NÃO é apagada: perguntas, contexto e respostas oficiais
  // (answer_text/answered_at) permanecem. Só os RASCUNHOS não confirmados são
  // descartados, com a versão avançando (um dispositivo antigo recebe 409 em vez
  // de ressuscitar o rascunho). Transição e limpeza são UMA transação: se a
  // limpeza falhar, o status volta a IN_PROGRESS. A transição é um UPDATE
  // condicional (id + dono + IN_PROGRESS), o mesmo critério do envio: submit e
  // cancel concorrentes disputam a mesma linha e só um vence. Repetir o
  // cancelamento de uma CANCELLED é idempotente (200, sem nova alteração); qualquer
  // outro status não editável => 409, sem sobrescrever o estado vigente.
  async cancel(candidateUserId: number, interviewId: string) {
    const now = new Date();
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.interview.updateMany({
        where: {
          interview_id: interviewId,
          candidate_user_id: candidateUserId,
          status: 'IN_PROGRESS',
        },
        data: { status: 'CANCELLED', updated_at: now },
      });

      if (count === 0) {
        return false;
      }

      await tx.interview_question.updateMany({
        where: { interview_id: interviewId },
        data: {
          draft_text: null,
          draft_updated_at: null,
          draft_version: { increment: 1 },
        },
      });
      return true;
    });

    if (!cancelled) {
      const current = await this.prisma.interview.findFirst({
        where: {
          interview_id: interviewId,
          candidate_user_id: candidateUserId,
        },
        select: INTERVIEW_SELECT,
      });

      if (!current) {
        throw new NotFoundException('Entrevista não encontrada.');
      }
      if (current.status === 'CANCELLED') {
        return toInterviewResponse(current);
      }
      throw interviewNotInProgress(
        'Esta entrevista já foi enviada e não pode ser cancelada.',
        current.status,
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
      select: { interview_id: true, status: true },
    });

    if (!owned) {
      throw new NotFoundException('Entrevista não encontrada.');
    }
    throw interviewNotInProgress(
      'Esta entrevista já foi enviada e não pode mais ser alterada.',
      owned.status,
    );
  }
}
