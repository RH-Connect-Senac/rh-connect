import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { PrismaService } from '../prisma/prisma.service';
import { EvaluatorInterviewsService } from './evaluator-interviews.service';

const CAMILA_USER_ID = 11;
const CAMILA_PROFILE_ID = 3;
const OTHER_USER_ID = 12;
const OTHER_PROFILE_ID = 4;
const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
const ID_C = '33333333-3333-4333-8333-333333333333';
const at = new Date('2026-10-09T12:00:00.000Z');
const later = new Date('2026-10-10T12:00:00.000Z');
const NOT_FOUND = 'Entrevista não encontrada.';

type Row = Record<string, unknown>;
// Argumentos que o serviço passa ao Prisma em findMany/findFirst (o mock os registra).
type QueryArgs = {
  where: Row;
  orderBy?: unknown;
  take?: number;
  select: Record<string, Record<string, unknown>>;
};

function questions(interviewId: string) {
  return [
    {
      question_id: `${interviewId}-q2`,
      position: 2,
      question_type: 'BEHAVIORAL',
      question_text: 'Conte uma situação difícil.',
      answer_text: 'Resolvi em equipe.\nCom diálogo.',
      answered_at: at,
    },
    {
      question_id: `${interviewId}-q1`,
      position: 1,
      question_type: 'TECHNICAL',
      question_text: 'Como você organiza agendas?',
      answer_text: 'Uso calendário compartilhado.',
      answered_at: at,
    },
  ];
}

function interview(id: string, overrides: Row = {}): Row {
  return {
    interview_id: id,
    status: 'ASSIGNED',
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
    assigned_at: at,
    submitted_at: at,
    created_at: at,
    updated_at: at,
    candidate: {
      name: 'Maria Candidata',
      candidate_profile: {
        professional_title: 'Secretária',
        city: 'Brasília',
        state: 'DF',
      },
    },
    questions: questions(id),
    ...overrides,
  };
}

// Prisma falso com um banco em memória: aplica o `where` por igualdade (como o
// banco faria), então os testes exercitam a visibilidade de verdade e não só a
// forma da consulta.
function makeService(rows: Row[], profiles: Row[]) {
  const matches = (row: Row, where: Row) =>
    Object.entries(where).every(([key, value]) => row[key] === value);

  const prisma = {
    evaluator_profile: {
      findUnique: jest.fn(({ where }: { where: Row }) =>
        Promise.resolve(profiles.find((p) => matches(p, where)) ?? null),
      ),
    },
    interview: {
      findMany: jest.fn(({ where }: QueryArgs) =>
        Promise.resolve(
          rows
            .filter((row) => matches(row, where))
            .map((row) => ({
              ...row,
              _count: { questions: (row.questions as unknown[]).length },
            })),
        ),
      ),
      findFirst: jest.fn(({ where }: QueryArgs) =>
        Promise.resolve(rows.find((row) => matches(row, where)) ?? null),
      ),
    },
  };
  const service = new EvaluatorInterviewsService(
    prisma as unknown as PrismaService,
  );
  return { service, prisma };
}

const PROFILES = [
  { user_id: CAMILA_USER_ID, evaluator_profile_id: CAMILA_PROFILE_ID },
  { user_id: OTHER_USER_ID, evaluator_profile_id: OTHER_PROFILE_ID },
];

