import { Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { EVALUATION_CRITERIA } from '../../../src/evaluator-interviews/evaluation-criteria';
import type { NormalizedAiEvaluation } from '../../../src/interviews-ai/ai-evaluation.types';
import { AiEvaluationPersistenceService } from '../../../src/interviews-ai/ai-evaluation-persistence.service';
import {
  AiEvaluationPersistenceError,
  type AiEvaluationPersistErrorCode,
  type AiEvaluationPersistStep,
} from '../../../src/interviews-ai/ai-evaluation-persistence.types';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { openVerifiedIntegrationClient } from '../support/verified-integration-client';
import {
  buildEvaluation,
  PersistenceFixtures,
  SENSITIVE_MARKER,
  type FixtureInterview,
} from './persistence-fixtures';

// Testes REAIS de persistência (R3.2.1-b) no PostgreSQL de integração.
//
// Só roda por `pnpm run test:integration:persistence`. O cliente é aberto por
// `openVerifiedIntegrationClient`: valida INTEGRATION_DATABASE_URL, recusa
// qualquer outro banco/variável conflitante e confirma nome, usuário e marcador
// do banco por leitura ANTES de qualquer fixture ou escrita. A semântica
// esperada é a do serviço R3.2 (nenhuma regra nova): a entrevista é a
// reivindicada por UPDATE condicional; quem perde classifica em leitura nova.

const EXPECTED_QUESTION_SCORES = [8.3, 0, 10, 6.5, 7];

let db: PrismaService;
let fixtures: PersistenceFixtures;
let service: AiEvaluationPersistenceService;
let logSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeAll(async () => {
  const handle = await openVerifiedIntegrationClient(
    process.env,
    (datasourceUrl) => new PrismaService({ datasourceUrl }),
  );
  db = handle.client;
  fixtures = new PersistenceFixtures(db);
  await fixtures.sweepStaleFixtures();
  service = new AiEvaluationPersistenceService(db);
});

afterAll(async () => {
  try {
    await fixtures?.cleanup();
  } finally {
    await db?.$disconnect();
  }
});

beforeEach(() => {
  logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

async function loadState(interviewId: string) {
  return db.interview.findUniqueOrThrow({
    where: { interview_id: interviewId },
    include: {
      questions: { orderBy: { position: 'asc' } },
      evaluation: { include: { question_evaluations: true } },
    },
  });
}

async function expectFailure(
  promise: Promise<unknown>,
  code: AiEvaluationPersistErrorCode,
  step: AiEvaluationPersistStep,
): Promise<AiEvaluationPersistenceError> {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AiEvaluationPersistenceError);
  const failure = caught as AiEvaluationPersistenceError;
  expect(failure.code).toBe(code);
  expect(failure.step).toBe(step);
  expect(failure.message).not.toContain(SENSITIVE_MARKER);
  return failure;
}

function expectNoSensitiveLogs() {
  const calls = [
    ...(logSpy.mock.calls as unknown[][]),
    ...(errorSpy.mock.calls as unknown[][]),
  ];
  const logged = calls.flat().map(String).join('\n');
  expect(logged).not.toContain(SENSITIVE_MARKER);
}

async function expectPristine(fixture: FixtureInterview, updatedAt: Date) {
  const state = await loadState(fixture.interviewId);
  expect(state.status).toBe('PENDING_AI_EVALUATION');
  expect(state.updated_at.getTime()).toBe(updatedAt.getTime());
  expect(state.evaluation).toBeNull();
  const orphans = await db.interview_question_evaluation.count({
    where: { interview_id: fixture.interviewId },
  });
  expect(orphans).toBe(0);
}

// Cliente cuja transação delega à transação REAL, mas intercepta
// `interview_question_evaluation.createMany` / `interview_evaluation.create`
// para simular falha depois que o PostgreSQL já executou parte das escritas.
type AnyFn = (...args: unknown[]) => unknown;
type TransactionFn = (
  cb: (tx: Prisma.TransactionClient) => Promise<unknown>,
  opts?: unknown,
) => Promise<unknown>;

function boundMember(target: object, property: string | symbol): unknown {
  const value: unknown = Reflect.get(target, property, target);
  return typeof value === 'function'
    ? ((value as AnyFn).bind(target) as AnyFn)
    : value;
}

function withTransactionPatch(
  real: PrismaService,
  patch: (tx: Prisma.TransactionClient) => Prisma.TransactionClient,
): PrismaService {
  const transaction = real.$transaction.bind(real) as unknown as TransactionFn;
  return new Proxy(real, {
    get(target, property): unknown {
      if (property === '$transaction') {
        return (
          callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
          options?: unknown,
        ): Promise<unknown> =>
          transaction((tx) => callback(patch(tx)), options);
      }
      return boundMember(target, property);
    },
  });
}

function patchDelegate(
  tx: Prisma.TransactionClient,
  model: 'interview_question_evaluation' | 'interview_evaluation',
  method: string,
  replacement: (real: (...args: unknown[]) => Promise<unknown>) => unknown,
): Prisma.TransactionClient {
  const delegate: object = tx[model];
  const patchedDelegate = new Proxy(delegate, {
    get(target, property): unknown {
      if (property === method) {
        return replacement(
          boundMember(target, property) as (
            ...args: unknown[]
          ) => Promise<unknown>,
        );
      }
      return boundMember(target, property);
    },
  });
  return new Proxy(tx, {
    get(target, property): unknown {
      if (property === model) return patchedDelegate;
      return boundMember(target, property);
    },
  });
}

describe('identidade da conexão de teste', () => {
  it('a conexão aberta é o banco de integração', async () => {
    const rows = await db.$queryRaw<
      Array<{ database_name: string; user_name: string }>
    >`SELECT current_database() AS database_name, current_user AS user_name`;
    expect(rows[0]).toEqual({
      database_name: 'rhconnect_it',
      user_name: 'rhconnect_it_user',
    });
  });
});

describe('persistência bem-sucedida', () => {
  it('grava entrevista COMPLETED, avaliação COMPLETED e as cinco avaliações por pergunta', async () => {
    const fixture = await fixtures.createInterview();
    const evaluation = buildEvaluation(fixture.questions);
    const before = await loadState(fixture.interviewId);

    const result = await service.persist(fixture.interviewId, evaluation);

    expect(result.status).toBe('created');
    expect(result.interviewId).toBe(fixture.interviewId);

    const state = await loadState(fixture.interviewId);
    expect(state.status).toBe('COMPLETED');
    expect(state.evaluation_mode).toBe('AI');
    expect(state.evaluator_profile_id).toBeNull();
    expect(state.updated_at.getTime()).toBeGreaterThanOrEqual(
      before.updated_at.getTime(),
    );

    const stored = state.evaluation;
    expect(stored).not.toBeNull();
    if (!stored) return;
    expect(stored.evaluation_id).toBe(result.evaluationId);
    expect(stored.interview_id).toBe(fixture.interviewId);
    expect(stored.status).toBe('COMPLETED');
    expect(stored.completed_at).not.toBeNull();
    expect(stored.overall_score?.toNumber()).toBe(7.5);
    expect(stored.summary).toBe(evaluation.summary);
    expect(stored.strengths).toEqual(evaluation.strengths);
    expect(stored.improvements).toEqual(evaluation.improvements);
    expect(stored.recommendations).toEqual(evaluation.recommendations);

    const criteria = stored.criteria_scores as Record<string, number>;
    expect(Object.keys(criteria).sort()).toEqual(
      EVALUATION_CRITERIA.map((criterion) => criterion.key).sort(),
    );
    for (const key of Object.keys(evaluation.criteriaScores) as Array<
      keyof NormalizedAiEvaluation['criteriaScores']
    >) {
      expect(criteria[key]).toBe(evaluation.criteriaScores[key]);
    }
  });

  it('cria exatamente uma avaliação por pergunta, ligada à avaliação e à entrevista corretas', async () => {
    const fixture = await fixtures.createInterview();
    const evaluation = buildEvaluation(fixture.questions);

    await service.persist(fixture.interviewId, evaluation);

    const state = await loadState(fixture.interviewId);
    const stored = state.evaluation?.question_evaluations ?? [];
    expect(stored).toHaveLength(5);
    expect(new Set(stored.map((item) => item.question_id)).size).toBe(5);

    for (const item of stored) {
      expect(item.evaluation_id).toBe(state.evaluation?.evaluation_id);
      expect(item.interview_id).toBe(fixture.interviewId);
      const received = evaluation.questionsEvaluation.find(
        (question) => question.questionId === item.question_id,
      );
      expect(received).toBeDefined();
      if (!received) continue;
      expect(item.score.toNumber()).toBe(received.score);
      expect(item.reason).toBe(received.reason);
      expect(item.positives).toEqual(received.positives);
      expect(item.improvements).toEqual(received.improvements);
      expect(item.suggestion).toBe(received.suggestion);
    }
    // Cada pergunta real da entrevista recebeu uma avaliação.
    expect(stored.map((item) => item.question_id).sort()).toEqual(
      state.questions.map((question) => question.question_id).sort(),
    );
  });

  it('preserva Decimal(3,1) (0, 10 e uma casa decimal), ordem das listas JSON, acentos e quebras de linha', async () => {
    const fixture = await fixtures.createInterview();
    const evaluation = buildEvaluation(fixture.questions);

    await service.persist(fixture.interviewId, evaluation);

    const state = await loadState(fixture.interviewId);
    const byPosition = new Map<string, number>(
      state.questions.map(
        (question) => [question.question_id, question.position] as const,
      ),
    );
    const scores = (state.evaluation?.question_evaluations ?? [])
      .map((item) => ({
        position: byPosition.get(item.question_id) ?? 0,
        score: item.score.toNumber(),
      }))
      .sort((a, b) => a.position - b.position)
      .map((item) => item.score);
    expect(scores).toEqual(EXPECTED_QUESTION_SCORES);
    expect(state.evaluation?.summary).toContain('acentuação');
    expect(state.evaluation?.summary).toContain('\n');
    expect(state.evaluation?.strengths).toEqual([
      `${SENSITIVE_MARKER} Forte A`,
      'Forte B',
    ]);
  });

  it('não registra texto da avaliação nos logs', async () => {
    const fixture = await fixtures.createInterview();
    await service.persist(
      fixture.interviewId,
      buildEvaluation(fixture.questions),
    );
    expect(logSpy).toHaveBeenCalled();
    expectNoSensitiveLogs();
  });
});

describe('idempotência e conteúdo divergente', () => {
  it('repetir o mesmo conteúdo devolve already_persisted, com o mesmo id e sem novas escritas', async () => {
    const fixture = await fixtures.createInterview();
    const evaluation = buildEvaluation(fixture.questions);
    const first = await service.persist(fixture.interviewId, evaluation);
    const afterFirst = await loadState(fixture.interviewId);

    const second = await service.persist(fixture.interviewId, evaluation);
    const third = await service.persist(fixture.interviewId, evaluation);

    expect(second).toEqual({
      status: 'already_persisted',
      interviewId: fixture.interviewId,
      evaluationId: first.evaluationId,
    });
    expect(third.status).toBe('already_persisted');
    const afterAll = await loadState(fixture.interviewId);
    expect(afterAll.updated_at.getTime()).toBe(afterFirst.updated_at.getTime());
    expect(afterAll.evaluation?.updated_at.getTime()).toBe(
      afterFirst.evaluation?.updated_at.getTime(),
    );
    expect(afterAll.evaluation?.question_evaluations).toHaveLength(5);
    expect(
      await db.interview_evaluation.count({
        where: { interview_id: fixture.interviewId },
      }),
    ).toBe(1);
  });

  it('é idempotente mesmo com as perguntas enviadas em outra ordem', async () => {
    const fixture = await fixtures.createInterview();
    const evaluation = buildEvaluation(fixture.questions);
    const first = await service.persist(fixture.interviewId, evaluation);

    const reordered: NormalizedAiEvaluation = {
      ...evaluation,
      questionsEvaluation: [...evaluation.questionsEvaluation].reverse(),
    };
    const second = await service.persist(fixture.interviewId, reordered);

    expect(second.status).toBe('already_persisted');
    expect(second.evaluationId).toBe(first.evaluationId);
  });

  it.each([
    ['resumo', (e: NormalizedAiEvaluation) => ({ ...e, summary: 'Outro' })],
    ['nota geral', (e: NormalizedAiEvaluation) => ({ ...e, overallScore: 7 })],
    [
      'lista de pontos fortes',
      (e: NormalizedAiEvaluation) => ({ ...e, strengths: ['Diferente'] }),
    ],
    [
      'nota de um critério',
      (e: NormalizedAiEvaluation) => ({
        ...e,
        criteriaScores: { ...e.criteriaScores, clarity: 1 },
      }),
    ],
    [
      'nota de uma pergunta',
      (e: NormalizedAiEvaluation) => ({
        ...e,
        questionsEvaluation: e.questionsEvaluation.map((question, index) =>
          index === 2 ? { ...question, score: 1.5 } : question,
        ),
      }),
    ],
    [
      'texto de uma pergunta',
      (e: NormalizedAiEvaluation) => ({
        ...e,
        questionsEvaluation: e.questionsEvaluation.map((question, index) =>
          index === 4 ? { ...question, suggestion: 'Outra' } : question,
        ),
      }),
    ],
  ])(
    'rejeita conteúdo divergente (%s) com EVALUATION_CONFLICT e não altera o que foi gravado',
    async (_label, diverge) => {
      const fixture = await fixtures.createInterview();
      const evaluation = buildEvaluation(fixture.questions);
      await service.persist(fixture.interviewId, evaluation);
      const before = await loadState(fixture.interviewId);

      await expectFailure(
        service.persist(fixture.interviewId, diverge(evaluation)),
        'EVALUATION_CONFLICT',
        'classify',
      );

      const after = await loadState(fixture.interviewId);
      expect(after.updated_at.getTime()).toBe(before.updated_at.getTime());
      expect(after.evaluation?.summary).toBe(evaluation.summary);
      expect(after.evaluation?.overall_score?.toNumber()).toBe(7.5);
      expect(after.evaluation?.question_evaluations).toHaveLength(5);
      expectNoSensitiveLogs();
    },
  );
});

describe('classificação de entrevistas que não podem ser reivindicadas', () => {
  it('entrevista inexistente => INTERVIEW_NOT_FOUND', async () => {
    const fixture = await fixtures.createInterview();
    const evaluation = buildEvaluation(fixture.questions);
    await expectFailure(
      service.persist('00000000-0000-4000-8000-000000000001', evaluation),
      'INTERVIEW_NOT_FOUND',
      'classify',
    );
  });

  it('modalidade HUMAN => WRONG_EVALUATION_MODE, sem escrita', async () => {
    const fixture = await fixtures.createInterview({
      status: 'PENDING_ASSIGNMENT',
      mode: 'HUMAN',
    });
    await expectFailure(
      service.persist(fixture.interviewId, buildEvaluation(fixture.questions)),
      'WRONG_EVALUATION_MODE',
      'classify',
    );
    const state = await loadState(fixture.interviewId);
    expect(state.status).toBe('PENDING_ASSIGNMENT');
    expect(state.evaluation).toBeNull();
  });

  it('entrevista em andamento (sem modalidade) => INVALID_INTERVIEW_STATE', async () => {
    const fixture = await fixtures.createInterview({
      status: 'IN_PROGRESS',
      mode: null,
    });
    await expectFailure(
      service.persist(fixture.interviewId, buildEvaluation(fixture.questions)),
      'INVALID_INTERVIEW_STATE',
      'classify',
    );
    expect((await loadState(fixture.interviewId)).status).toBe('IN_PROGRESS');
  });

  it('entrevista CANCELLED => INVALID_INTERVIEW_STATE', async () => {
    const fixture = await fixtures.createInterview({
      status: 'CANCELLED',
      mode: 'AI',
    });
    await expectFailure(
      service.persist(fixture.interviewId, buildEvaluation(fixture.questions)),
      'INVALID_INTERVIEW_STATE',
      'classify',
    );
    expect((await loadState(fixture.interviewId)).status).toBe('CANCELLED');
  });

  it('COMPLETED sem avaliação => INCONSISTENT_STATE', async () => {
    const fixture = await fixtures.createInterview({ status: 'COMPLETED' });
    await expectFailure(
      service.persist(fixture.interviewId, buildEvaluation(fixture.questions)),
      'INCONSISTENT_STATE',
      'classify',
    );
  });

  it('COMPLETED com avaliação incompleta (quatro perguntas) => INCONSISTENT_STATE', async () => {
    const fixture = await fixtures.createInterview({ status: 'COMPLETED' });
    await fixtures.seedEvaluation(fixture, {
      status: 'COMPLETED',
      questionEvaluations: 4,
    });
    await expectFailure(
      service.persist(fixture.interviewId, buildEvaluation(fixture.questions)),
      'INCONSISTENT_STATE',
      'classify',
    );
  });
});

describe('entrada inválida', () => {
  it('rejeita nota com mais de uma casa decimal sem tocar no banco', async () => {
    const fixture = await fixtures.createInterview();
    const before = await loadState(fixture.interviewId);
    const evaluation = buildEvaluation(fixture.questions);
    const invalid: NormalizedAiEvaluation = {
      ...evaluation,
      questionsEvaluation: evaluation.questionsEvaluation.map(
        (question, index) =>
          index === 0 ? { ...question, score: 7.25 } : question,
      ),
    };

    const failure = await expectFailure(
      service.persist(fixture.interviewId, invalid),
      'INVALID_INPUT',
      'input',
    );
    expect(failure.path).toBe('questionsEvaluation[0].score');
    await expectPristine(fixture, before.updated_at);
  });
});

describe('rollback integral', () => {
  it('avaliação pré-existente em entrevista pendente: a reivindicação é desfeita (INCONSISTENT_STATE)', async () => {
    const fixture = await fixtures.createInterview();
    const existingId = await fixtures.seedEvaluation(fixture, {
      status: 'DRAFT',
      questionEvaluations: 0,
    });
    const before = await loadState(fixture.interviewId);

    await expectFailure(
      service.persist(fixture.interviewId, buildEvaluation(fixture.questions)),
      'INCONSISTENT_STATE',
      'evaluation',
    );

    const after = await loadState(fixture.interviewId);
    expect(after.status).toBe('PENDING_AI_EVALUATION');
    expect(after.updated_at.getTime()).toBe(before.updated_at.getTime());
    expect(after.evaluation?.evaluation_id).toBe(existingId);
    expect(after.evaluation?.status).toBe('DRAFT');
    expect(after.evaluation?.question_evaluations).toHaveLength(0);
    expectNoSensitiveLogs();
  });

  it('pergunta de outra entrevista => QUESTIONS_MISMATCH e nada fica gravado', async () => {
    const fixture = await fixtures.createInterview();
    const other = await fixtures.createInterview();
    const before = await loadState(fixture.interviewId);
    const evaluation = buildEvaluation(fixture.questions);
    const foreign: NormalizedAiEvaluation = {
      ...evaluation,
      questionsEvaluation: evaluation.questionsEvaluation.map(
        (question, index) =>
          index === 0
            ? { ...question, questionId: other.questions[0].questionId }
            : question,
      ),
    };

    await expectFailure(
      service.persist(fixture.interviewId, foreign),
      'QUESTIONS_MISMATCH',
      'questions',
    );
    await expectPristine(fixture, before.updated_at);
    const otherState = await loadState(other.interviewId);
    expect(otherState.status).toBe('PENDING_AI_EVALUATION');
    expect(otherState.evaluation).toBeNull();
  });

  it('posições trocadas em relação às perguntas reais => QUESTIONS_MISMATCH e nada fica gravado', async () => {
    const fixture = await fixtures.createInterview();
    const before = await loadState(fixture.interviewId);
    const evaluation = buildEvaluation(fixture.questions);
    const swapped: NormalizedAiEvaluation = {
      ...evaluation,
      questionsEvaluation: evaluation.questionsEvaluation.map((question) => ({
        ...question,
        position:
          question.position === 1
            ? 2
            : question.position === 2
              ? 1
              : question.position,
      })),
    };

    await expectFailure(
      service.persist(fixture.interviewId, swapped),
      'QUESTIONS_MISMATCH',
      'questions',
    );
    await expectPristine(fixture, before.updated_at);
  });

  it('entrevista com apenas quatro perguntas => QUESTIONS_MISMATCH e nada fica gravado', async () => {
    const fixture = await fixtures.createInterview({ questionCount: 4 });
    const before = await loadState(fixture.interviewId);
    const full = await fixtures.createInterview();
    // As cinco avaliações recebidas usam UUIDs válidos; só quatro existem aqui.
    const evaluation = buildEvaluation([
      ...fixture.questions,
      { questionId: full.questions[4].questionId, position: 5 },
    ]);

    await expectFailure(
      service.persist(fixture.interviewId, evaluation),
      'QUESTIONS_MISMATCH',
      'questions',
    );
    await expectPristine(fixture, before.updated_at);
  });

  it('falha ao criar a avaliação principal (depois do INSERT) desfaz a reivindicação', async () => {
    const fixture = await fixtures.createInterview();
    const before = await loadState(fixture.interviewId);
    const failing = new AiEvaluationPersistenceService(
      withTransactionPatch(db, (tx) =>
        patchDelegate(tx, 'interview_evaluation', 'create', (real) => {
          return async (...args: unknown[]) => {
            await real(...args);
            throw new Error('falha simulada após INSERT da avaliação');
          };
        }),
      ),
    );

    await expectFailure(
      failing.persist(fixture.interviewId, buildEvaluation(fixture.questions)),
      'PERSISTENCE_FAILED',
      'evaluation',
    );
    await expectPristine(fixture, before.updated_at);
    expectNoSensitiveLogs();
  });

  it('falha ao gravar as perguntas (antes do INSERT) desfaz a avaliação e a reivindicação', async () => {
    const fixture = await fixtures.createInterview();
    const before = await loadState(fixture.interviewId);
    const failing = new AiEvaluationPersistenceService(
      withTransactionPatch(db, (tx) =>
        patchDelegate(tx, 'interview_question_evaluation', 'createMany', () => {
          return () => Promise.reject(new Error('falha simulada'));
        }),
      ),
    );

    await expectFailure(
      failing.persist(fixture.interviewId, buildEvaluation(fixture.questions)),
      'PERSISTENCE_FAILED',
      'question_evaluations',
    );
    await expectPristine(fixture, before.updated_at);
  });

  it('falha depois de as cinco perguntas já terem sido inseridas desfaz tudo', async () => {
    const fixture = await fixtures.createInterview();
    const before = await loadState(fixture.interviewId);
    const failing = new AiEvaluationPersistenceService(
      withTransactionPatch(db, (tx) =>
        patchDelegate(
          tx,
          'interview_question_evaluation',
          'createMany',
          (real) => {
            return async (...args: unknown[]) => {
              await real(...args);
              throw new Error('falha simulada após INSERT das perguntas');
            };
          },
        ),
      ),
    );

    await expectFailure(
      failing.persist(fixture.interviewId, buildEvaluation(fixture.questions)),
      'PERSISTENCE_FAILED',
      'question_evaluations',
    );
    await expectPristine(fixture, before.updated_at);
  });

  it('contagem divergente de perguntas gravadas (INCONSISTENT_STATE) desfaz tudo', async () => {
    const fixture = await fixtures.createInterview();
    const before = await loadState(fixture.interviewId);
    const failing = new AiEvaluationPersistenceService(
      withTransactionPatch(db, (tx) =>
        patchDelegate(
          tx,
          'interview_question_evaluation',
          'createMany',
          (real) => {
            return async (...args: unknown[]) => {
              await real(...args);
              return { count: 4 };
            };
          },
        ),
      ),
    );

    await expectFailure(
      failing.persist(fixture.interviewId, buildEvaluation(fixture.questions)),
      'INCONSISTENT_STATE',
      'question_evaluations',
    );
    await expectPristine(fixture, before.updated_at);
  });

  it('depois de um rollback, uma nova tentativa válida persiste normalmente', async () => {
    const fixture = await fixtures.createInterview();
    const evaluation = buildEvaluation(fixture.questions);
    const failing = new AiEvaluationPersistenceService(
      withTransactionPatch(db, (tx) =>
        patchDelegate(
          tx,
          'interview_question_evaluation',
          'createMany',
          (real) => {
            return async (...args: unknown[]) => {
              await real(...args);
              throw new Error('falha simulada');
            };
          },
        ),
      ),
    );
    await expectFailure(
      failing.persist(fixture.interviewId, evaluation),
      'PERSISTENCE_FAILED',
      'question_evaluations',
    );

    const retry = await service.persist(fixture.interviewId, evaluation);

    expect(retry.status).toBe('created');
    const state = await loadState(fixture.interviewId);
    expect(state.status).toBe('COMPLETED');
    expect(state.evaluation?.question_evaluations).toHaveLength(5);
  });
});

describe('concorrência (regras do serviço: UPDATE condicional como mutex)', () => {
  it('cinco tentativas simultâneas com o mesmo conteúdo: uma cria, as demais são already_persisted', async () => {
    const fixture = await fixtures.createInterview();
    const evaluation = buildEvaluation(fixture.questions);

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        service.persist(fixture.interviewId, evaluation),
      ),
    );

    expect(results.filter((r) => r.status === 'created')).toHaveLength(1);
    expect(
      results.filter((r) => r.status === 'already_persisted'),
    ).toHaveLength(4);
    expect(new Set(results.map((r) => r.evaluationId)).size).toBe(1);
    const state = await loadState(fixture.interviewId);
    expect(state.status).toBe('COMPLETED');
    expect(state.evaluation?.evaluation_id).toBe(results[0].evaluationId);
    expect(state.evaluation?.question_evaluations).toHaveLength(5);
    expect(
      await db.interview_evaluation.count({
        where: { interview_id: fixture.interviewId },
      }),
    ).toBe(1);
  });

  it('duas tentativas simultâneas com conteúdos diferentes: uma cria, a outra recebe EVALUATION_CONFLICT', async () => {
    const fixture = await fixtures.createInterview();
    const first = buildEvaluation(fixture.questions, { summary: 'Resumo A' });
    const second = buildEvaluation(fixture.questions, { summary: 'Resumo B' });

    const settled = await Promise.allSettled([
      service.persist(fixture.interviewId, first),
      service.persist(fixture.interviewId, second),
    ]);

    const fulfilled = settled.filter(
      (
        item,
      ): item is PromiseFulfilledResult<
        Awaited<ReturnType<typeof service.persist>>
      > => item.status === 'fulfilled',
    );
    const rejected = settled.filter(
      (item): item is PromiseRejectedResult => item.status === 'rejected',
    );
    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0].value.status).toBe('created');
    expect(rejected).toHaveLength(1);
    const reason = rejected[0].reason as AiEvaluationPersistenceError;
    expect(reason).toBeInstanceOf(AiEvaluationPersistenceError);
    expect(reason.code).toBe('EVALUATION_CONFLICT');

    const winnerIsFirst = settled[0].status === 'fulfilled';
    const state = await loadState(fixture.interviewId);
    expect(state.evaluation?.summary).toBe(
      winnerIsFirst ? 'Resumo A' : 'Resumo B',
    );
    expect(state.evaluation?.question_evaluations).toHaveLength(5);
  });

  it('entrevistas diferentes persistem em paralelo sem interferência', async () => {
    const fixturesList = await Promise.all(
      Array.from({ length: 4 }, () => fixtures.createInterview()),
    );

    const results = await Promise.all(
      fixturesList.map((fixture, index) =>
        service.persist(
          fixture.interviewId,
          buildEvaluation(fixture.questions, { summary: `Resumo ${index}` }),
        ),
      ),
    );

    expect(results.every((result) => result.status === 'created')).toBe(true);
    for (const [index, fixture] of fixturesList.entries()) {
      const state = await loadState(fixture.interviewId);
      expect(state.status).toBe('COMPLETED');
      expect(state.evaluation?.summary).toBe(`Resumo ${index}`);
      expect(state.evaluation?.question_evaluations).toHaveLength(5);
    }
  });
});

describe('integridade referencial do schema', () => {
  it('uma avaliação por pergunta não liga avaliação e pergunta de entrevistas diferentes', async () => {
    const first = await fixtures.createInterview();
    const second = await fixtures.createInterview();
    const evaluationId = await fixtures.seedEvaluation(first, {
      status: 'DRAFT',
      questionEvaluations: 0,
    });

    await expect(
      db.interview_question_evaluation.create({
        data: {
          evaluation_id: evaluationId,
          interview_id: first.interviewId,
          question_id: second.questions[0].questionId,
          score: 5,
          reason: 'x',
          suggestion: 'x',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
    expect(
      await db.interview_question_evaluation.count({
        where: { evaluation_id: evaluationId },
      }),
    ).toBe(0);
  });
});
