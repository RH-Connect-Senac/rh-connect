// Mesmos mocks já usados em auth.e2e-spec.ts/evaluator.e2e-spec.ts — cada
// arquivo de teste é isolado, então precisam ser repetidos aqui. Ver o
// comentário original em auth.e2e-spec.ts para o histórico completo dessa
// substituição (Prompt 04 / Prompt 11).
jest.mock('@nestjs/config', () => {
  class ConfigService {
    get<T = string>(key: string): T | undefined {
      return process.env[key] as T | undefined;
    }
  }

  return {
    ConfigService,
    ConfigModule: {
      forRoot: () => ({
        global: true,
        module: class DummyConfigModule {},
        providers: [ConfigService],
        exports: [ConfigService],
      }),
    },
  };
});

jest.mock('@nestjs/jwt', () => {
  const jwt = require('jsonwebtoken');

  class JwtService {
    sign(payload: Record<string, unknown>) {
      return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '15m',
      });
    }
  }

  class JwtModule {
    static register() {
      return {
        module: class DummyJwtModule {},
        providers: [JwtService],
        exports: [JwtService],
      };
    }
  }

  return { JwtModule, JwtService };
});

jest.mock('@nestjs/passport', () => {
  const jwt = require('jsonwebtoken');
  const { PrismaClient } = require('@prisma/client');
  const { UnauthorizedException } = require('@nestjs/common');

  const prisma = new PrismaClient();

  return {
    PassportModule: class DummyPassportModule {},

    PassportStrategy: () =>
      class {
        constructor(..._args: unknown[]) {}
      },

    AuthGuard: () =>
      class {
        async canActivate(context: any) {
          const request = context.switchToHttp().getRequest();
          const token = request.cookies?.access_token;

          if (!token) {
            throw new UnauthorizedException();
          }

          let payload: any;

          try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
          } catch {
            throw new UnauthorizedException();
          }

          const user = await prisma.app_user.findUnique({
            where: {
              user_id: Number(payload.sub),
            },
          });

          if (!user || user.account_status !== 'ACTIVE') {
            throw new UnauthorizedException();
          }

          request.user = {
            id: user.user_id,
            email: user.email,
            role: user.user_role,
          };

          return true;
        }
      },
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../src/app.module';

// Arquivo dedicado (Prompt 13 / M1), com sua própria instância de app e,
// portanto, seu próprio armazenamento de throttling em memória — isolado das
// contagens de tentativas de login/refresh/activate já feitas em
// auth.e2e-spec.ts e evaluator.e2e-spec.ts.
//
// Os limites usados aqui são os definidos para o ambiente acadêmico/demo,
// considerando aproximadamente 40–60 pessoas testando o sistema
// simultaneamente e a possibilidade de compartilharem o mesmo IP público.
// Esses valores devem ser revistos antes de uso real em produção.
jest.setTimeout(60000);

describe(
  'Rate limiting em endpoints sensíveis de Auth (e2e) — Prompt 13 / M1',
  () => {
    let app: INestApplication;
    const prisma = new PrismaClient();

    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.use(cookieParser());
      app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

      await app.init();
    });

    afterAll(async () => {
      await prisma.$disconnect();

      if (app) {
        await app.close();
      }
    });

    it('uso normal de login continua permitido (não é barrado pelo throttling)', async () => {
      // Uma única tentativa não deve ser afetada pelo rate limiting.
      // A resposta 401 vem da validação das credenciais, não do throttler.
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'inexistente@gmail.com',
          password: 'qualquerSenha123',
        })
        .expect(401);
    });

    it('excesso de tentativas de login na mesma janela recebe 429', async () => {
      // Limite do ambiente acadêmico/demo:
      // 100 requisições por 60s por IP.
      // A 101ª tentativa deve ultrapassar o limite.
      const statuses: number[] = [];

      for (let i = 0; i < 101; i += 1) {
        const response = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: 'inexistente@gmail.com',
            password: 'qualquerSenha123',
          });

        statuses.push(response.status);
      }

      expect(statuses.some((status) => status === 429)).toBe(true);
    });

    it('uso normal de refresh continua permitido (não é barrado pelo throttling)', async () => {
      // Sem cookie de refresh, a resposta esperada é 401.
      // O importante aqui é garantir que uma chamada normal não recebe 429.
      await request(app.getHttpServer()).post('/auth/refresh').expect(401);
    });

    it('excesso de tentativas de refresh na mesma janela recebe 429', async () => {
      // Limite do ambiente acadêmico/demo:
      // 120 requisições por 60s por IP.
      // A 121ª tentativa deve ultrapassar o limite.
      const statuses: number[] = [];

      for (let i = 0; i < 121; i += 1) {
        const response = await request(app.getHttpServer()).post(
          '/auth/refresh',
        );

        statuses.push(response.status);
      }

      expect(statuses.some((status) => status === 429)).toBe(true);
    });

    it('excesso de tentativas de ativação de avaliador na mesma janela recebe 429', async () => {
      // Limite do ambiente acadêmico/demo:
      // 40 requisições por 60s por IP.
      // A 41ª tentativa deve ultrapassar o limite.
      const statuses: number[] = [];

      for (let i = 0; i < 41; i += 1) {
        const response = await request(app.getHttpServer())
          .post('/auth/evaluator/activate')
          .send({
            token: 'token-que-nao-existe',
            password: 'Qualquer!Senha123',
          });

        statuses.push(response.status);
      }

      expect(statuses.some((status) => status === 429)).toBe(true);
    });

    // Não há teste esperando a janela real de 60 segundos expirar,
    // pois isso deixaria a suíte desnecessariamente lenta.
    // O reset da janela é responsabilidade do @nestjs/throttler.
  },
);