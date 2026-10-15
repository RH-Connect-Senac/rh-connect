// O InterviewsAiService importa `@nestjs/config` (ESM no Jest): isolado como nos demais specs.
jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {
    get() {
      return undefined;
    }
  },
}));

import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  InternalServerErrorException,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { EVALUATION_CRITERIA } from '../evaluator-interviews/evaluation-criteria';
import { AI_CRITERION_LABELS } from './ai-evaluation.types';
import {
  AI_EVALUATION_PIPELINE_SELECT,
  AiEvaluationPipelineService,
  type AiEvaluationPipelineResult,
} from './ai-evaluation-pipeline.service';
import {
  AiEvaluationPersistenceError,
  type AiEvaluationPersistErrorCode,
  type AiEvaluationPersistStep,
} from './ai-evaluation-persistence.types';

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_INTERVIEW_ID = '22222222-2222-4222-8222-222222222222';
const EVALUATION_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const QUESTION_IDS = [1, 2, 3, 4, 5].map(
  (n) => `00000000-0000-4000-8000-00000000000${n}`,
);
const TYPES = ['TECHNICAL', 'TECHNICAL', 'BEHAVIORAL', 'BEHAVIORAL', 'CAREER'];
const SECRET = 'TEXTO-SENSIVEL-DO-CANDIDATO';

const decimal = (value: number) => ({ toNumber: () => value });

function makeQuestions(interviewId = INTERVIEW_ID) {
  return QUESTION_IDS.map((id, index) => ({
    question_id: id,
    interview_id: interviewId,
    position: index + 1,
    question_type: TYPES[index],
    question_text: `Pergunta ${index + 1}?`,
    answer_text: `Resposta ${index + 1} ${SECRET}.`,
  }));
}

// Avaliação gravada pela persistência da IA (formato que `isStoredEvaluationConsistent` aceita).
function makeStoredEvaluation(overrides: Record<string, unknown> = {}) {
  return {
    evaluation_id: EVALUATION_ID,
    status: 'COMPLETED',
    criteria_scores: Object.fromEntries(
      EVALUATION_CRITERIA.map((criterion) => [criterion.key, 7.5]),
    ),
    overall_score: decimal(7.5),
    summary: 'Resumo.',
    strengths: ['Forte'],
    improvements: ['Melhoria'],
    recommendations: ['Recomendação'],
    question_evaluations: QUESTION_IDS.map((id) => ({
      question_id: id,
      score: decimal(7),
      reason: 'ok',
      positives: [],
      improvements: ['x'],
      suggestion: 'y',
    })),
    ...overrides,
  };
}

function makeRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-01-01T00:00:00.000Z');
  return {
    interview_id: INTERVIEW_ID,
    status: 'PENDING_AI_EVALUATION',
    evaluation_mode: 'AI',
    job_title: 'Desenvolvedor Back-end',
    job_company: 'Empresa Exemplo',
    job_summary: 'Resumo da vaga.',
    job_activities: ['Criar APIs'],
    job_requirements: ['Node.js'],
    job_location: null,
    job_contract_type: null,
    job_work_mode: null,
    job_source_url: 'https://example.invalid/vaga',
    submitted_at: now,
    created_at: now,
    updated_at: now,
    questions: makeQuestions(),
    evaluation: null,
    ...overrides,
  };
}

// Resposta do Python no formato do contrato (rótulos em português).
function pythonResponse(overrides: Record<string, unknown> = {}) {
  return {
    scores: Object.fromEntries(
      Object.values(AI_CRITERION_LABELS).map((label) => [label, 7.5]),
    ),
    overallScore: 7.5,
    strengths: [`Forte ${SECRET}`],
    improvements: ['Melhoria'],
    recommendations: ['Recomendação'],
    summary: `Resumo ${SECRET}`,
    questionsEvaluation: [1, 2, 3, 4, 5].map((id) => ({
      questionId: id,
      score: 7,
      reason: `Motivo ${SECRET}`,
      positives: id % 2 ? [] : ['Ponto'],
      improvements: ['Melhorar'],
      suggestion: 'Sugestão',
    })),
    ...overrides,
  };
}

function persistError(
  code: AiEvaluationPersistErrorCode,
  step: AiEvaluationPersistStep = 'persist' as AiEvaluationPersistStep,
) {
  return new AiEvaluationPersistenceError(code, step);
}

