import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AiRateLimiter } from './ai-rate-limiter';

export const AI_RATE_LIMIT_MESSAGE =
  'Muitas solicitações em pouco tempo. Aguarde um instante e tente novamente.';

// Deve vir DEPOIS de JwtAuthGuard e RolesGuard: só requisições autenticadas e
// autorizadas consomem cota (e a chave é o id do JWT, nunca um dado do cliente).
// O IP é só um último recurso, caso o guard seja usado sem autenticação.
@Injectable()
export class AiRateLimitGuard implements CanActivate {
  constructor(private readonly limiter: AiRateLimiter) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<{ user?: { id?: number }; ip?: string }>();
    const userId = request.user?.id;
    const key =
      userId !== undefined && userId !== null
        ? `user:${userId}`
        : `ip:${request.ip ?? 'unknown'}`;

    const decision = this.limiter.consume(key);
    if (decision.allowed) {
      return true;
    }

    const response = http.getResponse<{
      setHeader?: (name: string, value: string) => void;
    }>();
    response?.setHeader?.('Retry-After', String(decision.retryAfterSeconds));
    throw new HttpException(
      AI_RATE_LIMIT_MESSAGE,
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
