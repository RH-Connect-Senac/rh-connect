// O pipeline importa o InterviewsAiService, que importa `@nestjs/config` (ESM no Jest).
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {
    get() {
      return undefined;
    }
  },
}));

import { Injectable, Logger, Module, OnModuleDestroy } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import type {
  AiEvaluationClaim,
  AiEvaluationClaimRepository,
} from './ai-evaluation-claim.repository';
import type {
  AiEvaluationPipelineResult,
  AiEvaluationPipelineService,
  AiEvaluationProcessOptions,
} from './ai-evaluation-pipeline.service';
import { WORKER_ENV } from './ai-evaluation-worker.config';
import {
  AI_EVALUATION_WORKER_ENV,
  AI_EVALUATION_WORKER_RUNTIME,
  AiEvaluationWorkerService,
} from './ai-evaluation-worker.service';
import { AiEvaluationClaimRepository as ClaimRepositoryToken } from './ai-evaluation-claim.repository';
import { AiEvaluationPipelineService as PipelineToken } from './ai-evaluation-pipeline.service';

const ID_1 = '11111111-1111-4111-8111-111111111111';
const ID_2 = '22222222-2222-4222-8222-222222222222';
const ID_3 = '33333333-3333-4333-8333-333333333333';
const ID_4 = '44444444-4444-4444-8444-444444444444';

// Valores de TESTE (não são recomendação nem padrão).
const VALID_ENV: Record<string, string> = {
  [WORKER_ENV.enabled]: 'true',
  [WORKER_ENV.leaseSeconds]: '300',
  [WORKER_ENV.pollIntervalSeconds]: '30',
  [WORKER_ENV.pythonWorstCaseSeconds]: '120',
  [WORKER_ENV.maxStartsPerHour]: '10',
  [WORKER_ENV.maxStartsPerDay]: '50',
  [WORKER_ENV.maxAiRequestsPerHour]: '10',
  [WORKER_ENV.maxAiRequestsPerDay]: '50',
  [WORKER_ENV.groqCallsUpperBoundPerAiRequest]: '8',
  [WORKER_ENV.maxGroqCallsUpperBoundPerHour]: '80',
  [WORKER_ENV.maxGroqCallsUpperBoundPerDay]: '400',
};

// Fake assíncrono sem await: devolve uma Promise já resolvida.
const asyncFn =
  <A extends unknown[], R>(fn: (...args: A) => R) =>
  (...args: A): Promise<R> =>
    Promise.resolve(fn(...args));

function claimFor(interviewId: string, attemptNumber = 1): AiEvaluationClaim {
  return {
    interviewId,
    claimToken: `token-${interviewId}-${attemptNumber}`,
    attemptId: `attempt-${interviewId}-${attemptNumber}`,
    attemptNumber,
    leaseUntil: new Date('2026-10-15T12:05:00Z'),
    workerId: 'test-worker',
  };
}

const persisted = (id: string): AiEvaluationPipelineResult => ({
  status: 'persisted',
  interviewId: id,
  evaluationId: 'eval-1',
  aiDurationMs: 1_500,
});

const failed = (
  id: string,
  code: string,
  retryable: boolean,
  aiDurationMs?: number,
): AiEvaluationPipelineResult =>
  ({
    status: 'failed',
    interviewId: id,
    stage: 'evaluate',
    code,
    retryable,
    ...(aiDurationMs === undefined ? {} : { aiDurationMs }),
  }) as AiEvaluationPipelineResult;

interface Harness {
  worker: AiEvaluationWorkerService;
  claims: Record<string, jest.Mock>;
  pipeline: { process: jest.Mock };
  calls: string[];
  eligible: string[][];
  setCounters: (counters: Partial<Counters>) => void;
}

interface Counters {
  activeLeases: number;
  startsHour: number;
  startsDay: number;
  aiHour: number;
  aiDay: number;
  groqHour: number;
  groqDay: number;
}

