import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InterviewsAiService } from '../interviews-ai/interviews-ai.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CANDIDATE_QUESTION_SELECT,
  INTERVIEW_ERROR_CODES,
  interviewNotInProgress,
  parseGeneratedQuestions,
  toCandidateQuestionResponse,
  validateAnswer,
  validateDraft,
} from './interview-flow';
import { INTERVIEW_SELECT, toInterviewResponse } from './interviews.service';

// Perguntas e respostas persistidas. Todo método recebe o `candidateUserId`
// do JWT e o aplica no WHERE: entrevista/pergunta de outro candidato é
// indistinguível de uma inexistente (404).
@Injectable()
export class InterviewQuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: InterviewsAiService,
  ) {}

  // Geração idempotente: se já existem perguntas, devolve as gravadas (sem
  // chamar a IA). Sem transação durante a chamada à IA; duas chamadas
  // simultâneas gravam com `skipDuplicates` (unique interview_id+position):
  // vale a primeira, e as duas respostas listam as perguntas gravadas.
  async generate(candidateUserId: number, interviewId: string) {
    const interview = await this.prisma.interview.findFirst({
      where: { interview_id: interviewId, candidate_user_id: candidateUserId },
      select: INTERVIEW_SELECT,
    });

    if (!interview) {
      throw new NotFoundException('Entrevista não encontrada.');
    }

    // Cancelada: nada de gerar nem reabrir a leitura pelo caminho de geração.
    if (interview.status === 'CANCELLED') {
      throw interviewNotInProgress(
        'Esta entrevista foi cancelada.',
        interview.status,
      );
    }

    const existing = await this.listStored(interviewId);
    if (existing.length > 0) {
      return this.toList(interviewId, interview.status, existing);
    }

    if (interview.status !== 'IN_PROGRESS') {
      throw interviewNotInProgress(
        'Esta entrevista já foi enviada e não aceita novas perguntas.',
        interview.status,
      );
    }

    const { context } = toInterviewResponse(interview);
    const generated = parseGeneratedQuestions(
      await this.ai.generateQuestions({
        context: {
          ...context,
          company: context.company ?? '',
          summary: context.summary ?? '',
        },
      }),
    );

    await this.prisma.interview_question.createMany({
      data: generated.map((question) => ({
        interview_id: interviewId,
        position: question.position,
        question_type: question.type,
        question_text: question.text,
      })),
      skipDuplicates: true,
    });

    return this.toList(
      interviewId,
      interview.status,
      await this.listStored(interviewId),
    );
  }

  // Devolve também `interviewStatus`: o wizard revalida (focus/visibilidade)
  // com esta única chamada, sem precisar de um GET extra da entrevista.
  async list(candidateUserId: number, interviewId: string) {
    const status = await this.assertOwned(candidateUserId, interviewId);
    return this.toList(interviewId, status, await this.listStored(interviewId));
  }

  // CONFIRMA (ou limpa, se vier em branco) a resposta OFICIAL de UMA pergunta.
  // Controle otimista: só grava se `draftVersion` for a versão vigente da
  // pergunta; propriedade, status IN_PROGRESS e versão ficam no próprio UPDATE
  // (atômico). Versão antiga => 409 DRAFT_VERSION_CONFLICT com o estado vigente,
  // sem sobrescrever a resposta de outro dispositivo.
  async saveAnswer(
    candidateUserId: number,
    interviewId: string,
    questionId: string,
    rawAnswer: string,
    draftVersion: number,
  ) {
    const answer = validateAnswer(rawAnswer);
    const now = new Date();

    const { count } = await this.prisma.interview_question.updateMany({
      where: {
        question_id: questionId,
        interview_id: interviewId,
        draft_version: draftVersion,
        interview: {
          candidate_user_id: candidateUserId,
          status: 'IN_PROGRESS',
        },
      },
      // A confirmação (inclusive de resposta vazia, e mesmo quando o texto é IGUAL
      // ao já salvo) PROMOVE e limpa o rascunho na MESMA operação atômica. Texto
      // igual mantém answer_text e renova answered_at (= "confirmada agora"). A
      // versão sempre avança (nunca volta a 0) para que um dispositivo com
      // rascunho antigo receba 409 em vez de ressuscitá-lo.
      data: {
        answer_text: answer || null,
        answered_at: answer ? now : null,
        draft_text: null,
        draft_updated_at: null,
        draft_version: { increment: 1 },
        updated_at: now,
      },
    });

    if (count === 0) {
      const current = await this.prisma.interview_question.findFirst({
        where: {
          question_id: questionId,
          interview_id: interviewId,
          interview: { candidate_user_id: candidateUserId },
        },
        select: {
          question_id: true,
          answer_text: true,
          draft_text: true,
          draft_updated_at: true,
          draft_version: true,
          interview: { select: { status: true } },
        },
      });

      if (!current) {
        throw new NotFoundException('Pergunta não encontrada.');
      }
      if (current.interview.status !== 'IN_PROGRESS') {
        throw interviewNotInProgress(
          'Esta entrevista já foi enviada e não aceita novas respostas.',
          current.interview.status,
        );
      }
      // Estado vigente para o cliente reconciliar (inclusive reconhecer um
      // reenvio cuja primeira tentativa já tinha sido aplicada).
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: INTERVIEW_ERROR_CODES.draftVersionConflict,
        message:
          'A resposta foi alterada em outro dispositivo. Recarregue para continuar.',
        answer: current.answer_text,
        draftText: current.draft_text,
        draftUpdatedAt: current.draft_updated_at,
        draftVersion: current.draft_version,
      });
    }

    const stored = await this.prisma.interview_question.findFirst({
      where: { question_id: questionId, interview_id: interviewId },
      select: CANDIDATE_QUESTION_SELECT,
    });

    if (!stored) {
      throw new NotFoundException('Pergunta não encontrada.');
    }

    return toCandidateQuestionResponse(stored);
  }

  // Autosave do RASCUNHO de UMA pergunta. Nunca toca em answer_text/answered_at
  // nem no status da entrevista: rascunho não é resposta. Controle otimista:
  // só grava se `version` for a versão atual; senão 409 com o estado vigente
  // (o cliente decide, nada é sobrescrito em silêncio). Texto vazio limpa o
  // rascunho (e também avança a versão).
  async saveDraft(
    candidateUserId: number,
    interviewId: string,
    questionId: string,
    rawDraft: string,
    version: number,
  ) {
    const draft = validateDraft(rawDraft);
    const now = new Date();

    const { count } = await this.prisma.interview_question.updateMany({
      where: {
        question_id: questionId,
        interview_id: interviewId,
        draft_version: version,
        interview: {
          candidate_user_id: candidateUserId,
          status: 'IN_PROGRESS',
        },
      },
      data: {
        draft_text: draft,
        draft_updated_at: draft === null ? null : now,
        draft_version: { increment: 1 },
      },
    });

    if (count === 0) {
      const current = await this.prisma.interview_question.findFirst({
        where: {
          question_id: questionId,
          interview_id: interviewId,
          interview: { candidate_user_id: candidateUserId },
        },
        select: {
          question_id: true,
          answer_text: true,
          draft_text: true,
          draft_updated_at: true,
          draft_version: true,
          interview: { select: { status: true } },
        },
      });

      if (!current) {
        throw new NotFoundException('Pergunta não encontrada.');
      }
      if (current.interview.status !== 'IN_PROGRESS') {
        throw interviewNotInProgress(
          'Esta entrevista já foi enviada e não aceita novos rascunhos.',
          current.interview.status,
        );
      }
      throw new ConflictException({
        statusCode: 409,
        error: 'Conflict',
        code: INTERVIEW_ERROR_CODES.draftVersionConflict,
        message:
          'O rascunho foi alterado em outro dispositivo. Recarregue para continuar.',
        answer: current.answer_text,
        draftText: current.draft_text,
        draftUpdatedAt: current.draft_updated_at,
        draftVersion: current.draft_version,
      });
    }

    const stored = await this.prisma.interview_question.findFirst({
      where: { question_id: questionId, interview_id: interviewId },
      select: CANDIDATE_QUESTION_SELECT,
    });

    if (!stored) {
      throw new NotFoundException('Pergunta não encontrada.');
    }

    return {
      id: stored.question_id,
      draftText: stored.draft_text,
      draftUpdatedAt: stored.draft_updated_at,
      draftVersion: stored.draft_version,
    };
  }

  private async assertOwned(candidateUserId: number, interviewId: string) {
    const owned = await this.prisma.interview.findFirst({
      where: { interview_id: interviewId, candidate_user_id: candidateUserId },
      select: { interview_id: true, status: true },
    });

    if (!owned) {
      throw new NotFoundException('Entrevista não encontrada.');
    }
    return owned.status;
  }

  private listStored(interviewId: string) {
    return this.prisma.interview_question.findMany({
      where: { interview_id: interviewId },
      orderBy: { position: 'asc' },
      select: CANDIDATE_QUESTION_SELECT,
    });
  }

  private toList(
    interviewId: string,
    interviewStatus: string,
    records: Parameters<typeof toCandidateQuestionResponse>[0][],
  ) {
    return {
      interviewId,
      interviewStatus,
      questions: records.map(toCandidateQuestionResponse),
    };
  }
}
