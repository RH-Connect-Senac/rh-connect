/*
https://docs.nestjs.com/controllers#controllers
*/

import {
  Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JWT_COOKIE_NAME, jwtExpiresInMs } from './auth.constants';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './services/auth.service';
import type { LoginDto, RegisterDto } from './dto/auth.dto';

function cookieOptions(): { httpOnly : boolean, secure : boolean, sameSite : 'lax' } {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, accessToken } = await this.authService.login(dto)
    res.cookie(JWT_COOKIE_NAME, accessToken, {
      ...cookieOptions(),
      maxAge: jwtExpiresInMs(process.env.JWT_EXPIRES_IN),
    })
    return user
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(JWT_COOKIE_NAME, cookieOptions())
    return { message: 'Logout realizado com sucesso' }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const user = req.user as { id: string }
    return this.authService.getById(user.id)
  }
}