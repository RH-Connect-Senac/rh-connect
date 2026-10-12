import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { InterviewsService } from './interviews.service';

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';
const at = new Date('2026-10-09T12:00:00.000Z');

function record(overrides: Record<string, unknown> = {}) {
  return {
    interview_id: INTERVIEW_ID,
    status: 'IN_PROGRESS',
    evaluation_mode: null,
    job_title: 'Desenvolvedor Front-end',
    job_company: 'ACME',
    job_summary: null,
    job_activities: [],
    job_requirements: ['React'],
    job_location: null,
    job_contract_type: null,
    job_work_mode: null,
    job_source_url: 'https://empregare.example/vaga/1',
    submitted_at: null,
    created_at: at,
    updated_at: at,
    ...overrides,
  };
}

function makeService() {
  const prisma = {
    interview: { findFirst: jest.fn(), updateMany: jest.fn() },
    interview_question: {
      findMany: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    // O envio roda numa transação: o callback recebe o cliente transacional.
    // Por padrão ele é o próprio `prisma` simulado; os testes de transação
    // trocam por um `tx` separado para provar por onde as escritas passam.
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(
    (fn: (tx: unknown) => Promise<unknown>) => fn(prisma),
  );
  const service = new InterviewsService(prisma as unknown as PrismaService);
  return { service, prisma };
}

const answered = [{ answer_text: 'a' }, { answer_text: 'b' }];

describe('InterviewsService.setEvaluationMode', () => {
  it('grava a modalidade com dono e IN_PROGRESS no WHERE e devolve a entrevista', async () => {
    const { service, prisma } = makeService();
    prisma.interview.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview.findFirst.mockResolvedValue(
      record({ evaluation_mode: 'HUMAN' }),
    );

    const result = await service.setEvaluationMode(42, INTERVIEW_ID, 'HUMAN');

    const args = prisma.interview.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({
      interview_id: INTERVIEW_ID,
      candidate_user_id: 42,
      status: 'IN_PROGRESS',
    });
    expect(args.data.evaluation_mode).toBe('HUMAN');
    expect(args.data).not.toHaveProperty('status');
    expect(args.data).not.toHaveProperty('evaluator_profile_id');
    expect(result.evaluationMode).toBe('HUMAN');
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('404 para entrevista de outro candidato', async () => {
    const { service, prisma } = makeService();
    prisma.interview.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview.findFirst.mockResolvedValue(null);

    await expect(
      service.setEvaluationMode(99, INTERVIEW_ID, 'AI'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('409 quando a entrevista já foi enviada', async () => {
    const { service, prisma } = makeService();
    prisma.interview.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview.findFirst.mockResolvedValue({
      interview_id: INTERVIEW_ID,
      status: 'PENDING_ASSIGNMENT',
    });

    const error = await service
      .setEvaluationMode(42, INTERVIEW_ID, 'AI')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'INTERVIEW_NOT_IN_PROGRESS',
      interviewStatus: 'PENDING_ASSIGNMENT',
    });
  });
});

describe('InterviewsService.submit', () => {
  it('AI: IN_PROGRESS -> PENDING_AI_EVALUATION com submitted_at, sem avaliador', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst
      .mockResolvedValueOnce(record())
      .mockResolvedValueOnce(
        record({
          status: 'PENDING_AI_EVALUATION',
          evaluation_mode: 'AI',
          submitted_at: at,
        }),
      );
    prisma.interview_question.findMany.mockResolvedValue(answered);
    prisma.interview.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.submit(42, INTERVIEW_ID, 'AI');

    const args = prisma.interview.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({
      interview_id: INTERVIEW_ID,
      candidate_user_id: 42,
      status: 'IN_PROGRESS',
      questions: { some: {}, none: { answer_text: null } },
    });
    expect(args.data.status).toBe('PENDING_AI_EVALUATION');
    expect(args.data.evaluation_mode).toBe('AI');
    expect(args.data.submitted_at).toBeInstanceOf(Date);
    expect(args.data).not.toHaveProperty('evaluator_profile_id');
    expect(args.data).not.toHaveProperty('assigned_by_user_id');
    expect(result.status).toBe('PENDING_AI_EVALUATION');
    expect(result.submittedAt).toBe(at);
  });

  it('o envio só considera answer_text: rascunho nunca entra na regra', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst
      .mockResolvedValueOnce(record())
      .mockResolvedValueOnce(record({ status: 'PENDING_AI_EVALUATION' }));
    prisma.interview_question.findMany.mockResolvedValue(answered);
    prisma.interview.updateMany.mockResolvedValue({ count: 1 });

    await service.submit(42, INTERVIEW_ID, 'AI');

    expect(
      prisma.interview_question.findMany.mock.calls[0][0].select,
    ).toEqual({ answer_text: true });
    const where = prisma.interview.updateMany.mock.calls[0][0].where;
    expect(where.questions).toEqual({ some: {}, none: { answer_text: null } });
    expect(JSON.stringify(where)).not.toContain('draft');
  });

  it('só rascunho (sem answer_text) continua bloqueando o envio com 400', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValueOnce(record());
    // o banco pode ter draft_text, mas a leitura do envio só vê answer_text
    prisma.interview_question.findMany.mockResolvedValue([
      { answer_text: 'a' },
      { answer_text: null },
    ]);

    await expect(service.submit(42, INTERVIEW_ID, 'AI')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
    expect(prisma.interview_question.updateMany).not.toHaveBeenCalled();
  });

  it('envio bem-sucedido limpa TODOS os rascunhos da entrevista e avança a versão (não zera)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst
      .mockResolvedValueOnce(record())
      .mockResolvedValueOnce(record({ status: 'PENDING_ASSIGNMENT' }));
    prisma.interview_question.findMany.mockResolvedValue(answered);
    prisma.interview.updateMany.mockResolvedValue({ count: 1 });

    await service.submit(42, INTERVIEW_ID, 'HUMAN');

    expect(prisma.interview_question.updateMany).toHaveBeenCalledWith({
      where: { interview_id: INTERVIEW_ID },
      data: {
        draft_text: null,
        draft_updated_at: null,
        draft_version: { increment: 1 },
      },
    });
  });

  it('envio e limpeza dos rascunhos rodam na MESMA transação (cliente tx, não o prisma direto)', async () => {
    const { service, prisma } = makeService();
    const order: string[] = [];
    const tx = {
      interview: {
        updateMany: jest.fn().mockImplementation(() => {
          order.push('envio');
          return Promise.resolve({ count: 1 });
        }),
      },
      interview_question: {
        updateMany: jest.fn().mockImplementation(() => {
          order.push('limpeza');
          return Promise.resolve({ count: 5 });
        }),
      },
    };
    prisma.$transaction.mockImplementation(
      (fn: (client: unknown) => Promise<unknown>) => fn(tx),
    );
    prisma.interview.findFirst
      .mockResolvedValueOnce(record())
      .mockResolvedValueOnce(record({ status: 'PENDING_AI_EVALUATION' }));
    prisma.interview_question.findMany.mockResolvedValue(answered);

    await service.submit(42, INTERVIEW_ID, 'AI');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['envio', 'limpeza']);
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
    expect(prisma.interview_question.updateMany).not.toHaveBeenCalled();
  });

  it('falha na limpeza propaga o erro (a transação desfaz o envio): nada de entrevista enviada com rascunho', async () => {
    const { service, prisma } = makeService();
    let committed = false;
    const tx = {
      interview: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      interview_question: {
        updateMany: jest.fn().mockRejectedValue(new Error('db caiu')),
      },
    };
    // transação simulada: só "confirma" se o callback terminar sem erro
    prisma.$transaction.mockImplementation(
      async (fn: (client: unknown) => Promise<unknown>) => {
        const result = await fn(tx);
        committed = true;
        return result;
      },
    );
    prisma.interview.findFirst.mockResolvedValueOnce(record());
    prisma.interview_question.findMany.mockResolvedValue(answered);

    await expect(service.submit(42, INTERVIEW_ID, 'HUMAN')).rejects.toThrow();

    expect(committed).toBe(false);
    // não devolve estado "enviado": a entrevista nem é relida
    expect(prisma.interview.findFirst).toHaveBeenCalledTimes(1);
  });

  it('envio concorrente (0 linhas) não limpa rascunho nenhum e responde 409', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValueOnce(record());
    prisma.interview_question.findMany.mockResolvedValue(answered);
    prisma.interview.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.submit(42, INTERVIEW_ID, 'AI')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.interview_question.updateMany).not.toHaveBeenCalled();
  });

  it('HUMAN: IN_PROGRESS -> PENDING_ASSIGNMENT (ainda sem avaliador)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst
      .mockResolvedValueOnce(record())
      .mockResolvedValueOnce(
        record({
          status: 'PENDING_ASSIGNMENT',
          evaluation_mode: 'HUMAN',
          submitted_at: at,
        }),
      );
    prisma.interview_question.findMany.mockResolvedValue(answered);
    prisma.interview.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.submit(42, INTERVIEW_ID, 'HUMAN');

    const data = prisma.interview.updateMany.mock.calls[0][0].data;
    expect(data.status).toBe('PENDING_ASSIGNMENT');
    expect(data.evaluation_mode).toBe('HUMAN');
    expect(data).not.toHaveProperty('evaluator_profile_id');
    expect(result.status).toBe('PENDING_ASSIGNMENT');
  });

  it('usa a modalidade já escolhida quando o corpo não a informa', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst
      .mockResolvedValueOnce(record({ evaluation_mode: 'HUMAN' }))
      .mockResolvedValueOnce(
        record({ status: 'PENDING_ASSIGNMENT', evaluation_mode: 'HUMAN' }),
      );
    prisma.interview_question.findMany.mockResolvedValue(answered);
    prisma.interview.updateMany.mockResolvedValue({ count: 1 });

    await service.submit(42, INTERVIEW_ID);

    const data = prisma.interview.updateMany.mock.calls[0][0].data;
    expect(data.evaluation_mode).toBe('HUMAN');
    expect(data.status).toBe('PENDING_ASSIGNMENT');
  });

  it('o corpo pode trocar a modalidade antes do envio', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst
      .mockResolvedValueOnce(record({ evaluation_mode: 'HUMAN' }))
      .mockResolvedValueOnce(
        record({ status: 'PENDING_AI_EVALUATION', evaluation_mode: 'AI' }),
      );
    prisma.interview_question.findMany.mockResolvedValue(answered);
    prisma.interview.updateMany.mockResolvedValue({ count: 1 });

    await service.submit(42, INTERVIEW_ID, 'AI');

    expect(prisma.interview.updateMany.mock.calls[0][0].data.status).toBe(
      'PENDING_AI_EVALUATION',
    );
  });

  it('404 para entrevista de outro candidato, sem atualizar nada', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(null);

    await expect(service.submit(99, INTERVIEW_ID, 'AI')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.interview.findFirst.mock.calls[0][0].where).toEqual({
      interview_id: INTERVIEW_ID,
      candidate_user_id: 99,
    });
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
  });

  it('400 sem modalidade escolhida nem informada', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(record());

    await expect(service.submit(42, INTERVIEW_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
  });

  it('409 sem perguntas geradas', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(record());
    prisma.interview_question.findMany.mockResolvedValue([]);

    await expect(service.submit(42, INTERVIEW_ID, 'AI')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
  });

  it('400 com pergunta sem resposta', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(record());
    prisma.interview_question.findMany.mockResolvedValue([
      { answer_text: 'ok' },
      { answer_text: null },
    ]);

    await expect(service.submit(42, INTERVIEW_ID, 'AI')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
  });

  it('409 se o UPDATE atômico não alterar nada (envio/resposta concorrente)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(record());
    prisma.interview_question.findMany.mockResolvedValue(answered);
    prisma.interview.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.submit(42, INTERVIEW_ID, 'AI')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('reenviar entrevista já enviada, sem trocar a modalidade, devolve o estado atual', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(
      record({
        status: 'PENDING_ASSIGNMENT',
        evaluation_mode: 'HUMAN',
        submitted_at: at,
      }),
    );

    const withoutBody = await service.submit(42, INTERVIEW_ID);
    const sameMode = await service.submit(42, INTERVIEW_ID, 'HUMAN');

    expect(withoutBody.status).toBe('PENDING_ASSIGNMENT');
    expect(sameMode.status).toBe('PENDING_ASSIGNMENT');
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
    expect(prisma.interview_question.findMany).not.toHaveBeenCalled();
  });

  it('409 ao tentar trocar a modalidade depois do envio', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(
      record({
        status: 'PENDING_AI_EVALUATION',
        evaluation_mode: 'AI',
        submitted_at: at,
      }),
    );

    const error = await service
      .submit(42, INTERVIEW_ID, 'HUMAN')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'INTERVIEW_NOT_IN_PROGRESS',
    });
    expect(prisma.interview.updateMany).not.toHaveBeenCalled();
  });
});
