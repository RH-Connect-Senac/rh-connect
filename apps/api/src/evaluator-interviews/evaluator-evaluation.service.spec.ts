import { readFileSync } from 'fs';
import { join } from 'path';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import {
  EVALUATION_CRITERIA,
  computeDraftOverallScore,
} from './evaluation-criteria';
import { EvaluatorEvaluationService } from './evaluator-evaluation.service';
import { EvaluatorInterviewsService } from './evaluator-interviews.service';

const CAMILA_USER_ID = 11;
const CAMILA_PROFILE_ID = 3;
const OTHER_USER_ID = 12;
const OTHER_PROFILE_ID = 4;
const NO_PROFILE_USER_ID = 99;
const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
const MISSING = '99999999-9999-4999-8999-999999999999';
const NOT_FOUND = 'Entrevista não encontrada.';

type Row = Record<string, unknown>;

function interview(id: string, overrides: Row = {}): Row {
  return {
    interview_id: id,
    status: 'ASSIGNED',
    evaluation_mode: 'HUMAN',
    evaluator_profile_id: CAMILA_PROFILE_ID,
    ...overrides,
  };
}

const PROFILES = [
  { user_id: CAMILA_USER_ID, evaluator_profile_id: CAMILA_PROFILE_ID },
  { user_id: OTHER_USER_ID, evaluator_profile_id: OTHER_PROFILE_ID },
];

// Prisma falso em memória. `where` por igualdade, como o banco faria. Não tem
// `interview_question_evaluation` (acessá-lo quebraria) e conta escritas em
// `interview`.
function makeService(interviews: Row[], evaluations: Row[] = []) {
  const matches = (row: Row, where: Row) =>
    Object.entries(where).every(([key, value]) =>
      value instanceof Date
        ? (row[key] as Date)?.getTime() === value.getTime()
        : row[key] === value,
    );
  let seq = 0;
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
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    interview_evaluation: {
      findUnique: jest.fn(({ where }: { where: Row }) =>
        Promise.resolve(evaluations.find((r) => matches(r, where)) ?? null),
      ),
      create: jest.fn(({ data }: { data: Row }) => {
        const row = {
          evaluation_id: `eval-${++seq}`,
          summary: null,
          overall_score: null,
          updated_at: new Date('2026-10-10T10:00:00.000Z'),
          ...data,
        };
        evaluations.push(row);
        return Promise.resolve(row);
      }),
      updateMany: jest.fn(({ where, data }: { where: Row; data: Row }) => {
        const row = evaluations.find((r) => matches(r, where));
        if (!row) return Promise.resolve({ count: 0 });
        Object.assign(row, data);
        return Promise.resolve({ count: 1 });
      }),
    },
  };
  const interviewsService = new EvaluatorInterviewsService(
    prisma as unknown as PrismaService,
  );
  const service = new EvaluatorEvaluationService(
    prisma as unknown as PrismaService,
    interviewsService,
  );
  return { service, prisma, evaluations };
}

const baseDraft = (overrides: Row = {}): Row => ({
  evaluation_id: 'eval-0',
  interview_id: ID_A,
  status: 'DRAFT',
  criteria_scores: { clarity: 8 },
  summary: 'Parcial',
  overall_score: '8.0',
  updated_at: new Date('2026-10-10T09:00:00.000Z'),
  ...overrides,
});

describe('GET da avaliação (rascunho)', () => {
  it('sem avaliação existente devolve o estado vazio DRAFT, sem criar linha', async () => {
    const { service, prisma } = makeService([interview(ID_A)]);

    await expect(
      service.getEvaluation(CAMILA_USER_ID, ID_A),
    ).resolves.toEqual({
      interviewId: ID_A,
      status: 'DRAFT',
      criteriaScores: {},
      summary: null,
      overallScore: null,
      updatedAt: null,
    });
    expect(prisma.interview_evaluation.create).not.toHaveBeenCalled();
  });

  it('com DRAFT existente devolve exatamente o persistido', async () => {
    const { service } = makeService(
      [interview(ID_A)],
      [baseDraft({ criteria_scores: { clarity: 8, examples: 6.5 }, overall_score: '7.3' })],
    );

    const result = await service.getEvaluation(CAMILA_USER_ID, ID_A);

    expect(result.status).toBe('DRAFT');
    expect(result.criteriaScores).toEqual({ clarity: 8, examples: 6.5 });
    expect(result.summary).toBe('Parcial');
    expect(result.overallScore).toBe(7.3);
  });
});

