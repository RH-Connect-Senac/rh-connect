import {
  AiEvaluationPolicyConfigError,
  resolveBrakeConfig,
  resolveBudgetConfig,
  resolveRetryConfig,
  type AiEvaluationBrakeConfig,
  type AiEvaluationBudgetConfig,
  type AiEvaluationRetryConfig,
} from './ai-evaluation-worker-policy';

// Configuração do executor da avaliação por IA (R3.3a-4c). Função pura: recebe as
// variáveis de ambiente e devolve o estado do executor. Desabilitado por padrão;
// habilitado só com TODOS os limites obrigatórios definidos de forma explícita e
// válida. Nenhum limite de volume ou de Groq tem valor padrão. Os erros listam
// apenas NOMES de variáveis, nunca valores.

export const WORKER_ENV = {
  enabled: 'AI_EVALUATION_WORKER_ENABLED',
  leaseSeconds: 'AI_EVALUATION_LEASE_SECONDS',
  pollIntervalSeconds: 'AI_EVALUATION_POLL_INTERVAL_SECONDS',
  pythonWorstCaseSeconds: 'AI_EVALUATION_PYTHON_WORST_CASE_SECONDS',
  maxStartsPerHour: 'AI_EVALUATION_MAX_STARTS_PER_HOUR',
  maxStartsPerDay: 'AI_EVALUATION_MAX_STARTS_PER_DAY',
  maxAiRequestsPerHour: 'AI_EVALUATION_MAX_AI_REQUESTS_PER_HOUR',
  maxAiRequestsPerDay: 'AI_EVALUATION_MAX_AI_REQUESTS_PER_DAY',
  groqCallsUpperBoundPerAiRequest:
    'AI_EVALUATION_GROQ_CALLS_UPPER_BOUND_PER_AI_REQUEST',
  maxGroqCallsUpperBoundPerHour:
    'AI_EVALUATION_MAX_GROQ_CALLS_UPPER_BOUND_PER_HOUR',
  maxGroqCallsUpperBoundPerDay:
    'AI_EVALUATION_MAX_GROQ_CALLS_UPPER_BOUND_PER_DAY',
  // Opcionais (têm padrão provisório da política D4 ou do próprio worker).
  maxAttempts: 'AI_EVALUATION_MAX_ATTEMPTS',
  backoffBaseSeconds: 'AI_EVALUATION_BACKOFF_BASE_SECONDS',
  backoffCapSeconds: 'AI_EVALUATION_BACKOFF_CAP_SECONDS',
  maxAgeSeconds: 'AI_EVALUATION_MAX_AGE_SECONDS',
  shutdownGraceSeconds: 'AI_EVALUATION_SHUTDOWN_GRACE_SECONDS',
} as const;

const MANDATORY: ReadonlyArray<keyof typeof WORKER_ENV> = [
  'leaseSeconds',
  'pollIntervalSeconds',
  'pythonWorstCaseSeconds',
  'maxStartsPerHour',
  'maxStartsPerDay',
  'maxAiRequestsPerHour',
  'maxAiRequestsPerDay',
  'groqCallsUpperBoundPerAiRequest',
  'maxGroqCallsUpperBoundPerHour',
  'maxGroqCallsUpperBoundPerDay',
];

// Provisório (carga do shutdown); não é limite de volume nem de Groq.
export const DEFAULT_SHUTDOWN_GRACE_SECONDS = 30;

export interface AiEvaluationWorkerConfig {
  leaseSeconds: number;
  heartbeatSeconds: number;
  pollIntervalSeconds: number;
  shutdownGraceSeconds: number;
  retry: AiEvaluationRetryConfig;
  brake: AiEvaluationBrakeConfig;
  budget: AiEvaluationBudgetConfig;
}

export type AiEvaluationWorkerSetup =
  | { state: 'disabled' }
  // `fields`: nomes das variáveis inválidas ou ausentes (nunca valores).
  | { state: 'invalid'; fields: string[] }
  | { state: 'enabled'; config: AiEvaluationWorkerConfig };

type Env = Readonly<Record<string, string | undefined>>;

const INTEGER = /^[0-9]{1,10}$/;

function readInt(
  env: Env,
  key: keyof typeof WORKER_ENV,
  invalid: Set<string>,
): number | undefined {
  const name = WORKER_ENV[key];
  const raw = env[name]?.trim();
  if (raw === undefined || raw === '') return undefined;
  // Todos os valores são inteiros positivos (zero nunca é válido).
  if (!INTEGER.test(raw) || Number(raw) < 1) {
    invalid.add(name);
    return undefined;
  }
  return Number(raw);
}

