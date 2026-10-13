import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { textLength } from './job-context';

// Códigos estáveis dos 409 da entrevista do candidato: o frontend decide pelo
// `code`, nunca pelo texto da mensagem.
export const INTERVIEW_ERROR_CODES = {
  notInProgress: 'INTERVIEW_NOT_IN_PROGRESS',
  draftVersionConflict: 'DRAFT_VERSION_CONFLICT',
  alreadyInProgress: 'INTERVIEW_ALREADY_IN_PROGRESS',
  resultNotAvailable: 'INTERVIEW_RESULT_NOT_AVAILABLE',
} as const;

// 409: a entrevista já saiu de IN_PROGRESS (enviada/encerrada) e não aceita mais
// mutações. `interviewStatus` informa o estado vigente quando conhecido.
export function interviewNotInProgress(
  message: string,
  interviewStatus?: string,
) {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    code: INTERVIEW_ERROR_CODES.notInProgress,
    // Cancelada não é "enviada": a mensagem diz o que realmente aconteceu.
    message:
      interviewStatus === 'CANCELLED'
        ? 'Esta entrevista foi cancelada e não aceita mais alterações.'
        : message,
    ...(interviewStatus ? { interviewStatus } : {}),
  });
}

// 409 (regra V1): o candidato só pode ter UMA entrevista IN_PROGRESS por vez.
// `interviewId` é a entrevista existente (o frontend oferece "Continuar entrevista").
export function interviewAlreadyInProgress(interviewId: string | null) {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    code: INTERVIEW_ERROR_CODES.alreadyInProgress,
    message: 'Você já possui uma entrevista em andamento.',
    ...(interviewId ? { interviewId } : {}),
  });
}

// 409 (GET /interviews/:id/result): a entrevista existe e é do candidato, mas
// ainda não há resultado persistido para mostrar. NUNCA finge resultado. A
// mensagem descreve o estado real; `interviewStatus`/`evaluationMode` deixam o
// cliente decidir sem interpretar texto.
export function interviewResultNotAvailable(
  interviewStatus: string,
  evaluationMode: string | null,
) {
  const messages: Record<string, string> = {
    IN_PROGRESS: 'Esta entrevista ainda não foi enviada.',
    PENDING_ASSIGNMENT: 'Esta entrevista aguarda a atribuição a um avaliador.',
    ASSIGNED: 'Esta entrevista está em avaliação.',
    PENDING_AI_EVALUATION: 'Esta entrevista aguarda a avaliação por IA.',
    CANCELLED: 'Esta entrevista foi cancelada e não possui resultado.',
  };

  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    code: INTERVIEW_ERROR_CODES.resultNotAvailable,
    message:
      messages[interviewStatus] ??
      'O resultado desta entrevista ainda não está disponível.',
    interviewStatus,
    evaluationMode,
  });
}

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

// Normalização da resposta: apenas padroniza o fim de linha (CRLF/CR => LF) e
// remove espaços/quebras das pontas. Parágrafos e linhas em branco do candidato
// são PRESERVADOS (nenhuma quebra vira espaço). Resposta só de espaços/quebras
// => ''. O frontend (`normalizeInterviewAnswer`) aplica a mesma regra de fim de linha.
export function normalizeAnswer(value: string): string {
  return value.replace(/\r\n?/g, '\n').trim();
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

// Rascunho: só padroniza o fim de linha (CRLF/CR => LF). NÃO faz trim, para não
// "comer" o espaço/quebra que o candidato acabou de digitar. Só espaços/quebras
// => null (limpa o rascunho). Acima do limite => 400, nunca corta em silêncio.
export function validateDraft(raw: string): string | null {
  const draft = raw.replace(/\r\n?/g, '\n');
  if (draft.trim() === '') {
    return null;
  }
  if (textLength(draft) > FLOW_LIMITS.answer) {
    throw new BadRequestException(
      `O rascunho deve ter no máximo ${FLOW_LIMITS.answer} caracteres.`,
    );
  }
  return draft;
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
    'Não foi possível gerar as perguntas agora. Tente novamente em instantes.',
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

// Projeção do CANDIDATO: além da resposta oficial, devolve o rascunho dele.
// Avaliador/Admin continuam usando QUESTION_SELECT (nunca veem rascunho).
export const CANDIDATE_QUESTION_SELECT = {
  ...QUESTION_SELECT,
  draft_text: true,
  draft_updated_at: true,
  draft_version: true,
} as const;

export interface CandidateQuestionRecord extends QuestionRecord {
  draft_text: string | null;
  draft_updated_at: Date | null;
  draft_version: number;
}

export function toCandidateQuestionResponse(record: CandidateQuestionRecord) {
  return {
    ...toQuestionResponse(record),
    draftText: record.draft_text,
    draftUpdatedAt: record.draft_updated_at,
    draftVersion: record.draft_version,
  };
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
