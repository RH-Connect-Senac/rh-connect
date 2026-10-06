import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CandidateProfileService } from './candidate-profile.service';
import type { PrismaService } from '../prisma/prisma.service';

const NOW = new Date('2026-10-06T12:00:00.000Z');

function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    candidate_profile_id: 5,
    user_id: 9,
    professional_title: null,
    desired_position: null,
    professional_area: null,
    professional_subarea: null,
    professional_level: null,
    contract_type: null,
    professional_summary: null,
    city: null,
    state: null,
    courses_none_declared_at: null,
    experience_none_declared_at: null,
    technical_skills_none_declared_at: null,
    created_at: NOW,
    updated_at: NOW,
    candidate_education: [],
    candidate_course: [],
    candidate_experience: [],
    candidate_skill: [],
    ...overrides,
  };
}

function makeService(recordOverrides: Record<string, unknown> = {}) {
  const record = makeRecord(recordOverrides);
  const prisma: any = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    candidate_profile: {
      upsert: jest.fn().mockResolvedValue(record),
      findUnique: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue(record),
      findUniqueOrThrow: jest.fn().mockResolvedValue(record),
    },
    candidate_education: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    candidate_course: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    candidate_experience: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    candidate_skill: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  prisma.$transaction = jest.fn((cb: (tx: unknown) => unknown) => cb(prisma));
  const service = new CandidateProfileService(
    prisma as unknown as PrismaService,
  );
  return { service, prisma };
}

/** Dados enviados a candidate_profile.update na chamada `index`. */
function profileUpdateData(prisma: any, index = 0) {
  return prisma.candidate_profile.update.mock.calls[index][0].data;
}

describe('CandidateProfileService — leitura e completude', () => {
  it('perfil recém-criado (vazio) volta incompleto com todas as seções pendentes', async () => {
    const { service } = makeService();
    const result = await service.getProfile(9);

    expect(result.isComplete).toBe(false);
    expect(result.missingSections).toEqual([
      'objective',
      'education',
      'courses',
      'experience',
      'technicalSkills',
      'behavioralSkills',
    ]);
    expect(result.educations).toEqual([]);
    expect(result.declarations).toEqual({
      noCourses: false,
      noExperience: false,
      noTechnicalSkills: false,
    });
  });

  it('cria o perfil se não existir (upsert pelo user_id do JWT)', async () => {
    const { service, prisma } = makeService();
    await service.getProfile(9);
    expect(prisma.candidate_profile.upsert.mock.calls[0][0].where).toEqual({
      user_id: 9,
    });
  });

  it('perfil completo; datas saem como AAAA-MM e habilidades separadas por tipo', async () => {
    const { service } = makeService({
      professional_title: 'Dev',
      desired_position: 'Dev React',
      professional_area: 'information-technology',
      professional_subarea: 'frontend-development',
      professional_level: 'JUNIOR',
      contract_type: 'CLT',
      professional_summary: 'Resumo',
      courses_none_declared_at: NOW,
      experience_none_declared_at: NOW,
      candidate_education: [
        {
          education_id: 1,
          degree: 'ADS',
          education_institution: 'Senac',
          academic_level: 'TECNOLOGO',
          education_status: 'CONCLUIDO',
          start_date: new Date('2020-02-01T00:00:00.000Z'),
          end_date: new Date('2023-12-01T00:00:00.000Z'),
        },
      ],
      candidate_skill: [
        { skill_id: 1, skill_type: 'TECHNICAL', skill_name: 'React' },
        { skill_id: 2, skill_type: 'BEHAVIORAL', skill_name: 'Empatia' },
      ],
    });
    const result = await service.getProfile(9);

    expect(result.isComplete).toBe(true);
    expect(result.missingSections).toEqual([]);
    expect(result.educations[0]).toMatchObject({
      startDate: '2020-02',
      endDate: '2023-12',
    });
    expect(result.technicalSkills).toEqual([{ id: 1, name: 'React' }]);
    expect(result.behavioralSkills).toEqual([{ id: 2, name: 'Empatia' }]);
    expect(result.declarations.noCourses).toBe(true);
  });

  it('getCompleteness expõe a checagem para outros fluxos (ex.: entrevista)', async () => {
    const { service } = makeService();
    const result = await service.getCompleteness(9);
    expect(result.isComplete).toBe(false);
    expect(result.missingSections).toContain('objective');
  });
});

