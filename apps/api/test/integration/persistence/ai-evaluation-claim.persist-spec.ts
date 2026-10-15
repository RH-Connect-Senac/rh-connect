import { Logger } from '@nestjs/common';

import {
  AiEvaluationClaimRepository,
  type AiEvaluationClaim,
  type AiEvaluationClaimOptions,
} from '../../../src/interviews-ai/ai-evaluation-claim.repository';
import { AiEvaluationPersistenceService } from '../../../src/interviews-ai/ai-evaluation-persistence.service';
import { PrismaService } from '../../../src/prisma/prisma.service';
import { openVerifiedIntegrationClient } from '../support/verified-integration-client';
import {
  buildEvaluation,
  PersistenceFixtures,
  type FixtureInterview,
} from './persistence-fixtures';

// Testes REAIS (PostgreSQL de integração) do claim/lease do executor da avaliação
// por IA (R3.3a-4a). PREPARADOS E AINDA NÃO EXECUTADOS: exigem a migration
// 20261015000000_add_ai_evaluation_claim aplicada em `rhconnect_it`
// (db:integration:migrate, com autorização) e a primeira execução de uma suíte
// que escreve no PostgreSQL precisa de autorização específica.
//
// Só roda por `pnpm run test:integration:persistence`. O cliente é aberto por
// `openVerifiedIntegrationClient` (banco, usuário e marcador conferidos por leitura
// ANTES de qualquer fixture). Limpeza: somente os usuários de fixture criados aqui
// (cascata do schema leva entrevistas, tentativas e avaliações).

const OPTIONS: AiEvaluationClaimOptions = {
  workerId: 'it-worker',
  leaseSeconds: 120,
  maxAttempts: 4,
  maxAgeSeconds: 86_400,
};

let db: PrismaService;
let fixtures: PersistenceFixtures;
let repository: AiEvaluationClaimRepository;
let persistence: AiEvaluationPersistenceService;
let logSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;
let created: FixtureInterview[] = [];

