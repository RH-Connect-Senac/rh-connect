// O pipeline (importado só para conferir a tabela `retryable`) carrega o
// InterviewsAiService, que importa `@nestjs/config` (ESM no Jest): isolado como nos demais specs.
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {
    get() {
      return undefined;
    }
  },
}));

import {
  AI_EVALUATION_FAILURE_RETRYABLE,
  type AiEvaluationPipelineFailureCode,
  type AiEvaluationPipelineResult,
} from './ai-evaluation-pipeline.service';
import {
  AiEvaluationPolicyConfigError,
  DEFAULT_BRAKE_CONFIG,
  DEFAULT_BUDGET_CONFIG,
  DEFAULT_RETRY_CONFIG,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  checkAiRequestBudget,
  checkStartBudget,
  classifyPipelineResult,
  computeBackoffSeconds,
  evaluateBrake,
  exhaustionReason,
  resolveBrakeConfig,
  resolveBudgetConfig,
  resolveRetryConfig,
  toBrakeEvent,
  type AiEvaluationBudgetConfig,
  type AiRequestCounters,
  type AiWorkerAction,
  type BrakeEvent,
  type StartCounters,
} from './ai-evaluation-worker-policy';

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';
const retry = resolveRetryConfig();
const NOON = new Date('2026-01-01T12:00:00.000Z');
const at = (secondsAgo: number) => new Date(NOON.getTime() - secondsAgo * 1000);
const middle = () => 0.5; // jitter nulo

const ALL_CODES = Object.keys(
  AI_EVALUATION_FAILURE_RETRYABLE,
) as AiEvaluationPipelineFailureCode[];

function failed(
  code: AiEvaluationPipelineFailureCode,
  extra: Partial<
    Extract<AiEvaluationPipelineResult, { status: 'failed' }>
  > = {},
): AiEvaluationPipelineResult {
  return {
    status: 'failed',
    interviewId: INTERVIEW_ID,
    stage: 'evaluate',
    code,
    retryable: AI_EVALUATION_FAILURE_RETRYABLE[code],
    ...extra,
  };
}

function classify(
  result: AiEvaluationPipelineResult,
  attemptNumber = 1,
  config = retry,
  random = middle,
): AiWorkerAction {
  return classifyPipelineResult(result, {
    attemptNumber,
    retry: config,
    random,
  });
}

