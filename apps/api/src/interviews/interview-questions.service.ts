import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InterviewsAiService } from '../interviews-ai/interviews-ai.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  QUESTION_SELECT,
  parseGeneratedQuestions,
  toQuestionResponse,
  validateAnswer,
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

    const existing = await this.listStored(interviewId);
    if (existing.length > 0) {
      return this.toList(interviewId, existing);
    }

    if (interview.status !== 'IN_PROGRESS') {
      throw new ConflictException(
        'Esta entrevista já foi enviada e não aceita novas perguntas.',
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

    return this.toList(interviewId, await this.listStored(interviewId));
  }

  async list(candidateUserId: number, interviewId: string) {
    await this.assertOwned(candidateUserId, interviewId);
    return this.toList(interviewId, await this.listStored(interviewId));
  }

  // Salva (ou limpa, se vier em branco) a resposta de UMA pergunta. A
  // propriedade e o status IN_PROGRESS são checados no próprio UPDATE.
  async saveAnswer(
    candidateUserId: number,
    interviewId: string,
    questionId: string,
    rawAnswer: string,
  ) {
    const answer = validateAnswer(rawAnswer);
    const now = new Date();

    const { count } = await this.prisma.interview_question.updateMany({
      where: {
        question_id: questionId,
        interview_id: interviewId,
        interview: {
          candidate_user_id: candidateUserId,
          status: 'IN_PROGRESS',
        },
      },
      data: {
        answer_text: answer || null,
        answered_at: answer ? now : null,
        updated_at: now,
      },
    });

    if (count === 0) {
      const owned = await this.prisma.interview_question.findFirst({
        where: {
          question_id: questionId,
          interview_id: interviewId,
          interview: { candidate_user_id: candidateUserId },
        },
        select: { question_id: true },
      });

      if (!owned) {
        throw new NotFoundException('Pergunta não encontrada.');
      }
      throw new ConflictException(
        'Esta entrevista já foi enviada e não aceita novas respostas.',
      );
    }

    const stored = await this.prisma.interview_question.findFirst({
      where: { question_id: questionId, interview_id: interviewId },
      select: QUESTION_SELECT,
    });

    if (!stored) {
      throw new NotFoundException('Pergunta não encontrada.');
    }

    return toQuestionResponse(stored);
  }

  private async assertOwned(candidateUserId: number, interviewId: string) {
    const owned = await this.prisma.interview.findFirst({
      where: { interview_id: interviewId, candidate_user_id: candidateUserId },
      select: { interview_id: true },
    });

    if (!owned) {
      throw new NotFoundException('Entrevista não encontrada.');
    }
  }

  private listStored(interviewId: string) {
    return this.prisma.interview_question.findMany({
      where: { interview_id: interviewId },
      orderBy: { position: 'asc' },
      select: QUESTION_SELECT,
    });
  }

  private toList(
    interviewId: string,
    records: Parameters<typeof toQuestionResponse>[0][],
  ) {
    return {
      interviewId,
      questions: records.map(toQuestionResponse),
    };
  }
}