function setup(row: unknown = makeRow()) {
  const prisma = {
    interview: { findUnique: jest.fn().mockResolvedValue(row) },
  };
  const ai = { evaluate: jest.fn().mockResolvedValue(pythonResponse()) };
  const persistence = {
    persist: jest.fn().mockResolvedValue({
      status: 'created',
      interviewId: INTERVIEW_ID,
      evaluationId: EVALUATION_ID,
    }),
  };
  const make = () =>
    new AiEvaluationPipelineService(
      prisma as never,
      ai as never,
      persistence as never,
    );
  return { prisma, ai, persistence, service: make(), make };
}

function failed(result: AiEvaluationPipelineResult) {
  if (result.status !== 'failed') {
    throw new Error(`esperava failed, veio ${result.status}`);
  }
  return result;
}

let logSpy: jest.SpyInstance;
let warnSpy: jest.SpyInstance;
let errorSpy: jest.SpyInstance;

beforeEach(() => {
  logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
});

afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

function allLogs() {
  return [...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls]
    .flat()
    .map(String)
    .join('\n');
}

describe('AiEvaluationPipelineService: sucesso', () => {
  it('carrega, chama a IA uma vez, normaliza e persiste', async () => {
    const { service, prisma, ai, persistence } = setup();

    const result = await service.process(INTERVIEW_ID);

    expect(result).toMatchObject({
      status: 'persisted',
      interviewId: INTERVIEW_ID,
      evaluationId: EVALUATION_ID,
    });
    expect(typeof (result as { aiDurationMs: number }).aiDurationMs).toBe(
      'number',
    );
    expect(prisma.interview.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.interview.findUnique).toHaveBeenCalledWith({
      where: { interview_id: INTERVIEW_ID },
      select: AI_EVALUATION_PIPELINE_SELECT,
    });
    expect(ai.evaluate).toHaveBeenCalledTimes(1);
    expect(persistence.persist).toHaveBeenCalledTimes(1);
  });

  it('envia ao Python o payload do builder: contexto e cinco respostas (questionId = posição)', async () => {
    const { service, ai } = setup();
    await service.process(INTERVIEW_ID);

    const payload = ai.evaluate.mock.calls[0][0] as {
      context: { title: string };
      answers: Array<{
        questionId: number;
        questionType: string;
        answer: string;
      }>;
    };
    expect(payload.context.title).toBe('Desenvolvedor Back-end');
    expect(payload.answers.map((a) => a.questionId)).toEqual([1, 2, 3, 4, 5]);
    expect(payload.answers.map((a) => a.questionType)).toEqual([
      'Tecnica',
      'Tecnica',
      'Comportamental',
      'Comportamental',
      'Carreira',
    ]);
    expect(payload.answers[0].answer).toBe(`Resposta 1 ${SECRET}.`);
  });

  it('persiste a avaliação NORMALIZADA (UUIDs reais, chaves canônicas, nota do Python preservada)', async () => {
    const { service, persistence } = setup();
    await service.process(INTERVIEW_ID);

    const [interviewId, normalized] = persistence.persist.mock.calls[0] as [
      string,
      {
        criteriaScores: Record<string, number>;
        overallScore: number;
        questionsEvaluation: Array<{ questionId: string; position: number }>;
      },
    ];
    expect(interviewId).toBe(INTERVIEW_ID);
    expect(Object.keys(normalized.criteriaScores).sort()).toEqual(
      EVALUATION_CRITERIA.map((c) => c.key).sort(),
    );
    expect(normalized.overallScore).toBe(7.5);
    expect(normalized.questionsEvaluation.map((q) => q.questionId)).toEqual(
      QUESTION_IDS,
    );
  });

  it('aceita notas decimais, 0 e 10 e listas vazias (contrato da R2)', async () => {
    const { service, ai, persistence } = setup();
    ai.evaluate.mockResolvedValue(
      pythonResponse({
        scores: Object.fromEntries(
          Object.values(AI_CRITERION_LABELS).map((label, index) => [
            label,
            [0, 10, 4.5, 6.5, 8.5, 9.5, 7][index],
          ]),
        ),
        overallScore: 6.6,
        strengths: [],
        questionsEvaluation: [0, 10, 4.5, 6.5, 7.5].map((score, index) => ({
          questionId: index + 1,
          score,
          reason: 'ok',
          positives: [],
          improvements: [],
          suggestion: '',
        })),
      }),
    );

    const result = await service.process(INTERVIEW_ID);

    expect(result.status).toBe('persisted');
    expect(persistence.persist).toHaveBeenCalledTimes(1);
  });
});

