import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';

import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';

import {
  AiEvaluationClaimRepository,
  type AiEvaluationClaim,
} from './ai-evaluation-claim.repository';
import {
  AiEvaluationPipelineService,
  type AiEvaluationPipelineResult,
} from './ai-evaluation-pipeline.service';
import {
  classifyPipelineResult,
  checkAiRequestBudget,
  checkStartBudget,
  evaluateBrake,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  toBrakeEvent,
  type AiWorkerAction,
  type BrakeEvent,
} from './ai-evaluation-worker-policy';
import {
  resolveWorkerSetup,
  type AiEvaluationWorkerConfig,
} from './ai-evaluation-worker.config';

// Executor da avaliação por IA (R3.3a-4c). DESABILITADO por padrão
// (`AI_EVALUATION_WORKER_ENABLED`): sem configuração explícita e válida de todos
// os limites obrigatórios não reivindica nem processa nada. Concorrência inicial 1
// por instância (e 1 global, persistida). Não faz retry nem rotação de chaves da
// Groq: isso é exclusivo do serviço Python. Ver docs/back-end/worker-avaliacao-ia.md.

export const AI_EVALUATION_WORKER_ENV = 'AI_EVALUATION_WORKER_ENV';
export const AI_EVALUATION_WORKER_RUNTIME = 'AI_EVALUATION_WORKER_RUNTIME';

// Dependências de tempo/identidade injetáveis (determinismo nos testes).
export interface AiEvaluationWorkerRuntime {
  now?: () => Date;
  random?: () => number;
  workerId?: string;
}

export type AiEvaluationWorkerStatus =
  'disabled' | 'invalid_config' | 'running' | 'stopped';

export interface AiEvaluationCycleSummary {
  processed: number;
  stoppedBy:
    | 'inactive'
    | 'shutdown'
    | 'brake'
    | 'budget'
    | 'capacity'
    | 'idle'
    | 'error'
    | 'cycle_limit';
}

const CANDIDATES_PER_LOOKUP = 10;
// Segurança: nunca processa indefinidamente dentro de um único ciclo.
const MAX_PER_CYCLE = 50;
const MAX_BRAKE_EVENTS = 100;
// Espera fixa após `aborted` (posse perdida) e erro de orçamento na corrida.
const ABORTED_ERROR_CODES = {
  budget: 'BUDGET_EXHAUSTED',
  lease: 'LEASE_LOST_BEFORE_AI',
} as const;