describe('EvaluatorInterviewsService.listAssigned', () => {
  it('resolve o perfil pelo user_id do JWT e devolve a entrevista HUMAN/ASSIGNED dele', async () => {
    const { service, prisma } = makeService([interview(ID_A)], PROFILES);

    const result = await service.listAssigned(CAMILA_USER_ID);

    expect(prisma.evaluator_profile.findUnique).toHaveBeenCalledWith({
      where: { user_id: CAMILA_USER_ID },
      select: { evaluator_profile_id: true },
    });
    expect(result.total).toBe(1);
    expect(result.interviews[0]).toEqual({
      interviewId: ID_A,
      status: 'ASSIGNED',
      candidate: {
        name: 'Maria Candidata',
        professionalTitle: 'Secretária',
        city: 'Brasília',
        state: 'DF',
      },
      jobTitle: 'Secretária Comercial',
      company: 'Clínica Exemplo',
      location: 'Três Lagoas/MS',
      workMode: 'HYBRID',
      assignedAt: at,
      submittedAt: at,
      questionCount: 2,
      evaluation: null,
    });
  });

  it('o filtro do banco exige perfil do avaliador, HUMAN e ASSIGNED, em ordem determinística', async () => {
    const { service, prisma } = makeService([], PROFILES);

    await service.listAssigned(CAMILA_USER_ID);

    const args = prisma.interview.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      evaluator_profile_id: CAMILA_PROFILE_ID,
      evaluation_mode: 'HUMAN',
      status: 'ASSIGNED',
    });
    expect(args.orderBy).toEqual([
      { assigned_at: 'asc' },
      { submitted_at: 'asc' },
      { created_at: 'asc' },
    ]);
    expect(args.take).toBe(500);
  });

  it('não mostra entrevista de outro avaliador', async () => {
    const { service } = makeService(
      [interview(ID_A, { evaluator_profile_id: OTHER_PROFILE_ID })],
      PROFILES,
    );

    const result = await service.listAssigned(CAMILA_USER_ID);

    expect(result).toEqual({ total: 0, interviews: [] });
  });

  it.each([
    ['IN_PROGRESS', { status: 'IN_PROGRESS', evaluation_mode: null }],
    ['PENDING_ASSIGNMENT', { status: 'PENDING_ASSIGNMENT' }],
    ['COMPLETED', { status: 'COMPLETED' }],
    ['de IA', { evaluation_mode: 'AI', status: 'PENDING_AI_EVALUATION' }],
  ])('não mostra entrevista %s na fila ativa', async (_label, overrides) => {
    const { service } = makeService([interview(ID_A, overrides)], PROFILES);

    const result = await service.listAssigned(CAMILA_USER_ID);

    expect(result.total).toBe(0);
  });

  it('mostra só as próprias, entre entrevistas de vários estados e avaliadores', async () => {
    const { service } = makeService(
      [
        interview(ID_A),
        interview(ID_B, { evaluator_profile_id: OTHER_PROFILE_ID }),
        interview(ID_C, { status: 'COMPLETED' }),
      ],
      PROFILES,
    );

    const result = await service.listAssigned(CAMILA_USER_ID);

    expect(result.interviews.map((item) => item.interviewId)).toEqual([ID_A]);
  });

  it('não expõe e-mail, ids internos nem dados de quem atribuiu', async () => {
    const { service } = makeService([interview(ID_A)], PROFILES);

    const result = await service.listAssigned(CAMILA_USER_ID);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(
      /email|password|evaluator_profile_id|candidate_user_id|assigned_by/i,
    );
  });

  describe('bloco evaluation (progresso persistido, 6A.2)', () => {
    const FULL_SCORES = {
      clarity: 8,
      coherence: 7,
      objectivity: 9,
      domain_knowledge: 6,
      organization: 7,
      requirements_alignment: 8,
      examples: 5,
    };

    function draft(overrides: Row = {}): Row {
      return {
        status: 'DRAFT',
        criteria_scores: {},
        summary: null,
        created_at: at,
        updated_at: later,
        ...overrides,
      };
    }

    async function evaluationOf(evaluation: Row | null | undefined) {
      const { service } = makeService(
        [interview(ID_A, { evaluation })],
        PROFILES,
      );
      const result = await service.listAssigned(CAMILA_USER_ID);
      return result.interviews[0].evaluation;
    }

    it('sem avaliação persistida => evaluation null', async () => {
      expect(await evaluationOf(null)).toBeNull();
      expect(await evaluationOf(undefined)).toBeNull();
    });

    it('rascunho vazio existe mas NÃO é andamento', async () => {
      expect(await evaluationOf(draft())).toEqual({
        status: 'DRAFT',
        startedAt: at,
        updatedAt: later,
        filledCriteria: 0,
        totalCriteria: 7,
        hasSummary: false,
        inProgress: false,
      });
    });

    it('um critério preenchido => em andamento', async () => {
      const evaluation = await evaluationOf(
        draft({ criteria_scores: { clarity: 8 } }),
      );
      expect(evaluation).toEqual({
        status: 'DRAFT',
        startedAt: at,
        updatedAt: later,
        filledCriteria: 1,
        totalCriteria: 7,
        hasSummary: false,
        inProgress: true,
      });
    });

    it('nota 0 é nota válida e conta como critério preenchido', async () => {
      const evaluation = await evaluationOf(
        draft({ criteria_scores: { clarity: 0 } }),
      );
      expect(evaluation?.filledCriteria).toBe(1);
      expect(evaluation?.inProgress).toBe(true);
    });

    it('vários critérios => conta todos', async () => {
      const evaluation = await evaluationOf(
        draft({ criteria_scores: { clarity: 8, coherence: 7, examples: 5 } }),
      );
      expect(evaluation?.filledCriteria).toBe(3);
      expect(evaluation?.inProgress).toBe(true);
    });

    it('os 7 critérios => 7 / 7', async () => {
      const evaluation = await evaluationOf(
        draft({ criteria_scores: FULL_SCORES }),
      );
      expect(evaluation?.filledCriteria).toBe(7);
      expect(evaluation?.totalCriteria).toBe(7);
    });

    it('só comentário com conteúdo => em andamento, 0 critérios', async () => {
      const evaluation = await evaluationOf(
        draft({ summary: 'Boa comunicação.' }),
      );
      expect(evaluation?.filledCriteria).toBe(0);
      expect(evaluation?.hasSummary).toBe(true);
      expect(evaluation?.inProgress).toBe(true);
    });

    it.each([[''], ['   '], ['\r\n  \n'], [null]])(
      'comentário vazio/só espaços (%j) não é andamento',
      async (summary) => {
        const evaluation = await evaluationOf(draft({ summary }));
        expect(evaluation?.hasSummary).toBe(false);
        expect(evaluation?.inProgress).toBe(false);
      },
    );

    it('chaves inesperadas e valores inválidos em criteria_scores não contam', async () => {
      const evaluation = await evaluationOf(
        draft({
          criteria_scores: {
            unknown: 9,
            legacy_key: 3,
            clarity: '8',
            coherence: null,
            objectivity: Number.NaN,
          },
        }),
      );
      expect(evaluation?.filledCriteria).toBe(0);
      expect(evaluation?.inProgress).toBe(false);
    });

    it('criteria_scores corrompido (não objeto) não quebra a fila', async () => {
      expect(
        (await evaluationOf(draft({ criteria_scores: 'lixo' })))?.inProgress,
      ).toBe(false);
      expect(
        (await evaluationOf(draft({ criteria_scores: [1, 2, 3] })))
          ?.inProgress,
      ).toBe(false);
    });

    it('avaliação COMPLETED em entrevista ainda ASSIGNED (anomalia) => null, nunca em andamento', async () => {
      const evaluation = await evaluationOf(
        draft({ status: 'COMPLETED', criteria_scores: FULL_SCORES }),
      );
      expect(evaluation).toBeNull();
    });

    it('pede ao banco só o necessário para derivar o progresso', async () => {
      const { service, prisma } = makeService([], PROFILES);

      await service.listAssigned(CAMILA_USER_ID);

      const args = prisma.interview.findMany.mock.calls[0][0];
      expect(args.select.evaluation).toEqual({
        select: {
          status: true,
          criteria_scores: true,
          summary: true,
          created_at: true,
          updated_at: true,
        },
      });
    });

    it('não vaza notas cruas nem o texto do comentário', async () => {
      const { service } = makeService(
        [
          interview(ID_A, {
            evaluation: draft({
              criteria_scores: { clarity: 8, coherence: 7 },
              summary: 'Comentário sigiloso do avaliador.',
            }),
          }),
        ],
        PROFILES,
      );

      const result = await service.listAssigned(CAMILA_USER_ID);
      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain('criteria_scores');
      expect(serialized).not.toContain('criteriaScores');
      expect(serialized).not.toContain('Comentário sigiloso');
      expect(serialized).not.toContain('"summary"');
      expect(result.interviews[0].evaluation).toEqual({
        status: 'DRAFT',
        startedAt: at,
        updatedAt: later,
        filledCriteria: 2,
        totalCriteria: 7,
        hasSummary: true,
        inProgress: true,
      });
    });

    it('a avaliação de uma entrevista não contamina a outra', async () => {
      const { service } = makeService(
        [
          interview(ID_A, {
            evaluation: draft({ criteria_scores: { clarity: 8 } }),
          }),
          interview(ID_B, { evaluation: null }),
        ],
        PROFILES,
      );

      const result = await service.listAssigned(CAMILA_USER_ID);

      expect(result.interviews.map((i) => i.evaluation?.inProgress)).toEqual([
        true,
        undefined,
      ]);
    });
  });

  it('usuário EVALUATOR sem evaluator_profile falha fechado (403), sem fallback e sem consultar entrevistas', async () => {
    const { service, prisma } = makeService([interview(ID_A)], PROFILES);

    await expect(service.listAssigned(999)).rejects.toThrow(
      new ForbiddenException('Perfil de avaliador não encontrado.'),
    );
    expect(prisma.interview.findMany).not.toHaveBeenCalled();
  });
});

