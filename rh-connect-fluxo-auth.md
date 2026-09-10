# RH Connect — Fluxo de Autenticação e Rotas

**Stack:** TypeScript · Next.js (App Router) · Axios · NestJS · Prisma · PostgreSQL

---

## 1. Visão geral do fluxo

```
Cadastro/Login Front
  ↓
REST API (Axios)
  ↓
NestJS Auth
  ↓
Prisma
  ↓
PostgreSQL
  ↓
Cookie HTTP-only
  ↓
GET /auth/me
  ↓
Role + Status + Onboarding
  ↓
Redirect por perfil
```

### Rotas do Front

```
/login
/register
/verify-email

/evaluator/activate?token=...

/candidate/onboarding
/evaluator/onboarding
/admin/onboarding

/candidate/dashboard
/evaluator/dashboard
/admin/dashboard
```

Áreas separadas por perfil: `CANDIDATE → /candidate/*`, `EVALUATOR → /evaluator/*`, `ADMIN → /admin/*`. Nenhum perfil acessa a área de outro.

### Fluxo de ativação do Avaliador

```
Admin convida o Avaliador
  ↓
Conta fica INVITED
  ↓
Token de ativação gerado
  ↓
Avaliador recebe o link
  ↓
/evaluator/activate?token=...
  ↓
Cria a própria senha
  ↓
Back valida o token
  ↓
Conta passa de INVITED para ACTIVE
  ↓
/evaluator/onboarding
  ↓
/evaluator/dashboard
```

Estados possíveis do token em `/evaluator/activate`:
- **VALID** → permite criar senha
- **INVALID** → link inválido
- **EXPIRED** → link expirado
- **USED** → convite já utilizado
- **DONE** → ativação concluída, segue para onboarding

### Lógica de redirecionamento pós-login

```
Conta não ACTIVE        → não libera dashboard (vai para /verify-email)
Onboarding não concluído → vai para o onboarding do perfil
Onboarding concluído:
  CANDIDATE → /candidate/dashboard
  EVALUATOR → /evaluator/dashboard
  ADMIN     → /admin/dashboard
```

A proteção de rota no Front é para navegação/UX — a autorização real é sempre garantida pelo Back.

---

## 2. Prisma Schema (`apps/api/prisma/schema.prisma`)

```prisma
enum AccountStatus {
  INVITED
  ACTIVE
  SUSPENDED
}

enum Role {
  CANDIDATE
  EVALUATOR
  ADMIN
}

model User {
  id                  String        @id @default(uuid())
  name                String
  email               String        @unique
  password            String?       // null enquanto está INVITED
  role                Role
  accountStatus       AccountStatus @default(ACTIVE)
  onboardingCompleted Boolean       @default(false)
  createdAt           DateTime      @default(now())

  activationToken     ActivationToken?
}

model ActivationToken {
  id        String    @id @default(uuid())
  token     String    @unique
  userId    String    @unique
  user      User      @relation(fields: [userId], references: [id])
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
}
```

---

## 3. Back-end (`apps/api`)

### `src/prisma/prisma.service.ts`

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### `src/prisma/prisma.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### `src/auth/dto/register.dto.ts`

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Maria Silva' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  @MinLength(6)
  password: string;
}
```

### `src/auth/dto/login.dto.ts`

```typescript
import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'maria@email.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsString()
  password: string;
}
```

### `src/auth/dto/activate-evaluator.dto.ts`

```typescript
import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateEvaluatorDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;
}
```

### `src/auth/strategies/jwt.strategy.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.access_token ?? null,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    return { id: payload.sub, role: payload.role, name: payload.name };
  }
}
```

### `src/auth/guards/jwt-auth.guard.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

### `src/auth/auth.service.ts`

```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

type TokenStatus = 'VALID' | 'INVALID' | 'EXPIRED' | 'USED';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async checkActivationToken(token: string): Promise<{ status: TokenStatus }> {
    const record = await this.prisma.activationToken.findUnique({ where: { token } });
    if (!record) return { status: 'INVALID' };
    if (record.usedAt) return { status: 'USED' };
    if (record.expiresAt < new Date()) return { status: 'EXPIRED' };
    return { status: 'VALID' };
  }

  async activateEvaluator(token: string, password: string) {
    const record = await this.prisma.activationToken.findUnique({ where: { token } });

    if (!record) throw new BadRequestException('Token inválido');
    if (record.usedAt) throw new BadRequestException('Token já utilizado');
    if (record.expiresAt < new Date()) throw new BadRequestException('Token expirado');

    const hashedPassword = await bcrypt.hash(password, 10);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword, accountStatus: 'ACTIVE' },
      });

      await tx.activationToken.update({
        where: { token },
        data: { usedAt: new Date() },
      });

      return { id: user.id, name: user.name, role: user.role };
    });
  }
}
```

