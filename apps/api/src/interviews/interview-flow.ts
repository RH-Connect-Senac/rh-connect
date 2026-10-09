import { BadGatewayException, BadRequestException } from '@nestjs/common';
import { textLength } from './job-context';

export const EVALUATION_MODES = ['AI', 'HUMAN'] as const;
export type EvaluationMode = (typeof EVALUATION_MODES)[number];

export const QUESTION_TYPES = ['TECHNICAL', 'BEHAVIORAL', 'CAREER'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

// Limites físicos (VARCHAR) das colunas de interview_question e a quantidade
// de perguntas que o serviço de IA gera (a quantidade NÃO é restrição do banco).
export const FLOW_LIMITS = {
  questionText: 500,
  answer: 1000,
  questionCount: 5,
} as const;

// Mesma normalização do frontend (App.tsx `normalizeInterviewAnswer`): quebras
// de linha viram um espaço; depois trim. Resposta só de espaços/quebras => ''.
export function normalizeAnswer(value: string): string {
  return value.replace(/\s*\r?\n+\s*/g, ' ').trim();
}

// Acima do limite => 400; o conteúdo nunca é cortado em silêncio.
export function validateAnswer(raw: string): string {
  const answer = normalizeAnswer(raw);
  if (textLength(answer) > FLOW_LIMITS.answer) {
    throw new BadRequestException(
      `A resposta deve ter no máximo ${FLOW_LIMITS.answer} caracteres.`,
    );
  }
  return answer;
}

export interface GeneratedQuestion {
  position: number;
  type: QuestionType;
  text: string;
}

const TYPE_BY_KEY = new Map<string, QuestionType>([
  ['tecnica', 'TECHNICAL'],
  ['technical', 'TECHNICAL'],
  ['comportamental', 'BEHAVIORAL'],
  ['behavioral', 'BEHAVIORAL'],
  ['carreira', 'CAREER'],
  ['career', 'CAREER'],
]);

function typeKey(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
    : '';
}

function invalidGeneration() {
  return new BadGatewayException(
    'O serviço de IA retornou perguntas em formato inválido.',
  );
}

// Valida a resposta do Python (`{ questions: [{ id, type, text }] }`). A
// posição vem da ordem do array (1..N), nunca do `id` devolvido. Pergunta
// inválida ou acima de 500 caracteres => 502 (não se grava nada, não se corta).
export function parseGeneratedQuestions(payload: unknown): GeneratedQuestion[] {
  const list =
    typeof payload === 'object' && payload !== null
      ? (payload as { questions?: unknown }).questions
      : undefined;

  if (!Array.isArray(list) || list.length !== FLOW_LIMITS.questionCount) {
    throw invalidGeneration();
  }

  return list.map((item: unknown, index: number) => {
    const record =
      typeof item === 'object' && item !== null
        ? (item as { type?: unknown; text?: unknown })
        : {};
    const type = TYPE_BY_KEY.get(typeKey(record.type));
    const text = typeof record.text === 'string' ? record.text.trim() : '';

    if (!type || !text || textLength(text) > FLOW_LIMITS.questionText) {
      throw invalidGeneration();
    }

    return { position: index + 1, type, text };
  });
}

// Campos lidos do banco (sem interview_id/created_at/updated_at internos).
export const QUESTION_SELECT = {
  question_id: true,
  position: true,
  question_type: true,
  question_text: true,
  answer_text: true,
  answered_at: true,
} as const;

export interface QuestionRecord {
  question_id: string;
  position: number;
  question_type: string;
  question_text: string;
  answer_text: string | null;
  answered_at: Date | null;
}

export function toQuestionResponse(record: QuestionRecord) {
  return {
    id: record.question_id,
    position: record.position,
    type: record.question_type,
    text: record.question_text,
    answer: record.answer_text,
    answeredAt: record.answered_at,
  };
}
