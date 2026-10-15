import type { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import {
  FLOW_LIMITS,
  parseGeneratedQuestions,
} from '../interviews/interview-flow';
import { toInterviewResponse } from '../interviews/interview-projection';
import { JOB_LIMITS } from '../interviews/job-context';
import {
  AI_CRITERION_LABELS,
  type PythonEvaluationResponse,
} from './ai-evaluation.types';
import { normalizeAiEvaluation } from './ai-evaluation.normalizer';
import {
  AI_EVALUATION_INPUT_SELECT,
  AI_QUESTION_TYPE_LABELS,
  AiEvaluationInputError,
  buildAiEvaluationInput,
  type AiEvaluationInputErrorCode,
  type AiEvaluationInputQuestionRecord,
  type AiEvaluationInputRecord,
} from './ai-evaluation-input.builder';
import { EvaluateDto } from './dto/evaluate.dto';

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_INTERVIEW_ID = '22222222-2222-4222-8222-222222222222';
const QUESTION_IDS = [1, 2, 3, 4, 5].map(
  (n) => `00000000-0000-4000-8000-00000000000${n}`,
);
const TYPES = ['TECHNICAL', 'TECHNICAL', 'BEHAVIORAL', 'BEHAVIORAL', 'CAREER'];
const SENSITIVE = 'TEXTO-SENSIVEL-DO-CANDIDATO';

function makeQuestions(): AiEvaluationInputQuestionRecord[] {
  return QUESTION_IDS.map((id, index) => ({
    question_id: id,
    interview_id: INTERVIEW_ID,
    position: index + 1,
    question_type: TYPES[index],
    question_text: `Pergunta ${index + 1}?`,
    answer_text: `Resposta ${index + 1} ${SENSITIVE}.`,
  }));
}

function makeRecord(
  overrides: Partial<AiEvaluationInputRecord> = {},
): AiEvaluationInputRecord {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    interview_id: INTERVIEW_ID,
    status: 'PENDING_AI_EVALUATION',
    evaluation_mode: 'AI',
    job_title: 'Desenvolvedor Back-end',
    job_company: 'Empresa Exemplo',
    job_summary: 'Resumo da vaga.',
    job_activities: ['Criar APIs', 'Corrigir bugs'],
    job_requirements: ['Node.js', 'SQL'],
    job_location: 'Brasília',
    job_contract_type: 'CLT',
    job_work_mode: 'HYBRID',
    job_source_url: 'https://example.invalid/vaga',
    submitted_at: now,
    created_at: now,
    updated_at: now,
    questions: makeQuestions(),
    evaluation: null,
    ...overrides,
  };
}

function withQuestion(
  index: number,
  patch: Partial<AiEvaluationInputQuestionRecord>,
): AiEvaluationInputRecord {
  const questions = makeQuestions();
  questions[index] = { ...questions[index], ...patch };
  return makeRecord({ questions });
}

function failure(record: AiEvaluationInputRecord): AiEvaluationInputError {
  try {
    buildAiEvaluationInput(record);
  } catch (error) {
    expect(error).toBeInstanceOf(AiEvaluationInputError);
    return error as AiEvaluationInputError;
  }
  throw new Error('Esperava AiEvaluationInputError');
}

function expectFailure(
  record: AiEvaluationInputRecord,
  code: AiEvaluationInputErrorCode,
  path?: string,
) {
  const error = failure(record);
  expect(error.code).toBe(code);
  if (path !== undefined) expect(error.path).toBe(path);
  expect(error.message).not.toContain(SENSITIVE);
}