describe('configuração e valores provisórios', () => {
  it('os padrões são os valores provisórios aprovados (D4)', () => {
    expect(DEFAULT_RETRY_CONFIG).toEqual({
      maxAttempts: 4,
      backoffBaseSeconds: 60,
      backoffCapSeconds: 600,
      jitterRatio: 0.2,
      maxAgeSeconds: SECONDS_PER_DAY,
    });
    expect(DEFAULT_BRAKE_CONFIG).toEqual({
      failureThreshold: 3,
      pauseSeconds: 300,
    });
    expect(DEFAULT_BUDGET_CONFIG.maxConcurrent).toBe(1);
  });

  it('NENHUM limite ou teto da Groq tem valor padrão (nunca presumido a partir de chaves)', () => {
    const budget = resolveBudgetConfig();
    for (const key of [
      'maxStartsPerHour',
      'maxStartsPerDay',
      'maxAiRequestsPerHour',
      'maxAiRequestsPerDay',
      'maxGroqCallsUpperBoundPerHour',
      'maxGroqCallsUpperBoundPerDay',
      'groqCallsUpperBoundPerAiRequest',
    ] as const) {
      expect(budget[key]).toBeUndefined();
    }
    expect(resolveRetryConfig().pythonWorstCaseSeconds).toBeUndefined();
  });

  it.each([
    ['maxAttempts', { maxAttempts: 0 }],
    ['maxAttempts', { maxAttempts: 1.5 }],
    ['backoffBaseSeconds', { backoffBaseSeconds: 0 }],
    ['backoffCapSeconds', { backoffBaseSeconds: 100, backoffCapSeconds: 50 }],
    ['jitterRatio', { jitterRatio: -0.1 }],
    ['jitterRatio', { jitterRatio: 0.9 }],
    ['maxAgeSeconds', { maxAgeSeconds: -1 }],
    ['pythonWorstCaseSeconds', { pythonWorstCaseSeconds: 0 }],
  ])('retry: %s inválido é recusado', (field, override) => {
    expect(() => resolveRetryConfig(override)).toThrow(
      AiEvaluationPolicyConfigError,
    );
    try {
      resolveRetryConfig(override);
    } catch (error) {
      expect((error as AiEvaluationPolicyConfigError).field).toBe(field);
    }
  });

  it.each([
    [{ failureThreshold: 0 }],
    [{ pauseSeconds: 0 }],
    [{ failureThreshold: 1.2 }],
  ])('freio: %p inválido é recusado', (override) => {
    expect(() => resolveBrakeConfig(override)).toThrow(
      AiEvaluationPolicyConfigError,
    );
  });

  it.each([
    [{ maxConcurrent: 0 }],
    [{ maxStartsPerHour: 0 }],
    [{ maxAiRequestsPerDay: -3 }],
    [{ recheckSeconds: 0 }],
    [
      {
        maxGroqCallsUpperBoundPerHour: 1.5,
        groqCallsUpperBoundPerAiRequest: 2,
      },
    ],
  ])('orçamento: %p inválido é recusado', (override) => {
    expect(() => resolveBudgetConfig(override)).toThrow(
      AiEvaluationPolicyConfigError,
    );
  });

  it('um teto de chamadas à Groq exige o teto POR chamada à IA configurado (nunca presumido)', () => {
    expect(() =>
      resolveBudgetConfig({ maxGroqCallsUpperBoundPerHour: 100 }),
    ).toThrow(AiEvaluationPolicyConfigError);
    expect(() =>
      resolveBudgetConfig({ maxGroqCallsUpperBoundPerDay: 100 }),
    ).toThrow(AiEvaluationPolicyConfigError);
    expect(
      resolveBudgetConfig({
        maxGroqCallsUpperBoundPerHour: 100,
        groqCallsUpperBoundPerAiRequest: 4,
      }).groqCallsUpperBoundPerAiRequest,
    ).toBe(4);
  });
});

describe('backoff exponencial com teto e jitter', () => {
  it('sem jitter: 60, 120, 240, 480 e depois o teto de 600 s', () => {
    const noJitter = resolveRetryConfig({ jitterRatio: 0 });
    expect(
      [1, 2, 3, 4, 5, 6].map((n) => computeBackoffSeconds(n, noJitter, middle)),
    ).toEqual([60, 120, 240, 480, 600, 600]);
  });

  it('o jitter varia no máximo ±20% e NUNCA ultrapassa o teto', () => {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const base = Math.min(60 * 2 ** (attempt - 1), 600);
      const low = computeBackoffSeconds(attempt, retry, () => 0);
      const high = computeBackoffSeconds(attempt, retry, () => 0.999999);
      expect(low).toBeGreaterThanOrEqual(Math.floor(base * 0.8));
      expect(high).toBeLessThanOrEqual(600);
      expect(high).toBeLessThanOrEqual(Math.ceil(base * 1.2));
      expect(low).toBeLessThanOrEqual(high);
    }
  });

  it('é determinístico para o mesmo gerador e sempre inteiro e positivo', () => {
    expect(computeBackoffSeconds(3, retry, () => 0.3)).toBe(
      computeBackoffSeconds(3, retry, () => 0.3),
    );
    for (const random of [0, 0.25, 0.5, 0.75, 0.9999]) {
      const value = computeBackoffSeconds(2, retry, () => random);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
    }
  });

  it('número de tentativa inválido é recusado', () => {
    expect(() => computeBackoffSeconds(0, retry, middle)).toThrow(
      AiEvaluationPolicyConfigError,
    );
    expect(() => computeBackoffSeconds(1.5, retry, middle)).toThrow(
      AiEvaluationPolicyConfigError,
    );
  });
});

