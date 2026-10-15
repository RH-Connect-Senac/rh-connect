import {
  CRITERION_KEYS,
  EVALUATION_CRITERIA,
} from '../evaluator-interviews/evaluation-criteria';
import type { CriterionKey } from '../evaluator-interviews/evaluation-criteria';
import { FLOW_LIMITS } from '../interviews/interview-flow';
import {
  AI_CRITERION_LABELS,
  AiEvaluationContractError,
  OVERALL_SCORE_TOLERANCE,
} from './ai-evaluation.types';
import type {
  AiEvaluationQuestionRef,
  NormalizedAiEvaluation,
  NormalizedAiQuestionEvaluation,
} from './ai-evaluation.types';

// Normalizador PURO da avaliação por IA: sem rede, sem banco, sem log. Recebe a
// resposta do Python como `unknown` e as cinco perguntas reais da entrevista;
// devolve o resultado normalizado ou lança `AiEvaluationContractError`. Nunca
// devolve resultado parcial, não recalcula notas e não reescreve textos.

const MIN_SCORE = 0;
const MAX_SCORE = 10;
// Margem só para ruído de ponto flutuante nas comparações.
const EPSILON = 1e-9;

function isUnknownArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Chave de comparação do rótulo: sem acento, sem diferença de caixa/bordas.
function labelKey(label: string): string {
  return label.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

const KEY_BY_LABEL = new Map<string, CriterionKey>(
  EVALUATION_CRITERIA.map((criterion) => [
    labelKey(AI_CRITERION_LABELS[criterion.key]),
    criterion.key,
  ]),
);

function isValidScore(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_SCORE &&
    value <= MAX_SCORE
  );
}

// Colunas DECIMAL(3,1): no máximo uma casa decimal.
function hasAtMostOneDecimal(value: number): boolean {
  return Math.abs(value * 10 - Math.round(value * 10)) < EPSILON;
}

function validateQuestionRefs(
  questions: readonly AiEvaluationQuestionRef[],
): Map<number, string> {
  const fail = (detail: string) =>
    new AiEvaluationContractError(
      'INVALID_QUESTION_REFERENCES',
      'questions',
      detail,
    );

  // `Array.isArray` estreita para `any[]`; o guard próprio mantém `unknown`.
  if (
    !isUnknownArray(questions) ||
    questions.length !== FLOW_LIMITS.questionCount
  ) {
    throw fail(
      `são exigidas exatamente ${FLOW_LIMITS.questionCount} perguntas.`,
    );
  }

  const idByPosition = new Map<number, string>();
  const seenIds = new Set<string>();
  for (const question of questions) {
    const position = isPlainObject(question) ? question.position : undefined;
    const id = isPlainObject(question) ? question.questionId : undefined;
    if (
      typeof position !== 'number' ||
      !Number.isInteger(position) ||
      position < 1 ||
      position > FLOW_LIMITS.questionCount
    ) {
      throw fail('posição fora do intervalo 1..5.');
    }
    if (typeof id !== 'string' || id.trim() === '') {
      throw fail('identificador da pergunta ausente.');
    }
    if (idByPosition.has(position)) throw fail('posição duplicada.');
    if (seenIds.has(id)) throw fail('identificador de pergunta duplicado.');
    idByPosition.set(position, id);
    seenIds.add(id);
  }
  return idByPosition;
}

function normalizeCriteria(raw: unknown): Record<CriterionKey, number> {
  if (!isPlainObject(raw)) {
    throw new AiEvaluationContractError(
      'INVALID_CRITERIA',
      'scores',
      'esperado um objeto com os sete critérios.',
    );
  }

  const found = new Map<CriterionKey, number>();
  Object.entries(raw).forEach(([label, value], index) => {
    const path = `scores[${index}]`;
    const key = KEY_BY_LABEL.get(labelKey(label));
    if (!key) {
      throw new AiEvaluationContractError(
        'UNKNOWN_CRITERION',
        path,
        'critério desconhecido.',
      );
    }
    if (found.has(key)) {
      throw new AiEvaluationContractError(
        'DUPLICATE_CRITERION',
        `scores.${key}`,
        'critério informado mais de uma vez.',
      );
    }
    if (!isValidScore(value)) {
      throw new AiEvaluationContractError(
        'INVALID_SCORE',
        `scores.${key}`,
        'a nota deve ser um número finito de 0 a 10.',
      );
    }
    found.set(key, value);
  });

  const result = {} as Record<CriterionKey, number>;
  // Ordem canônica (determinística), independente da ordem recebida.
  for (const criterion of EVALUATION_CRITERIA) {
    const value = found.get(criterion.key);
    if (value === undefined) {
      throw new AiEvaluationContractError(
        'MISSING_CRITERION',
        `scores.${criterion.key}`,
        'critério ausente.',
      );
    }
    result[criterion.key] = value;
  }
  return result;
}

