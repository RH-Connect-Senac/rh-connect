// 1) Substitui o ConfigModule por uma versão vazia — ele só carregaria
// variáveis de ambiente, e o dotenv-cli já faz isso antes do Jest iniciar.
//
// A versão "vazia" original só substituía `ConfigModule.forRoot`, sem
// exportar `ConfigService` nem registrar nenhum provider — o que funcionava
// enquanto nenhum módulo do AppModule injetava `ConfigService`. Isso deixou
// de ser verdade com `InterviewsAiService` (injeta `ConfigService` para ler
// `INTERVIEW_AI_SERVICE_URL`/`INTERVIEW_AI_TIMEOUT_MS`), que o AppModule
// sempre importa via `InterviewsAiModule` — daí o `Nest can't resolve
// dependencies of the InterviewsAiService (?)` ao compilar o `AppModule`
// aqui. A causa é só deste mock, não de `InterviewsAiModule`: em produção,
// `AppModule` registra `ConfigModule.forRoot({ isGlobal: true })`, tornando
// `ConfigService` disponível globalmente para qualquer módulo sem import
// explícito — o mock abaixo agora reproduz esse mesmo comportamento
// (`global: true` + `providers`/`exports` de um `ConfigService` mínimo, que
// só lê de `process.env`, já carregado pelo dotenv-cli), em vez de mudar a
// topologia de módulos do Back.
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
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module';

// Conectar no Supabase pode demorar mais que os 5 segundos padrão do
// Jest, especialmente na primeira conexão. Aumentamos para 30 segundos.
jest.setTimeout(30000);

