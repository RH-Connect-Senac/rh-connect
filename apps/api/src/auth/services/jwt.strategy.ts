import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../auth.types';
import { JWT_COOKIE_NAME } from '../auth.constants';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
 constructor(private readonly configService: ConfigService) {
   super({
     jwtFromRequest: (req: Request) => req?.cookies?.[JWT_COOKIE_NAME] ?? null,
     ignoreExpiration: false,
     secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
   });
 }
 async validate(payload: JwtPayload) {
   return { id: payload.sub, email: payload.email, role: payload.role };
 }
}