function checkOverallScore(
  raw: unknown,
  criteriaScores: Record<CriterionKey, number>,
): number {
  if (!isValidScore(raw) || !hasAtMostOneDecimal(raw)) {
    throw new AiEvaluationContractError(
      'INVALID_OVERALL_SCORE',
      'overallScore',
      'esperado número de 0 a 10 com no máximo uma casa decimal.',
    );
  }
  // Conferência (DEC-005): média simples dos sete, SEM arredondar os critérios.
  const mean =
    CRITERION_KEYS.reduce(
      (sum, key) => sum + criteriaScores[key as CriterionKey],
      0,
    ) / CRITERION_KEYS.length;
  if (Math.abs(raw - mean) > OVERALL_SCORE_TOLERANCE + EPSILON) {
    throw new AiEvaluationContractError(
      'OVERALL_SCORE_MISMATCH',
      'overallScore',
      'diverge da média simples dos sete critérios.',
    );
  }
  return raw;
}

function readText(value: unknown, path: string): string {
  if (typeof value !== 'string') {
    throw new AiEvaluationContractError(
      'INVALID_TEXT',
      path,
      'esperado texto.',
    );
  }
  return value;
}

// O Python já descarta itens vazios; item não textual ou em branco é contrato
// quebrado.
function readTextList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new AiEvaluationContractError(
      'INVALID_TEXT_LIST',
      path,
      'esperada lista de textos.',
    );
  }
  return value.map((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new AiEvaluationContractError(
        'INVALID_TEXT_LIST',
        `${path}[${index}]`,
        'esperado texto não vazio.',
      );
    }
    return item;
  });
}

function normalizeQuestions(
  raw: unknown,
  idByPosition: Map<number, string>,
): NormalizedAiQuestionEvaluation[] {
  if (!Array.isArray(raw)) {
    throw new AiEvaluationContractError(
      'INVALID_QUESTIONS_EVALUATION',
      'questionsEvaluation',
      'esperada lista de avaliações por pergunta.',
    );
  }
  if (raw.length !== FLOW_LIMITS.questionCount) {
    throw new AiEvaluationContractError(
      raw.length < FLOW_LIMITS.questionCount
        ? 'MISSING_QUESTION_EVALUATION'
        : 'INVALID_QUESTIONS_EVALUATION',
      'questionsEvaluation',
      `são exigidas exatamente ${FLOW_LIMITS.questionCount} avaliações.`,
    );
  }

  const byPosition = new Map<number, NormalizedAiQuestionEvaluation>();
  raw.forEach((item: unknown, index) => {
    const path = `questionsEvaluation[${index}]`;
    if (!isPlainObject(item)) {
      throw new AiEvaluationContractError(
        'INVALID_QUESTIONS_EVALUATION',
        path,
        'esperado objeto.',
      );
    }

    // Sem fallback posicional: o identificador precisa estar no item.
    const position = item.questionId;
    if (
      typeof position !== 'number' ||
      !Number.isInteger(position) ||
      !idByPosition.has(position)
    ) {
      throw new AiEvaluationContractError(
        'INVALID_QUESTION_ID',
        `${path}.questionId`,
        'esperado inteiro correspondente a uma posição de 1 a 5.',
      );
    }
    if (byPosition.has(position)) {
      throw new AiEvaluationContractError(
        'DUPLICATE_QUESTION_ID',
        `${path}.questionId`,
        'avaliação repetida para a mesma pergunta.',
      );
    }

    if (!isValidScore(item.score) || !hasAtMostOneDecimal(item.score)) {
      throw new AiEvaluationContractError(
        'INVALID_SCORE',
        `${path}.score`,
        'esperado número de 0 a 10 com no máximo uma casa decimal.',
      );
    }

    byPosition.set(position, {
      questionId: idByPosition.get(position) as string,
      position,
      score: item.score,
      reason: readText(item.reason, `${path}.reason`),
      positives: readTextList(item.positives, `${path}.positives`),
      improvements: readTextList(item.improvements, `${path}.improvements`),
      suggestion: readText(item.suggestion, `${path}.suggestion`),
    });
  });

  // 5 itens, posições únicas e todas dentro de 1..5 => todas presentes; a
  // checagem abaixo é defesa em profundidade e dá a ordem final.
  return [...idByPosition.keys()]
    .sort((a, b) => a - b)
    .map((position) => {
      const evaluation = byPosition.get(position);
      if (!evaluation) {
        throw new AiEvaluationContractError(
          'MISSING_QUESTION_EVALUATION',
          'questionsEvaluation',
          'falta a avaliação de uma pergunta.',
        );
      }
      return evaluation;
    });
}

export function normalizeAiEvaluation(
  raw: unknown,
  questions: readonly AiEvaluationQuestionRef[],
): NormalizedAiEvaluation {
  const idByPosition = validateQuestionRefs(questions);

  if (!isPlainObject(raw)) {
    throw new AiEvaluationContractError(
      'INVALID_PAYLOAD',
      '$',
      'esperado objeto.',
    );
  }

  const criteriaScores = normalizeCriteria(raw.scores);
  const overallScore = checkOverallScore(raw.overallScore, criteriaScores);
  const strengths = readTextList(raw.strengths, 'strengths');
  const improvements = readTextList(raw.improvements, 'improvements');
  const recommendations = readTextList(raw.recommendations, 'recommendations');
  const summary = readText(raw.summary, 'summary');
  const questionsEvaluation = normalizeQuestions(
    raw.questionsEvaluation,
    idByPosition,
  );

  return {
    criteriaScores,
    overallScore,
    strengths,
    improvements,
    recommendations,
    summary,
    questionsEvaluation,
  };
}
