import type { Prisma } from '@prisma/client';

import {
  FLOW_LIMITS,
  QUESTION_TYPES,
  type QuestionType,
} from '../interviews/interview-flow';
import {
  INTERVIEW_SELECT,
  toInterviewResponse,
  type InterviewRecord,
} from '../interviews/interview-projection';
import {
  JOB_LIMITS,
  JOB_WORK_MODES,
  textLength,
  type JobWorkMode,
} from '../interviews/job-context';
import type { AiEvaluationQuestionRef } from './ai-evaluation.types';

// Montagem (pura, sem rede nem banco) do payload de `POST /evaluate` a partir de
// uma entrevista real (R3.3a-1). O resultado alimenta `InterviewsAiService.evaluate`
// e, depois, `normalizeAiEvaluation` com as mesmas `questionRefs`.
//
// Nada aqui altera regra de negócio: não calcula nota, não corrige texto e não
// muda a quantidade de perguntas (FLOW_LIMITS.questionCount). O que não está
// íntegro é rejeitado ANTES de gastar uma chamada à IA, com um erro que só
// descreve o código e o caminho do problema, nunca o conteúdo do candidato.

// Leitura necessária do banco (somente leitura). Reaproveita a projeção base da
// entrevista (a mesma usada para gerar as perguntas) e acrescenta as perguntas
// com as respostas oficiais (`answer_text`; rascunho nunca entra) e a existência
// de avaliação.
export const AI_EVALUATION_INPUT_SELECT = {
  ...INTERVIEW_SELECT,
  questions: {
    select: {
      question_id: true,
      interview_id: true,
      position: true,
      question_type: true,
      question_text: true,
      answer_text: true,
    },
    orderBy: { position: 'asc' },
  },
  evaluation: { select: { evaluation_id: true } },
} satisfies Prisma.interviewSelect;

export interface AiEvaluationInputQuestionRecord {
  question_id: string;
  interview_id: string;
  position: number;
  question_type: string;
  question_text: string;
  answer_text: string | null;
}

export interface AiEvaluationInputRecord extends InterviewRecord {
  questions: readonly AiEvaluationInputQuestionRecord[];
  evaluation: { evaluation_id: string } | null;
}

// Rótulos que o Python espera em `questionType` (os mesmos que ele gera em
// `/questions`). O `Record` exaustivo faz o compilador acusar tipo novo sem rótulo.
export const AI_QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  TECHNICAL: 'Tecnica',
  BEHAVIORAL: 'Comportamental',
  CAREER: 'Carreira',
};

export interface AiEvaluationContextPayload {
  sourceUrl: string;
  title: string;
  company: string;
  summary: string;
  activities: string[];
  requirements: string[];
  location: string | null;
  contractType: string | null;
  workMode: JobWorkMode | null;
}

export interface AiEvaluationAnswerPayload {
  // Posição 1..5; é o `questionId` numérico que o Python devolve na avaliação.
  questionId: number;
  questionText: string;
  questionType: string;
  answer: string;
}

export interface AiEvaluationInput {
  payload: {
    context: AiEvaluationContextPayload;
    answers: AiEvaluationAnswerPayload[];
  };
  // Perguntas reais (UUID + posição), na ordem 1..5, para `normalizeAiEvaluation`.
  questionRefs: AiEvaluationQuestionRef[];
}

export type AiEvaluationInputErrorCode =
  | 'INVALID_INTERVIEW'
  | 'WRONG_EVALUATION_MODE'
  | 'INVALID_INTERVIEW_STATE'
  | 'EVALUATION_ALREADY_EXISTS'
  | 'INVALID_CONTEXT'
  | 'INVALID_QUESTIONS'
  | 'INVALID_QUESTION_TYPE'
  | 'MISSING_ANSWER'
  | 'TEXT_TOO_LONG';

