import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) { }

  private toPublicUser(user: {
    user_id: number;
    name: string;
    email: string;
    user_role: string;
    account_status: string;
    onboarding_completed_at: Date | null;
  }) {
    return {
      id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.user_role,
      accountStatus: user.account_status,
      onboardingCompleted: user.onboarding_completed_at !== null,
    };
  }

  async register(dto: { name: string; email: string; password: string }) {
    const existing = await this.prisma.app_user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const password_hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.app_user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password_hash,
          user_role: 'CANDIDATE',
          account_status: 'ACTIVE',
        },
      });

      await tx.candidate_profile.create({
        data: {
          user_id: newUser.user_id,
        },
      });

      return newUser;
    });

    return this.toPublicUser(user);
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.prisma.app_user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (user.account_status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuário não está ativo');
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);

    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const accessToken = this.jwt.sign({
      sub: user.user_id,
      email: user.email,
      role: user.user_role,
    });

    const refreshToken = randomBytes(64).toString('hex');

    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.session.create({
      data: {
        user_id: user.user_id,
        refresh_token_hash: refreshTokenHash,
        expires_at: expiresAt,
      },
    });

    return {
      user: this.toPublicUser(user),
      token: accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não informado');
    }

    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const session = await this.prisma.session.findFirst({
      where: {
        refresh_token_hash: refreshTokenHash,
        revoked_at: null,
      },
      include: {
        app_user: true,
      },
    });

    if (!session) {
      throw new UnauthorizedException('Sessão inválida');
    }

    if (session.expires_at <= new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    if (session.app_user.account_status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuário não está ativo');
    }

    const accessToken = this.jwt.sign({
      sub: session.app_user.user_id,
      email: session.app_user.email,
      role: session.app_user.user_role,
    });

    return {
      token: accessToken,
    };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) {
      return;
    }

    const refreshTokenHash = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.session.updateMany({
      where: {
        refresh_token_hash: refreshTokenHash,
        revoked_at: null,
      },
      data: {
        revoked_at: new Date(),
      },
    });
  }

  async getById(userId: number) {
    const user = await this.prisma.app_user.findUniqueOrThrow({
      where: { user_id: userId },
    });

    return this.toPublicUser(user);
  }

  async inviteEvaluator(dto: {
    name: string;
    email: string;
    area?: string;
    specialization?: string;
  }) {
    const existing = await this.prisma.app_user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('E-mail já cadastrado');
    }

    const rawToken = randomBytes(32).toString('hex');

    const tokenHash = createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const evaluator = await this.prisma.$transaction(async (tx) => {
      const user = await tx.app_user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password_hash: null,
          user_role: 'EVALUATOR',
          account_status: 'INVITED',
        },
      });

      await tx.evaluator_profile.create({
        data: {
          user_id: user.user_id,
          area: dto.area,
          specialization: dto.specialization,
        },
      });

      await tx.account_activation_token.create({
        data: {
          user_id: user.user_id,
          token_hash: tokenHash,
          token_purpose: 'EVALUATOR_INVITE',
          expires_at: expiresAt,
        },
      });

      return user;
    });

    return {
      user: this.toPublicUser(evaluator),
    };
  }

  async activateEvaluator(dto: {
    token: string;
    password: string;
  }) {
    const tokenHash = createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const activationToken =
      await this.prisma.account_activation_token.findUnique({
        where: { token_hash: tokenHash },
        include: { app_user: true },
      });

    if (!activationToken) {
      throw new UnauthorizedException('Token de ativação inválido');
    }

    if (activationToken.token_purpose !== 'EVALUATOR_INVITE') {
      throw new UnauthorizedException('Token inválido para ativação');
    }

    if (activationToken.used_at) {
      throw new UnauthorizedException('Token de ativação já utilizado');
    }

    if (activationToken.expires_at <= new Date()) {
      throw new UnauthorizedException('Token de ativação expirado');
    }

    if (
      activationToken.app_user.user_role !== 'EVALUATOR' ||
      activationToken.app_user.account_status !== 'INVITED'
    ) {
      throw new UnauthorizedException('Usuário não pode ser ativado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const updatedUser = await tx.app_user.update({
        where: { user_id: activationToken.user_id },
        data: {
          password_hash: passwordHash,
          account_status: 'ACTIVE',
        },
      });

      await tx.account_activation_token.update({
        where: {
          activation_token_id: activationToken.activation_token_id,
        },
        data: {
          used_at: new Date(),
        },
      });

      return updatedUser;
    });

    return this.toPublicUser(user);
  }

  async completeOnboarding(userId: number) {
    const user = await this.prisma.app_user.update({
      where: { user_id: userId },
      data: {
        onboarding_completed_at: new Date(),
      },
    });

    return this.toPublicUser(user);
  }
}