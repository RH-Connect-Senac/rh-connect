// A versão "vazia" original só substituía `ConfigModule.forRoot`, sem
// exportar `ConfigService` nem registrar nenhum provider — o que funcionava
// enquanto nenhum módulo do AppModule injetava `ConfigService`. Isso deixou
// de ser verdade com `InterviewsAiService` (injeta `ConfigService` para ler
// `INTERVIEW_AI_SERVICE_URL`/`INTERVIEW_AI_TIMEOUT_MS`), que o AppModule
// sempre importa via `InterviewsAiModule` — daí o `Nest can't resolve
// dependencies of the InterviewsAiService (?)` ao compilar o `AppModule`
// aqui. Mesma correção já aplicada em auth.e2e-spec.ts/evaluator.e2e-spec.ts
// (Prompt 04): o mock abaixo reproduz `ConfigModule.forRoot({ isGlobal: true })`
// (comportamento real usado em produção), em vez de mudar a topologia de
// módulos do Back.
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
      return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
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
            where: { user_id: Number(payload.sub) },
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
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

jest.setTimeout(30000);

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  afterEach(async () => {
    await app.close();
  });
});