describe('limites de tentativas e idade de execução', () => {
  it('tentativas esgotadas têm precedência; abaixo do limite não há esgotamento', () => {
    expect(
      exhaustionReason({ attempts: 3, firstClaimedAt: null }, NOON, retry),
    ).toBeNull();
    expect(
      exhaustionReason({ attempts: 4, firstClaimedAt: null }, NOON, retry),
    ).toBe('MAX_ATTEMPTS');
    expect(
      exhaustionReason(
        { attempts: 9, firstClaimedAt: at(10 * SECONDS_PER_DAY) },
        NOON,
        retry,
      ),
    ).toBe('MAX_ATTEMPTS');
  });

  it('a idade conta desde o PRIMEIRO claim; entrevista nunca reivindicada não expira, por mais antiga', () => {
    expect(
      exhaustionReason({ attempts: 0, firstClaimedAt: null }, NOON, retry),
    ).toBeNull();
    expect(
      exhaustionReason(
        { attempts: 1, firstClaimedAt: at(SECONDS_PER_DAY - 1) },
        NOON,
        retry,
      ),
    ).toBeNull();
    expect(
      exhaustionReason(
        { attempts: 1, firstClaimedAt: at(SECONDS_PER_DAY) },
        NOON,
        retry,
      ),
    ).toBe('EXPIRED');
    expect(
      exhaustionReason(
        { attempts: 1, firstClaimedAt: at(SECONDS_PER_DAY * 30) },
        NOON,
        retry,
      ),
    ).toBe('EXPIRED');
  });
});

