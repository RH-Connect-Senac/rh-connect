import { NotFoundException } from '@nestjs/common';
import { AdminCandidatesService } from './admin-candidates.service';
import type { PrismaService } from '../prisma/prisma.service';

const createdAt = new Date('2026-09-14T12:00:00.000Z');

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 7,
    name: 'Test Candidate',
    email: 'test.candidate@example.test',
    account_status: 'ACTIVE',
    onboarding_completed_at: null,
    created_at: createdAt,
    updated_at: createdAt,
    candidate_profile: { professional_title: null, city: null, state: null },
    ...overrides,
  };
}

function makeService() {
  const prisma = {
    app_user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };

  const service = new AdminCandidatesService(
    prisma as unknown as PrismaService,
  );

  return { service, prisma };
}

describe('AdminCandidatesService', () => {
  it('lista somente usuários com role CANDIDATE e sem campos sensíveis', async () => {
    const { service, prisma } = makeService();
    prisma.app_user.findMany.mockResolvedValue([makeRecord()]);
    prisma.app_user.count.mockResolvedValue(1);

    const result = await service.list();

    const args = prisma.app_user.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ user_role: 'CANDIDATE' });
    expect(args.select.password_hash).toBeUndefined();
    expect(args.select.session).toBeUndefined();
    expect(args.select.account_activation_token).toBeUndefined();
    expect(args.include).toBeUndefined();

    expect(result.total).toBe(1);
    expect(result.candidates).toEqual([
      {
        id: 7,
        name: 'Test Candidate',
        email: 'test.candidate@example.test',
        accountStatus: 'ACTIVE',
        onboardingCompleted: false,
        onboardingCompletedAt: null,
        createdAt,
        updatedAt: createdAt,
        profile: { professionalTitle: null, city: null, state: null },
      },
    ]);
    expect(JSON.stringify(result)).not.toContain('password');
  });

  it('retorna lista vazia quando não há candidatos', async () => {
    const { service, prisma } = makeService();
    prisma.app_user.findMany.mockResolvedValue([]);
    prisma.app_user.count.mockResolvedValue(0);

    await expect(service.list()).resolves.toEqual({ total: 0, candidates: [] });
  });

  it('marca onboarding concluído quando há data de conclusão', async () => {
    const { service, prisma } = makeService();
    prisma.app_user.findMany.mockResolvedValue([
      makeRecord({ onboarding_completed_at: createdAt, candidate_profile: null }),
    ]);
    prisma.app_user.count.mockResolvedValue(1);

    const { candidates } = await service.list();

    expect(candidates[0].onboardingCompleted).toBe(true);
    expect(candidates[0].profile).toBeNull();
  });

  it('busca o detalhe filtrando por id e role CANDIDATE', async () => {
    const { service, prisma } = makeService();
    prisma.app_user.findFirst.mockResolvedValue(makeRecord());

    const candidate = await service.getById(7);

    const args = prisma.app_user.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({ user_id: 7, user_role: 'CANDIDATE' });
    expect(args.select.password_hash).toBeUndefined();
    expect(candidate.id).toBe(7);
  });

  it('responde 404 quando o id não é de um candidato', async () => {
    const { service, prisma } = makeService();
    prisma.app_user.findFirst.mockResolvedValue(null);

    await expect(service.getById(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('responde 404 para ids fora do intervalo sem consultar o banco', async () => {
    const { service, prisma } = makeService();

    await expect(service.getById(0)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.getById(2147483648)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.app_user.findFirst).not.toHaveBeenCalled();
  });
});
