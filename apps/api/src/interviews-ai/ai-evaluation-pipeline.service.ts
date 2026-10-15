import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import {
  AI_EVALUATION_INPUT_SELECT,
  AiEvaluationInputError,
  buildAiEvaluationInput,
  type AiEvaluationInput,
} from './ai-evaluation-input.builder';
import { normalizeAiEvaluation } from './ai-evaluation.normalizer';
import {
  AiEvaluationContractError,
  type NormalizedAiEvaluation,
} from './ai-evaluation.types';
import { AiEvaluationPersistenceError } from './ai-evaluation-persistence.types';
import {
  AiEvaluationPersistenceService,
  STORED_EVALUATION_SELECT,
  isStoredEvaluationConsistent,
} from './ai-evaluation-persistence.service';
import { InterviewsAiService } from './interviews-ai.service';

// Pipeline de UMA entrevista (R3.3a-3): carrega -> classifica -> monta o payload
// -> chama o Python -> normaliza -> persiste. Reutiliza, sem duplicar:
// - buildAiEvaluationInput (R3.3a-1): validação e montagem do payload;
// - InterviewsAiService.evaluate (R3.3a-2): chamada ao Python com o timeout
//   próprio da avaliação (rotação de chaves, retry estrutural e cálculo da nota
//   continuam SOMENTE no serviço Python);
// - normalizeAiEvaluation (R2): contrato da resposta (DEC-005: sete critérios,
//   escala 0-10, média conferida, nunca recalculada);
// - AiEvaluationPersistenceService (R3.2): gravação transacional.
//
// NÃO é worker, agendador nem rota: só é chamado por quem decidir quando
// executar (R3.3a-4). Nunca lança por falha esperada: devolve um resultado
// tipado, com `retryable`, para o chamador decidir tentativas e espera.
//
// GARANTIAS (e limites) de execução duplicada — ver docs/back-end/pipeline-avaliacao-ia.md:
// - Dentro do MESMO processo, uma entrevista nunca é processada por duas
//   chamadas ao mesmo tempo (`inFlight`); a segunda devolve `skipped`.
// - Entre processos/instâncias NÃO há exclusão antes da chamada à IA: dois
//   processos podem chamar a Groq para a mesma entrevista. O que a R3.2
//   garante é que, no máximo, UMA avaliação é gravada (UPDATE condicional) e
//   que a outra recebe `already_persisted` ou `nothing_to_do`.

// Leitura única: o que o builder precisa + o estado persistido da avaliação
// (a mesma projeção que a persistência usa para classificar uma avaliação).
export const AI_EVALUATION_PIPELINE_SELECT = {
  ...AI_EVALUATION_INPUT_SELECT,
  evaluation: STORED_EVALUATION_SELECT,
} satisfies Prisma.interviewSelect;

type PipelineRow = Prisma.interviewGetPayload<{
  select: typeof AI_EVALUATION_PIPELINE_SELECT;
}>;

export type AiEvaluationPipelineStage =
  | 'validate'
  | 'load'
  | 'classify'
  | 'build'
  | 'evaluate'
  | 'normalize'
  | 'persist';

export type AiEvaluationPipelineFailureCode =
  | 'INVALID_INTERVIEW_ID'
  | 'INTERVIEW_NOT_FOUND'
  | 'WRONG_EVALUATION_MODE'
  | 'INVALID_INTERVIEW_STATE'
  | 'INCONSISTENT_STATE'
  | 'INVALID_INPUT'
  | 'LOAD_FAILED'
  | 'AI_REJECTED_PAYLOAD'
  | 'AI_TIMEOUT'
  | 'AI_UNAVAILABLE'
  | 'AI_UPSTREAM_ERROR'
  | 'AI_REQUEST_FAILED'
  | 'AI_INVALID_RESPONSE'
  | 'PERSISTENCE_FAILED'
  | 'PERSISTENCE_REJECTED'
  | 'UNEXPECTED';

// `retryable`: repetir PODE resolver (falha transitória ou resposta da IA fora
// do contrato). Quantas vezes e com que espera é decisão do chamador (R3.3a-4):
// o pipeline nunca repete sozinho.
const RETRYABLE: Record<AiEvaluationPipelineFailureCode, boolean> = {
  INVALID_INTERVIEW_ID: false,
  INTERVIEW_NOT_FOUND: false,
  WRONG_EVALUATION_MODE: false,
  INVALID_INTERVIEW_STATE: false,
  INCONSISTENT_STATE: false,
  INVALID_INPUT: false,
  LOAD_FAILED: true,
  AI_REJECTED_PAYLOAD: false,
  AI_TIMEOUT: true,
  AI_UNAVAILABLE: true,
  AI_UPSTREAM_ERROR: true,
  AI_REQUEST_FAILED: false,
  AI_INVALID_RESPONSE: true,
  PERSISTENCE_FAILED: true,
  PERSISTENCE_REJECTED: false,
  UNEXPECTED: false,
};

