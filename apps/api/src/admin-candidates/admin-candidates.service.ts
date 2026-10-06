import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CandidateProfileService } from '../candidate-profile/candidate-profile.service';
import { PrismaService } from '../prisma/prisma.service';

// Limite de segurança da listagem. A tela do Admin filtra no Front; quando a
// base crescer, a paginação entra aqui sem mudar o contrato de cada item.
const MAX_LIST_SIZE = 500;
const MAX_USER_ID = 2147483647;

// `select` explícito (nunca `include`): garante que `password_hash`, sessões,
// tokens de ativação e aceites de termos jamais saiam do banco nesta rota.
const candidateSelect = {
  user_id: true,
  name: true,
  email: true,
  account_status: true,
  onboarding_completed_at: true,
  created_at: true,
  updated_at: true,
  candidate_profile: {
    select: {
      professional_title: true,
      city: true,
      state: true,
    },
  },
} satisfies Prisma.app_userSelect;

type CandidateRecord = Prisma.app_userGetPayload<{
  select: typeof candidateSelect;
}>;

function toAdminCandidate(record: CandidateRecord) {
  return {
    id: record.user_id,
    name: record.name,
    email: record.email,
    accountStatus: record.account_status,
    onboardingCompleted: record.onboarding_completed_at !== null,
    onboardingCompletedAt: record.onboarding_completed_at,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    profile: record.candidate_profile
      ? {
          professionalTitle: record.candidate_profile.professional_title,
          city: record.candidate_profile.city,
          state: record.candidate_profile.state,
        }
      : null,
  };
}

@Injectable()
export class AdminCandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidateProfileService: CandidateProfileService,
  ) {}

  async list() {
    const where: Prisma.app_userWhereInput = { user_role: 'CANDIDATE' };

    const [records, total] = await Promise.all([
      this.prisma.app_user.findMany({
        where,
        select: candidateSelect,
        orderBy: [{ created_at: 'desc' }, { user_id: 'desc' }],
        take: MAX_LIST_SIZE,
      }),
      this.prisma.app_user.count({ where }),
    ]);

    return {
      total,
      candidates: records.map(toAdminCandidate),
    };
  }

  async getById(id: number) {
    if (!Number.isInteger(id) || id < 1 || id > MAX_USER_ID) {
      throw new NotFoundException('Candidato não encontrado');
    }

    // Filtra por `user_role: 'CANDIDATE'`: o id de um avaliador ou admin
    // responde 404, nunca os dados dessa conta.
    const record = await this.prisma.app_user.findFirst({
      where: { user_id: id, user_role: 'CANDIDATE' },
      select: candidateSelect,
    });

    if (!record) {
      throw new NotFoundException('Candidato não encontrado');
    }

    return toAdminCandidate(record);
  }

  /**
   * Perfil Profissional completo, SOMENTE LEITURA. Reaproveita a serialização
   * e a completude do CandidateProfileService (sem upsert). Id de conta que
   * não é CANDIDATE responde 404.
   */
  async getProfile(id: number) {
    if (!Number.isInteger(id) || id < 1 || id > MAX_USER_ID) {
      throw new NotFoundException('Candidato não encontrado');
    }

    const user = await this.prisma.app_user.findFirst({
      where: { user_id: id, user_role: 'CANDIDATE' },
      select: { user_id: true },
    });

    if (!user) {
      throw new NotFoundException('Candidato não encontrado');
    }

    return this.candidateProfileService.getProfileReadOnly(user.user_id);
  }
}
