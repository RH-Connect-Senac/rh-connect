import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { INTERVIEW_ERROR_CODES } from './interview-flow';
import {
  CANDIDATE_DETAIL_SELECT,
  HISTORY_LIST_SELECT,
  MAX_HISTORY_SIZE,
  RESULT_SELECT,
} from './interview-history';
import { InterviewsService } from './interviews.service';

// 6A.1: leitura real do candidato (histórico, acompanhamento e resultado).
// Somente projeção do que já está persistido: nada chama Python/Groq nem grava.

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ID = '22222222-2222-4222-8222-222222222222';
const created = new Date('2026-10-09T12:00:00.000Z');
const submitted = new Date('2026-10-09T13:00:00.000Z');
const assigned = new Date('2026-10-10T09:00:00.000Z');
const completed = new Date('2026-10-11T15:30:00.000Z');

const FULL_SCORES = {
  clarity: 8,
  coherence: 7,
  objectivity: 9,
  domain_knowledge: 6,
  organization: 8,
  requirements_alignment: 7,
  examples: 5,
};

function makeListRecord(overrides: Record<string, unknown> = {}) {
  return {
    interview_id: INTERVIEW_ID,
    status: 'PENDING_ASSIGNMENT',
    evaluation_mode: 'HUMAN',
    job_title: 'Desenvolvedor Front-end',
    job_company: 'ACME',
    job_location: 'Brasília - DF',
    job_contract_type: 'CLT',
    job_work_mode: null,
    submitted_at: submitted,
    created_at: created,
    updated_at: submitted,
    assigned_at: null,
    evaluation: null,
    _count: { questions: 5 },
    ...overrides,
  };
}

function makeResultRecord(overrides: Record<string, unknown> = {}) {
  return {
    interview_id: INTERVIEW_ID,
    status: 'COMPLETED',
    evaluation_mode: 'HUMAN',
    job_title: 'Desenvolvedor Front-end',
    job_company: 'ACME',
    job_summary: 'Resumo da vaga',
    job_activities: ['Criar telas'],
    job_requirements: ['React'],
    job_location: 'Brasília - DF',
    job_contract_type: 'CLT',
    job_work_mode: null,
    job_source_url: 'https://empregare.example/vaga/1',
    submitted_at: submitted,
    created_at: created,
    updated_at: completed,
    assigned_at: assigned,
    evaluation: {
      status: 'COMPLETED',
      criteria_scores: FULL_SCORES,
      summary: 'Bom desempenho geral.',
      overall_score: { toString: () => '7.1' },
      completed_at: completed,
    },
    questions: [
      {
        question_id: 'q-1',
        position: 1,
        question_type: 'TECHNICAL',
        question_text: 'Fale de React.',
        answer_text: 'Uso React há 3 anos.',
        answered_at: created,
      },
      {
        question_id: 'q-2',
        position: 2,
        question_type: 'BEHAVIORAL',
        question_text: 'Conte um conflito.',
        answer_text: 'Conversei com o time.',
        answered_at: created,
      },
    ],
    ...overrides,
  };
}

function makeService() {
  // O mock só expõe o que a leitura precisa: qualquer outra consulta (ex.: uma
  // por pergunta, N+1) ou chamada de escrita lançaria TypeError e falharia.
  const prisma = {
    interview: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const service = new InterviewsService(prisma as unknown as PrismaService);
  return { service, prisma };
}

async function failureOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('esperava uma rejeição');
}

