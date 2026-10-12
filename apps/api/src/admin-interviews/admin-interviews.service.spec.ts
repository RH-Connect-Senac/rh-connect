import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { AdminInterviewsService } from './admin-interviews.service';

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';
const at = new Date('2026-10-09T12:00:00.000Z');
const later = new Date('2026-10-10T12:00:00.000Z');

function candidate() {
  return {
    user_id: 5,
    name: 'Maria Candidata',
    email: 'maria@gmail.com',
    candidate_profile: {
      professional_title: 'Desenvolvedora',
      city: 'Brasília',
      state: 'DF',
    },
  };
}

function interviewRow(overrides: Record<string, unknown> = {}) {
  return {
    interview_id: INTERVIEW_ID,
    status: 'PENDING_ASSIGNMENT',
    evaluation_mode: 'HUMAN',
    job_title: 'Desenvolvedor Front-end',
    job_company: 'ACME',
    job_summary: null,
    job_activities: ['Criar telas'],
    job_requirements: ['React'],
    job_location: null,
    job_contract_type: null,
    job_work_mode: null,
    job_source_url: 'https://empregare.example/vaga/1',
    submitted_at: at,
    created_at: at,
    updated_at: at,
    ...overrides,
  };
}

function makeService() {
  const prisma = {
    interview: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    evaluator_profile: { findMany: jest.fn(), findUnique: jest.fn() },
  };
  const service = new AdminInterviewsService(
    prisma as unknown as PrismaService,
  );
  return { service, prisma };
}

const activeEvaluator = {
  evaluator_profile_id: 3,
  app_user: { user_role: 'EVALUATOR', account_status: 'ACTIVE' },
};

describe('AdminInterviewsService.listPendingAssignment', () => {
  it('filtra HUMAN + PENDING_ASSIGNMENT no banco e ordena pelas mais antigas', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      { ...interviewRow(), candidate: candidate(), _count: { questions: 5 } },
    ]);
    prisma.interview.count.mockResolvedValue(1);

    const result = await service.listPendingAssignment();

    const args = prisma.interview.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      evaluation_mode: 'HUMAN',
      status: 'PENDING_ASSIGNMENT',
    });
    expect(args.orderBy).toEqual([
      { submitted_at: 'asc' },
      { created_at: 'asc' },
    ]);
    expect(prisma.interview.count.mock.calls[0][0].where).toEqual(args.where);
    expect(result.total).toBe(1);
  });

  it('devolve candidato REAL (app_user + candidate_profile), contexto e contagem de perguntas', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      { ...interviewRow(), candidate: candidate(), _count: { questions: 5 } },
    ]);
    prisma.interview.count.mockResolvedValue(1);

    const [item] = (await service.listPendingAssignment()).interviews;

    expect(item.id).toBe(INTERVIEW_ID);
    expect(item.status).toBe('PENDING_ASSIGNMENT');
    expect(item.evaluationMode).toBe('HUMAN');
    expect(item.submittedAt).toBe(at);
    expect(item.context.title).toBe('Desenvolvedor Front-end');
    expect(item.candidate).toEqual({
      id: 5,
      name: 'Maria Candidata',
      email: 'maria@gmail.com',
      professionalTitle: 'Desenvolvedora',
      city: 'Brasília',
      state: 'DF',
    });
    expect(item.questionCount).toBe(5);
  });

  it('candidato sem candidate_profile não quebra a fila', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      {
        ...interviewRow(),
        candidate: { ...candidate(), candidate_profile: null },
        _count: { questions: 5 },
      },
    ]);
    prisma.interview.count.mockResolvedValue(1);

    const [item] = (await service.listPendingAssignment()).interviews;
    expect(item.candidate.professionalTitle).toBeNull();
    expect(item.candidate.city).toBeNull();
  });

  it('não expõe campos internos (candidate_user_id, evaluator_profile_id, password_hash)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      { ...interviewRow(), candidate: candidate(), _count: { questions: 5 } },
    ]);
    prisma.interview.count.mockResolvedValue(1);

    const [item] = (await service.listPendingAssignment()).interviews;
    const json = JSON.stringify(item);
    expect(json).not.toContain('candidate_user_id');
    expect(json).not.toContain('evaluator_profile_id');
    expect(json).not.toContain('password');
    const select = prisma.interview.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty('candidate_user_id');
    expect(select.candidate.select).not.toHaveProperty('password_hash');
  });

  it('fila vazia', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([]);
    prisma.interview.count.mockResolvedValue(0);

    await expect(service.listPendingAssignment()).resolves.toEqual({
      total: 0,
      interviews: [],
    });
  });
});

