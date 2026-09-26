import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    // Prompt 13 (M1): proteção mínima contra brute force/abuso, restrita aos
    // endpoints sensíveis do AuthController (login, refresh, evaluator/
    // activate) via `@UseGuards(ThrottlerGuard)` + `@Throttle(...)` em cada
    // rota — NÃO registrado como guard global (APP_GUARD), então nenhuma
    // outra rota da aplicação é afetada. Armazenamento em memória (padrão do
    // pacote), sem tabela nova no banco, sem Redis, sem bloqueio permanente
    // de conta. O valor abaixo é só o default do módulo; cada rota sensível
    // sobrescreve com seu próprio limite via `@Throttle`.
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60s
        limit: 20,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
