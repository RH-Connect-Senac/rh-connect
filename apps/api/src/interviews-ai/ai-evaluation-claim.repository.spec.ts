import { Prisma } from '@prisma/client';

import {
  AiEvaluationClaimError,
  AiEvaluationClaimRepository,
  type AiEvaluationClaim,
  type AiEvaluationClaimOptions,
} from './ai-evaluation-claim.repository';

// Testes UNITÁRIOS do repositório de claim/lease (R3.3a-4a). O PostgreSQL é
// SIMULADO: eles provam a ORDEM das operações, os PARÂMETROS e as GUARDAS do SQL
// (fencing por token, status, lease, falha terminal), mas NÃO provam o
// comportamento real do banco (corridas, bloqueio de linha, advisory lock,
// tipos). Isso é escopo dos testes de integração
// (test/integration/persistence/ai-evaluation-claim.persist-spec.ts), preparados
// e ainda NÃO executados.

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';
const ATTEMPT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TOKEN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const OPTIONS: AiEvaluationClaimOptions = {
  workerId: 'api-1:1234',
  leaseSeconds: 90,
  maxAttempts: 4,
  maxAgeSeconds: 86_400,
};

const CLAIM: AiEvaluationClaim = {
  interviewId: INTERVIEW_ID,
  claimToken: TOKEN,
  attemptId: ATTEMPT_ID,
  attemptNumber: 1,
  leaseUntil: new Date('2026-01-01T00:01:30.000Z'),
  workerId: 'api-1:1234',
};

interface Recorded {
  kind: 'query' | 'execute';
  tx: boolean;
  sql: string;
  values: unknown[];
}

// Prisma simulado: grava cada instrução (texto parametrizado + valores) e devolve
// respostas pré-definidas, na ordem das chamadas.
function setup(responses: unknown[] = []) {
  const calls: Recorded[] = [];
  const queue = [...responses];
  const record = (kind: Recorded['kind'], tx: boolean) =>
    jest.fn((query: Prisma.Sql) => {
      calls.push({ kind, tx, sql: query.text, values: query.values });
      return Promise.resolve(queue.length > 0 ? queue.shift() : undefined);
    });
  const txClient = {
    $queryRaw: record('query', true),
    $executeRaw: record('execute', true),
  };
  const prisma = {
    $queryRaw: record('query', false),
    $executeRaw: record('execute', false),
    $transaction: jest.fn(
      (callback: (tx: typeof txClient) => Promise<unknown>) =>
        callback(txClient),
    ),
  };
  const repository = new AiEvaluationClaimRepository(prisma as never);
  return { repository, prisma, calls };
}

function tokenParam(call: Recorded, column: string): string | undefined {
  // Acha `"<coluna>" = $n::uuid` e devolve o valor do parâmetro n.
  const match = new RegExp(
    `${column.replace(/"/g, '"')} = \\$(\\d+)::uuid`,
  ).exec(call.sql);
  return match ? (call.values[Number(match[1]) - 1] as string) : undefined;
}

const claimedRows = [
  [{ ai_attempts: 1, ai_lease_until: new Date('2026-01-01T00:01:30.000Z') }],
  [{ attempt_id: ATTEMPT_ID }],
];

