import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { CreateInterviewDto } from './dto/create-interview.dto';
import { INTERVIEW_SELECT, InterviewsService } from './interviews.service';

const now = new Date('2026-10-09T12:00:00.000Z');
const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    interview_id: INTERVIEW_ID,
    status: 'IN_PROGRESS',
    evaluation_mode: null,
    job_title: 'Desenvolvedor Front-end',
    job_company: 'ACME',
    job_summary: null,
    job_activities: ['Criar telas'],
    job_requirements: ['React', 'TypeScript'],
    job_location: 'Brasília - DF',
    job_contract_type: 'CLT',
    job_work_mode: null,
    job_source_url: 'https://empregare.example/vaga/1',
    submitted_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function makeService() {
  const prisma = {
    interview: { create: jest.fn(), findFirst: jest.fn() },
  };
  const service = new InterviewsService(prisma as unknown as PrismaService);
  return { service, prisma };
}

const dto: CreateInterviewDto = {
  sourceUrl: ' https://empregare.example/vaga/1 ',
  title: 'Desenvolvedor Front-end',
  company: 'ACME',
  requirements: ['React', 'TypeScript'],
};

describe('InterviewsService.create', () => {
  it('cria IN_PROGRESS, sem modalidade, com o dono vindo do parâmetro (JWT)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.create.mockResolvedValue(makeRecord());

    await service.create(42, dto);

    const args = prisma.interview.create.mock.calls[0][0];
    expect(args.data.candidate_user_id).toBe(42);
    expect(args.data.status).toBe('IN_PROGRESS');
    expect(args.data).not.toHaveProperty('evaluation_mode');
    expect(args.data).not.toHaveProperty('evaluator_profile_id');
    expect(args.data).not.toHaveProperty('submitted_at');
    expect(args.select).toBe(INTERVIEW_SELECT);
  });

  it('persiste o snapshot do contexto normalizado', async () => {
    const { service, prisma } = makeService();
    prisma.interview.create.mockResolvedValue(makeRecord());

    await service.create(42, { ...dto, title: '  Dev   Front-end  ' });

    const data = prisma.interview.create.mock.calls[0][0].data;
    expect(data.job_source_url).toBe('https://empregare.example/vaga/1');
    expect(data.job_title).toBe('Dev Front-end');
    expect(data.job_requirements).toEqual(['React', 'TypeScript']);
    expect(data.job_activities).toEqual([]);
    expect(data.job_summary).toBeNull();
    expect(data.job_work_mode).toBeNull();
  });

  it.each([
    ['title', 80],
    ['company', 80],
    ['summary', 800],
    ['location', 60],
    ['contractType', 40],
  ])(
    '%s acima de %i caracteres => 400 e NADA é gravado (sem truncar)',
    async (field, max) => {
      const { service, prisma } = makeService();

      await expect(
        service.create(42, {
          ...dto,
          [field]: 'x'.repeat(max + 1),
        } as CreateInterviewDto),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.interview.create).not.toHaveBeenCalled();
    },
  );

  it('regra V1: consulta a IN_PROGRESS do dono antes de criar e bloqueia a segunda (409)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.create.mockResolvedValue(makeRecord());
    prisma.interview.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ interview_id: INTERVIEW_ID });

    await service.create(42, dto);
    await expect(service.create(42, dto)).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.interview.create).toHaveBeenCalledTimes(1);
    expect(prisma.interview.findFirst.mock.calls[0][0].where).toEqual({
      candidate_user_id: 42,
      status: 'IN_PROGRESS',
    });
  });

  it('exige apenas o usuário autenticado: não consulta perfil/onboarding do candidato', async () => {
    const { service, prisma } = makeService();
    prisma.interview.create.mockResolvedValue(makeRecord());

    await service.create(42, dto);

    // o mock só expõe `interview`: qualquer outra consulta (candidate_profile,
    // app_user) lançaria TypeError e falharia o teste.
    expect(Object.keys(prisma)).toEqual(['interview']);
  });

  it('devolve a projeção sem campos internos (dono, avaliador)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.create.mockResolvedValue(makeRecord());

    const result = await service.create(42, dto);

    expect(result).toEqual({
      id: INTERVIEW_ID,
      status: 'IN_PROGRESS',
      evaluationMode: null,
      submittedAt: null,
      createdAt: now,
      updatedAt: now,
      context: {
        sourceUrl: 'https://empregare.example/vaga/1',
        title: 'Desenvolvedor Front-end',
        company: 'ACME',
        summary: null,
        activities: ['Criar telas'],
        requirements: ['React', 'TypeScript'],
        location: 'Brasília - DF',
        contractType: 'CLT',
        workMode: null,
      },
    });
    expect(INTERVIEW_SELECT).not.toHaveProperty('candidate_user_id');
    expect(INTERVIEW_SELECT).not.toHaveProperty('evaluator_profile_id');
  });
});

describe('InterviewsService.getOwned', () => {
  it('filtra por interview_id E candidate_user_id (ownership no WHERE)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(makeRecord());

    await service.getOwned(42, INTERVIEW_ID);

    expect(prisma.interview.findFirst.mock.calls[0][0].where).toEqual({
      interview_id: INTERVIEW_ID,
      candidate_user_id: 42,
    });
  });

  it('entrevista de outro candidato (ou inexistente) => 404', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(null);

    await expect(service.getOwned(43, INTERVIEW_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