describe('PUT da avaliação (rascunho)', () => {
  it('cria o DRAFT (status DRAFT, sem completed_at, avaliador não vem do corpo)', async () => {
    const { service, prisma } = makeService([interview(ID_A)]);

    const result = await service.saveDraft(CAMILA_USER_ID, ID_A, {
      criteriaScores: { clarity: 8, coherence: 7 },
      summary: 'Começo do parecer',
    });

    expect(prisma.interview_evaluation.create).toHaveBeenCalledTimes(1);
    const data = prisma.interview_evaluation.create.mock.calls[0][0].data;
    expect(data).toEqual({
      interview_id: ID_A,
      status: 'DRAFT',
      criteria_scores: { clarity: 8, coherence: 7 },
      summary: 'Começo do parecer',
      overall_score: 7.5,
    });
    expect('completed_at' in data).toBe(false);
    expect(result.status).toBe('DRAFT');
    expect(result.criteriaScores).toEqual({ clarity: 8, coherence: 7 });
  });

  it('atualiza o DRAFT existente', async () => {
    const { service, prisma } = makeService([interview(ID_A)], [baseDraft()]);

    const result = await service.saveDraft(CAMILA_USER_ID, ID_A, {
      criteriaScores: { clarity: 9 },
      summary: 'Novo texto',
    });

    expect(prisma.interview_evaluation.create).not.toHaveBeenCalled();
    expect(prisma.interview_evaluation.updateMany).toHaveBeenCalledTimes(1);
    expect(result.criteriaScores).toEqual({ clarity: 9 });
    expect(result.summary).toBe('Novo texto');
    expect(result.overallScore).toBe(9);
  });

  it('PUT parcial faz merge dos critérios (ausência = não alterar)', async () => {
    const { service } = makeService([interview(ID_A)]);

    await service.saveDraft(CAMILA_USER_ID, ID_A, {
      criteriaScores: { clarity: 8, coherence: 7 },
    });
    const result = await service.saveDraft(CAMILA_USER_ID, ID_A, {
      criteriaScores: { objectivity: 9 },
    });

    expect(result.criteriaScores).toEqual({
      clarity: 8,
      coherence: 7,
      objectivity: 9,
    });
    expect(result.overallScore).toBe(8);
  });

  it('PUT sem summary não apaga o comentário já salvo; summary null limpa', async () => {
    const { service } = makeService([interview(ID_A)], [baseDraft()]);

    const kept = await service.saveDraft(CAMILA_USER_ID, ID_A, {
      criteriaScores: { coherence: 7 },
    });
    expect(kept.summary).toBe('Parcial');

    const cleared = await service.saveDraft(CAMILA_USER_ID, ID_A, {
      summary: null,
    });
    expect(cleared.summary).toBeNull();
  });

  it.each([[0], [10], [7.55], [0.1]])('aceita a nota %s', async (score) => {
    const { service } = makeService([interview(ID_A)]);

    const result = await service.saveDraft(CAMILA_USER_ID, ID_A, {
      criteriaScores: { clarity: score },
    });

    expect(result.criteriaScores).toEqual({ clarity: score });
  });

  it.each([[-0.1], [-1], [10.1], [11], [NaN], [Infinity]])(
    'rejeita a nota %s (fora de 0–10 ou não finita)',
    async (score) => {
      const { service, prisma } = makeService([interview(ID_A)]);

      await expect(
        service.saveDraft(CAMILA_USER_ID, ID_A, {
          criteriaScores: { clarity: score },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.interview_evaluation.create).not.toHaveBeenCalled();
    },
  );

  it.each([['8'], [null], [true], [[8]], [{}]])(
    'rejeita nota que não é número (%s)',
    async (score) => {
      const { service } = makeService([interview(ID_A)]);

      await expect(
        service.saveDraft(CAMILA_USER_ID, ID_A, {
          criteriaScores: { clarity: score },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejeita critério desconhecido', async () => {
    const { service, prisma } = makeService([interview(ID_A)]);

    await expect(
      service.saveDraft(CAMILA_USER_ID, ID_A, {
        criteriaScores: { clarity: 8, criatividade: 9 },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.interview_evaluation.create).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: 'COMPLETED', criteriaScores: { clarity: 1 } }],
    [{ overallScore: 10, criteriaScores: { clarity: 1 } }],
    [{ evaluatorProfileId: 4, summary: 'x' }],
    [{}],
    [null],
    [[]],
  ])('rejeita corpo com campo não permitido ou vazio (%j)', async (body) => {
    const { service } = makeService([interview(ID_A)]);

    await expect(
      service.saveDraft(CAMILA_USER_ID, ID_A, body),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('summary é opcional no rascunho (só critérios)', async () => {
    const { service } = makeService([interview(ID_A)]);

    const result = await service.saveDraft(CAMILA_USER_ID, ID_A, {
      criteriaScores: { clarity: 5 },
    });

    expect(result.summary).toBeNull();
  });

  it('summary preserva quebras de linha, normaliza CRLF e respeita o limite', async () => {
    const { service } = makeService([interview(ID_A)]);

    const ok = await service.saveDraft(CAMILA_USER_ID, ID_A, {
      summary: 'Linha 1\r\n\r\nLinha 2',
    });
    expect(ok.summary).toBe('Linha 1\n\nLinha 2');

    await expect(
      service.saveDraft(CAMILA_USER_ID, ID_A, { summary: 'a'.repeat(2001) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.saveDraft(CAMILA_USER_ID, ID_A, { summary: 42 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('overall_score do rascunho', () => {
  it('é null sem nenhum critério preenchido', async () => {
    const { service } = makeService([interview(ID_A)]);

    const result = await service.saveDraft(CAMILA_USER_ID, ID_A, {
      criteriaScores: {},
      summary: 'Só comentário',
    });

    expect(result.overallScore).toBeNull();
    expect(computeDraftOverallScore({})).toBeNull();
  });

  it('é a média simples só dos critérios preenchidos', async () => {
    const { service } = makeService([interview(ID_A)]);

    const result = await service.saveDraft(CAMILA_USER_ID, ID_A, {
      criteriaScores: { clarity: 10, coherence: 6, examples: 8 },
    });

    expect(result.overallScore).toBe(8);
  });

  it('arredonda para 1 casa decimal', () => {
    expect(computeDraftOverallScore({ clarity: 10, coherence: 9, examples: 9 })).toBe(9.3);
    expect(computeDraftOverallScore({ clarity: 7, coherence: 8, examples: 8 })).toBe(7.7);
    expect(computeDraftOverallScore({ clarity: 7.25 })).toBe(7.3);
  });
});

describe('avaliação COMPLETED, status da entrevista e perguntas', () => {
  it('avaliação COMPLETED não é sobrescrita nem volta para DRAFT (409)', async () => {
    const { service, prisma, evaluations } = makeService(
      [interview(ID_A)],
      [baseDraft({ status: 'COMPLETED' })],
    );

    await expect(
      service.saveDraft(CAMILA_USER_ID, ID_A, {
        criteriaScores: { clarity: 1 },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.interview_evaluation.updateMany).not.toHaveBeenCalled();
    expect(evaluations[0].status).toBe('COMPLETED');
    expect(evaluations[0].criteria_scores).toEqual({ clarity: 8 });
  });

  it('a escrita é condicionada ao estado lido: se virou COMPLETED no meio, 409 e nada muda', async () => {
    const { service, prisma, evaluations } = makeService(
      [interview(ID_A)],
      [baseDraft()],
    );
    prisma.interview_evaluation.findUnique.mockImplementationOnce(() =>
      Promise.resolve(evaluations[0]),
    );
    // Entre a leitura e a escrita outra requisição concluiu a avaliação.
    prisma.interview_evaluation.updateMany.mockImplementationOnce(() => {
      evaluations[0].status = 'COMPLETED';
      return Promise.resolve({ count: 0 });
    });

    await expect(
      service.saveDraft(CAMILA_USER_ID, ID_A, {
        criteriaScores: { clarity: 1 },
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const where = prisma.interview_evaluation.updateMany.mock.calls[0][0].where;
    expect(where.status).toBe('DRAFT');
    expect(where.updated_at).toBeInstanceOf(Date);
    expect(evaluations[0].criteria_scores).toEqual({ clarity: 8 });
  });

  it('conflito de criação concorrente (P2002) vira 409', async () => {
    const { service, prisma } = makeService([interview(ID_A)]);
    prisma.interview_evaluation.create.mockImplementationOnce(() =>
      Promise.reject(Object.assign(new Error('unique'), { code: 'P2002' })),
    );

    await expect(
      service.saveDraft(CAMILA_USER_ID, ID_A, { summary: 'x' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('PUT não altera interview.status (nenhuma escrita em interview) e não cria interview_question_evaluation', async () => {
    const rows = [interview(ID_A)];
    const { service, prisma } = makeService(rows);

    await service.saveDraft(CAMILA_USER_ID, ID_A, {
      criteriaScores: { clarity: 8 },
    });

    expect(prisma.interview.update).not.toHaveBeenCalled();
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
    expect(rows[0].status).toBe('ASSIGNED');
    expect(rows[0].evaluator_profile_id).toBe(CAMILA_PROFILE_ID);
    expect('interview_question_evaluation' in prisma).toBe(false);
  });
});

describe('isolamento e acesso (GET e PUT)', () => {
  const calls: Array<[string, (s: EvaluatorEvaluationService, u: number, id: string) => Promise<unknown>]> = [
    ['GET', (s, u, id) => s.getEvaluation(u, id)],
    ['PUT', (s, u, id) => s.saveDraft(u, id, { criteriaScores: { clarity: 5 } })],
  ];

  it.each(calls)('%s: avaliador B recebe 404 na entrevista do A, idêntico ao de UUID inexistente', async (_m, call) => {
    const { service, prisma } = makeService([interview(ID_A)], [baseDraft()]);

    const alheia = await call(service, OTHER_USER_ID, ID_A).catch((e) => e);
    const inexistente = await call(service, OTHER_USER_ID, MISSING).catch((e) => e);

    expect(alheia).toBeInstanceOf(NotFoundException);
    expect((alheia as NotFoundException).message).toBe(NOT_FOUND);
    expect((alheia as NotFoundException).getResponse()).toEqual(
      (inexistente as NotFoundException).getResponse(),
    );
    expect(prisma.interview_evaluation.findUnique).not.toHaveBeenCalled();
    expect(prisma.interview_evaluation.create).not.toHaveBeenCalled();
    expect(prisma.interview_evaluation.updateMany).not.toHaveBeenCalled();
  });

  it.each(calls)('%s: UUID inexistente => 404 com a mesma mensagem', async (_m, call) => {
    const { service } = makeService([interview(ID_A)]);

    await expect(call(service, CAMILA_USER_ID, MISSING)).rejects.toThrow(
      new NotFoundException(NOT_FOUND),
    );
  });

  const NOT_VISIBLE: Array<[string, Row]> = [
    ['de IA', { evaluation_mode: 'AI', status: 'PENDING_AI_EVALUATION', evaluator_profile_id: null }],
    ['PENDING_ASSIGNMENT', { status: 'PENDING_ASSIGNMENT', evaluator_profile_id: null }],
    ['COMPLETED', { status: 'COMPLETED' }],
    ['IN_PROGRESS', { status: 'IN_PROGRESS', evaluation_mode: null, evaluator_profile_id: null }],
  ];

  it.each(NOT_VISIBLE.flatMap(([label, overrides]) => calls.map(([m, call]) => [label, m, overrides, call] as const)))(
    'entrevista %s não é acessível (%s => 404)',
    async (_label, _m, overrides, call) => {
      const { service, prisma } = makeService(
        [interview(ID_A, overrides)],
        [baseDraft()],
      );

      await expect(call(service, CAMILA_USER_ID, ID_A)).rejects.toThrow(
        new NotFoundException(NOT_FOUND),
      );
      expect(prisma.interview_evaluation.create).not.toHaveBeenCalled();
      expect(prisma.interview_evaluation.updateMany).not.toHaveBeenCalled();
    },
  );

  it.each(calls)('%s: EVALUATOR sem evaluator_profile falha fechado (403) sem tocar na avaliação', async (_m, call) => {
    const { service, prisma } = makeService([interview(ID_A)], [baseDraft()]);

    await expect(call(service, NO_PROFILE_USER_ID, ID_A)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.interview.findFirst).not.toHaveBeenCalled();
    expect(prisma.interview_evaluation.findUnique).not.toHaveBeenCalled();
  });

  it('a posse usa o filtro da 5A (perfil do JWT, HUMAN, ASSIGNED)', async () => {
    const { service, prisma } = makeService([interview(ID_A)]);

    await service.getEvaluation(CAMILA_USER_ID, ID_A);

    expect(prisma.interview.findFirst.mock.calls[0][0].where).toEqual({
      interview_id: ID_A,
      evaluator_profile_id: CAMILA_PROFILE_ID,
      evaluation_mode: 'HUMAN',
      status: 'ASSIGNED',
    });
  });
});

describe('critérios canônicos e proteções de código', () => {
  const read = (file: string) =>
    readFileSync(join(__dirname, file), 'utf8');

  it('são 7, com chaves estáveis únicas e rótulos em português separados', () => {
    expect(EVALUATION_CRITERIA).toHaveLength(7);
    expect(EVALUATION_CRITERIA.map((c) => c.key)).toEqual([
      'clarity',
      'coherence',
      'objectivity',
      'domain_knowledge',
      'organization',
      'requirements_alignment',
      'examples',
    ]);
    expect(EVALUATION_CRITERIA.map((c) => c.label)).toEqual([
      'Clareza',
      'Coerência',
      'Objetividade',
      'Domínio',
      'Organização',
      'Aderência aos requisitos',
      'Capacidade de exemplificar',
    ]);
  });

  it('o serviço não conclui, não escreve em interview nem em interview_question_evaluation', () => {
    const source = read('evaluator-evaluation.service.ts');
    expect(source).not.toMatch(
      /interview_question_evaluation|COMPLETED'\s*,|status:\s*'COMPLETED'|completed_at|this\.prisma\.interview\./,
    );
  });

  it('o controller não aceita identidade do avaliador e não usa mocks', () => {
    const source = read('evaluator-evaluation.controller.ts');
    expect(source).not.toMatch(
      /evaluatorId|evaluator_profile_id|DEFAULT_EVALUATOR|EVALUATOR_DIRECTORY|Carlos/,
    );
  });
});