// Erro tipado. Só `code` e `path` (onde falhou); nunca valores da entrevista.
export class AiEvaluationInputError extends Error {
  constructor(
    readonly code: AiEvaluationInputErrorCode,
    readonly path: string,
  ) {
    super(`Entrada da avaliação por IA inválida (${code}) em ${path}.`);
    this.name = 'AiEvaluationInputError';
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isQuestionType(value: unknown): value is QuestionType {
  return (
    typeof value === 'string' &&
    (QUESTION_TYPES as readonly string[]).includes(value)
  );
}

function isWorkMode(value: unknown): value is JobWorkMode | null {
  return (
    value === null ||
    (typeof value === 'string' &&
      (JOB_WORK_MODES as readonly string[]).includes(value))
  );
}

function buildContext(record: AiEvaluationInputRecord) {
  const { context } = toInterviewResponse(record);

  if (typeof context.title !== 'string' || context.title.trim() === '') {
    throw new AiEvaluationInputError('INVALID_CONTEXT', 'context.title');
  }
  if (textLength(context.title) > JOB_LIMITS.title) {
    throw new AiEvaluationInputError('TEXT_TOO_LONG', 'context.title');
  }
  if (typeof context.sourceUrl !== 'string' || context.sourceUrl === '') {
    throw new AiEvaluationInputError('INVALID_CONTEXT', 'context.sourceUrl');
  }
  if (!isWorkMode(context.workMode)) {
    throw new AiEvaluationInputError('INVALID_CONTEXT', 'context.workMode');
  }
  for (const field of ['activities', 'requirements'] as const) {
    const list = context[field];
    if (
      list.length > JOB_LIMITS.listMaxItems ||
      list.some((item) => textLength(item) > JOB_LIMITS.listItemLength)
    ) {
      throw new AiEvaluationInputError('TEXT_TOO_LONG', `context.${field}`);
    }
  }

  // Mesmo formato enviado na geração das perguntas: empresa e resumo ausentes
  // viram texto vazio; localização, contrato e modalidade seguem como estão.
  const payload: AiEvaluationContextPayload = {
    sourceUrl: context.sourceUrl,
    title: context.title,
    company: context.company ?? '',
    summary: context.summary ?? '',
    activities: context.activities,
    requirements: context.requirements,
    location: context.location,
    contractType: context.contractType,
    workMode: context.workMode,
  };
  return payload;
}

function buildQuestions(record: AiEvaluationInputRecord) {
  // `unknown` evita que `Array.isArray` estreite o tipo para `any[]`.
  const raw: unknown = record.questions;
  if (!Array.isArray(raw) || raw.length !== FLOW_LIMITS.questionCount) {
    throw new AiEvaluationInputError('INVALID_QUESTIONS', 'questions');
  }
  const { questions } = record;

  const ordered = [...questions].sort((a, b) => a.position - b.position);
  const ids = new Set<string>();

  const answers: AiEvaluationAnswerPayload[] = [];
  const questionRefs: AiEvaluationQuestionRef[] = [];

  ordered.forEach((question, index) => {
    const path = `questions[${index}]`;
    const expectedPosition = index + 1;

    // Posições exatamente 1..5, sem lacuna nem repetição.
    if (question.position !== expectedPosition) {
      throw new AiEvaluationInputError('INVALID_QUESTIONS', `${path}.position`);
    }
    if (!isUuid(question.question_id) || ids.has(question.question_id)) {
      throw new AiEvaluationInputError(
        'INVALID_QUESTIONS',
        `${path}.questionId`,
      );
    }
    ids.add(question.question_id);
    // Vínculo: a pergunta pertence a ESTA entrevista.
    if (question.interview_id !== record.interview_id) {
      throw new AiEvaluationInputError(
        'INVALID_QUESTIONS',
        `${path}.interviewId`,
      );
    }
    if (!isQuestionType(question.question_type)) {
      throw new AiEvaluationInputError(
        'INVALID_QUESTION_TYPE',
        `${path}.questionType`,
      );
    }
    if (
      typeof question.question_text !== 'string' ||
      question.question_text.trim() === ''
    ) {
      throw new AiEvaluationInputError('INVALID_QUESTIONS', `${path}.text`);
    }
    if (textLength(question.question_text) > FLOW_LIMITS.questionText) {
      throw new AiEvaluationInputError('TEXT_TOO_LONG', `${path}.text`);
    }
    // Só a resposta OFICIAL conta e precisa ter conteúdo: uma resposta ausente
    // ou em branco não deve consumir uma chamada à IA.
    if (
      typeof question.answer_text !== 'string' ||
      question.answer_text.trim() === ''
    ) {
      throw new AiEvaluationInputError('MISSING_ANSWER', `${path}.answer`);
    }
    if (textLength(question.answer_text) > FLOW_LIMITS.answer) {
      throw new AiEvaluationInputError('TEXT_TOO_LONG', `${path}.answer`);
    }

    answers.push({
      questionId: expectedPosition,
      questionText: question.question_text,
      questionType: AI_QUESTION_TYPE_LABELS[question.question_type],
      answer: question.answer_text,
    });
    questionRefs.push({
      questionId: question.question_id,
      position: expectedPosition,
    });
  });

  return { answers, questionRefs };
}

export function buildAiEvaluationInput(
  record: AiEvaluationInputRecord,
): AiEvaluationInput {
  if (!isUuid(record?.interview_id)) {
    throw new AiEvaluationInputError('INVALID_INTERVIEW', 'interviewId');
  }
  if (record.evaluation_mode !== 'AI') {
    throw new AiEvaluationInputError('WRONG_EVALUATION_MODE', 'evaluationMode');
  }
  if (record.status !== 'PENDING_AI_EVALUATION') {
    throw new AiEvaluationInputError('INVALID_INTERVIEW_STATE', 'status');
  }
  // Já existe avaliação (qualquer estado): nada a gerar; o executor decide.
  if (record.evaluation) {
    throw new AiEvaluationInputError('EVALUATION_ALREADY_EXISTS', 'evaluation');
  }

  const context = buildContext(record);
  const { answers, questionRefs } = buildQuestions(record);

  return { payload: { context, answers }, questionRefs };
}
