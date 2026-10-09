// O InterviewQuestionsService só precisa do TIPO/token InterviewsAiService. A
// implementação real importa '@nestjs/config', cujo build ESM o Jest deste
// projeto não transforma. Aqui o módulo inteiro é substituído por uma classe
// vazia (mesmo padrão do JwtAuthGuard em interviews.controller.spec.ts); a IA
// usada nos testes é o stub `ai` criado em makeService(). O jest.mock é içado
// para antes dos imports.
jest.mock('../interviews-ai/interviews-ai.service', () => ({
  InterviewsAiService: class InterviewsAiService {},
}));

import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { InterviewsAiService } from '../interviews-ai/interviews-ai.service';
import type { PrismaService } from '../prisma/prisma.service';
import { QUESTION_SELECT } from './interview-flow';
import { InterviewQuestionsService } from './interview-questions.service';

const INTERVIEW_ID = '11111111-1111-4111-8111-111111111111';
const QUESTION_ID = '22222222-2222-4222-8222-222222222222';
const at = new Date('2026-10-09T12:00:00.000Z');

function interviewRecord(overrides: Record<string, unknown> = {}) {
  return {
    interview_id: INTERVIEW_ID,
    status: 'IN_PROGRESS',
    evaluation_mode: null,
    job_title: 'Desenvolvedor Front-end',
    job_company: null,
    job_summary: null,
    job_activities: ['Criar telas'],
    job_requirements: ['React'],
    job_location: 'Brasília - DF',
    job_contract_type: null,
    job_work_mode: null,
    job_source_url: 'https://empregare.example/vaga/1',
    submitted_at: null,
    created_at: at,
    updated_at: at,
    ...overrides,
  };
}

function storedQuestion(position: number, overrides = {}) {
  return {
    question_id: `00000000-0000-4000-8000-00000000000${position}`,
    position,
    question_type: position <= 2 ? 'TECHNICAL' : 'BEHAVIORAL',
    question_text: `Pergunta ${position}?`,
    answer_text: null,
    answered_at: null,
    ...overrides,
  };
}

const pythonQuestions = {
  questions: [
    { id: 1, type: 'Tecnica', text: 'Pergunta 1?' },
    { id: 2, type: 'Tecnica', text: 'Pergunta 2?' },
    { id: 3, type: 'Comportamental', text: 'Pergunta 3?' },
    { id: 4, type: 'Comportamental', text: 'Pergunta 4?' },
    { id: 5, type: 'Carreira', text: 'Pergunta 5?' },
  ],
};