describe('AiEvaluationPipelineService: idempotência e estados', () => {
  it('COMPLETED com avaliação íntegra: nada a fazer, sem chamada à IA nem persistência', async () => {
    const { service, ai, persistence } = setup(
      makeRow({ status: 'COMPLETED', evaluation: makeStoredEvaluation() }),
    );

    const result = await service.process(INTERVIEW_ID);

    expect(result).toEqual({
      status: 'nothing_to_do',
      interviewId: INTERVIEW_ID,
      reason: 'ALREADY_COMPLETED',
      evaluationId: EVALUATION_ID,
    });
    expect(ai.evaluate).not.toHaveBeenCalled();
    expect(persistence.persist).not.toHaveBeenCalled();
  });

  it.each([
    ['sem avaliação', null, 'COMPLETED_WITHOUT_EVALUATION'],
    [
      'avaliação em DRAFT',
      makeStoredEvaluation({ status: 'DRAFT' }),
      'COMPLETED_WITH_INCOMPLETE_EVALUATION',
    ],
    [
      'só quatro avaliações por pergunta',
      makeStoredEvaluation({
        question_evaluations: makeStoredEvaluation().question_evaluations.slice(
          0,
          4,
        ),
      }),
      'COMPLETED_WITH_INCOMPLETE_EVALUATION',
    ],
    [
      'critérios incompletos',
      makeStoredEvaluation({ criteria_scores: { clarity: 7 } }),
      'COMPLETED_WITH_INCOMPLETE_EVALUATION',
    ],
    [
      'nota geral ausente',
      makeStoredEvaluation({ overall_score: null }),
      'COMPLETED_WITH_INCOMPLETE_EVALUATION',
    ],
  ])(
    'COMPLETED %s => INCONSISTENT_STATE, sem IA',
    async (_label, evaluation, detail) => {
      const { service, ai, persistence } = setup(
        makeRow({ status: 'COMPLETED', evaluation }),
      );

      const result = failed(await service.process(INTERVIEW_ID));

      expect(result).toMatchObject({
        stage: 'classify',
        code: 'INCONSISTENT_STATE',
        retryable: false,
        detail,
      });
      expect(ai.evaluate).not.toHaveBeenCalled();
      expect(persistence.persist).not.toHaveBeenCalled();
    },
  );

  it('PENDING_AI_EVALUATION com avaliação já persistida => INCONSISTENT_STATE, sem IA', async () => {
    for (const evaluation of [
      makeStoredEvaluation(),
      makeStoredEvaluation({ status: 'DRAFT' }),
    ]) {
      const { service, ai, persistence } = setup(makeRow({ evaluation }));
      const result = failed(await service.process(INTERVIEW_ID));
      expect(result).toMatchObject({
        code: 'INCONSISTENT_STATE',
        detail: 'PENDING_WITH_EVALUATION',
        retryable: false,
      });
      expect(ai.evaluate).not.toHaveBeenCalled();
      expect(persistence.persist).not.toHaveBeenCalled();
    }
  });

  it.each(['IN_PROGRESS', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'CANCELLED'])(
    'status %s => INVALID_INTERVIEW_STATE, sem IA',
    async (status) => {
      const { service, ai } = setup(makeRow({ status }));
      const result = failed(await service.process(INTERVIEW_ID));
      expect(result).toMatchObject({
        code: 'INVALID_INTERVIEW_STATE',
        retryable: false,
      });
      expect(ai.evaluate).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['HUMAN', 'HUMAN'],
    ['sem modalidade', null],
  ])('modalidade %s => WRONG_EVALUATION_MODE, sem IA', async (_label, mode) => {
    const { service, ai } = setup(makeRow({ evaluation_mode: mode }));
    const result = failed(await service.process(INTERVIEW_ID));
    expect(result).toMatchObject({
      code: 'WRONG_EVALUATION_MODE',
      retryable: false,
    });
    expect(ai.evaluate).not.toHaveBeenCalled();
  });

  it('entrevista inexistente => INTERVIEW_NOT_FOUND', async () => {
    const { service, ai } = setup(null);
    const result = failed(await service.process(INTERVIEW_ID));
    expect(result).toMatchObject({
      stage: 'classify',
      code: 'INTERVIEW_NOT_FOUND',
      retryable: false,
    });
    expect(ai.evaluate).not.toHaveBeenCalled();
  });

  it.each(['abc', '', '123', INTERVIEW_ID.replace(/-/g, '')])(
    'identificador inválido %p => INVALID_INTERVIEW_ID sem consultar o banco',
    async (id) => {
      const { service, prisma, ai } = setup();
      const result = failed(await service.process(id));
      expect(result).toMatchObject({
        stage: 'validate',
        code: 'INVALID_INTERVIEW_ID',
        retryable: false,
      });
      expect(prisma.interview.findUnique).not.toHaveBeenCalled();
      expect(ai.evaluate).not.toHaveBeenCalled();
    },
  );

  it('dados que o builder recusa (resposta ausente) => INVALID_INPUT, sem IA', async () => {
    const questions = makeQuestions();
    questions[2] = { ...questions[2], answer_text: null as unknown as string };
    const { service, ai, persistence } = setup(makeRow({ questions }));

    const result = failed(await service.process(INTERVIEW_ID));

    expect(result).toMatchObject({
      stage: 'build',
      code: 'INVALID_INPUT',
      retryable: false,
      detail: 'MISSING_ANSWER@questions[2].answer',
    });
    expect(ai.evaluate).not.toHaveBeenCalled();
    expect(persistence.persist).not.toHaveBeenCalled();
  });

  it('já persistido com o mesmo conteúdo (outro executor): already_persisted', async () => {
    const { service, persistence } = setup();
    persistence.persist.mockResolvedValue({
      status: 'already_persisted',
      interviewId: INTERVIEW_ID,
      evaluationId: EVALUATION_ID,
    });
    const result = await service.process(INTERVIEW_ID);
    expect(result).toMatchObject({
      status: 'already_persisted',
      evaluationId: EVALUATION_ID,
    });
  });

  describe('EVALUATION_CONFLICT: só é "nada a fazer" se o resultado vencedor estiver íntegro', () => {
    // 1ª leitura: pendente (carregamento); 2ª leitura: a releitura de verificação.
    function conflictSetup(recheck: unknown) {
      const ctx = setup();
      ctx.prisma.interview.findUnique
        .mockReset()
        .mockResolvedValueOnce(makeRow())
        .mockResolvedValueOnce(recheck);
      ctx.persistence.persist.mockRejectedValue(
        persistError('EVALUATION_CONFLICT', 'classify'),
      );
      return ctx;
    }

    it('resultado vencedor íntegro, COMPLETED, de IA e desta entrevista => nothing_to_do com o id da avaliação', async () => {
      const { service, prisma, ai } = conflictSetup(
        makeRow({ status: 'COMPLETED', evaluation: makeStoredEvaluation() }),
      );

      const result = await service.process(INTERVIEW_ID);

      expect(result).toMatchObject({
        status: 'nothing_to_do',
        interviewId: INTERVIEW_ID,
        reason: 'COMPLETED_WITH_STORED_RESULT',
        evaluationId: EVALUATION_ID,
      });
      expect(prisma.interview.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.interview.findUnique).toHaveBeenLastCalledWith({
        where: { interview_id: INTERVIEW_ID },
        select: AI_EVALUATION_PIPELINE_SELECT,
      });
      expect(ai.evaluate).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['ainda PENDING_AI_EVALUATION sem avaliação', makeRow()],
      [
        'PENDING_AI_EVALUATION com avaliação',
        makeRow({ evaluation: makeStoredEvaluation() }),
      ],
      ['COMPLETED sem avaliação', makeRow({ status: 'COMPLETED' })],
      [
        'avaliação em DRAFT',
        makeRow({
          status: 'COMPLETED',
          evaluation: makeStoredEvaluation({ status: 'DRAFT' }),
        }),
      ],
      [
        'só quatro avaliações por pergunta',
        makeRow({
          status: 'COMPLETED',
          evaluation: makeStoredEvaluation({
            question_evaluations:
              makeStoredEvaluation().question_evaluations.slice(0, 4),
          }),
        }),
      ],
      [
        'avaliações por pergunta ligadas a perguntas de OUTRA entrevista',
        makeRow({
          status: 'COMPLETED',
          evaluation: makeStoredEvaluation({
            question_evaluations:
              makeStoredEvaluation().question_evaluations.map((item, index) =>
                index === 0
                  ? {
                      ...item,
                      question_id: '99999999-9999-4999-8999-999999999999',
                    }
                  : item,
              ),
          }),
        }),
      ],
      [
        'critérios incompletos',
        makeRow({
          status: 'COMPLETED',
          evaluation: makeStoredEvaluation({ criteria_scores: { clarity: 7 } }),
        }),
      ],
      [
        'entrevista cancelada com avaliação',
        makeRow({ status: 'CANCELLED', evaluation: makeStoredEvaluation() }),
      ],
      [
        'modalidade HUMAN',
        makeRow({
          status: 'COMPLETED',
          evaluation_mode: 'HUMAN',
          evaluation: makeStoredEvaluation(),
        }),
      ],
      [
        'registro de OUTRA entrevista',
        makeRow({
          interview_id: OTHER_INTERVIEW_ID,
          status: 'COMPLETED',
          evaluation: makeStoredEvaluation(),
        }),
      ],
    ])(
      'releitura com %s => INCONSISTENT_STATE (nunca "nada a fazer")',
      async (_label, recheck) => {
        const { service } = conflictSetup(recheck);

        const result = failed(await service.process(INTERVIEW_ID));

        expect(result).toMatchObject({
          stage: 'persist',
          code: 'INCONSISTENT_STATE',
          detail: 'CONFLICT_WITHOUT_CONSISTENT_RESULT',
          retryable: false,
        });
      },
    );

    it('entrevista some na releitura => INTERVIEW_NOT_FOUND', async () => {
      const { service } = conflictSetup(null);
      const result = failed(await service.process(INTERVIEW_ID));
      expect(result).toMatchObject({
        code: 'INTERVIEW_NOT_FOUND',
        retryable: false,
      });
    });

    it('falha ao reler => LOAD_FAILED (repetível), nunca sucesso', async () => {
      const ctx = conflictSetup(null);
      ctx.prisma.interview.findUnique
        .mockReset()
        .mockResolvedValueOnce(makeRow())
        .mockRejectedValueOnce(new Error('rede'));
      const result = failed(await ctx.service.process(INTERVIEW_ID));
      expect(result).toMatchObject({
        stage: 'persist',
        code: 'LOAD_FAILED',
        retryable: true,
      });
    });

    it('o resultado de conflito nunca carrega texto da avaliação', async () => {
      const { service } = conflictSetup(
        makeRow({ status: 'COMPLETED', evaluation: makeStoredEvaluation() }),
      );
      const result = await service.process(INTERVIEW_ID);
      expect(JSON.stringify(result)).not.toContain(SECRET);
      expect(allLogs()).not.toContain(SECRET);
    });
  });

  it('depois de concluída, uma nova execução não chama a IA de novo', async () => {
    const { service, prisma, ai } = setup();
    await service.process(INTERVIEW_ID);
    prisma.interview.findUnique.mockResolvedValue(
      makeRow({ status: 'COMPLETED', evaluation: makeStoredEvaluation() }),
    );
    const again = await service.process(INTERVIEW_ID);
    expect(again.status).toBe('nothing_to_do');
    expect(ai.evaluate).toHaveBeenCalledTimes(1);
  });
});

