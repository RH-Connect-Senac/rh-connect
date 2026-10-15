import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { AI_RATE_LIMIT_MESSAGE, AiRateLimitGuard } from './ai-rate-limit.guard';
import { AI_RATE_LIMIT_RULES, AiRateLimiter } from './ai-rate-limiter';

function contextFor(
  request: Record<string, unknown>,
  setHeader: jest.Mock = jest.fn(),
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader }),
    }),
  } as unknown as ExecutionContext;
}

describe('AiRateLimitGuard', () => {
  let limiter: AiRateLimiter;
  let guard: AiRateLimitGuard;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(5_000_000);
    limiter = new AiRateLimiter();
    guard = new AiRateLimitGuard(limiter);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const MAX = AI_RATE_LIMIT_RULES[0].max;

  it('permite requisições dentro do limite', () => {
    const ctx = contextFor({ user: { id: 7 } });
    for (let i = 0; i < MAX; i += 1) {
      expect(guard.canActivate(ctx)).toBe(true);
    }
  });

  it('responde 429 com mensagem segura e Retry-After ao exceder', () => {
    const setHeader = jest.fn();
    const ctx = contextFor({ user: { id: 7 } }, setHeader);
    for (let i = 0; i < MAX; i += 1) guard.canActivate(ctx);

    let error: unknown;
    try {
      guard.canActivate(ctx);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(HttpException);
    const http = error as HttpException;
    expect(http.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect(http.message).toBe(AI_RATE_LIMIT_MESSAGE);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', '60');
  });

  it('a cota é por usuário (um usuário bloqueado não afeta outro)', () => {
    const alice = contextFor({ user: { id: 1 } });
    const bob = contextFor({ user: { id: 2 } });
    for (let i = 0; i < MAX; i += 1) guard.canActivate(alice);

    expect(() => guard.canActivate(alice)).toThrow(HttpException);
    expect(guard.canActivate(bob)).toBe(true);
  });

  it('sem usuário autenticado, usa o IP como último recurso', () => {
    const anon = contextFor({ ip: '203.0.113.9' });
    for (let i = 0; i < MAX; i += 1) guard.canActivate(anon);

    expect(() => guard.canActivate(anon)).toThrow(HttpException);
    expect(guard.canActivate(contextFor({ ip: '203.0.113.10' }))).toBe(true);
  });

  it('instâncias do guard que compartilham o limitador compartilham a cota', () => {
    const other = new AiRateLimitGuard(limiter);
    const ctx = contextFor({ user: { id: 3 } });
    for (let i = 0; i < MAX; i += 1) guard.canActivate(ctx);

    expect(() => other.canActivate(ctx)).toThrow(HttpException);
  });

  it('funciona mesmo se a resposta não expõe setHeader', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 9 } }),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
    for (let i = 0; i < MAX; i += 1) guard.canActivate(ctx);

    expect(() => guard.canActivate(ctx)).toThrow(HttpException);
  });
});
