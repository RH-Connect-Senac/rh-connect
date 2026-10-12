import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PrismaService } from '../prisma/prisma.service';
import { EvaluatorHistoryService } from './evaluator-history.service';

const CAMILA_USER_ID = 11;
const CAMILA_PROFILE_ID = 3;
const OTHER_USER_ID = 12;
const OTHER_PROFILE_ID = 4;
const NO_PROFILE_USER_ID = 99;
const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
const ID_C = '33333333-3333-4333-8333-333333333333';
const MISSING_ID = '99999999-9999-4999-8999-999999999999';
const submitted = new Date('2026-10-09T12:00:00.000Z');
const older = new Date('2026-10-10T12:00:00.000Z');
const newer = new Date('2026-10-11T12:00:00.000Z');
const NOT_FOUND = 'Avaliação não encontrada.';

type Row = Record<string, unknown>;

function questions(interviewId: string) {
  return [
    {
      question_id: `${interviewId}-q2`,
      position: 2,
      question_type: 'BEHAVIORAL',
      question_text: 'Conte uma situação difícil.',
      answer_text: 'Resolvi em equipe.\nCom diálogo.',
      answered_at: submitted,
    },
    {
      question_id: `${interviewId}-q1`,
      position: 1,
      question_type: 'TECHNICAL',
      question_text: 'Como você organiza agendas?',
      answer_text: 'Uso calendário compartilhado.',
      answered_at: submitted,
    },
  ];
}

function evaluation(overrides: Row = {}): Row {
  return {
    status: 'COMPLETED',
    criteria_scores: {
      clarity: 8,
      coherence: 9,
      objectivity: 7,
      domain_knowledge: 8,
      organization: 9,
      requirements_alignment: 8,
      examples: 7,
      // chave desconhecida gravada por engano: não pode vazar
      hacker: 10,
    },
    summary: 'Boa comunicação.',
    overall_score: { toString: () => '8.0' },
    completed_at: older,
    ...overrides,
  };
}

function interview(id: string, overrides: Row = {}): Row {
  return {
    interview_id: id,
    status: 'COMPLETED',
    evaluation_mode: 'HUMAN',
    evaluator_profile_id: CAMILA_PROFILE_ID,
    job_title: 'Secretária Comercial',
    job_company: 'Clínica Exemplo',
    job_summary: 'Resumo da vaga',
    job_activities: ['Agendar consultas'],
    job_requirements: ['Pacote Office'],
    job_location: 'Três Lagoas/MS',
    job_contract_type: 'Prestador de Serviços - PJ',
    job_work_mode: 'HYBRID',
    job_source_url: 'https://www.empregare.com/pt-br/vaga-x_1',
    assigned_at: submitted,
    submitted_at: submitted,
    created_at: submitted,
    updated_at: older,
    candidate: {
      name: 'Maria Candidata',
      email: 'maria@exemplo.com',
      password_hash: 'segredo',
      candidate_profile: {
        professional_title: 'Secretária',
        city: 'Brasília',
        state: 'DF',
      },
    },
    questions: questions(id),
    evaluation: evaluation(),
    ...overrides,
  };
}

// Prisma falso com banco em memória: aplica o `where` (inclusive o filtro
// aninhado `evaluation.is`) e a ordenação por `evaluation.completed_at`, então
// os testes exercitam a visibilidade de verdade e não só a forma da consulta.
function makeService(rows: Row[], profiles: Row[]) {
  const matches = (row: Row, where: Row): boolean =>
    Object.entries(where).every(([key, value]) => {
      if (key === 'evaluation') {
        const nested = (value as { is: Row }).is;
        const related = row.evaluation as Row | null;
        return related !== null && matches(related, nested);
      }
      return row[key] === value;
    });

  const completedAt = (row: Row) =>
    (
      (row.evaluation as Row | null)?.completed_at as Date | undefined
    )?.getTime() ?? 0;

  const prisma = {
    evaluator_profile: {
      findUnique: jest.fn(({ where }: { where: Row }) =>
        Promise.resolve(profiles.find((p) => matches(p, where)) ?? null),
      ),
    },
    interview: {
      findMany: jest.fn(({ where, take }: { where: Row; take: number }) =>
        Promise.resolve(
          rows
            .filter((row) => matches(row, where))
            .sort((a, b) => completedAt(b) - completedAt(a))
            .slice(0, take)
            .map((row) => ({
              ...row,
              _count: { questions: (row.questions as unknown[]).length },
            })),
        ),
      ),
      findFirst: jest.fn(({ where }: { where: Row }) =>
        Promise.resolve(rows.find((row) => matches(row, where)) ?? null),
      ),
    },
  };
  const service = new EvaluatorHistoryService(
    prisma as unknown as PrismaService,
  );
  return { service, prisma };
}

const PROFILES = [
  { user_id: CAMILA_USER_ID, evaluator_profile_id: CAMILA_PROFILE_ID },
  { user_id: OTHER_USER_ID, evaluator_profile_id: OTHER_PROFILE_ID },
];

