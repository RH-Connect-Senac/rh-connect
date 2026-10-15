import { randomUUID } from 'crypto';

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

// Claim/lease e histórico de tentativas do executor da avaliação por IA (R3.3a-4a).
//
// SOMENTE persistência de posse: não chama a IA, não grava avaliação, nunca
// altera `status`/`evaluation_mode` da entrevista e não conhece o serviço Python.
// Quem decide quando reivindicar e o que fazer com o resultado do pipeline é o
// worker (R3.3a-4c). Tudo é SQL atômico no PostgreSQL, com o relógio do banco.
//
// PROTOCOLO DE POSSE (ver docs/back-end/claim-lease-avaliacao-ia.md)
// - `claim` é um UPDATE condicional (status/modo, sem falha terminal, lease
//   vencido ou nulo, backoff vencido, tentativas dentro do limite e idade de
//   EXECUÇÃO dentro do limite) que troca `ai_claim_token` por um uuid novo. Dois claims concorrentes: só um
//   recebe a linha. Cada claim incrementa `ai_attempts` e abre UMA linha em
//   `ai_evaluation_attempt` na MESMA transação.
// - FENCING: toda escrita posterior sobre a entrevista (soltar, falha terminal,
//   estender lease) é condicionada a `ai_claim_token = <token do claim>`. Um
//   worker que perdeu o lease (token trocado) não consegue alterar nada: recebe
//   `owned: false` e deve abandonar.
// - `markAiRequested` é a trava ANTES de chamar a IA: só autoriza se o claim ainda
//   é o dono e o lease não venceu. Um claim não equivale a uma chamada à Groq.
// - A gravação da avaliação NÃO passa por aqui: é a persistência da R3.2 (UPDATE
//   condicional atômico). Um worker com lease vencido que ainda obtenha um
//   resultado válido pode gravá-lo sem dano: no máximo uma avaliação existe.

// Chave do advisory lock que serializa só o claim (transação curta, sem rede)
// quando há teto global de concorrência.
const CLAIM_LOCK_KEY = 7_320_451_001;

const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 10_000 } as const;
const MAX_INT = 2_147_483_647;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const AI_ATTEMPT_OUTCOMES = [
  'PERSISTED',
  'ALREADY_PERSISTED',
  'NOTHING_TO_DO',
  'FAILED_RETRYABLE',
  'FAILED_TERMINAL',
  'LOST_LEASE',
  'LEASE_EXPIRED',
] as const;
export type AiAttemptOutcome = (typeof AI_ATTEMPT_OUTCOMES)[number];

export const AI_TERMINAL_REASONS = [
  'MAX_ATTEMPTS',
  'EXPIRED',
  'NON_RETRYABLE',
] as const;
export type AiTerminalReason = (typeof AI_TERMINAL_REASONS)[number];

export type AiDoneOutcome = Extract<
  AiAttemptOutcome,
  'PERSISTED' | 'ALREADY_PERSISTED' | 'NOTHING_TO_DO'
>;

export interface AiEvaluationClaimOptions {
  // Identificação da instância/processo (auditoria), nunca segredo.
  workerId: string;
  leaseSeconds: number;
  maxAttempts: number;
  // Idade máxima de EXECUÇÃO: contada desde o PRIMEIRO claim (`ai_first_claimed_at`),
  // nunca desde `submitted_at`. Entrevista que ainda não foi reivindicada não
  // expira, por mais antiga que seja (o executor pode ser ativado depois).
  maxAgeSeconds: number;
  // Teto de leases ativos entre TODAS as instâncias. Omitido = sem teto global.
  maxConcurrent?: number;
}

export interface AiEvaluationClaim {
  interviewId: string;
  claimToken: string;
  attemptId: string;
  attemptNumber: number;
  leaseUntil: Date;
  workerId: string;
}

export type AiEvaluationClaimResult =
  | { status: 'claimed'; claim: AiEvaluationClaim }
  // Inelegível ou outro worker venceu a corrida (sem distinguir de propósito).
  | { status: 'not_claimable' }
  | { status: 'at_capacity' };

export type AiEvaluationClaimErrorCode =
  'INVALID_INTERVIEW_ID' | 'INVALID_OPTIONS';

