import type { CriterionKey } from '../evaluator-interviews/evaluation-criteria';

// Contrato tipado da avaliação por IA (Python `/evaluate` -> NestJS).
//
// A resposta do Python é sempre tratada como `unknown` até passar por
// `normalizeAiEvaluation` (ai-evaluation.normalizer.ts). Os tipos abaixo
// descrevem (a) o formato esperado do Python, só para documentação e testes, e
// (b) o formato NORMALIZADO que o NestJS usa depois da validação.

// Rótulos que o Python devolve como chave de `scores` (schemas.EVALUATION_CRITERIA).
// O `Record` exaustivo faz o compilador acusar critério canônico sem rótulo.
export const AI_CRITERION_LABELS: Record<CriterionKey, string> = {
  clarity: 'Clareza',
  coherence: 'Coerência',
  objectivity: 'Objetividade',
  domain_knowledge: 'Domínio',
  organization: 'Organização',
  requirements_alignment: 'Aderência',
  examples: 'Exemplos',
};

// Tolerância (em pontos) entre o `overallScore` do Python e a média simples dos
// sete critérios. Ver docs/back-end/contrato-avaliacao-ia-normalizacao.md.
export const OVERALL_SCORE_TOLERANCE = 0.05;

// Formato esperado do Python (documentação/testes; NÃO use para tipar a entrada).
export interface PythonQuestionEvaluation {
  questionId: number;
  score: number;
  reason: string;
  positives: string[];
  improvements: string[];
  suggestion: string;
}

export interface PythonEvaluationResponse {
  scores: Record<string, number>;
  overallScore: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  summary: string;
  questionsEvaluation: PythonQuestionEvaluation[];
}

// Pergunta real da entrevista, como o NestJS a conhece: `position` (1..5) é a
// ponte com o `questionId` numérico do Python; `questionId` é o UUID do banco
// (`interview_question.question_id`).
export interface AiEvaluationQuestionRef {
  questionId: string;
  position: number;
}

export interface NormalizedAiQuestionEvaluation {
  // UUID real da pergunta (banco).
  questionId: string;
  // Posição 1..5 (o `questionId` numérico devolvido pelo Python).
  position: number;
  score: number;
  reason: string;
  positives: string[];
  improvements: string[];
  suggestion: string;
}

export interface NormalizedAiEvaluation {
  // Chaves canônicas (as mesmas de `criteria_scores` e do motor de materiais).
  criteriaScores: Record<CriterionKey, number>;
  // Valor do Python, preservado (conferido, nunca substituído).
  overallScore: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  summary: string;
  // Ordenadas por posição (1..5).
  questionsEvaluation: NormalizedAiQuestionEvaluation[];
}

export type AiEvaluationErrorCode =
  | 'INVALID_QUESTION_REFERENCES'
  | 'INVALID_PAYLOAD'
  | 'INVALID_CRITERIA'
  | 'UNKNOWN_CRITERION'
  | 'DUPLICATE_CRITERION'
  | 'MISSING_CRITERION'
  | 'INVALID_SCORE'
  | 'INVALID_OVERALL_SCORE'
  | 'OVERALL_SCORE_MISMATCH'
  | 'INVALID_QUESTIONS_EVALUATION'
  | 'INVALID_QUESTION_ID'
  | 'DUPLICATE_QUESTION_ID'
  | 'MISSING_QUESTION_EVALUATION'
  | 'INVALID_TEXT'
  | 'INVALID_TEXT_LIST';

// Erro tipado de contrato inválido. A mensagem e o `path` descrevem só ONDE o
// contrato falhou; nunca carregam valores recebidos (que podem conter texto do
// candidato ecoado pela IA).
export class AiEvaluationContractError extends Error {
  constructor(
    readonly code: AiEvaluationErrorCode,
    readonly path: string,
    detail: string,
  ) {
    super(`Contrato da avaliação por IA inválido em ${path}: ${detail}`);
    this.name = 'AiEvaluationContractError';
  }
}
