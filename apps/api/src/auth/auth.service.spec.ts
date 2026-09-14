jest.mock('@nestjs/jwt', () => ({
  JwtService: class {},
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: {
    app_user: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    session: {
      create: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
    account_activation_token: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let tx: {
    app_user: { create: jest.Mock; update: jest.Mock };
    candidate_profile: { create: jest.Mock };
    evaluator_profile: { create: jest.Mock };
    account_activation_token: { create: jest.Mock; update: jest.Mock };
  };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    tx = {
      app_user: { create: jest.fn(), update: jest.fn() },
      candidate_profile: { create: jest.fn() },
      evaluator_profile: { create: jest.fn() },
      account_activation_token: { create: jest.fn(), update: jest.fn() },
    };

    prisma = {
      app_user: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      account_activation_token: { findUnique: jest.fn() },
      $transaction: jest.fn((callback) => callback(tx)),
    };

    jwtService = { sign: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('register', () => {
    it('deve lançar ConflictException se o e-mail já existir', async () => {
      prisma.app_user.findUnique.mockResolvedValue({ user_id: 1 });

      await expect(
        authService.register({
          name: 'Teste',
          email: 'ja-existe@rhconnect.com',
          password: 'senha123',
        }),
      ).rejects.toThrow(ConflictException);

      expect(tx.app_user.create).not.toHaveBeenCalled();
    });

    it('deve criar o usuário e o candidate_profile quando os dados são válidos', async () => {
      prisma.app_user.findUnique.mockResolvedValue(null);

      tx.app_user.create.mockResolvedValue({
        user_id: 10,
        name: 'Nome Teste',
        email: 'novo@rhconnect.com',
        user_role: 'CANDIDATE',
        account_status: 'ACTIVE',
        onboarding_completed_at: null,
      });

      const result = await authService.register({
        name: 'Nome Teste',
        email: 'novo@rhconnect.com',
        password: 'senha123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('senha123', 10);

      expect(tx.app_user.create).toHaveBeenCalledWith({
        data: {
          name: 'Nome Teste',
          email: 'novo@rhconnect.com',
          password_hash: 'hashed-password',
          user_role: 'CANDIDATE',
          account_status: 'ACTIVE',
        },
      });

      expect(tx.candidate_profile.create).toHaveBeenCalledWith({
        data: { user_id: 10 },
      });

      expect(result).toEqual({
        id: 10,
        name: 'Nome Teste',
        email: 'novo@rhconnect.com',
        role: 'CANDIDATE',
        accountStatus: 'ACTIVE',
        onboardingCompleted: false,
      });

      expect(result).not.toHaveProperty('password_hash');
    });
  });

  describe('login', () => {
    const validUser = {
      user_id: 5,
      name: 'Usuário Teste',
      email: 'usuario@rhconnect.com',
      password_hash: 'hash-salvo-no-banco',
      user_role: 'CANDIDATE',
      account_status: 'ACTIVE',
      onboarding_completed_at: new Date(),
    };

    it('deve lançar UnauthorizedException se o e-mail não existir', async () => {
      prisma.app_user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'naoexiste@rhconnect.com',
          password: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se o usuário não tiver senha definida', async () => {
      prisma.app_user.findUnique.mockResolvedValue({
        ...validUser,
        password_hash: null,
      });

      await expect(
        authService.login({ email: validUser.email, password: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se a conta não estiver ACTIVE', async () => {
      prisma.app_user.findUnique.mockResolvedValue({
        ...validUser,
        account_status: 'INVITED',
      });

      await expect(
        authService.login({ email: validUser.email, password: '123456' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se a senha estiver incorreta', async () => {
      prisma.app_user.findUnique.mockResolvedValue(validUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: validUser.email, password: 'senhaerrada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve fazer login com sucesso e criar a sessão', async () => {
      prisma.app_user.findUnique.mockResolvedValue(validUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.session.create.mockResolvedValue({});
      jwtService.sign.mockReturnValue('token-assinado');

      const result = await authService.login({
        email: validUser.email,
        password: 'senhaCorreta',
      });

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: validUser.user_id,
        email: validUser.email,
        role: validUser.user_role,
      });

      expect(prisma.session.create).toHaveBeenCalledTimes(1);

      expect(result.token).toBe('token-assinado');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe(validUser.email);
      expect(result.user).not.toHaveProperty('password_hash');
    });
  });

  describe('refresh', () => {
    it('deve lançar UnauthorizedException se não vier refresh token', async () => {
      await expect(authService.refresh('')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar UnauthorizedException se a sessão não for encontrada', async () => {
      prisma.session.findFirst.mockResolvedValue(null);

      await expect(authService.refresh('token-qualquer')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar UnauthorizedException se o refresh token estiver expirado', async () => {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);

      prisma.session.findFirst.mockResolvedValue({
        expires_at: ontem,
        app_user: {
          account_status: 'ACTIVE',
          user_id: 1,
          email: 'a@a.com',
          user_role: 'CANDIDATE',
        },
      });

      await expect(authService.refresh('token-expirado')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar UnauthorizedException se o usuário não estiver ACTIVE', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);

      prisma.session.findFirst.mockResolvedValue({
        expires_at: amanha,
        app_user: {
          account_status: 'BLOCKED',
          user_id: 1,
          email: 'a@a.com',
          user_role: 'CANDIDATE',
        },
      });

      await expect(authService.refresh('token-valido')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve gerar um novo access token quando tudo estiver certo', async () => {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);

      prisma.session.findFirst.mockResolvedValue({
        expires_at: amanha,
        app_user: {
          account_status: 'ACTIVE',
          user_id: 7,
          email: 'ativo@rhconnect.com',
          user_role: 'CANDIDATE',
        },
      });

      jwtService.sign.mockReturnValue('novo-token');

      const result = await authService.refresh('token-valido');

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 7,
        email: 'ativo@rhconnect.com',
        role: 'CANDIDATE',
      });

      expect(result.token).toBe('novo-token');
    });
  });

  describe('logout', () => {
    it('não deve fazer nada se não vier refresh token', async () => {
      await authService.logout('');

      expect(prisma.session.updateMany).not.toHaveBeenCalled();
    });

    it('deve revogar a sessão quando vier um refresh token', async () => {
      prisma.session.updateMany.mockResolvedValue({ count: 1 });

      await authService.logout('token-qualquer');

      expect(prisma.session.updateMany).toHaveBeenCalledTimes(1);

      const chamada = prisma.session.updateMany.mock.calls[0][0];
      expect(chamada.data.revoked_at).toBeInstanceOf(Date);
      expect(chamada.where.revoked_at).toBeNull();
    });
  });

  describe('inviteEvaluator', () => {
    it('deve lançar ConflictException se o e-mail já existir', async () => {
      prisma.app_user.findUnique.mockResolvedValue({ user_id: 1 });

      await expect(
        authService.inviteEvaluator({
          name: 'Avaliador Teste',
          email: 'ja-existe@rhconnect.com',
        }),
      ).rejects.toThrow(ConflictException);

      expect(tx.app_user.create).not.toHaveBeenCalled();
    });

    it('deve criar o usuário INVITED, o evaluator_profile e o token de ativação', async () => {
      prisma.app_user.findUnique.mockResolvedValue(null);

      tx.app_user.create.mockResolvedValue({
        user_id: 20,
        name: 'Avaliador Novo',
        email: 'avaliador-novo@rhconnect.com',
        user_role: 'EVALUATOR',
        account_status: 'INVITED',
        onboarding_completed_at: null,
      });

      const result = await authService.inviteEvaluator({
        name: 'Avaliador Novo',
        email: 'avaliador-novo@rhconnect.com',
        area: 'Backend',
      });

      expect(tx.app_user.create).toHaveBeenCalledWith({
        data: {
          name: 'Avaliador Novo',
          email: 'avaliador-novo@rhconnect.com',
          password_hash: null,
          user_role: 'EVALUATOR',
          account_status: 'INVITED',
        },
      });

      expect(tx.evaluator_profile.create).toHaveBeenCalledWith({
        data: {
          user_id: 20,
          area: 'Backend',
          specialization: undefined,
        },
      });

      expect(tx.account_activation_token.create).toHaveBeenCalledTimes(1);
      const chamada = tx.account_activation_token.create.mock.calls[0][0];
      expect(chamada.data.user_id).toBe(20);
      expect(chamada.data.token_purpose).toBe('EVALUATOR_INVITE');

      expect(result.user.accountStatus).toBe('INVITED');
      expect(result.user.role).toBe('EVALUATOR');
    });
  });

  describe('activateEvaluator', () => {
    const baseToken = {
      activation_token_id: 'token-uuid',
      user_id: 30,
      token_purpose: 'EVALUATOR_INVITE',
      used_at: null,
      expires_at: (() => {
        const amanha = new Date();
        amanha.setDate(amanha.getDate() + 1);
        return amanha;
      })(),
      app_user: {
        user_role: 'EVALUATOR',
        account_status: 'INVITED',
      },
    };

    it('deve lançar UnauthorizedException se o token não existir', async () => {
      prisma.account_activation_token.findUnique.mockResolvedValue(null);

      await expect(
        authService.activateEvaluator({
          token: 'token-invalido',
          password: 'novaSenha123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se o purpose for diferente de EVALUATOR_INVITE', async () => {
      prisma.account_activation_token.findUnique.mockResolvedValue({
        ...baseToken,
        token_purpose: 'PASSWORD_RESET',
      });

      await expect(
        authService.activateEvaluator({
          token: 'token-x',
          password: 'novaSenha123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se o token já tiver sido usado', async () => {
      prisma.account_activation_token.findUnique.mockResolvedValue({
        ...baseToken,
        used_at: new Date(),
      });

      await expect(
        authService.activateEvaluator({
          token: 'token-x',
          password: 'novaSenha123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se o token estiver expirado', async () => {
      const ontem = new Date();
      ontem.setDate(ontem.getDate() - 1);

      prisma.account_activation_token.findUnique.mockResolvedValue({
        ...baseToken,
        expires_at: ontem,
      });

      await expect(
        authService.activateEvaluator({
          token: 'token-x',
          password: 'novaSenha123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se o usuário não estiver mais INVITED/EVALUATOR', async () => {
      prisma.account_activation_token.findUnique.mockResolvedValue({
        ...baseToken,
        app_user: { user_role: 'EVALUATOR', account_status: 'ACTIVE' },
      });

      await expect(
        authService.activateEvaluator({
          token: 'token-x',
          password: 'novaSenha123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve ativar a conta com sucesso quando tudo estiver certo', async () => {
      prisma.account_activation_token.findUnique.mockResolvedValue(baseToken);

      tx.app_user.update.mockResolvedValue({
        user_id: 30,
        name: 'Avaliador Ativado',
        email: 'avaliador@rhconnect.com',
        user_role: 'EVALUATOR',
        account_status: 'ACTIVE',
        onboarding_completed_at: null,
      });

      const result = await authService.activateEvaluator({
        token: 'token-x',
        password: 'novaSenha123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('novaSenha123', 10);

      expect(tx.app_user.update).toHaveBeenCalledWith({
        where: { user_id: 30 },
        data: {
          password_hash: 'hashed-password',
          account_status: 'ACTIVE',
        },
      });

      expect(tx.account_activation_token.update).toHaveBeenCalledWith({
        where: { activation_token_id: 'token-uuid' },
        data: { used_at: expect.any(Date) },
      });

      expect(result.accountStatus).toBe('ACTIVE');
    });
  });

  describe('completeOnboarding', () => {
    it('deve marcar o onboarding como concluído', async () => {
      prisma.app_user.update.mockResolvedValue({
        user_id: 40,
        name: 'Usuário Onboarding',
        email: 'onboarding@rhconnect.com',
        user_role: 'CANDIDATE',
        account_status: 'ACTIVE',
        onboarding_completed_at: new Date(),
      });

      const result = await authService.completeOnboarding(40);

      expect(prisma.app_user.update).toHaveBeenCalledWith({
        where: { user_id: 40 },
        data: { onboarding_completed_at: expect.any(Date) },
      });

      expect(result.onboardingCompleted).toBe(true);
    });
  });
});
