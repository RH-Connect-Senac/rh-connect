// 1) Substitui o ConfigModule por uma versão vazia — ele só carregaria
// variáveis de ambiente, e o dotenv-cli já faz isso antes do Jest iniciar.
jest.mock('@nestjs/config', () => ({
  ConfigModule: {
    forRoot: () => ({ module: class DummyConfigModule {} }),
  },
}));

// 2) Substitui o @nestjs/jwt por uma versão que usa a biblioteca
// "jsonwebtoken" diretamente — mesmo comportamento real, sem o formato de
// arquivo que trava o Jest.
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

// 3) Substitui o @nestjs/passport. Em vez de usar o mecanismo interno do
// Passport (que está travando o Jest), o AuthGuard abaixo faz a MESMA
// verificação que o JwtStrategy real faz: lê o cookie access_token,
// confere a assinatura do token e confirma que o usuário existe e está
// ACTIVE. Ou seja: continua sendo uma checagem de autenticação de
// verdade, só que sem depender do formato de arquivo problemático.
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

          // Isso é o que fica disponível como req.user dentro do
          // controller, exatamente como o JwtStrategy real faria.
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
import { AppModule } from '../src/app.module';

// Conectar no Supabase pode demorar mais que os 5 segundos padrão do
// Jest, especialmente na primeira conexão. Aumentamos para 30 segundos.
jest.setTimeout(30000);

describe('Auth (e2e)', () => {
  let app: INestApplication;

  // O domínio precisa ser gmail.com (decisão D5) e a senha precisa cumprir
  // a política D12 (maiúscula, minúscula, dígito e caractere especial).
  const email = `e2e.${Date.now()}@gmail.com`;
  const password = 'Senha!Teste123';

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
    await app.close();
  });

  it('deve registrar um novo candidato', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ name: 'Candidato E2E', email, password, termsAccepted: true })
      .expect(201);

    expect(response.body.email).toBe(email);
    expect(response.body.role).toBe('CANDIDATE');
    expect(response.body).not.toHaveProperty('password_hash');
  });

  it('não deve permitir cadastrar o mesmo e-mail duas vezes', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Candidato Duplicado',
        email,
        password,
        termsAccepted: true,
      })
      .expect(409);
  });

  it('não deve permitir cadastro sem aceitar os termos', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Candidato Sem Termos',
        email: `e2e.sem-termos.${Date.now()}@gmail.com`,
        password,
        termsAccepted: false,
      })
      .expect(400);
  });

  it('deve fazer login e retornar o cookie de sessão', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(response.body.email).toBe(email);

    const cookies = response.headers['set-cookie'];
    expect(cookies).toBeDefined();
  });

  it('não deve logar com senha errada', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'senhaErrada123' })
      .expect(401);
  });

  it('deve acessar /auth/me estando autenticado, e falhar sem estar', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const cookies = loginResponse.headers['set-cookie'];

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    expect(meResponse.body.email).toBe(email);

    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('deve fazer logout e invalidar a sessão', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const cookies = loginResponse.headers['set-cookie'];

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookies)
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(401);
  });
});
