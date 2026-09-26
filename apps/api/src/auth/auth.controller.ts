import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  UseGuards,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import type { Response, Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InviteEvaluatorDto } from './dto/invite-evaluator.dto';
import { ActivateEvaluatorDto } from './dto/activate-evaluator.dto';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

const ACCESS_TOKEN_COOKIE_NAME = 'access_token';
const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';
const ACCESS_TOKEN_MAX_AGE_MS = 1000 * 60 * 15; // 15 minutos
const REFRESH_TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias

// QA de segurança (Bloco 6): opções de cookie centralizadas aqui para
// evitar duplicação/inconsistência entre login, refresh e logout — antes,
// cada handler repetia as mesmas quatro opções de forma independente.
// `path: '/'` passou a ser explícito (o Express já usava '/' como default
// quando nenhum `path` era informado, então isso não muda o cookie
// observável pelo navegador). `httpOnly`, `secure` e `sameSite` não
// mudaram, e nem os nomes/durações dos cookies.
function baseAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

function setAuthCookies(
  res: Response,
  tokens: { accessToken: string; refreshToken: string },
) {
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, tokens.accessToken, {
    ...baseAuthCookieOptions(),
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });

  res.cookie(REFRESH_TOKEN_COOKIE_NAME, tokens.refreshToken, {
    ...baseAuthCookieOptions(),
    maxAge: REFRESH_TOKEN_MAX_AGE_MS,
  });
}

function clearAuthCookies(res: Response) {
  // `maxAge` não é necessário (e não deve ser usado) no `clearCookie` — o
  // navegador só precisa das opções que identificam QUAL cookie remover
  // (nome + as mesmas `path`/`httpOnly`/`secure`/`sameSite` usadas na
  // criação); `clearCookie` já define a expiração no passado internamente.
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, baseAuthCookieOptions());
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, baseAuthCookieOptions());
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  // QA de segurança (B5-01): o cadastro é um endpoint público sem nenhuma
  // proteção contra automação — permitia criação em massa de contas e
  // consumo desnecessário de banco/bcrypt. Reaproveita a mesma infra de
  // @nestjs/throttler já usada em login/refresh/evaluator-activate, sem
  // mecanismo paralelo. Limite ajustado para 100/60s (igual ao de login),
  // alinhando com os demais valores já validados com o professor para o
  // ambiente acadêmico/demo: considerando 40–60 pessoas testando
  // simultaneamente, possivelmente atrás do mesmo IP público da rede do
  // Senac, o valor anterior (60) deixava pouca margem para retentativas de
  // validação (senha fraca, termos não aceitos, e-mail duplicado etc.) sem
  // gerar 429 legítimo durante o teste coletivo.
  // Revisar antes de uso real em produção.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  // Prompt 13 (M1): limite definido para o ambiente acadêmico/demo,
  // considerando aproximadamente 40–60 pessoas testando simultaneamente
  // e a possibilidade de compartilharem o mesmo IP público.
  // Revisar antes de uso real em produção.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token, refreshToken } = await this.authService.login(dto);

    setAuthCookies(res, { accessToken: token, refreshToken });

    return user;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    clearAuthCookies(res);

    return { message: 'Logout realizado com sucesso' };
  }

  @Post('refresh')
  @HttpCode(200)
  // Prompt 13 (M1): limite definido para o ambiente acadêmico/demo,
  // com margem maior por ser um endpoint acionado durante a renovação de sessão.
  // Revisar antes de uso real em produção.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não encontrado');
    }

    // Rotação de refresh token: `AuthService.refresh` agora também revoga o
    // token recebido e emite um novo — o cookie `refresh_token` precisa ser
    // atualizado com esse novo valor, senão o cliente continuaria enviando
    // um token já revogado na próxima renovação.
    const { token, refreshToken: newRefreshToken } =
      await this.authService.refresh(refreshToken);

    setAuthCookies(res, { accessToken: token, refreshToken: newRefreshToken });

    return { message: 'Access token renovado com sucesso' };
  }

  @Post('evaluator/invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async inviteEvaluator(@Body() dto: InviteEvaluatorDto) {
    return this.authService.inviteEvaluator(dto);
  }

  @Post('evaluator/activate')
  @HttpCode(200)
  // Prompt 13 (M1): limite definido para o ambiente acadêmico/demo.
  // A ativação é um fluxo pontual, mas o valor considera testes simultâneos
  // e possível compartilhamento de IP durante a apresentação.
  // Revisar antes de uso real em produção.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  async activateEvaluator(@Body() dto: ActivateEvaluatorDto) {
    return this.authService.activateEvaluator(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const user = req.user as { id: number };

    return this.authService.getById(user.id);
  }

  @Put('candidate/onboarding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CANDIDATE')
  async completeCandidateOnboarding(@Req() req: Request) {
    const user = req.user as { id: number };

    return this.authService.completeOnboarding(user.id);
  }

  @Put('evaluator/onboarding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EVALUATOR')
  async completeEvaluatorOnboarding(@Req() req: Request) {
    const user = req.user as { id: number };

    return this.authService.completeOnboarding(user.id);
  }

  @Put('admin/onboarding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async completeAdminOnboarding(@Req() req: Request) {
    const user = req.user as { id: number };

    return this.authService.completeOnboarding(user.id);
  }
}