> `inviteEvaluator` (geração do convite pelo Admin) fica em um service próprio da área de Administração — fora do escopo do módulo de Auth.

### `src/auth/auth.controller.ts`

```typescript
import {
  Controller, Post, Get, Body, Res, Req, Param, HttpCode, UseGuards,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ActivateEvaluatorDto } from './dto/activate-evaluator.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Cadastro público de Candidato' })
  @ApiResponse({ status: 201, description: 'Usuário criado' })
  @ApiResponse({ status: 400, description: 'Erro de validação' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login e criação de sessão' })
  @ApiResponse({ status: 200, description: 'Login bem-sucedido' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.authService.login(dto);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24,
    });

    return user;
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Invalida a sessão' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return { message: 'Logout realizado com sucesso' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retorna o usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Usuário autenticado' })
  @ApiResponse({ status: 401, description: 'Sem sessão ativa' })
  async me(@Req() req: Request) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: (req.user as any).id },
      select: {
        id: true,
        name: true,
        role: true,
        accountStatus: true,
        onboardingCompleted: true,
      },
    });
  }

  @Get('evaluator/activate/:token')
  @ApiOperation({ summary: 'Verifica o estado do token de ativação do Avaliador' })
  @ApiResponse({ status: 200, description: 'VALID | INVALID | EXPIRED | USED' })
  checkActivationToken(@Param('token') token: string) {
    return this.authService.checkActivationToken(token);
  }

  @Post('evaluator/activate')
  @ApiOperation({ summary: 'Ativa a conta do Avaliador com nova senha' })
  @ApiResponse({ status: 200, description: 'Conta ativada' })
  @ApiResponse({ status: 400, description: 'Token inválido, expirado ou já utilizado' })
  activateEvaluator(@Body() dto: ActivateEvaluatorDto) {
    return this.authService.activateEvaluator(dto.token, dto.password);
  }
}
```

### `src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

### `src/main.ts` (CORS + cookie-parser)

```typescript
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
```

---

## 4. Front-end (`apps/web` — Next.js App Router)

### Estrutura de pastas

```
apps/web/
  src/
    app/
      login/page.tsx
      register/page.tsx
      verify-email/page.tsx
      evaluator/
        activate/page.tsx
        onboarding/page.tsx
        dashboard/page.tsx
      candidate/
        onboarding/page.tsx
        dashboard/page.tsx
      admin/
        onboarding/page.tsx
        dashboard/page.tsx
    lib/
      api.ts
      authService.ts
      redirectByProfile.ts
    middleware.ts
```

### `src/lib/api.ts`

```typescript
import axios, { AxiosError } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // sessão expirada
    }
    return Promise.reject(error);
  }
);
```

`.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### `src/lib/authService.ts`

```typescript
import { api } from "./api";

export type Role = "CANDIDATE" | "EVALUATOR" | "ADMIN";
export type AccountStatus = "INVITED" | "ACTIVE" | "SUSPENDED";
export type TokenStatus = "VALID" | "INVALID" | "EXPIRED" | "USED";

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  accountStatus: AccountStatus;
  onboardingCompleted: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export const authService = {
  register: (data: RegisterPayload) =>
    api.post<{ id: string; name: string; email: string; role: Role }>(
      "/auth/register",
      data
    ),

  login: (data: LoginPayload) => api.post<AuthUser>("/auth/login", data),

  logout: () => api.post<{ message: string }>("/auth/logout"),

  me: () => api.get<AuthUser>("/auth/me"),

  verifyEmail: (token: string) =>
    api.post<{ message: string }>("/auth/verify-email", { token }),

  checkActivationToken: (token: string) =>
    api.get<{ status: TokenStatus }>(`/auth/evaluator/activate/${token}`),

  activateEvaluator: (token: string, password: string) =>
    api.post<{ id: string; name: string; role: Role }>(
      "/auth/evaluator/activate",
      { token, password }
    ),
};
```

### `src/lib/redirectByProfile.ts`

```typescript
import { AuthUser, Role } from "./authService";