const past = (seconds = 60) => new Date(Date.now() - seconds * 1000);
const future = (seconds = 600) => new Date(Date.now() + seconds * 1000);

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

  // A migration precisa estar aplicada: falha com instrução clara (nunca "pula").
  const columns = await db.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'interview' AND column_name = 'ai_claim_token'`;
  if (columns.length !== 1) {
    throw new Error(
      'Migration 20261015000000_add_ai_evaluation_claim ausente em rhconnect_it. Aplique com db:integration:migrate (autorizado) antes de executar esta suite.',
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
  logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  created = [];
});

// Solta leases que o teste deixou ativos, para que o teto global e os contadores
// de um teste nunca dependam dos anteriores.
afterEach(async () => {
  for (const item of created) {
    await db.interview.update({
      where: { interview_id: item.interviewId },
      data: { ai_claim_token: null, ai_lease_until: null },
    });
  }
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

async function newInterview(
  options: Parameters<PersistenceFixtures['createInterview']>[0] = {},
) {
  const item = await fixtures.createInterview(options);
  created.push(item);
  return item;
}

async function claimed(
  interviewId: string,
  options: AiEvaluationClaimOptions = OPTIONS,
): Promise<AiEvaluationClaim> {
  const result = await repository.claim(interviewId, options);
  if (result.status !== 'claimed') {
    throw new Error(`esperava claimed, veio ${result.status}`);
  }
  return result.claim;
}

function interviewState(interviewId: string) {
  return db.interview.findUniqueOrThrow({
    where: { interview_id: interviewId },
    select: {
      status: true,
      ai_claim_token: true,
      ai_lease_until: true,
      ai_attempts: true,
      ai_first_claimed_at: true,
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

describe('claim', () => {
  it('reivindica: grava token, lease, tentativa e abre a linha de histórico', async () => {
    const { interviewId } = await newInterview();

    const claim = await claimed(interviewId);

    const state = await interviewState(interviewId);
    expect(state.status).toBe('PENDING_AI_EVALUATION');
    expect(state.ai_claim_token).toBe(claim.claimToken);
    expect(state.ai_attempts).toBe(1);
    expect(state.ai_lease_until?.getTime()).toBeGreaterThan(Date.now());
    const attempts = await attemptRows(interviewId);
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({
      claim_token: claim.claimToken,
      attempt_number: 1,
      worker_id: 'it-worker',
      finished_at: null,
      outcome: null,
      ai_requested_at: null,
    });
  });

  it('claims CONCORRENTES da mesma entrevista: exatamente um vence, um histórico, uma tentativa', async () => {
    const { interviewId } = await newInterview();

    const results = await Promise.all(
      Array.from({ length: 10 }, () => repository.claim(interviewId, OPTIONS)),
    );

    expect(results.filter((r) => r.status === 'claimed')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'not_claimable')).toHaveLength(9);
    expect(await attemptRows(interviewId)).toHaveLength(1);
    expect((await interviewState(interviewId)).ai_attempts).toBe(1);
  });

  it('com lease ativo ninguém mais reivindica; vencido, outro worker assume com tentativa 2 e token novo', async () => {
    const { interviewId } = await newInterview();
    const first = await claimed(interviewId);
    expect((await repository.claim(interviewId, OPTIONS)).status).toBe(
      'not_claimable',
    );

    await db.interview.update({
      where: { interview_id: interviewId },
      data: { ai_lease_until: past() },
    });
    const second = await claimed(interviewId, {
      ...OPTIONS,
      workerId: 'it-worker-2',
    });

    expect(second.attemptNumber).toBe(2);
    expect(second.claimToken).not.toBe(first.claimToken);
    expect((await interviewState(interviewId)).ai_claim_token).toBe(
      second.claimToken,
    );
    expect(await attemptRows(interviewId)).toHaveLength(2);
  });

  it.each([
    [
      'modalidade HUMAN',
      { status: 'PENDING_ASSIGNMENT', mode: 'HUMAN' } as const,
    ],
    ['IN_PROGRESS', { status: 'IN_PROGRESS', mode: null } as const],
    ['COMPLETED', { status: 'COMPLETED', mode: 'AI' } as const],
    ['CANCELLED', { status: 'CANCELLED', mode: 'AI' } as const],
  ])('não reivindica entrevista %s', async (_label, options) => {
    const { interviewId } = await newInterview(options);
    expect((await repository.claim(interviewId, OPTIONS)).status).toBe(
      'not_claimable',
    );
    expect(await attemptRows(interviewId)).toHaveLength(0);
    expect((await interviewState(interviewId)).ai_attempts).toBe(0);
  });

  it('respeita o limite de tentativas e a idade máxima DE EXECUÇÃO (desde o primeiro claim)', async () => {
    const exhausted = await newInterview();
    await db.interview.update({
      where: { interview_id: exhausted.interviewId },
      data: { ai_attempts: OPTIONS.maxAttempts },
    });
    expect(
      (await repository.claim(exhausted.interviewId, OPTIONS)).status,
    ).toBe('not_claimable');

    const old = await newInterview();
    await db.interview.update({
      where: { interview_id: old.interviewId },
      data: { ai_first_claimed_at: past(OPTIONS.maxAgeSeconds + 60) },
    });
    expect((await repository.claim(old.interviewId, OPTIONS)).status).toBe(
      'not_claimable',
    );
  });

  it('entrevista ANTIGA nunca reivindicada não expira: o prazo só começa no primeiro claim e não se renova', async () => {
    const legacy = await newInterview();
    await db.interview.update({
      where: { interview_id: legacy.interviewId },
      data: { submitted_at: past(30 * 24 * 3_600) }, // enviada há 30 dias
    });
    expect(
      await repository.listEligible({
        limit: 100,
        maxAttempts: 4,
        maxAgeSeconds: OPTIONS.maxAgeSeconds,
      }),
    ).toContain(legacy.interviewId);

    const first = await claimed(legacy.interviewId);
    const afterFirst = await interviewState(legacy.interviewId);
    expect(afterFirst.ai_first_claimed_at).not.toBeNull();

    await db.interview.update({
      where: { interview_id: legacy.interviewId },
      data: { ai_lease_until: past() },
    });
    const second = await claimed(legacy.interviewId);
    const afterSecond = await interviewState(legacy.interviewId);

    expect(second.claimToken).not.toBe(first.claimToken);
    expect(afterSecond.ai_first_claimed_at?.getTime()).toBe(
      afterFirst.ai_first_claimed_at?.getTime(),
    );
  });

  it('respeita o backoff persistido (próxima tentativa no futuro)', async () => {
    const { interviewId } = await newInterview();
    await db.interview.update({
      where: { interview_id: interviewId },
      data: { ai_next_attempt_at: future() },
    });
    expect((await repository.claim(interviewId, OPTIONS)).status).toBe(
      'not_claimable',
    );

    await db.interview.update({
      where: { interview_id: interviewId },
      data: { ai_next_attempt_at: past() },
    });
    expect((await repository.claim(interviewId, OPTIONS)).status).toBe(
      'claimed',
    );
  });

  it('teto GLOBAL de concorrência: com 1 lease permitido, claims simultâneos em entrevistas diferentes dão um só vencedor', async () => {
    const a = await newInterview();
    const b = await newInterview();
    expect(await repository.countActiveLeases()).toBe(0);

    const results = await Promise.all(
      [a, b, a, b, a, b].map((item) =>
        repository.claim(item.interviewId, { ...OPTIONS, maxConcurrent: 1 }),
      ),
    );

    expect(results.filter((r) => r.status === 'claimed')).toHaveLength(1);
    expect(await repository.countActiveLeases()).toBe(1);
  });
});

describe('fencing: quem perdeu o lease não consegue gravar', () => {
  it('worker A perde o lease para B: nenhuma escrita de A altera a entrevista; B segue dono', async () => {
    const { interviewId } = await newInterview();
    const workerA = await claimed(interviewId);
    await db.interview.update({
      where: { interview_id: interviewId },
      data: { ai_lease_until: past() },
    });
    const workerB = await claimed(interviewId, {
      ...OPTIONS,
      workerId: 'it-worker-b',
    });

    expect(await repository.extendLease(workerA, 60)).toEqual({ owned: false });
    expect(await repository.markAiRequested(workerA, 2)).toEqual({
      authorized: false,
    });
    expect(
      await repository.finishRetry(workerA, {
        errorCode: 'AI_TIMEOUT',
        retryAfterSeconds: 60,
      }),
    ).toEqual({ owned: false });
    expect(
      await repository.finishTerminal(workerA, {
        reason: 'NON_RETRYABLE',
        errorCode: 'X',
      }),
    ).toEqual({ owned: false });

    const state = await interviewState(interviewId);
    expect(state.ai_claim_token).toBe(workerB.claimToken);
    expect(state.ai_terminal_at).toBeNull();
    expect(state.ai_last_error_code).toBeNull();
    const [attemptA, attemptB] = await attemptRows(interviewId);
    expect(attemptA.outcome).toBe('LOST_LEASE');
    expect(attemptB.finished_at).toBeNull();

    // O dono legítimo continua autorizado a chamar a IA.
    expect(await repository.markAiRequested(workerB, 2)).toEqual({
      authorized: true,
    });
  });

  it('a trava antes da IA recusa lease vencido mesmo sem outro worker, e só autoriza uma vez por tentativa', async () => {
    const { interviewId } = await newInterview();
    const claim = await claimed(interviewId);
    expect(await repository.markAiRequested(claim, 2)).toEqual({
      authorized: true,
    });
    expect(await repository.markAiRequested(claim, 2)).toEqual({
      authorized: false,
    });

    const expired = await newInterview();
    const late = await claimed(expired.interviewId);
    await db.interview.update({
      where: { interview_id: expired.interviewId },
      data: { ai_lease_until: past() },
    });
    expect(await repository.markAiRequested(late, 2)).toEqual({
      authorized: false,
    });
  });

  it('extendLease prolonga só enquanto o lease está vigente', async () => {
    const { interviewId } = await newInterview();
    const claim = await claimed(interviewId, { ...OPTIONS, leaseSeconds: 30 });
    const before =
      (await interviewState(interviewId)).ai_lease_until?.getTime() ?? 0;
    expect(await repository.extendLease(claim, 300)).toEqual({ owned: true });
    const after =
      (await interviewState(interviewId)).ai_lease_until?.getTime() ?? 0;
    expect(after).toBeGreaterThan(before);

    await db.interview.update({
      where: { interview_id: interviewId },
      data: { ai_lease_until: past() },
    });
    expect(await repository.extendLease(claim, 300)).toEqual({ owned: false });
  });
});

describe('desfechos, backoff persistido e falha terminal', () => {
  it('finishRetry solta o claim, agenda o backoff e registra o erro e a duração', async () => {
    const { interviewId } = await newInterview();
    const claim = await claimed(interviewId);
    await repository.markAiRequested(claim, 2);

    expect(
      await repository.finishRetry(claim, {
        errorCode: 'AI_TIMEOUT',
        retryAfterSeconds: 120,
        aiDurationMs: 4_321,
      }),
    ).toEqual({ owned: true });

    const state = await interviewState(interviewId);
    expect(state.ai_claim_token).toBeNull();
    expect(state.ai_lease_until).toBeNull();
    expect(state.ai_last_error_code).toBe('AI_TIMEOUT');
    expect(state.ai_next_attempt_at?.getTime()).toBeGreaterThan(Date.now());
    expect((await repository.claim(interviewId, OPTIONS)).status).toBe(
      'not_claimable',
    );
    const [attempt] = await attemptRows(interviewId);
    expect(attempt).toMatchObject({
      outcome: 'FAILED_RETRYABLE',
      error_code: 'AI_TIMEOUT',
      ai_duration_ms: 4_321,
      ai_calls_upper_bound: 2,
    });
    expect(attempt.ai_requested_at).not.toBeNull();
    expect(attempt.finished_at).not.toBeNull();
  });

  it('as tentativas sobrevivem a uma "nova instância" (estado só no banco)', async () => {
    const { interviewId } = await newInterview();
    const first = await claimed(interviewId);
    await repository.finishRetry(first, {
      errorCode: 'AI_TIMEOUT',
      retryAfterSeconds: 0,
    });

    const restarted = new AiEvaluationClaimRepository(db);
    const result = await restarted.claim(interviewId, OPTIONS);

    expect(result.status).toBe('claimed');
    if (result.status === 'claimed') expect(result.claim.attemptNumber).toBe(2);
  });

  it('finishTerminal: a entrevista continua PENDING_AI_EVALUATION e nunca mais é reivindicada', async () => {
    const { interviewId } = await newInterview();
    const claim = await claimed(interviewId);

    expect(
      await repository.finishTerminal(claim, {
        reason: 'NON_RETRYABLE',
        errorCode: 'INCONSISTENT_STATE',
      }),
    ).toEqual({ owned: true });

    const state = await interviewState(interviewId);
    expect(state.status).toBe('PENDING_AI_EVALUATION');
    expect(state.ai_terminal_reason).toBe('NON_RETRYABLE');
    expect(state.ai_terminal_at).not.toBeNull();
    expect((await repository.claim(interviewId, OPTIONS)).status).toBe(
      'not_claimable',
    );
    expect(
      await repository.listEligible({
        limit: 50,
        maxAttempts: 4,
        maxAgeSeconds: 86_400,
      }),
    ).not.toContain(interviewId);
    expect((await attemptRows(interviewId))[0].outcome).toBe('FAILED_TERMINAL');
  });

  it('terminateExhausted marca por tentativas esgotadas e por idade, sem lease ativo e sem tocar no status', async () => {
    const byAttempts = await newInterview();
    await db.interview.update({
      where: { interview_id: byAttempts.interviewId },
      data: { ai_attempts: OPTIONS.maxAttempts },
    });
    const byAge = await newInterview();
    await db.interview.update({
      where: { interview_id: byAge.interviewId },
      data: { ai_first_claimed_at: past(OPTIONS.maxAgeSeconds + 60) },
    });
    // Antiga, mas NUNCA reivindicada: não pode expirar.
    const legacy = await newInterview();
    await db.interview.update({
      where: { interview_id: legacy.interviewId },
      data: { submitted_at: past(30 * 24 * 3_600) },
    });
    const active = await newInterview();
    await claimed(active.interviewId);

    const terminated = await repository.terminateExhausted({
      maxAttempts: OPTIONS.maxAttempts,
      maxAgeSeconds: OPTIONS.maxAgeSeconds,
    });
    const byId = new Map(
      terminated.map((item) => [item.interviewId, item.reason]),
    );

    expect(byId.get(byAttempts.interviewId)).toBe('MAX_ATTEMPTS');
    expect(byId.get(byAge.interviewId)).toBe('EXPIRED');
    expect(byId.has(active.interviewId)).toBe(false);
    expect(byId.has(legacy.interviewId)).toBe(false);
    expect(
      (await interviewState(legacy.interviewId)).ai_terminal_at,
    ).toBeNull();
    expect((await interviewState(byAttempts.interviewId)).status).toBe(
      'PENDING_AI_EVALUATION',
    );
    expect(
      (await interviewState(active.interviewId)).ai_terminal_at,
    ).toBeNull();
  });

  it('listEligible traz só as elegíveis; closeExpiredAttempts fecha tentativas abandonadas', async () => {
    const eligible = await newInterview();
    const leased = await newInterview();
    const abandoned = await claimed(leased.interviewId);
    await db.interview.update({
      where: { interview_id: leased.interviewId },
      data: { ai_lease_until: past() },
    });
    await db.ai_evaluation_attempt.update({
      where: { attempt_id: abandoned.attemptId },
      data: { lease_until: past() },
    });

    const ids = await repository.listEligible({
      limit: 50,
      maxAttempts: 4,
      maxAgeSeconds: 86_400,
    });
    expect(ids).toContain(eligible.interviewId);
    expect(ids).toContain(leased.interviewId); // lease vencido volta a ser elegível

    expect(await repository.closeExpiredAttempts()).toBeGreaterThanOrEqual(1);
    const [attempt] = await attemptRows(leased.interviewId);
    expect(attempt.outcome).toBe('LEASE_EXPIRED');
  });

  it('contadores: início (claim) e chamada à IA (ai_requested_at) são medidas distintas', async () => {
    const { interviewId } = await newInterview();
    const startsBefore = await repository.countStartsSince(3_600);
    const requestsBefore = await repository.countAiRequestsSince(3_600);

    const claim = await claimed(interviewId);
    expect(await repository.countStartsSince(3_600)).toBe(startsBefore + 1);
    expect(await repository.countAiRequestsSince(3_600)).toEqual(
      requestsBefore,
    );

    await repository.markAiRequested(claim, 3);
    const requestsAfter = await repository.countAiRequestsSince(3_600);
    expect(requestsAfter.requests).toBe(requestsBefore.requests + 1);
    expect(requestsAfter.callsUpperBound).toBe(
      requestsBefore.callsUpperBound + 3,
    );
  });
});

describe('convivência com a persistência da R3.2', () => {
  it('a persistência não depende do claim: grava mesmo com outro worker como dono; depois ninguém mais reivindica e finishDone limpa os campos', async () => {
    const item = await newInterview();
    const owner = await claimed(item.interviewId);

    const saved = await persistence.persist(
      item.interviewId,
      buildEvaluation(item.questions),
    );

    expect(saved.status).toBe('created');
    expect((await interviewState(item.interviewId)).status).toBe('COMPLETED');
    expect((await repository.claim(item.interviewId, OPTIONS)).status).toBe(
      'not_claimable',
    );

    expect(
      await repository.finishDone(owner, {
        outcome: 'PERSISTED',
        aiDurationMs: 1_000,
      }),
    ).toEqual({ cleared: true });
    const state = await interviewState(item.interviewId);
    expect(state.ai_claim_token).toBeNull();
    expect(state.ai_lease_until).toBeNull();
    expect(state.ai_attempts).toBe(1);
    expect((await attemptRows(item.interviewId))[0].outcome).toBe('PERSISTED');
  });

  it('executor com lease vencido que conclui tarde: não sobrescreve a avaliação íntegra e não encerra o controle do dono atual', async () => {
    const item = await newInterview();
    const stale = await claimed(item.interviewId);
    await db.interview.update({
      where: { interview_id: item.interviewId },
      data: { ai_lease_until: past() },
    });
    const owner = await claimed(item.interviewId, {
      ...OPTIONS,
      workerId: 'it-worker-b',
    });

    // O worker atrasado obtém um resultado válido e o grava (R3.2).
    const saved = await persistence.persist(
      item.interviewId,
      buildEvaluation(item.questions, { summary: 'Primeiro resultado' }),
    );
    expect(saved.status).toBe('created');

    // Uma segunda avaliação, diferente, NUNCA sobrescreve a íntegra.
    await expect(
      persistence.persist(
        item.interviewId,
        buildEvaluation(item.questions, { summary: 'Resultado divergente' }),
      ),
    ).rejects.toMatchObject({ code: 'EVALUATION_CONFLICT' });
    const stored = await db.interview_evaluation.findUniqueOrThrow({
      where: { interview_id: item.interviewId },
    });
    expect(stored.summary).toBe('Primeiro resultado');

    // O atrasado fecha só a PRÓPRIA tentativa; o controle do dono (lease ativo) fica.
    expect(
      await repository.finishDone(stale, { outcome: 'PERSISTED' }),
    ).toEqual({ cleared: false });
    expect((await interviewState(item.interviewId)).ai_claim_token).toBe(
      owner.claimToken,
    );
    const [attemptStale, attemptOwner] = await attemptRows(item.interviewId);
    expect(attemptStale.outcome).toBe('PERSISTED');
    expect(attemptOwner.finished_at).toBeNull();

    // Quem não é dono também não consegue soltar nem encerrar como falha.
    expect(
      await repository.finishRetry(stale, {
        errorCode: 'X',
        retryAfterSeconds: 1,
      }),
    ).toEqual({ owned: false });

    // O dono atual encerra a própria tentativa e limpa o controle.
    expect(
      await repository.finishDone(owner, { outcome: 'NOTHING_TO_DO' }),
    ).toEqual({ cleared: true });
    expect((await interviewState(item.interviewId)).ai_claim_token).toBeNull();
  });

  it('um worker com lease vencido que ainda obtém resultado válido grava sem duplicar: a segunda gravação é already_persisted', async () => {
    const item = await newInterview();
    await claimed(item.interviewId);
    await db.interview.update({
      where: { interview_id: item.interviewId },
      data: { ai_lease_until: past() },
    });
    await claimed(item.interviewId, { ...OPTIONS, workerId: 'it-worker-b' });
    const evaluation = buildEvaluation(item.questions);

    const results = await Promise.all([
      persistence.persist(item.interviewId, evaluation),
      persistence.persist(item.interviewId, evaluation),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([
      'already_persisted',
      'created',
    ]);
    expect(
      await db.interview_evaluation.count({
        where: { interview_id: item.interviewId },
      }),
    ).toBe(1);
  });
});
