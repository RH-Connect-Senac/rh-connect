import { randomUUID } from 'crypto';

import type { PrismaClient } from '@prisma/client';

import { EVALUATION_CRITERIA } from '../../../src/evaluator-interviews/evaluation-criteria';
import type {
  NormalizedAiEvaluation,
  NormalizedAiQuestionEvaluation,
} from '../../../src/interviews-ai/ai-evaluation.types';

// Fixtures dos testes de persistência (R3.2.1-b). Só são usadas DEPOIS de o
// cliente ter sido aberto por `openVerifiedIntegrationClient` (identidade do
// banco confirmada).
//
// Estratégia de dados e limpeza:
// - toda linha nasce sob um app_user de teste, com e-mail
//   `it-persist-<execução>-<n>@rhconnect-it.invalid` (domínio reservado `.invalid`);
// - remover o usuário remove, por CASCADE já definido no schema, suas
//   entrevistas, perguntas, avaliações e avaliações por pergunta;
// - a limpeza é feita usuário a usuário, por id e SOMENTE para ids criados nesta
//   execução (ou resíduos com o mesmo padrão de e-mail de execuções anteriores
//   interrompidas); nunca há remoção em massa, TRUNCATE nem reset.

export const FIXTURE_EMAIL_PREFIX = 'it-persist-';
export const FIXTURE_EMAIL_DOMAIN = '@rhconnect-it.invalid';

const QUESTION_TYPES = [
  'TECHNICAL',
  'TECHNICAL',
  'BEHAVIORAL',
  'BEHAVIORAL',
  'CAREER',
] as const;

export type FixtureStatus =
  | 'IN_PROGRESS'
  | 'PENDING_AI_EVALUATION'
  | 'PENDING_ASSIGNMENT'
  | 'COMPLETED'
  | 'CANCELLED';

export interface FixtureQuestion {
  questionId: string;
  position: number;
}

export interface FixtureInterview {
  userId: number;
  interviewId: string;
  questions: FixtureQuestion[];
}

export interface FixtureInterviewOptions {
  status?: FixtureStatus;
  mode?: 'AI' | 'HUMAN' | null;
  questionCount?: number;
}

export function isFixtureEmail(email: string): boolean {
  return (
    email.startsWith(FIXTURE_EMAIL_PREFIX) &&
    email.endsWith(FIXTURE_EMAIL_DOMAIN)
  );
}

export class PersistenceFixtures {
  private readonly runId = randomUUID().slice(0, 8);
  private readonly createdUserIds: number[] = [];
  private sequence = 0;

  constructor(private readonly db: PrismaClient) {}

  // Resíduos de execuções interrompidas (mesmo padrão de e-mail). Um por vez.
  async sweepStaleFixtures(): Promise<number> {
    const stale = await this.db.app_user.findMany({
      where: {
        email: {
          startsWith: FIXTURE_EMAIL_PREFIX,
          endsWith: FIXTURE_EMAIL_DOMAIN,
        },
      },
      select: { user_id: true, email: true },
    });
    let removed = 0;
    for (const user of stale) {
      if (!isFixtureEmail(user.email)) continue;
      await this.db.app_user.delete({ where: { user_id: user.user_id } });
      removed += 1;
    }
    return removed;
  }

  // Remove somente os usuários criados nesta execução (cascata nas filhas).
  async cleanup(): Promise<void> {
    const ids = this.createdUserIds.splice(0);
    for (const userId of ids) {
      const user = await this.db.app_user.findUnique({
        where: { user_id: userId },
        select: { email: true },
      });
      if (!user || !isFixtureEmail(user.email)) continue;
      await this.db.app_user.delete({ where: { user_id: userId } });
    }
  }

  async createCandidate(): Promise<number> {
    this.sequence += 1;
    const user = await this.db.app_user.create({
      data: {
        name: 'Candidato de integração',
        email: `${FIXTURE_EMAIL_PREFIX}${this.runId}-${this.sequence}${FIXTURE_EMAIL_DOMAIN}`,
        user_role: 'CANDIDATE',
        account_status: 'ACTIVE',
      },
      select: { user_id: true },
    });
    this.createdUserIds.push(user.user_id);
    return user.user_id;
  }