function makeService() {
  const prisma = {
    interview: { findFirst: jest.fn() },
    interview_question: {
      findMany: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const ai = { generateQuestions: jest.fn() };
  const service = new InterviewQuestionsService(
    prisma as unknown as PrismaService,
    ai as unknown as InterviewsAiService,
  );
  return { service, prisma, ai };
}

describe('InterviewQuestionsService.generate', () => {
  it('404 para entrevista de outro candidato (ownership no WHERE) e não chama a IA', async () => {
    const { service, prisma, ai } = makeService();
    prisma.interview.findFirst.mockResolvedValue(null);

    await expect(service.generate(42, INTERVIEW_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.interview.findFirst.mock.calls[0][0].where).toEqual({
      interview_id: INTERVIEW_ID,
      candidate_user_id: 42,
    });
    expect(ai.generateQuestions).not.toHaveBeenCalled();
    expect(prisma.interview_question.createMany).not.toHaveBeenCalled();
  });

  it('é idempotente: se já existem perguntas, devolve as gravadas sem chamar a IA nem gravar', async () => {
    const { service, prisma, ai } = makeService();
    prisma.interview.findFirst.mockResolvedValue(interviewRecord());
    prisma.interview_question.findMany.mockResolvedValue([
      storedQuestion(1),
      storedQuestion(2),
    ]);

    const result = await service.generate(42, INTERVIEW_ID);

    expect(result.interviewId).toBe(INTERVIEW_ID);
    expect(result.questions.map((q) => q.position)).toEqual([1, 2]);
    expect(ai.generateQuestions).not.toHaveBeenCalled();
    expect(prisma.interview_question.createMany).not.toHaveBeenCalled();
  });

  it('gera, grava com skipDuplicates e devolve as perguntas gravadas (UUID do banco)', async () => {
    const { service, prisma, ai } = makeService();
    prisma.interview.findFirst.mockResolvedValue(interviewRecord());
    prisma.interview_question.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([1, 2, 3, 4, 5].map((p) => storedQuestion(p)));
    ai.generateQuestions.mockResolvedValue(pythonQuestions);
    prisma.interview_question.createMany.mockResolvedValue({ count: 5 });

    const result = await service.generate(42, INTERVIEW_ID);

    const payload = ai.generateQuestions.mock.calls[0][0];
    expect(payload.context).toEqual({
      sourceUrl: 'https://empregare.example/vaga/1',
      title: 'Desenvolvedor Front-end',
      company: '',
      summary: '',
      activities: ['Criar telas'],
      requirements: ['React'],
      location: 'Brasília - DF',
      contractType: null,
      workMode: null,
    });

    const args = prisma.interview_question.createMany.mock.calls[0][0];
    expect(args.skipDuplicates).toBe(true);
    expect(args.data).toHaveLength(5);
    expect(args.data[0]).toEqual({
      interview_id: INTERVIEW_ID,
      position: 1,
      question_type: 'TECHNICAL',
      question_text: 'Pergunta 1?',
    });
    expect(
      args.data.map((d: { question_type: string }) => d.question_type),
    ).toEqual(['TECHNICAL', 'TECHNICAL', 'BEHAVIORAL', 'BEHAVIORAL', 'CAREER']);
    for (const row of args.data) {
      expect(row).not.toHaveProperty('question_id');
      expect(row).not.toHaveProperty('answer_text');
    }

    expect(result.questions).toHaveLength(5);
    expect(result.questions[0]).toEqual({
      id: '00000000-0000-4000-8000-000000000001',
      position: 1,
      type: 'TECHNICAL',
      text: 'Pergunta 1?',
      answer: null,
      answeredAt: null,
    });
    expect(prisma.interview_question.findMany.mock.calls[1][0].orderBy).toEqual(
      {
        position: 'asc',
      },
    );
  });

  it('409 quando a entrevista já saiu de IN_PROGRESS e não tem perguntas', async () => {
    const { service, prisma, ai } = makeService();
    prisma.interview.findFirst.mockResolvedValue(
      interviewRecord({
        status: 'PENDING_ASSIGNMENT',
        evaluation_mode: 'HUMAN',
      }),
    );
    prisma.interview_question.findMany.mockResolvedValue([]);

    await expect(service.generate(42, INTERVIEW_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(ai.generateQuestions).not.toHaveBeenCalled();
  });

  it('devolve as perguntas gravadas mesmo depois do envio (somente leitura)', async () => {
    const { service, prisma, ai } = makeService();
    prisma.interview.findFirst.mockResolvedValue(
      interviewRecord({
        status: 'PENDING_AI_EVALUATION',
        evaluation_mode: 'AI',
      }),
    );
    prisma.interview_question.findMany.mockResolvedValue([storedQuestion(1)]);

    const result = await service.generate(42, INTERVIEW_ID);
    expect(result.questions).toHaveLength(1);
    expect(ai.generateQuestions).not.toHaveBeenCalled();
  });

  it('502 e nada gravado quando a IA devolve perguntas inválidas', async () => {
    const { service, prisma, ai } = makeService();
    prisma.interview.findFirst.mockResolvedValue(interviewRecord());
    prisma.interview_question.findMany.mockResolvedValue([]);
    ai.generateQuestions.mockResolvedValue({
      questions: pythonQuestions.questions.slice(0, 4),
    });

    await expect(service.generate(42, INTERVIEW_ID)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.interview_question.createMany).not.toHaveBeenCalled();
  });

  it('502 e nada gravado quando uma pergunta passa de 500 caracteres (sem cortar)', async () => {
    const { service, prisma, ai } = makeService();
    prisma.interview.findFirst.mockResolvedValue(interviewRecord());
    prisma.interview_question.findMany.mockResolvedValue([]);
    const questions = pythonQuestions.questions.map((q, i) =>
      i === 2 ? { ...q, text: 'a'.repeat(501) } : q,
    );
    ai.generateQuestions.mockResolvedValue({ questions });

    await expect(service.generate(42, INTERVIEW_ID)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.interview_question.createMany).not.toHaveBeenCalled();
  });

  it('propaga o erro do serviço de IA sem gravar nada', async () => {
    const { service, prisma, ai } = makeService();
    prisma.interview.findFirst.mockResolvedValue(interviewRecord());
    prisma.interview_question.findMany.mockResolvedValue([]);
    ai.generateQuestions.mockRejectedValue(new BadGatewayException('falhou'));

    await expect(service.generate(42, INTERVIEW_ID)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.interview_question.createMany).not.toHaveBeenCalled();
  });
});

describe('InterviewQuestionsService.list', () => {
  it('404 para entrevista de outro candidato', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue(null);

    await expect(service.list(42, INTERVIEW_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.interview.findFirst.mock.calls[0][0].where).toEqual({
      interview_id: INTERVIEW_ID,
      candidate_user_id: 42,
    });
    expect(prisma.interview_question.findMany).not.toHaveBeenCalled();
  });

  it('lista ordenada por posição com respostas', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue({
      interview_id: INTERVIEW_ID,
    });
    prisma.interview_question.findMany.mockResolvedValue([
      storedQuestion(1, { answer_text: 'Minha resposta', answered_at: at }),
    ]);

    const result = await service.list(42, INTERVIEW_ID);

    expect(result.questions[0].answer).toBe('Minha resposta');
    expect(result.questions[0].answeredAt).toBe(at);
    const args = prisma.interview_question.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ interview_id: INTERVIEW_ID });
    expect(args.select).toBe(QUESTION_SELECT);
  });
});

describe('InterviewQuestionsService.saveAnswer', () => {
  it('normaliza e grava a resposta com dono e status IN_PROGRESS no WHERE', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(
      storedQuestion(1, { answer_text: 'linha 1 linha 2', answered_at: at }),
    );

    const result = await service.saveAnswer(
      42,
      INTERVIEW_ID,
      QUESTION_ID,
      '  linha 1\n\nlinha 2  ',
    );

    const args = prisma.interview_question.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({
      question_id: QUESTION_ID,
      interview_id: INTERVIEW_ID,
      interview: { candidate_user_id: 42, status: 'IN_PROGRESS' },
    });
    expect(args.data.answer_text).toBe('linha 1 linha 2');
    expect(args.data.answered_at).toBeInstanceOf(Date);
    expect(args.data.updated_at).toBeInstanceOf(Date);
    expect(result.answer).toBe('linha 1 linha 2');
  });

  it('resposta em branco limpa a resposta (null) e o answered_at', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(storedQuestion(1));

    await service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, '  \n  ');

    const data = prisma.interview_question.updateMany.mock.calls[0][0].data;
    expect(data.answer_text).toBeNull();
    expect(data.answered_at).toBeNull();
  });

  it('aceita exatamente 1000 caracteres', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(storedQuestion(1));

    await service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'a'.repeat(1000));

    expect(
      prisma.interview_question.updateMany.mock.calls[0][0].data.answer_text,
    ).toBe('a'.repeat(1000));
  });

  it('1001 caracteres => 400 e nada é gravado (sem truncar)', async () => {
    const { service, prisma } = makeService();

    await expect(
      service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'a'.repeat(1001)),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.interview_question.updateMany).not.toHaveBeenCalled();
  });

  it('404 quando a pergunta não pertence a uma entrevista do candidato', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue(null);

    await expect(
      service.saveAnswer(99, INTERVIEW_ID, QUESTION_ID, 'resposta'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.interview_question.findFirst.mock.calls[0][0].where).toEqual({
      question_id: QUESTION_ID,
      interview_id: INTERVIEW_ID,
      interview: { candidate_user_id: 99 },
    });
  });

  it('409 quando a pergunta é do candidato mas a entrevista já foi enviada', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue({
      question_id: QUESTION_ID,
    });

    await expect(
      service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'resposta'),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
