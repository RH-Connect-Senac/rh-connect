import {
  AI_RATE_LIMIT_MAX_TRACKED_KEYS,
  AI_RATE_LIMIT_RULES,
  AiRateLimiter,
} from './ai-rate-limiter';

describe('AiRateLimiter', () => {
  let now: number;
  let limiter: AiRateLimiter;

  beforeEach(() => {
    now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    limiter = new AiRateLimiter();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const MINUTE = AI_RATE_LIMIT_RULES[0];

  it('permite até o máximo por minuto e bloqueia a próxima com Retry-After', () => {
    for (let i = 0; i < MINUTE.max; i += 1) {
      expect(limiter.consume('user:1')).toEqual({ allowed: true });
    }

    const blocked = limiter.consume('user:1');
    expect(blocked).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it('o Retry-After diminui conforme o tempo passa', () => {
    for (let i = 0; i < MINUTE.max; i += 1) limiter.consume('user:1');

    now += 45_000;
    expect(limiter.consume('user:1')).toEqual({
      allowed: false,
      retryAfterSeconds: 15,
    });
  });

  it('libera de novo quando a janela de um minuto passa', () => {
    for (let i = 0; i < MINUTE.max; i += 1) limiter.consume('user:1');
    expect(limiter.consume('user:1').allowed).toBe(false);

    now += MINUTE.windowMs;
    expect(limiter.consume('user:1')).toEqual({ allowed: true });
  });

  it('cada usuário tem a própria cota', () => {
    for (let i = 0; i < MINUTE.max; i += 1) limiter.consume('user:1');

    expect(limiter.consume('user:1').allowed).toBe(false);
    expect(limiter.consume('user:2')).toEqual({ allowed: true });
  });

  it('requisições recusadas não contam (insistir não estende o bloqueio)', () => {
    for (let i = 0; i < MINUTE.max; i += 1) limiter.consume('user:1');

    now += 30_000;
    for (let i = 0; i < 50; i += 1) {
      expect(limiter.consume('user:1').allowed).toBe(false);
    }

    now += 30_000; // 60 s após as primeiras chamadas aceitas
    expect(limiter.consume('user:1')).toEqual({ allowed: true });
  });

  it('aplica também o teto por hora, mesmo respeitando o limite por minuto', () => {
    const hourly = AI_RATE_LIMIT_RULES[1];

    for (let i = 0; i < hourly.max; i += 1) {
      expect(limiter.consume('user:1')).toEqual({ allowed: true });
      now += 50_000; // nunca estoura o limite por minuto
    }

    const blocked = limiter.consume('user:1');
    expect(blocked.allowed).toBe(false);
    if (!blocked.allowed) {
      expect(blocked.retryAfterSeconds).toBeGreaterThan(60);
    }

    now += hourly.windowMs;
    expect(limiter.consume('user:1')).toEqual({ allowed: true });
  });

  it('aceita regras customizadas (usado para testar limites pequenos)', () => {
    const rules = [{ windowMs: 1_000, max: 2 }];

    expect(limiter.consume('k', rules).allowed).toBe(true);
    expect(limiter.consume('k', rules).allowed).toBe(true);
    expect(limiter.consume('k', rules).allowed).toBe(false);
  });

  it('limita a memória: nunca rastreia mais chaves que o teto', () => {
    for (let i = 0; i < AI_RATE_LIMIT_MAX_TRACKED_KEYS + 500; i += 1) {
      limiter.consume(`user:${i}`);
    }

    expect(limiter.trackedKeys()).toBeLessThanOrEqual(
      AI_RATE_LIMIT_MAX_TRACKED_KEYS,
    );
  });

  it('ao ultrapassar o teto, descarta primeiro as chaves já expiradas', () => {
    for (let i = 0; i < AI_RATE_LIMIT_MAX_TRACKED_KEYS; i += 1) {
      limiter.consume(`old:${i}`);
    }
    expect(limiter.trackedKeys()).toBe(AI_RATE_LIMIT_MAX_TRACKED_KEYS);

    now += 2 * 60 * 60_000; // tudo expirou
    expect(limiter.consume('novo')).toEqual({ allowed: true });

    expect(limiter.trackedKeys()).toBe(1);
  });
});