export type AiEvaluationPipelineResult =
  | {
      status: 'persisted' | 'already_persisted';
      interviewId: string;
      evaluationId: string;
      aiDurationMs: number;
    }
  | {
      // Nada a fazer: não houve (nem haverá) chamada à IA.
      status: 'nothing_to_do';
      interviewId: string;
      reason: 'ALREADY_COMPLETED' | 'COMPLETED_WITH_STORED_RESULT';
      evaluationId?: string;
      aiDurationMs?: number;
    }
  | {
      // Outra chamada DESTE processo já processa a entrevista. Isto NÃO protege
      // contra outros processos/instâncias (ver docs/back-end/pipeline-avaliacao-ia.md).
      status: 'skipped';
      interviewId: string;
      reason: 'IN_FLIGHT';
    }
  | {
      status: 'failed';
      interviewId: string;
      stage: AiEvaluationPipelineStage;
      code: AiEvaluationPipelineFailureCode;
      retryable: boolean;
      // Só códigos/caminhos técnicos fixos (ex.: "MISSING_ANSWER@questions[2].answer").
      // Nunca texto do candidato, da vaga ou da avaliação.
      detail?: string;
      aiDurationMs?: number;
    };

type Failure = Extract<AiEvaluationPipelineResult, { status: 'failed' }>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function failure(
  interviewId: string,
  stage: AiEvaluationPipelineStage,
  code: AiEvaluationPipelineFailureCode,
  detail?: string,
  aiDurationMs?: number,
): Failure {
  return {
    status: 'failed',
    interviewId,
    stage,
    code,
    retryable: RETRYABLE[code],
    ...(detail === undefined ? {} : { detail }),
    ...(aiDurationMs === undefined ? {} : { aiDurationMs }),
  };
}

function fromInputError(
  interviewId: string,
  error: AiEvaluationInputError,
): Failure {
  const detail = `${error.code}@${error.path}`;
  if (error.code === 'WRONG_EVALUATION_MODE') {
    return failure(interviewId, 'build', 'WRONG_EVALUATION_MODE', detail);
  }
  if (error.code === 'INVALID_INTERVIEW_STATE') {
    return failure(interviewId, 'build', 'INVALID_INTERVIEW_STATE', detail);
  }
  if (error.code === 'EVALUATION_ALREADY_EXISTS') {
    return failure(interviewId, 'build', 'INCONSISTENT_STATE', detail);
  }
  return failure(interviewId, 'build', 'INVALID_INPUT', detail);
}

// Erros de InterviewsAiService.evaluate (HttpException do Nest).
function fromAiError(
  interviewId: string,
  error: unknown,
  aiDurationMs: number,
): Failure {
  if (!(error instanceof HttpException)) {
    return failure(
      interviewId,
      'evaluate',
      'AI_REQUEST_FAILED',
      'non-http',
      aiDurationMs,
    );
  }
  const status = error.getStatus();
  const detail = `http-${status}`;
  let code: AiEvaluationPipelineFailureCode;
  if (status === 400 || status === 422) code = 'AI_REJECTED_PAYLOAD';
  else if (status === 504) code = 'AI_TIMEOUT';
  else if (status === 503) code = 'AI_UNAVAILABLE';
  else if (status === 502) code = 'AI_UPSTREAM_ERROR';
  else code = 'AI_REQUEST_FAILED';
  return failure(interviewId, 'evaluate', code, detail, aiDurationMs);
}

function fromPersistenceError(
  interviewId: string,
  error: AiEvaluationPersistenceError,
  aiDurationMs: number,
): Failure {
  const detail = `${error.code}@${error.step}`;
  switch (error.code) {
    case 'INCONSISTENT_STATE':
      return failure(
        interviewId,
        'persist',
        'INCONSISTENT_STATE',
        detail,
        aiDurationMs,
      );
    case 'INTERVIEW_NOT_FOUND':
      return failure(
        interviewId,
        'persist',
        'INTERVIEW_NOT_FOUND',
        detail,
        aiDurationMs,
      );
    case 'WRONG_EVALUATION_MODE':
      return failure(
        interviewId,
        'persist',
        'WRONG_EVALUATION_MODE',
        detail,
        aiDurationMs,
      );
    case 'INVALID_INTERVIEW_STATE':
      return failure(
        interviewId,
        'persist',
        'INVALID_INTERVIEW_STATE',
        detail,
        aiDurationMs,
      );
    case 'PERSISTENCE_FAILED':
      return failure(
        interviewId,
        'persist',
        'PERSISTENCE_FAILED',
        detail,
        aiDurationMs,
      );
    // INVALID_INPUT (já passou pelo normalizador), QUESTIONS_MISMATCH: defeito de
    // dados ou de contrato; repetir não resolve.
    default:
      return failure(
        interviewId,
        'persist',
        'PERSISTENCE_REJECTED',
        detail,
        aiDurationMs,
      );
  }
}

