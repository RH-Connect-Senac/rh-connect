import { readFileSync } from 'fs';
import { join } from 'path';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { validateForCompletion } from './evaluation-criteria';
import { EvaluatorCompletionService } from './evaluator-completion.service';
import { EvaluatorInterviewsService } from './evaluator-interviews.service';

const CAMILA_USER_ID = 11;
const CAMILA_PROFILE_ID = 3;
const OTHER_USER_ID = 12;
const OTHER_PROFILE_ID = 4;
const NO_PROFILE_USER_ID = 99;
const ID_A = '11111111-1111-4111-8111-111111111111';
const MISSING = '99999999-9999-4999-8999-999999999999';
const NOT_FOUND = 'Entrevista não encontrada.';
const T0 = new Date('2026-10-10T09:00:00.000Z');

type Row = Record<string, unknown>;

const FULL_SCORES = {
  clarity: 8,
  coherence: 7.5,
  objectivity: 9,
  domain_knowledge: 8,
  organization: 7,
  requirements_alignment: 8.5,
  examples: 9,
};

function interview(overrides: Row = {}): Row {
  return {
    interview_id: ID_A,
    status: 'ASSIGNED',
    evaluation_mode: 'HUMAN',
    evaluator_profile_id: CAMILA_PROFILE_ID,
    updated_at: T0,
    ...overrides,
  };
}

function evaluation(overrides: Row = {}): Row {
  return {
    evaluation_id: 'eval-1',
    interview_id: ID_A,
    status: 'DRAFT',
    criteria_scores: { ...FULL_SCORES },
    summary: 'Bom candidato.\n\nSegundo parágrafo.',
    overall_score: 1.5, // parcial/antigo: deve ser ignorado
    completed_at: null,
    updated_at: T0,
    ...overrides,
  };
}

const PROFILES = [
  { user_id: CAMILA_USER_ID, evaluator_profile_id: CAMILA_PROFILE_ID },
  { user_id: OTHER_USER_ID, evaluator_profile_id: OTHER_PROFILE_ID },
];

// Prisma falso com `where` por igualdade e transação REAL no sentido que
// importa: cada escrita feita dentro de $transaction entra num diário e é
// desfeita (só as da própria transação) se o callback lançar erro.
function makeService(interviews: Row[], evaluations: Row[]) {
  const matches = (row: Row, where: Row) =>
    Object.entries(where).every(([key, value]) =>
      value instanceof Date
        ? (row[key] as Date)?.getTime() === value.getTime()
        : row[key] === value,
    );

  const hooks: {
    failEvaluationUpdate?: Error;
    failInterviewUpdate?: Error;
    interviewCountZero?: boolean;
  } = {};

  const interviewUpdateSpy = jest.fn();
  const evaluationUpdateSpy = jest.fn();

  const write = (
    rows: Row[],
    args: { where: Row; data: Row },
    journal: Array<() => void>,
  ) => {
    const found = rows.filter((row) => matches(row, args.where));
    for (const row of found) {
      const before = { ...row };
      Object.assign(row, args.data);
      journal.push(() => Object.assign(row, before));
    }
    return Promise.resolve({ count: found.length });
  };

  const prisma = {
    evaluator_profile: {
      findUnique: jest.fn(({ where }: { where: Row }) =>
        Promise.resolve(PROFILES.find((p) => matches(p, where)) ?? null),
      ),
    },
    interview: {
      findFirst: jest.fn(({ where }: { where: Row }) =>
        Promise.resolve(interviews.find((r) => matches(r, where)) ?? null),
      ),
      findMany: jest.fn(({ where }: { where: Row }) =>
        Promise.resolve(interviews.filter((r) => matches(r, where))),
      ),
      // Só conta chamadas: as escritas reais passam pelo cliente da transação.
      updateMany: interviewUpdateSpy,
    },
    interview_evaluation: {
      findUnique: jest.fn(({ where }: { where: Row }) => {
        const row = evaluations.find((r) => matches(r, where));
        return Promise.resolve(row ? { ...row } : null);
      }),
      updateMany: evaluationUpdateSpy,
    },
    $transaction: jest.fn(
      async (callback: (tx: unknown) => Promise<unknown>) => {
        const journal: Array<() => void> = [];
        const tx = {
          interview: {
            updateMany: (args: { where: Row; data: Row }) => {
              interviewUpdateSpy(args);
              if (hooks.failInterviewUpdate) {
                return Promise.reject(hooks.failInterviewUpdate);
              }
              if (hooks.interviewCountZero) {
                return Promise.resolve({ count: 0 });
              }
              return write(interviews, args, journal);
            },
          },
          interview_evaluation: {
            findUnique: prisma.interview_evaluation.findUnique,
            updateMany: (args: { where: Row; data: Row }) => {
              evaluationUpdateSpy(args);
              if (hooks.failEvaluationUpdate) {
                return Promise.reject(hooks.failEvaluationUpdate);
              }
              return write(evaluations, args, journal);
            },
          },
        };
        try {
          return await callback(tx);
        } catch (error) {
          while (journal.length) journal.pop()!();
          throw error;
        }
      },
    ),
  };

  const interviewsService = new EvaluatorInterviewsService(
    prisma as unknown as PrismaService,
  );
  const service = new EvaluatorCompletionService(
    prisma as unknown as PrismaService,
    interviewsService,
  );
  return { service, interviewsService, prisma, hooks };
}