describe('EvaluatorHistoryService.listCompleted', () => {
  it('resolve o perfil pelo user_id do JWT e lista a própria COMPLETED', async () => {
    const { service, prisma } = makeService([interview(ID_A)], PROFILES);

    const result = await service.listCompleted(CAMILA_USER_ID);

    expect(prisma.evaluator_profile.findUnique).toHaveBeenCalledWith({
      where: { user_id: CAMILA_USER_ID },
      select: { evaluator_profile_id: true },
    });
    expect(result).toEqual({
      total: 1,
      evaluations: [
        {
          interviewId: ID_A,
          candidate: {
            name: 'Maria Candidata',
            professionalTitle: 'Secretária',
            city: 'Brasília',
            state: 'DF',
          },
          jobTitle: 'Secretária Comercial',
          company: 'Clínica Exemplo',
          overallScore: 8,
          completedAt: older,
          questionCount: 2,
        },
      ],
    });
  });

  it('filtra por avaliador, HUMAN, COMPLETED e avaliação COMPLETED, com teto', async () => {
    const { service, prisma } = makeService([], PROFILES);

    await service.listCompleted(CAMILA_USER_ID);

    expect(prisma.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          evaluator_profile_id: CAMILA_PROFILE_ID,
          evaluation_mode: 'HUMAN',
          status: 'COMPLETED',
          evaluation: { is: { status: 'COMPLETED' } },
        },
        take: 500,
      }),
    );
  });

  it('não lista ASSIGNED, IA, de outro avaliador nem avaliação não COMPLETED', async () => {
    const rows = [
      interview(ID_A),
      interview('a-assigned', { status: 'ASSIGNED' }),
      interview('a-ai', { evaluation_mode: 'AI' }),
      interview('a-other', { evaluator_profile_id: OTHER_PROFILE_ID }),
      interview('a-draft', { evaluation: evaluation({ status: 'DRAFT' }) }),
      interview('a-noeval', { evaluation: null }),
    ];
    const { service } = makeService(rows, PROFILES);

    const result = await service.listCompleted(CAMILA_USER_ID);

    expect(result.evaluations.map((item) => item.interviewId)).toEqual([ID_A]);
  });

  it('ordena por completedAt decrescente', async () => {
    const rows = [
      interview(ID_A, { evaluation: evaluation({ completed_at: older }) }),
      interview(ID_B, { evaluation: evaluation({ completed_at: newer }) }),
      interview(ID_C, {
        evaluation: evaluation({
          completed_at: new Date('2026-10-01T00:00:00Z'),
        }),
      }),
    ];
    const { service } = makeService(rows, PROFILES);

    const result = await service.listCompleted(CAMILA_USER_ID);

    expect(result.evaluations.map((item) => item.interviewId)).toEqual([
      ID_B,
      ID_A,
      ID_C,
    ]);
  });

  it('pede ordenação por evaluation.completed_at desc ao banco', async () => {
    const { service, prisma } = makeService([], PROFILES);

    await service.listCompleted(CAMILA_USER_ID);

    expect(prisma.interview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [
          { evaluation: { completed_at: 'desc' } },
          { updated_at: 'desc' },
        ],
      }),
    );
  });

  it('sem histórico devolve lista vazia (não é erro)', async () => {
    const { service } = makeService([], PROFILES);

    await expect(service.listCompleted(CAMILA_USER_ID)).resolves.toEqual({
      total: 0,
      evaluations: [],
    });
  });

  it('outro avaliador não vê as entrevistas da Camila', async () => {
    const { service } = makeService([interview(ID_A)], PROFILES);

    const result = await service.listCompleted(OTHER_USER_ID);

    expect(result.evaluations).toEqual([]);
  });

  it('sem evaluator_profile => 403 e nenhuma consulta de entrevistas', async () => {
    const { service, prisma } = makeService([interview(ID_A)], PROFILES);

    await expect(
      service.listCompleted(NO_PROFILE_USER_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.interview.findMany).not.toHaveBeenCalled();
  });

  it('não devolve e-mail, hash nem ids internos do avaliador', async () => {
    const { service } = makeService([interview(ID_A)], PROFILES);

    const text = JSON.stringify(await service.listCompleted(CAMILA_USER_ID));

    expect(text).not.toContain('maria@exemplo.com');
    expect(text).not.toContain('segredo');
    expect(text).not.toContain('password_hash');
    expect(text).not.toContain('evaluator_profile_id');
    expect(text).not.toContain('email');
  });
});