describe('InterviewsService.listHistory (GET /interviews)', () => {
  it('filtra pelo dono (JWT), mais recente primeiro, uma lista + um count', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([]);
    prisma.interview.count.mockResolvedValue(0);

    await service.listHistory(42);

    expect(prisma.interview.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.interview.count).toHaveBeenCalledTimes(1);
    const args = prisma.interview.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ candidate_user_id: 42 });
    expect(args.orderBy).toEqual([
      { created_at: 'desc' },
      { interview_id: 'desc' },
    ]);
    expect(args.take).toBe(MAX_HISTORY_SIZE);
    expect(args.select).toBe(HISTORY_LIST_SELECT);
    expect(prisma.interview.count.mock.calls[0][0].where).toEqual({
      candidate_user_id: 42,
    });
  });

  it('lista vazia => total 0 e interviews []', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([]);
    prisma.interview.count.mockResolvedValue(0);

    await expect(service.listHistory(42)).resolves.toEqual({
      total: 0,
      interviews: [],
    });
  });

  it('não carrega perguntas/respostas nem campos internos (só a contagem)', () => {
    expect(HISTORY_LIST_SELECT).not.toHaveProperty('questions');
    expect(HISTORY_LIST_SELECT).not.toHaveProperty('candidate_user_id');
    expect(HISTORY_LIST_SELECT).not.toHaveProperty('evaluator_profile_id');
    expect(HISTORY_LIST_SELECT).not.toHaveProperty('assigned_by_user_id');
    expect(HISTORY_LIST_SELECT._count).toEqual({
      select: { questions: true },
    });
    // não carrega o parecer nem as notas por critério: só o resumo mínimo.
    expect(HISTORY_LIST_SELECT.evaluation.select).toEqual({
      status: true,
      overall_score: true,
      completed_at: true,
    });
  });

  it('mantém a ordem recebida do banco e devolve o contrato do item', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      makeListRecord({ interview_id: OTHER_ID }),
      makeListRecord({ interview_id: INTERVIEW_ID }),
    ]);
    prisma.interview.count.mockResolvedValue(2);

    const result = await service.listHistory(42);

    expect(result.interviews.map((item) => item.id)).toEqual([
      OTHER_ID,
      INTERVIEW_ID,
    ]);
    expect(result.interviews[0]).toEqual({
      id: OTHER_ID,
      status: 'PENDING_ASSIGNMENT',
      evaluationMode: 'HUMAN',
      title: 'Desenvolvedor Front-end',
      company: 'ACME',
      location: 'Brasília - DF',
      contractType: 'CLT',
      workMode: null,
      submittedAt: submitted,
      createdAt: created,
      updatedAt: submitted,
      assignedAt: null,
      completedAt: null,
      questionCount: 5,
      overallScore: null,
      resultAvailable: false,
    });
  });

  it('total é a contagem real, mesmo com a lista limitada', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([makeListRecord()]);
    prisma.interview.count.mockResolvedValue(350);

    const result = await service.listHistory(42);

    expect(result.total).toBe(350);
    expect(result.interviews).toHaveLength(1);
  });

  it('trata todos os status conscientemente: nenhum é escondido; só HUMAN COMPLETED com avaliação concluída tem resultado', async () => {
    const { service, prisma } = makeService();
    const done = {
      status: 'COMPLETED',
      overall_score: { toString: () => '7.1' },
      completed_at: completed,
    };
    prisma.interview.findMany.mockResolvedValue([
      makeListRecord({
        interview_id: 'a',
        status: 'IN_PROGRESS',
        evaluation_mode: null,
        submitted_at: null,
      }),
      makeListRecord({ interview_id: 'b', status: 'PENDING_ASSIGNMENT' }),
      makeListRecord({
        interview_id: 'c',
        status: 'ASSIGNED',
        assigned_at: assigned,
      }),
      makeListRecord({
        interview_id: 'd',
        status: 'PENDING_AI_EVALUATION',
        evaluation_mode: 'AI',
      }),
      makeListRecord({
        interview_id: 'e',
        status: 'COMPLETED',
        assigned_at: assigned,
        evaluation: done,
      }),
      makeListRecord({
        interview_id: 'f',
        status: 'CANCELLED',
        evaluation_mode: null,
        submitted_at: null,
      }),
    ]);
    prisma.interview.count.mockResolvedValue(6);

    const result = await service.listHistory(42);

    expect(
      result.interviews.map((item) => [item.id, item.status]),
    ).toEqual([
      ['a', 'IN_PROGRESS'],
      ['b', 'PENDING_ASSIGNMENT'],
      ['c', 'ASSIGNED'],
      ['d', 'PENDING_AI_EVALUATION'],
      ['e', 'COMPLETED'],
      ['f', 'CANCELLED'],
    ]);
    expect(result.interviews.map((item) => item.resultAvailable)).toEqual([
      false,
      false,
      false,
      false,
      true,
      false,
    ]);
    const completedItem = result.interviews[4];
    expect(completedItem.overallScore).toBe(7.1);
    expect(completedItem.completedAt).toBe(completed);
    expect(completedItem.assignedAt).toBe(assigned);
  });

  it('rascunho da avaliação (ASSIGNED) nunca vaza nota nem data de conclusão', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      makeListRecord({
        status: 'ASSIGNED',
        assigned_at: assigned,
        evaluation: {
          status: 'DRAFT',
          overall_score: { toString: () => '9.9' },
          completed_at: null,
        },
      }),
    ]);
    prisma.interview.count.mockResolvedValue(1);

    const [item] = (await service.listHistory(42)).interviews;

    expect(item.overallScore).toBeNull();
    expect(item.completedAt).toBeNull();
    expect(item.resultAvailable).toBe(false);
  });

  it('COMPLETED sem avaliação concluída não finge resultado', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      makeListRecord({ status: 'COMPLETED', evaluation: null }),
      makeListRecord({
        status: 'COMPLETED',
        evaluation: {
          status: 'DRAFT',
          overall_score: null,
          completed_at: null,
        },
      }),
    ]);
    prisma.interview.count.mockResolvedValue(2);

    const { interviews } = await service.listHistory(42);

    expect(interviews.map((item) => item.resultAvailable)).toEqual([
      false,
      false,
    ]);
    expect(interviews.map((item) => item.overallScore)).toEqual([null, null]);
  });

  it('o item não traz perguntas, respostas nem identificadores internos', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([makeListRecord()]);
    prisma.interview.count.mockResolvedValue(1);

    const [item] = (await service.listHistory(42)).interviews;
    const keys = Object.keys(item);

    expect(keys).not.toContain('questions');
    expect(keys).not.toContain('candidate_user_id');
    expect(keys).not.toContain('evaluator_profile_id');
    expect(keys).not.toContain('criteriaScores');
    expect(keys).not.toContain('summary');
  });

  it('o dono vem só do parâmetro: outro candidato recebe a própria lista, nunca a de 42', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([]);
    prisma.interview.count.mockResolvedValue(0);

    await service.listHistory(43);

    expect(prisma.interview.findMany.mock.calls[0][0].where).toEqual({
      candidate_user_id: 43,
    });
  });
});