describe('conclusão válida', () => {
  it('conclui: evaluation COMPLETED com completed_at, interview COMPLETED, tudo junto', async () => {
    const interviews = [interview()];
    const evaluations = [evaluation()];
    const { service, prisma } = makeService(interviews, evaluations);

    const result = await service.complete(CAMILA_USER_ID, ID_A);

    expect(evaluations[0].status).toBe('COMPLETED');
    expect(evaluations[0].completed_at).toBeInstanceOf(Date);
    expect(interviews[0].status).toBe('COMPLETED');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      interviewId: ID_A,
      status: 'COMPLETED',
      evaluationStatus: 'COMPLETED',
      overallScore: 8.1,
      completedAt: evaluations[0].completed_at,
    });
  });

  it('recalcula o overall_score com os 7 critérios e ignora o parcial antigo', async () => {
    const evaluations = [evaluation({ overall_score: 1.5 })];
    const { service } = makeService([interview()], evaluations);

    const result = await service.complete(CAMILA_USER_ID, ID_A);

    // (8 + 7.5 + 9 + 8 + 7 + 8.5 + 9) / 7 = 57 / 7 = 8.142857...
    expect(result.overallScore).toBe(8.1);
    expect(evaluations[0].overall_score).toBe(8.1);
  });

  it('arredonda a média para 1 casa decimal', () => {
    const scores = { ...FULL_SCORES, clarity: 10, coherence: 10, objectivity: 10, domain_knowledge: 9, organization: 9, requirements_alignment: 9, examples: 9 };
    // 66 / 7 = 9.428571...
    expect(validateForCompletion(scores, 'ok').overallScore).toBe(9.4);
  });

  it('não grava nada além do necessário e só nas duas tabelas permitidas', async () => {
    const { service, prisma } = makeService([interview()], [evaluation()]);

    await service.complete(CAMILA_USER_ID, ID_A);

    const evalData = prisma.interview_evaluation.updateMany.mock.calls[0][0].data;
    expect(Object.keys(evalData).sort()).toEqual(
      ['completed_at', 'overall_score', 'status', 'updated_at'],
    );
    expect(evalData.status).toBe('COMPLETED');
    const interviewData = prisma.interview.updateMany.mock.calls[0][0].data;
    expect(Object.keys(interviewData).sort()).toEqual(['status', 'updated_at']);
    expect(prisma.interview.updateMany.mock.calls[0][0].where).toEqual({
      interview_id: ID_A,
      evaluator_profile_id: CAMILA_PROFILE_ID,
      evaluation_mode: 'HUMAN',
      status: 'ASSIGNED',
    });
  });

  it('após concluir, a fila ativa não lista mais a entrevista', async () => {
    const { service, interviewsService } = makeService([interview()], [evaluation()]);

    await service.complete(CAMILA_USER_ID, ID_A);

    const queue = await interviewsService.listAssigned(CAMILA_USER_ID);
    expect(queue.total).toBe(0);
  });
});

