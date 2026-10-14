import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { MaterialRecommendationSnapshotService } from '../material-recommendation-snapshots/material-recommendation-snapshot.service';
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
//
// Depois que a transação confirma (commit), tenta gerar o snapshot de materiais
// recomendados. Isso é FORA da transação e isolado em try/catch: uma falha na
// recomendação é logada e nunca desfaz nem impede a conclusão. O snapshot
// ausente é gerado depois, sob demanda (lazy), por quem for ler o resultado.
@Injectable()
export class EvaluatorCompletionService {
  private readonly logger = new Logger(EvaluatorCompletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly interviews: EvaluatorInterviewsService,
    private readonly materialSnapshots: MaterialRecommendationSnapshotService,
  ) {}

  async complete(userId: number, interviewId: string) {
    // 404 (entrevista inexistente/alheia/não HUMAN/não ASSIGNED) ou 403 (sem perfil).
    const evaluatorProfileId = await this.interviews.assertAssignedTo(
      userId,
      interviewId,
    );

    const result = await this.prisma.$transaction(async (tx) => {
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

    // Transação já confirmada: a conclusão é definitiva daqui em diante.
    await this.tryGenerateMaterialSnapshot(interviewId);
    return result;
  }

  private async tryGenerateMaterialSnapshot(interviewId: string) {
    try {
      const outcome =
        await this.materialSnapshots.getOrCreateSnapshot(interviewId);
      if (outcome.kind === 'ineligible') {
        this.logger.warn(
          `Snapshot de materiais não gerado após a conclusão (entrevista ${interviewId}): ${outcome.reason}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Falha ao gerar o snapshot de materiais da entrevista ${interviewId}; a conclusão foi mantida e o snapshot será gerado sob demanda.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
