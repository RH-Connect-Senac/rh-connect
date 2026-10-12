import type { PrismaService } from '../prisma/prisma.service';
import { InterviewsService } from './interviews.service';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '33333333-3333-4333-8333-333333333333';
const d = (iso: string) => new Date(iso);

function row(overrides: Record<string, unknown> = {}) {
  return {
    interview_id: ID_A,
    status: 'IN_PROGRESS',
    evaluation_mode: 'HUMAN',
    job_title: 'Desenvolvedor Front-end',
    job_company: 'ACME',
    created_at: d('2026-10-09T12:00:00.000Z'),
    questions: [] as Array<Record<string, unknown>>,
    ...overrides,
  };
}

function question(overrides: Record<string, unknown> = {}) {
  return {
    answer_text: null,
    draft_text: null,
    draft_updated_at: null,
    ...overrides,
  };
}

function makeService() {
  const prisma = { interview: { findMany: jest.fn() } };
  const service = new InterviewsService(prisma as unknown as PrismaService);
  return { service, prisma };
}

describe('InterviewsService.listInProgress', () => {
  it('filtra por dono (JWT) e SOMENTE IN_PROGRESS, mais recente primeiro', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([]);

    await service.listInProgress(42);

    const args = prisma.interview.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      candidate_user_id: 42,
      status: 'IN_PROGRESS',
    });
    expect(args.orderBy).toEqual({ created_at: 'desc' });
  });

  it('lista vazia quando não há entrevista em andamento', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([]);
    await expect(service.listInProgress(42)).resolves.toEqual([]);
  });

  it('mapeia o contrato mínimo e mantém a ordem recebida do banco (createdAt DESC)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      row({ interview_id: ID_B, created_at: d('2026-10-10T12:00:00.000Z') }),
      row({ interview_id: ID_A, created_at: d('2026-10-09T12:00:00.000Z') }),
    ]);

    const result = await service.listInProgress(42);

    expect(result.map((item) => item.id)).toEqual([ID_B, ID_A]);
    expect(result[0]).toEqual({
      id: ID_B,
      title: 'Desenvolvedor Front-end',
      company: 'ACME',
      evaluationMode: 'HUMAN',
      interviewStatus: 'IN_PROGRESS',
      createdAt: d('2026-10-10T12:00:00.000Z'),
      questionCount: 0,
      answeredQuestionCount: 0,
      latestDraftUpdatedAt: null,
    });
  });

  it('questionCount e answeredQuestionCount: só answer_text oficial conta como respondida', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      row({
        questions: [
          question({ answer_text: 'Q1' }),
          question({ answer_text: 'Q2' }),
          // rascunho SEM resposta oficial: não é respondida
          question({ draft_text: 'começando', draft_updated_at: d('2026-10-09T12:05:00.000Z') }),
          question(),
          question(),
        ],
      }),
    ]);

    const [item] = await service.listInProgress(42);

    expect(item.questionCount).toBe(5);
    expect(item.answeredQuestionCount).toBe(2);
  });

  it('um rascunho de pergunta já respondida (edição) também não aumenta o respondido', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      row({
        questions: [
          question({ answer_text: 'oficial', draft_text: 'oficial editada', draft_updated_at: d('2026-10-09T12:10:00.000Z') }),
        ],
      }),
    ]);
    const [item] = await service.listInProgress(42);
    expect(item.answeredQuestionCount).toBe(1);
    expect(item.latestDraftUpdatedAt).toEqual(d('2026-10-09T12:10:00.000Z'));
  });

  it('latestDraftUpdatedAt é o rascunho mais recente (e null sem rascunho)', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      row({
        interview_id: ID_A,
        questions: [
          question({ draft_text: 'a', draft_updated_at: d('2026-10-09T12:01:00.000Z') }),
          question({ draft_text: 'b', draft_updated_at: d('2026-10-09T12:09:00.000Z') }),
          question({ draft_text: 'c', draft_updated_at: d('2026-10-09T12:05:00.000Z') }),
        ],
      }),
      row({ interview_id: ID_B, questions: [question({ answer_text: 'x' })] }),
    ]);

    const [withDraft, withoutDraft] = await service.listInProgress(42);

    expect(withDraft.latestDraftUpdatedAt).toEqual(d('2026-10-09T12:09:00.000Z'));
    expect(withoutDraft.latestDraftUpdatedAt).toBeNull();
  });

  it('devolve interviewStatus e mais de uma entrevista, cada uma com os próprios números', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      row({ interview_id: ID_B, evaluation_mode: null, questions: [question({ answer_text: 'x' }), question()] }),
      row({ interview_id: ID_A, questions: [question(), question(), question()] }),
    ]);

    const result = await service.listInProgress(42);

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.interviewStatus)).toEqual(['IN_PROGRESS', 'IN_PROGRESS']);
    expect(result[0]).toMatchObject({ id: ID_B, evaluationMode: null, questionCount: 2, answeredQuestionCount: 1 });
    expect(result[1]).toMatchObject({ id: ID_A, questionCount: 3, answeredQuestionCount: 0 });
  });

  it('o SELECT não pede texto de resposta/rascunho nem campos do dono/avaliador', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([]);
    await service.listInProgress(42);

    const select = prisma.interview.findMany.mock.calls[0][0].select;
    // as colunas de texto são lidas só para contar; o contrato nunca as devolve
    expect(select).not.toHaveProperty('candidate_user_id');
    expect(select).not.toHaveProperty('evaluator_profile_id');
    expect(select).not.toHaveProperty('job_summary');
  });

  it('a resposta não carrega draftText nem answerText', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findMany.mockResolvedValue([
      row({ questions: [question({ answer_text: 'segredo', draft_text: 'rascunho', draft_updated_at: d('2026-10-09T12:00:00.000Z') })] }),
    ]);
    const [item] = await service.listInProgress(42);
    const json = JSON.stringify(item);
    expect(json).not.toContain('segredo');
    expect(json).not.toContain('rascunho');
    expect(item).not.toHaveProperty('questions');
  });
});