export class AiEvaluationClaimError extends Error {
  constructor(
    readonly code: AiEvaluationClaimErrorCode,
    readonly field: string,
  ) {
    super(
      `Parâmetro inválido para o claim da avaliação por IA (${code}): ${field}.`,
    );
    this.name = 'AiEvaluationClaimError';
  }
}

function assertUuid(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new AiEvaluationClaimError('INVALID_INTERVIEW_ID', field);
  }
}

function assertPositiveInt(value: unknown, field: string, max = MAX_INT) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > max
  ) {
    throw new AiEvaluationClaimError('INVALID_OPTIONS', field);
  }
}

function assertNonNegativeInt(value: unknown, field: string) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_INT
  ) {
    throw new AiEvaluationClaimError('INVALID_OPTIONS', field);
  }
}

function assertClaimOptions(options: AiEvaluationClaimOptions) {
  if (
    typeof options.workerId !== 'string' ||
    options.workerId.trim() === '' ||
    options.workerId.length > 80
  ) {
    throw new AiEvaluationClaimError('INVALID_OPTIONS', 'workerId');
  }
  assertPositiveInt(options.leaseSeconds, 'leaseSeconds');
  assertPositiveInt(options.maxAttempts, 'maxAttempts', 32_767);
  assertPositiveInt(options.maxAgeSeconds, 'maxAgeSeconds');
  if (options.maxConcurrent !== undefined) {
    assertPositiveInt(options.maxConcurrent, 'maxConcurrent', 1_000);
  }
}

interface FinishInput {
  outcome: AiAttemptOutcome;
  errorCode?: string | null;
  aiDurationMs?: number | null;
}