describe('AiEvaluationClaimRepository.claim', () => {
  it('reivindica: UPDATE condicional + abertura do histórico, na mesma transação', async () => {
    const { repository, prisma, calls } = setup(claimedRows);

    const result = await repository.claim(INTERVIEW_ID, OPTIONS);

    expect(result.status).toBe('claimed');
    if (result.status !== 'claimed') return;
    expect(result.claim).toMatchObject({
      interviewId: INTERVIEW_ID,
      attemptId: ATTEMPT_ID,
      attemptNumber: 1,
      workerId: 'api-1:1234',
    });
    expect(result.claim.claimToken).toMatch(UUID);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => [c.kind, c.tx])).toEqual([
      ['query', true],
      ['query', true],
    ]);
    expect(calls[0].sql).toContain('UPDATE "interview"');
    expect(calls[1].sql).toContain('INSERT INTO "ai_evaluation_attempt"');
    // O mesmo token vai para a entrevista e para o histórico.
    expect(calls[0].values).toContain(result.claim.claimToken);
    expect(calls[1].values).toContain(result.claim.claimToken);
  });

  it('o UPDATE só vale para entrevista de IA pendente, sem falha terminal, com lease/backoff vencidos e limites respeitados', async () => {
    const { repository, calls } = setup(claimedRows);
    await repository.claim(INTERVIEW_ID, OPTIONS);

    const sql = calls[0].sql;
    expect(sql).toContain(`"status" = 'PENDING_AI_EVALUATION'`);
    expect(sql).toContain(`"evaluation_mode" = 'AI'`);
    expect(sql).toContain('"ai_terminal_at" IS NULL');
    expect(sql).toContain(
      '("ai_lease_until" IS NULL OR "ai_lease_until" <= now())',
    );
    expect(sql).toContain(
      '("ai_next_attempt_at" IS NULL OR "ai_next_attempt_at" <= now())',
    );
    expect(sql).toMatch(/"ai_attempts" < \$\d+::smallint/);
    // Idade de EXECUÇÃO (desde o primeiro claim): entrevista nunca reivindicada
    // não expira e submitted_at nunca entra na regra de expiração.
    expect(sql).toMatch(
      /\("ai_first_claimed_at" IS NULL OR "ai_first_claimed_at" > now\(\) - make_interval/,
    );
    expect(sql).toContain(
      '"ai_first_claimed_at" = COALESCE("ai_first_claimed_at", now())',
    );
    expect(sql).not.toMatch(/"submitted_at"\s*(<=|>=|<|>)/);
    expect(sql).toContain('"ai_attempts" = "ai_attempts" + 1');
    // Nunca altera o status da entrevista.
    expect(sql).not.toMatch(/SET\s+"status"|"status"\s*=\s*\$/i);
    expect(calls[0].values).toEqual(
      expect.arrayContaining([INTERVIEW_ID, 90, 4, 86_400]),
    );
  });

  it('todos os valores são parâmetros: o SQL nunca contém token, id ou worker', async () => {
    const { repository, calls } = setup(claimedRows);
    const result = await repository.claim(INTERVIEW_ID, OPTIONS);
    if (result.status !== 'claimed') throw new Error('esperava claimed');
    for (const call of calls) {
      expect(call.sql).not.toContain(result.claim.claimToken);
      expect(call.sql).not.toContain(INTERVIEW_ID);
      expect(call.sql).not.toContain('api-1:1234');
    }
  });

  it('cada claim gera um token novo (nunca reaproveita)', async () => {
    const first = setup(claimedRows);
    const second = setup(claimedRows);
    const a = await first.repository.claim(INTERVIEW_ID, OPTIONS);
    const b = await second.repository.claim(INTERVIEW_ID, OPTIONS);
    if (a.status !== 'claimed' || b.status !== 'claimed') throw new Error('x');
    expect(a.claim.claimToken).not.toBe(b.claim.claimToken);
  });

  it('inelegível ou corrida perdida (nenhuma linha): not_claimable e NADA é gravado no histórico', async () => {
    const { repository, calls } = setup([[]]);

    const result = await repository.claim(INTERVIEW_ID, OPTIONS);

    expect(result).toEqual({ status: 'not_claimable' });
    expect(calls).toHaveLength(1);
    expect(calls[0].sql).toContain('UPDATE "interview"');
  });

  it('se o histórico não abrir, a transação aborta (o claim é desfeito)', async () => {
    const { repository } = setup([
      [{ ai_attempts: 1, ai_lease_until: new Date() }],
      [],
    ]);
    await expect(repository.claim(INTERVIEW_ID, OPTIONS)).rejects.toThrow(
      'Histórico de tentativa não foi aberto.',
    );
  });

  it('com teto global: serializa o claim (advisory lock), conta leases e só então tenta', async () => {
    const { repository, calls } = setup([
      [{ locked: 1 }],
      [{ active: 0 }],
      ...claimedRows,
    ]);

    const result = await repository.claim(INTERVIEW_ID, {
      ...OPTIONS,
      maxConcurrent: 1,
    });

    expect(result.status).toBe('claimed');
    expect(calls[0].sql).toContain('pg_advisory_xact_lock');
    expect(calls[1].sql).toContain('COUNT(*)');
    expect(calls[1].sql).toContain('"ai_lease_until" > now()');
    expect(calls[2].sql).toContain('UPDATE "interview"');
    expect(calls).toHaveLength(4);
  });

  it('teto global atingido: at_capacity, sem UPDATE e sem histórico', async () => {
    const { repository, calls } = setup([[{ locked: 1 }], [{ active: 1 }]]);

    const result = await repository.claim(INTERVIEW_ID, {
      ...OPTIONS,
      maxConcurrent: 1,
    });

    expect(result).toEqual({ status: 'at_capacity' });
    expect(calls).toHaveLength(2);
    expect(calls.some((c) => c.sql.includes('UPDATE'))).toBe(false);
  });

  it('sem teto global não usa advisory lock', async () => {
    const { repository, calls } = setup(claimedRows);
    await repository.claim(INTERVIEW_ID, OPTIONS);
    expect(calls.some((c) => c.sql.includes('pg_advisory'))).toBe(false);
  });

  it.each([
    ['interviewId inválido', 'abc', OPTIONS],
    ['workerId vazio', INTERVIEW_ID, { ...OPTIONS, workerId: '  ' }],
    ['workerId longo', INTERVIEW_ID, { ...OPTIONS, workerId: 'x'.repeat(81) }],
    ['lease 0', INTERVIEW_ID, { ...OPTIONS, leaseSeconds: 0 }],
    ['lease decimal', INTERVIEW_ID, { ...OPTIONS, leaseSeconds: 1.5 }],
    ['tentativas 0', INTERVIEW_ID, { ...OPTIONS, maxAttempts: 0 }],
    ['tentativas gigantes', INTERVIEW_ID, { ...OPTIONS, maxAttempts: 99_999 }],
    ['idade negativa', INTERVIEW_ID, { ...OPTIONS, maxAgeSeconds: -1 }],
    ['teto global 0', INTERVIEW_ID, { ...OPTIONS, maxConcurrent: 0 }],
  ])('%s => erro tipado sem tocar no banco', async (_label, id, options) => {
    const { repository, prisma } = setup();
    await expect(repository.claim(id, options)).rejects.toBeInstanceOf(
      AiEvaluationClaimError,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('Fencing: escritas de quem perdeu o lease não têm efeito', () => {
  it('finishRetry: condicionada ao token e ao status pendente; solta o claim e agenda o backoff', async () => {
    const { repository, calls } = setup([[{ interview_id: INTERVIEW_ID }], 1]);

    const result = await repository.finishRetry(CLAIM, {
      errorCode: 'AI_TIMEOUT',
      retryAfterSeconds: 120,
      aiDurationMs: 4_321,
    });

    expect(result).toEqual({ owned: true });
    const [release, history] = calls;
    expect(tokenParam(release, '"ai_claim_token"')).toBe(TOKEN);
    expect(release.sql).toContain(`"status" = 'PENDING_AI_EVALUATION'`);
    expect(release.sql).toContain('"ai_claim_token" = NULL');
    expect(release.sql).toContain('"ai_lease_until" = NULL');
    expect(release.sql).toContain(
      '"ai_next_attempt_at" = now() + make_interval',
    );
    expect(release.values).toEqual(expect.arrayContaining([120, 'AI_TIMEOUT']));
    expect(history.sql).toContain('UPDATE "ai_evaluation_attempt"');
    expect(history.values).toEqual(
      expect.arrayContaining([
        'FAILED_RETRYABLE',
        'AI_TIMEOUT',
        4_321,
        ATTEMPT_ID,
        TOKEN,
      ]),
    );
  });

  it('finishRetry com posse perdida (token trocado): nada muda na entrevista e o histórico registra LOST_LEASE', async () => {
    const { repository, calls } = setup([[], 1]);

    const result = await repository.finishRetry(CLAIM, {
      errorCode: 'AI_TIMEOUT',
      retryAfterSeconds: 60,
    });

    expect(result).toEqual({ owned: false });
    expect(calls[1].values).toContain('LOST_LEASE');
    expect(calls[1].values).not.toContain('FAILED_RETRYABLE');
  });

  it('finishTerminal: fenced; grava a falha terminal sem tocar no status; sem posse => LOST_LEASE', async () => {
    const owned = setup([[{ interview_id: INTERVIEW_ID }], 1]);
    const result = await owned.repository.finishTerminal(CLAIM, {
      reason: 'NON_RETRYABLE',
      errorCode: 'INCONSISTENT_STATE',
    });
    expect(result).toEqual({ owned: true });
    const [mark, history] = owned.calls;
    expect(tokenParam(mark, '"ai_claim_token"')).toBe(TOKEN);
    expect(mark.sql).toContain('"ai_terminal_at" = now()');
    expect(mark.sql).toContain(`"status" = 'PENDING_AI_EVALUATION'`);
    expect(mark.sql).not.toMatch(/SET\s+"status"/i);
    expect(history.values).toContain('FAILED_TERMINAL');

    const lost = setup([[], 1]);
    expect(
      await lost.repository.finishTerminal(CLAIM, {
        reason: 'MAX_ATTEMPTS',
        errorCode: 'AI_TIMEOUT',
      }),
    ).toEqual({ owned: false });
    expect(lost.calls[1].values).toContain('LOST_LEASE');
  });

  it('motivo terminal fora da lista é recusado antes do banco', async () => {
    const { repository, prisma } = setup();
    await expect(
      repository.finishTerminal(CLAIM, {
        reason: 'QUALQUER' as never,
        errorCode: 'X',
      }),
    ).rejects.toBeInstanceOf(AiEvaluationClaimError);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('extendLease: só estende se for o dono E o lease não venceu; sem posse não toca no histórico', async () => {
    const owned = setup([[{ ai_lease_until: new Date() }], 1]);
    expect(await owned.repository.extendLease(CLAIM, 90)).toEqual({
      owned: true,
    });
    expect(tokenParam(owned.calls[0], '"ai_claim_token"')).toBe(TOKEN);
    expect(owned.calls[0].sql).toContain('"ai_lease_until" > now()');
    expect(owned.calls[1].sql).toContain('"finished_at" IS NULL');

    const lost = setup([[]]);
    expect(await lost.repository.extendLease(CLAIM, 90)).toEqual({
      owned: false,
    });
    expect(lost.calls).toHaveLength(1);
  });

  it('markAiRequested: a trava ANTES da IA exige token igual, lease vigente e entrevista pendente', async () => {
    const authorized = setup([1]);
    expect(await authorized.repository.markAiRequested(CLAIM, 2)).toEqual({
      authorized: true,
    });
    const sql = authorized.calls[0].sql;
    expect(sql).toContain('i."ai_claim_token" = a."claim_token"');
    expect(sql).toContain('i."ai_lease_until" > now()');
    expect(sql).toContain(`i."status" = 'PENDING_AI_EVALUATION'`);
    expect(sql).toContain('a."finished_at" IS NULL');
    expect(sql).toContain('a."ai_requested_at" IS NULL');
    expect(authorized.calls[0].values).toEqual(
      expect.arrayContaining([ATTEMPT_ID, TOKEN, 2]),
    );

    const denied = setup([0]);
    expect(await denied.repository.markAiRequested(CLAIM, 2)).toEqual({
      authorized: false,
    });
  });

  it('markAiRequested aceita teto de chamadas à Groq desconhecido (null) sem presumir valor', async () => {
    const { repository, calls } = setup([1]);
    expect(await repository.markAiRequested(CLAIM, null)).toEqual({
      authorized: true,
    });
    expect(calls[0].values).toContain(null);
    expect(calls[0].values).not.toContain(0);
  });

  it('markAiRequested recusa limite inválido de chamadas', async () => {
    const { repository, prisma } = setup();
    await expect(repository.markAiRequested(CLAIM, -1)).rejects.toBeInstanceOf(
      AiEvaluationClaimError,
    );
    await expect(
      repository.markAiRequested(CLAIM, 40_000),
    ).rejects.toBeInstanceOf(AiEvaluationClaimError);
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('o fechamento do histórico nunca sobrescreve um desfecho já registrado', async () => {
    const { repository, calls } = setup([[{ interview_id: INTERVIEW_ID }], 1]);
    await repository.finishRetry(CLAIM, {
      errorCode: 'X',
      retryAfterSeconds: 1,
    });
    const history = calls[1];
    expect(history.sql).toContain('"finished_at" IS NULL');
    expect(history.sql).toContain('"claim_token" =');
    expect(history.sql).toContain('"attempt_id" =');
  });
});

describe('finishDone e recuperação', () => {
  it('finishDone: limpa os campos do executor SÓ em entrevista COMPLETED de IA (sem exigir token) e registra o desfecho', async () => {
    const { repository, calls } = setup([[{ interview_id: INTERVIEW_ID }], 1]);

    const result = await repository.finishDone(CLAIM, {
      outcome: 'PERSISTED',
      aiDurationMs: 2_500,
    });

    expect(result).toEqual({ cleared: true });
    expect(calls[0].sql).toContain(`"status" = 'COMPLETED'`);
    expect(calls[0].sql).toContain(`"evaluation_mode" = 'AI'`);
    expect(calls[0].sql).not.toContain('"ai_attempts" =');
    expect(calls[1].values).toEqual(
      expect.arrayContaining(['PERSISTED', 2_500, ATTEMPT_ID, TOKEN]),
    );
  });

  it('finishDone nunca limpa o controle de OUTRO worker com lease ativo: só o próprio claim, ausência de claim ou claim alheio vencido', async () => {
    const { repository, calls } = setup([[{ interview_id: INTERVIEW_ID }], 1]);
    await repository.finishDone(CLAIM, { outcome: 'PERSISTED' });

    const sql = calls[0].sql;
    expect(sql).toMatch(
      /\("ai_claim_token" = \$\d+::uuid\s+OR "ai_claim_token" IS NULL\s+OR "ai_lease_until" <= now\(\)\)/,
    );
    // O token do claim que está terminando é um parâmetro do guard.
    expect(calls[0].values).toContain(TOKEN);
    // O histórico fechado é sempre o do PRÓPRIO claim (attempt_id + token).
    expect(calls[1].values).toEqual(
      expect.arrayContaining([ATTEMPT_ID, TOKEN]),
    );
  });

  it('finishDone: entrevista que não está COMPLETED não é alterada (cleared=false) e o histórico ainda é fechado', async () => {
    const { repository, calls } = setup([[], 1]);
    expect(
      await repository.finishDone(CLAIM, { outcome: 'NOTHING_TO_DO' }),
    ).toEqual({ cleared: false });
    expect(calls[1].values).toContain('NOTHING_TO_DO');
  });

  it('terminateExhausted: só sem lease ativo, só pendente de IA, por tentativas ou idade', async () => {
    const { repository, calls } = setup([
      [
        { interview_id: INTERVIEW_ID, ai_terminal_reason: 'MAX_ATTEMPTS' },
        { interview_id: 'x', ai_terminal_reason: 'EXPIRED' },
      ],
    ]);

    const result = await repository.terminateExhausted({
      maxAttempts: 4,
      maxAgeSeconds: 86_400,
    });

    expect(result).toEqual([
      { interviewId: INTERVIEW_ID, reason: 'MAX_ATTEMPTS' },
      { interviewId: 'x', reason: 'EXPIRED' },
    ]);
    const sql = calls[0].sql;
    expect(sql).toContain(`"status" = 'PENDING_AI_EVALUATION'`);
    expect(sql).toContain('"ai_terminal_at" IS NULL');
    expect(sql).toContain(
      '("ai_lease_until" IS NULL OR "ai_lease_until" <= now())',
    );
    expect(sql).toMatch(/"ai_attempts" >= \$\d+::smallint/);
    // Expira por idade de EXECUÇÃO: só quem já foi reivindicado (first_claimed_at);
    // nunca por submitted_at (entrevistas antigas não expiram ao ativar o executor).
    expect(sql).toContain('"ai_first_claimed_at" IS NOT NULL');
    expect(sql).toMatch(/"ai_first_claimed_at" <= now\(\) - make_interval/);
    expect(sql).not.toMatch(/"submitted_at"\s*(<=|>=|<|>)/);
    expect(sql).toContain('"ai_terminal_at" = now()');
    expect(sql).not.toMatch(/SET\s+"status"/i);
  });

  it('closeExpiredAttempts fecha só tentativas abertas com lease vencido', async () => {
    const { repository, calls } = setup([3]);
    expect(await repository.closeExpiredAttempts(30)).toBe(3);
    expect(calls[0].sql).toContain('"finished_at" IS NULL');
    expect(calls[0].sql).toContain('"lease_until" < now() - make_interval');
    expect(calls[0].values).toContain('LEASE_EXPIRED'.length > 0 ? 30 : 0);
    expect(calls[0].sql).toContain(`'LEASE_EXPIRED'`);
  });
});

describe('Consultas e contadores de orçamento', () => {
  it('listEligible devolve ids, em ordem, com as mesmas regras de elegibilidade do claim', async () => {
    const { repository, calls } = setup([
      [{ interview_id: INTERVIEW_ID }, { interview_id: 'b' }],
    ]);
    const ids = await repository.listEligible({
      limit: 5,
      maxAttempts: 4,
      maxAgeSeconds: 86_400,
    });
    expect(ids).toEqual([INTERVIEW_ID, 'b']);
    const sql = calls[0].sql;
    expect(sql).toContain(`"status" = 'PENDING_AI_EVALUATION'`);
    expect(sql).toContain('"ai_terminal_at" IS NULL');
    expect(sql).toContain(
      'ORDER BY "ai_next_attempt_at" ASC NULLS FIRST, "submitted_at" ASC',
    );
    expect(sql).toMatch(
      /\("ai_first_claimed_at" IS NULL OR "ai_first_claimed_at" > now\(\) - make_interval/,
    );
    // submitted_at só ordena; nunca filtra por idade.
    expect(sql).not.toMatch(/"submitted_at"\s*(<=|>=|<|>)/);
    expect(sql).not.toContain('UPDATE');
  });

  it('claim e histórico são "inícios"; chamadas à IA são contadas à parte', async () => {
    const { repository } = setup([
      [{ starts: '7' }],
      [{ requests: 3, calls: 12 }],
      [{ active: 2 }],
    ]);
    expect(await repository.countStartsSince(3_600)).toBe(7);
    expect(await repository.countAiRequestsSince(3_600)).toEqual({
      requests: 3,
      callsUpperBound: 12,
    });
    expect(await repository.countActiveLeases()).toBe(2);
  });

  it('contadores sem linhas devolvem zero', async () => {
    const { repository } = setup([[], [], []]);
    expect(await repository.countStartsSince(60)).toBe(0);
    expect(await repository.countAiRequestsSince(60)).toEqual({
      requests: 0,
      callsUpperBound: 0,
    });
    expect(await repository.countActiveLeases()).toBe(0);
  });

  it('as contagens usam colunas distintas: início = started_at; chamada = ai_requested_at', async () => {
    const { repository, calls } = setup([
      [{ starts: 0 }],
      [{ requests: 0, calls: 0 }],
    ]);
    await repository.countStartsSince(60);
    await repository.countAiRequestsSince(60);
    expect(calls[0].sql).toContain('"started_at" >=');
    expect(calls[0].sql).not.toContain('ai_requested_at');
    expect(calls[1].sql).toContain('"ai_requested_at" >=');
    expect(calls[1].sql).toContain('"ai_calls_upper_bound"');
  });
});

describe('Contrato do repositório (escopo e segurança)', () => {
  // Executa todos os métodos e confere propriedades que valem para TODO o SQL.
  async function runAll() {
    const { repository, calls } = setup([
      ...claimedRows, // claim
      [{ interview_id: INTERVIEW_ID }],
      1, // finishRetry
      [{ interview_id: INTERVIEW_ID }],
      1, // finishTerminal
      [{ interview_id: INTERVIEW_ID }],
      1, // finishDone
      [{ ai_lease_until: new Date() }],
      1, // extendLease
      1, // markAiRequested
      [], // terminateExhausted
      0, // closeExpiredAttempts
      [],
      [],
      [],
      [], // listEligible + contadores
    ]);
    await repository.claim(INTERVIEW_ID, OPTIONS);
    await repository.finishRetry(CLAIM, {
      errorCode: 'E',
      retryAfterSeconds: 1,
    });
    await repository.finishTerminal(CLAIM, {
      reason: 'EXPIRED',
      errorCode: 'E',
    });
    await repository.finishDone(CLAIM, { outcome: 'PERSISTED' });
    await repository.extendLease(CLAIM, 30);
    await repository.markAiRequested(CLAIM, 2);
    await repository.terminateExhausted({ maxAttempts: 4, maxAgeSeconds: 60 });
    await repository.closeExpiredAttempts();
    await repository.listEligible({
      limit: 1,
      maxAttempts: 4,
      maxAgeSeconds: 60,
    });
    await repository.countStartsSince(60);
    await repository.countAiRequestsSince(60);
    await repository.countActiveLeases();
    return calls;
  }

  it('nunca altera status, avaliações nem perguntas: só colunas ai_*, a tabela de histórico e leituras', async () => {
    const calls = await runAll();
    for (const call of calls) {
      expect(call.sql).not.toMatch(/SET\s+"status"/i);
      expect(call.sql).not.toMatch(/"?interview_evaluation"?/);
      expect(call.sql).not.toMatch(/"?interview_question(_evaluation)?"?/);
      expect(call.sql).not.toMatch(/\b(DELETE|TRUNCATE|DROP|ALTER)\b/i);
    }
  });

  it('todo SQL usa parâmetros (nenhum valor concatenado) e nada de texto livre do usuário', async () => {
    const calls = await runAll();
    for (const call of calls) {
      expect(call.sql).not.toContain(TOKEN);
      expect(call.sql).not.toContain(ATTEMPT_ID);
      expect(call.sql).not.toContain(INTERVIEW_ID);
      expect(call.sql).not.toMatch(/\$\{|`/);
    }
  });

  it('as escritas que mudam a posse (soltar, terminar, estender) levam o token como filtro', async () => {
    const calls = await runAll();
    // UPDATE em "interview" que solta a posse (token = NULL) ou estende o lease,
    // exceto o próprio claim (que ATRIBUI o token novo).
    const ownershipWrites = calls.filter(
      (call) =>
        call.sql.includes('UPDATE "interview"') &&
        !call.sql.includes('SET "ai_claim_token" = $') &&
        // finishDone só limpa campos de entrevista COMPLETED (sem posse a proteger).
        !call.sql.includes(`"status" = 'COMPLETED'`) &&
        (call.sql.includes('"ai_claim_token" = NULL') ||
          call.sql.includes('SET "ai_lease_until" = now() + make_interval')),
    );
    expect(ownershipWrites).toHaveLength(3); // finishRetry, finishTerminal, extendLease
    for (const call of ownershipWrites) {
      expect(tokenParam(call, '"ai_claim_token"')).toBe(TOKEN);
    }
  });

  it('o repositório não conhece a IA, a Groq nem chaves', () => {
    const source = require('fs').readFileSync(
      require('path').join(__dirname, 'ai-evaluation-claim.repository.ts'),
      'utf8',
    ) as string;
    const code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(
      /GROQ|api[_-]?key|fetch\(|setTimeout|setInterval/i,
    );
  });
});
