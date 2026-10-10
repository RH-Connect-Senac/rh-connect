import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeDraftOverallScore,
  mergeCriteriaScores,
  parseDraftInput,
  readCriteriaScores,
} from './evaluation-criteria';
import { EvaluatorInterviewsService } from './evaluator-interviews.service';

const EVALUATION_SELECT = {
  evaluation_id: true,
  status: true,
  criteria_scores: true,
  summary: true,
  overall_score: true,
  updated_at: true,
} as const;

interface EvaluationRecord {
  evaluation_id: string;
  status: 'DRAFT' | 'COMPLETED';
  criteria_scores: unknown;
  summary: string | null;
  overall_score: { toString(): string } | number | null;
  updated_at: Date;
}

function toEvaluation(interviewId: string, record: EvaluationRecord) {
  return {
    interviewId,
    status: record.status,
    criteriaScores: readCriteriaScores(record.criteria_scores),
    summary: record.summary,
    overallScore:
      record.overall_score === null ? null : Number(record.overall_score),
    updatedAt: record.updated_at,
  };
}

// Rascunho da avaliação humana. A posse da entrevista (própria, HUMAN,
// ASSIGNED) é decidida por EvaluatorInterviewsService, a mesma regra da fila e
// do detalhe: tudo que não casa vira o mesmo 404. O avaliador nunca vem do
// cliente. Esta etapa só toca interview_evaluation (DRAFT): não conclui, não
// muda interview.status e não cria avaliação por pergunta.
@Injectable()
export class EvaluatorEvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interviews: EvaluatorInterviewsService,
  ) {}

  async getEvaluation(userId: number, interviewId: string) {
    await this.interviews.assertAssignedTo(userId, interviewId);

    const record = await this.prisma.interview_evaluation.findUnique({
      where: { interview_id: interviewId },
      select: EVALUATION_SELECT,
    });

    if (!record) {
      // Estado vazio, sem criar linha.
      return {
        interviewId,
        status: 'DRAFT' as const,
        criteriaScores: {},
        summary: null,
        overallScore: null,
        updatedAt: null,
      };
    }

    return toEvaluation(interviewId, record);
  }

  async saveDraft(userId: number, interviewId: string, body: unknown) {
    await this.interviews.assertAssignedTo(userId, interviewId);
    const input = parseDraftInput(body);

    const existing = await this.prisma.interview_evaluation.findUnique({
      where: { interview_id: interviewId },
      select: EVALUATION_SELECT,
    });

    if (!existing) {
      const criteriaScores = mergeCriteriaScores({}, input.criteriaScores);
      try {
        const created = await this.prisma.interview_evaluation.create({
          data: {
            interview_id: interviewId,
            status: 'DRAFT',
            criteria_scores: criteriaScores as Record<string, number>,
            summary: input.summary ?? null,
            overall_score: computeDraftOverallScore(criteriaScores),
          },
          select: EVALUATION_SELECT,
        });
        return toEvaluation(interviewId, created);
      } catch (error) {
        // Outro salvamento criou a linha no meio (interview_id é único).
        if ((error as { code?: string }).code === 'P2002') {
          throw new ConflictException(
            'A avaliação foi alterada em outra requisição. Tente novamente.',
          );
        }
        throw error;
      }
    }

    // Nunca reabre/sobrescreve uma avaliação concluída.
    if (existing.status !== 'DRAFT') {
      throw new ConflictException(
        'Esta avaliação já foi concluída e não pode ser alterada.',
      );
    }

    const criteriaScores = mergeCriteriaScores(
      readCriteriaScores(existing.criteria_scores),
      input.criteriaScores,
    );

    // Escrita condicionada ao estado lido (DRAFT e mesmo updated_at): se algo
    // mudou entre a leitura e a escrita, nada é sobrescrito.
    const result = await this.prisma.interview_evaluation.updateMany({
      where: {
        evaluation_id: existing.evaluation_id,
        status: 'DRAFT',
        updated_at: existing.updated_at,
      },
      data: {
        criteria_scores: criteriaScores as Record<string, number>,
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        overall_score: computeDraftOverallScore(criteriaScores),
        updated_at: new Date(),
      },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'A avaliação foi alterada em outra requisição. Tente novamente.',
      );
    }

    const saved = await this.prisma.interview_evaluation.findUnique({
      where: { interview_id: interviewId },
      select: EVALUATION_SELECT,
    });
    return toEvaluation(interviewId, saved as EvaluationRecord);
  }
}