@Injectable()
export class AiEvaluationClaimRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Entrevistas candidatas (somente leitura, sem reservar nada): o claim é que
  // decide. Ordem: vencidas há mais tempo primeiro, depois as mais antigas.
  async listEligible(options: {
    limit: number;
    maxAttempts: number;
    maxAgeSeconds: number;
  }): Promise<string[]> {
    assertPositiveInt(options.limit, 'limit', 1_000);
    assertPositiveInt(options.maxAttempts, 'maxAttempts', 32_767);
    assertPositiveInt(options.maxAgeSeconds, 'maxAgeSeconds');
    const rows = await this.prisma.$queryRaw<Array<{ interview_id: string }>>(
      Prisma.sql`SELECT "interview_id"
        FROM "interview"
        WHERE "status" = 'PENDING_AI_EVALUATION'
          AND "evaluation_mode" = 'AI'
          AND "ai_terminal_at" IS NULL
          AND ("ai_lease_until" IS NULL OR "ai_lease_until" <= now())
          AND ("ai_next_attempt_at" IS NULL OR "ai_next_attempt_at" <= now())
          AND "ai_attempts" < ${options.maxAttempts}::smallint
          AND ("ai_first_claimed_at" IS NULL OR "ai_first_claimed_at" > now() - make_interval(secs => ${options.maxAgeSeconds}::double precision))
        ORDER BY "ai_next_attempt_at" ASC NULLS FIRST, "submitted_at" ASC
        LIMIT ${options.limit}::int`,
    );
    return rows.map((row) => row.interview_id);
  }

  // Reivindica UMA entrevista. Atômico: o UPDATE condicional e a abertura da linha
  // de histórico acontecem na mesma transação; sem linha afetada, nada é gravado.
  async claim(
    interviewId: string,
    options: AiEvaluationClaimOptions,
  ): Promise<AiEvaluationClaimResult> {
    assertUuid(interviewId, 'interviewId');
    assertClaimOptions(options);
    const claimToken = randomUUID();

    return this.prisma.$transaction(async (tx) => {
      if (options.maxConcurrent !== undefined) {
        // Serializa só o claim (transação curta, sem rede) para o teto global.
        await tx.$queryRaw(
          Prisma.sql`SELECT 1 AS locked FROM (SELECT pg_advisory_xact_lock(${CLAIM_LOCK_KEY}::bigint)) AS claim_lock`,
        );
        const active = await tx.$queryRaw<Array<{ active: number }>>(
          Prisma.sql`SELECT COUNT(*)::int AS active
            FROM "interview"
            WHERE "ai_lease_until" > now()
              AND "status" = 'PENDING_AI_EVALUATION'
              AND "evaluation_mode" = 'AI'`,
        );
        if (Number(active[0]?.active ?? 0) >= options.maxConcurrent) {
          return { status: 'at_capacity' } as const;
        }
      }

      const claimed = await tx.$queryRaw<
        Array<{ ai_attempts: number; ai_lease_until: Date }>
      >(
        Prisma.sql`UPDATE "interview"
          SET "ai_claim_token" = ${claimToken}::uuid,
              "ai_lease_until" = now() + make_interval(secs => ${options.leaseSeconds}::double precision),
              "ai_attempts" = "ai_attempts" + 1,
              "ai_first_claimed_at" = COALESCE("ai_first_claimed_at", now()),
              "ai_next_attempt_at" = NULL
          WHERE "interview_id" = ${interviewId}::uuid
            AND "status" = 'PENDING_AI_EVALUATION'
            AND "evaluation_mode" = 'AI'
            AND "ai_terminal_at" IS NULL
            AND ("ai_lease_until" IS NULL OR "ai_lease_until" <= now())
            AND ("ai_next_attempt_at" IS NULL OR "ai_next_attempt_at" <= now())
            AND "ai_attempts" < ${options.maxAttempts}::smallint
            AND ("ai_first_claimed_at" IS NULL OR "ai_first_claimed_at" > now() - make_interval(secs => ${options.maxAgeSeconds}::double precision))
          RETURNING "ai_attempts", "ai_lease_until"`,
      );
      if (claimed.length !== 1) {
        return { status: 'not_claimable' } as const;
      }

      const opened = await tx.$queryRaw<Array<{ attempt_id: string }>>(
        Prisma.sql`INSERT INTO "ai_evaluation_attempt"
            ("interview_id", "claim_token", "attempt_number", "worker_id", "lease_until")
          SELECT "interview_id", "ai_claim_token", "ai_attempts", ${options.workerId}, "ai_lease_until"
          FROM "interview"
          WHERE "interview_id" = ${interviewId}::uuid
            AND "ai_claim_token" = ${claimToken}::uuid
          RETURNING "attempt_id"`,
      );
      if (opened.length !== 1) {
        // Nunca deve ocorrer na mesma transação; abortar desfaz o claim.
        throw new Error('Histórico de tentativa não foi aberto.');
      }

      return {
        status: 'claimed',
        claim: {
          interviewId,
          claimToken,
          attemptId: opened[0].attempt_id,
          attemptNumber: Number(claimed[0].ai_attempts),
          leaseUntil: claimed[0].ai_lease_until,
          workerId: options.workerId,
        },
      } as const;
    }, TRANSACTION_OPTIONS);
  }

  // Trava ANTES de chamar a IA: só autoriza se este claim AINDA é o dono da
  // entrevista (token igual), o lease não venceu e a entrevista segue pendente.
  // Registra o início da chamada e o teto de chamadas à Groq desta tentativa.
  async markAiRequested(
    claim: AiEvaluationClaim,
    // null = teto de chamadas à Groq não configurado (nunca presumido).
    callsUpperBound: number | null,
  ): Promise<{ authorized: boolean }> {
    if (callsUpperBound !== null) {
      assertNonNegativeInt(callsUpperBound, 'callsUpperBound');
      if (callsUpperBound > 32_767) {
        throw new AiEvaluationClaimError('INVALID_OPTIONS', 'callsUpperBound');
      }
    }
    const updated = await this.prisma.$executeRaw(
      Prisma.sql`UPDATE "ai_evaluation_attempt" AS a
        SET "ai_requested_at" = now(), "ai_calls_upper_bound" = ${callsUpperBound}::smallint
        FROM "interview" AS i
        WHERE a."attempt_id" = ${claim.attemptId}::uuid
          AND a."claim_token" = ${claim.claimToken}::uuid
          AND a."finished_at" IS NULL
          AND a."ai_requested_at" IS NULL
          AND i."interview_id" = a."interview_id"
          AND i."ai_claim_token" = a."claim_token"
          AND i."ai_lease_until" > now()
          AND i."status" = 'PENDING_AI_EVALUATION'`,
    );
    return { authorized: updated === 1 };
  }

  // Estende o lease (heartbeat). Só se ainda for o dono E o lease não venceu:
  // um lease vencido não é ressuscitado.
  async extendLease(
    claim: AiEvaluationClaim,
    leaseSeconds: number,
  ): Promise<{ owned: boolean }> {
    assertPositiveInt(leaseSeconds, 'leaseSeconds');
    return this.prisma.$transaction(async (tx) => {
      const extended = await tx.$queryRaw<Array<{ ai_lease_until: Date }>>(
        Prisma.sql`UPDATE "interview"
          SET "ai_lease_until" = now() + make_interval(secs => ${leaseSeconds}::double precision)
          WHERE "interview_id" = ${claim.interviewId}::uuid
            AND "ai_claim_token" = ${claim.claimToken}::uuid
            AND "ai_lease_until" > now()
            AND "status" = 'PENDING_AI_EVALUATION'
          RETURNING "ai_lease_until"`,
      );
      if (extended.length !== 1) return { owned: false };
      await tx.$executeRaw(
        Prisma.sql`UPDATE "ai_evaluation_attempt"
          SET "lease_until" = ${extended[0].ai_lease_until}::timestamptz
          WHERE "attempt_id" = ${claim.attemptId}::uuid
            AND "claim_token" = ${claim.claimToken}::uuid
            AND "finished_at" IS NULL`,
      );
      return { owned: true };
    }, TRANSACTION_OPTIONS);
  }

  // Falha REPETÍVEL: solta o claim e agenda a próxima tentativa (backoff
  // persistido). Fenced: sem a posse (token trocado) nada na entrevista muda e o
  // histórico registra LOST_LEASE.
  async finishRetry(
    claim: AiEvaluationClaim,
    input: {
      errorCode: string;
      retryAfterSeconds: number;
      aiDurationMs?: number | null;
    },
  ): Promise<{ owned: boolean }> {
    assertNonNegativeInt(input.retryAfterSeconds, 'retryAfterSeconds');
    return this.prisma.$transaction(async (tx) => {
      const released = await tx.$queryRaw<Array<{ interview_id: string }>>(
        Prisma.sql`UPDATE "interview"
          SET "ai_claim_token" = NULL,
              "ai_lease_until" = NULL,
              "ai_next_attempt_at" = now() + make_interval(secs => ${input.retryAfterSeconds}::double precision),
              "ai_last_error_code" = ${input.errorCode}
          WHERE "interview_id" = ${claim.interviewId}::uuid
            AND "ai_claim_token" = ${claim.claimToken}::uuid
            AND "status" = 'PENDING_AI_EVALUATION'
          RETURNING "interview_id"`,
      );
      const owned = released.length === 1;
      await this.closeAttempt(tx, claim, {
        outcome: owned ? 'FAILED_RETRYABLE' : 'LOST_LEASE',
        errorCode: input.errorCode,
        aiDurationMs: input.aiDurationMs,
      });
      return { owned };
    }, TRANSACTION_OPTIONS);
  }

  // Falha TERMINAL: a entrevista deixa de ser reivindicada e continua
  // PENDING_AI_EVALUATION (nunca COMPLETED). Fenced pelo token.
  async finishTerminal(
    claim: AiEvaluationClaim,
    input: {
      reason: AiTerminalReason;
      errorCode: string;
      aiDurationMs?: number | null;
    },
  ): Promise<{ owned: boolean }> {
    if (!(AI_TERMINAL_REASONS as readonly string[]).includes(input.reason)) {
      throw new AiEvaluationClaimError('INVALID_OPTIONS', 'reason');
    }
    return this.prisma.$transaction(async (tx) => {
      const marked = await tx.$queryRaw<Array<{ interview_id: string }>>(
        Prisma.sql`UPDATE "interview"
          SET "ai_claim_token" = NULL,
              "ai_lease_until" = NULL,
              "ai_next_attempt_at" = NULL,
              "ai_last_error_code" = ${input.errorCode},
              "ai_terminal_at" = now(),
              "ai_terminal_reason" = ${input.reason}
          WHERE "interview_id" = ${claim.interviewId}::uuid
            AND "ai_claim_token" = ${claim.claimToken}::uuid
            AND "status" = 'PENDING_AI_EVALUATION'
          RETURNING "interview_id"`,
      );
      const owned = marked.length === 1;
      await this.closeAttempt(tx, claim, {
        outcome: owned ? 'FAILED_TERMINAL' : 'LOST_LEASE',
        errorCode: input.errorCode,
        aiDurationMs: input.aiDurationMs,
      });
      return { owned };
    }, TRANSACTION_OPTIONS);
  }

  // Encerra a tentativa depois de o pipeline concluir (persisted, already_persisted
  // ou nothing_to_do). Em entrevista COMPLETED os campos do executor não têm mais
  // significado e são limpos, MAS nunca o controle de OUTRO worker com lease ativo:
  // um executor cujo lease venceu e que conclui tarde só limpa se o claim for dele,
  // se não houver claim ou se o claim alheio já tiver vencido; o dono atual encerra
  // a própria tentativa depois. `ai_attempts` permanece como histórico e a linha
  // de histórico só é fechada para o PRÓPRIO claim (attempt_id + token).
  async finishDone(
    claim: AiEvaluationClaim,
    input: { outcome: AiDoneOutcome; aiDurationMs?: number | null },
  ): Promise<{ cleared: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const cleared = await tx.$queryRaw<Array<{ interview_id: string }>>(
        Prisma.sql`UPDATE "interview"
          SET "ai_claim_token" = NULL,
              "ai_lease_until" = NULL,
              "ai_next_attempt_at" = NULL,
              "ai_last_error_code" = NULL,
              "ai_terminal_at" = NULL,
              "ai_terminal_reason" = NULL
          WHERE "interview_id" = ${claim.interviewId}::uuid
            AND "status" = 'COMPLETED'
            AND "evaluation_mode" = 'AI'
            AND ("ai_claim_token" = ${claim.claimToken}::uuid
                 OR "ai_claim_token" IS NULL
                 OR "ai_lease_until" <= now())
          RETURNING "interview_id"`,
      );
      await this.closeAttempt(tx, claim, {
        outcome: input.outcome,
        aiDurationMs: input.aiDurationMs,
      });
      return { cleared: cleared.length === 1 };
    }, TRANSACTION_OPTIONS);
  }

  // Marca como terminais as entrevistas SEM lease ativo que esgotaram tentativas
  // ou excederam a idade máxima DE EXECUÇÃO (desde o primeiro claim; sem nova
  // chamada à IA). Entrevistas nunca reivindicadas NÃO expiram, por mais antigas
  // que sejam. Não toca nas que têm lease ativo: o dono ainda pode concluir.
  async terminateExhausted(options: {
    maxAttempts: number;
    maxAgeSeconds: number;
    limit?: number;
  }): Promise<Array<{ interviewId: string; reason: AiTerminalReason }>> {
    assertPositiveInt(options.maxAttempts, 'maxAttempts', 32_767);
    assertPositiveInt(options.maxAgeSeconds, 'maxAgeSeconds');
    const limit = options.limit ?? 100;
    assertPositiveInt(limit, 'limit', 1_000);
    const rows = await this.prisma.$queryRaw<
      Array<{ interview_id: string; ai_terminal_reason: AiTerminalReason }>
    >(
      Prisma.sql`UPDATE "interview"
        SET "ai_terminal_at" = now(),
            "ai_terminal_reason" = CASE
              WHEN "ai_attempts" >= ${options.maxAttempts}::smallint THEN 'MAX_ATTEMPTS'
              ELSE 'EXPIRED' END,
            "ai_next_attempt_at" = NULL
        WHERE "interview_id" IN (
          SELECT "interview_id" FROM "interview"
          WHERE "status" = 'PENDING_AI_EVALUATION'
            AND "evaluation_mode" = 'AI'
            AND "ai_terminal_at" IS NULL
            AND ("ai_lease_until" IS NULL OR "ai_lease_until" <= now())
            AND ("ai_attempts" >= ${options.maxAttempts}::smallint
                 OR ("ai_first_claimed_at" IS NOT NULL
                     AND "ai_first_claimed_at" <= now() - make_interval(secs => ${options.maxAgeSeconds}::double precision)))
          ORDER BY "submitted_at" ASC
          LIMIT ${limit}::int)
          AND "status" = 'PENDING_AI_EVALUATION'
          AND "ai_terminal_at" IS NULL
          AND ("ai_lease_until" IS NULL OR "ai_lease_until" <= now())
        RETURNING "interview_id", "ai_terminal_reason"`,
    );
    return rows.map((row) => ({
      interviewId: row.interview_id,
      reason: row.ai_terminal_reason,
    }));
  }

  // Recuperação após queda: fecha tentativas abertas cujo lease venceu (o worker
  // morreu ou travou). Não depende de token: a linha de histórico é só registro.
  async closeExpiredAttempts(graceSeconds = 0): Promise<number> {
    assertNonNegativeInt(graceSeconds, 'graceSeconds');
    return this.prisma.$executeRaw(
      Prisma.sql`UPDATE "ai_evaluation_attempt"
        SET "finished_at" = now(), "outcome" = 'LEASE_EXPIRED'
        WHERE "finished_at" IS NULL
          AND "lease_until" < now() - make_interval(secs => ${graceSeconds}::double precision)`,
    );
  }

  // --- Contadores para os orçamentos (o worker decide os limites) ---------------

  // Leases ativos agora (concorrência efetiva entre todas as instâncias).
  async countActiveLeases(): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ active: number }>>(
      Prisma.sql`SELECT COUNT(*)::int AS active
        FROM "interview"
        WHERE "ai_lease_until" > now()
          AND "status" = 'PENDING_AI_EVALUATION'
          AND "evaluation_mode" = 'AI'`,
    );
    return Number(rows[0]?.active ?? 0);
  }

  // Tentativas INICIADAS (claims) na janela. NÃO são chamadas à Groq.
  async countStartsSince(windowSeconds: number): Promise<number> {
    assertPositiveInt(windowSeconds, 'windowSeconds');
    const rows = await this.prisma.$queryRaw<Array<{ starts: number }>>(
      Prisma.sql`SELECT COUNT(*)::int AS starts
        FROM "ai_evaluation_attempt"
        WHERE "started_at" >= now() - make_interval(secs => ${windowSeconds}::double precision)`,
    );
    return Number(rows[0]?.starts ?? 0);
  }

  // Tentativas que de fato foram autorizadas a chamar a IA na janela e o teto de
  // chamadas à Groq que elas podem ter gerado (retry estrutural x chaves).
  async countAiRequestsSince(
    windowSeconds: number,
  ): Promise<{ requests: number; callsUpperBound: number }> {
    assertPositiveInt(windowSeconds, 'windowSeconds');
    const rows = await this.prisma.$queryRaw<
      Array<{ requests: number; calls: number }>
    >(
      Prisma.sql`SELECT COUNT("ai_requested_at")::int AS requests,
          COALESCE(SUM("ai_calls_upper_bound"), 0)::int AS calls
        FROM "ai_evaluation_attempt"
        WHERE "ai_requested_at" >= now() - make_interval(secs => ${windowSeconds}::double precision)`,
    );
    return {
      requests: Number(rows[0]?.requests ?? 0),
      callsUpperBound: Number(rows[0]?.calls ?? 0),
    };
  }

  // Fecha a linha de histórico da tentativa. Condicionada a attempt_id + token e a
  // ainda estar aberta: nunca sobrescreve um desfecho já registrado.
  private async closeAttempt(
    tx: Prisma.TransactionClient,
    claim: AiEvaluationClaim,
    input: FinishInput,
  ): Promise<void> {
    if (input.aiDurationMs !== undefined && input.aiDurationMs !== null) {
      assertNonNegativeInt(input.aiDurationMs, 'aiDurationMs');
    }
    await tx.$executeRaw(
      Prisma.sql`UPDATE "ai_evaluation_attempt"
        SET "finished_at" = now(),
            "outcome" = ${input.outcome},
            "error_code" = ${input.errorCode ?? null},
            "ai_duration_ms" = COALESCE(${input.aiDurationMs ?? null}::int, "ai_duration_ms")
        WHERE "attempt_id" = ${claim.attemptId}::uuid
          AND "claim_token" = ${claim.claimToken}::uuid
          AND "finished_at" IS NULL`,
    );
  }
}