@Injectable()
export class AiEvaluationPipelineService {
  private readonly logger = new Logger(AiEvaluationPipelineService.name);
  // Entrevistas em processamento NESTE processo (exclusão local, não distribuída).
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: InterviewsAiService,
    private readonly persistence: AiEvaluationPersistenceService,
  ) {}

  async process(interviewId: string): Promise<AiEvaluationPipelineResult> {
    if (typeof interviewId !== 'string' || !UUID_PATTERN.test(interviewId)) {
      return this.finish(
        failure(String(interviewId), 'validate', 'INVALID_INTERVIEW_ID'),
        Date.now(),
      );
    }
    const startedAt = Date.now();
    if (this.inFlight.has(interviewId)) {
      return this.finish(
        { status: 'skipped', interviewId, reason: 'IN_FLIGHT' },
        startedAt,
      );
    }

    this.inFlight.add(interviewId);
    try {
      return this.finish(await this.run(interviewId), startedAt);
    } catch (error) {
      // Defeito inesperado: registra só o nome da classe, nunca a mensagem.
      this.logger.error(
        `Pipeline de avaliação por IA: falha inesperada interviewId=${interviewId} error=${error instanceof Error ? error.name : 'unknown'}`,
      );
      return failure(interviewId, 'persist', 'UNEXPECTED');
    } finally {
      this.inFlight.delete(interviewId);
    }
  }

  private async run(interviewId: string): Promise<AiEvaluationPipelineResult> {
    // 1. Carrega (somente leitura).
    let row: PipelineRow | null;
    try {
      row = await this.prisma.interview.findUnique({
        where: { interview_id: interviewId },
        select: AI_EVALUATION_PIPELINE_SELECT,
      });
    } catch (error) {
      const prismaCode =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : 'UNKNOWN';
      return failure(
        interviewId,
        'load',
        'LOAD_FAILED',
        `prisma-${prismaCode}`,
      );
    }

    // 2. Classifica o estado ANTES de gastar uma chamada à IA.
    const classified = this.classify(interviewId, row);
    if (classified) return classified;
    if (!row) return failure(interviewId, 'classify', 'UNEXPECTED');

    // 3. Monta o payload (valida perguntas, respostas e contexto).
    let input: AiEvaluationInput;
    try {
      input = buildAiEvaluationInput(row);
    } catch (error) {
      if (error instanceof AiEvaluationInputError) {
        return fromInputError(interviewId, error);
      }
      throw error;
    }

    // 4. Chama o Python (UMA vez; sem retry, sem rotação de chaves aqui).
    const aiStartedAt = Date.now();
    let raw: unknown;
    try {
      raw = await this.ai.evaluate(input.payload);
    } catch (error) {
      return fromAiError(interviewId, error, Date.now() - aiStartedAt);
    }
    const aiDurationMs = Date.now() - aiStartedAt;

    // 5. Normaliza (contrato da R2; a média do Python é conferida, nunca refeita).
    let normalized: NormalizedAiEvaluation;
    try {
      normalized = normalizeAiEvaluation(raw, input.questionRefs);
    } catch (error) {
      if (error instanceof AiEvaluationContractError) {
        return failure(
          interviewId,
          'normalize',
          'AI_INVALID_RESPONSE',
          `${error.code}@${error.path}`,
          aiDurationMs,
        );
      }
      throw error;
    }

    // 6. Persiste (transação única; a reivindicação é o UPDATE condicional).
    try {
      const saved = await this.persistence.persist(interviewId, normalized);
      return {
        status: saved.status === 'created' ? 'persisted' : 'already_persisted',
        interviewId,
        evaluationId: saved.evaluationId,
        aiDurationMs,
      };
    } catch (error) {
      if (error instanceof AiEvaluationPersistenceError) {
        // Outro executor gravou um resultado DIFERENTE. O código do erro sozinho não
        // basta: só é "nada a fazer" se o resultado vencedor estiver, AGORA, íntegro
        // e vinculado a esta entrevista (releitura); do contrário é inconsistência.
        if (error.code === 'EVALUATION_CONFLICT') {
          return this.verifyStoredResult(interviewId, aiDurationMs);
        }
        return fromPersistenceError(interviewId, error, aiDurationMs);
      }
      throw error;
    }
  }

  // Após EVALUATION_CONFLICT: relê a entrevista e confirma que a avaliação
  // vencedora é a desta entrevista (leitura por interview_id), COMPLETED, de IA,
  // com as cinco avaliações por pergunta ligadas às perguntas reais e os sete
  // critérios válidos (a mesma verificação de consistência da persistência).
  private async verifyStoredResult(
    interviewId: string,
    aiDurationMs: number,
  ): Promise<AiEvaluationPipelineResult> {
    let row: PipelineRow | null;
    try {
      row = await this.prisma.interview.findUnique({
        where: { interview_id: interviewId },
        select: AI_EVALUATION_PIPELINE_SELECT,
      });
    } catch (error) {
      const prismaCode =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : 'UNKNOWN';
      return failure(
        interviewId,
        'persist',
        'LOAD_FAILED',
        `conflict-recheck-prisma-${prismaCode}`,
        aiDurationMs,
      );
    }
    if (!row) {
      return failure(
        interviewId,
        'persist',
        'INTERVIEW_NOT_FOUND',
        'conflict-recheck',
        aiDurationMs,
      );
    }
    const evaluation = row.evaluation;
    if (
      row.interview_id !== interviewId ||
      row.evaluation_mode !== 'AI' ||
      row.status !== 'COMPLETED' ||
      !evaluation ||
      !isStoredEvaluationConsistent(row)
    ) {
      return failure(
        interviewId,
        'persist',
        'INCONSISTENT_STATE',
        'CONFLICT_WITHOUT_CONSISTENT_RESULT',
        aiDurationMs,
      );
    }
    return {
      status: 'nothing_to_do',
      interviewId,
      reason: 'COMPLETED_WITH_STORED_RESULT',
      evaluationId: evaluation.evaluation_id,
      aiDurationMs,
    };
  }

  // Devolve um resultado final quando NÃO há trabalho a fazer ou o estado é
  // inválido; `null` quando a entrevista deve ser processada.
  private classify(
    interviewId: string,
    row: PipelineRow | null,
  ): AiEvaluationPipelineResult | null {
    if (!row) return failure(interviewId, 'classify', 'INTERVIEW_NOT_FOUND');
    if (row.evaluation_mode !== 'AI') {
      return failure(
        interviewId,
        'classify',
        'WRONG_EVALUATION_MODE',
        `mode-${String(row.evaluation_mode)}`,
      );
    }

    if (row.status === 'PENDING_AI_EVALUATION') {
      // Pendente não pode ter avaliação gravada (a persistência as grava juntas).
      return row.evaluation
        ? failure(
            interviewId,
            'classify',
            'INCONSISTENT_STATE',
            'PENDING_WITH_EVALUATION',
          )
        : null;
    }

    if (row.status === 'COMPLETED') {
      if (row.evaluation && isStoredEvaluationConsistent(row)) {
        return {
          status: 'nothing_to_do',
          interviewId,
          reason: 'ALREADY_COMPLETED',
          evaluationId: row.evaluation.evaluation_id,
        };
      }
      return failure(
        interviewId,
        'classify',
        'INCONSISTENT_STATE',
        row.evaluation
          ? 'COMPLETED_WITH_INCOMPLETE_EVALUATION'
          : 'COMPLETED_WITHOUT_EVALUATION',
      );
    }

    // IN_PROGRESS, PENDING_ASSIGNMENT, ASSIGNED, CANCELLED (ou status novo):
    // não é entrevista de IA aguardando avaliação.
    return failure(
      interviewId,
      'classify',
      'INVALID_INTERVIEW_STATE',
      `status-${row.status}`,
    );
  }

  // Log único por execução: só ids, etapa, código e duração (nunca texto).
  private finish(
    result: AiEvaluationPipelineResult,
    startedAt: number,
  ): AiEvaluationPipelineResult {
    const durationMs = Date.now() - startedAt;
    const base = `Pipeline de avaliação por IA: interviewId=${result.interviewId} outcome=${result.status} durationMs=${durationMs}`;
    if (result.status === 'failed') {
      const line = `${base} stage=${result.stage} code=${result.code} retryable=${result.retryable}${result.detail ? ` detail=${result.detail}` : ''}${result.aiDurationMs === undefined ? '' : ` aiMs=${result.aiDurationMs}`}`;
      if (result.retryable) this.logger.warn(line);
      else this.logger.error(line);
    } else if (result.status === 'skipped') {
      this.logger.warn(`${base} reason=${result.reason}`);
    } else {
      const aiMs =
        'aiDurationMs' in result && result.aiDurationMs !== undefined
          ? ` aiMs=${result.aiDurationMs}`
          : '';
      this.logger.log(`${base}${aiMs}`);
    }
    return result;
  }
}
