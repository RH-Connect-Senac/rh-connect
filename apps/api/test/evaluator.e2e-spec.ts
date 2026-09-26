// Os mesmos mocks que já usamos no auth.e2e-spec.ts — precisam ser
// repetidos aqui porque cada arquivo de teste é isolado; um jest.mock()
// só vale dentro do próprio arquivo onde foi escrito.
//
// A versão "vazia" original só substituía `ConfigModule.forRoot`, sem
// exportar `ConfigService` nem registrar nenhum provider. Isso quebra a
// compilação do `AppModule` aqui pelo mesmo motivo corrigido no Prompt 04
// em `auth.e2e-spec.ts`: `InterviewsAiService` injeta `ConfigService`, e o
// `AppModule` sempre importa `InterviewsAiModule`. O mock abaixo reproduz
// `ConfigModule.forRoot({ isGlobal: true })` (comportamento real usado em
// produção) em vez de mudar a topologia de módulos do Back.
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
import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { AppModule } from '../src/app.module';

jest.setTimeout(30000);

describe('Evaluator invite/activate + Onboarding (e2e)', () => {
  let app: INestApplication;
  // Usamos o Prisma diretamente aqui (fora da aplicação) para preparar
  // cenários que a API não permite fazer sozinha — por exemplo, criar um
  // usuário ADMIN, já que não existe rota pública para isso.
  const prisma = new PrismaClient();

  // Login agora exige domínio gmail.com (igual ao cadastro) para os três
  // perfis — por isso as contas técnicas usadas aqui para logar precisam
  // ser @gmail.com, mesmo sendo criadas diretamente no banco via Prisma.
  const adminEmail = `admin-e2e-${Date.now()}@gmail.com`;
  const adminPassword = 'senhaAdmin123';

  const candidateEmail = `candidate-onboarding-${Date.now()}@gmail.com`;
  const candidatePassword = 'senha123456';

  let adminCookies: string[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Cria um ADMIN direto no banco (não existe endpoint público para
    // isso — faz sentido, já que Admin não se autocadastra).
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.app_user.create({
      data: {
        name: 'Admin E2E',
        email: adminEmail,
        password_hash: passwordHash,
        user_role: 'ADMIN',
        account_status: 'ACTIVE',
      },
    });

    // Loga como esse admin, para reaproveitar o cookie nos testes de convite
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    adminCookies = loginResponse.headers['set-cookie'];

    // Cria também um candidato ACTIVE, para os testes de onboarding
    const candidatePasswordHash = await bcrypt.hash(candidatePassword, 10);
    await prisma.app_user.create({
      data: {
        name: 'Candidato Onboarding E2E',
        email: candidateEmail,
        password_hash: candidatePasswordHash,
        user_role: 'CANDIDATE',
        account_status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    // Guarda contra `beforeAll` falhar ao compilar/inicializar o Nest —
    // sem isso, `app.close()` lançaria um TypeError secundário que mascara
    // o erro real (mesmo ajuste feito em auth.e2e-spec.ts no Prompt 04).
    if (app) {
      await app.close();
    }
  });

  describe('POST /auth/evaluator/invite', () => {
    it('deve ser recusado se quem chama não for ADMIN', async () => {
      // Loga como candidato (sem privilégio de admin) e tenta convidar
      const candidateLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: candidateEmail, password: candidatePassword })
        .expect(200);

      const candidateCookies = candidateLogin.headers['set-cookie'];

      await request(app.getHttpServer())
        .post('/auth/evaluator/invite')
        .set('Cookie', candidateCookies)
        .send({ name: 'Avaliador Intruso', email: 'intruso@rhconnect.com' })
        .expect(403); // RolesGuard barra: candidato não é ADMIN
    });

    it('deve convidar um avaliador quando chamado por ADMIN', async () => {
      // O endpoint de convite em si não restringe domínio (fora do escopo
      // desta auditoria, que cobre apenas o Login) — mas o e-mail usado aqui
      // precisa ser @gmail.com porque este teste ativa a conta e depois faz
      // login com ela, e o Login agora exige gmail.com.
      const evaluatorEmail = `avaliador-e2e-${Date.now()}@gmail.com`;

      const response = await request(app.getHttpServer())
        .post('/auth/evaluator/invite')
        .set('Cookie', adminCookies)
        .send({
          name: 'Avaliador Convidado E2E',
          email: evaluatorEmail,
          area: 'Backend',
        })
        .expect(201);

      expect(response.body.user.role).toBe('EVALUATOR');
      expect(response.body.user.accountStatus).toBe('INVITED');

      // Confere direto no banco que o token de ativação foi criado
      const createdUser = await prisma.app_user.findUnique({
        where: { email: evaluatorEmail },
      });

      const tokenRecord = await prisma.account_activation_token.findFirst({
        where: { user_id: createdUser!.user_id },
      });

      expect(tokenRecord).not.toBeNull();
      expect(tokenRecord!.token_purpose).toBe('EVALUATOR_INVITE');
      expect(tokenRecord!.used_at).toBeNull();
    });
  });

  describe('POST /auth/evaluator/activate', () => {
    it('deve ativar a conta com um token válido e permitir login depois', async () => {
      // Prepara o cenário manualmente: cria um avaliador INVITED e insere
      // um token de ativação com um valor bruto que A GENTE escolhe —
      // assim conseguimos usar esse valor bruto na chamada HTTP (algo que
      // não seria possível se passássemos pela rota de convite, já que
      // ela nunca devolve o token bruto).
      // Precisa ser @gmail.com pelo mesmo motivo do teste de convite acima:
      // este cenário ativa a conta e depois faz login com ela.
      const evaluatorEmail = `avaliador-ativar-${Date.now()}@gmail.com`;

      const evaluator = await prisma.app_user.create({
        data: {
          name: 'Avaliador Para Ativar',
          email: evaluatorEmail,
          password_hash: null,
          user_role: 'EVALUATOR',
          account_status: 'INVITED',
        },
      });

      const rawToken = `token-e2e-${Date.now()}`;
      // Mesmo algoritmo usado pelo AuthService (sha256) — precisa ser
      // idêntico, senão o service nunca vai reconhecer esse token.
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 1);

      await prisma.account_activation_token.create({
        data: {
          user_id: evaluator.user_id,
          token_hash: tokenHash,
          token_purpose: 'EVALUATOR_INVITE',
          expires_at: expiresAt,
        },
      });

      const newPassword = 'novaSenhaAvaliador123';

      await request(app.getHttpServer())
        .post('/auth/evaluator/activate')
        .send({ token: rawToken, password: newPassword })
        .expect(200);

      // Confirma que a conta virou ACTIVE e já consegue logar com a nova senha
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: evaluatorEmail, password: newPassword })
        .expect(200);

      expect(loginResponse.body.accountStatus).toBe('ACTIVE');
    });

    it('deve rejeitar um token que não existe', async () => {
      await request(app.getHttpServer())
        .post('/auth/evaluator/activate')
        .send({ token: 'token-que-nao-existe', password: 'qualquerSenha123' })
        .expect(401);
    });
  });

  describe('Onboarding', () => {
    it('deve concluir o onboarding do candidato e refletir em /auth/me', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: candidateEmail, password: candidatePassword })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Antes de concluir, /auth/me deve mostrar onboarding pendente
      const meAntes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200);
      expect(meAntes.body.onboardingCompleted).toBe(false);

      await request(app.getHttpServer())
        .put('/auth/candidate/onboarding')
        .set('Cookie', cookies)
        .expect(200);

      // Depois, /auth/me deve refletir a conclusão
      const meDepois = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200);
      expect(meDepois.body.onboardingCompleted).toBe(true);
    });

    it('não deve permitir que um candidato conclua o onboarding de admin', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: candidateEmail, password: candidatePassword })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      await request(app.getHttpServer())
        .put('/auth/admin/onboarding')
        .set('Cookie', cookies)
        .expect(403); // RolesGuard: candidato não pode usar rota de admin
    });

    it('deve concluir o onboarding do admin e refletir em /auth/me', async () => {
      // Reaproveita o ADMIN criado em `beforeAll` — cobre o perfil ADMIN,
      // que ainda não tinha teste de conclusão bem-sucedida (só o de
      // rejeição cross-role acima, que usa um candidato tentando essa rota).
      const meAntes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', adminCookies)
        .expect(200);
      expect(meAntes.body.onboardingCompleted).toBe(false);

      await request(app.getHttpServer())
        .put('/auth/admin/onboarding')
        .set('Cookie', adminCookies)
        .expect(200);

      const meDepois = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', adminCookies)
        .expect(200);
      expect(meDepois.body.onboardingCompleted).toBe(true);
    });

    it('deve concluir o onboarding do avaliador e refletir em /auth/me', async () => {
      // Cria um avaliador ACTIVE direto no banco (mesmo padrão usado para o
      // ADMIN em `beforeAll`) — cobre o terceiro perfil, que também não
      // tinha teste de conclusão de onboarding.
      const evaluatorEmail = `avaliador-onboarding-${Date.now()}@gmail.com`;
      const evaluatorPassword = 'senhaAvaliador123';
      const evaluatorPasswordHash = await bcrypt.hash(evaluatorPassword, 10);

      await prisma.app_user.create({
        data: {
          name: 'Avaliador Onboarding E2E',
          email: evaluatorEmail,
          password_hash: evaluatorPasswordHash,
          user_role: 'EVALUATOR',
          account_status: 'ACTIVE',
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: evaluatorEmail, password: evaluatorPassword })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      const meAntes = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200);
      expect(meAntes.body.onboardingCompleted).toBe(false);

      await request(app.getHttpServer())
        .put('/auth/evaluator/onboarding')
        .set('Cookie', cookies)
        .expect(200);

      const meDepois = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200);
      expect(meDepois.body.onboardingCompleted).toBe(true);
    });

    it('deve ser idempotente: concluir o onboarding duas vezes seguidas continua respondendo 200 com o estado concluído', async () => {
      const evaluatorEmail = `avaliador-onboarding-idempotente-${Date.now()}@gmail.com`;
      const evaluatorPassword = 'senhaAvaliador123';
      const evaluatorPasswordHash = await bcrypt.hash(evaluatorPassword, 10);

      await prisma.app_user.create({
        data: {
          name: 'Avaliador Onboarding Idempotente E2E',
          email: evaluatorEmail,
          password_hash: evaluatorPasswordHash,
          user_role: 'EVALUATOR',
          account_status: 'ACTIVE',
        },
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: evaluatorEmail, password: evaluatorPassword })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      await request(app.getHttpServer())
        .put('/auth/evaluator/onboarding')
        .set('Cookie', cookies)
        .expect(200);

      // Segunda chamada, com o onboarding já concluído: não deve lançar
      // nem gerar estado inválido — continua 200 e `onboardingCompleted`
      // permanece `true`.
      await request(app.getHttpServer())
        .put('/auth/evaluator/onboarding')
        .set('Cookie', cookies)
        .expect(200);

      const meDepois = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', cookies)
        .expect(200);
      expect(meDepois.body.onboardingCompleted).toBe(true);
    });
  });
});