describe('pré-requisitos da avaliação', () => {
  it('sem avaliação existente => 409 "ainda não foi iniciada"', async () => {
    const interviews = [interview()];
    const { service } = makeService(interviews, []);

    const error = await service.complete(CAMILA_USER_ID, ID_A).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.message).toBe('A avaliação ainda não foi iniciada.');
    expect(interviews[0].status).toBe('ASSIGNED');
  });

  it('avaliação já COMPLETED => 409 "já foi concluída" e nada é sobrescrito', async () => {
    const done = evaluation({ status: 'COMPLETED', completed_at: T0, overall_score: 5 });
    const { service, prisma } = makeService([interview()], [done]);

    const error = await service.complete(CAMILA_USER_ID, ID_A).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(error.message).toBe('A avaliação já foi concluída.');
    expect(prisma.interview_evaluation.updateMany).not.toHaveBeenCalled();
    expect(done.overall_score).toBe(5);
  });

  it('critério ausente => 400 e nada muda', async () => {
    const { clarity: _omit, ...rest } = FULL_SCORES;
    const interviews = [interview()];
    const evaluations = [evaluation({ criteria_scores: rest })];
    const { service } = makeService(interviews, evaluations);

    const error = await service.complete(CAMILA_USER_ID, ID_A).catch((e) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toMatch(/Clareza/);
    expect(error.getResponse().missingCriteria).toEqual(['clarity']);
    expect(evaluations[0].status).toBe('DRAFT');
    expect(interviews[0].status).toBe('ASSIGNED');
  });

  it('vários critérios ausentes => 400 listando todos', async () => {
    const evaluations = [evaluation({ criteria_scores: { clarity: 8 } })];
    const { service } = makeService([interview()], evaluations);

    const error = await service.complete(CAMILA_USER_ID, ID_A).catch((e) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.getResponse().missingCriteria).toEqual([
      'coherence',
      'objectivity',
      'domain_knowledge',
      'organization',
      'requirements_alignment',
      'examples',
    ]);
  });

  it.each([[-1], [10.5], ['8'], [null], [NaN]])(
    'nota persistida inválida (%s) => 400',
    async (bad) => {
      const evaluations = [
        evaluation({ criteria_scores: { ...FULL_SCORES, clarity: bad } }),
      ];
      const { service } = makeService([interview()], evaluations);

      await expect(
        service.complete(CAMILA_USER_ID, ID_A),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(evaluations[0].status).toBe('DRAFT');
    },
  );

  it('critério desconhecido persistido => 400', async () => {
    const evaluations = [
      evaluation({ criteria_scores: { ...FULL_SCORES, criatividade: 9 } }),
    ];
    const { service } = makeService([interview()], evaluations);

    const error = await service.complete(CAMILA_USER_ID, ID_A).catch((e) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toMatch(/criatividade/);
  });

  it.each([
    ['null', null],
    ['vazio', ''],
    ['só espaços e quebras', '  \n \r\n  '],
  ])('summary %s => 400', async (_label, summary) => {
    const interviews = [interview()];
    const evaluations = [evaluation({ summary })];
    const { service } = makeService(interviews, evaluations);

    const error = await service.complete(CAMILA_USER_ID, ID_A).catch((e) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toMatch(/comentário geral é obrigatório/);
    expect(evaluations[0].status).toBe('DRAFT');
    expect(interviews[0].status).toBe('ASSIGNED');
  });

  it('summary acima do limite persistido => 400; quebras de linha são aceitas', () => {
    expect(() => validateForCompletion(FULL_SCORES, 'a'.repeat(2001))).toThrow(
      BadRequestException,
    );
    expect(validateForCompletion(FULL_SCORES, 'L1\r\n\r\nL2').summary).toBe(
      'L1\n\nL2',
    );
  });
});

describe('posse e acesso', () => {
  it('avaliador B => 404 e o mesmo 404 de UUID inexistente', async () => {
    const evaluations = [evaluation()];
    const { service, prisma } = makeService([interview()], evaluations);

    const alheia = await service.complete(OTHER_USER_ID, ID_A).catch((e) => e);
    const inexistente = await service.complete(OTHER_USER_ID, MISSING).catch((e) => e);

    expect(alheia).toBeInstanceOf(NotFoundException);
    expect(alheia.message).toBe(NOT_FOUND);
    expect(alheia.getResponse()).toEqual(inexistente.getResponse());
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(evaluations[0].status).toBe('DRAFT');
  });

  it.each([
    ['de IA', { evaluation_mode: 'AI', status: 'PENDING_AI_EVALUATION', evaluator_profile_id: null }],
    ['PENDING_ASSIGNMENT', { status: 'PENDING_ASSIGNMENT', evaluator_profile_id: null }],
    ['COMPLETED', { status: 'COMPLETED' }],
    ['IN_PROGRESS', { status: 'IN_PROGRESS', evaluation_mode: null, evaluator_profile_id: null }],
  ])('entrevista %s => 404 sem abrir transação', async (_label, overrides) => {
    const { service, prisma } = makeService([interview(overrides)], [evaluation()]);

    await expect(service.complete(CAMILA_USER_ID, ID_A)).rejects.toThrow(
      new NotFoundException(NOT_FOUND),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('EVALUATOR sem evaluator_profile falha fechado (403)', async () => {
    const { service, prisma } = makeService([interview()], [evaluation()]);

    await expect(
      service.complete(NO_PROFILE_USER_ID, ID_A),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.interview.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('atomicidade (rollback)', () => {
  it('falha ao atualizar a avaliação: a entrevista continua ASSIGNED e a avaliação DRAFT', async () => {
    const interviews = [interview()];
    const evaluations = [evaluation()];
    const { service, hooks } = makeService(interviews, evaluations);
    hooks.failEvaluationUpdate = new Error('db down');

    await expect(service.complete(CAMILA_USER_ID, ID_A)).rejects.toThrow('db down');

    expect(interviews[0].status).toBe('ASSIGNED');
    expect(evaluations[0].status).toBe('DRAFT');
    expect(evaluations[0].completed_at).toBeNull();
  });

  it('falha ao atualizar a entrevista: a avaliação volta a DRAFT (rollback)', async () => {
    const interviews = [interview()];
    const evaluations = [evaluation()];
    const { service, hooks } = makeService(interviews, evaluations);
    hooks.failInterviewUpdate = new Error('db down');

    await expect(service.complete(CAMILA_USER_ID, ID_A)).rejects.toThrow('db down');

    expect(evaluations[0].status).toBe('DRAFT');
    expect(evaluations[0].completed_at).toBeNull();
    expect(evaluations[0].overall_score).toBe(1.5);
    expect(interviews[0].status).toBe('ASSIGNED');
  });

  it('entrevista deixou de estar ASSIGNED no meio (count 0): 409 e a avaliação é desfeita', async () => {
    const interviews = [interview()];
    const evaluations = [evaluation()];
    const { service, hooks } = makeService(interviews, evaluations);
    hooks.interviewCountZero = true;

    const error = await service.complete(CAMILA_USER_ID, ID_A).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(evaluations[0].status).toBe('DRAFT');
    expect(evaluations[0].completed_at).toBeNull();
    expect(evaluations[0].overall_score).toBe(1.5);
  });
});

describe('concorrência e segunda conclusão', () => {
  it('conclusões simultâneas: uma vence (200) e a outra recebe 409', async () => {
    const interviews = [interview()];
    const evaluations = [evaluation()];
    const { service } = makeService(interviews, evaluations);

    const results = await Promise.allSettled([
      service.complete(CAMILA_USER_ID, ID_A),
      service.complete(CAMILA_USER_ID, ID_A),
    ]);

    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(
      (failed[0] as PromiseRejectedResult).reason,
    ).toBeInstanceOf(ConflictException);
    expect(evaluations[0].status).toBe('COMPLETED');
    expect(interviews[0].status).toBe('COMPLETED');
  });

  it('rascunho alterado entre a leitura e a escrita (updated_at diferente) => 409 sem concluir', async () => {
    const interviews = [interview()];
    const evaluations = [evaluation()];
    const { service, prisma } = makeService(interviews, evaluations);
    prisma.interview_evaluation.findUnique.mockImplementationOnce(() => {
      const snapshot = { ...evaluations[0] };
      // outro PUT salva o rascunho logo depois da leitura
      evaluations[0].updated_at = new Date('2026-10-10T09:00:05.000Z');
      return Promise.resolve(snapshot);
    });

    await expect(
      service.complete(CAMILA_USER_ID, ID_A),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(evaluations[0].status).toBe('DRAFT');
    expect(interviews[0].status).toBe('ASSIGNED');
  });

  it('segunda conclusão sequencial => 404 (entrevista já COMPLETED não é mais visível) e nada muda', async () => {
    const interviews = [interview()];
    const evaluations = [evaluation()];
    const { service } = makeService(interviews, evaluations);

    await service.complete(CAMILA_USER_ID, ID_A);
    const completedAt = evaluations[0].completed_at;
    const second = await service.complete(CAMILA_USER_ID, ID_A).catch((e) => e);

    expect(second).toBeInstanceOf(NotFoundException);
    expect(second.message).toBe(NOT_FOUND);
    expect(evaluations[0].completed_at).toBe(completedAt);
  });

  it('segunda conclusão com a entrevista ainda ASSIGNED e avaliação COMPLETED => 409', async () => {
    const { service } = makeService(
      [interview()],
      [evaluation({ status: 'COMPLETED', completed_at: T0 })],
    );

    await expect(
      service.complete(CAMILA_USER_ID, ID_A),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('proteções de código', () => {
  const read = (file: string) => readFileSync(join(__dirname, file), 'utf8');

  it('nenhum código da conclusão toca interview_question_evaluation', () => {
    for (const file of [
      'evaluator-completion.service.ts',
      'evaluator-completion.controller.ts',
      'evaluation-criteria.ts',
    ]) {
      expect(read(file)).not.toMatch(/interview_question_evaluation|question_evaluations/);
    }
  });

  it('sem identidade mock nem dados do cliente na conclusão', () => {
    const controller = read('evaluator-completion.controller.ts');
    expect(controller).not.toMatch(
      /@Body|@Query|evaluatorId|evaluator_profile_id|DEFAULT_EVALUATOR|EVALUATOR_DIRECTORY|Carlos/,
    );
    expect(read('evaluator-completion.service.ts')).not.toMatch(
      /DEFAULT_EVALUATOR|EVALUATOR_DIRECTORY|Carlos|findEvaluatorIdByEmail/,
    );
  });

  it('as escritas acontecem dentro de $transaction (tx), nunca em this.prisma', () => {
    const source = read('evaluator-completion.service.ts');
    expect(source).toMatch(/this\.prisma\.\$transaction/);
    expect(source).not.toMatch(/this\.prisma\.interview(_evaluation)?\./);
  });
});
