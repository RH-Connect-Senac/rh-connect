import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

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
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const password_hash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.app_user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password_hash,
        user_role: 'CANDIDATE',
        account_status: 'ACTIVE',
      },
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

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    const token = this.jwt.sign({
      sub: user.user_id,
      email: user.email,
      role: user.user_role,
    });

    return { user: this.toPublicUser(user), token };
  }

  async getById(userId: number) {
    const user = await this.prisma.app_user.findUniqueOrThrow({
      where: { user_id: userId },
    });
    return this.toPublicUser(user);
  }
}