describe('classificação dos resultados do pipeline', () => {
  it('sucessos viram "done", propagando a duração da IA', () => {
    expect(
      classify({
        status: 'persisted',
        interviewId: INTERVIEW_ID,
        evaluationId: 'e',
        aiDurationMs: 1234,
      }),
    ).toEqual({ kind: 'done', outcome: 'PERSISTED', aiDurationMs: 1234 });
    expect(
      classify({
        status: 'already_persisted',
        interviewId: INTERVIEW_ID,
        evaluationId: 'e',
        aiDurationMs: 9,
      }),
    ).toEqual({ kind: 'done', outcome: 'ALREADY_PERSISTED', aiDurationMs: 9 });
    expect(
      classify({
        status: 'nothing_to_do',
        interviewId: INTERVIEW_ID,
        reason: 'ALREADY_COMPLETED',
      }),
    ).toEqual({ kind: 'done', outcome: 'NOTHING_TO_DO' });
  });

  it('TODO código de falha do pipeline tem tratamento definido e coerente com `retryable`', () => {
    expect(ALL_CODES.length).toBeGreaterThanOrEqual(16);
    for (const code of ALL_CODES) {
      const first = classify(failed(code), 1);
      const last = classify(failed(code), retry.maxAttempts);
      expect(JSON.stringify(first)).not.toContain('undefined');
      if (AI_EVALUATION_FAILURE_RETRYABLE[code]) {
        expect(first).toMatchObject({ kind: 'retry', errorCode: code });
        expect(last).toMatchObject({
          kind: 'terminal',
          reason: 'MAX_ATTEMPTS',
          errorCode: code,
        });
      } else {
        // Falha não repetível: terminal já na primeira tentativa, sem nova chamada à IA.
        expect(first).toMatchObject({
          kind: 'terminal',
          reason: 'NON_RETRYABLE',
          errorCode: code,
        });
        expect(last).toMatchObject({
          kind: 'terminal',
          reason: 'NON_RETRYABLE',
          errorCode: code,
        });
      }
      // O código vai para uma coluna VARCHAR(40).
      const recorded = 'errorCode' in first ? first.errorCode : '';
      expect(recorded.length).toBeLessThanOrEqual(40);
    }
  });

  it('INCONSISTENT_STATE e estados inválidos são terminais imediatos (nunca repetidos)', () => {
    for (const code of [
      'INCONSISTENT_STATE',
      'INVALID_INTERVIEW_STATE',
      'WRONG_EVALUATION_MODE',
      'INTERVIEW_NOT_FOUND',
      'INVALID_INPUT',
      'AI_REJECTED_PAYLOAD',
      'PERSISTENCE_REJECTED',
      'UNEXPECTED',
    ] as const) {
      expect(classify(failed(code), 1)).toMatchObject({
        kind: 'terminal',
        reason: 'NON_RETRYABLE',
      });
    }
  });

  it('falhas repetíveis agendam backoff crescente enquanto houver tentativas', () => {
    const waits = [1, 2, 3].map((attempt) => {
      const action = classify(
        failed('AI_UPSTREAM_ERROR'),
        attempt,
        resolveRetryConfig({ jitterRatio: 0 }),
      );
      if (action.kind !== 'retry') throw new Error('esperava retry');
      return action.retryAfterSeconds;
    });
    expect(waits).toEqual([60, 120, 240]);
  });

  it('o limite de tentativas respeita a configuração', () => {
    const two = resolveRetryConfig({ maxAttempts: 2 });
    expect(classify(failed('AI_TIMEOUT'), 1, two).kind).toBe('retry');
    expect(classify(failed('AI_TIMEOUT'), 2, two)).toMatchObject({
      kind: 'terminal',
      reason: 'MAX_ATTEMPTS',
    });
  });

  it('AI_TIMEOUT espera ao menos o pior caso do Python quando configurado; sem configuração só vale o backoff', () => {
    const noJitter = resolveRetryConfig({ jitterRatio: 0 });
    const withWorstCase = resolveRetryConfig({
      jitterRatio: 0,
      pythonWorstCaseSeconds: 300,
    });
    expect(classify(failed('AI_TIMEOUT'), 1, noJitter)).toMatchObject({
      retryAfterSeconds: 60,
    });
    expect(classify(failed('AI_TIMEOUT'), 1, withWorstCase)).toMatchObject({
      retryAfterSeconds: 300,
    });
    // Outros erros não ganham essa espera extra.
    expect(classify(failed('AI_UNAVAILABLE'), 1, withWorstCase)).toMatchObject({
      retryAfterSeconds: 60,
    });
    // Backoff maior que o pior caso continua valendo.
    expect(
      classify(
        failed('AI_TIMEOUT'),
        3,
        resolveRetryConfig({ jitterRatio: 0, pythonWorstCaseSeconds: 30 }),
      ),
    ).toMatchObject({
      retryAfterSeconds: 240,
    });
  });

  it('a duração da IA acompanha a ação de falha', () => {
    expect(
      classify(failed('AI_TIMEOUT', { aiDurationMs: 4200 }), 1),
    ).toMatchObject({ aiDurationMs: 4200 });
    expect(
      classify(failed('AI_REJECTED_PAYLOAD', { aiDurationMs: 7 }), 1),
    ).toMatchObject({ aiDurationMs: 7 });
  });

  it('"skipped" (duplicidade local) vira repetição curta, nunca sucesso nem terminal', () => {
    expect(
      classify({
        status: 'skipped',
        interviewId: INTERVIEW_ID,
        reason: 'IN_FLIGHT',
      }),
    ).toMatchObject({ kind: 'retry', errorCode: 'IN_FLIGHT' });
  });

  it('"skipped" espera um valor fixo (base do backoff), sem escalonar com a tentativa', () => {
    const skipped = {
      status: 'skipped',
      interviewId: INTERVIEW_ID,
      reason: 'IN_FLIGHT',
    } as const;
    const waits = [1, 2, 3].map(
      (attempt) =>
        (classify(skipped, attempt) as { retryAfterSeconds: number })
          .retryAfterSeconds,
    );
    expect(waits).toEqual([60, 60, 60]);
  });

  it('a política nunca escreve nem decide `COMPLETED`: nenhuma ação conclui sem sucesso do pipeline', () => {
    for (const code of ALL_CODES) {
      for (const attempt of [1, 2, 4]) {
        expect(classify(failed(code), attempt).kind).not.toBe('done');
      }
    }
  });
});