describe('AdminInterviewsService.getById', () => {
  function detailRow(overrides: Record<string, unknown> = {}) {
    return {
      ...interviewRow(),
      assigned_at: null,
      candidate: candidate(),
      questions: [
        {
          question_id: 'q-1',
          position: 1,
          question_type: 'TECHNICAL',
          question_text: 'Pergunta?',
          answer_text: 'Resposta',
          answered_at: at,
        },
      ],
      evaluator_profile: null,
      assigned_by: null,
      ...overrides,
    };
  }

  it('não mostra rascunhos IN_PROGRESS (filtro no WHERE) e 404 quando não existe', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(null);

    await expect(service.getById(INTERVIEW_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.interview.findFirst.mock.calls[0][0].where).toEqual({
      interview_id: INTERVIEW_ID,
      status: { notIn: ['IN_PROGRESS', 'CANCELLED'] },
    });
  });

  it('devolve candidato, perguntas/respostas e assignment nulo antes da atribuição', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(detailRow());

    const result = await service.getById(INTERVIEW_ID);

    expect(result.candidate.name).toBe('Maria Candidata');
    expect(result.questions).toEqual([
      {
        id: 'q-1',
        position: 1,
        type: 'TECHNICAL',
        text: 'Pergunta?',
        answer: 'Resposta',
        answeredAt: at,
      },
    ]);
    expect(result.assignment).toBeNull();
  });

  it('devolve a atribuição atual quando existe', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(
      detailRow({
        status: 'ASSIGNED',
        assigned_at: later,
        evaluator_profile: {
          evaluator_profile_id: 3,
          app_user: { name: 'Carlos Andrade', email: 'carlos@gmail.com' },
        },
        assigned_by: { user_id: 1, name: 'Admin' },
      }),
    );

    const result = await service.getById(INTERVIEW_ID);

    expect(result.assignment).toEqual({
      evaluatorId: 3,
      evaluatorName: 'Carlos Andrade',
      evaluatorEmail: 'carlos@gmail.com',
      assignedAt: later,
      assignedBy: { id: 1, name: 'Admin' },
    });
  });
});

describe('AdminInterviewsService.listEvaluators', () => {
  const rows = [
    {
      evaluator_profile_id: 3,
      user_id: 30,
      area: 'RH',
      specialization: null,
      availability_status: 'AVAILABLE',
      app_user: {
        name: 'Beatriz Lima',
        email: 'beatriz@gmail.com',
        account_status: 'ACTIVE',
      },
      _count: { interview: 2 },
    },
    {
      evaluator_profile_id: 4,
      user_id: 40,
      area: null,
      specialization: null,
      availability_status: 'AVAILABLE',
      app_user: {
        name: 'Patricia Gomes',
        email: 'patricia@gmail.com',
        account_status: 'INVITED',
      },
      _count: { interview: 0 },
    },
  ];

  it('lê do banco, só contas EVALUATOR, e marca elegibilidade pelo status da conta', async () => {
    const { service, prisma } = makeService();
    prisma.evaluator_profile.findMany.mockResolvedValue(rows);

    const { evaluators } = await service.listEvaluators();

    const args = prisma.evaluator_profile.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ app_user: { user_role: 'EVALUATOR' } });
    expect(
      evaluators.map((e) => [e.name, e.accountStatus, e.eligible]),
    ).toEqual([
      ['Beatriz Lima', 'ACTIVE', true],
      ['Patricia Gomes', 'INVITED', false],
    ]);
    expect(evaluators[0].id).toBe(3);
    expect(evaluators[0].assignedCount).toBe(2);
  });

  it('só conta como pendente o que está ASSIGNED e não expõe dados de login', async () => {
    const { service, prisma } = makeService();
    prisma.evaluator_profile.findMany.mockResolvedValue(rows);

    const result = await service.listEvaluators();

    const select = prisma.evaluator_profile.findMany.mock.calls[0][0].select;
    expect(select._count.select.interview.where).toEqual({
      status: 'ASSIGNED',
    });
    expect(select.app_user.select).not.toHaveProperty('password_hash');
    expect(JSON.stringify(result)).not.toContain('password');
  });

  it.each(['BLOCKED', 'INACTIVE', 'PENDING_VERIFICATION'])(
    'conta %s não é elegível',
    async (account_status) => {
      const { service, prisma } = makeService();
      prisma.evaluator_profile.findMany.mockResolvedValue([
        { ...rows[0], app_user: { ...rows[0].app_user, account_status } },
      ]);

      const { evaluators } = await service.listEvaluators();
      expect(evaluators[0].eligible).toBe(false);
    },
  );
});

