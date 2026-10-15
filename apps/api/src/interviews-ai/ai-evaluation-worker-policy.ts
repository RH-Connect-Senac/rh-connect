import type {
  AiDoneOutcome,
  AiTerminalReason,
} from './ai-evaluation-claim.repository';
import type { AiEvaluationPipelineResult } from './ai-evaluation-pipeline.service';

// Política PURA do executor da avaliação por IA (R3.3a-4b): retry e backoff,
// classificação do resultado do pipeline, limites de tentativas, orçamentos e
// freio global. Sem rede, sem banco, sem relógio e sem aleatoriedade próprios:
// o "agora" e o gerador aleatório entram como parâmetros. NÃO é worker nem
// agendador e nada aqui liga o processamento (R3.3a-4c).
//
// Três medidas são tratadas SEPARADAMENTE (um claim não é uma chamada à Groq):
//  1. avaliações INICIADAS (claims; `starts`);
//  2. chamadas à IA AUTORIZADAS (`ai_requested_at`; `aiRequests`);
//  3. teto estimado de chamadas à Groq (soma de `ai_calls_upper_bound`). Esse
//     teto depende de configuração real (retry estrutural x chaves distintas) e
//     NÃO tem valor padrão: nenhum limite da Groq é presumido.
//
// Os valores marcados como "provisório" vêm das decisões em aberto (D4) e são
// substituíveis por configuração.

export const SECONDS_PER_HOUR = 3_600;
export const SECONDS_PER_DAY = 86_400;

// ---------------------------------------------------------------- configuração

export interface AiEvaluationRetryConfig {
  // Tentativas por entrevista (claims). Provisório: 4.
  maxAttempts: number;
  // Backoff exponencial: base * 2^(tentativa-1), com teto. Provisório: 60 s / 600 s.
  backoffBaseSeconds: number;
  backoffCapSeconds: number;
  // Fração de variação aleatória (0 a 0,5). Provisório: 0,2.
  jitterRatio: number;
  // Idade máxima de EXECUÇÃO (desde o primeiro claim). Provisório: 24 h.
  maxAgeSeconds: number;
  // Pior caso do Python depois que o Nest desiste (AI_TIMEOUT). SEM valor padrão:
  // ausente, só vale o backoff. Definido a partir da medição real (D6) e do D3.
  pythonWorstCaseSeconds?: number;
}

export interface AiEvaluationBrakeConfig {
  // Falhas transitórias consecutivas que abrem o freio. Provisório: 3.
  failureThreshold: number;
  // Pausa depois da última falha que abriu o freio. Provisório: 300 s.
  pauseSeconds: number;
}

// Tudo opcional e SEM padrão: limite ausente = sem limite daquela medida.
export interface AiEvaluationBudgetConfig {
  // Concorrência entre todas as instâncias. Aprovado: 1.
  maxConcurrent: number;
  // 1) avaliações INICIADAS (claims).
  maxStartsPerHour?: number;
  maxStartsPerDay?: number;
  // 2) chamadas à IA autorizadas.
  maxAiRequestsPerHour?: number;
  maxAiRequestsPerDay?: number;
  // 3) teto estimado de chamadas à Groq (soma dos tetos por tentativa). Exige
  //    `groqCallsUpperBoundPerAiRequest`, que também é configuração explícita.
  maxGroqCallsUpperBoundPerHour?: number;
  maxGroqCallsUpperBoundPerDay?: number;
  // Máximo de chamadas à Groq que UMA chamada à IA pode gerar. Nunca presumido.
  groqCallsUpperBoundPerAiRequest?: number;
  // Quando um orçamento nega, em quantos segundos reavaliar (informativo).
  recheckSeconds: number;
}

export const DEFAULT_RETRY_CONFIG: Readonly<AiEvaluationRetryConfig> = {
  maxAttempts: 4,
  backoffBaseSeconds: 60,
  backoffCapSeconds: 600,
  jitterRatio: 0.2,
  maxAgeSeconds: SECONDS_PER_DAY,
};