// Pipeline falso: executa o gancho `beforeAiCall` como o real e só então "chama a IA".
function makeHarness(options: {
  env?: Record<string, string | undefined>;
  // Um item por chamada de listEligible; vazio depois do último.
  eligible?: string[][];
  attempts?: Record<string, number>;
  results?: Record<string, AiEvaluationPipelineResult[]>;
  claimOutcome?: (id: string) => 'claimed' | 'not_claimable' | 'at_capacity';
  markAuthorized?: (id: string) => boolean;
  random?: () => number;
  processImpl?: (
    id: string,
    opts: AiEvaluationProcessOptions,
    calls: string[],
  ) => Promise<AiEvaluationPipelineResult>;
  now?: () => Date;
}): Harness {
  const calls: string[] = [];
  const counters: Counters = {
    activeLeases: 0,
    startsHour: 0,
    startsDay: 0,
    aiHour: 0,
    aiDay: 0,
    groqHour: 0,
    groqDay: 0,
  };
  const eligible = (options.eligible ?? [[ID_1]]).map((ids) => [...ids]);
  const attempts = options.attempts ?? {};
  const results = Object.fromEntries(
    Object.entries(options.results ?? {}).map(([id, list]) => [id, [...list]]),
  );

  const claims = {
    closeExpiredAttempts: jest.fn(
      asyncFn(() => {
        calls.push('closeExpiredAttempts');
        return 0;
      }),
    ),
    terminateExhausted: jest.fn(
      asyncFn(() => {
        calls.push('terminateExhausted');
        return [] as Array<{ interviewId: string; reason: string }>;
      }),
    ),
    countActiveLeases: jest.fn(asyncFn(() => counters.activeLeases)),
    countStartsSince: jest.fn(
      asyncFn((window: number) =>
        window === 3_600 ? counters.startsHour : counters.startsDay,
      ),
    ),
    countAiRequestsSince: jest.fn(
      asyncFn((window: number) =>
        window === 3_600
          ? { requests: counters.aiHour, callsUpperBound: counters.groqHour }
          : { requests: counters.aiDay, callsUpperBound: counters.groqDay },
      ),
    ),
    listEligible: jest.fn(
      asyncFn(() => {
        calls.push('listEligible');
        return eligible.shift() ?? [];
      }),
    ),
    claim: jest.fn(
      asyncFn((id: string) => {
        const outcome = options.claimOutcome?.(id) ?? 'claimed';
        calls.push(`claim:${id}:${outcome}`);
        if (outcome !== 'claimed') return { status: outcome };
        attempts[id] = (attempts[id] ?? 0) + 1;
        return { status: 'claimed', claim: claimFor(id, attempts[id]) };
      }),
    ),
    markAiRequested: jest.fn(
      asyncFn((claim: AiEvaluationClaim, upper: number | null) => {
        calls.push(`markAiRequested:${claim.interviewId}:${String(upper)}`);
        return {
          authorized: options.markAuthorized?.(claim.interviewId) ?? true,
        };
      }),
    ),
    extendLease: jest.fn(asyncFn(() => ({ owned: true }))),
    finishRetry: jest.fn(
      asyncFn((claim: AiEvaluationClaim) => {
        calls.push(`finishRetry:${claim.interviewId}`);
        return { owned: true };
      }),
    ),
    finishTerminal: jest.fn(
      asyncFn((claim: AiEvaluationClaim) => {
        calls.push(`finishTerminal:${claim.interviewId}`);
        return { owned: true };
      }),
    ),
    finishDone: jest.fn(
      asyncFn((claim: AiEvaluationClaim) => {
        calls.push(`finishDone:${claim.interviewId}`);
        return { cleared: true };
      }),
    ),
  };

  const pipeline = {
    process: jest.fn(
      async (id: string, opts: AiEvaluationProcessOptions = {}) => {
        if (options.processImpl) return options.processImpl(id, opts, calls);
        if (opts.beforeAiCall && !(await opts.beforeAiCall())) {
          return {
            status: 'aborted',
            interviewId: id,
            reason: 'AI_CALL_NOT_AUTHORIZED',
          };
        }
        calls.push(`ai-call:${id}`);
        return results[id]?.shift() ?? persisted(id);
      },
    ),
  };

  const worker = new AiEvaluationWorkerService(
    pipeline as unknown as AiEvaluationPipelineService,
    claims as unknown as AiEvaluationClaimRepository,
    options.env ?? VALID_ENV,
    {
      workerId: 'test-worker',
      random: options.random ?? (() => 0.5),
      now: options.now ?? (() => new Date()),
    },
  );
  return {
    worker,
    claims,
    pipeline,
    calls,
    eligible,
    setCounters: (patch) => Object.assign(counters, patch),
  };
}

// Inicia sem agendar de verdade: o ciclo é disparado manualmente nos testes.
function startedHarness(options: Parameters<typeof makeHarness>[0] = {}) {
  jest.useFakeTimers();
  const harness = makeHarness(options);
  harness.worker.start();
  return harness;
}

