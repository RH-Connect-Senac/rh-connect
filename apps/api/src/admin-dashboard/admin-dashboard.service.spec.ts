import { InternalServerErrorException } from '@nestjs/common';
import { CANDIDATE_USER_WHERE } from '../admin-candidates/candidate-rules';
import {
  ACTIVE_EVALUATOR_WHERE,
  PENDING_ASSIGNMENT_WHERE,
} from '../admin-interviews/admin-rules';
import { AdminInterviewsService } from '../admin-interviews/admin-interviews.service';
import type { PrismaService } from '../prisma/prisma.service';
import {
  AdminDashboardService,
  COMPLETED_HUMAN_EVALUATION_WHERE,
  buildMonthKeys,
  compareActivity,
  monthKeyInSaoPaulo,
  toScore,
  type DashboardActivity,
} from './admin-dashboard.service';

const NOW = new Date('2026-10-13T15:00:00.000Z'); // 12:00 em São Paulo

const decimal = (value: string) => ({ toString: () => value });

function makeService() {
  const prisma = {
    app_user: { count: jest.fn(), findMany: jest.fn() },
    evaluator_profile: { count: jest.fn(), findMany: jest.fn() },
    interview: { count: jest.fn(), findMany: jest.fn() },
    interview_evaluation: { aggregate: jest.fn(), findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
  prisma.app_user.count.mockResolvedValue(0);
  prisma.app_user.findMany.mockResolvedValue([]);
  prisma.evaluator_profile.count.mockResolvedValue(0);
  prisma.interview.count.mockResolvedValue(0);
  prisma.interview.findMany.mockResolvedValue([]);
  prisma.interview_evaluation.aggregate.mockResolvedValue({
    _avg: { overall_score: null },
    _count: { overall_score: 0 },
  });
  prisma.interview_evaluation.findMany.mockResolvedValue([]);
  prisma.$queryRaw.mockResolvedValue([]);
  const service = new AdminDashboardService(prisma as unknown as PrismaService);
  return { service, prisma };
}

describe('AdminDashboardService: summary', () => {
  it('candidateCount: count no banco com a regra da lista (role CANDIDATE), sem carregar linhas', async () => {
    const { service, prisma } = makeService();
    prisma.app_user.count.mockResolvedValue(12);

    const result = await service.getDashboard(NOW);

    expect(result.summary.candidateCount).toBe(12);
    expect(prisma.app_user.count).toHaveBeenCalledWith({
      where: { user_role: 'CANDIDATE' },
    });
    expect(CANDIDATE_USER_WHERE).toEqual({ user_role: 'CANDIDATE' });
  });

  it('activeEvaluatorCount: evaluator_profile de app_user EVALUATOR + ACTIVE (INVITED e demais fora; sem availability_status)', async () => {
    const { service, prisma } = makeService();
    prisma.evaluator_profile.count.mockResolvedValue(3);

    const result = await service.getDashboard(NOW);

    expect(result.summary.activeEvaluatorCount).toBe(3);
    expect(prisma.evaluator_profile.count).toHaveBeenCalledWith({
      where: { app_user: { user_role: 'EVALUATOR', account_status: 'ACTIVE' } },
    });
    expect(JSON.stringify(ACTIVE_EVALUATOR_WHERE)).not.toContain(
      'availability_status',
    );
  });

  it('pendingAssignmentCount: HUMAN + PENDING_ASSIGNMENT, a mesma regra da fila', async () => {
    const { service, prisma } = makeService();
    prisma.interview.count.mockResolvedValue(4);

    const result = await service.getDashboard(NOW);

    expect(result.summary.pendingAssignmentCount).toBe(4);
    expect(prisma.interview.count).toHaveBeenCalledWith({
      where: { evaluation_mode: 'HUMAN', status: 'PENDING_ASSIGNMENT' },
    });
  });

  it('a fila real (AdminInterviewsService) e o Dashboard usam exatamente o mesmo where', async () => {
    const { service, prisma } = makeService();
    await service.getDashboard(NOW);
    const dashboardWhere = prisma.interview.count.mock.calls[0][0].where;

    const queuePrisma = {
      interview: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const queue = new AdminInterviewsService(
      queuePrisma as unknown as PrismaService,
    );
    await queue.listPendingAssignment();

    expect(queuePrisma.interview.count.mock.calls[0][0].where).toEqual(
      dashboardWhere,
    );
    expect(queuePrisma.interview.findMany.mock.calls[0][0].where).toEqual(
      dashboardWhere,
    );
    expect(dashboardWhere).toEqual(PENDING_ASSIGNMENT_WHERE);
  });

  it('a regra de avaliador ativo do Dashboard equivale ao eligible da lista de avaliadores', async () => {
    const statuses = [
      'ACTIVE',
      'INVITED',
      'INACTIVE',
      'BLOCKED',
      'PENDING_VERIFICATION',
    ];
    const prisma = {
      evaluator_profile: {
        findMany: jest.fn().mockResolvedValue(
          statuses.map((status, index) => ({
            evaluator_profile_id: index + 1,
            user_id: index + 10,
            area: null,
            specialization: null,
            availability_status: 'AVAILABLE',
            app_user: { name: status, email: `${status}@gmail.com`, account_status: status },
            _count: { interview: 0 },
          })),
        ),
      },
    };
    const list = await new AdminInterviewsService(
      prisma as unknown as PrismaService,
    ).listEvaluators();

    const eligible = list.evaluators.filter((e) => e.eligible);
    expect(eligible.map((e) => e.accountStatus)).toEqual([
      ACTIVE_EVALUATOR_WHERE.app_user.account_status,
    ]);
  });

  it('generatedAt é ISO do momento da geração', async () => {
    const { service } = makeService();
    expect((await service.getDashboard(NOW)).generatedAt).toBe(
      '2026-10-13T15:00:00.000Z',
    );
  });
});

describe('AdminDashboardService: score médio', () => {
  it('considera só avaliações COMPLETED de entrevistas HUMAN COMPLETED com overall_score (DRAFT e AI não entram)', async () => {
    const { service, prisma } = makeService();

    await service.getDashboard(NOW);

    expect(prisma.interview_evaluation.aggregate).toHaveBeenCalledWith({
      where: {
        status: 'COMPLETED',
        overall_score: { not: null },
        interview: { evaluation_mode: 'HUMAN', status: 'COMPLETED' },
      },
      _avg: { overall_score: true },
      _count: { overall_score: true },
    });
    expect(COMPLETED_HUMAN_EVALUATION_WHERE.status).toBe('COMPLETED');
  });

  it('converte Decimal e arredonda a 1 casa; informa a amostra', async () => {
    const { service, prisma } = makeService();
    prisma.interview_evaluation.aggregate.mockResolvedValue({
      _avg: { overall_score: decimal('7.8333333333') },
      _count: { overall_score: 6 },
    });

    const { summary } = await service.getDashboard(NOW);

    expect(summary.averageScore).toBe(7.8);
    expect(summary.averageScoreSample).toBe(6);
  });

  it('arredonda para cima na metade (8.25 -> 8.3) e aceita number', async () => {
    const { service, prisma } = makeService();
    prisma.interview_evaluation.aggregate.mockResolvedValue({
      _avg: { overall_score: decimal('8.25') },
      _count: { overall_score: 2 },
    });
    expect((await service.getDashboard(NOW)).summary.averageScore).toBe(8.3);
    expect(toScore(9)).toBe(9);
    expect(toScore('x' as never)).toBeNull();
  });

  it('sem amostra: averageScore null (nunca 0) e averageScoreSample 0', async () => {
    const { service } = makeService();

    const { summary } = await service.getDashboard(NOW);

    expect(summary.averageScore).toBeNull();
    expect(summary.averageScoreSample).toBe(0);
  });

  it('uma nota 0 legítima é média 0, não null', async () => {
    const { service, prisma } = makeService();
    prisma.interview_evaluation.aggregate.mockResolvedValue({
      _avg: { overall_score: decimal('0.0') },
      _count: { overall_score: 1 },
    });

    const { summary } = await service.getDashboard(NOW);

    expect(summary.averageScore).toBe(0);
    expect(summary.averageScoreSample).toBe(1);
  });
});

describe('AdminDashboardService: entrevistas por mês', () => {
  it('retorna exatamente 12 meses, do mais antigo ao mais recente, com zero onde não há dado', async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw.mockResolvedValue([
      { month: '2026-10', total: 4 },
      { month: '2026-07', total: BigInt(2) },
    ]);

    const { interviewsByMonth } = await service.getDashboard(NOW);

    expect(interviewsByMonth).toHaveLength(12);
    expect(interviewsByMonth[0]).toEqual({ month: '2025-11', total: 0 });
    expect(interviewsByMonth[11]).toEqual({ month: '2026-10', total: 4 });
    expect(interviewsByMonth.find((m) => m.month === '2026-07')?.total).toBe(2);
    expect(interviewsByMonth.filter((m) => m.total === 0)).toHaveLength(10);
    const keys = interviewsByMonth.map((m) => m.month);
    expect([...keys].sort()).toEqual(keys);
  });

  it('dados fora da janela não aparecem', async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw.mockResolvedValue([
      { month: '2025-10', total: 9 }, // 13 meses atrás
      { month: '2026-11', total: 7 }, // futuro
      { month: '2026-09', total: 1 },
    ]);

    const { interviewsByMonth } = await service.getDashboard(NOW);

    expect(interviewsByMonth.map((m) => m.month)).not.toContain('2025-10');
    expect(interviewsByMonth.map((m) => m.month)).not.toContain('2026-11');
    expect(interviewsByMonth.reduce((sum, m) => sum + m.total, 0)).toBe(1);
  });

  it('usa submitted_at no fuso America/Sao_Paulo, parametrizado e sem entrada do usuário', async () => {
    const { service, prisma } = makeService();

    await service.getDashboard(NOW);

    const [strings, ...values] = prisma.$queryRaw.mock.calls[0] as [
      string[],
      ...unknown[],
    ];
    const sql = strings.join('?');
    expect(sql).toContain('submitted_at IS NOT NULL');
    expect(sql).toContain("AT TIME ZONE 'America/Sao_Paulo'");
    expect(sql).toContain('GROUP BY 1');
    expect(sql).toContain("interval '11 months'");
    expect(sql).not.toContain('created_at');
    expect(values).toEqual([NOW]); // único parâmetro: o instante "agora"
  });

  it('o mês é o de São Paulo, não o de UTC', () => {
    // 01/11 01:00 UTC = 31/10 22:00 em São Paulo
    const lateOctober = new Date('2026-11-01T01:00:00.000Z');
    expect(monthKeyInSaoPaulo(lateOctober)).toBe('2026-10');
    expect(buildMonthKeys(lateOctober)[11]).toBe('2026-10');
    // 01/11 03:00 UTC = 01/11 00:00 em São Paulo
    expect(monthKeyInSaoPaulo(new Date('2026-11-01T03:00:00.000Z'))).toBe(
      '2026-11',
    );
    // 01/01 02:00 UTC = 31/12 23:00 em São Paulo (virada de ano)
    const newYear = new Date('2027-01-01T02:00:00.000Z');
    expect(monthKeyInSaoPaulo(newYear)).toBe('2026-12');
    expect(buildMonthKeys(newYear)[0]).toBe('2026-01');
  });

  it('buildMonthKeys atravessa a virada de ano em ordem', () => {
    expect(buildMonthKeys(new Date('2026-02-10T12:00:00.000Z'))).toEqual([
      '2025-03',
      '2025-04',
      '2025-05',
      '2025-06',
      '2025-07',
      '2025-08',
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });
});

const t = (iso: string) => new Date(iso);

describe('AdminDashboardService: atividade recente', () => {
  function seed(prisma: ReturnType<typeof makeService>['prisma']) {
    prisma.app_user.findMany.mockResolvedValue([
      { user_id: 7, name: 'Nova Candidata', created_at: t('2026-10-13T10:00:00Z') },
    ]);
    prisma.interview.findMany
      .mockResolvedValueOnce([
        {
          interview_id: 'i-sub',
          job_title: 'Analista',
          submitted_at: t('2026-10-13T11:00:00Z'),
          candidate: { name: 'Ana' },
        },
      ])
      .mockResolvedValueOnce([
        {
          interview_id: 'i-asg',
          job_title: 'Dev',
          assigned_at: t('2026-10-13T12:00:00Z'),
          candidate: { name: 'Bruno' },
          evaluator_profile: { app_user: { name: 'Carlos Andrade' } },
          assigned_by: { name: 'Admin Geral' },
        },
      ]);
    prisma.interview_evaluation.findMany.mockResolvedValue([
      {
        evaluation_id: 'e-1',
        overall_score: decimal('8.5'),
        completed_at: t('2026-10-13T13:00:00Z'),
        interview: {
          job_title: 'Designer',
          candidate: { name: 'Carla' },
          evaluator_profile: { app_user: { name: 'Camila Dias' } },
        },
      },
    ]);
  }

  it('monta os 4 tipos, ordenados do mais recente ao mais antigo, com campos não aplicáveis null', async () => {
    const { service, prisma } = makeService();
    seed(prisma);

    const { recentActivity } = await service.getDashboard(NOW);

    expect(recentActivity.map((a) => a.type)).toEqual([
      'evaluation_completed',
      'interview_assigned',
      'interview_submitted',
      'candidate_registered',
    ]);
    expect(recentActivity[0]).toEqual({
      id: 'evaluation_completed:e-1',
      type: 'evaluation_completed',
      occurredAt: '2026-10-13T13:00:00.000Z',
      candidateName: 'Carla',
      jobTitle: 'Designer',
      evaluatorName: 'Camila Dias',
      actorName: null,
      score: 8.5,
    });
    expect(recentActivity[1]).toEqual({
      id: 'interview_assigned:i-asg',
      type: 'interview_assigned',
      occurredAt: '2026-10-13T12:00:00.000Z',
      candidateName: 'Bruno',
      jobTitle: 'Dev',
      evaluatorName: 'Carlos Andrade',
      actorName: 'Admin Geral',
      score: null,
    });
    expect(recentActivity[2]).toEqual({
      id: 'interview_submitted:i-sub',
      type: 'interview_submitted',
      occurredAt: '2026-10-13T11:00:00.000Z',
      candidateName: 'Ana',
      jobTitle: 'Analista',
      evaluatorName: null,
      actorName: null,
      score: null,
    });
    expect(recentActivity[3]).toEqual({
      id: 'candidate_registered:7',
      type: 'candidate_registered',
      occurredAt: '2026-10-13T10:00:00.000Z',
      candidateName: 'Nova Candidata',
      jobTitle: null,
      evaluatorName: null,
      actorName: null,
      score: null,
    });
  });

  it('assigned_by null => actorName null (o evento continua provado por assigned_at)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          interview_id: 'i-asg',
          job_title: 'Dev',
          assigned_at: t('2026-10-13T12:00:00Z'),
          candidate: { name: 'Bruno' },
          evaluator_profile: { app_user: { name: 'Carlos Andrade' } },
          assigned_by: null,
        },
      ]);

    const { recentActivity } = await service.getDashboard(NOW);

    expect(recentActivity).toHaveLength(1);
    expect(recentActivity[0].actorName).toBeNull();
    expect(recentActivity[0].evaluatorName).toBe('Carlos Andrade');
  });

  it('limita a 8 eventos, mesmo com 4 x 8 candidatos, e mantém os mais recentes', async () => {
    const { service, prisma } = makeService();
    const day = (n: number) => t(`2026-10-${String(n).padStart(2, '0')}T12:00:00Z`);
    prisma.app_user.findMany.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => ({ user_id: i + 1, name: `C${i}`, created_at: day(i + 1) })),
    );
    prisma.interview.findMany
      .mockResolvedValueOnce(
        Array.from({ length: 8 }, (_, i) => ({
          interview_id: `s${i}`,
          job_title: 'J',
          submitted_at: day(i + 10),
          candidate: { name: 'X' },
        })),
      )
      .mockResolvedValueOnce([]);

    const { recentActivity } = await service.getDashboard(NOW);

    expect(recentActivity).toHaveLength(8);
    expect(recentActivity.every((a) => a.type === 'interview_submitted')).toBe(true);
    expect(recentActivity[0].occurredAt).toBe('2026-10-17T12:00:00.000Z');
  });

  it('cada fonte é consultada com take 8, select mínimo e filtro de prova (sem N+1)', async () => {
    const { service, prisma } = makeService();

    await service.getDashboard(NOW);

    expect(prisma.app_user.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.interview.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.interview_evaluation.findMany).toHaveBeenCalledTimes(1);
    const calls = [
      prisma.app_user.findMany.mock.calls[0][0],
      prisma.interview.findMany.mock.calls[0][0],
      prisma.interview.findMany.mock.calls[1][0],
      prisma.interview_evaluation.findMany.mock.calls[0][0],
    ];
    for (const call of calls) expect(call.take).toBe(8);
    expect(prisma.interview.findMany.mock.calls[0][0].where).toEqual({
      submitted_at: { not: null },
    });
    expect(prisma.interview.findMany.mock.calls[1][0].where).toEqual({
      assigned_at: { not: null },
      evaluation_mode: 'HUMAN',
    });
    expect(prisma.interview_evaluation.findMany.mock.calls[0][0].where).toEqual({
      status: 'COMPLETED',
      interview: { evaluation_mode: 'HUMAN', status: 'COMPLETED' },
      completed_at: { not: null },
    });
  });

  it('não consulta nem expõe e-mail, respostas, critérios, tokens ou senha; sem cancelamento/convite/AI', async () => {
    const { service, prisma } = makeService();
    seed(prisma);

    const result = await service.getDashboard(NOW);

    const selects = JSON.stringify([
      prisma.app_user.findMany.mock.calls[0][0].select,
      prisma.interview.findMany.mock.calls[0][0].select,
      prisma.interview.findMany.mock.calls[1][0].select,
      prisma.interview_evaluation.findMany.mock.calls[0][0].select,
    ]);
    for (const forbidden of [
      'email',
      'password',
      'token',
      'answer',
      'criteria',
      'summary',
      'draft',
      'updated_at',
    ]) {
      expect(selects).not.toContain(forbidden);
    }
    const payload = JSON.stringify(result);
    expect(payload).not.toMatch(/email|password|token|answer|criteria/i);
    expect(payload).not.toMatch(/cancel|invite|login|ai_/i);
    expect(
      new Set(result.recentActivity.map((a) => a.type)).size,
    ).toBeLessThanOrEqual(4);
  });

  it('desempate estável: mesmo instante ordena por tipo e depois por id, independente da ordem de entrada', () => {
    const base = { occurredAt: '2026-10-13T12:00:00.000Z', candidateName: 'X', jobTitle: null, evaluatorName: null, actorName: null, score: null };
    const a: DashboardActivity = { ...base, id: 'candidate_registered:1', type: 'candidate_registered' };
    const b: DashboardActivity = { ...base, id: 'interview_submitted:b', type: 'interview_submitted' };
    const c: DashboardActivity = { ...base, id: 'interview_submitted:a', type: 'interview_submitted' };
    const d: DashboardActivity = { ...base, id: 'evaluation_completed:z', type: 'evaluation_completed' };
    const expected = ['evaluation_completed:z', 'interview_submitted:b', 'interview_submitted:a', 'candidate_registered:1'];
    for (const input of [[a, b, c, d], [d, c, b, a], [b, a, d, c]]) {
      expect([...input].sort(compareActivity).map((e) => e.id)).toEqual(expected);
    }
  });

  it('ids são estáveis entre chamadas', async () => {
    const first = makeService();
    seed(first.prisma);
    const second = makeService();
    seed(second.prisma);

    const a = await first.service.getDashboard(NOW);
    const b = await second.service.getDashboard(new Date('2026-10-14T00:00:00.000Z'));

    expect(a.recentActivity.map((e) => e.id)).toEqual(b.recentActivity.map((e) => e.id));
  });
});

describe('AdminDashboardService: erros', () => {
  it('falha do banco vira 500 genérico, sem Prisma/SQL/stack', async () => {
    const { service, prisma } = makeService();
    prisma.app_user.count.mockRejectedValue(
      new Error('Invalid `prisma.app_user.count()` invocation: SELECT secret FROM app_user'),
    );

    const failure = await service.getDashboard(NOW).catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(InternalServerErrorException);
    const message = (failure as Error).message;
    expect(message).not.toMatch(/prisma|SELECT|app_user|invocation/i);
  });

  it('falha na consulta SQL do gráfico também é tratada', async () => {
    const { service, prisma } = makeService();
    prisma.$queryRaw.mockRejectedValue(new Error('relation "interview" boom'));

    await expect(service.getDashboard(NOW)).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