export const DEFAULT_BRAKE_CONFIG: Readonly<AiEvaluationBrakeConfig> = {
  failureThreshold: 3,
  pauseSeconds: 300,
};

export const DEFAULT_BUDGET_CONFIG: Readonly<AiEvaluationBudgetConfig> = {
  maxConcurrent: 1,
  recheckSeconds: 60,
};

export class AiEvaluationPolicyConfigError extends Error {
  constructor(readonly field: string) {
    super(`Configuração inválida da política de avaliação por IA: ${field}.`);
    this.name = 'AiEvaluationPolicyConfigError';
  }
}

const MAX_INT = 2_147_483_647;

function requireInt(value: unknown, field: string, min: number, max = MAX_INT) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new AiEvaluationPolicyConfigError(field);
  }
}

function optionalInt(value: unknown, field: string, min = 1) {
  if (value !== undefined) requireInt(value, field, min);
}

export function resolveRetryConfig(
  overrides: Partial<AiEvaluationRetryConfig> = {},
): AiEvaluationRetryConfig {
  const config = { ...DEFAULT_RETRY_CONFIG, ...overrides };
  requireInt(config.maxAttempts, 'maxAttempts', 1, 32_767);
  requireInt(config.backoffBaseSeconds, 'backoffBaseSeconds', 1);
  requireInt(config.backoffCapSeconds, 'backoffCapSeconds', 1);
  if (config.backoffCapSeconds < config.backoffBaseSeconds) {
    throw new AiEvaluationPolicyConfigError('backoffCapSeconds');
  }
  if (
    typeof config.jitterRatio !== 'number' ||
    !Number.isFinite(config.jitterRatio) ||
    config.jitterRatio < 0 ||
    config.jitterRatio > 0.5
  ) {
    throw new AiEvaluationPolicyConfigError('jitterRatio');
  }
  requireInt(config.maxAgeSeconds, 'maxAgeSeconds', 1);
  optionalInt(config.pythonWorstCaseSeconds, 'pythonWorstCaseSeconds');
  return config;
}

export function resolveBrakeConfig(
  overrides: Partial<AiEvaluationBrakeConfig> = {},
): AiEvaluationBrakeConfig {
  const config = { ...DEFAULT_BRAKE_CONFIG, ...overrides };
  requireInt(config.failureThreshold, 'failureThreshold', 1, 1_000);
  requireInt(config.pauseSeconds, 'pauseSeconds', 1);
  return config;
}

export function resolveBudgetConfig(
  overrides: Partial<AiEvaluationBudgetConfig> = {},
): AiEvaluationBudgetConfig {
  const config = { ...DEFAULT_BUDGET_CONFIG, ...overrides };
  requireInt(config.maxConcurrent, 'maxConcurrent', 1, 1_000);
  requireInt(config.recheckSeconds, 'recheckSeconds', 1);
  for (const field of [
    'maxStartsPerHour',
    'maxStartsPerDay',
    'maxAiRequestsPerHour',
    'maxAiRequestsPerDay',
    'maxGroqCallsUpperBoundPerHour',
    'maxGroqCallsUpperBoundPerDay',
  ] as const) {
    optionalInt(config[field], field);
  }
  optionalInt(
    config.groqCallsUpperBoundPerAiRequest,
    'groqCallsUpperBoundPerAiRequest',
  );
  const hasGroqCap =
    config.maxGroqCallsUpperBoundPerHour !== undefined ||
    config.maxGroqCallsUpperBoundPerDay !== undefined;
  // Um teto de chamadas à Groq só faz sentido com o teto POR chamada à IA
  // configurado: a política nunca o presume (nem a partir do número de chaves).
  if (hasGroqCap && config.groqCallsUpperBoundPerAiRequest === undefined) {
    throw new AiEvaluationPolicyConfigError('groqCallsUpperBoundPerAiRequest');
  }
  return config;
}