describe('EvaluatorHistoryService.getCompletedById', () => {
  it('abre a própria COMPLETED em modo leitura, com avaliação concluída', async () => {
    const { service, prisma } = makeService([interview(ID_A)], PROFILES);

    const result = await service.getCompletedById(CAMILA_USER_ID, ID_A);

    expect(prisma.interview.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          interview_id: ID_A,
          evaluator_profile_id: CAMILA_PROFILE_ID,
          evaluation_mode: 'HUMAN',
          status: 'COMPLETED',
          evaluation: { is: { status: 'COMPLETED' } },
        },
      }),
    );
    expect(result.interviewId).toBe(ID_A);
    expect(result.status).toBe('COMPLETED');
    expect(result.candidate).toEqual({
      name: 'Maria Candidata',
      professionalTitle: 'Secretária',
      city: 'Brasília',
      state: 'DF',
    });
    expect(result.context.title).toBe('Secretária Comercial');
    expect(result.context.company).toBe('Clínica Exemplo');
    expect(result.context.activities).toEqual(['Agendar consultas']);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toEqual(
      expect.objectContaining({
        text: 'Conte uma situação difícil.',
        answer: 'Resolvi em equipe.\nCom diálogo.',
      }),
    );
    expect(result.evaluation).toEqual({
      status: 'COMPLETED',
      criteriaScores: {
        clarity: 8,
        coherence: 9,
        objectivity: 7,
        domain_knowledge: 8,
        organization: 9,
        requirements_alignment: 8,
        examples: 7,
      },
      summary: 'Boa comunicação.',
      overallScore: 8,
      completedAt: older,
    });
  });

  it('não inventa notas por pergunta, strengths, improvements nem recommendations', async () => {
    const { service } = makeService([interview(ID_A)], PROFILES);

    const result = await service.getCompletedById(CAMILA_USER_ID, ID_A);
    const text = JSON.stringify(result);

    expect(text).not.toContain('strengths');
    expect(text).not.toContain('improvements');
    expect(text).not.toContain('recommendations');
    expect(text).not.toContain('hacker');
    expect(Object.keys(result.evaluation).sort()).toEqual([
      'completedAt',
      'criteriaScores',
      'overallScore',
      'status',
      'summary',
    ]);
  });

  it('não devolve e-mail, hash nem ids internos do avaliador', async () => {
    const { service } = makeService([interview(ID_A)], PROFILES);

    const text = JSON.stringify(
      await service.getCompletedById(CAMILA_USER_ID, ID_A),
    );

    expect(text).not.toContain('maria@exemplo.com');
    expect(text).not.toContain('segredo');
    expect(text).not.toContain('password_hash');
    expect(text).not.toContain('evaluator_profile_id');
    expect(text).not.toContain('assigned_by');
  });

  it.each([
    ['ASSIGNED', { status: 'ASSIGNED' }],
    ['IA', { evaluation_mode: 'AI' }],
    ['de outro avaliador', { evaluator_profile_id: OTHER_PROFILE_ID }],
    [
      'COMPLETED com avaliação em DRAFT',
      { evaluation: evaluation({ status: 'DRAFT' }) },
    ],
    ['COMPLETED sem avaliação', { evaluation: null }],
  ])('%s => 404 uniforme', async (_label, overrides) => {
    const { service } = makeService([interview(ID_A, overrides)], PROFILES);

    const error = await service
      .getCompletedById(CAMILA_USER_ID, ID_A)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).message).toBe(NOT_FOUND);
  });

  it('inexistente => o mesmo 404', async () => {
    const { service } = makeService([interview(ID_A)], PROFILES);

    const error = await service
      .getCompletedById(CAMILA_USER_ID, MISSING_ID)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).message).toBe(NOT_FOUND);
  });

  it('outro avaliador abrindo a entrevista da Camila => 404 (não revela que existe)', async () => {
    const { service } = makeService([interview(ID_A)], PROFILES);

    await expect(service.getCompletedById(OTHER_USER_ID, ID_A)).rejects.toThrow(
      new NotFoundException(NOT_FOUND).message,
    );
  });

  it('sem evaluator_profile => 403', async () => {
    const { service, prisma } = makeService([interview(ID_A)], PROFILES);

    await expect(
      service.getCompletedById(NO_PROFILE_USER_ID, ID_A),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.interview.findFirst).not.toHaveBeenCalled();
  });
});

describe('módulo de histórico: somente leitura', () => {
  const read = (file: string) => readFileSync(join(__dirname, file), 'utf8');

  it('o service não escreve nada nem abre transação', () => {
    expect(read('evaluator-history.service.ts')).not.toMatch(
      /\.(create|update|updateMany|upsert|delete|deleteMany)\(|\$transaction/,
    );
  });

  it('o controller só expõe GET e não recebe corpo, query nem id de avaliador', () => {
    const controller = read('evaluator-history.controller.ts');
    expect(controller).not.toMatch(
      /@Body|@Query|@Post|@Put|@Patch|@Delete|evaluatorId|evaluator_profile_id/,
    );
  });

  it('nenhum dos dois lê e-mail nem credenciais do candidato', () => {
    for (const file of [
      'evaluator-history.service.ts',
      'evaluator-history.controller.ts',
    ]) {
      expect(read(file)).not.toMatch(
        /\.email\b|email:|password|DEFAULT_EVALUATOR/,
      );
    }
  });
});