describe('AiEvaluationWorkerService', () => {
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const allLogs = () =>
    [...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls]
      .map((call) => String(call[0]))
      .join('\n');

  describe('desabilitado e configuração inválida', () => {
    it('desabilitado por padrão: não agenda, não lê o banco nem processa nada', async () => {
      jest.useFakeTimers();
      const { worker, claims, pipeline } = makeHarness({ env: {} });
      expect(worker.start()).toBe('disabled');
      expect(jest.getTimerCount()).toBe(0);
      await jest.advanceTimersByTimeAsync(24 * 3_600 * 1_000);
      expect(await worker.runCycle()).toEqual({
        processed: 0,
        stoppedBy: 'inactive',
      });
      for (const mock of Object.values(claims))
        expect(mock).not.toHaveBeenCalled();
      expect(pipeline.process).not.toHaveBeenCalled();
    });

    it('AI_EVALUATION_WORKER_ENABLED=false também fica inerte', async () => {
      const { worker, claims } = makeHarness({
        env: { ...VALID_ENV, [WORKER_ENV.enabled]: 'false' },
      });
      expect(worker.start()).toBe('disabled');
      await worker.runCycle();
      expect(claims.claim).not.toHaveBeenCalled();
    });

    it('habilitado sem limites obrigatórios: configuração inválida, nada é processado e o log só traz nomes', async () => {
      jest.useFakeTimers();
      const { worker, claims, pipeline } = makeHarness({
        env: {
          [WORKER_ENV.enabled]: 'true',
          [WORKER_ENV.leaseSeconds]: 'SEGREDO-123',
        },
      });
      expect(worker.start()).toBe('invalid_config');
      expect(jest.getTimerCount()).toBe(0);
      await jest.advanceTimersByTimeAsync(3_600_000);
      expect(await worker.runCycle()).toEqual({
        processed: 0,
        stoppedBy: 'inactive',
      });
      expect(claims.listEligible).not.toHaveBeenCalled();
      expect(claims.claim).not.toHaveBeenCalled();
      expect(pipeline.process).not.toHaveBeenCalled();
      expect(allLogs()).toContain(WORKER_ENV.maxStartsPerHour);
      expect(allLogs()).not.toContain('SEGREDO-123');
    });

    it.each(Object.values(WORKER_ENV).slice(1, 11))(
      'falta de %s mantém o executor parado',
      async (name) => {
        const env = { ...VALID_ENV };
        delete env[name];
        const { worker, claims } = makeHarness({ env });
        expect(worker.start()).toBe('invalid_config');
        await worker.runCycle();
        expect(claims.claim).not.toHaveBeenCalled();
      },
    );
  });

  describe('uma avaliação em processamento', () => {
    it('claim atômico antes da IA, posse conferida (markAiRequested) antes da chamada e finishDone depois', async () => {
      const { worker, calls, claims } = startedHarness();
      const summary = await worker.runCycle();
      expect(summary).toEqual({ processed: 1, stoppedBy: 'idle' });
      const order = calls.filter((call) => !call.startsWith('closeExpired'));
      expect(order).toEqual([
        'terminateExhausted',
        'listEligible',
        `claim:${ID_1}:claimed`,
        // teto por chamada à IA = 8 (configurado), nunca presumido.
        `markAiRequested:${ID_1}:8`,
        `ai-call:${ID_1}`,
        `finishDone:${ID_1}`,
        'listEligible',
      ]);
      expect(claims.claim).toHaveBeenCalledWith(
        ID_1,
        expect.objectContaining({
          workerId: 'test-worker',
          leaseSeconds: 300,
          maxAttempts: 4,
          maxAgeSeconds: 86_400,
          maxConcurrent: 1,
        }),
      );
      expect(claims.finishDone).toHaveBeenCalledWith(claimFor(ID_1), {
        outcome: 'PERSISTED',
        aiDurationMs: 1_500,
      });
      expect(claims.finishRetry).not.toHaveBeenCalled();
      expect(claims.finishTerminal).not.toHaveBeenCalled();
    });

    it('nunca há duas avaliações em paralelo na mesma instância', async () => {
      let running = 0;
      let maxRunning = 0;
      const { worker } = startedHarness({
        eligible: [[ID_1, ID_2, ID_3], [ID_2, ID_3], [ID_3]],
        processImpl: async (id) => {
          running += 1;
          maxRunning = Math.max(maxRunning, running);
          await Promise.resolve();
          await Promise.resolve();
          running -= 1;
          return persisted(id);
        },
      });
      expect(await worker.runCycle()).toMatchObject({ processed: 3 });
      expect(maxRunning).toBe(1);
    });

    it('um segundo runCycle durante o primeiro reaproveita o ciclo em curso (sem reentrância)', async () => {
      const { worker, claims } = startedHarness();
      const first = worker.runCycle();
      const second = worker.runCycle();
      expect(second).toBe(first);
      await first;
      expect(claims.claim).toHaveBeenCalledTimes(1);
    });
  });

  describe('várias entrevistas elegíveis', () => {
    it('processa em sequência, reavaliando freio e orçamentos antes de cada claim', async () => {
      const { worker, calls, claims } = startedHarness({
        eligible: [[ID_1, ID_2], [ID_2], []],
      });
      expect(await worker.runCycle()).toEqual({
        processed: 2,
        stoppedBy: 'idle',
      });
      expect(calls.filter((c) => c.startsWith('finishDone'))).toEqual([
        `finishDone:${ID_1}`,
        `finishDone:${ID_2}`,
      ]);
      // contadores consultados antes de cada claim
      expect(claims.countActiveLeases.mock.calls.length).toBeGreaterThanOrEqual(
        3,
      );
    });

    it('pula o que outro worker já reivindicou (not_claimable) e segue para o próximo', async () => {
      const { worker, calls } = startedHarness({
        eligible: [[ID_1, ID_2], []],
        claimOutcome: (id) => (id === ID_1 ? 'not_claimable' : 'claimed'),
      });
      expect(await worker.runCycle()).toMatchObject({ processed: 1 });
      expect(calls).toContain(`claim:${ID_1}:not_claimable`);
      expect(calls).not.toContain(`markAiRequested:${ID_1}:8`);
      expect(calls).toContain(`finishDone:${ID_2}`);
    });

    it('teto global persistido (at_capacity) encerra o ciclo sem processar', async () => {
      const { worker, pipeline } = startedHarness({
        eligible: [[ID_1, ID_2]],
        claimOutcome: () => 'at_capacity',
      });
      expect(await worker.runCycle()).toEqual({
        processed: 0,
        stoppedBy: 'capacity',
      });
      expect(pipeline.process).not.toHaveBeenCalled();
    });

    it('sem elegíveis: ocioso, sem claim', async () => {
      const { worker, claims } = startedHarness({ eligible: [[]] });
      expect(await worker.runCycle()).toEqual({
        processed: 0,
        stoppedBy: 'idle',
      });
      expect(claims.claim).not.toHaveBeenCalled();
    });
  });

  describe('perda de lease', () => {
    it('posse perdida antes da IA: a IA NÃO é chamada e nada é concluído', async () => {
      const { worker, calls, claims } = startedHarness({
        markAuthorized: () => false,
        eligible: [[ID_1], []],
      });
      await worker.runCycle();
      expect(calls).not.toContain(`ai-call:${ID_1}`);
      expect(claims.finishDone).not.toHaveBeenCalled();
      expect(claims.finishTerminal).not.toHaveBeenCalled();
      expect(claims.finishRetry).toHaveBeenCalledWith(
        claimFor(ID_1),
        expect.objectContaining({ errorCode: 'LEASE_LOST_BEFORE_AI' }),
      );
    });

    it('com a posse perdida, o finish fenced devolve owned=false e o worker apenas registra (sem lançar)', async () => {
      const { worker, claims } = startedHarness({
        markAuthorized: () => false,
      });
      claims.finishRetry.mockResolvedValue({ owned: false });
      await expect(worker.runCycle()).resolves.toMatchObject({ processed: 1 });
      expect(allLogs()).toContain('owned=false');
    });

    it('heartbeat estende o lease durante a IA e detecta a perda; o resultado válido ainda é concluído via finishDone', async () => {
      let release: (result: AiEvaluationPipelineResult) => void = () =>
        undefined;
      const { worker, claims } = startedHarness({
        processImpl: (id) =>
          new Promise<AiEvaluationPipelineResult>((resolve) => {
            release = resolve;
            void id;
          }),
      });
      claims.extendLease
        .mockResolvedValueOnce({ owned: true })
        .mockResolvedValueOnce({ owned: false });
      const cycle = worker.runCycle();
      await jest.advanceTimersByTimeAsync(100_000); // 1º batimento (lease 300 s => 100 s)
      expect(claims.extendLease).toHaveBeenCalledTimes(1);
      expect(claims.extendLease).toHaveBeenCalledWith(claimFor(ID_1), 300);
      await jest.advanceTimersByTimeAsync(100_000); // 2º batimento: perdeu a posse
      expect(claims.extendLease).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(300_000); // sem novos batimentos depois da perda
      expect(claims.extendLease).toHaveBeenCalledTimes(2);
      release(persisted(ID_1));
      claims.finishDone.mockResolvedValue({ cleared: false });
      await cycle;
      expect(claims.finishDone).toHaveBeenCalledTimes(1);
      expect(allLogs()).toContain('leaseLostDuringRun=true');
      expect(allLogs()).toContain('cleared=false');
    });

    it('o heartbeat é interrompido ao terminar a avaliação', async () => {
      const { worker } = startedHarness();
      const before = jest.getTimerCount(); // só o agendamento do ciclo
      await worker.runCycle();
      expect(jest.getTimerCount()).toBe(before);
    });

    it('lease expirado depois do worker travar: outra instância/reinício reivindica de novo (nada em memória)', async () => {
      const attempts: Record<string, number> = {};
      const first = makeHarness({
        attempts,
        processImpl: () =>
          Promise.reject(new Error('queda no meio da avaliação')),
      });
      jest.useFakeTimers();
      first.worker.start();
      await first.worker.runCycle();
      // nenhuma gravação de desfecho: a posse só se resolve pelo lease persistido
      expect(first.claims.finishDone).not.toHaveBeenCalled();
      expect(first.claims.finishRetry).not.toHaveBeenCalled();
      expect(first.claims.finishTerminal).not.toHaveBeenCalled();
      expect(attempts[ID_1]).toBe(1); // a tentativa já foi contada no claim

      // "reinício": nova instância, mesmo estado persistido
      const second = makeHarness({ attempts, eligible: [[ID_1], []] });
      second.worker.start();
      await second.worker.runCycle();
      expect(second.claims.closeExpiredAttempts).toHaveBeenCalled();
      expect(second.claims.finishDone).toHaveBeenCalledWith(
        claimFor(ID_1, 2),
        expect.anything(),
      );
    });
  });

  describe('retry e backoff persistido', () => {
    it('falha transitória: finishRetry com backoff exponencial (60 s, 120 s) e jitter neutro', async () => {
      const attempts = { [ID_1]: 0 };
      const { worker, claims } = startedHarness({
        attempts,
        eligible: [[ID_1], [], [ID_1], []],
        results: {
          [ID_1]: [
            failed(ID_1, 'AI_UPSTREAM_ERROR', true, 900),
            failed(ID_1, 'AI_UPSTREAM_ERROR', true, 800),
          ],
        },
      });
      await worker.runCycle();
      await worker.runCycle();
      expect(claims.finishRetry).toHaveBeenNthCalledWith(1, claimFor(ID_1, 1), {
        errorCode: 'AI_UPSTREAM_ERROR',
        retryAfterSeconds: 60,
        aiDurationMs: 900,
      });
      expect(claims.finishRetry).toHaveBeenNthCalledWith(2, claimFor(ID_1, 2), {
        errorCode: 'AI_UPSTREAM_ERROR',
        retryAfterSeconds: 120,
        aiDurationMs: 800,
      });
    });

    it('AI_TIMEOUT espera ao menos o pior caso configurado do Python', async () => {
      const { worker, claims } = startedHarness({
        results: { [ID_1]: [failed(ID_1, 'AI_TIMEOUT', true, 30_000)] },
      });
      await worker.runCycle();
      expect(claims.finishRetry).toHaveBeenCalledWith(
        claimFor(ID_1),
        expect.objectContaining({ retryAfterSeconds: 120 }),
      );
    });

    it('o worker não repete a mesma entrevista no mesmo ciclo (backoff persistido)', async () => {
      const { worker, pipeline } = startedHarness({
        // se ela voltasse a aparecer como elegível, seria reprocessada; o SQL real
        // a exclui por ai_next_attempt_at, portanto a segunda listagem vem vazia.
        eligible: [[ID_1], []],
        results: { [ID_1]: [failed(ID_1, 'AI_UNAVAILABLE', true)] },
      });
      await worker.runCycle();
      expect(pipeline.process).toHaveBeenCalledTimes(1);
    });

    it('skipped/IN_FLIGHT: espera fixa, sem escalonar, sem retry agressivo', async () => {
      const { worker, claims } = startedHarness({
        processImpl: (id) =>
          Promise.resolve({
            status: 'skipped',
            interviewId: id,
            reason: 'IN_FLIGHT',
          } as const),
      });
      await worker.runCycle();
      expect(claims.finishRetry).toHaveBeenCalledWith(
        claimFor(ID_1),
        expect.objectContaining({
          errorCode: 'IN_FLIGHT',
          retryAfterSeconds: 60,
        }),
      );
    });
  });

  describe('falha terminal', () => {
    it('não repetível: finishTerminal NON_RETRYABLE, nunca finishDone nem retry', async () => {
      const { worker, claims } = startedHarness({
        results: { [ID_1]: [failed(ID_1, 'INVALID_INPUT', false)] },
      });
      await worker.runCycle();
      expect(claims.finishTerminal).toHaveBeenCalledWith(claimFor(ID_1), {
        reason: 'NON_RETRYABLE',
        errorCode: 'INVALID_INPUT',
        aiDurationMs: null,
      });
      expect(claims.finishDone).not.toHaveBeenCalled();
      expect(claims.finishRetry).not.toHaveBeenCalled();
    });

    it('repetível na última tentativa: terminal MAX_ATTEMPTS (sem nova chamada)', async () => {
      const { worker, claims } = startedHarness({
        attempts: { [ID_1]: 3 },
        results: { [ID_1]: [failed(ID_1, 'AI_UPSTREAM_ERROR', true, 700)] },
      });
      await worker.runCycle();
      expect(claims.finishTerminal).toHaveBeenCalledWith(claimFor(ID_1, 4), {
        reason: 'MAX_ATTEMPTS',
        errorCode: 'AI_UPSTREAM_ERROR',
        aiDurationMs: 700,
      });
      expect(claims.finishRetry).not.toHaveBeenCalled();
    });

    it('o ciclo chama terminateExhausted (limites de tentativas/idade) sem nova chamada à IA', async () => {
      const { worker, claims, pipeline } = startedHarness({ eligible: [[]] });
      await worker.runCycle();
      expect(claims.terminateExhausted).toHaveBeenCalledWith({
        maxAttempts: 4,
        maxAgeSeconds: 86_400,
      });
      expect(pipeline.process).not.toHaveBeenCalled();
    });

    it('falha ao encerrar por limite não impede o ciclo', async () => {
      const { worker, claims } = startedHarness();
      claims.terminateExhausted.mockRejectedValue(new Error('db'));
      await expect(worker.runCycle()).resolves.toMatchObject({ processed: 1 });
    });
  });

  describe('orçamentos esgotados', () => {
    it('orçamento de inícios por hora esgotado: nenhum claim', async () => {
      const { worker, claims, setCounters } = startedHarness();
      setCounters({ startsHour: 10 }); // limite de teste = 10
      expect(await worker.runCycle()).toEqual({
        processed: 0,
        stoppedBy: 'budget',
      });
      expect(claims.listEligible).not.toHaveBeenCalled();
      expect(claims.claim).not.toHaveBeenCalled();
    });

    it.each([
      ['inícios por dia', { startsDay: 50 }],
      ['concorrência global persistida', { activeLeases: 1 }],
      ['chamadas à IA por hora', { aiHour: 10 }],
      ['chamadas à IA por dia', { aiDay: 50 }],
      ['teto da Groq por hora (70 + 8 > 80)', { groqHour: 73 }],
      ['teto da Groq por dia (393 + 8 > 400)', { groqDay: 393 }],
    ])('%s esgotado: nenhum claim nem chamada à IA', async (_name, patch) => {
      const { worker, claims, pipeline, setCounters } = startedHarness();
      setCounters(patch);
      expect(await worker.runCycle()).toEqual({
        processed: 0,
        stoppedBy: 'budget',
      });
      expect(claims.claim).not.toHaveBeenCalled();
      expect(claims.markAiRequested).not.toHaveBeenCalled();
      expect(pipeline.process).not.toHaveBeenCalled();
    });

    it('um valor logo abaixo do limite ainda permite', async () => {
      const { worker, setCounters } = startedHarness();
      setCounters({ startsHour: 9, aiHour: 9, groqHour: 72, groqDay: 392 });
      expect(await worker.runCycle()).toMatchObject({ processed: 1 });
    });

    it('corrida: o orçamento da IA esgota entre o claim e a chamada => IA não chamada, markAiRequested não executado', async () => {
      const { worker, calls, claims, setCounters } = startedHarness({
        processImpl: async (id, opts) => {
          setCounters({ aiHour: 10 }); // outro worker gastou o último
          if (opts.beforeAiCall && !(await opts.beforeAiCall())) {
            return {
              status: 'aborted',
              interviewId: id,
              reason: 'AI_CALL_NOT_AUTHORIZED',
            };
          }
          calls.push(`ai-call:${id}`);
          return persisted(id);
        },
      });
      await worker.runCycle();
      expect(claims.markAiRequested).not.toHaveBeenCalled();
      expect(calls).not.toContain(`ai-call:${ID_1}`);
      expect(claims.finishRetry).toHaveBeenCalledWith(
        claimFor(ID_1),
        expect.objectContaining({
          errorCode: 'BUDGET_EXHAUSTED',
          retryAfterSeconds: 60,
        }),
      );
    });
  });

  describe('freio global (por instância)', () => {
    it('três falhas transitórias seguidas abrem o freio e o ciclo para', async () => {
      const { worker, pipeline, claims } = startedHarness({
        eligible: [[ID_1], [ID_2], [ID_3], [ID_4]],
        results: {
          [ID_1]: [failed(ID_1, 'AI_UPSTREAM_ERROR', true)],
          [ID_2]: [failed(ID_2, 'AI_UNAVAILABLE', true)],
          [ID_3]: [failed(ID_3, 'AI_TIMEOUT', true)],
        },
      });
      expect(await worker.runCycle()).toEqual({
        processed: 3,
        stoppedBy: 'brake',
      });
      expect(pipeline.process).toHaveBeenCalledTimes(3);
      expect(claims.claim).not.toHaveBeenCalledWith(ID_4, expect.anything());
    });

    it('o freio fecha sozinho depois da pausa', async () => {
      let nowMs = Date.parse('2026-10-15T12:00:00Z');
      const { worker } = startedHarness({
        now: () => new Date(nowMs),
        eligible: [[ID_1], [ID_2], [ID_3], [ID_4], []],
        results: {
          [ID_1]: [failed(ID_1, 'AI_UPSTREAM_ERROR', true)],
          [ID_2]: [failed(ID_2, 'AI_UPSTREAM_ERROR', true)],
          [ID_3]: [failed(ID_3, 'AI_UPSTREAM_ERROR', true)],
        },
      });
      expect(await worker.runCycle()).toMatchObject({ stoppedBy: 'brake' });
      nowMs += 301_000;
      expect(await worker.runCycle()).toMatchObject({ processed: 1 });
    });

    it('falhas de dados (não repetíveis) não abrem o freio', async () => {
      const { worker } = startedHarness({
        eligible: [[ID_1], [ID_2], [ID_3], [ID_4], []],
        results: {
          [ID_1]: [failed(ID_1, 'INVALID_INPUT', false)],
          [ID_2]: [failed(ID_2, 'INVALID_INPUT', false)],
          [ID_3]: [failed(ID_3, 'INVALID_INPUT', false)],
        },
      });
      expect(await worker.runCycle()).toMatchObject({
        processed: 4,
        stoppedBy: 'idle',
      });
    });
  });

  describe('encerramento ordenado', () => {
    it('stop() sem ciclo em curso encerra na hora e impede novos ciclos', async () => {
      const { worker, claims } = startedHarness();
      await expect(worker.stop()).resolves.toEqual({ drained: true });
      expect(worker.getStatus()).toBe('stopped');
      expect(await worker.runCycle()).toMatchObject({ processed: 0 });
      expect(claims.claim).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('aguarda a avaliação em curso terminar e não inicia novos claims', async () => {
      let release: (result: AiEvaluationPipelineResult) => void = () =>
        undefined;
      const { worker, claims, calls } = startedHarness({
        eligible: [[ID_1], [ID_2], []],
        processImpl: (id) =>
          new Promise<AiEvaluationPipelineResult>((resolve) => {
            release = resolve;
            void id;
          }),
      });
      const cycle = worker.runCycle();
      await jest.advanceTimersByTimeAsync(1_000);
      const stopping = worker.stop();
      let stopped = false;
      void stopping.then(() => {
        stopped = true;
      });
      await jest.advanceTimersByTimeAsync(5_000);
      expect(stopped).toBe(false); // ainda esperando a avaliação em curso
      release(persisted(ID_1));
      await expect(stopping).resolves.toEqual({ drained: true });
      expect(await cycle).toEqual({ processed: 1, stoppedBy: 'shutdown' });
      expect(claims.finishDone).toHaveBeenCalledTimes(1);
      expect(calls).not.toContain(`claim:${ID_2}:claimed`);
    });

    it('prazo de encerramento esgotado: não trava, avisa e deixa o lease persistido recuperar', async () => {
      const { worker } = startedHarness({
        env: { ...VALID_ENV, [WORKER_ENV.shutdownGraceSeconds]: '2' },
        processImpl: () =>
          new Promise<AiEvaluationPipelineResult>(() => undefined),
      });
      void worker.runCycle();
      await jest.advanceTimersByTimeAsync(500);
      const stopping = worker.stop();
      await jest.advanceTimersByTimeAsync(2_000);
      await expect(stopping).resolves.toEqual({ drained: false });
      expect(allLogs()).toContain('lease persistido');
    });

    it('o agendador usa timers com unref e para de reagendar depois do stop', async () => {
      jest.useFakeTimers();
      const { worker, claims } = makeHarness({ eligible: [[], [], []] });
      worker.start();
      await jest.advanceTimersByTimeAsync(0);
      expect(claims.listEligible).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(30_000);
      expect(claims.listEligible).toHaveBeenCalledTimes(2);
      await worker.stop();
      await jest.advanceTimersByTimeAsync(300_000);
      expect(claims.listEligible).toHaveBeenCalledTimes(2);
      expect(jest.getTimerCount()).toBe(0);
    });
  });

  describe('robustez e privacidade', () => {
    it('falha ao gravar o desfecho não derruba o executor nem marca nada como concluído', async () => {
      const { worker, claims } = startedHarness({
        eligible: [[ID_1], [ID_2], []],
      });
      claims.finishDone.mockRejectedValueOnce(new Error('banco indisponível'));
      await expect(worker.runCycle()).resolves.toMatchObject({ processed: 2 });
      expect(allLogs()).toContain('falha ao registrar o desfecho');
    });

    it('erro ao listar/reivindicar encerra o ciclo sem lançar', async () => {
      const { worker, claims } = startedHarness();
      claims.listEligible.mockRejectedValue(new Error('db'));
      expect(await worker.runCycle()).toEqual({
        processed: 0,
        stoppedBy: 'error',
      });
    });

    it('falha repetível do pipeline vira retry, nunca conclusão', async () => {
      const { worker, claims } = startedHarness({
        processImpl: (id) => Promise.resolve(failed(id, 'LOAD_FAILED', true)),
      });
      await worker.runCycle();
      expect(claims.finishRetry).toHaveBeenCalled();
      expect(claims.finishDone).not.toHaveBeenCalled();
    });

    it('os logs não trazem textos do candidato, prompts, URLs nem credenciais', async () => {
      const { worker } = startedHarness({
        env: { ...VALID_ENV, EXTRA_SECRET: 'gsk_SEGREDO_NAO_PODE_VAZAR' },
        results: { [ID_1]: [failed(ID_1, 'AI_UPSTREAM_ERROR', true)] },
      });
      await worker.runCycle();
      const logs = allLogs();
      expect(logs).not.toContain('gsk_');
      expect(logs).not.toMatch(/postgres(ql)?:\/\//i);
      expect(logs).not.toMatch(/answer|prompt|resposta/i);
    });
  });

  describe('integração com o ciclo de vida do Nest', () => {
    it('onModuleInit inicia e app.close() espera a avaliação em curso ANTES de o Prisma desconectar', async () => {
      const events: string[] = [];
      let release: (result: AiEvaluationPipelineResult) => void = () =>
        undefined;

      @Injectable()
      class FakePrisma implements OnModuleDestroy {
        onModuleDestroy() {
          events.push('prisma-disconnect');
        }
      }
      @Module({ providers: [FakePrisma], exports: [FakePrisma] })
      class FakePrismaModule {}

      const pipeline = {
        process: jest.fn(
          () =>
            new Promise<AiEvaluationPipelineResult>((resolve) => {
              events.push('ai-started');
              release = (value) => {
                events.push('ai-finished');
                resolve(value);
              };
            }),
        ),
      };
      const claims = {
        closeExpiredAttempts: jest.fn(asyncFn(() => 0)),
        terminateExhausted: jest.fn(asyncFn(() => [])),
        countActiveLeases: jest.fn(asyncFn(() => 0)),
        countStartsSince: jest.fn(asyncFn(() => 0)),
        countAiRequestsSince: jest.fn(
          asyncFn(() => ({
            requests: 0,
            callsUpperBound: 0,
          })),
        ),
        listEligible: jest.fn(asyncFn(() => [ID_1])),
        claim: jest.fn(
          asyncFn(() => ({
            status: 'claimed',
            claim: claimFor(ID_1),
          })),
        ),
        extendLease: jest.fn(asyncFn(() => ({ owned: true }))),
        finishDone: jest.fn(
          asyncFn(() => {
            events.push('finish-done');
            return { cleared: true };
          }),
        ),
        finishRetry: jest.fn(),
        finishTerminal: jest.fn(),
        markAiRequested: jest.fn(),
      };

      @Module({
        imports: [FakePrismaModule],
        providers: [
          AiEvaluationWorkerService,
          { provide: PipelineToken, useValue: pipeline },
          { provide: ClaimRepositoryToken, useValue: claims },
          { provide: AI_EVALUATION_WORKER_ENV, useValue: VALID_ENV },
          {
            provide: AI_EVALUATION_WORKER_RUNTIME,
            useValue: { workerId: 'nest-test' },
          },
        ],
      })
      class WorkerModule {}

      const moduleRef = await Test.createTestingModule({
        imports: [FakePrismaModule, WorkerModule],
      }).compile();
      const app = moduleRef.createNestApplication();
      await app.init(); // onModuleInit => start() agenda o 1º ciclo
      const worker = app.get(AiEvaluationWorkerService);
      expect(worker.getStatus()).toBe('running');

      for (let i = 0; i < 50 && events.length === 0; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(events).toEqual(['ai-started']);

      const closing = app.close(); // equivale ao SIGTERM com enableShutdownHooks()
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(events).not.toContain('prisma-disconnect');
      release(persisted(ID_1));
      await closing;
      expect(events).toEqual([
        'ai-started',
        'ai-finished',
        'finish-done',
        'prisma-disconnect',
      ]);
    });
  });
});
