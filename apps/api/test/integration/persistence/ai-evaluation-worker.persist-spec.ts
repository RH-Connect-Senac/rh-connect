// O pipeline importa o InterviewsAiService, que importa `@nestjs/config` (ESM no Jest).
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {
    get() {
      return undefined;
    }
  },
}));

import { randomUUID } from 'node:crypto';

import { Logger } from '@nestjs/common';

import { AiEvaluationClaimRepository } from '../../../src/interviews-ai/ai-evaluation-claim.repository';
import { AiEvaluationPersistenceService } from '../../../src/interviews-ai/ai-evaluation-persistence.service';
import type {
  AiEvaluationPipelineResult,
  AiEvaluationPipelineService,
  AiEvaluationProcessOptions,
} from '../../../src/interviews-ai/ai-evaluation-pipeline.service';
import { WORKER_ENV } from '../../../src/interviews-ai/ai-evaluation-worker.config';
import { AiEvaluationWorkerService } from '../../../src/interviews-ai/ai-evaluation-worker.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { openVerifiedIntegrationClient } from '../support/verified-integration-client';
import {
  buildEvaluation,
  PersistenceFixtures,
  type FixtureInterview,
} from './persistence-fixtures';

// Testes REAIS (PostgreSQL de integração `rhconnect_it`) do executor da avaliação
// por IA (R3.3a-4c): worker REAL + repositório de claim REAL + persistência REAL
// (R3.2), com um pipeline FALSO no lugar do Python/Groq (nenhuma chamada de rede,
// nenhuma chave). Só roda por `pnpm run test:integration:persistence`; o cliente é
// aberto por `openVerifiedIntegrationClient` (banco, usuário e marcador conferidos
// ANTES de qualquer fixture). Limpeza: só os usuários de fixture criados aqui.

// Valores de TESTE (altos, só para o orçamento não interferir, exceto no teste dele).
const BASE_ENV: Record<string, string> = {
  [WORKER_ENV.enabled]: 'true',
  [WORKER_ENV.leaseSeconds]: '300',
  [WORKER_ENV.pollIntervalSeconds]: '30',
  [WORKER_ENV.pythonWorstCaseSeconds]: '120',
  [WORKER_ENV.maxStartsPerHour]: '100000',
  [WORKER_ENV.maxStartsPerDay]: '100000',
  [WORKER_ENV.maxAiRequestsPerHour]: '100000',
  [WORKER_ENV.maxAiRequestsPerDay]: '100000',
  [WORKER_ENV.groqCallsUpperBoundPerAiRequest]: '8',
  [WORKER_ENV.maxGroqCallsUpperBoundPerHour]: '1000000',
  [WORKER_ENV.maxGroqCallsUpperBoundPerDay]: '1000000',
};

let db: PrismaService;
let fixtures: PersistenceFixtures;
let repository: AiEvaluationClaimRepository;
let persistence: AiEvaluationPersistenceService;
let created: FixtureInterview[] = [];
let spies: jest.SpyInstance[] = [];

