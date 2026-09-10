import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { hashPassword } from '../password';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: randomUUID(),
    name: 'Usuário Demo',
    email: 'demo@rhconnect.com',
    passwordHash: hashPassword('senha123'),
    role: 'CANDIDATE',
    accountStatus: 'ACTIVE',
    onboardingCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  let service: AuthService;
  const signAsync = jest.fn().mockResolvedValue('signed-token');
  const user = {
    create: jest.fn(),
    findUnique: jest.fn(),
  };
  const prismaService = { user } as unknown as PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    signAsync.mockResolvedValue('signed-token');

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: { signAsync } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('cria um usuário CANDIDATE sem expor passwordHash', async () => {
      user.create.mockResolvedValue(buildUser());

      const created = await service.register({
        name: 'Novo Candidato',
        email: 'novo@rhconnect.com',
        password: 'senha123',
      });

      expect(created.role).toBe('CANDIDATE');
      expect(created.accountStatus).toBe('ACTIVE');
      expect(created.onboardingCompleted).toBe(false);
      expect(created).not.toHaveProperty('passwordHash');

      const createArgs = user.create.mock.calls[0][0];
      expect(createArgs.data.email).toBe('novo@rhconnect.com');
      expect(createArgs.data.role).toBe('CANDIDATE');
    });

    it('trata e-mail duplicado (P2002) como conflito 409', async () => {
      user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: Prisma.prismaVersion.client,
        }),
      );

      await expect(
        service.register({
          name: 'Duplicado',
          email: 'duplicado@rhconnect.com',
          password: 'senha123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejeita e-mail inválido sem chamar o banco', async () => {
      await expect(
        service.register({ name: 'João', email: 'invalido', password: 'senha123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.create).not.toHaveBeenCalled();
    });

    it('rejeita senha curta sem chamar o banco', async () => {
      await expect(
        service.register({
          name: 'João',
          email: 'joao@rhconnect.com',
          password: '123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('autentica usuário e assina token com sub/email/role', async () => {
      const stored = buildUser({ email: 'candidato@rhconnect.com', role: 'CANDIDATE' });
      user.findUnique.mockResolvedValue(stored);

      const result = await service.login({
        email: 'candidato@rhconnect.com',
        password: 'senha123',
      });

      expect(result.accessToken).toBe('signed-token');
      expect(result.user.role).toBe('CANDIDATE');
      expect(result.user).not.toHaveProperty('passwordHash');

      const signedPayload = signAsync.mock.calls[0][0];
      expect(signedPayload).toMatchObject({
        email: 'candidato@rhconnect.com',
        role: 'CANDIDATE',
      });
      expect(signedPayload.sub).toBe(stored.id);
    });

    it('rejeita credenciais inválidas com 401', async () => {
      user.findUnique.mockResolvedValue(buildUser());

      await expect(
        service.login({ email: 'candidato@rhconnect.com', password: 'senha-errada' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejeita e-mail inexistente com 401', async () => {
      user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nao-existe@rhconnect.com', password: 'senha123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('getById', () => {
    it('retorna o usuário público a partir do id', async () => {
      const stored = buildUser({ email: 'avaliador@rhconnect.com', role: 'EVALUATOR' });
      user.findUnique.mockResolvedValue(stored);

      const found = await service.getById(stored.id);

      expect(found.role).toBe('EVALUATOR');
      expect(found).not.toHaveProperty('passwordHash');
    });

    it('rejeita id desconhecido com 401', async () => {
      user.findUnique.mockResolvedValue(null);

      await expect(service.getById('id-inexistente')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});