describe('AiEvaluationPipelineService: falhas da IA', () => {
  it.each([
    [new GatewayTimeoutException('x'), 'AI_TIMEOUT', true],
    [new ServiceUnavailableException('x'), 'AI_UNAVAILABLE', true],
    [new BadGatewayException('x'), 'AI_UPSTREAM_ERROR', true],
    [new BadRequestException('x'), 'AI_REJECTED_PAYLOAD', false],
    [new UnprocessableEntityException('x'), 'AI_REJECTED_PAYLOAD', false],
    [new InternalServerErrorException('x'), 'AI_REQUEST_FAILED', false],
    [new Error('qualquer coisa'), 'AI_REQUEST_FAILED', false],
  ])(
    '%p => %s (retryable=%s), uma única chamada e nada persistido',
    async (error, code, retryable) => {
      const { service, ai, persistence } = setup();
      ai.evaluate.mockRejectedValue(error);

      const result = failed(await service.process(INTERVIEW_ID));

      expect(result).toMatchObject({ stage: 'evaluate', code, retryable });
      expect(typeof result.aiDurationMs).toBe('number');
      expect(ai.evaluate).toHaveBeenCalledTimes(1);
      expect(persistence.persist).not.toHaveBeenCalled();
    },
  );

  it('o detalhe da falha da IA nunca carrega a mensagem recebida', async () => {
    const { service, ai } = setup();
    ai.evaluate.mockRejectedValue(
      new BadGatewayException(`erro com ${SECRET}`),
    );
    const result = failed(await service.process(INTERVIEW_ID));
    expect(JSON.stringify(result)).not.toContain(SECRET);
    expect(result.detail).toBe('http-502');
  });
});

