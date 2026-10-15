import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import {
  EVALUATION_CRITERIA,
  type CriterionKey,
} from '../evaluator-interviews/evaluation-criteria';
import { FLOW_LIMITS } from '../interviews/interview-flow';
import { PrismaService } from '../prisma/prisma.service';
import type {
  NormalizedAiEvaluation,
  NormalizedAiQuestionEvaluation,
} from './ai-evaluation.types';
import {
  AiEvaluationPersistenceError,
  type AiEvaluationPersistErrorCode,
  type AiEvaluationPersistResult,
  type AiEvaluationPersistStep,
} from './ai-evaluation-persistence.types';

// Limites explícitos da transação interativa (sem chamadas de rede dentro dela).
const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 15_000 } as const;

const MIN_SCORE = 0;
const MAX_SCORE = 10;
const SCORE_EPSILON = 1e-9;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CRITERION_KEY_LIST: CriterionKey[] = EVALUATION_CRITERIA.map(
  (criterion) => criterion.key,
);
const CRITERION_KEY_SET = new Set<string>(CRITERION_KEY_LIST);

// Leitura de classificação, feita em transação NOVA depois que a reivindicação
// da entrevista falhou. Só colunas necessárias para decidir e comparar.
const CLASSIFY_SELECT = {
  evaluation_mode: true,
  status: true,
  questions: { select: { question_id: true, position: true } },
  evaluation: {
    select: {
      evaluation_id: true,
      status: true,
      criteria_scores: true,
      overall_score: true,
      summary: true,
      strengths: true,
      improvements: true,
      recommendations: true,
      question_evaluations: {
        select: {
          question_id: true,
          score: true,
          reason: true,
          positives: true,
          improvements: true,
          suggestion: true,
        },
      },
    },
  },
} satisfies Prisma.interviewSelect;

type ClassifyRow = Prisma.interviewGetPayload<{
  select: typeof CLASSIFY_SELECT;
}>;

// Conteúdo comparável (recebido x persistido), na mesma forma dos dois lados.
interface ComparableQuestion {
  questionId: string;
  position: number;
  score: number;
  reason: string;
  positives: string[];
  improvements: string[];
  suggestion: string;
}

interface ComparableContent {
  criteria: number[];
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  questions: ComparableQuestion[];
}

type TransactionOutcome =
  { kind: 'created'; evaluationId: string } | { kind: 'claim_lost' };

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !isUnknownArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

// Mesma regra do normalizador da R2: no máximo 1 casa decimal. Rejeitamos em vez
// de deixar o Decimal(3,1) arredondar em silêncio (7.25 viraria 7.3).
function hasAtMostOneDecimal(value: number): boolean {
  return Math.abs(value * 10 - Math.round(value * 10)) < SCORE_EPSILON;
}

function isValidScore(value: unknown): value is number {
  return (
    isFiniteNumber(value) &&
    value >= MIN_SCORE &&
    value <= MAX_SCORE &&
    hasAtMostOneDecimal(value)
  );
}