describe('InterviewsService.getOwned (GET /interviews/:id, acompanhamento)', () => {
  function detailRecord(overrides: Record<string, unknown> = {}) {
    return { ...makeResultRecord(), questions: undefined, ...overrides };
  }

  it('lê com ownership no WHERE e a projeção de acompanhamento', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(detailRecord());

    await service.getOwned(42, INTERVIEW_ID);

    const args = prisma.interview.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({
      interview_id: INTERVIEW_ID,
      candidate_user_id: 42,
    });
    expect(args.select).toBe(CANDIDATE_DETAIL_SELECT);
    expect(CANDIDATE_DETAIL_SELECT).not.toHaveProperty('questions');
    expect(CANDIDATE_DETAIL_SELECT).not.toHaveProperty('candidate_user_id');
    expect(CANDIDATE_DETAIL_SELECT.evaluation.select).toEqual({
      status: true,
      completed_at: true,
    });
  });

  it('mantém o contrato anterior e acrescenta assignedAt/completedAt', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(detailRecord());

    const result = await service.getOwned(42, INTERVIEW_ID);

    expect(result).toMatchObject({
      id: INTERVIEW_ID,
      status: 'COMPLETED',
      evaluationMode: 'HUMAN',
      submittedAt: submitted,
      createdAt: created,
      updatedAt: completed,
      context: { title: 'Desenvolvedor Front-end', company: 'ACME' },
      assignedAt: assigned,
      completedAt: completed,
    });
  });

  it.each([
    ['PENDING_ASSIGNMENT', null, null],
    ['ASSIGNED', assigned, null],
    ['COMPLETED', assigned, completed],
    ['CANCELLED', null, null],
    ['PENDING_AI_EVALUATION', null, null],
  ])(
    '%s é identificável pelo status (assignedAt/completedAt coerentes)',
    async (status, assignedAt, completedAt) => {
      const { service, prisma } = makeService();
      const evaluation =
        status === 'COMPLETED'
          ? { status: 'COMPLETED', completed_at: completed }
          : null;
      prisma.interview.findFirst.mockResolvedValue(
        detailRecord({ status, assigned_at: assignedAt, evaluation }),
      );

      const result = await service.getOwned(42, INTERVIEW_ID);

      expect(result.status).toBe(status);
      expect(result.assignedAt).toBe(assignedAt);
      expect(result.completedAt).toBe(completedAt);
    },
  );

  it('rascunho de avaliação não vira completedAt', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(
      detailRecord({
        status: 'ASSIGNED',
        evaluation: { status: 'DRAFT', completed_at: null },
      }),
    );

    const result = await service.getOwned(42, INTERVIEW_ID);

    expect(result.completedAt).toBeNull();
  });

  it('registro sem os campos novos (consumidores antigos) continua válido', async () => {
    const { service, prisma } = makeService();
    const legacy = detailRecord();
    delete (legacy as Record<string, unknown>).assigned_at;
    delete (legacy as Record<string, unknown>).evaluation;
    prisma.interview.findFirst.mockResolvedValue(legacy);

    const result = await service.getOwned(42, INTERVIEW_ID);

    expect(result.assignedAt).toBeNull();
    expect(result.completedAt).toBeNull();
  });

  it('entrevista de outro candidato (ou inexistente) => 404', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(null);

    await expect(service.getOwned(43, INTERVIEW_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('InterviewsService.getResult (GET /interviews/:id/result)', () => {
  it('HUMAN COMPLETED com avaliação COMPLETED devolve a projeção persistida', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(makeResultRecord());

    const result = await service.getResult(42, INTERVIEW_ID);

    expect(result.interview).toMatchObject({
      id: INTERVIEW_ID,
      status: 'COMPLETED',
      evaluationMode: 'HUMAN',
      submittedAt: submitted,
      assignedAt: assigned,
      completedAt: completed,
      context: {
        title: 'Desenvolvedor Front-end',
        company: 'ACME',
        location: 'Brasília - DF',
        contractType: 'CLT',
      },
    });
    expect(result.evaluation).toEqual({
      overallScore: 7.1,
      criteriaScores: FULL_SCORES,
      summary: 'Bom desempenho geral.',
      completedAt: completed,
    });
    expect(result.questions).toEqual([
      {
        id: 'q-1',
        position: 1,
        type: 'TECHNICAL',
        text: 'Fale de React.',
        answer: 'Uso React há 3 anos.',
        answeredAt: created,
      },
      {
        id: 'q-2',
        position: 2,
        type: 'BEHAVIORAL',
        text: 'Conte um conflito.',
        answer: 'Conversei com o time.',
        answeredAt: created,
      },
    ]);
  });

  it('NÃO inventa score humano por pergunta', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(makeResultRecord());

    const result = await service.getResult(42, INTERVIEW_ID);

    for (const question of result.questions) {
      expect(question).not.toHaveProperty('score');
      expect(question).not.toHaveProperty('evaluation');
      expect(question).not.toHaveProperty('reason');
    }
    expect(Object.keys(result.evaluation).sort()).toEqual([
      'completedAt',
      'criteriaScores',
      'overallScore',
      'summary',
    ]);
    expect(RESULT_SELECT).not.toHaveProperty('question_evaluations');
    expect(RESULT_SELECT.evaluation.select).not.toHaveProperty(
      'question_evaluations',
    );
  });

  it('uma única consulta, com dono no WHERE, avaliação e perguntas ordenadas (sem N+1)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(makeResultRecord());

    await service.getResult(42, INTERVIEW_ID);

    expect(prisma.interview.findFirst).toHaveBeenCalledTimes(1);
    const args = prisma.interview.findFirst.mock.calls[0][0];
    expect(args.where).toEqual({
      interview_id: INTERVIEW_ID,
      candidate_user_id: 42,
    });
    expect(args.select).toBe(RESULT_SELECT);
    expect(RESULT_SELECT.questions.orderBy).toEqual({ position: 'asc' });
    // só a resposta oficial: nunca o rascunho do candidato.
    expect(RESULT_SELECT.questions.select).not.toHaveProperty('draft_text');
    // nada que identifique o avaliador/admin ou o dono.
    expect(RESULT_SELECT).not.toHaveProperty('candidate_user_id');
    expect(RESULT_SELECT).not.toHaveProperty('evaluator_profile_id');
    expect(RESULT_SELECT).not.toHaveProperty('assigned_by_user_id');
  });

  it('entrevista de outro candidato => 404 sem vazar nada', async () => {
    const { service, prisma } = makeService();
    // o WHERE inclui o dono: para o candidato 43 o banco não devolve a de 42.
    prisma.interview.findFirst.mockResolvedValue(null);

    const error = await failureOf(service.getResult(43, INTERVIEW_ID));

    expect(error).toBeInstanceOf(NotFoundException);
    const text = JSON.stringify((error as NotFoundException).getResponse());
    expect(text).not.toContain('Desenvolvedor');
    expect(text).not.toContain('ACME');
    expect(text).not.toContain('Bom desempenho');
    expect(prisma.interview.findFirst.mock.calls[0][0].where).toEqual({
      interview_id: INTERVIEW_ID,
      candidate_user_id: 43,
    });
  });

  it('entrevista inexistente => 404', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(null);

    await expect(service.getResult(42, OTHER_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // Política documentada: a entrevista existe e é do candidato, mas ainda não
  // há resultado => 409 com code estável (padrão do módulo: INTERVIEW_*), nunca
  // um resultado fingido. O corpo do 409 só informa o ESTADO (sem vaga, resposta,
  // nota ou parecer).
  it.each([
    ['IN_PROGRESS', null, null],
    ['PENDING_ASSIGNMENT', 'HUMAN', null],
    ['ASSIGNED', 'HUMAN', null],
    ['PENDING_AI_EVALUATION', 'AI', null],
    ['CANCELLED', null, null],
  ])(
    '%s => 409 INTERVIEW_RESULT_NOT_AVAILABLE, sem dados da entrevista',
    async (status, mode, evaluation) => {
      const { service, prisma } = makeService();
      prisma.interview.findFirst.mockResolvedValue(
        makeResultRecord({ status, evaluation_mode: mode, evaluation }),
      );

      const error = await failureOf(service.getResult(42, INTERVIEW_ID));

      expect(error).toBeInstanceOf(ConflictException);
      const body = (error as ConflictException).getResponse() as Record<
        string,
        unknown
      >;
      expect(body.code).toBe(INTERVIEW_ERROR_CODES.resultNotAvailable);
      expect(body.code).toBe('INTERVIEW_RESULT_NOT_AVAILABLE');
      expect(body.interviewStatus).toBe(status);
      expect(body.evaluationMode).toBe(mode);
      expect(typeof body.message).toBe('string');
      const text = JSON.stringify(body);
      expect(text).not.toContain('Desenvolvedor');
      expect(text).not.toContain('Uso React');
      expect(text).not.toContain('Bom desempenho');
    },
  );

  it('mensagens distinguem cada estado', async () => {
    const { service, prisma } = makeService();
    const messages: string[] = [];
    for (const status of [
      'PENDING_ASSIGNMENT',
      'ASSIGNED',
      'PENDING_AI_EVALUATION',
      'CANCELLED',
    ]) {
      prisma.interview.findFirst.mockResolvedValue(
        makeResultRecord({ status, evaluation: null }),
      );
      const error = await failureOf(service.getResult(42, INTERVIEW_ID));
      messages.push(
        String(
          ((error as ConflictException).getResponse() as { message: string })
            .message,
        ),
      );
    }
    expect(new Set(messages).size).toBe(4);
  });

  it('COMPLETED sem avaliação, ou com avaliação ainda DRAFT => 409 (nunca resultado fingido)', async () => {
    const { service, prisma } = makeService();

    prisma.interview.findFirst.mockResolvedValue(
      makeResultRecord({ evaluation: null }),
    );
    await expect(service.getResult(42, INTERVIEW_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );

    prisma.interview.findFirst.mockResolvedValue(
      makeResultRecord({
        evaluation: {
          status: 'DRAFT',
          criteria_scores: { clarity: 9 },
          summary: 'rascunho do avaliador',
          overall_score: { toString: () => '9' },
          completed_at: null,
        },
      }),
    );
    const error = await failureOf(service.getResult(42, INTERVIEW_ID));
    expect(error).toBeInstanceOf(ConflictException);
    expect(JSON.stringify((error as ConflictException).getResponse())).not.toContain(
      'rascunho do avaliador',
    );
  });

  it('IA: sem avaliação persistida => 409; resultado de IA segue bloqueado (Fase 3/6B), mesmo com COMPLETED', async () => {
    const { service, prisma } = makeService();

    prisma.interview.findFirst.mockResolvedValue(
      makeResultRecord({
        status: 'PENDING_AI_EVALUATION',
        evaluation_mode: 'AI',
        evaluation: null,
      }),
    );
    await expect(service.getResult(42, INTERVIEW_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );

    prisma.interview.findFirst.mockResolvedValue(
      makeResultRecord({ evaluation_mode: 'AI' }),
    );
    const error = await failureOf(service.getResult(42, INTERVIEW_ID));
    expect(error).toBeInstanceOf(ConflictException);
    expect(
      ((error as ConflictException).getResponse() as { evaluationMode: string })
        .evaluationMode,
    ).toBe('AI');
  });

  it('só leitura: não chama Python/Groq (fetch) e o mock não expõe nenhuma escrita', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(makeResultRecord());
    const originalFetch = globalThis.fetch;
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      await service.getResult(42, INTERVIEW_ID);
      await service.getResult(42, INTERVIEW_ID);
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(fetchMock).not.toHaveBeenCalled();
    // `interview` só tem findMany/count/findFirst (leitura): update/create lançariam.
    expect(Object.keys(prisma.interview).sort()).toEqual([
      'count',
      'findFirst',
      'findMany',
    ]);
    expect(Object.keys(prisma)).toEqual(['interview']);
  });

  it('só chaves canônicas em ordem canônica; chave desconhecida é ignorada e nota não é recalculada', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(
      makeResultRecord({
        evaluation: {
          status: 'COMPLETED',
          criteria_scores: { examples: 5, clarity: 8, hacker: 10 },
          summary: 'ok',
          overall_score: { toString: () => '4.2' },
          completed_at: completed,
        },
      }),
    );

    const result = await service.getResult(42, INTERVIEW_ID);

    expect(Object.keys(result.evaluation.criteriaScores)).toEqual([
      'clarity',
      'examples',
    ]);
    // devolve a nota gravada (4.2), não a média dos critérios presentes (6.5).
    expect(result.evaluation.overallScore).toBe(4.2);
  });
});