describe('AiEvaluationPipelineService: falha de normalização', () => {
  it.each([
    ['resposta nula', null],
    ['sem critérios', pythonResponse({ scores: {} })],
    ['nota geral divergente', pythonResponse({ overallScore: 9.9 })],
    [
      'avaliações de perguntas incompletas',
      pythonResponse({
        questionsEvaluation: pythonResponse().questionsEvaluation.slice(0, 4),
      }),
    ],
    [
      'nota fora de 0 a 10',
      pythonResponse({
        questionsEvaluation: pythonResponse().questionsEvaluation.map(
          (item, index) => (index === 0 ? { ...item, score: 11 } : item),
        ),
      }),
    ],
  ])(
    '%s => AI_INVALID_RESPONSE (repetível), sem persistir',
    async (_label, raw) => {
      const { service, ai, persistence } = setup();
      ai.evaluate.mockResolvedValue(raw);

      const result = failed(await service.process(INTERVIEW_ID));

      expect(result).toMatchObject({
        stage: 'normalize',
        code: 'AI_INVALID_RESPONSE',
        retryable: true,
      });
      expect(result.detail).toMatch(/^[A-Z_]+@/);
      expect(JSON.stringify(result)).not.toContain(SECRET);
      expect(ai.evaluate).toHaveBeenCalledTimes(1);
      expect(persistence.persist).not.toHaveBeenCalled();
    },
  );

  it('a nota do Python nunca é recalculada nem corrigida: divergência é recusada', async () => {
    const { service, ai, persistence } = setup();
    ai.evaluate.mockResolvedValue(pythonResponse({ overallScore: 7.7 }));
    const result = failed(await service.process(INTERVIEW_ID));
    expect(result.code).toBe('AI_INVALID_RESPONSE');
    expect(result.detail).toContain('OVERALL_SCORE_MISMATCH');
    expect(persistence.persist).not.toHaveBeenCalled();
  });
});

