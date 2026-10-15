import { readFileSync } from 'fs';
import { join } from 'path';

import { Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import type { PrismaService } from '../prisma/prisma.service';
import type { NormalizedAiEvaluation } from './ai-evaluation.types';
import { AiEvaluationPersistenceService } from './ai-evaluation-persistence.service';
import {
  AiEvaluationPersistenceError,
  type AiEvaluationPersistErrorCode,
  type AiEvaluationPersistStep,
} from './ai-evaluation-persistence.types';

// IMPORTANTE: estes testes usam um Prisma SIMULADO em memória. Ele modela o
// rollback (descarta as escritas se a transação lançar) e serializa as
// transações para imitar a fila do UPDATE condicional, mas NÃO prova o bloqueio
// de linha real do PostgreSQL, a semântica de abort após P2002, o round-trip de
// Decimal nem o timeout da transação. Isso é escopo da R3.2.1 (teste de
// integração com PostgreSQL real).

const INTERVIEW_ID = '99999999-9999-4999-8999-999999999999';
const QUESTION_IDS = [1, 2, 3, 4, 5].map(
  (n) => `11111111-1111-4111-8111-11111111111${n}`,
);
const EVALUATION_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

// Textos "sensíveis" usados para provar que nada vaza em erros nem em logs.
const SECRETS = [
  'SEGREDO-RESUMO',
  'SEGREDO-FORTE',
  'SEGREDO-MELHORIA',
  'SEGREDO-RECOMENDACAO',
  'SEGREDO-MOTIVO',
  'SEGREDO-POSITIVO',
  'SEGREDO-SUGESTAO',
];

function makeEvaluation(): NormalizedAiEvaluation {
  return {
    criteriaScores: {
      clarity: 7.5,
      coherence: 8,
      objectivity: 6.5,
      domain_knowledge: 7,
      organization: 8.5,
      requirements_alignment: 6,
      examples: 7.5,
    },
    overallScore: 7.3,
    strengths: ['SEGREDO-FORTE a', 'SEGREDO-FORTE b'],
    improvements: ['SEGREDO-MELHORIA a'],
    recommendations: ['SEGREDO-RECOMENDACAO a'],
    summary: 'SEGREDO-RESUMO texto',
    questionsEvaluation: QUESTION_IDS.map((questionId, index) => ({
      questionId,
      position: index + 1,
      score: 5 + index,
      reason: `SEGREDO-MOTIVO ${index + 1}`,
      positives: [`SEGREDO-POSITIVO ${index + 1}`],
      improvements: [`melhorar ${index + 1}`],
      suggestion: `SEGREDO-SUGESTAO ${index + 1}`,
    })),
  };
}

// Entradas propositalmente malformadas (só para testar a validação).
function malformed(value: unknown): NormalizedAiEvaluation {
  return value as NormalizedAiEvaluation;
}

function withQuestion(
  base: NormalizedAiEvaluation,
  index: number,
  patch: Record<string, unknown>,
): NormalizedAiEvaluation {
  return {
    ...base,
    questionsEvaluation: base.questionsEvaluation.map((question, i) =>
      i === index ? { ...question, ...patch } : question,
    ),
  };
}

interface FakeState {
  interview: {
    id: string;
    mode: 'AI' | 'HUMAN' | null;
    status: string;
  } | null;
  questions: { question_id: string; position: number }[];
  evaluation: {
    evaluation_id: string;
    status: 'DRAFT' | 'COMPLETED';
    criteria_scores: unknown;
    overall_score: number | null;
    summary: string | null;
    strengths: unknown;
    improvements: unknown;
    recommendations: unknown;
  } | null;
  questionEvaluations: {
    question_id: string;
    score: number;
    reason: string;
    positives: unknown;
    improvements: unknown;
    suggestion: string;
  }[];
}

type FailPoint =
  'claim' | 'questions' | 'evaluation' | 'question_evaluations' | 'read';

function initialState(): FakeState {
  return {
    interview: {
      id: INTERVIEW_ID,
      mode: 'AI',
      status: 'PENDING_AI_EVALUATION',
    },
    questions: QUESTION_IDS.map((question_id, index) => ({
      question_id,
      position: index + 1,
    })),
    evaluation: null,
    questionEvaluations: [],
  };
}

function cloneState(state: FakeState): FakeState {
  return JSON.parse(JSON.stringify(state)) as FakeState;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function uniqueViolation(secret: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    `Unique constraint failed: ${secret}`,
    { code: 'P2002', clientVersion: 'test' },
  );
}

// Prisma simulado em memória. As transações são serializadas (uma por vez) e o
// estado é restaurado se o callback lançar: modela commit/rollback, sem provar
// o comportamento do PostgreSQL.
class FakePrisma {
  state: FakeState = initialState();
  failures: Partial<Record<FailPoint, unknown>> = {};
  forceClaimMiss = false;
  createManyCountOverride: number | null = null;
  transactionCalls = 0;
  lastOptions: unknown = undefined;
  private queue: Promise<unknown> = Promise.resolve();

  private maybeFail(point: FailPoint): void {
    if (point in this.failures) throw this.failures[point];
  }

  interview = {
    updateMany: (args: {
      where: {
        interview_id: string;
        evaluation_mode: 'AI';
        status: string;
      };
      data: { status: string };
    }): Promise<{ count: number }> => {
      this.maybeFail('claim');
      const interview = this.state.interview;
      if (
        this.forceClaimMiss ||
        !interview ||
        interview.id !== args.where.interview_id ||
        interview.mode !== args.where.evaluation_mode ||
        interview.status !== args.where.status
      ) {
        return Promise.resolve({ count: 0 });
      }
      interview.status = args.data.status;
      return Promise.resolve({ count: 1 });
    },
    findUnique: (): Promise<unknown> => {
      this.maybeFail('read');
      const { interview, questions, evaluation, questionEvaluations } =
        this.state;
      if (!interview) return Promise.resolve(null);
      return Promise.resolve({
        evaluation_mode: interview.mode,
        status: interview.status,
        questions: questions.map((q) => ({ ...q })),
        evaluation: evaluation
          ? {
              ...evaluation,
              overall_score:
                evaluation.overall_score === null
                  ? null
                  : new Prisma.Decimal(evaluation.overall_score),
              question_evaluations: questionEvaluations.map((q) => ({
                ...q,
                score: new Prisma.Decimal(q.score),
              })),
            }
          : null,
      });
    },
  };

  interview_question = {
    findMany: (): Promise<{ question_id: string; position: number }[]> => {
      this.maybeFail('questions');
      return Promise.resolve(this.state.questions.map((q) => ({ ...q })));
    },
  };

  interview_evaluation = {
    create: (args: {
      data: {
        status: 'COMPLETED';
        criteria_scores: unknown;
        overall_score: number;
        summary: string;
        strengths: unknown;
        improvements: unknown;
        recommendations: unknown;
      };
    }): Promise<{ evaluation_id: string }> => {
      this.maybeFail('evaluation');
      if (this.state.evaluation) {
        return Promise.reject(uniqueViolation('SEGREDO-RESUMO'));
      }
      this.state.evaluation = {
        evaluation_id: EVALUATION_ID,
        status: args.data.status,
        criteria_scores: args.data.criteria_scores,
        // O banco (Decimal(3,1)) arredondaria em silêncio: o serviço não deixa.
        overall_score: roundOneDecimal(args.data.overall_score),
        summary: args.data.summary,
        strengths: args.data.strengths,
        improvements: args.data.improvements,
        recommendations: args.data.recommendations,
      };
      return Promise.resolve({ evaluation_id: EVALUATION_ID });
    },
  };

  interview_question_evaluation = {
    createMany: (args: {
      data: {
        question_id: string;
        score: number;
        reason: string;
        positives: unknown;
        improvements: unknown;
        suggestion: string;
      }[];
    }): Promise<{ count: number }> => {
      this.maybeFail('question_evaluations');
      for (const row of args.data) {
        this.state.questionEvaluations.push({
          question_id: row.question_id,
          score: roundOneDecimal(row.score),
          reason: row.reason,
          positives: row.positives,
          improvements: row.improvements,
          suggestion: row.suggestion,
        });
      }
      return Promise.resolve({
        count: this.createManyCountOverride ?? args.data.length,
      });
    },
  };

  $transaction = <T>(
    callback: (tx: FakePrisma) => Promise<T>,
    options?: unknown,
  ): Promise<T> => {
    this.transactionCalls += 1;
    this.lastOptions = options;
    const run = async (): Promise<T> => {
      const snapshot = cloneState(this.state);
      try {
        return await callback(this);
      } catch (error) {
        this.state = snapshot; // rollback
        throw error;
      }
    };
    const result = this.queue.then(run);
    this.queue = result.catch(() => undefined);
    return result;
  };
}

function setup() {
  const fake = new FakePrisma();
  const service = new AiEvaluationPersistenceService(
    fake as unknown as PrismaService,
  );
  return { fake, service };
}

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (error: unknown) => error,
  );
}