// ---------------------------------------------------------------- backoff

// Segundos até a próxima tentativa depois da falha da tentativa `attemptNumber`
// (1 = primeira). Exponencial com teto e variação aleatória (jitter) que nunca
// ultrapassa o teto. `random` devolve [0, 1) e é injetado (determinístico em teste).
export function computeBackoffSeconds(
  attemptNumber: number,
  config: AiEvaluationRetryConfig,
  random: () => number,
): number {
  requireInt(attemptNumber, 'attemptNumber', 1, 32_767);
  const exponential = config.backoffBaseSeconds * 2 ** (attemptNumber - 1);
  const capped = Math.min(exponential, config.backoffCapSeconds);
  const factor = 1 + config.jitterRatio * (2 * random() - 1);
  const jittered = Math.min(capped * factor, config.backoffCapSeconds);
  return Math.max(1, Math.round(jittered));
}

// ---------------------------------------------------------------- limites

// Mesma semântica do SQL do repositório: tentativas esgotadas têm precedência;
// a idade conta desde o PRIMEIRO claim e entrevista nunca reivindicada não expira.
export function exhaustionReason(
  state: { attempts: number; firstClaimedAt: Date | null },
  now: Date,
  config: Pick<AiEvaluationRetryConfig, 'maxAttempts' | 'maxAgeSeconds'>,
): Extract<AiTerminalReason, 'MAX_ATTEMPTS' | 'EXPIRED'> | null {
  if (state.attempts >= config.maxAttempts) return 'MAX_ATTEMPTS';
  if (
    state.firstClaimedAt !== null &&
    now.getTime() - state.firstClaimedAt.getTime() >=
      config.maxAgeSeconds * 1_000
  ) {
    return 'EXPIRED';
  }
  return null;
}

// ---------------------------------------------------------------- classificação

export type AiWorkerAction =
  // Concluída (avaliação gravada, já gravada ou nada a fazer): encerra a tentativa.
  | { kind: 'done'; outcome: AiDoneOutcome; aiDurationMs?: number }
  // Falha repetível: solta o claim e agenda a próxima tentativa (backoff persistido).
  | {
      kind: 'retry';
      errorCode: string;
      retryAfterSeconds: number;
      aiDurationMs?: number;
    }
  // Falha terminal: nenhuma nova chamada à IA para esta entrevista.
  | {
      kind: 'terminal';
      reason: Extract<AiTerminalReason, 'MAX_ATTEMPTS' | 'NON_RETRYABLE'>;
      errorCode: string;
      aiDurationMs?: number;
    };

function withDuration<T extends object>(base: T, aiDurationMs?: number): T {
  return aiDurationMs === undefined ? base : { ...base, aiDurationMs };
}