describe('orçamentos: avaliações iniciadas x chamadas à IA x teto da Groq', () => {
  const start = (override: Partial<StartCounters> = {}): StartCounters => ({
    activeLeases: 0,
    startsLastHour: 0,
    startsLastDay: 0,
    ...override,
  });
  const ai = (
    override: Partial<AiRequestCounters> = {},
  ): AiRequestCounters => ({
    aiRequestsLastHour: 0,
    aiRequestsLastDay: 0,
    groqCallsUpperBoundLastHour: 0,
    groqCallsUpperBoundLastDay: 0,
    ...override,
  });
  const budget = (override: Partial<AiEvaluationBudgetConfig> = {}) =>
    resolveBudgetConfig(override);

  it('sem limites configurados, só a concorrência restringe', () => {
    expect(
      checkStartBudget(start({ startsLastHour: 9_999 }), budget()),
    ).toEqual({ allowed: true });
    expect(
      checkAiRequestBudget(ai({ aiRequestsLastDay: 9_999 }), budget()),
    ).toEqual({
      allowed: true,
      callsUpperBound: null,
    });
  });

  it('concorrência: nega com leases ativos iguais ou acima do teto', () => {
    expect(
      checkStartBudget(start({ activeLeases: 1 }), budget()),
    ).toMatchObject({
      allowed: false,
      reason: 'CONCURRENCY',
    });
    expect(
      checkStartBudget(
        start({ activeLeases: 1 }),
        budget({ maxConcurrent: 2 }),
      ),
    ).toEqual({ allowed: true });
  });

  it('orçamento de INÍCIOS (claims) por hora e por dia, com o limite exato permitido até N-1', () => {
    const limited = budget({ maxStartsPerHour: 5, maxStartsPerDay: 20 });
    expect(checkStartBudget(start({ startsLastHour: 4 }), limited)).toEqual({
      allowed: true,
    });
    expect(
      checkStartBudget(start({ startsLastHour: 5 }), limited),
    ).toMatchObject({
      reason: 'STARTS_PER_HOUR',
      retryAfterSeconds: 60,
    });
    expect(
      checkStartBudget(start({ startsLastDay: 20 }), limited),
    ).toMatchObject({
      reason: 'STARTS_PER_DAY',
    });
  });

  it('o orçamento de INÍCIOS nunca olha chamadas à IA nem à Groq (um claim não é uma chamada)', () => {
    const limited = budget({
      maxStartsPerHour: 5,
      maxAiRequestsPerHour: 10,
      maxGroqCallsUpperBoundPerHour: 20,
      groqCallsUpperBoundPerAiRequest: 4,
    });
    // Só os inícios contam: 1 início < 5 permitidos, mesmo com limites de IA/Groq
    // diferentes (e até maiores) configurados.
    expect(checkStartBudget(start({ startsLastHour: 1 }), limited)).toEqual({
      allowed: true,
    });
    expect(
      checkStartBudget(start({ startsLastHour: 5 }), limited),
    ).toMatchObject({
      reason: 'STARTS_PER_HOUR',
    });
  });

  it('o orçamento de chamadas à IA nunca olha inícios', () => {
    const limited = budget({ maxStartsPerHour: 1, maxAiRequestsPerHour: 10 });
    expect(
      checkAiRequestBudget(ai({ aiRequestsLastHour: 2 }), limited),
    ).toEqual({
      allowed: true,
      callsUpperBound: null,
    });
  });

  it('chamadas à IA por hora e por dia', () => {
    const limited = budget({
      maxAiRequestsPerHour: 3,
      maxAiRequestsPerDay: 10,
    });
    expect(
      checkAiRequestBudget(ai({ aiRequestsLastHour: 2 }), limited).allowed,
    ).toBe(true);
    expect(
      checkAiRequestBudget(ai({ aiRequestsLastHour: 3 }), limited),
    ).toMatchObject({
      allowed: false,
      reason: 'AI_REQUESTS_PER_HOUR',
    });
    expect(
      checkAiRequestBudget(ai({ aiRequestsLastDay: 10 }), limited),
    ).toMatchObject({
      reason: 'AI_REQUESTS_PER_DAY',
    });
  });

  it('teto ESTIMADO de chamadas à Groq: soma o teto desta chamada ao já gasto e o devolve para gravar', () => {
    const limited = budget({
      maxGroqCallsUpperBoundPerHour: 10,
      maxGroqCallsUpperBoundPerDay: 40,
      groqCallsUpperBoundPerAiRequest: 4,
    });
    expect(
      checkAiRequestBudget(ai({ groqCallsUpperBoundLastHour: 6 }), limited),
    ).toEqual({
      allowed: true,
      callsUpperBound: 4,
    });
    expect(
      checkAiRequestBudget(ai({ groqCallsUpperBoundLastHour: 7 }), limited),
    ).toMatchObject({
      allowed: false,
      reason: 'GROQ_CALLS_UPPER_BOUND_PER_HOUR',
      callsUpperBound: 4,
    });
    expect(
      checkAiRequestBudget(ai({ groqCallsUpperBoundLastDay: 37 }), limited),
    ).toMatchObject({
      reason: 'GROQ_CALLS_UPPER_BOUND_PER_DAY',
    });
  });

  it('as três medidas são independentes: estourar uma não nega as outras', () => {
    const limited = budget({
      maxStartsPerHour: 1,
      maxAiRequestsPerHour: 1,
      maxGroqCallsUpperBoundPerHour: 100,
      groqCallsUpperBoundPerAiRequest: 2,
    });
    expect(
      checkStartBudget(start({ startsLastHour: 1 }), limited),
    ).toMatchObject({ reason: 'STARTS_PER_HOUR' });
    expect(
      checkAiRequestBudget(
        ai({ aiRequestsLastHour: 0, groqCallsUpperBoundLastHour: 10 }),
        limited,
      ).allowed,
    ).toBe(true);
    expect(
      checkAiRequestBudget(ai({ aiRequestsLastHour: 1 }), limited),
    ).toMatchObject({ reason: 'AI_REQUESTS_PER_HOUR' });
  });

  it('sem teto por chamada configurado não há projeção da Groq: o valor a gravar é null (nunca presumido)', () => {
    const result = checkAiRequestBudget(
      ai({ groqCallsUpperBoundLastHour: 1_000 }),
      budget({ maxAiRequestsPerHour: 5 }),
    );
    expect(result).toEqual({ allowed: true, callsUpperBound: null });
  });

  it('as janelas são de 1 h e 24 h', () => {
    expect(SECONDS_PER_HOUR).toBe(3_600);
    expect(SECONDS_PER_DAY).toBe(86_400);
  });
});