async function expectFailure(
  promise: Promise<unknown>,
  code: AiEvaluationPersistErrorCode,
  step?: AiEvaluationPersistStep,
): Promise<AiEvaluationPersistenceError> {
  const error = await captureError(promise);
  if (!(error instanceof AiEvaluationPersistenceError)) {
    throw new Error('Esperava AiEvaluationPersistenceError');
  }
  expect(error.code).toBe(code);
  if (step !== undefined) expect(error.step).toBe(step);
  return error;
}

describe('AiEvaluationPersistenceService', () => {
  let logged: unknown[];

  beforeEach(() => {
    logged = [];
    for (const method of [
      'log',
      'error',
      'warn',
      'debug',
      'verbose',
    ] as const) {
      jest.spyOn(Logger.prototype, method).mockImplementation((...args) => {
        logged.push(args);
      });
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function allLogged(): string {
    return JSON.stringify(logged);
  }

  describe('persistência bem-sucedida', () => {
    it('grava avaliação COMPLETED, 5 avaliações por pergunta e conclui a entrevista', async () => {
      const { fake, service } = setup();
      const evaluation = makeEvaluation();

      const result = await service.persist(INTERVIEW_ID, evaluation);

      expect(result).toEqual({
        status: 'created',
        interviewId: INTERVIEW_ID,
        evaluationId: EVALUATION_ID,
      });
      expect(fake.state.interview?.status).toBe('COMPLETED');
      expect(fake.state.evaluation?.status).toBe('COMPLETED');
      expect(fake.state.evaluation?.criteria_scores).toEqual(
        evaluation.criteriaScores,
      );
      expect(fake.state.evaluation?.summary).toBe(evaluation.summary);
      expect(fake.state.questionEvaluations).toHaveLength(5);
      expect(fake.state.questionEvaluations.map((q) => q.question_id)).toEqual(
        QUESTION_IDS,
      );
    });

    it('não recalcula nem substitui o overallScore recebido', async () => {
      const { fake, service } = setup();
      // A média simples dos critérios é ~7.29; o valor do Python (7.3) é mantido.
      await service.persist(INTERVIEW_ID, makeEvaluation());
      expect(fake.state.evaluation?.overall_score).toBe(7.3);
    });

    it('usa uma única transação com maxWait e timeout explícitos', async () => {
      const { fake, service } = setup();
      await service.persist(INTERVIEW_ID, makeEvaluation());
      expect(fake.transactionCalls).toBe(1);
      expect(fake.lastOptions).toEqual({ maxWait: 5000, timeout: 15000 });
    });

    it('aceita textos vazios (summary e reason) sem alterá-los', async () => {
      const { fake, service } = setup();
      const evaluation = withQuestion({ ...makeEvaluation(), summary: '' }, 0, {
        reason: '',
        suggestion: '',
      });
      await service.persist(INTERVIEW_ID, evaluation);
      expect(fake.state.evaluation?.summary).toBe('');
      expect(fake.state.questionEvaluations[0].reason).toBe('');
    });
  });

  describe('validação da entrada (sem tocar no banco)', () => {
    const invalidCases: [string, () => [string, NormalizedAiEvaluation]][] = [
      ['id da entrevista inválido', () => ['nao-e-uuid', makeEvaluation()]],
      [
        'critério ausente',
        () => {
          const base = makeEvaluation();
          const criteriaScores: Record<string, number> = {
            ...base.criteriaScores,
          };
          delete criteriaScores.examples;
          return [INTERVIEW_ID, malformed({ ...base, criteriaScores })];
        },
      ],
      [
        'critério desconhecido',
        () => {
          const base = makeEvaluation();
          return [
            INTERVIEW_ID,
            malformed({
              ...base,
              criteriaScores: { ...base.criteriaScores, extra: 5 },
            }),
          ];
        },
      ],
      [
        'nota de critério NaN',
        () => {
          const base = makeEvaluation();
          return [
            INTERVIEW_ID,
            {
              ...base,
              criteriaScores: { ...base.criteriaScores, clarity: NaN },
            },
          ];
        },
      ],
      [
        'nota de critério acima de 10',
        () => {
          const base = makeEvaluation();
          return [
            INTERVIEW_ID,
            {
              ...base,
              criteriaScores: { ...base.criteriaScores, clarity: 10.5 },
            },
          ];
        },
      ],
      [
        'nota de critério negativa',
        () => {
          const base = makeEvaluation();
          return [
            INTERVIEW_ID,
            {
              ...base,
              criteriaScores: { ...base.criteriaScores, clarity: -1 },
            },
          ];
        },
      ],
      [
        'nota de critério com 2 casas (7.25)',
        () => {
          const base = makeEvaluation();
          return [
            INTERVIEW_ID,
            {
              ...base,
              criteriaScores: { ...base.criteriaScores, clarity: 7.25 },
            },
          ];
        },
      ],
      [
        'overallScore com 2 casas (7.25)',
        () => [INTERVIEW_ID, { ...makeEvaluation(), overallScore: 7.25 }],
      ],
      [
        'overallScore infinito',
        () => [INTERVIEW_ID, { ...makeEvaluation(), overallScore: Infinity }],
      ],
      [
        'nota de pergunta com 2 casas (8.25)',
        () => [
          INTERVIEW_ID,
          withQuestion(makeEvaluation(), 0, { score: 8.25 }),
        ],
      ],
      [
        'quatro perguntas',
        () => {
          const base = makeEvaluation();
          return [
            INTERVIEW_ID,
            {
              ...base,
              questionsEvaluation: base.questionsEvaluation.slice(0, 4),
            },
          ];
        },
      ],
      [
        'seis perguntas',
        () => {
          const base = makeEvaluation();
          return [
            INTERVIEW_ID,
            {
              ...base,
              questionsEvaluation: [
                ...base.questionsEvaluation,
                base.questionsEvaluation[0],
              ],
            },
          ];
        },
      ],
      [
        'questionId duplicado',
        () => [
          INTERVIEW_ID,
          withQuestion(makeEvaluation(), 1, { questionId: QUESTION_IDS[0] }),
        ],
      ],
      [
        'questionId que não é UUID',
        () => [
          INTERVIEW_ID,
          withQuestion(makeEvaluation(), 1, { questionId: 'abc' }),
        ],
      ],
      [
        'posição duplicada',
        () => [
          INTERVIEW_ID,
          withQuestion(makeEvaluation(), 1, { position: 1 }),
        ],
      ],
      [
        'posição fora de 1..5',
        () => [
          INTERVIEW_ID,
          withQuestion(makeEvaluation(), 4, { position: 6 }),
        ],
      ],
      [
        'item de lista em branco',
        () => [INTERVIEW_ID, { ...makeEvaluation(), strengths: ['ok', '  '] }],
      ],
      [
        'summary que não é texto',
        () => [INTERVIEW_ID, malformed({ ...makeEvaluation(), summary: 1 })],
      ],
      [
        'reason que não é texto',
        () => [
          INTERVIEW_ID,
          withQuestion(makeEvaluation(), 0, { reason: null }),
        ],
      ],
      [
        'positives com item em branco',
        () => [
          INTERVIEW_ID,
          withQuestion(makeEvaluation(), 0, { positives: [''] }),
        ],
      ],
      ['avaliação nula', () => [INTERVIEW_ID, malformed(null)]],
    ];

    it.each(invalidCases)('rejeita: %s', async (_name, build) => {
      const { fake, service } = setup();
      const [interviewId, evaluation] = build();

      await expectFailure(
        service.persist(interviewId, evaluation),
        'INVALID_INPUT',
        'input',
      );

      expect(fake.transactionCalls).toBe(0);
      expect(fake.state).toEqual(initialState());
    });

    it('rejeita 7.25 em vez de arredondar para 7.3', async () => {
      const { fake, service } = setup();
      const base = makeEvaluation();
      await expectFailure(
        service.persist(INTERVIEW_ID, {
          ...base,
          criteriaScores: { ...base.criteriaScores, coherence: 7.25 },
        }),
        'INVALID_INPUT',
      );
      expect(fake.state.evaluation).toBeNull();
    });

    it('a mensagem do erro informa só onde falhou, nunca o valor', async () => {
      const { service } = setup();
      const error = await expectFailure(
        service.persist(
          INTERVIEW_ID,
          withQuestion(makeEvaluation(), 2, { reason: 123456789 }),
        ),
        'INVALID_INPUT',
      );
      expect(error.path).toBe('questionsEvaluation[2].reason');
      expect(error.message).not.toContain('123456789');
    });
  });

  describe('entrevista e perguntas', () => {
    it('entrevista inexistente => INTERVIEW_NOT_FOUND', async () => {
      const { fake, service } = setup();
      fake.state.interview = null;
      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'INTERVIEW_NOT_FOUND',
      );
    });

    it.each(['IN_PROGRESS', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'COMPLETED'])(
      'modo HUMAN em %s => WRONG_EVALUATION_MODE e nada muda',
      async (status) => {
        const { fake, service } = setup();
        fake.state.interview = { id: INTERVIEW_ID, mode: 'HUMAN', status };
        const before = cloneState(fake.state);
        await expectFailure(
          service.persist(INTERVIEW_ID, makeEvaluation()),
          'WRONG_EVALUATION_MODE',
        );
        expect(fake.state).toEqual(before);
      },
    );

    it.each([
      [null, 'IN_PROGRESS'],
      [null, 'CANCELLED'],
      ['AI', 'IN_PROGRESS'],
      ['AI', 'CANCELLED'],
      ['AI', 'PENDING_ASSIGNMENT'],
      ['AI', 'ASSIGNED'],
    ] as const)(
      'modo %s em %s => INVALID_INTERVIEW_STATE e nada muda',
      async (mode, status) => {
        const { fake, service } = setup();
        fake.state.interview = { id: INTERVIEW_ID, mode, status };
        const before = cloneState(fake.state);
        await expectFailure(
          service.persist(INTERVIEW_ID, makeEvaluation()),
          'INVALID_INTERVIEW_STATE',
        );
        expect(fake.state).toEqual(before);
      },
    );

    it('UUID de pergunta diferente do real => QUESTIONS_MISMATCH com rollback', async () => {
      const { fake, service } = setup();
      const evaluation = withQuestion(makeEvaluation(), 0, {
        questionId: '22222222-2222-4222-8222-222222222222',
      });
      await expectFailure(
        service.persist(INTERVIEW_ID, evaluation),
        'QUESTIONS_MISMATCH',
        'questions',
      );
      expect(fake.state).toEqual(initialState());
    });

    it('posição diferente da real => QUESTIONS_MISMATCH com rollback', async () => {
      const { fake, service } = setup();
      fake.state.questions[0].position = 2;
      fake.state.questions[1].position = 1;
      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'QUESTIONS_MISMATCH',
      );
      expect(fake.state.interview?.status).toBe('PENDING_AI_EVALUATION');
      expect(fake.state.evaluation).toBeNull();
    });

    it('entrevista com só 4 perguntas reais => QUESTIONS_MISMATCH com rollback', async () => {
      const { fake, service } = setup();
      fake.state.questions.pop();
      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'QUESTIONS_MISMATCH',
      );
      expect(fake.state.interview?.status).toBe('PENDING_AI_EVALUATION');
    });
  });

  describe('rollback por etapa da transação', () => {
    it.each<[FailPoint, AiEvaluationPersistStep]>([
      ['claim', 'claim'],
      ['questions', 'questions'],
      ['evaluation', 'evaluation'],
      ['question_evaluations', 'question_evaluations'],
    ])(
      'falha no banco em %s => PERSISTENCE_FAILED e tudo desfeito',
      async (point, step) => {
        const { fake, service } = setup();
        fake.failures[point] = new Error('conexão caiu SEGREDO-RESUMO');

        await expectFailure(
          service.persist(INTERVIEW_ID, makeEvaluation()),
          'PERSISTENCE_FAILED',
          step,
        );

        expect(fake.state).toEqual(initialState());
      },
    );

    it('createMany devolvendo count != 5 => INCONSISTENT_STATE e rollback total', async () => {
      const { fake, service } = setup();
      fake.createManyCountOverride = 4;
      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'INCONSISTENT_STATE',
        'question_evaluations',
      );
      expect(fake.state).toEqual(initialState());
    });

    it('avaliação já existente em entrevista pendente (P2002) => INCONSISTENT_STATE e rollback do claim', async () => {
      const { fake, service } = setup();
      fake.state.evaluation = {
        evaluation_id: 'antiga',
        status: 'DRAFT',
        criteria_scores: {},
        overall_score: null,
        summary: null,
        strengths: null,
        improvements: null,
        recommendations: null,
      };
      const before = cloneState(fake.state);

      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'INCONSISTENT_STATE',
        'evaluation',
      );

      expect(fake.state).toEqual(before);
      expect(fake.state.interview?.status).toBe('PENDING_AI_EVALUATION');
    });
  });

  describe('idempotência', () => {
    it('repetição idêntica => already_persisted, sem duplicar nem reescrever', async () => {
      const { fake, service } = setup();
      const first = await service.persist(INTERVIEW_ID, makeEvaluation());
      const afterFirst = cloneState(fake.state);

      const second = await service.persist(INTERVIEW_ID, makeEvaluation());

      expect(first.status).toBe('created');
      expect(second).toEqual({
        status: 'already_persisted',
        interviewId: INTERVIEW_ID,
        evaluationId: first.evaluationId,
      });
      expect(fake.state).toEqual(afterFirst);
      expect(fake.state.questionEvaluations).toHaveLength(5);
    });

    it('a ordem das chaves do JSONB não importa na comparação', async () => {
      const { fake, service } = setup();
      await service.persist(INTERVIEW_ID, makeEvaluation());
      const stored = fake.state.evaluation;
      if (!stored) throw new Error('esperava avaliação gravada');
      const scores = stored.criteria_scores as Record<string, number>;
      stored.criteria_scores = Object.fromEntries(
        Object.entries(scores).reverse(),
      );

      const result = await service.persist(INTERVIEW_ID, makeEvaluation());
      expect(result.status).toBe('already_persisted');
    });

    it('compara notas Decimal do banco com os números recebidos', async () => {
      const { service } = setup();
      await service.persist(INTERVIEW_ID, makeEvaluation());
      const result = await service.persist(INTERVIEW_ID, makeEvaluation());
      expect(result.status).toBe('already_persisted');
    });
  });

  describe('repetição divergente => EVALUATION_CONFLICT', () => {
    const base = makeEvaluation();
    const divergent: [string, NormalizedAiEvaluation][] = [
      ['summary', { ...base, summary: 'outro resumo' }],
      ['overallScore', { ...base, overallScore: 7.4 }],
      [
        'nota de critério',
        {
          ...base,
          criteriaScores: { ...base.criteriaScores, clarity: 7 },
        },
      ],
      ['strengths', { ...base, strengths: ['outro'] }],
      [
        'ordem de strengths',
        { ...base, strengths: [...base.strengths].reverse() },
      ],
      ['recommendations', { ...base, recommendations: [] }],
      ['reason de pergunta', withQuestion(base, 3, { reason: 'diferente' })],
      ['nota de pergunta', withQuestion(base, 3, { score: 9.5 })],
      ['positives de pergunta', withQuestion(base, 0, { positives: ['x'] })],
      ['suggestion de pergunta', withQuestion(base, 4, { suggestion: 'y' })],
    ];

    it.each(divergent)(
      'divergência em %s não sobrescreve o vencedor',
      async (_name, other) => {
        const { fake, service } = setup();
        await service.persist(INTERVIEW_ID, makeEvaluation());
        const winner = cloneState(fake.state);

        await expectFailure(
          service.persist(INTERVIEW_ID, other),
          'EVALUATION_CONFLICT',
        );

        expect(fake.state).toEqual(winner);
      },
    );

    it('nunca devolve already_persisted com conteúdo divergente', async () => {
      const { service } = setup();
      await service.persist(INTERVIEW_ID, makeEvaluation());
      const result = await captureError(
        service.persist(INTERVIEW_ID, { ...makeEvaluation(), summary: 'z' }),
      );
      expect(result).toBeInstanceOf(AiEvaluationPersistenceError);
    });
  });

  describe('vencedor incompleto ou inconsistente', () => {
    async function completed() {
      const ctx = setup();
      await ctx.service.persist(INTERVIEW_ID, makeEvaluation());
      return ctx;
    }

    it('COMPLETED sem avaliação => INCONSISTENT_STATE', async () => {
      const { fake, service } = setup();
      fake.state.interview = {
        id: INTERVIEW_ID,
        mode: 'AI',
        status: 'COMPLETED',
      };
      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'INCONSISTENT_STATE',
      );
    });

    it('avaliação em DRAFT => INCONSISTENT_STATE', async () => {
      const { fake, service } = await completed();
      if (fake.state.evaluation) fake.state.evaluation.status = 'DRAFT';
      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'INCONSISTENT_STATE',
      );
    });

    it('menos de 5 avaliações por pergunta => INCONSISTENT_STATE', async () => {
      const { fake, service } = await completed();
      fake.state.questionEvaluations.pop();
      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'INCONSISTENT_STATE',
      );
    });

    it('avaliação por pergunta de id que não pertence à entrevista => INCONSISTENT_STATE', async () => {
      const { fake, service } = await completed();
      fake.state.questionEvaluations[0].question_id =
        '33333333-3333-4333-8333-333333333333';
      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'INCONSISTENT_STATE',
      );
    });

    it('overall_score nulo => INCONSISTENT_STATE', async () => {
      const { fake, service } = await completed();
      if (fake.state.evaluation) fake.state.evaluation.overall_score = null;
      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'INCONSISTENT_STATE',
      );
    });

    it('criteria_scores com chave a menos => INCONSISTENT_STATE', async () => {
      const { fake, service } = await completed();
      if (fake.state.evaluation) {
        fake.state.evaluation.criteria_scores = { clarity: 7.5 };
      }
      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'INCONSISTENT_STATE',
      );
    });

    it('entrevista ainda pendente, sem avaliação, após claim perdido => PERSISTENCE_FAILED (corrida transitória)', async () => {
      const { fake, service } = setup();
      fake.forceClaimMiss = true;
      await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'PERSISTENCE_FAILED',
        'claim',
      );
      expect(fake.state).toEqual(initialState());
    });
  });

  describe('concorrência simulada (transações serializadas)', () => {
    it('duas chamadas idênticas: uma created e uma already_persisted', async () => {
      const { fake, service } = setup();

      const results = await Promise.all([
        service.persist(INTERVIEW_ID, makeEvaluation()),
        service.persist(INTERVIEW_ID, makeEvaluation()),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([
        'already_persisted',
        'created',
      ]);
      expect(results[0].evaluationId).toBe(results[1].evaluationId);
      expect(fake.state.questionEvaluations).toHaveLength(5);
    });

    it('duas chamadas divergentes: a primeira vence, a segunda recebe EVALUATION_CONFLICT', async () => {
      const { fake, service } = setup();
      const winner = makeEvaluation();
      const loser = { ...makeEvaluation(), summary: 'SEGREDO-RESUMO perdedor' };

      const settled = await Promise.allSettled([
        service.persist(INTERVIEW_ID, winner),
        service.persist(INTERVIEW_ID, loser),
      ]);

      expect(settled[0].status).toBe('fulfilled');
      expect(settled[1].status).toBe('rejected');
      if (settled[1].status === 'rejected') {
        expect(settled[1].reason).toBeInstanceOf(AiEvaluationPersistenceError);
        expect((settled[1].reason as AiEvaluationPersistenceError).code).toBe(
          'EVALUATION_CONFLICT',
        );
      }
      expect(fake.state.evaluation?.summary).toBe(winner.summary);
      expect(fake.state.questionEvaluations).toHaveLength(5);
    });

    it('cinco chamadas simultâneas idênticas gravam uma única vez', async () => {
      const { fake, service } = setup();
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          service.persist(INTERVIEW_ID, makeEvaluation()),
        ),
      );
      expect(results.filter((r) => r.status === 'created')).toHaveLength(1);
      expect(
        results.filter((r) => r.status === 'already_persisted'),
      ).toHaveLength(4);
      expect(fake.state.questionEvaluations).toHaveLength(5);
    });
  });

  describe('segurança e observabilidade', () => {
    function expectNoSecrets(text: string) {
      for (const secret of SECRETS) {
        expect(text).not.toContain(secret);
      }
    }

    it('erro genérico do banco vira PERSISTENCE_FAILED sem mensagem original, sem cause e sem stack do banco', async () => {
      const { fake, service } = setup();
      fake.failures.evaluation = new Error(
        'insert failed: SEGREDO-RESUMO SEGREDO-MOTIVO',
      );

      const error = await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'PERSISTENCE_FAILED',
      );

      expectNoSecrets(error.message);
      expectNoSecrets(error.stack ?? '');
      expect(Object.prototype.hasOwnProperty.call(error, 'cause')).toBe(false);
      expectNoSecrets(allLogged());
    });

    it('erro conhecido do Prisma: loga só o código Pxxxx, nunca a mensagem nem o meta', async () => {
      const { fake, service } = setup();
      fake.failures.question_evaluations =
        new Prisma.PrismaClientKnownRequestError(
          'Falha com SEGREDO-SUGESTAO e SEGREDO-POSITIVO',
          {
            code: 'P2034',
            clientVersion: 'test',
            meta: { argumentos: 'SEGREDO-RESUMO' },
          },
        );

      const error = await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'PERSISTENCE_FAILED',
        'question_evaluations',
      );

      expectNoSecrets(error.message);
      expectNoSecrets(allLogged());
      expect(allLogged()).toContain('P2034');
      expect(allLogged()).toContain(INTERVIEW_ID);
    });

    it('falha na leitura de classificação também é sanitizada', async () => {
      const { fake, service } = setup();
      fake.state.interview = {
        id: INTERVIEW_ID,
        mode: 'AI',
        status: 'COMPLETED',
      };
      fake.failures.read = new Error('leitura falhou SEGREDO-RESUMO');

      const error = await expectFailure(
        service.persist(INTERVIEW_ID, makeEvaluation()),
        'PERSISTENCE_FAILED',
        'classify',
      );

      expectNoSecrets(error.message);
      expectNoSecrets(allLogged());
    });

    it('logs de sucesso, repetição e conflito não contêm texto de avaliação nem notas', async () => {
      const { service } = setup();
      await service.persist(INTERVIEW_ID, makeEvaluation());
      await service.persist(INTERVIEW_ID, makeEvaluation());
      await captureError(
        service.persist(INTERVIEW_ID, {
          ...makeEvaluation(),
          summary: 'SEGREDO-RESUMO diferente',
        }),
      );

      const logged = allLogged();
      expectNoSecrets(logged);
      expect(logged).toContain('outcome=created');
      expect(logged).toContain('outcome=already_persisted');
      expect(logged).toContain('code=EVALUATION_CONFLICT');
    });
  });

  describe('escopo do serviço', () => {
    const source = readFileSync(
      join(__dirname, 'ai-evaluation-persistence.service.ts'),
      'utf8',
    );

    it('depende só do PrismaService', () => {
      expect(AiEvaluationPersistenceService.length).toBe(1);
    });

    it('não depende de Groq, Python, snapshots nem do fluxo humano', () => {
      expect(source).not.toMatch(/fetch\(|groq|HttpService|ConfigService/i);
      expect(source).not.toMatch(/interviews-ai\.service/);
      expect(source).not.toMatch(/material-recommendation/);
      expect(source).not.toMatch(/evaluator-interviews\/evaluator-/);
    });

    it('não sobrescreve dados: sem update/upsert/delete de avaliações nem skipDuplicates', () => {
      expect(source).not.toMatch(
        /interview_evaluation\.(update|upsert|delete)/,
      );
      expect(source).not.toMatch(
        /interview_question_evaluation\.(update|upsert|delete)/,
      );
      expect(source).not.toMatch(/skipDuplicates/);
    });
  });
});