beforeAll(async () => {
  const handle = await openVerifiedIntegrationClient(
    process.env,
    (datasourceUrl) => new PrismaService({ datasourceUrl }),
  );
  db = handle.client;
  fixtures = new PersistenceFixtures(db);
  await fixtures.sweepStaleFixtures();
  repository = new AiEvaluationClaimRepository(db);
  persistence = new AiEvaluationPersistenceService(db);

  const columns = await db.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'interview' AND column_name = 'ai_claim_token'`;
  if (columns.length !== 1) {
    throw new Error(
      'Migration 20261015000000_add_ai_evaluation_claim ausente em rhconnect_it.',
    );
  }
});

afterAll(async () => {
  try {
    await fixtures?.cleanup();
  } finally {
    await db?.$disconnect();
  }
});

beforeEach(() => {
  created = [];
  spies = [
    jest.spyOn(Logger.prototype, 'log').mockImplementation(),
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(),
    jest.spyOn(Logger.prototype, 'error').mockImplementation(),
  ];
});

// Remove as fixtures a cada teste (só usuários de fixture; a cascata leva entrevistas
// e tentativas): nenhum teste deixa entrevistas elegíveis ou leases ativos para o
// seguinte, já que o worker lista TODAS as elegíveis do banco de integração.
afterEach(async () => {
  for (const spy of spies) spy.mockRestore();
  await fixtures.cleanup();
});

async function newInterview() {
  const item = await fixtures.createInterview();
  created.push(item);
  return item;
}

function interviewState(interviewId: string) {
  return db.interview.findUniqueOrThrow({
    where: { interview_id: interviewId },
    select: {
      status: true,
      ai_claim_token: true,
      ai_lease_until: true,
      ai_attempts: true,
      ai_next_attempt_at: true,
      ai_last_error_code: true,
      ai_terminal_at: true,
      ai_terminal_reason: true,
    },
  });
}

function attemptRows(interviewId: string) {
  return db.ai_evaluation_attempt.findMany({
    where: { interview_id: interviewId },
    orderBy: { attempt_number: 'asc' },
  });
}

type Behavior = (
  item: FixtureInterview,
  options: AiEvaluationProcessOptions,
) => Promise<AiEvaluationPipelineResult>;

// Pipeline falso: roda o gancho como o real e só então "avalia". Falha alto se o
// worker tentar processar uma entrevista que não é fixture deste teste.
function fakePipeline(behavior: Behavior) {
  const processed: string[] = [];
  const pipeline = {
    process: async (
      interviewId: string,
      options: AiEvaluationProcessOptions = {},
    ): Promise<AiEvaluationPipelineResult> => {
      const item = created.find(
        (fixture) => fixture.interviewId === interviewId,
      );
      if (!item) throw new Error('entrevista que não é fixture deste teste');
      processed.push(interviewId);
      return behavior(item, options);
    },
  };
  return {
    pipeline: pipeline as unknown as AiEvaluationPipelineService,
    processed,
  };
}

function newWorker(
  pipeline: AiEvaluationPipelineService,
  env: Record<string, string> = BASE_ENV,
) {
  const worker = new AiEvaluationWorkerService(pipeline, repository, env, {
    workerId: 'it-worker',
  });
  expect(worker.start()).toBe('running');
  return worker;
}

const succeed: Behavior = async (item, options) => {
  if (options.beforeAiCall && !(await options.beforeAiCall())) {
    return {
      status: 'aborted',
      interviewId: item.interviewId,
      reason: 'AI_CALL_NOT_AUTHORIZED',
    };
  }
  const saved = await persistence.persist(
    item.interviewId,
    buildEvaluation(item.questions),
  );
  return {
    status: 'persisted',
    interviewId: item.interviewId,
    evaluationId: saved.evaluationId,
    aiDurationMs: 1_234,
  };
};

const failWith =
  (code: string, retryable: boolean): Behavior =>
  async (item, options) => {
    if (options.beforeAiCall && !(await options.beforeAiCall())) {
      return {
        status: 'aborted',
        interviewId: item.interviewId,
        reason: 'AI_CALL_NOT_AUTHORIZED',
      };
    }
    return {
      status: 'failed',
      interviewId: item.interviewId,
      stage: 'evaluate',
      code,
      retryable,
      aiDurationMs: 321,
    } as AiEvaluationPipelineResult;
  };

describe('executor da avaliação por IA (worker real + banco real)', () => {
  it('sucesso: claim, trava antes da IA, avaliação gravada, histórico fechado e campos do executor limpos', async () => {
    const item = await newInterview();
    const { pipeline, processed } = fakePipeline(succeed);
    const worker = newWorker(pipeline);

    const summary = await worker.runCycle();
    expect(summary).toEqual({ processed: 1, stoppedBy: 'idle' });
    expect(processed).toEqual([item.interviewId]);

    const state = await interviewState(item.interviewId);
    expect(state.status).toBe('COMPLETED');
    expect(state.ai_claim_token).toBeNull();
    expect(state.ai_lease_until).toBeNull();
    expect(state.ai_terminal_at).toBeNull();
    expect(state.ai_attempts).toBe(1);

    const rows = await attemptRows(item.interviewId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      attempt_number: 1,
      worker_id: 'it-worker',
      outcome: 'PERSISTED',
      ai_duration_ms: 1_234,
      ai_calls_upper_bound: 8,
    });
    expect(rows[0].ai_requested_at).not.toBeNull();
    expect(rows[0].finished_at).not.toBeNull();
    await worker.stop();
  });

  it('falha transitória: backoff persistido, entrevista segue pendente e NÃO é repetida no ciclo seguinte', async () => {
    const item = await newInterview();
    const { pipeline, processed } = fakePipeline(
      failWith('AI_UPSTREAM_ERROR', true),
    );
    const worker = newWorker(pipeline);

    await worker.runCycle();
    const state = await interviewState(item.interviewId);
    expect(state.status).toBe('PENDING_AI_EVALUATION');
    expect(state.ai_claim_token).toBeNull();
    expect(state.ai_attempts).toBe(1);
    expect(state.ai_last_error_code).toBe('AI_UPSTREAM_ERROR');
    expect(state.ai_terminal_at).toBeNull();
    const waitMs = (state.ai_next_attempt_at?.getTime() ?? 0) - Date.now();
    expect(waitMs).toBeGreaterThan(40_000); // 60 s com variação de ±20%
    expect(waitMs).toBeLessThan(80_000);

    const rows = await attemptRows(item.interviewId);
    expect(rows[0]).toMatchObject({
      outcome: 'FAILED_RETRYABLE',
      error_code: 'AI_UPSTREAM_ERROR',
      ai_duration_ms: 321,
    });

    expect(await worker.runCycle()).toMatchObject({ processed: 0 });
    expect(processed).toHaveLength(1);
    await worker.stop();
  });

  it('falha terminal: nunca volta sozinha para a fila e nunca vira COMPLETED', async () => {
    const item = await newInterview();
    const { pipeline, processed } = fakePipeline(
      failWith('INVALID_INPUT', false),
    );
    const worker = newWorker(pipeline);

    await worker.runCycle();
    const state = await interviewState(item.interviewId);
    expect(state.status).toBe('PENDING_AI_EVALUATION');
    expect(state.ai_terminal_at).not.toBeNull();
    expect(state.ai_terminal_reason).toBe('NON_RETRYABLE');
    expect(state.ai_claim_token).toBeNull();
    expect((await attemptRows(item.interviewId))[0].outcome).toBe(
      'FAILED_TERMINAL',
    );

    // mesmo com o backoff "vencido" e outro ciclo, ela não é reivindicada.
    expect(await worker.runCycle()).toMatchObject({ processed: 0 });
    expect(await worker.runCycle()).toMatchObject({ processed: 0 });
    expect(processed).toHaveLength(1);
    await worker.stop();
  });

  it('recuperação após queda: tentativa abandonada é fechada (LEASE_EXPIRED) e uma nova instância conclui', async () => {
    const item = await newInterview();
    // "worker anterior" morreu logo depois do claim (lease depois vencido).
    const dead = await repository.claim(item.interviewId, {
      workerId: 'dead-worker',
      leaseSeconds: 120,
      maxAttempts: 4,
      maxAgeSeconds: 86_400,
    });
    expect(dead.status).toBe('claimed');
    await db.interview.update({
      where: { interview_id: item.interviewId },
      data: { ai_lease_until: new Date(Date.now() - 5_000) },
    });
    await db.ai_evaluation_attempt.update({
      where: {
        attempt_id:
          dead.status === 'claimed' ? dead.claim.attemptId : randomUUID(),
      },
      data: { lease_until: new Date(Date.now() - 5_000) },
    });

    const { pipeline } = fakePipeline(succeed);
    const worker = newWorker(pipeline); // "nova instância": nada em memória
    await worker.runCycle();

    const state = await interviewState(item.interviewId);
    expect(state.status).toBe('COMPLETED');
    expect(state.ai_attempts).toBe(2); // a tentativa da queda também contou
    const rows = await attemptRows(item.interviewId);
    expect(rows.map((row) => [row.attempt_number, row.outcome])).toEqual([
      [1, 'LEASE_EXPIRED'],
      [2, 'PERSISTED'],
    ]);
    await worker.stop();
  });

  it('posse perdida antes da IA: a IA não é chamada, o novo dono não é tocado e o histórico registra LOST_LEASE', async () => {
    const item = await newInterview();
    const newOwnerToken = randomUUID();
    let aiCalled = false;
    const { pipeline } = fakePipeline(async (fixture, options) => {
      // outro worker assume a entrevista entre o claim e a chamada à IA
      await db.interview.update({
        where: { interview_id: fixture.interviewId },
        data: {
          ai_claim_token: newOwnerToken,
          ai_lease_until: new Date(Date.now() + 600_000),
        },
      });
      if (options.beforeAiCall && !(await options.beforeAiCall())) {
        return {
          status: 'aborted',
          interviewId: fixture.interviewId,
          reason: 'AI_CALL_NOT_AUTHORIZED',
        };
      }
      aiCalled = true;
      return succeed(fixture, options);
    });
    const worker = newWorker(pipeline);

    await worker.runCycle();
    expect(aiCalled).toBe(false);
    const state = await interviewState(item.interviewId);
    expect(state.status).toBe('PENDING_AI_EVALUATION');
    expect(state.ai_claim_token).toBe(newOwnerToken); // intocado (fenced)
    const rows = await attemptRows(item.interviewId);
    expect(rows[0].outcome).toBe('LOST_LEASE');
    expect(rows[0].ai_requested_at).toBeNull();
    await worker.stop();
  });

  it('orçamento persistido esgotado: nenhum claim e a entrevista fica intacta', async () => {
    const item = await newInterview();
    const startsNow = await repository.countStartsSince(3_600);
    const { pipeline, processed } = fakePipeline(succeed);
    const worker = newWorker(pipeline, {
      ...BASE_ENV,
      // limite = inícios já registrados na hora: o próximo seria negado.
      [WORKER_ENV.maxStartsPerHour]: String(Math.max(1, startsNow)),
    });
    if (startsNow === 0) {
      // sem histórico prévio: consome o único início permitido com outra entrevista
      const other = await newInterview();
      const claimedOther = await repository.claim(other.interviewId, {
        workerId: 'other',
        leaseSeconds: 120,
        maxAttempts: 4,
        maxAgeSeconds: 86_400,
      });
      expect(claimedOther.status).toBe('claimed');
    }

    const summary = await worker.runCycle();
    expect(summary).toEqual({ processed: 0, stoppedBy: 'budget' });
    expect(processed).toHaveLength(0);
    const state = await interviewState(item.interviewId);
    expect(state.ai_attempts).toBe(0);
    expect(state.ai_claim_token).toBeNull();
    expect(await attemptRows(item.interviewId)).toHaveLength(0);
    await worker.stop();
  });

  it('concorrência persistida: um lease ativo de outra instância impede um segundo claim', async () => {
    const holder = await newInterview();
    const waiting = await newInterview();
    const held = await repository.claim(holder.interviewId, {
      workerId: 'other-instance',
      leaseSeconds: 300,
      maxAttempts: 4,
      maxAgeSeconds: 86_400,
    });
    expect(held.status).toBe('claimed');

    const { pipeline, processed } = fakePipeline(succeed);
    const worker = newWorker(pipeline);
    const summary = await worker.runCycle();
    expect(summary).toEqual({ processed: 0, stoppedBy: 'budget' });
    expect(processed).toHaveLength(0);
    expect((await interviewState(waiting.interviewId)).ai_attempts).toBe(0);
    await worker.stop();
  });
});