describe('freio global', () => {
  const brake = resolveBrakeConfig();
  const failure = (secondsAgo: number): BrakeEvent => ({
    at: at(secondsAgo),
    kind: 'transient_failure',
  });
  const success = (secondsAgo: number): BrakeEvent => ({
    at: at(secondsAgo),
    kind: 'success',
  });
  const neutral = (secondsAgo: number): BrakeEvent => ({
    at: at(secondsAgo),
    kind: 'neutral',
  });

  it('abre com 3 falhas transitórias consecutivas e informa quando fecha (pausa desde a última)', () => {
    const state = evaluateBrake(
      [failure(100), failure(60), failure(20)],
      NOON,
      brake,
    );
    expect(state).toMatchObject({ open: true, consecutiveFailures: 3 });
    expect(state.reopenAt?.getTime()).toBe(at(20).getTime() + 300 * 1000);
  });

  it('com menos falhas que o limite, ou depois do sucesso, o freio fica fechado', () => {
    expect(evaluateBrake([failure(60), failure(20)], NOON, brake)).toEqual({
      open: false,
      consecutiveFailures: 2,
    });
    expect(
      evaluateBrake(
        [failure(100), failure(60), success(40), failure(20)],
        NOON,
        brake,
      ),
    ).toMatchObject({
      open: false,
      consecutiveFailures: 1,
    });
  });

  it('um sucesso mais recente zera a sequência', () => {
    expect(
      evaluateBrake(
        [failure(90), failure(80), failure(70), success(10)],
        NOON,
        brake,
      ).open,
    ).toBe(false);
  });

  it('falhas de dados/estado (neutras) não contam nem interrompem a sequência', () => {
    expect(
      evaluateBrake(
        [failure(90), neutral(80), failure(70), neutral(60), failure(50)],
        NOON,
        brake,
      ),
    ).toMatchObject({ open: true, consecutiveFailures: 3 });
  });

  it('fecha sozinho depois da pausa (limite exato incluído)', () => {
    const events = [failure(700), failure(650), failure(600)];
    expect(evaluateBrake(events, NOON, brake).open).toBe(false);
    const justInside = [failure(305), failure(302), failure(299)];
    expect(evaluateBrake(justInside, NOON, brake).open).toBe(true);
    const exactEnd = [failure(310), failure(305), failure(300)];
    expect(evaluateBrake(exactEnd, NOON, brake).open).toBe(false);
  });

  it('não depende da ordem dos eventos e respeita limite e pausa configurados', () => {
    const shuffled = [failure(20), failure(100), failure(60)];
    expect(evaluateBrake(shuffled, NOON, brake).open).toBe(true);
    const strict = resolveBrakeConfig({
      failureThreshold: 1,
      pauseSeconds: 30,
    });
    expect(evaluateBrake([failure(20)], NOON, strict).open).toBe(true);
    expect(evaluateBrake([failure(40)], NOON, strict).open).toBe(false);
  });

  it('sem eventos o freio está fechado', () => {
    expect(evaluateBrake([], NOON, brake)).toEqual({
      open: false,
      consecutiveFailures: 0,
    });
  });

  it('as ações do worker viram eventos do freio: sucesso, falha transitória ou neutro', () => {
    const when = NOON;
    expect(
      toBrakeEvent({ kind: 'done', outcome: 'PERSISTED' }, when).kind,
    ).toBe('success');
    expect(
      toBrakeEvent(
        { kind: 'retry', errorCode: 'AI_TIMEOUT', retryAfterSeconds: 60 },
        when,
      ).kind,
    ).toBe('transient_failure');
    expect(
      toBrakeEvent(
        { kind: 'terminal', reason: 'MAX_ATTEMPTS', errorCode: 'AI_TIMEOUT' },
        when,
      ).kind,
    ).toBe('transient_failure');
    expect(
      toBrakeEvent(
        {
          kind: 'terminal',
          reason: 'NON_RETRYABLE',
          errorCode: 'INVALID_INPUT',
        },
        when,
      ).kind,
    ).toBe('neutral');
    expect(
      toBrakeEvent(
        { kind: 'retry', errorCode: 'IN_FLIGHT', retryAfterSeconds: 60 },
        when,
      ).kind,
    ).toBe('neutral');
  });
});