function isNonBlankStringList(value: unknown): value is string[] {
  return (
    isUnknownArray(value) &&
    value.every((item) => typeof item === 'string' && item.trim() !== '')
  );
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function sameScore(a: number, b: number): boolean {
  return Math.abs(a - b) < SCORE_EPSILON;
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function sameQuestion(a: ComparableQuestion, b: ComparableQuestion): boolean {
  return (
    a.questionId === b.questionId &&
    a.position === b.position &&
    sameScore(a.score, b.score) &&
    a.reason === b.reason &&
    a.suggestion === b.suggestion &&
    sameList(a.positives, b.positives) &&
    sameList(a.improvements, b.improvements)
  );
}

function sameContent(a: ComparableContent, b: ComparableContent): boolean {
  return (
    a.criteria.length === b.criteria.length &&
    a.criteria.every((score, index) => sameScore(score, b.criteria[index])) &&
    sameScore(a.overallScore, b.overallScore) &&
    a.summary === b.summary &&
    sameList(a.strengths, b.strengths) &&
    sameList(a.improvements, b.improvements) &&
    sameList(a.recommendations, b.recommendations) &&
    a.questions.length === b.questions.length &&
    a.questions.every((question, index) =>
      sameQuestion(question, b.questions[index]),
    )
  );
}

function invalidInput(path: string): AiEvaluationPersistenceError {
  return new AiEvaluationPersistenceError('INVALID_INPUT', 'input', path);
}

function fail(
  code: AiEvaluationPersistErrorCode,
  step: AiEvaluationPersistStep,
): AiEvaluationPersistenceError {
  return new AiEvaluationPersistenceError(code, step);
}

// Validação pura (sem banco) da entrada. Nunca corrige nem arredonda: o que não
// é válido é rejeitado com INVALID_INPUT e o `path` de onde falhou (sem valores).
function validateInput(interviewId: unknown, raw: unknown): void {
  if (!isUuid(interviewId)) throw invalidInput('interviewId');
  if (!isRecord(raw)) throw invalidInput('evaluation');

  const criteria = raw.criteriaScores;
  if (!isRecord(criteria)) throw invalidInput('criteriaScores');
  const keys = Object.keys(criteria);
  if (
    keys.length !== CRITERION_KEY_LIST.length ||
    !keys.every((key) => CRITERION_KEY_SET.has(key))
  ) {
    throw invalidInput('criteriaScores');
  }
  for (const key of CRITERION_KEY_LIST) {
    if (!isValidScore(criteria[key])) {
      throw invalidInput(`criteriaScores.${key}`);
    }
  }

  if (!isValidScore(raw.overallScore)) throw invalidInput('overallScore');
  if (typeof raw.summary !== 'string') throw invalidInput('summary');
  for (const field of ['strengths', 'improvements', 'recommendations']) {
    if (!isNonBlankStringList(raw[field])) throw invalidInput(field);
  }

  const questions = raw.questionsEvaluation;
  if (
    !isUnknownArray(questions) ||
    questions.length !== FLOW_LIMITS.questionCount
  ) {
    throw invalidInput('questionsEvaluation');
  }
  const ids = new Set<string>();
  const positions = new Set<number>();
  questions.forEach((item: unknown, index) => {
    const base = `questionsEvaluation[${index}]`;
    if (!isRecord(item)) throw invalidInput(base);
    if (!isUuid(item.questionId)) throw invalidInput(`${base}.questionId`);
    if (ids.has(item.questionId)) throw invalidInput(`${base}.questionId`);
    ids.add(item.questionId);
    const position = item.position;
    if (
      typeof position !== 'number' ||
      !Number.isInteger(position) ||
      position < 1 ||
      position > FLOW_LIMITS.questionCount ||
      positions.has(position)
    ) {
      throw invalidInput(`${base}.position`);
    }
    positions.add(position);
    if (!isValidScore(item.score)) throw invalidInput(`${base}.score`);
    if (typeof item.reason !== 'string') throw invalidInput(`${base}.reason`);
    if (typeof item.suggestion !== 'string') {
      throw invalidInput(`${base}.suggestion`);
    }
    for (const field of ['positives', 'improvements']) {
      if (!isNonBlankStringList(item[field])) {
        throw invalidInput(`${base}.${field}`);
      }
    }
  });
}

function toComparableFromInput(
  evaluation: NormalizedAiEvaluation,
): ComparableContent {
  const questions = evaluation.questionsEvaluation
    .map((question): ComparableQuestion => ({
      questionId: question.questionId,
      position: question.position,
      score: question.score,
      reason: question.reason,
      positives: question.positives,
      improvements: question.improvements,
      suggestion: question.suggestion,
    }))
    .sort((a, b) => a.position - b.position);
  return {
    criteria: CRITERION_KEY_LIST.map((key) => evaluation.criteriaScores[key]),
    overallScore: evaluation.overallScore,
    summary: evaluation.summary,
    strengths: evaluation.strengths,
    improvements: evaluation.improvements,
    recommendations: evaluation.recommendations,
    questions,
  };
}

// Lê o conteúdo persistido para a forma comparável. `null` = o estado salvo não
// tem a forma que a persistência da IA sempre grava (=> INCONSISTENT_STATE).
function toComparableFromRow(row: ClassifyRow): ComparableContent | null {
  const evaluation = row.evaluation;
  if (!evaluation || evaluation.status !== 'COMPLETED') return null;
  if (row.questions.length !== FLOW_LIMITS.questionCount) return null;

  const positionById = new Map<string, number>();
  for (const question of row.questions) {
    positionById.set(question.question_id, question.position);
  }
  if (positionById.size !== FLOW_LIMITS.questionCount) return null;

  const stored = evaluation.question_evaluations;
  if (stored.length !== FLOW_LIMITS.questionCount) return null;

  const criteriaRaw: unknown = evaluation.criteria_scores;
  if (!isRecord(criteriaRaw)) return null;
  const storedKeys = Object.keys(criteriaRaw);
  if (
    storedKeys.length !== CRITERION_KEY_LIST.length ||
    !storedKeys.every((key) => CRITERION_KEY_SET.has(key))
  ) {
    return null;
  }
  const criteria: number[] = [];
  for (const key of CRITERION_KEY_LIST) {
    const score = criteriaRaw[key];
    if (!isFiniteNumber(score)) return null;
    criteria.push(score);
  }

  const strengths: unknown = evaluation.strengths;
  const improvements: unknown = evaluation.improvements;
  const recommendations: unknown = evaluation.recommendations;
  if (
    evaluation.overall_score === null ||
    evaluation.summary === null ||
    !isNonBlankStringList(strengths) ||
    !isNonBlankStringList(improvements) ||
    !isNonBlankStringList(recommendations)
  ) {
    return null;
  }

  const questions: ComparableQuestion[] = [];
  for (const item of stored) {
    const position = positionById.get(item.question_id);
    const positives: unknown = item.positives;
    const itemImprovements: unknown = item.improvements;
    if (
      position === undefined ||
      !isNonBlankStringList(positives) ||
      !isNonBlankStringList(itemImprovements)
    ) {
      return null;
    }
    questions.push({
      questionId: item.question_id,
      position,
      score: item.score.toNumber(),
      reason: item.reason,
      positives,
      improvements: itemImprovements,
      suggestion: item.suggestion,
    });
  }
  // Cada pergunta da entrevista deve ter exatamente uma avaliação.
  if (new Set(questions.map((q) => q.questionId)).size !== questions.length) {
    return null;
  }
  questions.sort((a, b) => a.position - b.position);

  return {
    criteria,
    overallScore: evaluation.overall_score.toNumber(),
    summary: evaluation.summary,
    strengths,
    improvements,
    recommendations,
    questions,
  };
}

function prismaErrorCode(error: unknown): string {
  return error instanceof Prisma.PrismaClientKnownRequestError
    ? error.code
    : 'UNKNOWN';
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

// Persistência transacional de uma avaliação por IA JÁ NORMALIZADA (R3.2).
//
// Serviço INERTE: nenhum controller, rota, executor nem chamada à IA o usa
// ainda. Só grava em interview, interview_evaluation e
// interview_question_evaluation. Não faz chamadas de rede, não gera snapshot e
// não toca em avaliações humanas.
//
// Ordem na transação (inversa à da avaliação humana, porque aqui ainda não
// existe linha de avaliação para travar): o UPDATE condicional da entrevista é o
// mutex. Quem perde (count 0) encerra a transação sem gravar e CLASSIFICA o
// estado em uma leitura NOVA; nunca se trata violação de unicidade como sucesso.
@Injectable()
export class AiEvaluationPersistenceService {
  private readonly logger = new Logger(AiEvaluationPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async persist(
    interviewId: string,
    evaluation: NormalizedAiEvaluation,
  ): Promise<AiEvaluationPersistResult> {
    const startedAt = Date.now();
    try {
      validateInput(interviewId, evaluation);
    } catch (error) {
      throw this.reportFailure(error, interviewId, 'input', startedAt);
    }

    const progress: { step: AiEvaluationPersistStep } = { step: 'claim' };
    let outcome: TransactionOutcome;
    try {
      outcome = await this.prisma.$transaction(
        (tx) => this.writeInTransaction(tx, interviewId, evaluation, progress),
        TRANSACTION_OPTIONS,
      );
    } catch (error) {
      throw this.reportFailure(error, interviewId, progress.step, startedAt);
    }

    if (outcome.kind === 'created') {
      this.logger.log(
        `Avaliação por IA persistida: interviewId=${interviewId} evaluationId=${outcome.evaluationId} outcome=created durationMs=${Date.now() - startedAt}`,
      );
      return {
        status: 'created',
        interviewId,
        evaluationId: outcome.evaluationId,
      };
    }

    // A reivindicação falhou: a transação já terminou. Classifica em leitura nova.
    try {
      const result = await this.classify(interviewId, evaluation);
      this.logger.log(
        `Avaliação por IA já persistida: interviewId=${interviewId} evaluationId=${result.evaluationId} outcome=already_persisted durationMs=${Date.now() - startedAt}`,
      );
      return result;
    } catch (error) {
      throw this.reportFailure(error, interviewId, 'classify', startedAt);
    }
  }

  private async writeInTransaction(
    tx: Prisma.TransactionClient,
    interviewId: string,
    evaluation: NormalizedAiEvaluation,
    progress: { step: AiEvaluationPersistStep },
  ): Promise<TransactionOutcome> {
    const now = new Date();

    // 1. Reivindica a entrevista (o "lock"): só AI em PENDING_AI_EVALUATION.
    progress.step = 'claim';
    const claim = await tx.interview.updateMany({
      where: {
        interview_id: interviewId,
        evaluation_mode: 'AI',
        status: 'PENDING_AI_EVALUATION',
      },
      data: { status: 'COMPLETED', updated_at: now },
    });
    if (claim.count !== 1) return { kind: 'claim_lost' };

    // 2. As cinco perguntas reais precisam bater com os UUIDs/posições recebidos.
    progress.step = 'questions';
    const realQuestions = await tx.interview_question.findMany({
      where: { interview_id: interviewId },
      select: { question_id: true, position: true },
    });
    if (!this.questionsMatch(realQuestions, evaluation.questionsEvaluation)) {
      throw fail('QUESTIONS_MISMATCH', 'questions');
    }

    // 3. Avaliação principal já COMPLETED (sem DRAFT intermediário).
    progress.step = 'evaluation';
    const criteriaScores: Record<string, number> = {};
    for (const key of CRITERION_KEY_LIST) {
      criteriaScores[key] = evaluation.criteriaScores[key];
    }
    const created = await tx.interview_evaluation.create({
      data: {
        interview_id: interviewId,
        status: 'COMPLETED',
        criteria_scores: criteriaScores,
        overall_score: evaluation.overallScore,
        summary: evaluation.summary,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        recommendations: evaluation.recommendations,
        completed_at: now,
      },
      select: { evaluation_id: true },
    });

    // 4. Exatamente cinco avaliações por pergunta; duplicidade deve falhar, não ser ignorada.
    progress.step = 'question_evaluations';
    const createdQuestions = await tx.interview_question_evaluation.createMany({
      data: evaluation.questionsEvaluation.map(
        (question: NormalizedAiQuestionEvaluation) => ({
          evaluation_id: created.evaluation_id,
          interview_id: interviewId,
          question_id: question.questionId,
          score: question.score,
          reason: question.reason,
          positives: question.positives,
          improvements: question.improvements,
          suggestion: question.suggestion,
        }),
      ),
    });
    if (createdQuestions.count !== FLOW_LIMITS.questionCount) {
      throw fail('INCONSISTENT_STATE', 'question_evaluations');
    }

    return { kind: 'created', evaluationId: created.evaluation_id };
  }

  private questionsMatch(
    real: readonly { question_id: string; position: number }[],
    received: readonly NormalizedAiQuestionEvaluation[],
  ): boolean {
    if (real.length !== FLOW_LIMITS.questionCount) return false;
    const positionById = new Map<string, number>();
    for (const question of real) {
      positionById.set(question.question_id, question.position);
    }
    if (positionById.size !== real.length) return false;
    return received.every(
      (question) => positionById.get(question.questionId) === question.position,
    );
  }

  // Leitura nova (fora de qualquer transação de escrita) para decidir o que
  // aconteceu com a entrevista cuja reivindicação falhou.
  private async classify(
    interviewId: string,
    evaluation: NormalizedAiEvaluation,
  ): Promise<AiEvaluationPersistResult> {
    const row = await this.prisma.interview.findUnique({
      where: { interview_id: interviewId },
      select: CLASSIFY_SELECT,
    });

    if (!row) throw fail('INTERVIEW_NOT_FOUND', 'classify');
    if (row.evaluation_mode === 'HUMAN') {
      throw fail('WRONG_EVALUATION_MODE', 'classify');
    }
    if (row.evaluation_mode === null) {
      throw fail('INVALID_INTERVIEW_STATE', 'classify');
    }
    if (row.status === 'PENDING_AI_EVALUATION') {
      // Ainda pendente e com avaliação já gravada: estado impossível por esta
      // rotina. Sem avaliação: o vencedor desfez a transação; é uma corrida
      // transitória e o chamador decide se tenta de novo (sem retry aqui).
      throw row.evaluation
        ? fail('INCONSISTENT_STATE', 'classify')
        : fail('PERSISTENCE_FAILED', 'claim');
    }
    if (row.status !== 'COMPLETED') {
      throw fail('INVALID_INTERVIEW_STATE', 'classify');
    }

    const persisted = toComparableFromRow(row);
    if (!persisted || !row.evaluation) {
      throw fail('INCONSISTENT_STATE', 'classify');
    }
    if (!sameContent(persisted, toComparableFromInput(evaluation))) {
      throw fail('EVALUATION_CONFLICT', 'classify');
    }
    return {
      status: 'already_persisted',
      interviewId,
      evaluationId: row.evaluation.evaluation_id,
    };
  }

  // Converte qualquer falha em erro tipado e sanitizado, e registra só código,
  // etapa e (se houver) o código `Pxxxx` do Prisma. Nunca registra mensagem,
  // stack ou metadados do Prisma, nem texto de avaliação.
  private reportFailure(
    error: unknown,
    interviewId: string,
    step: AiEvaluationPersistStep,
    startedAt: number,
  ): AiEvaluationPersistenceError {
    let result: AiEvaluationPersistenceError;
    let prismaCode: string | undefined;
    if (error instanceof AiEvaluationPersistenceError) {
      result = error;
    } else if (
      isUniqueViolation(error) &&
      (step === 'evaluation' || step === 'question_evaluations')
    ) {
      // Claim OK e duplicidade logo depois: já havia avaliação para uma
      // entrevista pendente. A transação desfez o claim.
      prismaCode = prismaErrorCode(error);
      result = fail('INCONSISTENT_STATE', step);
    } else {
      prismaCode = prismaErrorCode(error);
      result = fail('PERSISTENCE_FAILED', step);
    }

    this.logger.error(
      `Falha ao persistir avaliação por IA: interviewId=${interviewId} code=${result.code} step=${result.step}${prismaCode === undefined ? '' : ` prismaCode=${prismaCode}`} durationMs=${Date.now() - startedAt}`,
    );
    return result;
  }
}