describe('AiEvaluationPipelineService: falhas de persistência e do banco', () => {
  it.each([
    ['PERSISTENCE_FAILED', 'PERSISTENCE_FAILED', true],
    ['INCONSISTENT_STATE', 'INCONSISTENT_STATE', false],
    ['QUESTIONS_MISMATCH', 'PERSISTENCE_REJECTED', false],
    ['INVALID_INPUT', 'PERSISTENCE_REJECTED', false],
    ['INVALID_INTERVIEW_STATE', 'INVALID_INTERVIEW_STATE', false],
    ['WRONG_EVALUATION_MODE', 'WRONG_EVALUATION_MODE', false],
    ['INTERVIEW_NOT_FOUND', 'INTERVIEW_NOT_FOUND', false],
  ] as const)(
    'persistência %s => %s (retryable=%s)',
    async (persistCode, code, retryable) => {
      const { service, ai, persistence } = setup();
      persistence.persist.mockRejectedValue(persistError(persistCode, 'claim'));

      const result = failed(await service.process(INTERVIEW_ID));

      expect(result).toMatchObject({ stage: 'persist', code, retryable });
      expect(result.detail).toBe(`${persistCode}@claim`);
      expect(ai.evaluate).toHaveBeenCalledTimes(1);
      expect(persistence.persist).toHaveBeenCalledTimes(1);
    },
  );

  it('exceção desconhecida na persistência vira UNEXPECTED (nunca lança nem finge sucesso)', async () => {
    const { service, persistence } = setup();
    persistence.persist.mockRejectedValue(new Error(`boom ${SECRET}`));

    const result = failed(await service.process(INTERVIEW_ID));

    expect(result).toMatchObject({ code: 'UNEXPECTED', retryable: false });
    expect(allLogs()).not.toContain(SECRET);
  });

  it('falha ao ler o banco => LOAD_FAILED (repetível), sem IA', async () => {
    const { service, prisma, ai } = setup();
    prisma.interview.findUnique.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('conexão', {
        code: 'P1001',
        clientVersion: 'teste',
      }),
    );
    const result = failed(await service.process(INTERVIEW_ID));
    expect(result).toMatchObject({
      stage: 'load',
      code: 'LOAD_FAILED',
      retryable: true,
      detail: 'prisma-P1001',
    });
    expect(ai.evaluate).not.toHaveBeenCalled();
  });

  it('erro genérico ao ler o banco também é LOAD_FAILED', async () => {
    const { service, prisma } = setup();
    prisma.interview.findUnique.mockRejectedValue(new Error('x'));
    const result = failed(await service.process(INTERVIEW_ID));
    expect(result).toMatchObject({
      code: 'LOAD_FAILED',
      detail: 'prisma-UNKNOWN',
    });
  });

  it('se a IA respondeu e a persistência falhou, nada fica gravado pelo pipeline (a transação é da R3.2) e a próxima execução refaz o fluxo inteiro', async () => {
    const { service, ai, persistence } = setup();
    persistence.persist.mockRejectedValueOnce(
      persistError('PERSISTENCE_FAILED', 'claim'),
    );

    const first = failed(await service.process(INTERVIEW_ID));
    const second = await service.process(INTERVIEW_ID);

    expect(first.retryable).toBe(true);
    expect(second.status).toBe('persisted');
    expect(ai.evaluate).toHaveBeenCalledTimes(2);
  });
});

