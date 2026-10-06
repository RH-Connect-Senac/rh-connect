import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateCourseDto, UpdateCourseDto } from './course.dto';
import { CreateEducationDto, UpdateEducationDto } from './education.dto';
import { CreateExperienceDto, UpdateExperienceDto } from './experience.dto';
import { CreateSkillDto } from './skill.dto';
import { UpdateCandidateProfileDto } from './update-candidate-profile.dto';

async function errorsOf<T extends object>(
  cls: new () => T,
  plain: Record<string, unknown>,
): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, plain));
  return errors.map((e) => e.property);
}

const maxLen = (n: number) => 'x'.repeat(n);

describe('UpdateCandidateProfileDto', () => {
  it('aceita corpo vazio e limpeza com null', async () => {
    expect(await errorsOf(UpdateCandidateProfileDto, {})).toEqual([]);
    expect(
      await errorsOf(UpdateCandidateProfileDto, {
        professionalTitle: null,
        professionalArea: null,
        professionalLevel: null,
      }),
    ).toEqual([]);
  });

  it('aceita valores válidos nos limites exatos', async () => {
    expect(
      await errorsOf(UpdateCandidateProfileDto, {
        professionalTitle: maxLen(60),
        desiredPosition: maxLen(60),
        professionalSummary: maxLen(600),
        professionalArea: 'information-technology',
        professionalSubarea: 'frontend-development',
        professionalLevel: 'PLENO',
        contractType: 'PJ',
      }),
    ).toEqual([]);
  });

  it('rejeita acima dos limites e enums/catálogo inválidos', async () => {
    const errors = await errorsOf(UpdateCandidateProfileDto, {
      professionalTitle: maxLen(61),
      desiredPosition: maxLen(61),
      professionalSummary: maxLen(601),
      professionalArea: 'inexistente',
      professionalSubarea: 'inexistente',
      professionalLevel: 'Pleno',
      contractType: 'FREELA',
    });
    expect(errors.sort()).toEqual(
      [
        'contractType',
        'desiredPosition',
        'professionalArea',
        'professionalLevel',
        'professionalSubarea',
        'professionalSummary',
        'professionalTitle',
      ].sort(),
    );
  });
});

describe('Education DTOs', () => {
  const valid = {
    degree: 'Análise e Desenvolvimento de Sistemas',
    educationInstitution: 'Senac',
    academicLevel: 'TECNOLOGO',
    status: 'CONCLUIDO',
    startDate: '2020-02',
    endDate: '2023-12',
  };

  it('aceita payload válido, inclusive ENSINO_FUNDAMENTAL sem curso e em andamento sem conclusão', async () => {
    expect(await errorsOf(CreateEducationDto, valid)).toEqual([]);
    expect(
      await errorsOf(CreateEducationDto, {
        ...valid,
        academicLevel: 'ENSINO_FUNDAMENTAL',
        status: 'EM_ANDAMENTO',
        degree: undefined,
        endDate: undefined,
      }),
    ).toEqual([]);
    expect(
      await errorsOf(CreateEducationDto, { ...valid, degree: null, endDate: null }),
    ).toEqual([]);
  });

  it('instituição e início são obrigatórios; curso e conclusão são opcionais no DTO (regras por nível/situação ficam em record-rules)', async () => {
    expect(
      await errorsOf(CreateEducationDto, { ...valid, degree: undefined }),
    ).toEqual([]);
    expect(
      await errorsOf(CreateEducationDto, { ...valid, educationInstitution: undefined }),
    ).toEqual(['educationInstitution']);
    expect(
      await errorsOf(CreateEducationDto, { ...valid, educationInstitution: '   ' }),
    ).toEqual(['educationInstitution']);
    expect(
      await errorsOf(CreateEducationDto, { ...valid, educationInstitution: null }),
    ).toEqual(['educationInstitution']);
    expect(
      await errorsOf(CreateEducationDto, { ...valid, startDate: undefined }),
    ).toEqual(['startDate']);
    expect(
      await errorsOf(CreateEducationDto, { ...valid, startDate: null }),
    ).toEqual(['startDate']);
  });

  it('nível, situação, instituição e início continuam obrigatórios', async () => {
    expect(
      (await errorsOf(CreateEducationDto, { degree: 'x' })).sort(),
    ).toEqual(['academicLevel', 'educationInstitution', 'startDate', 'status']);
  });

  it('rejeita acima de 80, enum e mês inválidos', async () => {
    expect(
      (
        await errorsOf(CreateEducationDto, {
          degree: maxLen(81),
          educationInstitution: maxLen(81),
          academicLevel: 'X',
          status: 'X',
          startDate: '2020-13',
          endDate: '2020/01',
        })
      ).sort(),
    ).toEqual(
      [
        'academicLevel',
        'degree',
        'educationInstitution',
        'endDate',
        'startDate',
        'status',
      ].sort(),
    );
  });

  it('update: curso e conclusão aceitam null (limpar); demais campos obrigatórios não', async () => {
    expect(
      await errorsOf(UpdateEducationDto, { degree: null, endDate: null }),
    ).toEqual([]);
    expect(await errorsOf(UpdateEducationDto, {})).toEqual([]);
    expect(
      (
        await errorsOf(UpdateEducationDto, {
          academicLevel: null,
          status: null,
          educationInstitution: null,
          startDate: null,
        })
      ).sort(),
    ).toEqual(['academicLevel', 'educationInstitution', 'startDate', 'status']);
  });
});