describe('EvaluatorInterviewsService.getAssignedById', () => {
  it('devolve o detalhe da própria entrevista com contexto, candidato, perguntas e respostas', async () => {
    const { service } = makeService([interview(ID_A)], PROFILES);

    const detail = await service.getAssignedById(CAMILA_USER_ID, ID_A);

    expect(detail.interviewId).toBe(ID_A);
    expect(detail.status).toBe('ASSIGNED');
    expect(detail.evaluationMode).toBe('HUMAN');
    expect(detail.assignedAt).toBe(at);
    expect(detail.submittedAt).toBe(at);
    expect(detail.candidate).toEqual({
      name: 'Maria Candidata',
      professionalTitle: 'Secretária',
      city: 'Brasília',
      state: 'DF',
    });
    expect(detail.context).toEqual({
      sourceUrl: 'https://www.empregare.com/pt-br/vaga-x_1',
      title: 'Secretária Comercial',
      company: 'Clínica Exemplo',
      summary: 'Resumo da vaga',
      activities: ['Agendar consultas'],
      requirements: ['Pacote Office'],
      location: 'Três Lagoas/MS',
      contractType: 'Prestador de Serviços - PJ',
      workMode: 'HYBRID',
    });
  });

  it('o detalhe traz as perguntas e as respostas persistidas (com quebras de linha)', async () => {
    const { service } = makeService([interview(ID_A)], PROFILES);

    const detail = await service.getAssignedById(CAMILA_USER_ID, ID_A);

    expect(detail.questions).toHaveLength(2);
    const second = detail.questions.find((q) => q.position === 2);
    expect(second).toEqual({
      id: `${ID_A}-q2`,
      position: 2,
      type: 'BEHAVIORAL',
      text: 'Conte uma situação difícil.',
      answer: 'Resolvi em equipe.\nCom diálogo.',
      answeredAt: at,
    });
  });

  it('pede ao banco as perguntas em ordem de posição e filtra por perfil, HUMAN e ASSIGNED', async () => {
    const { service, prisma } = makeService([interview(ID_A)], PROFILES);

    await service.getAssignedById(CAMILA_USER_ID, ID_A);

    const args = prisma.interview.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({
      interview_id: ID_A,
      evaluator_profile_id: CAMILA_PROFILE_ID,
      evaluation_mode: 'HUMAN',
      status: 'ASSIGNED',
    });
    expect(args.select.questions.orderBy).toEqual({ position: 'asc' });
  });

  it('entrevista de outro avaliador responde 404 idêntico ao de id inexistente', async () => {
    const { service } = makeService(
      [interview(ID_A, { evaluator_profile_id: OTHER_PROFILE_ID })],
      PROFILES,
    );

    const alheia = await service
      .getAssignedById(CAMILA_USER_ID, ID_A)
      .catch((error: unknown) => error);
    const inexistente = await service
      .getAssignedById(CAMILA_USER_ID, ID_B)
      .catch((error: unknown) => error);

    expect(alheia).toBeInstanceOf(NotFoundException);
    expect(inexistente).toBeInstanceOf(NotFoundException);
    expect((alheia as NotFoundException).message).toBe(NOT_FOUND);
    expect((alheia as NotFoundException).getResponse()).toEqual(
      (inexistente as NotFoundException).getResponse(),
    );
  });

  it.each([
    ['IN_PROGRESS', { status: 'IN_PROGRESS', evaluation_mode: null }],
    ['PENDING_ASSIGNMENT', { status: 'PENDING_ASSIGNMENT' }],
    ['COMPLETED', { status: 'COMPLETED' }],
    ['de IA', { evaluation_mode: 'AI', status: 'PENDING_AI_EVALUATION' }],
  ])('entrevista própria %s também responde 404', async (_label, overrides) => {
    const { service } = makeService([interview(ID_A, overrides)], PROFILES);

    await expect(
      service.getAssignedById(CAMILA_USER_ID, ID_A),
    ).rejects.toThrow(new NotFoundException(NOT_FOUND));
  });

  it('o outro avaliador só enxerga a sua e a da Camila continua 404 para ele', async () => {
    const rows = [
      interview(ID_A),
      interview(ID_B, { evaluator_profile_id: OTHER_PROFILE_ID }),
    ];
    const { service } = makeService(rows, PROFILES);

    await expect(
      service.getAssignedById(OTHER_USER_ID, ID_B),
    ).resolves.toMatchObject({ interviewId: ID_B });
    await expect(
      service.getAssignedById(OTHER_USER_ID, ID_A),
    ).rejects.toThrow(new NotFoundException(NOT_FOUND));
  });

  it('usuário EVALUATOR sem evaluator_profile falha fechado (403) antes de consultar a entrevista', async () => {
    const { service, prisma } = makeService([interview(ID_A)], PROFILES);

    await expect(service.getAssignedById(999, ID_A)).rejects.toThrow(
      new ForbiddenException('Perfil de avaliador não encontrado.'),
    );
    expect(prisma.interview.findFirst).not.toHaveBeenCalled();
  });

  it('não expõe e-mail, ids internos nem dados de quem atribuiu', async () => {
    const { service } = makeService([interview(ID_A)], PROFILES);

    const detail = await service.getAssignedById(CAMILA_USER_ID, ID_A);

    expect(JSON.stringify(detail)).not.toMatch(
      /email|password|evaluator_profile_id|candidate_user_id|assigned_by/i,
    );
  });
});