describe('CandidateProfileService — leitura somente leitura (Admin)', () => {
  it('nunca cria nem altera o perfil e lê pelo user_id', async () => {
    const { service, prisma } = makeService();
    await service.getProfileReadOnly(9);

    expect(prisma.candidate_profile.findUnique.mock.calls[0][0].where).toEqual({
      user_id: 9,
    });
    expect(prisma.candidate_profile.upsert).not.toHaveBeenCalled();
    expect(prisma.candidate_profile.update).not.toHaveBeenCalled();
  });

  it('sem registro de perfil devolve a mesma estrutura vazia, sem criar linha', async () => {
    const { service, prisma } = makeService();
    prisma.candidate_profile.findUnique.mockResolvedValue(null);

    const result = await service.getProfileReadOnly(9);

    expect(prisma.candidate_profile.upsert).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      professionalTitle: null,
      professionalArea: null,
      professionalSubarea: null,
      desiredPosition: null,
      professionalLevel: null,
      contractType: null,
      professionalSummary: null,
      educations: [],
      courses: [],
      experiences: [],
      technicalSkills: [],
      behavioralSkills: [],
      declarations: {
        noCourses: false,
        noExperience: false,
        noTechnicalSkills: false,
      },
      isComplete: false,
    });
    expect(result.missingSections).toContain('objective');
  });

  it('perfil completo: coleções, campos, declarações e completude', async () => {
    const { service } = makeService({
      professional_title: 'Dev',
      desired_position: 'Dev React',
      professional_area: 'information-technology',
      professional_subarea: 'frontend-development',
      professional_level: 'JUNIOR',
      contract_type: 'CLT',
      professional_summary: 'Resumo',
      courses_none_declared_at: NOW,
      experience_none_declared_at: NOW,
      technical_skills_none_declared_at: null,
      candidate_education: [
        {
          education_id: 1,
          degree: 'ADS',
          education_institution: 'Senac',
          academic_level: 'TECNOLOGO',
          education_status: 'CONCLUIDO',
          start_date: new Date('2020-02-01T00:00:00.000Z'),
          end_date: new Date('2023-12-01T00:00:00.000Z'),
        },
      ],
      candidate_skill: [
        { skill_id: 1, skill_type: 'TECHNICAL', skill_name: 'React' },
        { skill_id: 2, skill_type: 'BEHAVIORAL', skill_name: 'Empatia' },
      ],
    });

    const result = await service.getProfileReadOnly(9);

    expect(result.professionalTitle).toBe('Dev');
    expect(result.educations[0]).toMatchObject({
      degree: 'ADS',
      startDate: '2020-02',
      endDate: '2023-12',
    });
    expect(result.technicalSkills).toEqual([{ id: 1, name: 'React' }]);
    expect(result.behavioralSkills).toEqual([{ id: 2, name: 'Empatia' }]);
    expect(result.declarations).toEqual({
      noCourses: true,
      noExperience: true,
      noTechnicalSkills: false,
    });
    expect(result.isComplete).toBe(true);
    expect(result.missingSections).toEqual([]);
  });

  it('resposta não contém cidade/UF nem dados sensíveis da conta', async () => {
    const { service } = makeService({ city: 'Recife', state: 'PE' });
    const result = await service.getProfileReadOnly(9);
    const json = JSON.stringify(result);

    for (const forbidden of ['city', 'state', 'Recife', 'password', 'hash', 'token', 'session', 'email']) {
      expect(json).not.toContain(forbidden);
    }
  });
});