describe('Course DTOs', () => {
  it('instituição e carga horária são opcionais', async () => {
    expect(
      await errorsOf(CreateCourseDto, { courseName: 'Node.js', status: 'EM_ANDAMENTO' }),
    ).toEqual([]);
    expect(
      await errorsOf(CreateCourseDto, {
        courseName: maxLen(80),
        courseInstitution: maxLen(80),
        workloadHours: 40,
        status: 'CONCLUIDO',
        completedAt: '2025-06',
      }),
    ).toEqual([]);
  });

  it('rejeita nome vazio/longo, instituição longa e carga inválida', async () => {
    expect(
      (
        await errorsOf(CreateCourseDto, {
          courseName: maxLen(81),
          courseInstitution: maxLen(81),
          workloadHours: 0,
          status: 'CONCLUIDO',
        })
      ).sort(),
    ).toEqual(['courseInstitution', 'courseName', 'workloadHours']);
    expect(await errorsOf(CreateCourseDto, { courseName: ' ', status: 'CONCLUIDO' })).toEqual([
      'courseName',
    ]);
    expect(
      await errorsOf(CreateCourseDto, { courseName: 'a', status: 'CONCLUIDO', workloadHours: 1.5 }),
    ).toEqual(['workloadHours']);
    expect(await errorsOf(UpdateCourseDto, { courseName: null })).toEqual([
      'courseName',
    ]);
  });

  it('início do curso é opcional, aceita null e valida AAAA-MM', async () => {
    const base = { courseName: 'a', status: 'EM_ANDAMENTO' };
    expect(await errorsOf(CreateCourseDto, base)).toEqual([]);
    expect(await errorsOf(CreateCourseDto, { ...base, startDate: '2025-02' })).toEqual([]);
    expect(await errorsOf(CreateCourseDto, { ...base, startDate: null })).toEqual([]);
    expect(await errorsOf(CreateCourseDto, { ...base, startDate: '02/2025' })).toEqual(['startDate']);
    expect(await errorsOf(CreateCourseDto, { ...base, startDate: '2025-13' })).toEqual(['startDate']);
    expect(await errorsOf(UpdateCourseDto, { startDate: null })).toEqual([]);
    expect(await errorsOf(UpdateCourseDto, { startDate: 'x' })).toEqual(['startDate']);
  });

  it('situação é obrigatória e restrita a EM_ANDAMENTO/CONCLUIDO', async () => {
    expect(await errorsOf(CreateCourseDto, { courseName: 'a' })).toEqual(['status']);
    expect(
      await errorsOf(CreateCourseDto, { courseName: 'a', status: 'TRANCADO' }),
    ).toEqual(['status']);
    expect(await errorsOf(UpdateCourseDto, {})).toEqual([]);
    expect(await errorsOf(UpdateCourseDto, { status: null })).toEqual(['status']);
  });
});

describe('Experience DTOs', () => {
  const valid = {
    companyName: 'Acme',
    jobRole: 'Dev',
    startDate: '2022-01',
    endDate: '2023-01',
    isCurrent: false,
    description: maxLen(800),
  };

  it('aceita payload válido nos limites', async () => {
    expect(await errorsOf(CreateExperienceDto, valid)).toEqual([]);
    expect(
      await errorsOf(CreateExperienceDto, {
        ...valid,
        companyName: maxLen(80),
        jobRole: maxLen(60),
        endDate: null,
        isCurrent: true,
        description: undefined,
      }),
    ).toEqual([]);
  });

  it('rejeita acima dos limites e isCurrent não booleano', async () => {
    expect(
      (
        await errorsOf(CreateExperienceDto, {
          ...valid,
          companyName: maxLen(81),
          jobRole: maxLen(61),
          description: maxLen(801),
          isCurrent: 'sim',
        })
      ).sort(),
    ).toEqual(['companyName', 'description', 'isCurrent', 'jobRole']);
    expect(await errorsOf(UpdateExperienceDto, { jobRole: null })).toEqual([
      'jobRole',
    ]);
  });
});

describe('CreateSkillDto', () => {
  it('aceita TECHNICAL/BEHAVIORAL até 60 caracteres', async () => {
    expect(
      await errorsOf(CreateSkillDto, { type: 'TECHNICAL', name: maxLen(60) }),
    ).toEqual([]);
    expect(
      await errorsOf(CreateSkillDto, { type: 'BEHAVIORAL', name: 'Empatia' }),
    ).toEqual([]);
  });

  it('rejeita tipo inválido, nome vazio e nome > 60', async () => {
    expect(
      (await errorsOf(CreateSkillDto, { type: 'OTHER', name: ' ' })).sort(),
    ).toEqual(['name', 'type']);
    expect(
      await errorsOf(CreateSkillDto, { type: 'TECHNICAL', name: maxLen(61) }),
    ).toEqual(['name']);
  });
});