// Traduz o resultado do pipeline na ação que o worker deve gravar. `attemptNumber`
// é o número do claim que acabou de rodar (já contado em `ai_attempts`).
export function classifyPipelineResult(
  result: AiEvaluationPipelineResult,
  context: {
    attemptNumber: number;
    retry: AiEvaluationRetryConfig;
    random: () => number;
  },
): AiWorkerAction {
  const { attemptNumber, retry, random } = context;
  switch (result.status) {
    case 'persisted':
      return withDuration(
        { kind: 'done', outcome: 'PERSISTED' },
        result.aiDurationMs,
      );
    case 'already_persisted':
      return withDuration(
        { kind: 'done', outcome: 'ALREADY_PERSISTED' },
        result.aiDurationMs,
      );
    case 'nothing_to_do':
      return withDuration(
        { kind: 'done', outcome: 'NOTHING_TO_DO' },
        result.aiDurationMs,
      );
    case 'skipped':
      // Não deveria ocorrer (o claim já exclui duplicidade; o worker não chama o
      // pipeline para um id que ele mesmo já processa). Se ocorrer, a tentativa já
      // foi consumida pelo claim: espera FIXA e curta (a base do backoff), sem
      // escalonar com o número da tentativa, para não punir nem repetir de forma
      // agressiva. Não conta para o freio (neutro).
      return {
        kind: 'retry',
        errorCode: result.reason,
        retryAfterSeconds: Math.max(1, Math.ceil(retry.backoffBaseSeconds)),
      };
    case 'failed': {
      if (!result.retryable) {
        return withDuration(
          { kind: 'terminal', reason: 'NON_RETRYABLE', errorCode: result.code },
          result.aiDurationMs,
        );
      }
      // Repetível, mas sem tentativas restantes: terminal, sem nova chamada.
      if (attemptNumber >= retry.maxAttempts) {
        return withDuration(
          { kind: 'terminal', reason: 'MAX_ATTEMPTS', errorCode: result.code },
          result.aiDurationMs,
        );
      }
      let retryAfterSeconds = computeBackoffSeconds(
        attemptNumber,
        retry,
        random,
      );
      // O Nest desistiu, mas o Python pode continuar chamando a Groq: não há nova
      // tentativa antes do pior caso do Python (só se configurado).
      if (
        result.code === 'AI_TIMEOUT' &&
        retry.pythonWorstCaseSeconds !== undefined
      ) {
        retryAfterSeconds = Math.max(
          retryAfterSeconds,
          retry.pythonWorstCaseSeconds,
        );
      }
      return withDuration(
        { kind: 'retry', errorCode: result.code, retryAfterSeconds },
        result.aiDurationMs,
      );
    }
  }
}

// ---------------------------------------------------------------- orçamentos

export type BudgetDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason:
        | 'CONCURRENCY'
        | 'STARTS_PER_HOUR'
        | 'STARTS_PER_DAY'
        | 'AI_REQUESTS_PER_HOUR'
        | 'AI_REQUESTS_PER_DAY'
        | 'GROQ_CALLS_UPPER_BOUND_PER_HOUR'
        | 'GROQ_CALLS_UPPER_BOUND_PER_DAY';
      retryAfterSeconds: number;
    };

export interface StartCounters {
  activeLeases: number;
  startsLastHour: number;
  startsLastDay: number;
}

export interface AiRequestCounters {
  aiRequestsLastHour: number;
  aiRequestsLastDay: number;
  groqCallsUpperBoundLastHour: number;
  groqCallsUpperBoundLastDay: number;
}

// ANTES de reivindicar: limita avaliações INICIADAS e a concorrência. Não olha
// chamadas à IA nem à Groq (um claim pode terminar sem chamar nada).
export function checkStartBudget(
  counters: StartCounters,
  budget: AiEvaluationBudgetConfig,
): BudgetDecision {
  const deny = (
    reason: Extract<BudgetDecision, { allowed: false }>['reason'],
  ) =>
    ({
      allowed: false,
      reason,
      retryAfterSeconds: budget.recheckSeconds,
    }) as const;
  if (counters.activeLeases >= budget.maxConcurrent) return deny('CONCURRENCY');
  if (
    budget.maxStartsPerHour !== undefined &&
    counters.startsLastHour >= budget.maxStartsPerHour
  ) {
    return deny('STARTS_PER_HOUR');
  }
  if (
    budget.maxStartsPerDay !== undefined &&
    counters.startsLastDay >= budget.maxStartsPerDay
  ) {
    return deny('STARTS_PER_DAY');
  }
  return { allowed: true };
}