describe('a política é pura e não liga nada', () => {
  const code = (
    require('fs').readFileSync(
      require('path').join(__dirname, 'ai-evaluation-worker-policy.ts'),
      'utf8',
    ) as string
  )
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  it('não usa relógio nem aleatoriedade próprios, rede, banco, Nest, processos ou temporizadores', () => {
    expect(code).not.toMatch(
      /Date\.now|new Date\(\)|Math\.random|setTimeout|setInterval|fetch\(|process\.|require\(/,
    );
    expect(code).not.toMatch(
      /from '(@nestjs|@prisma|fs|path|child_process|crypto)/,
    );
    expect(code).not.toMatch(/\bGROQ\b|api[_-]?key/i);
  });

  it('só importa TIPOS (nenhuma dependência de execução)', () => {
    const imports = code.match(/^import[^;]*;/gm) ?? [];
    expect(imports.length).toBeGreaterThan(0);
    for (const statement of imports) expect(statement).toMatch(/^import type /);
  });

  it('não está registrada como provedor; o único executor registrado é o desabilitado por padrão (R3.3a-4c)', () => {
    const moduleSource = require('fs').readFileSync(
      require('path').join(__dirname, 'interviews-ai.module.ts'),
      'utf8',
    ) as string;
    expect(moduleSource).not.toContain('worker-policy');
    expect(moduleSource).not.toMatch(/Scheduler|ScheduleModule|setInterval/);
    expect(moduleSource.match(/Worker\w*Service/g)).toEqual([
      'WorkerService',
      'WorkerService',
      'WorkerService',
    ]);
  });
});