describe('AiEvaluationPipelineService: concorrência (limites reais)', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it('NO MESMO PROCESSO: duas chamadas simultâneas => uma processa, a outra é pulada (IN_FLIGHT) e a IA é chamada uma vez', async () => {
    const { service, ai, persistence } = setup();
    const gate = deferred<unknown>();
    ai.evaluate.mockReturnValue(gate.promise);

    const first = service.process(INTERVIEW_ID);
    await new Promise((resolve) => setImmediate(resolve));
    const second = await service.process(INTERVIEW_ID);

    expect(second).toEqual({
      status: 'skipped',
      interviewId: INTERVIEW_ID,
      reason: 'IN_FLIGHT',
    });
    expect(ai.evaluate).toHaveBeenCalledTimes(1);

    gate.resolve(pythonResponse());
    expect((await first).status).toBe('persisted');
    expect(persistence.persist).toHaveBeenCalledTimes(1);
  });

  it('cinco chamadas simultâneas: uma única chamada à IA e uma única persistência', async () => {
    const { service, ai, persistence } = setup();
    const gate = deferred<unknown>();
    ai.evaluate.mockReturnValue(gate.promise);

    const runs = Array.from({ length: 5 }, () => service.process(INTERVIEW_ID));
    await new Promise((resolve) => setImmediate(resolve));
    gate.resolve(pythonResponse());
    const results = await Promise.all(runs);

    expect(results.filter((r) => r.status === 'persisted')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'skipped')).toHaveLength(4);
    expect(ai.evaluate).toHaveBeenCalledTimes(1);
    expect(persistence.persist).toHaveBeenCalledTimes(1);
  });

  it('a exclusão é liberada ao terminar, inclusive após falha', async () => {
    const { service, ai } = setup();
    ai.evaluate.mockRejectedValueOnce(new GatewayTimeoutException('x'));

    expect(failed(await service.process(INTERVIEW_ID)).code).toBe('AI_TIMEOUT');
    expect((await service.process(INTERVIEW_ID)).status).toBe('persisted');
  });

  it('a exclusão é liberada mesmo se o carregamento falhar de forma inesperada', async () => {
    const { service, prisma } = setup();
    prisma.interview.findUnique.mockImplementationOnce(() => {
      throw new Error('síncrono');
    });
    expect(failed(await service.process(INTERVIEW_ID)).code).toBe(
      'LOAD_FAILED',
    );
    expect((await service.process(INTERVIEW_ID)).status).toBe('persisted');
  });

  it('entrevistas diferentes não se bloqueiam', async () => {
    const { service, prisma, ai } = setup();
    const gateA = deferred<unknown>();
    const gateB = deferred<unknown>();
    prisma.interview.findUnique.mockImplementation(
      ({ where }: { where: { interview_id: string } }) =>
        Promise.resolve(
          makeRow({
            interview_id: where.interview_id,
            questions: makeQuestions(where.interview_id),
          }),
        ),
    );
    ai.evaluate
      .mockReturnValueOnce(gateA.promise)
      .mockReturnValueOnce(gateB.promise);

    const a = service.process(INTERVIEW_ID);
    const b = service.process(OTHER_INTERVIEW_ID);
    await new Promise((resolve) => setImmediate(resolve));
    expect(ai.evaluate).toHaveBeenCalledTimes(2);

    gateA.resolve(pythonResponse());
    gateB.resolve(pythonResponse());
    expect((await a).status).toBe('persisted');
    expect((await b).status).toBe('persisted');
  });

  it('LIMITE DOCUMENTADO — entre processos: duas instâncias chamam a IA para a mesma entrevista; a persistência (UPDATE condicional) deixa gravar só uma', async () => {
    const first = setup();
    const second = setup();
    // Persistência simulada com a semântica da R3.2: o primeiro grava, o segundo
    // perde a reivindicação e recebe already_persisted (mesmo conteúdo).
    let claimed = false;
    const persist = jest.fn().mockImplementation(() => {
      const status = claimed ? 'already_persisted' : 'created';
      claimed = true;
      return Promise.resolve({
        status,
        interviewId: INTERVIEW_ID,
        evaluationId: EVALUATION_ID,
      });
    });
    first.persistence.persist = persist;
    second.persistence.persist = persist;

    const results = await Promise.all([
      first.service.process(INTERVIEW_ID),
      second.service.process(INTERVIEW_ID),
    ]);

    // Sem exclusão distribuída antes da IA: duas chamadas (custo duplicado)...
    expect(first.ai.evaluate).toHaveBeenCalledTimes(1);
    expect(second.ai.evaluate).toHaveBeenCalledTimes(1);
    // ...mas somente UMA avaliação criada.
    expect(results.map((r) => r.status).sort()).toEqual([
      'already_persisted',
      'persisted',
    ]);
  });
});