// ANTES de chamar a IA (junto de `markAiRequested`): limita chamadas à IA e o
// TETO ESTIMADO de chamadas à Groq. O teto projetado soma o teto desta chamada
// (`groqCallsUpperBoundPerAiRequest`) ao já gasto: nunca se presume um valor.
export function checkAiRequestBudget(
  counters: AiRequestCounters,
  budget: AiEvaluationBudgetConfig,
): BudgetDecision & { callsUpperBound: number | null } {
  const callsUpperBound = budget.groqCallsUpperBoundPerAiRequest ?? null;
  const deny = (
    reason: Extract<BudgetDecision, { allowed: false }>['reason'],
  ) =>
    ({
      allowed: false,
      reason,
      retryAfterSeconds: budget.recheckSeconds,
      callsUpperBound,
    }) as const;
  if (
    budget.maxAiRequestsPerHour !== undefined &&
    counters.aiRequestsLastHour >= budget.maxAiRequestsPerHour
  ) {
    return deny('AI_REQUESTS_PER_HOUR');
  }
  if (
    budget.maxAiRequestsPerDay !== undefined &&
    counters.aiRequestsLastDay >= budget.maxAiRequestsPerDay
  ) {
    return deny('AI_REQUESTS_PER_DAY');
  }
  if (callsUpperBound !== null) {
    if (
      budget.maxGroqCallsUpperBoundPerHour !== undefined &&
      counters.groqCallsUpperBoundLastHour + callsUpperBound >
        budget.maxGroqCallsUpperBoundPerHour
    ) {
      return deny('GROQ_CALLS_UPPER_BOUND_PER_HOUR');
    }
    if (
      budget.maxGroqCallsUpperBoundPerDay !== undefined &&
      counters.groqCallsUpperBoundLastDay + callsUpperBound >
        budget.maxGroqCallsUpperBoundPerDay
    ) {
      return deny('GROQ_CALLS_UPPER_BOUND_PER_DAY');
    }
  }
  return { allowed: true, callsUpperBound };
}

// ---------------------------------------------------------------- freio global

export interface BrakeEvent {
  at: Date;
  // 'transient_failure' conta; 'success' zera a sequência; 'neutral' é ignorado
  // (falha de dados, não do provedor: não deve travar as demais entrevistas).
  kind: 'success' | 'transient_failure' | 'neutral';
}

// Classifica a ação gravada pelo worker como evento do freio.
export function toBrakeEvent(action: AiWorkerAction, at: Date): BrakeEvent {
  switch (action.kind) {
    case 'done':
      return { at, kind: 'success' };
    case 'retry':
      return {
        at,
        kind:
          action.errorCode === 'IN_FLIGHT' ? 'neutral' : 'transient_failure',
      };
    case 'terminal':
      return {
        at,
        kind:
          action.reason === 'MAX_ATTEMPTS' ? 'transient_failure' : 'neutral',
      };
  }
}

export interface BrakeState {
  open: boolean;
  consecutiveFailures: number;
  // Instante em que o freio fecha sozinho (só quando aberto).
  reopenAt?: Date;
}

// Abre quando as `failureThreshold` ocorrências relevantes MAIS RECENTES são todas
// falhas transitórias; fecha `pauseSeconds` depois da última falha, ou ao primeiro
// sucesso. Independe da ordem de entrada dos eventos.
export function evaluateBrake(
  events: readonly BrakeEvent[],
  now: Date,
  config: AiEvaluationBrakeConfig,
): BrakeState {
  const relevant = events
    .filter((event) => event.kind !== 'neutral')
    .sort((a, b) => b.at.getTime() - a.at.getTime());
  let consecutiveFailures = 0;
  for (const event of relevant) {
    if (event.kind !== 'transient_failure') break;
    consecutiveFailures += 1;
  }
  if (consecutiveFailures < config.failureThreshold) {
    return { open: false, consecutiveFailures };
  }
  const reopenAt = new Date(
    relevant[0].at.getTime() + config.pauseSeconds * 1_000,
  );
  return reopenAt.getTime() > now.getTime()
    ? { open: true, consecutiveFailures, reopenAt }
    : { open: false, consecutiveFailures };
}