describe('buildAiEvaluationInput — montagem do payload', () => {
  it('monta contexto, cinco respostas e as referências das perguntas', () => {
    const { payload, questionRefs } = buildAiEvaluationInput(makeRecord());

    expect(payload.context).toEqual({
      sourceUrl: 'https://example.invalid/vaga',
      title: 'Desenvolvedor Back-end',
      company: 'Empresa Exemplo',
      summary: 'Resumo da vaga.',
      activities: ['Criar APIs', 'Corrigir bugs'],
      requirements: ['Node.js', 'SQL'],
      location: 'Brasília',
      contractType: 'CLT',
      workMode: 'HYBRID',
    });
    expect(payload.answers).toHaveLength(FLOW_LIMITS.questionCount);
    expect(payload.answers.map((a) => a.questionId)).toEqual([1, 2, 3, 4, 5]);
    expect(payload.answers[0]).toEqual({
      questionId: 1,
      questionText: 'Pergunta 1?',
      questionType: 'Tecnica',
      answer: `Resposta 1 ${SENSITIVE}.`,
    });
    expect(questionRefs).toEqual(
      QUESTION_IDS.map((questionId, index) => ({
        questionId,
        position: index + 1,
      })),
    );
  });

  it('usa os rótulos de tipo que o Python entende e que o fluxo de geração reconhece', () => {
    const { payload } = buildAiEvaluationInput(makeRecord());
    expect(payload.answers.map((a) => a.questionType)).toEqual([
      'Tecnica',
      'Tecnica',
      'Comportamental',
      'Comportamental',
      'Carreira',
    ]);
    // Paridade com o parser de geração: cada rótulo volta ao mesmo tipo do banco.
    for (const [dbType, label] of Object.entries(AI_QUESTION_TYPE_LABELS)) {
      const parsed = parseGeneratedQuestions({
        questions: Array.from({ length: FLOW_LIMITS.questionCount }, () => ({
          type: label,
          text: 'x',
        })),
      });
      expect(parsed.every((question) => question.type === dbType)).toBe(true);
    }
  });

  it('ordena por posição independentemente da ordem recebida', () => {
    const questions = makeQuestions().reverse();
    const { payload, questionRefs } = buildAiEvaluationInput(
      makeRecord({ questions }),
    );
    expect(payload.answers.map((a) => a.questionId)).toEqual([1, 2, 3, 4, 5]);
    expect(questionRefs.map((ref) => ref.position)).toEqual([1, 2, 3, 4, 5]);
    expect(payload.answers[4].questionText).toBe('Pergunta 5?');
  });

  it('preserva exatamente o texto do candidato (espaços, quebras e acentos)', () => {
    const answer = '  Primeira linha\n\n  segunda com acentuação: ação, é.  ';
    const { payload } = buildAiEvaluationInput(
      withQuestion(2, { answer_text: answer }),
    );
    expect(payload.answers[2].answer).toBe(answer);
  });

  it('envia o mesmo contexto da geração de perguntas (empresa e resumo ausentes viram texto vazio)', () => {
    const record = makeRecord({ job_company: null, job_summary: null });
    const base = toInterviewResponse(record).context;
    const { payload } = buildAiEvaluationInput(record);
    expect(payload.context).toEqual({ ...base, company: '', summary: '' });
    expect(payload.context.location).toBe('Brasília');
  });

  it('aceita localização, contrato e modalidade ausentes', () => {
    const { payload } = buildAiEvaluationInput(
      makeRecord({
        job_location: null,
        job_contract_type: null,
        job_work_mode: null,
      }),
    );
    expect(payload.context.location).toBeNull();
    expect(payload.context.contractType).toBeNull();
    expect(payload.context.workMode).toBeNull();
  });

  it('não altera o registro recebido', () => {
    const record = makeRecord();
    const snapshot = JSON.stringify(record);
    buildAiEvaluationInput(record);
    expect(JSON.stringify(record)).toBe(snapshot);
  });

  it('o payload montado cumpre o contrato do endpoint /evaluate (EvaluateDto)', async () => {
    const { payload } = buildAiEvaluationInput(makeRecord());
    const dto = plainToInstance(EvaluateDto, payload);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors).toEqual([]);
  });

  it('as referências montadas fecham o ciclo com o normalizador da R2', () => {
    const { payload, questionRefs } = buildAiEvaluationInput(makeRecord());
    const labels = Object.values(AI_CRITERION_LABELS);
    const raw: PythonEvaluationResponse = {
      scores: Object.fromEntries(labels.map((label) => [label, 7.5])),
      overallScore: 7.5,
      strengths: [],
      improvements: ['Melhorar'],
      recommendations: ['Praticar'],
      summary: 'Resumo.',
      questionsEvaluation: payload.answers.map((answer) => ({
        questionId: answer.questionId,
        score: 7,
        reason: 'ok',
        positives: [],
        improvements: ['x'],
        suggestion: 'y',
      })),
    };
    const normalized = normalizeAiEvaluation(raw, questionRefs);
    expect(normalized.questionsEvaluation.map((q) => q.questionId)).toEqual(
      QUESTION_IDS,
    );
    expect(normalized.overallScore).toBe(7.5);
  });
});