describe('Auth (e2e)', () => {
  let app: INestApplication;
  // Usado apenas no Prompt 07 (testes de account_status), para preparar/
  // alterar cenários que a API não expõe (ex.: mudar o status de uma conta
  // já autenticada) — mesmo padrão já usado em evaluator.e2e-spec.ts.
  const prisma = new PrismaClient();

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
    await prisma.$disconnect();
    // Se `beforeAll` falhar ao compilar/inicializar o Nest (ex.: erro de DI),
    // `app` nunca é atribuído. Sem esta guarda, `app.close()` lançaria um
    // TypeError secundário aqui, que aparece nos resultados do Jest ao lado
    // do erro real e pode confundir o diagnóstico — a causa raiz continua
    // sendo o erro do `beforeAll`, nunca escondido, só não duplicado por um
    // erro de limpeza que não faz sentido rodar.
    if (app) {
      await app.close();
    }
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

  it('deve permitir cadastro com "+" na parte local de um Gmail válido', async () => {
    // Decisão de produto final: RH Connect aceita "+" na parte local de um
    // Gmail válido, preservando-o exatamente como enviado — não é removido
    // nem tratado como equivalente ao e-mail base.
    const [localPart, domain] = `e2e.plus.${Date.now()}@gmail.com`.split('@');
    const plusEmail = `${localPart}+rh@${domain}`;

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Candidato Alias Plus',
        email: plusEmail,
        password,
        termsAccepted: true,
      })
      .expect(201);

    expect(response.body.email).toBe(plusEmail);
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

  it('deve logar com o mesmo e-mail com espaços nas pontas', async () => {
    // LoginDto valida a sintaxe do e-mail já normalizado (trim+lowercase),
    // não o valor bruto — então espaços externos não devem bloquear o login.
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: `  ${email}  `, password })
      .expect(200);

    expect(response.body.email).toBe(email);
  });

  it('não deve logar com um e-mail sintaticamente inválido', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'a@@gmail.com', password })
      .expect(400);
  });

  it('não deve logar com um e-mail de domínio diferente de gmail.com', async () => {
    // Login agora exige gmail.com para os três perfis (mesma regra do
    // cadastro). A rejeição acontece na validação do DTO, então nem precisa
    // existir uma conta com esse e-mail para o teste ser válido.
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'usuario@hotmail.com', password })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'usuario@rhconnect.com', password })
      .expect(400);
  });

  it('deve logar com uma conta cadastrada literalmente com "+tag", e o e-mail base não deve autenticá-la', async () => {
    // Decisão de produto final: "+" é preservado, nunca tratado como
    // equivalente ao e-mail base. Uma conta cadastrada como
    // "nome+tag@gmail.com" só autentica usando esse endereço exato — o
    // e-mail base "nome@gmail.com" (nunca cadastrado) não deve autenticá-la.
    const [localPart, domain] = `e2e.plus.${Date.now()}@gmail.com`.split('@');
    const plusEmail = `${localPart}+tag@${domain}`;
    const baseEmail = `${localPart}@${domain}`;

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Candidato Com Alias',
        email: plusEmail,
        password,
        termsAccepted: true,
      })
      .expect(201);

    expect(registerResponse.body.email).toBe(plusEmail);

    const loginWithPlusEmail = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: plusEmail, password })
      .expect(200);

    expect(loginWithPlusEmail.body.email).toBe(plusEmail);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: baseEmail, password })
      .expect(401);
  });

  it('deve logar com o mesmo e-mail em maiúsculas (sem espaços nas pontas)', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email.toUpperCase(), password })
      .expect(200);

    expect(response.body.email).toBe(email);
  });

  it('não deve logar com senha errada', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'senhaErrada123' })
      .expect(401);
  });

  it('não deve renovar o access token sem o cookie refresh_token (refresh token ausente)', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
  });

  it('não deve renovar o access token com um refresh_token inválido/adulterado', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', ['refresh_token=token-invalido-adulterado'])
      .expect(401);
  });

  it('deve renovar o access token com um refresh_token válido, e o novo cookie deve autenticar /auth/me', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const loginCookies = loginResponse.headers['set-cookie'];
    const refreshCookie = loginCookies.find((c: string) => c.startsWith('refresh_token='));
    expect(refreshCookie).toBeDefined();

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', [refreshCookie])
      .expect(200);

    const refreshCookies = refreshResponse.headers['set-cookie'];
    const newAccessCookie = refreshCookies.find((c: string) => c.startsWith('access_token='));
    expect(newAccessCookie).toBeDefined();

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', [newAccessCookie])
      .expect(200);

    expect(meResponse.body.email).toBe(email);
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

  it('deve fazer logout de forma idempotente: sem sessão, e chamado duas vezes seguidas', async () => {
    // Sem nenhum cookie (ninguém autenticado): não deve lançar erro — o
    // Controller só chama `AuthService.logout` quando existe cookie
    // `refresh_token`, e sempre limpa os cookies e responde 200.
    await request(app.getHttpServer()).post('/auth/logout').expect(200);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    const cookies = loginResponse.headers['set-cookie'];

    // Primeira chamada revoga a sessão; a segunda, com o MESMO cookie
    // (já revogado), precisa continuar respondendo 200 — `AuthService.logout`
    // usa `updateMany` filtrando por `revoked_at: null`, então a segunda
    // chamada simplesmente não encontra linhas para atualizar, sem lançar.
    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookies)
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookies)
      .expect(200);
  });

  // Prompt 07 — cobre a lacuna identificada na auditoria de roles/
  // accountStatus: os cenários abaixo não tinham teste e2e, embora a regra
  // ("somente contas ACTIVE autenticam") já estivesse implementada tanto em
  // `AuthService.login`/`AuthService.refresh` quanto em `JwtStrategy.validate`
  // (consulta o `account_status` atual no banco a cada request, nunca confia
  // só no payload do token).
  it('não deve logar com uma conta cujo account_status não é ACTIVE (ex.: BLOCKED)', async () => {
    const blockedEmail = `e2e.blocked.${Date.now()}@gmail.com`;
    const blockedPassword = await bcrypt.hash(password, 10);

    await prisma.app_user.create({
      data: {
        name: 'Candidato Bloqueado E2E',
        email: blockedEmail,
        password_hash: blockedPassword,
        user_role: 'CANDIDATE',
        account_status: 'BLOCKED',
      },
    });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: blockedEmail, password })
      .expect(401);
  });

  it('deve negar acesso a /auth/me e a /auth/refresh quando a conta deixa de ser ACTIVE após o login', async () => {
    const statusChangeEmail = `e2e.status-change.${Date.now()}@gmail.com`;
    const statusChangePassword = 'Senha!Teste123';
    const statusChangePasswordHash = await bcrypt.hash(
      statusChangePassword,
      10,
    );

    const user = await prisma.app_user.create({
      data: {
        name: 'Candidato Status E2E',
        email: statusChangeEmail,
        password_hash: statusChangePasswordHash,
        user_role: 'CANDIDATE',
        account_status: 'ACTIVE',
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: statusChangeEmail, password: statusChangePassword })
      .expect(200);

    const cookies = loginResponse.headers['set-cookie'];

    // Confirma que, enquanto ACTIVE, a sessão recém-criada autentica
    // normalmente — antes de alterar o status, para isolar a causa.
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookies)
      .expect(200);

    // Simula uma conta bloqueada por um Admin depois do login (sem endpoint
    // real para isso hoje — por isso a alteração direto no banco, igual ao
    // padrão já usado para preparar cenários em evaluator.e2e-spec.ts).
    await prisma.app_user.update({
      where: { user_id: user.user_id },
      data: { account_status: 'BLOCKED' },
    });

    // O access_token emitido antes do bloqueio continua com assinatura
    // válida, mas `JwtStrategy.validate` consulta o `account_status` atual
    // no banco a cada request — por isso passa a ser rejeitado.
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookies)
      .expect(401);

    // O refresh token da mesma sessão também não deve mais emitir um novo
    // access_token: `AuthService.refresh` também confere o `account_status`
    // atual antes de assinar.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(401);
  });
});