export function resolveWorkerSetup(env: Env): AiEvaluationWorkerSetup {
  const rawEnabled = env[WORKER_ENV.enabled]?.trim().toLowerCase();
  if (rawEnabled === undefined || rawEnabled === '' || rawEnabled === 'false') {
    return { state: 'disabled' };
  }
  // Qualquer valor diferente de "true" (ex.: "yes", "1") é recusado: o executor
  // fica parado em vez de adivinhar a intenção.
  if (rawEnabled !== 'true') {
    return { state: 'invalid', fields: [WORKER_ENV.enabled] };
  }

  const invalid = new Set<string>();
  const values = {} as Record<keyof typeof WORKER_ENV, number | undefined>;
  for (const key of Object.keys(WORKER_ENV) as Array<keyof typeof WORKER_ENV>) {
    if (key === 'enabled') continue;
    values[key] = readInt(env, key, invalid);
  }
  for (const key of MANDATORY) {
    if (values[key] === undefined) invalid.add(WORKER_ENV[key]);
  }
  if (invalid.size > 0) return { state: 'invalid', fields: [...invalid] };

  const leaseSeconds = values.leaseSeconds as number;
  // O lease precisa cobrir ao menos o pior caso do Python, senão outra instância
  // poderia reivindicar a entrevista enquanto a chamada ainda está em curso.
  if (
    leaseSeconds < 3 ||
    leaseSeconds <= (values.pythonWorstCaseSeconds as number)
  ) {
    return { state: 'invalid', fields: [WORKER_ENV.leaseSeconds] };
  }

  try {
    const retry = resolveRetryConfig({
      pythonWorstCaseSeconds: values.pythonWorstCaseSeconds,
      ...(values.maxAttempts === undefined
        ? {}
        : { maxAttempts: values.maxAttempts }),
      ...(values.backoffBaseSeconds === undefined
        ? {}
        : { backoffBaseSeconds: values.backoffBaseSeconds }),
      ...(values.backoffCapSeconds === undefined
        ? {}
        : { backoffCapSeconds: values.backoffCapSeconds }),
      ...(values.maxAgeSeconds === undefined
        ? {}
        : { maxAgeSeconds: values.maxAgeSeconds }),
    });
    const brake = resolveBrakeConfig();
    // Concorrência inicial aprovada: 1 (não configurável nesta etapa).
    const budget = resolveBudgetConfig({
      maxConcurrent: 1,
      maxStartsPerHour: values.maxStartsPerHour,
      maxStartsPerDay: values.maxStartsPerDay,
      maxAiRequestsPerHour: values.maxAiRequestsPerHour,
      maxAiRequestsPerDay: values.maxAiRequestsPerDay,
      groqCallsUpperBoundPerAiRequest: values.groqCallsUpperBoundPerAiRequest,
      maxGroqCallsUpperBoundPerHour: values.maxGroqCallsUpperBoundPerHour,
      maxGroqCallsUpperBoundPerDay: values.maxGroqCallsUpperBoundPerDay,
    });
    const shutdownGraceSeconds =
      values.shutdownGraceSeconds ?? DEFAULT_SHUTDOWN_GRACE_SECONDS;
    if (shutdownGraceSeconds < 1 || shutdownGraceSeconds > 3_600) {
      return { state: 'invalid', fields: [WORKER_ENV.shutdownGraceSeconds] };
    }
    return {
      state: 'enabled',
      config: {
        leaseSeconds,
        heartbeatSeconds: Math.max(1, Math.floor(leaseSeconds / 3)),
        pollIntervalSeconds: values.pollIntervalSeconds as number,
        shutdownGraceSeconds,
        retry,
        brake,
        budget,
      },
    };
  } catch (error) {
    if (error instanceof AiEvaluationPolicyConfigError) {
      return { state: 'invalid', fields: [policyFieldToEnv(error.field)] };
    }
    throw error;
  }
}

// Mapeia o campo da política para o nome da variável (só nomes, nunca valores).
function policyFieldToEnv(field: string): string {
  const key = (Object.keys(WORKER_ENV) as Array<keyof typeof WORKER_ENV>).find(
    (candidate) => candidate === field,
  );
  return key ? WORKER_ENV[key] : `policy:${field}`;
}
