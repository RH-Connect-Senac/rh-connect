jest.mock('@nestjs/passport', () => ({
  PassportStrategy: () =>
    class {
      constructor(..._args: unknown[]) {}
    },
}));

import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../prisma/prisma.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prisma: { app_user: { findUnique: jest.Mock } };

  beforeEach(() => {
    process.env.JWT_SECRET = 'segredo-de-teste';

    prisma = {
      app_user: { findUnique: jest.fn() },
    };

    strategy = new JwtStrategy(prisma as unknown as PrismaService);
  });

  it('deve lançar UnauthorizedException se o usuário não existir', async () => {
    prisma.app_user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 1, email: 'a@a.com', role: 'CANDIDATE' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve lançar UnauthorizedException se o usuário não estiver ACTIVE', async () => {
    prisma.app_user.findUnique.mockResolvedValue({
      user_id: 1,
      email: 'a@a.com',
      user_role: 'CANDIDATE',
      account_status: 'BLOCKED',
    });

    await expect(
      strategy.validate({ sub: 1, email: 'a@a.com', role: 'CANDIDATE' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve retornar os dados do usuário quando tudo estiver certo', async () => {
    prisma.app_user.findUnique.mockResolvedValue({
      user_id: 1,
      email: 'ativo@rhconnect.com',
      user_role: 'CANDIDATE',
      account_status: 'ACTIVE',
    });

    const result = await strategy.validate({
      sub: 1,
      email: 'ativo@rhconnect.com',
      role: 'CANDIDATE',
    });

    expect(result).toEqual({
      id: 1,
      email: 'ativo@rhconnect.com',
      role: 'CANDIDATE',
    });
  });
});
