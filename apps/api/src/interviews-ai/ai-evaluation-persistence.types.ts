// Contrato público da persistência transacional da avaliação por IA (R3.2).
// Ver docs/back-end/persistencia-avaliacao-ia.md.

export type AiEvaluationPersistErrorCode =
  | 'INVALID_INPUT'
  | 'INTERVIEW_NOT_FOUND'
  | 'WRONG_EVALUATION_MODE'
  | 'INVALID_INTERVIEW_STATE'
  | 'QUESTIONS_MISMATCH'
  | 'INCONSISTENT_STATE'
  | 'EVALUATION_CONFLICT'
  | 'PERSISTENCE_FAILED';

// Etapa em que a falha ocorreu. Só rótulos fixos: nunca valores recebidos.
export type AiEvaluationPersistStep =
  | 'input'
  | 'claim'
  | 'questions'
  | 'evaluation'
  | 'question_evaluations'
  | 'classify';

export type AiEvaluationPersistOutcome = 'created' | 'already_persisted';

export interface AiEvaluationPersistResult {
  status: AiEvaluationPersistOutcome;
  interviewId: string;
  evaluationId: string;
}

// Erro tipado da persistência. A mensagem e o `path` descrevem só o CÓDIGO, a
// ETAPA e (em INVALID_INPUT) ONDE a entrada falhou. Nunca carregam valores
// recebidos nem mensagens/stacks do Prisma (que podem ecoar respostas do
// candidato ou textos do feedback), e não há `cause`: o erro original do banco
// é descartado de propósito.
export class AiEvaluationPersistenceError extends Error {
  constructor(
    readonly code: AiEvaluationPersistErrorCode,
    readonly step: AiEvaluationPersistStep,
    readonly path?: string,
  ) {
    super(
      path === undefined
        ? `Persistência da avaliação por IA falhou (${code}) na etapa ${step}.`
        : `Persistência da avaliação por IA falhou (${code}) na etapa ${step}, em ${path}.`,
    );
    this.name = 'AiEvaluationPersistenceError';
  }
}
