import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

type TesterFeedbackDelegate = {
  create(args: {
    data: {
      feature: string;
      bug_found: string | null;
      steps_to_reproduce: string | null;
      improvement_suggestion: string | null;
    };
    select: {
      feedback_id: true;
    };
  }): Promise<{ feedback_id: string }>;
};

type PrismaWithTesterFeedback = PrismaService & {
  tester_feedback: TesterFeedbackDelegate;
};

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async createSuggestion(dto: CreateFeedbackDto) {
    const feature = dto.feature.trim();
    const bugFound = dto.bugFound?.trim() || null;
    const stepsToReproduce = dto.stepsToReproduce?.trim() || null;
    const improvementSuggestion = dto.improvementSuggestion?.trim() || null;

    if (!bugFound && !improvementSuggestion) {
      throw new BadRequestException(
        'Informe um bug encontrado ou uma sugestão de melhoria.',
      );
    }

    const prisma = this.prisma as PrismaWithTesterFeedback;
    const feedback = await prisma.tester_feedback.create({
      data: {
        feature,
        bug_found: bugFound,
        steps_to_reproduce: stepsToReproduce,
        improvement_suggestion: improvementSuggestion,
      },
      select: {
        feedback_id: true,
      },
    });

    return {
      ok: true,
      id: feedback.feedback_id,
    };
  }
}