describe('buildAiEvaluationInput — leitura do banco', () => {
  it('a projeção do Prisma é compatível com o registro esperado (checagem de tipos)', () => {
    const accept = (
      row: Prisma.interviewGetPayload<{
        select: typeof AI_EVALUATION_INPUT_SELECT;
      }>,
    ) => buildAiEvaluationInput(row);
    expect(typeof accept).toBe('function');
  });

  it('lê só a resposta oficial: o rascunho nunca é selecionado', () => {
    const select = AI_EVALUATION_INPUT_SELECT.questions.select;
    expect(select.answer_text).toBe(true);
    expect(Object.keys(select)).not.toContain('draft_text');
    expect(Object.keys(select)).not.toContain('draft_updated_at');
    expect(AI_EVALUATION_INPUT_SELECT.questions.orderBy).toEqual({
      position: 'asc',
    });
  });

  it('não pede campos de avaliação humana nem de candidato', () => {
    const keys = Object.keys(AI_EVALUATION_INPUT_SELECT);
    expect(keys).not.toContain('candidate_user_id');
    expect(keys).not.toContain('evaluator_profile_id');
  });
});

describe('buildAiEvaluationInput — estado da entrevista', () => {
  it('modalidade HUMAN ou ausente => WRONG_EVALUATION_MODE', () => {
    expectFailure(
      makeRecord({ evaluation_mode: 'HUMAN' }),
      'WRONG_EVALUATION_MODE',
    );
    expectFailure(
      makeRecord({ evaluation_mode: null }),
      'WRONG_EVALUATION_MODE',
    );
  });

  it.each([
    'IN_PROGRESS',
    'PENDING_ASSIGNMENT',
    'ASSIGNED',
    'COMPLETED',
    'CANCELLED',
  ])('status %s => INVALID_INTERVIEW_STATE', (status) => {
    expectFailure(makeRecord({ status }), 'INVALID_INTERVIEW_STATE', 'status');
  });

  it('já existe avaliação (qualquer estado) => EVALUATION_ALREADY_EXISTS', () => {
    expectFailure(
      makeRecord({ evaluation: { evaluation_id: QUESTION_IDS[0] } }),
      'EVALUATION_ALREADY_EXISTS',
    );
  });

  it('identificador da entrevista inválido => INVALID_INTERVIEW', () => {
    expectFailure(
      makeRecord({ interview_id: 'nao-e-uuid' }),
      'INVALID_INTERVIEW',
    );
  });
});

describe('buildAiEvaluationInput — perguntas e vínculos', () => {
  it.each([0, 1, 4, 6])(
    '%i perguntas => INVALID_QUESTIONS (sempre exatamente cinco)',
    (count) => {
      const base = makeQuestions();
      const questions = Array.from({ length: count }, (_, index) => ({
        ...base[index % base.length],
        question_id: `00000000-0000-4000-8000-0000000001${String(index).padStart(2, '0')}`,
        position: index + 1,
      }));
      expectFailure(
        makeRecord({ questions }),
        'INVALID_QUESTIONS',
        'questions',
      );
    },
  );

  it('posição repetida, com lacuna ou fora de 1..5 => INVALID_QUESTIONS', () => {
    expectFailure(
      withQuestion(4, { position: 4 }),
      'INVALID_QUESTIONS',
      'questions[4].position',
    );
    expectFailure(
      withQuestion(4, { position: 6 }),
      'INVALID_QUESTIONS',
      'questions[4].position',
    );
    expectFailure(
      withQuestion(0, { position: 0 }),
      'INVALID_QUESTIONS',
      'questions[0].position',
    );
  });

  it('UUID repetido ou inválido => INVALID_QUESTIONS', () => {
    expectFailure(
      withQuestion(1, { question_id: QUESTION_IDS[0] }),
      'INVALID_QUESTIONS',
      'questions[1].questionId',
    );
    expectFailure(
      withQuestion(2, { question_id: 'abc' }),
      'INVALID_QUESTIONS',
      'questions[2].questionId',
    );
  });

  it('pergunta de outra entrevista => INVALID_QUESTIONS', () => {
    expectFailure(
      withQuestion(3, { interview_id: OTHER_INTERVIEW_ID }),
      'INVALID_QUESTIONS',
      'questions[3].interviewId',
    );
  });

  it('tipo de pergunta desconhecido => INVALID_QUESTION_TYPE', () => {
    expectFailure(
      withQuestion(0, { question_type: 'OTHER' }),
      'INVALID_QUESTION_TYPE',
      'questions[0].questionType',
    );
  });

  it('texto da pergunta em branco ou acima de 500 caracteres', () => {
    expectFailure(
      withQuestion(0, { question_text: '   ' }),
      'INVALID_QUESTIONS',
      'questions[0].text',
    );
    expectFailure(
      withQuestion(0, {
        question_text: 'a'.repeat(FLOW_LIMITS.questionText + 1),
      }),
      'TEXT_TOO_LONG',
      'questions[0].text',
    );
    expect(() =>
      buildAiEvaluationInput(
        withQuestion(0, {
          question_text: 'a'.repeat(FLOW_LIMITS.questionText),
        }),
      ),
    ).not.toThrow();
  });
});