export function resolveRedirect(user: AuthUser): string {
  if (user.accountStatus !== "ACTIVE") return "/verify-email";

  const onboardingRoutes: Record<Role, string> = {
    CANDIDATE: "/candidate/onboarding",
    EVALUATOR: "/evaluator/onboarding",
    ADMIN: "/admin/onboarding",
  };

  const dashboardRoutes: Record<Role, string> = {
    CANDIDATE: "/candidate/dashboard",
    EVALUATOR: "/evaluator/dashboard",
    ADMIN: "/admin/dashboard",
  };

  return user.onboardingCompleted
    ? dashboardRoutes[user.role]
    : onboardingRoutes[user.role];
}
```

### `src/app/evaluator/activate/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { authService, TokenStatus } from "@/lib/authService";

type ViewStatus = "LOADING" | TokenStatus | "DONE";

export default function EvaluatorActivatePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const [status, setStatus] = useState<ViewStatus>("LOADING");

  useEffect(() => {
    if (!token) {
      setStatus("INVALID");
      return;
    }
    authService
      .checkActivationToken(token)
      .then(({ data }) => setStatus(data.status))
      .catch(() => setStatus("INVALID"));
  }, [token]);

  async function handleCreatePassword(password: string) {
    if (!token) return;
    try {
      await authService.activateEvaluator(token, password);
      setStatus("DONE");
      router.push("/evaluator/onboarding");
    } catch {
      setStatus("INVALID");
    }
  }

  if (status === "LOADING") return <p>Verificando link...</p>;
  if (status === "INVALID") return <p>Este link de convite é inválido.</p>;
  if (status === "EXPIRED") return <p>Este link expirou. Peça um novo convite.</p>;
  if (status === "USED") return <p>Este convite já foi utilizado.</p>;

  return <CreatePasswordForm onSubmit={handleCreatePassword} />;
}

function CreatePasswordForm({ onSubmit }: { onSubmit: (password: string) => void }) {
  const [password, setPassword] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(password); }}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Crie sua senha"
      />
      <button type="submit">Ativar conta</button>
    </form>
  );
}
```

### Hook de login (uso em `src/app/login/page.tsx`)

```tsx
"use client";

import { useRouter } from "next/navigation";
import { authService } from "@/lib/authService";
import { resolveRedirect } from "@/lib/redirectByProfile";

export function useLogin() {
  const router = useRouter();

  return async function handleLogin(credentials: { email: string; password: string }) {
    await authService.login(credentials);
    const { data: user } = await authService.me();
    router.push(resolveRedirect(user));
  };
}
```

### `src/middleware.ts` (proteção de rota por perfil, status e onboarding)

```typescript
import { NextRequest, NextResponse } from "next/server";

const roleAreas: Record<string, string> = {
  "/candidate": "CANDIDATE",
  "/evaluator": "EVALUATOR",
  "/admin": "ADMIN",
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const matchedArea = Object.keys(roleAreas).find((area) => path.startsWith(area));
  if (!matchedArea) return NextResponse.next();

  const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: { cookie: req.headers.get("cookie") ?? "" },
  });

  if (!meRes.ok) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const user = await meRes.json();

  if (user.accountStatus !== "ACTIVE") {
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  if (!user.onboardingCompleted && !path.includes("onboarding")) {
    return NextResponse.redirect(new URL(`${matchedArea}/onboarding`, req.url));
  }

  if (user.role !== roleAreas[matchedArea]) {
    return NextResponse.redirect(new URL(resolveRedirectPath(user), req.url));
  }

  return NextResponse.next();
}

function resolveRedirectPath(user: { role: string; onboardingCompleted: boolean }) {
  const base = `/${user.role.toLowerCase()}`;
  return user.onboardingCompleted ? `${base}/dashboard` : `${base}/onboarding`;
}

export const config = {
  matcher: ["/candidate/:path*", "/evaluator/:path*", "/admin/:path*"],
};
```

---

## 5. Pendências em aberto

- **Confirmar** se `apps/api` e `apps/web` vão rodar no mesmo domínio (via proxy/rewrite) ou domínios/portas separadas — isso muda `sameSite`/`secure` do cookie em produção.
- Implementar o `inviteEvaluator` (geração do token pelo Admin) — fica no módulo de Administração, fora do escopo de Auth.
- Implementar `register` e `verify-email` completos no `AuthService` (esqueleto do contrato já definido no controller).