@Injectable()
export class AiEvaluationWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AiEvaluationWorkerService.name);
  private readonly now: () => Date;
  private readonly random: () => number;
  private readonly workerId: string;

  private status: AiEvaluationWorkerStatus = 'stopped';
  private config: AiEvaluationWorkerConfig | null = null;
  private timer: NodeJS.Timeout | null = null;
  private stopping = false;
  private currentCycle: Promise<AiEvaluationCycleSummary> | null = null;
  // Eventos do freio: memória, valem POR INSTÂNCIA (não persistidos).
  private brakeEvents: BrakeEvent[] = [];

  constructor(
    private readonly pipeline: AiEvaluationPipelineService,
    private readonly claims: AiEvaluationClaimRepository,
    @Optional()
    @Inject(AI_EVALUATION_WORKER_ENV)
    private readonly env: Readonly<
      Record<string, string | undefined>
    > = process.env,
    @Optional()
    @Inject(AI_EVALUATION_WORKER_RUNTIME)
    runtime: AiEvaluationWorkerRuntime = {},
  ) {
    this.now = runtime.now ?? (() => new Date());
    this.random = runtime.random ?? Math.random;
    this.workerId =
      runtime.workerId ??
      `${hostname().slice(0, 40)}:${process.pid}:${randomUUID().slice(0, 8)}`;
  }

  getStatus(): AiEvaluationWorkerStatus {
    return this.status;
  }

  onModuleInit(): void {
    this.start();
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  // Resolve a configuração e, só se estiver habilitada e válida, agenda o ciclo.
  start(): AiEvaluationWorkerStatus {
    const setup = resolveWorkerSetup(this.env);
    if (setup.state === 'disabled') {
      this.status = 'disabled';
      this.logger.log(
        'Executor da avaliação por IA desabilitado (AI_EVALUATION_WORKER_ENABLED).',
      );
      return this.status;
    }
    if (setup.state === 'invalid') {
      this.status = 'invalid_config';
      this.logger.error(
        `Executor da avaliação por IA NÃO iniciado: configuração inválida ou incompleta (${setup.fields.join(', ')}).`,
      );
      return this.status;
    }
    this.config = setup.config;
    this.stopping = false;
    this.status = 'running';
    this.logger.log(
      `Executor da avaliação por IA habilitado (concorrência ${setup.config.budget.maxConcurrent}, intervalo ${setup.config.pollIntervalSeconds}s).`,
    );
    this.schedule(0);
    return this.status;
  }

  // Encerramento ordenado: não inicia novos claims; aguarda a tentativa em curso
  // até o prazo configurado. Se não terminar, o lease persistido garante a
  // recuperação depois do vencimento (nada fica só em memória).
  async stop(): Promise<{ drained: boolean }> {
    this.stopping = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const running = this.currentCycle;
    if (!running) {
      if (this.status === 'running') this.status = 'stopped';
      return { drained: true };
    }
    const graceMs = (this.config?.shutdownGraceSeconds ?? 0) * 1_000;
    let graceTimer: NodeJS.Timeout | undefined;
    const outcome = await Promise.race([
      running.then(
        () => 'done' as const,
        () => 'done' as const,
      ),
      new Promise<'timeout'>((resolve) => {
        graceTimer = setTimeout(() => resolve('timeout'), graceMs);
      }),
    ]);
    if (graceTimer) clearTimeout(graceTimer);
    this.status = 'stopped';
    if (outcome === 'timeout') {
      this.logger.warn(
        'Encerramento: a avaliação em curso não terminou no prazo; o lease persistido permite a recuperação após o vencimento.',
      );
      return { drained: false };
    }
    return { drained: true };
  }

  private schedule(delayMs: number): void {
    if (this.stopping || this.status !== 'running' || this.config === null) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runCycle().finally(() => {
        this.schedule((this.config?.pollIntervalSeconds ?? 60) * 1_000);
      });
    }, delayMs);
    this.timer.unref();
  }

  // Um ciclo: manutenção, depois processa as entrevistas elegíveis uma por vez
  // (concorrência 1) até acabarem, um orçamento/freio negar ou o encerramento.
  runCycle(): Promise<AiEvaluationCycleSummary> {
    if (this.currentCycle) return this.currentCycle;
    const cycle = this.cycle().finally(() => {
      this.currentCycle = null;
    });
    this.currentCycle = cycle;
    return cycle;
  }

  private async cycle(): Promise<AiEvaluationCycleSummary> {
    const config = this.config;
    if (this.status !== 'running' || config === null) {
      return { processed: 0, stoppedBy: 'inactive' };
    }
    let processed = 0;
    try {
      await this.housekeeping(config);
      while (processed < MAX_PER_CYCLE) {
        if (this.stopping) return { processed, stoppedBy: 'shutdown' };
        this.pruneBrakeEvents(config);
        const brake = evaluateBrake(this.brakeEvents, this.now(), config.brake);
        if (brake.open) {
          this.logger.warn(
            `Freio global aberto (${brake.consecutiveFailures} falhas transitórias seguidas, nesta instância): sem novas avaliações até o fim da pausa.`,
          );
          return { processed, stoppedBy: 'brake' };
        }
        if (!(await this.budgetsAllow(config))) {
          return { processed, stoppedBy: 'budget' };
        }

        const candidates = await this.claims.listEligible({
          limit: CANDIDATES_PER_LOOKUP,
          maxAttempts: config.retry.maxAttempts,
          maxAgeSeconds: config.retry.maxAgeSeconds,
        });
        let claimedOne = false;
        for (const interviewId of candidates) {
          if (this.stopping) return { processed, stoppedBy: 'shutdown' };
          const claimed = await this.claims.claim(interviewId, {
            workerId: this.workerId,
            leaseSeconds: config.leaseSeconds,
            maxAttempts: config.retry.maxAttempts,
            maxAgeSeconds: config.retry.maxAgeSeconds,
            maxConcurrent: config.budget.maxConcurrent,
          });
          if (claimed.status === 'at_capacity') {
            return { processed, stoppedBy: 'capacity' };
          }
          if (claimed.status === 'claimed') {
            await this.processClaim(claimed.claim, config);
            processed += 1;
            claimedOne = true;
            // Reavalia freio e orçamentos antes da próxima entrevista.
            break;
          }
        }
        if (!claimedOne) return { processed, stoppedBy: 'idle' };
      }
      return { processed, stoppedBy: 'cycle_limit' };
    } catch (error) {
      this.logger.error(
        `Executor da avaliação por IA: falha no ciclo (${error instanceof Error ? error.name : 'unknown'}).`,
      );
      return { processed, stoppedBy: 'error' };
    }
  }

  // Fecha tentativas abandonadas e encerra como terminais as que esgotaram
  // tentativas/idade (sem nova chamada à IA). Falhas aqui não impedem o ciclo.
  private async housekeeping(config: AiEvaluationWorkerConfig): Promise<void> {
    try {
      await this.claims.closeExpiredAttempts(0);
      const ended = await this.claims.terminateExhausted({
        maxAttempts: config.retry.maxAttempts,
        maxAgeSeconds: config.retry.maxAgeSeconds,
      });
      if (ended.length > 0) {
        this.logger.warn(
          `Avaliações encerradas como terminais por limite (sem nova chamada à IA): ${ended.length}.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Executor da avaliação por IA: falha na manutenção (${error instanceof Error ? error.name : 'unknown'}).`,
      );
    }
  }

  // Orçamentos PERSISTIDOS (contados no banco, valem entre instâncias) antes do
  // claim, para não gastar uma tentativa que seria negada logo em seguida.
  private async budgetsAllow(
    config: AiEvaluationWorkerConfig,
  ): Promise<boolean> {
    const start = checkStartBudget(
      {
        activeLeases: await this.claims.countActiveLeases(),
        startsLastHour: await this.claims.countStartsSince(SECONDS_PER_HOUR),
        startsLastDay: await this.claims.countStartsSince(SECONDS_PER_DAY),
      },
      config.budget,
    );
    if (!start.allowed) {
      this.logger.warn(`Orçamento de inícios negou: ${start.reason}.`);
      return false;
    }
    const ai = await this.aiBudget(config);
    if (!ai.allowed) {
      this.logger.warn(`Orçamento de chamadas à IA negou: ${ai.reason}.`);
      return false;
    }
    return true;
  }

  private async aiBudget(config: AiEvaluationWorkerConfig) {
    const hour = await this.claims.countAiRequestsSince(SECONDS_PER_HOUR);
    const day = await this.claims.countAiRequestsSince(SECONDS_PER_DAY);
    return checkAiRequestBudget(
      {
        aiRequestsLastHour: hour.requests,
        aiRequestsLastDay: day.requests,
        groqCallsUpperBoundLastHour: hour.callsUpperBound,
        groqCallsUpperBoundLastDay: day.callsUpperBound,
      },
      config.budget,
    );
  }

  private async processClaim(
    claim: AiEvaluationClaim,
    config: AiEvaluationWorkerConfig,
  ): Promise<void> {
    const gate: { denied: 'budget' | 'lease' | null } = { denied: null };
    let leaseLost = false;
    let heartbeatRunning: Promise<void> = Promise.resolve();
    const heartbeat = setInterval(() => {
      heartbeatRunning = heartbeatRunning.then(async () => {
        try {
          const { owned } = await this.claims.extendLease(
            claim,
            config.leaseSeconds,
          );
          if (!owned) {
            leaseLost = true;
            clearInterval(heartbeat);
          }
        } catch {
          // Falha momentânea: o próximo batimento tenta de novo.
        }
      });
    }, config.heartbeatSeconds * 1_000);
    heartbeat.unref();

    let result: AiEvaluationPipelineResult;
    try {
      result = await this.pipeline.process(claim.interviewId, {
        beforeAiCall: async () => {
          // Reconfere o orçamento da IA/Groq imediatamente antes e só então
          // trava a posse; a IA nunca é chamada sem esta autorização.
          const decision = await this.aiBudget(config);
          if (!decision.allowed) {
            gate.denied = 'budget';
            return false;
          }
          const { authorized } = await this.claims.markAiRequested(
            claim,
            decision.callsUpperBound,
          );
          if (!authorized) {
            gate.denied = 'lease';
            return false;
          }
          return true;
        },
      });
    } catch (error) {
      // Defeito inesperado: não grava nada; o lease vence e a entrevista volta
      // à fila (a tentativa já foi contada, então não há laço infinito).
      this.logger.error(
        `Executor da avaliação por IA: falha inesperada interviewId=${claim.interviewId} (${error instanceof Error ? error.name : 'unknown'}).`,
      );
      return;
    } finally {
      clearInterval(heartbeat);
      await heartbeatRunning;
    }

    try {
      if (result.status === 'aborted') {
        await this.finishAborted(claim, config, gate.denied);
        return;
      }
      const action = classifyPipelineResult(result, {
        attemptNumber: claim.attemptNumber,
        retry: config.retry,
        random: this.random,
      });
      this.brakeEvents.push(toBrakeEvent(action, this.now()));
      await this.applyAction(claim, action, leaseLost);
    } catch (error) {
      // Falha ao gravar o desfecho (ex.: banco indisponível): o lease persistido
      // expira e a entrevista é recuperada; nada é dado como concluído aqui.
      this.logger.error(
        `Executor da avaliação por IA: falha ao registrar o desfecho interviewId=${claim.interviewId} (${error instanceof Error ? error.name : 'unknown'}).`,
      );
    }
  }

  private async finishAborted(
    claim: AiEvaluationClaim,
    config: AiEvaluationWorkerConfig,
    denied: 'budget' | 'lease' | null,
  ): Promise<void> {
    // A IA NÃO foi chamada. Libera com espera fixa (sem escalonar); fenced pelo
    // token: se a posse foi perdida, nada na entrevista muda e o histórico
    // registra LOST_LEASE. A tentativa consumida pelo claim não é devolvida.
    const reason = denied === 'budget' ? 'budget' : 'lease';
    const { owned } = await this.claims.finishRetry(claim, {
      errorCode: ABORTED_ERROR_CODES[reason],
      retryAfterSeconds:
        reason === 'budget'
          ? config.budget.recheckSeconds
          : config.retry.backoffBaseSeconds,
    });
    this.logger.warn(
      `Avaliação não chamou a IA interviewId=${claim.interviewId} attempt=${claim.attemptNumber} motivo=${ABORTED_ERROR_CODES[reason]} owned=${owned}`,
    );
  }

  private async applyAction(
    claim: AiEvaluationClaim,
    action: AiWorkerAction,
    leaseLostDuringRun: boolean,
  ): Promise<void> {
    const base = `interviewId=${claim.interviewId} attempt=${claim.attemptNumber} leaseLostDuringRun=${leaseLostDuringRun}`;
    switch (action.kind) {
      case 'done': {
        const { cleared } = await this.claims.finishDone(claim, {
          outcome: action.outcome,
          aiDurationMs: action.aiDurationMs ?? null,
        });
        this.logger.log(
          `Avaliação concluída ${base} outcome=${action.outcome} cleared=${cleared}`,
        );
        return;
      }
      case 'retry': {
        const { owned } = await this.claims.finishRetry(claim, {
          errorCode: action.errorCode,
          retryAfterSeconds: action.retryAfterSeconds,
          aiDurationMs: action.aiDurationMs ?? null,
        });
        this.logger.warn(
          `Avaliação a repetir ${base} code=${action.errorCode} retryAfterSeconds=${action.retryAfterSeconds} owned=${owned}`,
        );
        return;
      }
      case 'terminal': {
        const { owned } = await this.claims.finishTerminal(claim, {
          reason: action.reason,
          errorCode: action.errorCode,
          aiDurationMs: action.aiDurationMs ?? null,
        });
        this.logger.error(
          `Avaliação encerrada como terminal ${base} reason=${action.reason} code=${action.errorCode} owned=${owned}`,
        );
        return;
      }
    }
  }

  // Só eventos recentes contam para o freio (falhas antigas não somam com uma
  // nova); o histórico em memória também é limitado.
  private pruneBrakeEvents(config: AiEvaluationWorkerConfig): void {
    const horizon =
      this.now().getTime() - config.brake.pauseSeconds * 1_000 * 3;
    this.brakeEvents = this.brakeEvents
      .filter((event) => event.at.getTime() >= horizon)
      .slice(-MAX_BRAKE_EVENTS);
  }
}
