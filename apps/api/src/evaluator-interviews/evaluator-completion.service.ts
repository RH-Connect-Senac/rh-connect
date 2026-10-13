import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { validateForCompletion } from './evaluation-criteria';
import { EvaluatorInterviewsService } from './evaluator-interviews.service';

const CONCURRENT_MESSAGE =
  'A avaliação foi alterada em outra requisição. Tente novamente.';

// Conclusão definitiva da avaliação humana (5B.2). Posse: mesma regra da 5A
// (própria, HUMAN, ASSIGNED; senão 404). A identidade vem só do JWT. O estado
// da avaliação e os 7 critérios são lidos do BANCO dentro da transação; o
// cliente não envia status, nota final nem avaliador. Só toca em
// interview_evaluation e interview, nunca em avaliações por pergunta.
@Injectable()
export class EvaluatorCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interviews: EvaluatorInterviewsService,
  ) {}

  async complete(userId: number, interviewId: string) {
    // 404 (entrevista inexistente/alheia/não HUMAN/não ASSIGNED) ou 403 (sem perfil).
    const evaluatorProfileId = await this.interviews.assertAssignedTo(
      userId,
      interviewId,
    );

    return this.prisma.$transaction(async (tx) => {
      const evaluation = await tx.interview_evaluation.findUnique({
        where: { interview_id: interviewId },
        select: {
          evaluation_id: true,
          status: true,
          criteria_scores: true,
          summary: true,
          updated_at: true,
        },
      });

      if (!evaluation) {
        throw new ConflictException('A avaliação ainda não foi iniciada.');
      }
      if (evaluation.status !== 'DRAFT') {
        throw new ConflictException('A avaliação já foi concluída.');
      }

      const data = validateForCompletion(
        evaluation.criteria_scores,
        evaluation.summary,
      );
      const completedAt = new Date();

      // Escrita condicionada ao estado lido: se outra requisição concluiu ou
      // alterou o rascunho no meio, count = 0 => 409 e a transação desfaz tudo.
      const evaluationUpdate = await tx.interview_evaluation.updateMany({
        where: {
          evaluation_id: evaluation.evaluation_id,
          interview_id: interviewId,
          status: 'DRAFT',
          updated_at: evaluation.updated_at,
        },
        data: {
          status: 'COMPLETED',
          overall_score: data.overallScore,
          completed_at: completedAt,
          updated_at: completedAt,
        },
      });
      if (evaluationUpdate.count !== 1) {
        throw new ConflictException(CONCURRENT_MESSAGE);
      }

      const interviewUpdate = await tx.interview.updateMany({
        where: {
          interview_id: interviewId,
          evaluator_profile_id: evaluatorProfileId,
          evaluation_mode: 'HUMAN',
          status: 'ASSIGNED',
        },
        data: { status: 'COMPLETED', updated_at: completedAt },
      });
      if (interviewUpdate.count !== 1) {
        // Desfaz também a avaliação já marcada como COMPLETED acima.
        throw new ConflictException(CONCURRENT_MESSAGE);
      }

      return {
        interviewId,
        status: 'COMPLETED' as const,
        evaluationStatus: 'COMPLETED' as const,
        overallScore: data.overallScore,
        completedAt,
      };
    });
  }
}