  // Cada entrevista nasce com candidato próprio (a regra "uma IN_PROGRESS por
  // candidato" nunca interfere entre testes). Padrão: IA, aguardando avaliação,
  // cinco perguntas respondidas.
  async createInterview(
    options: FixtureInterviewOptions = {},
  ): Promise<FixtureInterview> {
    const status = options.status ?? 'PENDING_AI_EVALUATION';
    const mode = options.mode === undefined ? 'AI' : options.mode;
    const questionCount = options.questionCount ?? QUESTION_TYPES.length;
    const submitted = status !== 'IN_PROGRESS' && status !== 'CANCELLED';
    const now = new Date();

    const userId = await this.createCandidate();
    const interview = await this.db.interview.create({
      data: {
        candidate_user_id: userId,
        evaluation_mode: mode,
        status,
        job_title: 'Vaga de teste de integração',
        job_source_url: 'https://example.invalid/vaga-de-integracao',
        submitted_at: submitted ? now : null,
      },
      select: { interview_id: true },
    });

    const questions: FixtureQuestion[] = [];
    for (let index = 0; index < questionCount; index += 1) {
      const position = index + 1;
      const created = await this.db.interview_question.create({
        data: {
          interview_id: interview.interview_id,
          position,
          question_type: QUESTION_TYPES[index % QUESTION_TYPES.length],
          question_text: `Pergunta ${position} de integração?`,
          answer_text: `Resposta ${position} de integração.`,
          answered_at: now,
        },
        select: { question_id: true },
      });
      questions.push({ questionId: created.question_id, position });
    }
    return { userId, interviewId: interview.interview_id, questions };
  }

  // Avaliação "pré-existente" criada diretamente (estados inconsistentes).
  async seedEvaluation(
    fixture: FixtureInterview,
    options: {
      status: 'DRAFT' | 'COMPLETED';
      questionEvaluations: number;
    },
  ): Promise<string> {
    const evaluation = await this.db.interview_evaluation.create({
      data: {
        interview_id: fixture.interviewId,
        status: options.status,
        criteria_scores: {},
        completed_at: options.status === 'COMPLETED' ? new Date() : null,
      },
      select: { evaluation_id: true },
    });
    for (const question of fixture.questions.slice(
      0,
      options.questionEvaluations,
    )) {
      await this.db.interview_question_evaluation.create({
        data: {
          evaluation_id: evaluation.evaluation_id,
          interview_id: fixture.interviewId,
          question_id: question.questionId,
          score: 5,
          reason: 'Pré-existente.',
          suggestion: 'Pré-existente.',
        },
      });
    }
    return evaluation.evaluation_id;
  }
}

// Marcador presente nos textos da avaliação para provar que logs e erros nunca
// ecoam conteúdo avaliado.
export const SENSITIVE_MARKER = 'TEXTO-SENSIVEL-DA-AVALIACAO';

const CRITERION_SCORES = [7.5, 8, 6.5, 9, 7, 8.5, 6];

export function buildEvaluation(
  questions: readonly FixtureQuestion[],
  overrides: Partial<NormalizedAiEvaluation> = {},
): NormalizedAiEvaluation {
  const criteriaScores = Object.fromEntries(
    EVALUATION_CRITERIA.map((criterion, index) => [
      criterion.key,
      CRITERION_SCORES[index],
    ]),
  ) as NormalizedAiEvaluation['criteriaScores'];

  const questionsEvaluation: NormalizedAiQuestionEvaluation[] = questions.map(
    (question, index) => ({
      questionId: question.questionId,
      position: question.position,
      // 0, 10, valores com uma casa decimal e inteiros: exercita Decimal(3,1).
      score: [8.3, 0, 10, 6.5, 7][index % 5],
      reason: `${SENSITIVE_MARKER} Razão ${question.position} com acentuação: coesão, ação, é.`,
      positives: [`Ponto forte ${question.position}`, 'Segundo ponto forte'],
      improvements: [`Melhoria ${question.position}`],
      suggestion: `Sugestão ${question.position}\ncom quebra de linha.`,
    }),
  );

  return {
    criteriaScores,
    overallScore: 7.5,
    strengths: [`${SENSITIVE_MARKER} Forte A`, 'Forte B'],
    improvements: ['Melhoria A', 'Melhoria B'],
    recommendations: ['Recomendação A'],
    summary: `${SENSITIVE_MARKER} Resumo com acentuação e\nquebra de linha.`,
    questionsEvaluation,
    ...overrides,
  };
}