describe('buildAiEvaluationInput — respostas', () => {
  it.each([
    ['ausente (null)', null],
    ['vazia', ''],
    ['só espaços e quebras', ' \n\t '],
  ])('resposta %s => MISSING_ANSWER, sem montar payload', (_label, answer) => {
    expectFailure(
      withQuestion(2, { answer_text: answer }),
      'MISSING_ANSWER',
      'questions[2].answer',
    );
  });

  it('resposta acima de 1000 caracteres é rejeitada e nunca cortada; o limite exato passa', () => {
    expectFailure(
      withQuestion(1, { answer_text: 'a'.repeat(FLOW_LIMITS.answer + 1) }),
      'TEXT_TOO_LONG',
      'questions[1].answer',
    );
    const exact = 'a'.repeat(FLOW_LIMITS.answer);
    const { payload } = buildAiEvaluationInput(
      withQuestion(1, { answer_text: exact }),
    );
    expect(payload.answers[1].answer).toBe(exact);
  });

  it('o limite conta caracteres (pontos de código), como a coluna VARCHAR', () => {
    const emojis = '😀'.repeat(FLOW_LIMITS.answer);
    expect(() =>
      buildAiEvaluationInput(withQuestion(0, { answer_text: emojis })),
    ).not.toThrow();
    expectFailure(
      withQuestion(0, { answer_text: `${emojis}😀` }),
      'TEXT_TOO_LONG',
    );
  });
});

describe('buildAiEvaluationInput — contexto da vaga', () => {
  it('título em branco => INVALID_CONTEXT; acima de 80 caracteres => TEXT_TOO_LONG', () => {
    expectFailure(
      makeRecord({ job_title: '  ' }),
      'INVALID_CONTEXT',
      'context.title',
    );
    expectFailure(
      makeRecord({ job_title: 'a'.repeat(JOB_LIMITS.title + 1) }),
      'TEXT_TOO_LONG',
      'context.title',
    );
  });

  it('URL de origem vazia ou modalidade desconhecida => INVALID_CONTEXT', () => {
    expectFailure(
      makeRecord({ job_source_url: '' }),
      'INVALID_CONTEXT',
      'context.sourceUrl',
    );
    expectFailure(
      makeRecord({ job_work_mode: 'MARS' }),
      'INVALID_CONTEXT',
      'context.workMode',
    );
  });

  it('listas acima do limite de itens ou de tamanho => TEXT_TOO_LONG', () => {
    expectFailure(
      makeRecord({
        job_activities: Array.from(
          { length: JOB_LIMITS.listMaxItems + 1 },
          () => 'x',
        ),
      }),
      'TEXT_TOO_LONG',
      'context.activities',
    );
    expectFailure(
      makeRecord({
        job_requirements: ['x'.repeat(JOB_LIMITS.listItemLength + 1)],
      }),
      'TEXT_TOO_LONG',
      'context.requirements',
    );
  });

  it('listas ausentes ou malformadas no JSON viram listas vazias (mesma projeção da entrevista)', () => {
    const { payload } = buildAiEvaluationInput(
      makeRecord({ job_activities: null, job_requirements: { a: 1 } }),
    );
    expect(payload.context.activities).toEqual([]);
    expect(payload.context.requirements).toEqual([]);
  });
});

describe('buildAiEvaluationInput — privacidade dos erros', () => {
  it('mensagem e caminho nunca contêm o texto do candidato nem da vaga', () => {
    const cases = [
      withQuestion(0, { answer_text: null }),
      withQuestion(1, { answer_text: SENSITIVE.repeat(200) }),
      withQuestion(2, { question_text: SENSITIVE.repeat(50) }),
      makeRecord({ job_title: SENSITIVE.repeat(10) }),
    ];
    for (const record of cases) {
      const error = failure(record);
      expect(error.message).not.toContain(SENSITIVE);
      expect(error.path).not.toContain(SENSITIVE);
    }
  });
});
