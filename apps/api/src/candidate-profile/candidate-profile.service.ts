import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { candidate_profile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { CreateEducationDto, UpdateEducationDto } from './dto/education.dto';
import {
  CreateExperienceDto,
  UpdateExperienceDto,
} from './dto/experience.dto';
import { CreateSkillDto } from './dto/skill.dto';
import { UpdateCandidateProfileDto } from './dto/update-candidate-profile.dto';
import {
  dateToMonth,
  monthToDate,
  nullableDateToMonth,
} from './month-date';
import {
  evaluateProfileCompleteness,
  type CompletenessResult,
} from './profile-completeness';
import { RECORD_LIMITS, isSubareaOfArea } from './profile-catalog';
import {
  validateCourseRules,
  validateEducationRules,
  validateExperienceRules,
} from './record-rules';

type Db = Prisma.TransactionClient;

export type DeclarationSection = 'courses' | 'experience' | 'technicalSkills';

function declaredAt(
  profile: candidate_profile,
  section: DeclarationSection,
): Date | null {
  switch (section) {
    case 'courses':
      return profile.courses_none_declared_at;
    case 'experience':
      return profile.experience_none_declared_at;
    case 'technicalSkills':
      return profile.technical_skills_none_declared_at;
  }
}

function declarationPatch(
  section: DeclarationSection,
  value: Date | null,
): Prisma.candidate_profileUncheckedUpdateInput {
  switch (section) {
    case 'courses':
      return { courses_none_declared_at: value };
    case 'experience':
      return { experience_none_declared_at: value };
    case 'technicalSkills':
      return { technical_skills_none_declared_at: value };
  }
}

const profileInclude = {
  candidate_education: {
    orderBy: [{ start_date: 'desc' }, { education_id: 'desc' }],
  },
  candidate_course: {
    orderBy: [{ course_id: 'desc' }],
  },
  candidate_experience: {
    orderBy: [{ start_date: 'desc' }, { experience_id: 'desc' }],
  },
  candidate_skill: {
    orderBy: [{ created_at: 'asc' }, { skill_id: 'asc' }],
  },
} satisfies Prisma.candidate_profileInclude;

type ProfileRecord = Prisma.candidate_profileGetPayload<{
  include: typeof profileInclude;
}>;

/** Campos de ProfileRecord que alimentam o contrato de resposta. */
type ProfileView = Pick<
  ProfileRecord,
  | 'professional_title'
  | 'professional_area'
  | 'professional_subarea'
  | 'desired_position'
  | 'professional_level'
  | 'contract_type'
  | 'professional_summary'
  | 'candidate_education'
  | 'candidate_course'
  | 'candidate_experience'
  | 'candidate_skill'
  | 'courses_none_declared_at'
  | 'experience_none_declared_at'
  | 'technical_skills_none_declared_at'
  | 'updated_at'
>;

/** Perfil inexistente: mesma estrutura, sem dados e sem criar registro. */
function emptyProfileView(): ProfileView {
  return {
    professional_title: null,
    professional_area: null,
    professional_subarea: null,
    desired_position: null,
    professional_level: null,
    contract_type: null,
    professional_summary: null,
    candidate_education: [],
    candidate_course: [],
    candidate_experience: [],
    candidate_skill: [],
    courses_none_declared_at: null,
    experience_none_declared_at: null,
    technical_skills_none_declared_at: null,
    updated_at: new Date(0),
  };
}

/** Texto opcional: undefined = não mexe; null/"" = limpa; senão trim(). */
function normalizeOptionalText(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeRequiredText(value: string): string {
  return value.trim();
}

/** Habilidade: trim + espaços internos colapsados. */
function normalizeSkillName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

@Injectable()
export class CandidateProfileService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------- leitura

  async getProfile(userId: number) {
    const record = await this.prisma.candidate_profile.upsert({
      where: { user_id: userId },
      create: { user_id: userId },
      update: {},
      include: profileInclude,
    });
    return this.toResponse(record);
  }

  /**
   * Leitura SOMENTE LEITURA do perfil (usada pelo Admin). Diferente de
   * getProfile, nunca cria a linha do perfil: sem registro, devolve a mesma
   * estrutura do contrato com tudo vazio.
   */
  async getProfileReadOnly(userId: number) {
    const record = await this.prisma.candidate_profile.findUnique({
      where: { user_id: userId },
      include: profileInclude,
    });
    return this.toResponse(record ?? emptyProfileView());
  }

  /**
   * Checagem server-side usada por outros fluxos (ex.: criação de entrevista
   * do Fluxo 03) para bloquear candidato com perfil incompleto.
   */
  async getCompleteness(userId: number): Promise<CompletenessResult> {
    const profile = await this.getProfile(userId);
    return {
      isComplete: profile.isComplete,
      missingSections: profile.missingSections,
      missingObjectiveFields: profile.missingObjectiveFields,
    };
  }

  // ----------------------------------------------------------------- perfil

  async updateProfile(userId: number, dto: UpdateCandidateProfileDto) {
    return this.mutate(userId, async (tx, profile) => {
      const data: Prisma.candidate_profileUncheckedUpdateInput = {
        updated_at: new Date(),
      };

      const title = normalizeOptionalText(dto.professionalTitle);
      if (title !== undefined) data.professional_title = title;
      const position = normalizeOptionalText(dto.desiredPosition);
      if (position !== undefined) data.desired_position = position;
      const summary = normalizeOptionalText(dto.professionalSummary);
      if (summary !== undefined) data.professional_summary = summary;
      if (dto.professionalLevel !== undefined) {
        data.professional_level =
          dto.professionalLevel as Prisma.candidate_profileUncheckedUpdateInput['professional_level'];
      }
      if (dto.contractType !== undefined) {
        data.contract_type =
          dto.contractType as Prisma.candidate_profileUncheckedUpdateInput['contract_type'];
      }

      // Área x subárea: valida o ESTADO RESULTANTE (campo ausente herda o atual).
      const nextArea =
        dto.professionalArea !== undefined
          ? dto.professionalArea
          : profile.professional_area;
      let nextSubarea =
        dto.professionalSubarea !== undefined
          ? dto.professionalSubarea
          : profile.professional_subarea;
      // Trocou a área e não mandou subárea: se a atual deixou de ser
      // compatível, ela é limpa (o candidato precisa escolher outra).
      if (
        dto.professionalArea !== undefined &&
        dto.professionalSubarea === undefined &&
        nextSubarea &&
        !isSubareaOfArea(nextArea, nextSubarea)
      ) {
        nextSubarea = null;
      }
      if (nextSubarea && !nextArea) {
        throw new BadRequestException('Escolha a área antes da subárea.');
      }
      if (nextSubarea && !isSubareaOfArea(nextArea, nextSubarea)) {
        throw new BadRequestException(
          'A subárea escolhida não pertence à área profissional.',
        );
      }
      if (
        dto.professionalArea !== undefined ||
        dto.professionalSubarea !== undefined
      ) {
        data.professional_area = nextArea ?? null;
        data.professional_subarea = nextSubarea ?? null;
      }

      await tx.candidate_profile.update({
        where: { candidate_profile_id: profile.candidate_profile_id },
        data,
      });
    });
  }

  // --------------------------------------------------------------- formação

  async addEducation(userId: number, dto: CreateEducationDto) {
    const degree = normalizeOptionalText(dto.degree) ?? null;
    const institution = normalizeRequiredText(dto.educationInstitution);
    const startDate = dto.startDate;
    const endDate = dto.endDate ?? null;
    this.assertRules(
      validateEducationRules({
        status: dto.status,
        academicLevel: dto.academicLevel,
        degree,
        educationInstitution: institution,
        startDate,
        endDate,
      }),
    );

    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const count = await tx.candidate_education.count({
        where: { candidate_profile_id: id },
      });
      if (count >= RECORD_LIMITS.educations) {
        throw new ConflictException(
          `Limite de ${RECORD_LIMITS.educations} formações atingido.`,
        );
      }
      await tx.candidate_education.create({
        data: {
          candidate_profile_id: id,
          degree,
          education_institution: institution,
          academic_level:
            dto.academicLevel as Prisma.candidate_educationUncheckedCreateInput['academic_level'],
          education_status:
            dto.status as Prisma.candidate_educationUncheckedCreateInput['education_status'],
          start_date: monthToDate(startDate),
          end_date: endDate ? monthToDate(endDate) : null,
        },
      });
      await this.touch(tx, id);
    });
  }

  async updateEducation(
    userId: number,
    educationId: number,
    dto: UpdateEducationDto,
  ) {
    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const current = await tx.candidate_education.findFirst({
        where: { education_id: educationId, candidate_profile_id: id },
      });
      if (!current) throw new NotFoundException('Formação não encontrada.');

      const status = dto.status ?? current.education_status;
      const academicLevel = dto.academicLevel ?? current.academic_level;
      const degree =
        dto.degree !== undefined
          ? (normalizeOptionalText(dto.degree) ?? null)
          : current.degree;
      const institution =
        dto.educationInstitution !== undefined
          ? normalizeRequiredText(dto.educationInstitution)
          : current.education_institution;
      const startDate = dto.startDate ?? dateToMonth(current.start_date);
      const endDate =
        dto.endDate !== undefined
          ? dto.endDate
          : nullableDateToMonth(current.end_date);
      this.assertRules(
        validateEducationRules({
          status,
          academicLevel,
          degree,
          educationInstitution: institution,
          startDate,
          endDate,
        }),
      );

      const data: Prisma.candidate_educationUncheckedUpdateInput = {
        updated_at: new Date(),
        education_status:
          status as Prisma.candidate_educationUncheckedUpdateInput['education_status'],
        academic_level:
          academicLevel as Prisma.candidate_educationUncheckedUpdateInput['academic_level'],
        degree,
        education_institution: institution,
        start_date: monthToDate(startDate),
        end_date: endDate ? monthToDate(endDate) : null,
      };
      await tx.candidate_education.update({
        where: { education_id: educationId },
        data,
      });
      await this.touch(tx, id);
    });
  }

  async removeEducation(userId: number, educationId: number) {
    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const { count } = await tx.candidate_education.deleteMany({
        where: { education_id: educationId, candidate_profile_id: id },
      });
      if (count === 0) throw new NotFoundException('Formação não encontrada.');
      await this.touch(tx, id);
    });
  }

  // ----------------------------------------------------------------- cursos

  async addCourse(userId: number, dto: CreateCourseDto) {
    const startDate = dto.startDate ?? null;
    const completedAt = dto.completedAt ?? null;
    this.assertRules(
      validateCourseRules({ status: dto.status, startDate, completedAt }),
    );

    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const count = await tx.candidate_course.count({
        where: { candidate_profile_id: id },
      });
      if (count >= RECORD_LIMITS.courses) {
        throw new ConflictException(
          `Limite de ${RECORD_LIMITS.courses} cursos atingido.`,
        );
      }
      await tx.candidate_course.create({
        data: {
          candidate_profile_id: id,
          course_name: normalizeRequiredText(dto.courseName),
          course_institution:
            normalizeOptionalText(dto.courseInstitution) ?? null,
          workload_hours: dto.workloadHours ?? null,
          course_status:
            dto.status as Prisma.candidate_courseUncheckedCreateInput['course_status'],
          start_date: startDate ? monthToDate(startDate) : null,
          completed_at: completedAt ? monthToDate(completedAt) : null,
        },
      });
      // Adicionar registro real limpa a declaração "não possuo cursos".
      await this.touch(tx, id, { courses_none_declared_at: null });
    });
  }

  async updateCourse(userId: number, courseId: number, dto: UpdateCourseDto) {
    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const current = await tx.candidate_course.findFirst({
        where: { course_id: courseId, candidate_profile_id: id },
      });
      if (!current) throw new NotFoundException('Curso não encontrado.');

      const completedAt =
        dto.completedAt !== undefined
          ? dto.completedAt
          : nullableDateToMonth(current.completed_at);
      const startDate =
        dto.startDate !== undefined
          ? dto.startDate
          : nullableDateToMonth(current.start_date);
      const status = dto.status ?? current.course_status;
      this.assertRules(validateCourseRules({ status, startDate, completedAt }));

      const data: Prisma.candidate_courseUncheckedUpdateInput = {
        updated_at: new Date(),
        course_status:
          status as Prisma.candidate_courseUncheckedUpdateInput['course_status'],
        start_date: startDate ? monthToDate(startDate) : null,
        completed_at: completedAt ? monthToDate(completedAt) : null,
      };
      if (dto.courseName !== undefined) {
        data.course_name = normalizeRequiredText(dto.courseName);
      }
      if (dto.courseInstitution !== undefined) {
        data.course_institution = normalizeOptionalText(dto.courseInstitution);
      }
      if (dto.workloadHours !== undefined) {
        data.workload_hours = dto.workloadHours;
      }
      await tx.candidate_course.update({
        where: { course_id: courseId },
        data,
      });
      await this.touch(tx, id);
    });
  }

  async removeCourse(userId: number, courseId: number) {
    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const { count } = await tx.candidate_course.deleteMany({
        where: { course_id: courseId, candidate_profile_id: id },
      });
      if (count === 0) throw new NotFoundException('Curso não encontrado.');
      // Remover o último registro NÃO recria a declaração.
      await this.touch(tx, id);
    });
  }

  // ------------------------------------------------------------ experiências

  async addExperience(userId: number, dto: CreateExperienceDto) {
    const endDate = dto.endDate ?? null;
    this.assertRules(
      validateExperienceRules({
        isCurrent: dto.isCurrent,
        startDate: dto.startDate,
        endDate,
      }),
    );

    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const count = await tx.candidate_experience.count({
        where: { candidate_profile_id: id },
      });
      if (count >= RECORD_LIMITS.experiences) {
        throw new ConflictException(
          `Limite de ${RECORD_LIMITS.experiences} experiências atingido.`,
        );
      }
      await tx.candidate_experience.create({
        data: {
          candidate_profile_id: id,
          company_name: normalizeRequiredText(dto.companyName),
          job_role: normalizeRequiredText(dto.jobRole),
          start_date: monthToDate(dto.startDate),
          end_date: endDate ? monthToDate(endDate) : null,
          is_current: dto.isCurrent,
          description: normalizeOptionalText(dto.description) ?? null,
        },
      });
      await this.touch(tx, id, { experience_none_declared_at: null });
    });
  }

  async updateExperience(
    userId: number,
    experienceId: number,
    dto: UpdateExperienceDto,
  ) {
    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const current = await tx.candidate_experience.findFirst({
        where: { experience_id: experienceId, candidate_profile_id: id },
      });
      if (!current) throw new NotFoundException('Experiência não encontrada.');

      const isCurrent = dto.isCurrent ?? current.is_current;
      const startDate = dto.startDate ?? dateToMonth(current.start_date);
      let endDate =
        dto.endDate !== undefined
          ? dto.endDate
          : nullableDateToMonth(current.end_date);
      // Marcou como atual sem informar término: o término antigo deixa de valer.
      if (isCurrent && dto.endDate === undefined) endDate = null;
      this.assertRules(
        validateExperienceRules({ isCurrent, startDate, endDate }),
      );

      const data: Prisma.candidate_experienceUncheckedUpdateInput = {
        updated_at: new Date(),
        is_current: isCurrent,
        start_date: monthToDate(startDate),
        end_date: endDate ? monthToDate(endDate) : null,
      };
      if (dto.companyName !== undefined) {
        data.company_name = normalizeRequiredText(dto.companyName);
      }
      if (dto.jobRole !== undefined) {
        data.job_role = normalizeRequiredText(dto.jobRole);
      }
      if (dto.description !== undefined) {
        data.description = normalizeOptionalText(dto.description);
      }
      await tx.candidate_experience.update({
        where: { experience_id: experienceId },
        data,
      });
      await this.touch(tx, id);
    });
  }

  async removeExperience(userId: number, experienceId: number) {
    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const { count } = await tx.candidate_experience.deleteMany({
        where: { experience_id: experienceId, candidate_profile_id: id },
      });
      if (count === 0) {
        throw new NotFoundException('Experiência não encontrada.');
      }
      await this.touch(tx, id);
    });
  }

  // ------------------------------------------------------------ habilidades

  async addSkill(userId: number, dto: CreateSkillDto) {
    const name = normalizeSkillName(dto.name);
    const skillType =
      dto.type as Prisma.candidate_skillUncheckedCreateInput['skill_type'];

    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const count = await tx.candidate_skill.count({
        where: { candidate_profile_id: id, skill_type: skillType },
      });
      if (count >= RECORD_LIMITS.skillsPerType) {
        throw new ConflictException(
          `Limite de ${RECORD_LIMITS.skillsPerType} habilidades por tipo atingido.`,
        );
      }
      const duplicate = await tx.candidate_skill.findFirst({
        where: {
          candidate_profile_id: id,
          skill_type: skillType,
          skill_name: { equals: name, mode: 'insensitive' },
        },
        select: { skill_id: true },
      });
      if (duplicate) {
        throw new ConflictException('Essa habilidade já foi adicionada.');
      }
      await tx.candidate_skill.create({
        data: {
          candidate_profile_id: id,
          skill_type: skillType,
          skill_name: name,
        },
      });
      // Só habilidade TÉCNICA limpa a declaração; comportamental não tem declaração.
      await this.touch(
        tx,
        id,
        dto.type === 'TECHNICAL'
          ? { technical_skills_none_declared_at: null }
          : undefined,
      );
    });
  }

  async removeSkill(userId: number, skillId: number) {
    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const { count } = await tx.candidate_skill.deleteMany({
        where: { skill_id: skillId, candidate_profile_id: id },
      });
      if (count === 0) throw new NotFoundException('Habilidade não encontrada.');
      await this.touch(tx, id);
    });
  }

  // ------------------------------------------------------------- declarações

  /** Declara "não possuo" — recusado (409) se já houver registros na seção. */
  async declareNone(userId: number, section: DeclarationSection) {
    return this.mutate(userId, async (tx, profile) => {
      const id = profile.candidate_profile_id;
      const total = await this.countSection(tx, id, section);
      if (total > 0) {
        throw new ConflictException(
          'Remova os registros desta seção antes de declarar que não possui.',
        );
      }
      // Idempotente: já declarado mantém o timestamp original.
      if (declaredAt(profile, section)) return;
      await this.touch(tx, id, declarationPatch(section, new Date()));
    });
  }

  /** Remove a declaração (volta a "não declarou"). Idempotente. */
  async removeDeclaration(userId: number, section: DeclarationSection) {
    return this.mutate(userId, async (tx, profile) => {
      await this.touch(
        tx,
        profile.candidate_profile_id,
        declarationPatch(section, null),
      );
    });
  }

  // ---------------------------------------------------------------- internos

  private countSection(
    tx: Db,
    profileId: number,
    section: DeclarationSection,
  ): Promise<number> {
    switch (section) {
      case 'courses':
        return tx.candidate_course.count({
          where: { candidate_profile_id: profileId },
        });
      case 'experience':
        return tx.candidate_experience.count({
          where: { candidate_profile_id: profileId },
        });
      case 'technicalSkills':
        return tx.candidate_skill.count({
          where: { candidate_profile_id: profileId, skill_type: 'TECHNICAL' },
        });
    }
  }

  /**
   * Toda escrita roda em transação, com o perfil travado (FOR UPDATE) para
   * serializar escritas concorrentes do mesmo candidato — é o que protege a
   * invariante "declaração x registros". Devolve o perfil completo já
   * recalculado (isComplete/missingSections).
   */
  private async mutate(
    userId: number,
    fn: (tx: Db, profile: candidate_profile) => Promise<void>,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const profile = await tx.candidate_profile.upsert({
          where: { user_id: userId },
          create: { user_id: userId },
          update: {},
        });
        await tx.$queryRaw`SELECT candidate_profile_id FROM candidate_profile WHERE candidate_profile_id = ${profile.candidate_profile_id} FOR UPDATE`;
        await fn(tx, profile);
        const record = await tx.candidate_profile.findUniqueOrThrow({
          where: { candidate_profile_id: profile.candidate_profile_id },
          include: profileInclude,
        });
        return this.toResponse(record);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Registro duplicado.');
      }
      throw error;
    }
  }

  private async touch(
    tx: Db,
    profileId: number,
    extra?: Prisma.candidate_profileUncheckedUpdateInput,
  ) {
    await tx.candidate_profile.update({
      where: { candidate_profile_id: profileId },
      data: { ...extra, updated_at: new Date() },
    });
  }

  private assertRules(errors: string[]) {
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

  private toResponse(record: ProfileView) {
    const technicalSkills = record.candidate_skill.filter(
      (skill) => skill.skill_type === 'TECHNICAL',
    );
    const behavioralSkills = record.candidate_skill.filter(
      (skill) => skill.skill_type === 'BEHAVIORAL',
    );

    const completeness = evaluateProfileCompleteness({
      professionalTitle: record.professional_title,
      professionalArea: record.professional_area,
      professionalSubarea: record.professional_subarea,
      desiredPosition: record.desired_position,
      professionalLevel: record.professional_level,
      contractType: record.contract_type,
      professionalSummary: record.professional_summary,
      educationCount: record.candidate_education.length,
      courseCount: record.candidate_course.length,
      experienceCount: record.candidate_experience.length,
      technicalSkillCount: technicalSkills.length,
      behavioralSkillCount: behavioralSkills.length,
      coursesNoneDeclaredAt: record.courses_none_declared_at,
      experienceNoneDeclaredAt: record.experience_none_declared_at,
      technicalSkillsNoneDeclaredAt: record.technical_skills_none_declared_at,
    });

    return {
      professionalTitle: record.professional_title,
      professionalArea: record.professional_area,
      professionalSubarea: record.professional_subarea,
      desiredPosition: record.desired_position,
      professionalLevel: record.professional_level,
      contractType: record.contract_type,
      professionalSummary: record.professional_summary,
      educations: record.candidate_education.map((item) => ({
        id: item.education_id,
        degree: item.degree,
        educationInstitution: item.education_institution,
        academicLevel: item.academic_level,
        status: item.education_status,
        startDate: dateToMonth(item.start_date),
        endDate: nullableDateToMonth(item.end_date),
      })),
      courses: record.candidate_course.map((item) => ({
        id: item.course_id,
        courseName: item.course_name,
        courseInstitution: item.course_institution,
        workloadHours: item.workload_hours,
        status: item.course_status,
        startDate: nullableDateToMonth(item.start_date),
        completedAt: nullableDateToMonth(item.completed_at),
      })),
      experiences: record.candidate_experience.map((item) => ({
        id: item.experience_id,
        companyName: item.company_name,
        jobRole: item.job_role,
        startDate: dateToMonth(item.start_date),
        endDate: nullableDateToMonth(item.end_date),
        isCurrent: item.is_current,
        description: item.description,
      })),
      technicalSkills: technicalSkills.map((item) => ({
        id: item.skill_id,
        name: item.skill_name,
      })),
      behavioralSkills: behavioralSkills.map((item) => ({
        id: item.skill_id,
        name: item.skill_name,
      })),
      declarations: {
        noCourses: record.courses_none_declared_at !== null,
        noExperience: record.experience_none_declared_at !== null,
        noTechnicalSkills: record.technical_skills_none_declared_at !== null,
      },
      isComplete: completeness.isComplete,
      missingSections: completeness.missingSections,
      missingObjectiveFields: completeness.missingObjectiveFields,
      updatedAt: record.updated_at.toISOString(),
    };
  }
}
