import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: (req: Request) =>
        req?.cookies?.access_token ?? null,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: { sub: number; email: string; role: string }) {
    const user = await this.prisma.app_user.findUnique({
      where: {
        user_id: Number(payload.sub),
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (user.account_status !== 'ACTIVE') {
      throw new UnauthorizedException('Usuário não está ativo');
    }

    return {
      id: user.user_id,
      email: user.email,
      role: user.user_role,
    };
  }
}