describe('AdminInterviewsService.assign', () => {
  function arrange(
    interview: Record<string, unknown> | null,
    evaluator: unknown = activeEvaluator,
  ) {
    const ctx = makeService();
    ctx.prisma.interview.findUnique.mockResolvedValue(interview);
    ctx.prisma.evaluator_profile.findUnique.mockResolvedValue(evaluator);
    ctx.prisma.interview.updateMany.mockResolvedValue({ count: 1 });
    ctx.prisma.interview.findFirst.mockResolvedValue({
      ...interviewRow({ status: 'ASSIGNED' }),
      assigned_at: later,
      candidate: candidate(),
      questions: [],
      evaluator_profile: {
        evaluator_profile_id: 3,
        app_user: { name: 'Carlos Andrade', email: 'carlos@gmail.com' },
      },
      assigned_by: { user_id: 1, name: 'Admin' },
    });
    return ctx;
  }

  const pending = {
    interview_id: INTERVIEW_ID,
    status: 'PENDING_ASSIGNMENT',
    evaluation_mode: 'HUMAN',
  };

  it('PENDING_ASSIGNMENT + avaliador ACTIVE => ASSIGNED com avaliador, data e Admin do JWT', async () => {
    const { service, prisma } = arrange(pending);

    const result = await service.assign(1, INTERVIEW_ID, 3);

    const args = prisma.interview.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({
      interview_id: INTERVIEW_ID,
      status: 'PENDING_ASSIGNMENT',
      evaluation_mode: 'HUMAN',
      evaluator_profile_id: null,
    });
    expect(args.data.status).toBe('ASSIGNED');
    expect(args.data.evaluator_profile_id).toBe(3);
    expect(args.data.assigned_at).toBeInstanceOf(Date);
    expect(args.data.assigned_by_user_id).toBe(1);
    expect(args.data.updated_at).toBeInstanceOf(Date);
    expect(args.data).not.toHaveProperty('evaluation_mode');
    expect(args.data).not.toHaveProperty('candidate_user_id');
    expect(result.status).toBe('ASSIGNED');
    expect(result.assignment?.evaluatorName).toBe('Carlos Andrade');
  });

  it('assigned_by_user_id é SEMPRE o parâmetro (JWT): o Admin passado é o gravado', async () => {
    const { service, prisma } = arrange(pending);

    await service.assign(77, INTERVIEW_ID, 3);

    expect(
      prisma.interview.updateMany.mock.calls[0][0].data.assigned_by_user_id,
    ).toBe(77);
  });

  it('entrevista inexistente => 404, sem atualizar', async () => {
    const { service, prisma } = arrange(null);

    await expect(service.assign(1, INTERVIEW_ID, 3)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
  });

  it('entrevista AI => 409, sem atualizar', async () => {
    const { service, prisma } = arrange({
      ...pending,
      status: 'PENDING_AI_EVALUATION',
      evaluation_mode: 'AI',
    });

    await expect(service.assign(1, INTERVIEW_ID, 3)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
  });

  it.each(['ASSIGNED', 'COMPLETED', 'IN_PROGRESS', 'PENDING_AI_EVALUATION'])(
    'status %s => 409, sem atualizar e sem reatribuir',
    async (status) => {
      const { service, prisma } = arrange({
        ...pending,
        status,
        evaluation_mode: status === 'IN_PROGRESS' ? null : 'HUMAN',
      });

      await expect(service.assign(1, INTERVIEW_ID, 3)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.interview.updateMany).not.toHaveBeenCalled();
    },
  );

  it('mensagem específica para reatribuição', async () => {
    const { service } = arrange({ ...pending, status: 'ASSIGNED' });

    await expect(service.assign(1, INTERVIEW_ID, 3)).rejects.toThrow(
      'não pode ser reatribuída',
    );
  });

  it('avaliador INVITED (ex.: Patricia) => 409, sem atualizar', async () => {
    const { service, prisma } = arrange(pending, {
      evaluator_profile_id: 4,
      app_user: { user_role: 'EVALUATOR', account_status: 'INVITED' },
    });

    await expect(service.assign(1, INTERVIEW_ID, 4)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
  });

  it.each(['BLOCKED', 'INACTIVE', 'PENDING_VERIFICATION'])(
    'avaliador %s => 409',
    async (account_status) => {
      const { service, prisma } = arrange(pending, {
        evaluator_profile_id: 4,
        app_user: { user_role: 'EVALUATOR', account_status },
      });

      await expect(service.assign(1, INTERVIEW_ID, 4)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.interview.updateMany).not.toHaveBeenCalled();
    },
  );

  it('avaliador inexistente => 404, sem atualizar', async () => {
    const { service, prisma } = arrange(pending, null);

    await expect(service.assign(1, INTERVIEW_ID, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
  });

  it('perfil cujo usuário não é EVALUATOR => 404', async () => {
    const { service, prisma } = arrange(pending, {
      evaluator_profile_id: 9,
      app_user: { user_role: 'CANDIDATE', account_status: 'ACTIVE' },
    });

    await expect(service.assign(1, INTERVIEW_ID, 9)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
  });

  it('concorrência: o UPDATE condicionado afeta 0 linhas para o segundo Admin => 409', async () => {
    const { service, prisma } = arrange(pending);
    prisma.interview.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const results = await Promise.allSettled([
      service.assign(1, INTERVIEW_ID, 3),
      service.assign(2, INTERVIEW_ID, 5),
    ]);

    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    const rejected = results[1] as PromiseRejectedResult;
    expect(rejected.reason).toBeInstanceOf(ConflictException);
    // Os dois usaram o MESMO WHERE condicionado: a garantia está no banco.
    const wheres = prisma.interview.updateMany.mock.calls.map(
      (call: Array<{ where: unknown }>) => call[0].where,
    );
    expect(wheres[0]).toEqual(wheres[1]);
    expect(wheres[0]).toMatchObject({
      status: 'PENDING_ASSIGNMENT',
      evaluator_profile_id: null,
    });
  });
});