describe('AiEvaluationPipelineService: privacidade e sem retry próprio', () => {
  it('logs e resultados nunca contêm texto do candidato nem da avaliação', async () => {
    const scenarios: Array<() => Promise<AiEvaluationPipelineResult>> = [
      () => setup().service.process(INTERVIEW_ID),
      () => {
        const ctx = setup();
        ctx.ai.evaluate.mockResolvedValue(pythonResponse({ overallScore: 1 }));
        return ctx.service.process(INTERVIEW_ID);
      },
      () => {
        const ctx = setup();
        ctx.ai.evaluate.mockRejectedValue(new BadGatewayException(SECRET));
        return ctx.service.process(INTERVIEW_ID);
      },
      () => {
        const ctx = setup();
        ctx.persistence.persist.mockRejectedValue(new Error(SECRET));
        return ctx.service.process(INTERVIEW_ID);
      },
    ];
    for (const run of scenarios) {
      const result = await run();
      expect(JSON.stringify(result)).not.toContain(SECRET);
    }
    expect(allLogs()).not.toContain(SECRET);
    expect(allLogs()).toContain(`interviewId=${INTERVIEW_ID}`);
  });

  it('em nenhuma falha o pipeline repete a chamada à IA ou à persistência', async () => {
    const failures: Array<(ctx: ReturnType<typeof setup>) => void> = [
      (ctx) =>
        ctx.ai.evaluate.mockRejectedValue(new GatewayTimeoutException('x')),
      (ctx) => ctx.ai.evaluate.mockResolvedValue(null),
      (ctx) =>
        ctx.persistence.persist.mockRejectedValue(
          persistError('PERSISTENCE_FAILED', 'claim'),
        ),
    ];
    for (const arrange of failures) {
      const ctx = setup();
      arrange(ctx);
      await ctx.service.process(INTERVIEW_ID);
      expect(ctx.ai.evaluate).toHaveBeenCalledTimes(1);
      expect(ctx.persistence.persist.mock.calls.length).toBeLessThanOrEqual(1);
    }
  });

  it('o pipeline não conhece chaves da Groq nem altera a nota: só repassa ao normalizador', () => {
    const source = require('fs').readFileSync(
      require('path').join(__dirname, 'ai-evaluation-pipeline.service.ts'),
      'utf8',
    ) as string;
    // Só o CÓDIGO conta: comentários explicam o que NÃO é feito aqui.
    const code = source
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(code).not.toMatch(
      /GROQ|api[_-]?key|setTimeout|setInterval|retry\(|while\s*\(true\)/i,
    );
  });
});
