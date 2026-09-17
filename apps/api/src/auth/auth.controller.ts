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

import type { Response, Request } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { InviteEvaluatorDto } from './dto/invite-evaluator.dto';
import { ActivateEvaluatorDto } from './dto/activate-evaluator.dto';
import { Roles } from './decorators/roles.decorator';
import { RolesGuard } from './guards/roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token, refreshToken } = await this.authService.login(dto);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 15,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return user;
  }
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    return { message: 'Logout realizado com sucesso' };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não encontrado');
    }

    const { token } = await this.authService.refresh(refreshToken);

    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 15,
    });

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