describe('módulo do avaliador: sem identidade mock', () => {
  const read = (file: string) =>
    readFileSync(join(__dirname, file), 'utf8');

  it.each([
    'evaluator-interviews.service.ts',
    'evaluator-interviews.controller.ts',
    'evaluator-interviews.module.ts',
  ])('%s não usa Carlos, DEFAULT_EVALUATOR, EVALUATOR_DIRECTORY nem e-mail como ponte', (file) => {
    const source = read(file);
    expect(source).not.toMatch(
      /DEFAULT_EVALUATOR|EVALUATOR_DIRECTORY|Carlos|carlos\.andrade|evaluator-carlos|findEvaluatorIdByEmail/,
    );
    expect(source).not.toMatch(/\.email\b|email:/);
  });

  it('nenhuma rota recebe evaluatorId/evaluator_profile_id do cliente', () => {
    const controller = read('evaluator-interviews.controller.ts');
    expect(controller).not.toMatch(/@Body|@Query|evaluatorId|evaluator_profile_id/);
  });

  it('só lê entrevistas (nenhuma escrita nem criação de avaliação nesta etapa)', () => {
    const service = read('evaluator-interviews.service.ts');
    expect(service).not.toMatch(
      /\.(create|update|updateMany|upsert|delete|deleteMany)\(|\$transaction|interview_evaluation/,
    );
  });
});