describe('CandidateProfileService — atualização do perfil', () => {
  it('faz trim e trata texto em branco como limpeza', async () => {
    const { service, prisma } = makeService();
    await service.updateProfile(9, {
      professionalTitle: '  Dev Front-end  ',
      desiredPosition: '   ',
      professionalSummary: null,
      professionalLevel: 'PLENO',
      contractType: 'PJ',
    });
    expect(profileUpdateData(prisma)).toMatchObject({
      professional_title: 'Dev Front-end',
      desired_position: null,
      professional_summary: null,
      professional_level: 'PLENO',
      contract_type: 'PJ',
    });
  });

  it('não altera campos ausentes', async () => {
    const { service, prisma } = makeService();
    await service.updateProfile(9, { professionalTitle: 'Dev' });
    const data = profileUpdateData(prisma);
    expect(data).not.toHaveProperty('professional_area');
    expect(data).not.toHaveProperty('desired_position');
  });

  it('aceita subárea compatível com a área', async () => {
    const { service, prisma } = makeService();
    await service.updateProfile(9, {
      professionalArea: 'secretariat',
      professionalSubarea: 'executive-assistance',
    });
    expect(profileUpdateData(prisma)).toMatchObject({
      professional_area: 'secretariat',
      professional_subarea: 'executive-assistance',
    });
  });

  it('rejeita subárea que não pertence à área', async () => {
    const { service } = makeService();
    await expect(
      service.updateProfile(9, {
        professionalArea: 'secretariat',
        professionalSubarea: 'frontend-development',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita subárea sem área', async () => {
    const { service } = makeService();
    await expect(
      service.updateProfile(9, { professionalSubarea: 'frontend-development' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('trocar a área sem enviar subárea limpa a subárea incompatível', async () => {
    const { service, prisma } = makeService({
      professional_area: 'information-technology',
      professional_subarea: 'frontend-development',
    });
    await service.updateProfile(9, { professionalArea: 'hr-management' });
    expect(profileUpdateData(prisma)).toMatchObject({
      professional_area: 'hr-management',
      professional_subarea: null,
    });
  });

  it('limpar a área (null) com subárea existente limpa as duas', async () => {
    const { service, prisma } = makeService({
      professional_area: 'information-technology',
      professional_subarea: 'frontend-development',
    });
    await service.updateProfile(9, { professionalArea: null });
    expect(profileUpdateData(prisma)).toMatchObject({
      professional_area: null,
      professional_subarea: null,
    });
  });
});

describe('CandidateProfileService — formações', () => {
  const dto = {
    degree: '  ADS ',
    educationInstitution: 'Senac',
    academicLevel: 'TECNOLOGO',
    status: 'CONCLUIDO',
    startDate: '2020-02',
    endDate: '2023-12',
  };

  it('persiste mês/ano como primeiro dia do mês e faz trim', async () => {
    const { service, prisma } = makeService();
    await service.addEducation(9, dto);
    const data = prisma.candidate_education.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      candidate_profile_id: 5,
      degree: 'ADS',
      education_institution: 'Senac',
      academic_level: 'TECNOLOGO',
      education_status: 'CONCLUIDO',
    });
    expect(data.start_date.toISOString()).toBe('2020-02-01T00:00:00.000Z');
    expect(data.end_date.toISOString()).toBe('2023-12-01T00:00:00.000Z');
  });

  it('formação concluída sem data de conclusão é rejeitada', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.addEducation(9, { ...dto, endDate: null }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('formação em andamento sem previsão é válida e grava término nulo', async () => {
    const { service, prisma } = makeService();
    await service.addEducation(9, {
      ...dto,
      status: 'EM_ANDAMENTO',
      endDate: null,
    });
    const data = prisma.candidate_education.create.mock.calls[0][0].data;
    expect(data.end_date).toBeNull();
    expect(data.education_status).toBe('EM_ANDAMENTO');
  });

  it('formação em andamento aceita previsão de conclusão futura', async () => {
    const { service, prisma } = makeService();
    await service.addEducation(9, {
      ...dto,
      status: 'EM_ANDAMENTO',
      startDate: '2025-02',
      endDate: '2030-12',
    });
    const data = prisma.candidate_education.create.mock.calls[0][0].data;
    expect(data.end_date.toISOString()).toBe('2030-12-01T00:00:00.000Z');
  });

  it('formação concluída com data futura é rejeitada', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.addEducation(9, { ...dto, status: 'CONCLUIDO', endDate: '2030-12' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('previsão anterior ao início é rejeitada', async () => {
    const { service } = makeService();
    await expect(
      service.addEducation(9, {
        ...dto,
        status: 'EM_ANDAMENTO',
        startDate: '2025-06',
        endDate: '2025-05',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ensino médio/fundamental aceitam curso ausente; instituição e início são obrigatórios', async () => {
    const { service, prisma } = makeService();
    await service.addEducation(9, {
      academicLevel: 'ENSINO_MEDIO',
      status: 'CONCLUIDO',
      educationInstitution: '  Colégio X ',
      degree: '   ',
      startDate: '2015-02',
      endDate: '2017-12',
    });
    const data = prisma.candidate_education.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ degree: null, education_institution: 'Colégio X' });
  });

  it('demais níveis exigem curso/formação', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.addEducation(9, { ...dto, degree: '  ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.addEducation(9, { ...dto, academicLevel: 'GRADUACAO', degree: null }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejeita instituição em branco e início ausente, antes de abrir transação', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.addEducation(9, { ...dto, educationInstitution: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.addEducation(9, { ...dto, startDate: null as unknown as string }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejeita conclusão anterior ao início', async () => {
    const { service } = makeService();
    await expect(
      service.addEducation(9, { ...dto, startDate: '2024-05', endDate: '2024-04' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('respeita o teto de formações', async () => {
    const { service, prisma } = makeService();
    prisma.candidate_education.count.mockResolvedValue(10);
    await expect(service.addEducation(9, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.candidate_education.create).not.toHaveBeenCalled();
  });

  it('remoção é escopada ao perfil do usuário e devolve 404 se não achar', async () => {
    const { service, prisma } = makeService();
    await service.removeEducation(9, 77);
    expect(prisma.candidate_education.deleteMany.mock.calls[0][0].where).toEqual(
      { education_id: 77, candidate_profile_id: 5 },
    );

    prisma.candidate_education.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.removeEducation(9, 78)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('atualizar formação de outro candidato (não encontrada) devolve 404', async () => {
    const { service, prisma } = makeService();
    prisma.candidate_education.findFirst.mockResolvedValue(null);
    await expect(
      service.updateEducation(9, 1, { degree: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.candidate_education.findFirst.mock.calls[0][0].where).toEqual({
      education_id: 1,
      candidate_profile_id: 5,
    });
  });

  it('atualização revalida regras com o estado mesclado', async () => {
    const { service, prisma } = makeService();
    prisma.candidate_education.findFirst.mockResolvedValue({
      education_id: 1,
      degree: 'ADS',
      education_institution: 'Senac',
      academic_level: 'TECNOLOGO',
      education_status: 'EM_ANDAMENTO',
      start_date: new Date('2024-01-01T00:00:00.000Z'),
      end_date: null,
    });
    // em andamento + previsão (mesmo futura) -> válido
    await service.updateEducation(9, 1, { endDate: '2030-06' });
    expect(
      prisma.candidate_education.update.mock.calls[0][0].data.end_date.toISOString(),
    ).toBe('2030-06-01T00:00:00.000Z');
    // limpar o curso em nível que o exige -> inválido
    await expect(
      service.updateEducation(9, 1, { degree: null }),
    ).rejects.toBeInstanceOf(BadRequestException);
    // virar CONCLUIDO sem informar conclusão -> inválido
    await expect(
      service.updateEducation(9, 1, { status: 'CONCLUIDO' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    // trocar para ensino médio permite limpar o curso
    await service.updateEducation(9, 1, {
      academicLevel: 'ENSINO_MEDIO',
      degree: null,
    });
    expect(prisma.candidate_education.update.mock.calls[1][0].data).toMatchObject({
      degree: null,
      academic_level: 'ENSINO_MEDIO',
    });
    // virar CONCLUIDO informando conclusão -> válido
    await service.updateEducation(9, 1, {
      status: 'CONCLUIDO',
      endDate: '2025-06',
    });
    const data = prisma.candidate_education.update.mock.calls[2][0].data;
    expect(data.end_date.toISOString()).toBe('2025-06-01T00:00:00.000Z');
    expect(data.degree).toBe('ADS');
  });

  it('concluído para em andamento mantém a data como previsão; concluir com data futura é rejeitado', async () => {
    const { service, prisma } = makeService();
    prisma.candidate_education.findFirst.mockResolvedValue({
      education_id: 1,
      degree: 'ADS',
      education_institution: 'Senac',
      academic_level: 'TECNOLOGO',
      education_status: 'EM_ANDAMENTO',
      start_date: new Date('2024-01-01T00:00:00.000Z'),
      end_date: new Date('2030-12-01T00:00:00.000Z'),
    });
    await expect(
      service.updateEducation(9, 1, { status: 'CONCLUIDO' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.updateEducation(9, 1, { status: 'CONCLUIDO', endDate: '2026-06' });
    expect(
      prisma.candidate_education.update.mock.calls[0][0].data.end_date.toISOString(),
    ).toBe('2026-06-01T00:00:00.000Z');
  });
});

describe('CandidateProfileService — cursos e declaração', () => {
  it('curso concluído: instituição ausente aceita, grava situação e limpa a declaração "não possuo cursos"', async () => {
    const { service, prisma } = makeService({
      courses_none_declared_at: NOW,
    });
    await service.addCourse(9, {
      courseName: ' Node.js ',
      status: 'CONCLUIDO',
      completedAt: '2025-06',
    });

    const data = prisma.candidate_course.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      course_name: 'Node.js',
      course_institution: null,
      workload_hours: null,
      course_status: 'CONCLUIDO',
    });
    expect(data.completed_at.toISOString()).toBe('2025-06-01T00:00:00.000Z');
    expect(profileUpdateData(prisma)).toHaveProperty(
      'courses_none_declared_at',
      null,
    );
  });

  it('curso concluído sem data ou com data futura é rejeitado', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.addCourse(9, { courseName: 'Node.js', status: 'CONCLUIDO' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.addCourse(9, {
        courseName: 'Node.js',
        status: 'CONCLUIDO',
        completedAt: '2030-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('curso em andamento: data opcional e previsão futura permitida', async () => {
    const { service, prisma } = makeService();
    await service.addCourse(9, { courseName: 'Node.js', status: 'EM_ANDAMENTO' });
    expect(prisma.candidate_course.create.mock.calls[0][0].data).toMatchObject({
      course_status: 'EM_ANDAMENTO',
      completed_at: null,
    });
    await service.addCourse(9, {
      courseName: 'Node.js',
      status: 'EM_ANDAMENTO',
      completedAt: '2030-01',
    });
    expect(
      prisma.candidate_course.create.mock.calls[1][0].data.completed_at.toISOString(),
    ).toBe('2030-01-01T00:00:00.000Z');
  });

  it('atualização de curso revalida com o estado mesclado', async () => {
    const { service, prisma } = makeService();
    prisma.candidate_course.findFirst.mockResolvedValue({
      course_id: 3,
      course_status: 'EM_ANDAMENTO',
      completed_at: new Date('2030-01-01T00:00:00.000Z'),
    });
    await expect(
      service.updateCourse(9, 3, { status: 'CONCLUIDO' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.updateCourse(9, 3, { status: 'CONCLUIDO', completedAt: '2026-05' });
    expect(prisma.candidate_course.update.mock.calls[0][0].data).toMatchObject({
      course_status: 'CONCLUIDO',
    });
  });

  it('curso sem início continua válido; início é gravado como dia 1 e serializado AAAA-MM', async () => {
    const { service, prisma } = makeService();
    await service.addCourse(9, { courseName: 'A', status: 'EM_ANDAMENTO' });
    expect(prisma.candidate_course.create.mock.calls[0][0].data.start_date).toBeNull();
    await service.addCourse(9, {
      courseName: 'FullStack',
      status: 'EM_ANDAMENTO',
      startDate: '2025-02',
    });
    const data = prisma.candidate_course.create.mock.calls[1][0].data;
    expect(data.start_date.toISOString()).toBe('2025-02-01T00:00:00.000Z');
    expect(data.completed_at).toBeNull();
  });

  it('curso em andamento com início e previsão futura; previsão anterior ao início é rejeitada', async () => {
    const { service, prisma } = makeService();
    await service.addCourse(9, {
      courseName: 'FullStack',
      status: 'EM_ANDAMENTO',
      startDate: '2025-02',
      completedAt: '2027-12',
    });
    expect(
      prisma.candidate_course.create.mock.calls[0][0].data.completed_at.toISOString(),
    ).toBe('2027-12-01T00:00:00.000Z');
    await expect(
      service.addCourse(9, {
        courseName: 'FullStack',
        status: 'EM_ANDAMENTO',
        startDate: '2025-02',
        completedAt: '2025-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('curso concluído com início e conclusão válidos; conclusão antes do início é rejeitada', async () => {
    const { service, prisma } = makeService();
    await service.addCourse(9, {
      courseName: 'FullStack',
      status: 'CONCLUIDO',
      startDate: '2023-02',
      completedAt: '2025-02',
    });
    expect(prisma.candidate_course.create.mock.calls[0][0].data).toMatchObject({
      course_status: 'CONCLUIDO',
    });
    await expect(
      service.addCourse(9, {
        courseName: 'FullStack',
        status: 'CONCLUIDO',
        startDate: '2025-02',
        completedAt: '2023-02',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('atualização mescla o início atual e permite limpá-lo com null', async () => {
    const { service, prisma } = makeService();
    prisma.candidate_course.findFirst.mockResolvedValue({
      course_id: 3,
      course_status: 'EM_ANDAMENTO',
      start_date: new Date('2025-02-01T00:00:00.000Z'),
      completed_at: null,
    });
    await expect(
      service.updateCourse(9, 3, { completedAt: '2025-01' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.updateCourse(9, 3, { startDate: null, completedAt: '2025-01' });
    expect(prisma.candidate_course.update.mock.calls[0][0].data.start_date).toBeNull();
  });

  it('getProfile serializa o início do curso (ou null)', async () => {
    const { service } = makeService({
      candidate_course: [
        {
          course_id: 1,
          course_name: 'A',
          course_institution: null,
          workload_hours: null,
          course_status: 'EM_ANDAMENTO',
          start_date: new Date('2025-02-01T00:00:00.000Z'),
          completed_at: null,
        },
        {
          course_id: 2,
          course_name: 'B',
          course_institution: null,
          workload_hours: null,
          course_status: 'CONCLUIDO',
          start_date: null,
          completed_at: new Date('2024-06-01T00:00:00.000Z'),
        },
      ],
    });
    const result = await service.getProfile(9);
    expect(result.courses[0]).toMatchObject({ startDate: '2025-02', completedAt: null });
    expect(result.courses[1]).toMatchObject({ startDate: null, completedAt: '2024-06' });
  });

  it('remover o último curso NÃO recria a declaração', async () => {
    const { service, prisma } = makeService();
    await service.removeCourse(9, 3);
    const data = profileUpdateData(prisma);
    expect(data).not.toHaveProperty('courses_none_declared_at');
  });

  it('declarar "não possuo cursos" sem registros grava o timestamp', async () => {
    const { service, prisma } = makeService();
    const result = await service.declareNone(9, 'courses');
    const data = profileUpdateData(prisma);
    expect(data.courses_none_declared_at).toBeInstanceOf(Date);
    expect(result).toBeDefined();
  });

  it('declarar com registros existentes é recusado (409) e nada é gravado', async () => {
    const { service, prisma } = makeService();
    prisma.candidate_course.count.mockResolvedValue(1);
    await expect(service.declareNone(9, 'courses')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.candidate_profile.update).not.toHaveBeenCalled();
  });

  it('declarar de novo é idempotente e preserva o timestamp original', async () => {
    const { service, prisma } = makeService({
      experience_none_declared_at: NOW,
    });
    await service.declareNone(9, 'experience');
    expect(prisma.candidate_profile.update).not.toHaveBeenCalled();
  });

  it('declaração de habilidades técnicas conta só habilidades TECHNICAL', async () => {
    const { service, prisma } = makeService();
    await service.declareNone(9, 'technicalSkills');
    expect(prisma.candidate_skill.count.mock.calls[0][0].where).toEqual({
      candidate_profile_id: 5,
      skill_type: 'TECHNICAL',
    });
    expect(profileUpdateData(prisma).technical_skills_none_declared_at).toBeInstanceOf(
      Date,
    );
  });

  it.each([
    ['courses', 'courses_none_declared_at'],
    ['experience', 'experience_none_declared_at'],
    ['technicalSkills', 'technical_skills_none_declared_at'],
  ] as const)('remover declaração de %s volta a null', async (section, column) => {
    const { service, prisma } = makeService({ [column]: NOW });
    await service.removeDeclaration(9, section);
    expect(profileUpdateData(prisma)).toHaveProperty(column, null);
  });

  it('toda escrita trava o perfil dentro de uma transação', async () => {
    const { service, prisma } = makeService();
    await service.declareNone(9, 'courses');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});

describe('CandidateProfileService — experiências', () => {
  it('experiência atual: sem término; limpa declaração de experiência', async () => {
    const { service, prisma } = makeService({
      experience_none_declared_at: NOW,
    });
    await service.addExperience(9, {
      companyName: 'Acme',
      jobRole: 'Dev',
      startDate: '2024-01',
      isCurrent: true,
      endDate: null,
      description: '  ',
    });
    const data = prisma.candidate_experience.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      is_current: true,
      end_date: null,
      description: null,
    });
    expect(data.start_date.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    expect(profileUpdateData(prisma)).toHaveProperty(
      'experience_none_declared_at',
      null,
    );
  });

  it('experiência encerrada sem término é rejeitada', async () => {
    const { service, prisma } = makeService();
    await expect(
      service.addExperience(9, {
        companyName: 'Acme',
        jobRole: 'Dev',
        startDate: '2022-01',
        isCurrent: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('experiência encerrada com término válido é gravada', async () => {
    const { service, prisma } = makeService();
    await service.addExperience(9, {
      companyName: 'Acme',
      jobRole: 'Dev',
      startDate: '2022-01',
      isCurrent: false,
      endDate: '2023-06',
    });
    const data = prisma.candidate_experience.create.mock.calls[0][0].data;
    expect(data.end_date.toISOString()).toBe('2023-06-01T00:00:00.000Z');
  });

  it('experiência atual com término é rejeitada', async () => {
    const { service } = makeService();
    await expect(
      service.addExperience(9, {
        companyName: 'Acme',
        jobRole: 'Dev',
        startDate: '2022-01',
        isCurrent: true,
        endDate: '2023-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('término anterior ao início é rejeitado', async () => {
    const { service } = makeService();
    await expect(
      service.addExperience(9, {
        companyName: 'Acme',
        jobRole: 'Dev',
        startDate: '2022-06',
        isCurrent: false,
        endDate: '2022-05',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marcar como atual sem enviar término descarta o término antigo', async () => {
    const { service, prisma } = makeService();
    prisma.candidate_experience.findFirst.mockResolvedValue({
      experience_id: 1,
      is_current: false,
      start_date: new Date('2022-01-01T00:00:00.000Z'),
      end_date: new Date('2023-01-01T00:00:00.000Z'),
    });
    await service.updateExperience(9, 1, { isCurrent: true });
    const data = prisma.candidate_experience.update.mock.calls[0][0].data;
    expect(data.is_current).toBe(true);
    expect(data.end_date).toBeNull();
  });
});

describe('CandidateProfileService — habilidades', () => {
  it('habilidade técnica limpa a declaração; nome com espaços colapsados', async () => {
    const { service, prisma } = makeService({
      technical_skills_none_declared_at: NOW,
    });
    await service.addSkill(9, { type: 'TECHNICAL', name: '  Node   JS ' });
    expect(prisma.candidate_skill.create.mock.calls[0][0].data).toEqual({
      candidate_profile_id: 5,
      skill_type: 'TECHNICAL',
      skill_name: 'Node JS',
    });
    expect(profileUpdateData(prisma)).toHaveProperty(
      'technical_skills_none_declared_at',
      null,
    );
  });

  it('habilidade comportamental não mexe em declaração', async () => {
    const { service, prisma } = makeService();
    await service.addSkill(9, { type: 'BEHAVIORAL', name: 'Empatia' });
    expect(profileUpdateData(prisma)).not.toHaveProperty(
      'technical_skills_none_declared_at',
    );
  });

  it('duplicata (case-insensitive) devolve 409', async () => {
    const { service, prisma } = makeService();
    prisma.candidate_skill.findFirst.mockResolvedValue({ skill_id: 1 });
    await expect(
      service.addSkill(9, { type: 'TECHNICAL', name: 'react' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.candidate_skill.findFirst.mock.calls[0][0].where).toMatchObject(
      { skill_name: { equals: 'react', mode: 'insensitive' } },
    );
    expect(prisma.candidate_skill.create).not.toHaveBeenCalled();
  });

  it('remoção escopada ao perfil; inexistente devolve 404', async () => {
    const { service, prisma } = makeService();
    await service.removeSkill(9, 4);
    expect(prisma.candidate_skill.deleteMany.mock.calls[0][0].where).toEqual({
      skill_id: 4,
      candidate_profile_id: 5,
    });
    prisma.candidate_skill.deleteMany.mockResolvedValue({ count: 0 });
    await expect(service.removeSkill(9, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
