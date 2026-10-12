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
import { CANDIDATE_QUESTION_SELECT } from './interview-flow';
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
    draft_text: null,
    draft_updated_at: null,
    draft_version: 0,
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
      draftText: null,
      draftUpdatedAt: null,
      draftVersion: 0,
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

  it('GET devolve o rascunho (texto, data e versão) além da resposta oficial', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue({
      interview_id: INTERVIEW_ID,
      status: 'IN_PROGRESS',
    });
    prisma.interview_question.findMany.mockResolvedValue([
      storedQuestion(1, {
        answer_text: 'oficial',
        answered_at: at,
        draft_text: 'oficial editada',
        draft_updated_at: at,
        draft_version: 4,
      }),
      storedQuestion(2),
    ]);

    const result = await service.list(42, INTERVIEW_ID);

    expect(result.questions[0]).toMatchObject({
      answer: 'oficial',
      answeredAt: at,
      draftText: 'oficial editada',
      draftUpdatedAt: at,
      draftVersion: 4,
    });
    expect(result.questions[1]).toMatchObject({
      answer: null,
      draftText: null,
      draftUpdatedAt: null,
      draftVersion: 0,
    });
  });

  it('GET devolve interviewStatus (IN_PROGRESS e, depois do envio, o status vigente) sem remover campos', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue({
      interview_id: INTERVIEW_ID,
      status: 'PENDING_ASSIGNMENT',
    });
    prisma.interview_question.findMany.mockResolvedValue([storedQuestion(1)]);

    const result = await service.list(42, INTERVIEW_ID);

    expect(result.interviewStatus).toBe('PENDING_ASSIGNMENT');
    expect(result.interviewId).toBe(INTERVIEW_ID);
    expect(result.questions).toHaveLength(1);
  });

  it('lista ordenada por posição com respostas', async () => {
    const { service, prisma } = makeService();
    prisma.interview.findFirst.mockResolvedValue({
      interview_id: INTERVIEW_ID,
      status: 'IN_PROGRESS',
    });
    prisma.interview_question.findMany.mockResolvedValue([
      storedQuestion(1, { answer_text: 'Minha resposta', answered_at: at }),
    ]);

    const result = await service.list(42, INTERVIEW_ID);

    expect(result.questions[0].answer).toBe('Minha resposta');
    expect(result.questions[0].answeredAt).toBe(at);
    const args = prisma.interview_question.findMany.mock.calls[0][0];
    expect(args.where).toEqual({ interview_id: INTERVIEW_ID });
    expect(args.select).toBe(CANDIDATE_QUESTION_SELECT);
  });
});

describe('InterviewQuestionsService.saveAnswer', () => {
  it('normaliza e grava a resposta com dono e status IN_PROGRESS no WHERE', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(
      storedQuestion(1, { answer_text: 'linha 1\n\nlinha 2', answered_at: at }),
    );

    const result = await service.saveAnswer(
      42,
      INTERVIEW_ID,
      QUESTION_ID,
      '  linha 1\n\nlinha 2  ',
      3,
    );

    const args = prisma.interview_question.updateMany.mock.calls[0][0];
    expect(args.where).toEqual({
      question_id: QUESTION_ID,
      interview_id: INTERVIEW_ID,
      draft_version: 3,
      interview: { candidate_user_id: 42, status: 'IN_PROGRESS' },
    });
    expect(args.data.answer_text).toBe('linha 1\n\nlinha 2');
    expect(args.data.answered_at).toBeInstanceOf(Date);
    expect(args.data.updated_at).toBeInstanceOf(Date);
    expect(result.answer).toBe('linha 1\n\nlinha 2');
  });

  describe('quebras de linha da resposta', () => {
    async function savedText(input: string) {
      const { service, prisma } = makeService();
      prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
      prisma.interview_question.findFirst.mockResolvedValue(storedQuestion(1));
      await service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, input, 0);
      return prisma.interview_question.updateMany.mock.calls[0][0].data
        .answer_text;
    }

    it('preserva \\n entre parágrafos (não vira espaço)', async () => {
      expect(await savedText('Primeiro parágrafo.\nSegundo parágrafo.')).toBe(
        'Primeiro parágrafo.\nSegundo parágrafo.',
      );
    });

    it('preserva linhas em branco', async () => {
      expect(await savedText('a\n\n\nb')).toBe('a\n\n\nb');
    });

    it('normaliza CRLF e CR para LF', async () => {
      expect(await savedText('linha 1\r\n\r\nlinha 2')).toBe(
        'linha 1\n\nlinha 2',
      );
      expect(await savedText('a\rb')).toBe('a\nb');
    });

    it('mantém o trim externo (inclusive quebras nas pontas)', async () => {
      expect(await savedText('  \n  texto \n ')).toBe('texto');
    });

    it('o limite de 1000 caracteres conta as quebras (já normalizadas)', async () => {
      const exactly1000 = 'a'.repeat(499) + '\r\n' + 'b'.repeat(500);
      expect(await savedText(exactly1000)).toBe(
        'a'.repeat(499) + '\n' + 'b'.repeat(500),
      );
      const { service, prisma } = makeService();
      await expect(
        service.saveAnswer(
          42,
          INTERVIEW_ID,
          QUESTION_ID,
          'a'.repeat(500) + '\n' + 'b'.repeat(500),
          0,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.interview_question.updateMany).not.toHaveBeenCalled();
    });
  });

  it('a confirmação oficial limpa o rascunho e avança a versão (mesma operação atômica)', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(
      storedQuestion(1, {
        answer_text: 'final',
        answered_at: at,
        draft_version: 5,
      }),
    );

    const result = await service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'final', 0);

    expect(prisma.interview_question.updateMany).toHaveBeenCalledTimes(1);
    const data = prisma.interview_question.updateMany.mock.calls[0][0].data;
    expect(data.answer_text).toBe('final');
    expect(data.draft_text).toBeNull();
    expect(data.draft_updated_at).toBeNull();
    expect(data.draft_version).toEqual({ increment: 1 });
    expect(result.draftText).toBeNull();
  });

  it('confirmar resposta em branco também limpa o rascunho', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(storedQuestion(1));

    await service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, '   ', 0);

    const data = prisma.interview_question.updateMany.mock.calls[0][0].data;
    expect(data.answer_text).toBeNull();
    expect(data.draft_text).toBeNull();
    expect(data.draft_version).toEqual({ increment: 1 });
  });

  it('resposta em branco limpa a resposta (null) e o answered_at', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(storedQuestion(1));

    await service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, '  \n  ', 0);

    const data = prisma.interview_question.updateMany.mock.calls[0][0].data;
    expect(data.answer_text).toBeNull();
    expect(data.answered_at).toBeNull();
  });

  it('aceita exatamente 1000 caracteres', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(storedQuestion(1));

    await service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'a'.repeat(1000), 0);

    expect(
      prisma.interview_question.updateMany.mock.calls[0][0].data.answer_text,
    ).toBe('a'.repeat(1000));
  });

  it('1001 caracteres => 400 e nada é gravado (sem truncar)', async () => {
    const { service, prisma } = makeService();

    await expect(
      service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'a'.repeat(1001), 0),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.interview_question.updateMany).not.toHaveBeenCalled();
  });

  it('404 quando a pergunta não pertence a uma entrevista do candidato', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue(null);

    await expect(
      service.saveAnswer(99, INTERVIEW_ID, QUESTION_ID, 'resposta', 0),
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
      answer_text: 'oficial',
      draft_text: null,
      draft_updated_at: null,
      draft_version: 6,
      interview: { status: 'PENDING_ASSIGNMENT' },
    });

    const error = await service
      .saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'resposta', 6)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'INTERVIEW_NOT_IN_PROGRESS',
      interviewStatus: 'PENDING_ASSIGNMENT',
    });
  });
});

describe('InterviewQuestionsService.saveAnswer: controle otimista (draftVersion)', () => {
  it('versão correta confirma, grava a resposta, limpa o rascunho e incrementa a versão', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(
      storedQuestion(1, { answer_text: 'Resposta A', answered_at: at, draft_version: 5 }),
    );

    const result = await service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'Resposta A', 4);

    const { where, data } = prisma.interview_question.updateMany.mock.calls[0][0];
    expect(where.draft_version).toBe(4);
    expect(where.interview).toEqual({ candidate_user_id: 42, status: 'IN_PROGRESS' });
    expect(data.answer_text).toBe('Resposta A');
    expect(data.draft_text).toBeNull();
    expect(data.draft_updated_at).toBeNull();
    expect(data.draft_version).toEqual({ increment: 1 });
    expect(result.draftVersion).toBe(5);
  });

  it('resposta IGUAL à oficial também respeita a versão (WHERE draft_version)', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue({
      question_id: QUESTION_ID,
      answer_text: 'igual',
      draft_text: 'outro',
      draft_updated_at: at,
      draft_version: 7,
      interview: { status: 'IN_PROGRESS' },
    });

    const error = await service
      .saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'igual', 4)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(
      prisma.interview_question.updateMany.mock.calls[0][0].where.draft_version,
    ).toBe(4);
  });

  it('versão antiga => 409 DRAFT_VERSION_CONFLICT com o estado vigente; NÃO sobrescreve a resposta', async () => {
    const { service, prisma } = makeService();
    // PC confirmou "Resposta A" (v4 -> v5); o celular ainda está na v4
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue({
      question_id: QUESTION_ID,
      answer_text: 'Resposta A',
      draft_text: null,
      draft_updated_at: null,
      draft_version: 5,
      interview: { status: 'IN_PROGRESS' },
    });

    const error = await service
      .saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'Resposta B', 4)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      statusCode: 409,
      code: 'DRAFT_VERSION_CONFLICT',
      answer: 'Resposta A',
      draftText: null,
      draftUpdatedAt: null,
      draftVersion: 5,
    });
    // nenhuma outra escrita: a única tentativa condicional não casou
    expect(prisma.interview_question.updateMany).toHaveBeenCalledTimes(1);
  });

  it('reenvio após timeout (já aplicado): o 409 traz answer igual e rascunho vazio, reconhecível pelo cliente', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue({
      question_id: QUESTION_ID,
      answer_text: 'minha resposta',
      draft_text: null,
      draft_updated_at: null,
      draft_version: 5,
      interview: { status: 'IN_PROGRESS' },
    });

    const error = await service
      .saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'minha resposta', 4)
      .catch((e: unknown) => e);

    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'DRAFT_VERSION_CONFLICT',
      answer: 'minha resposta',
      draftText: null,
      draftVersion: 5,
    });
  });

  it('entrevista não IN_PROGRESS tem prioridade sobre a versão: INTERVIEW_NOT_IN_PROGRESS', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue({
      question_id: QUESTION_ID,
      answer_text: 'x',
      draft_text: null,
      draft_updated_at: null,
      draft_version: 9,
      interview: { status: 'COMPLETED' },
    });

    const error = await service
      .saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'x', 1)
      .catch((e: unknown) => e);

    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'INTERVIEW_NOT_IN_PROGRESS',
      interviewStatus: 'COMPLETED',
    });
  });

  it('404 continua sendo 404 (pergunta de outro candidato), sem vazar estado', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue(null);

    await expect(
      service.saveAnswer(99, INTERVIEW_ID, QUESTION_ID, 'x', 0),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('InterviewQuestionsService.saveDraft', () => {
  function stored(overrides = {}) {
    return storedQuestion(1, overrides);
  }

  it('grava SÓ o rascunho: não toca em answer_text, answered_at nem no status', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(
      stored({ draft_text: 'parcial', draft_updated_at: at, draft_version: 1 }),
    );

    const result = await service.saveDraft(42, INTERVIEW_ID, QUESTION_ID, 'parcial', 0);

    const args = prisma.interview_question.updateMany.mock.calls[0][0];
    expect(args.data.draft_text).toBe('parcial');
    expect(args.data.draft_updated_at).toBeInstanceOf(Date);
    expect(args.data.draft_version).toEqual({ increment: 1 });
    expect(args.data).not.toHaveProperty('answer_text');
    expect(args.data).not.toHaveProperty('answered_at');
    expect(args.data).not.toHaveProperty('status');
    expect(prisma.interview.findFirst).not.toHaveBeenCalled();
    expect(result).toEqual({
      id: stored().question_id,
      draftText: 'parcial',
      draftUpdatedAt: at,
      draftVersion: 1,
    });
  });

  it('dono, IN_PROGRESS e versão base ficam no WHERE da gravação', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(stored());

    await service.saveDraft(42, INTERVIEW_ID, QUESTION_ID, 'x', 7);

    expect(prisma.interview_question.updateMany.mock.calls[0][0].where).toEqual({
      question_id: QUESTION_ID,
      interview_id: INTERVIEW_ID,
      draft_version: 7,
      interview: { candidate_user_id: 42, status: 'IN_PROGRESS' },
    });
  });

  it('rascunho vazio limpa só o rascunho (e avança a versão)', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(stored({ draft_version: 3 }));

    await service.saveDraft(42, INTERVIEW_ID, QUESTION_ID, '  \n ', 2);

    const data = prisma.interview_question.updateMany.mock.calls[0][0].data;
    expect(data.draft_text).toBeNull();
    expect(data.draft_updated_at).toBeNull();
    expect(data.draft_version).toEqual({ increment: 1 });
    expect(data).not.toHaveProperty('answer_text');
    expect(data).not.toHaveProperty('answered_at');
  });

  it('normaliza CRLF para LF e preserva espaços das pontas (sem trim)', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(stored());

    await service.saveDraft(42, INTERVIEW_ID, QUESTION_ID, 'a\r\nb ', 0);

    expect(prisma.interview_question.updateMany.mock.calls[0][0].data.draft_text).toBe(
      'a\nb ',
    );
  });

  it('aceita 1000 caracteres e recusa 1001 com 400 (nada é gravado)', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(stored());

    await service.saveDraft(42, INTERVIEW_ID, QUESTION_ID, 'a'.repeat(1000), 0);
    expect(prisma.interview_question.updateMany).toHaveBeenCalledTimes(1);

    await expect(
      service.saveDraft(42, INTERVIEW_ID, QUESTION_ID, 'a'.repeat(1001), 0),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.interview_question.updateMany).toHaveBeenCalledTimes(1);
  });

  it('404 para pergunta/entrevista de outro candidato', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue(null);

    await expect(
      service.saveDraft(99, INTERVIEW_ID, QUESTION_ID, 'x', 0),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.interview_question.findFirst.mock.calls[0][0].where).toEqual({
      question_id: QUESTION_ID,
      interview_id: INTERVIEW_ID,
      interview: { candidate_user_id: 99 },
    });
  });

  it('409 quando a entrevista já foi enviada (não IN_PROGRESS)', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue({
      question_id: QUESTION_ID,
      draft_text: null,
      draft_updated_at: null,
      draft_version: 0,
      interview: { status: 'PENDING_ASSIGNMENT' },
    });

    const error = await service
      .saveDraft(42, INTERVIEW_ID, QUESTION_ID, 'x', 0)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'INTERVIEW_NOT_IN_PROGRESS',
      interviewStatus: 'PENDING_ASSIGNMENT',
    });
  });

  it('versão antiga => 409 com o estado vigente; a versão nova NÃO é sobrescrita', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue({
      question_id: QUESTION_ID,
      answer_text: 'oficial',
      draft_text: 'texto do dispositivo B',
      draft_updated_at: at,
      draft_version: 5,
      interview: { status: 'IN_PROGRESS' },
    });

    const error = await service
      .saveDraft(42, INTERVIEW_ID, QUESTION_ID, 'texto antigo do A', 4)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'DRAFT_VERSION_CONFLICT',
      answer: 'oficial',
      draftText: 'texto do dispositivo B',
      draftVersion: 5,
    });
    // uma única escrita condicional (WHERE draft_version = 4) que não casou
    expect(prisma.interview_question.updateMany).toHaveBeenCalledTimes(1);
    expect(
      prisma.interview_question.updateMany.mock.calls[0][0].where.draft_version,
    ).toBe(4);
  });
});

describe('rascunho x confirmação oficial (texto igual, dispositivo antigo, depois do envio)', () => {
  it('texto IGUAL ao answer_text com rascunho existente: um único UPDATE que mantém a resposta e limpa o rascunho', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(
      storedQuestion(1, {
        answer_text: 'abc',
        answered_at: at,
        draft_text: null,
        draft_updated_at: null,
        draft_version: 5,
      }),
    );

    const result = await service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, ' abc ', 0);

    expect(prisma.interview_question.updateMany).toHaveBeenCalledTimes(1);
    const { where, data } = prisma.interview_question.updateMany.mock.calls[0][0];
    expect(where).toEqual({
      question_id: QUESTION_ID,
      interview_id: INTERVIEW_ID,
      draft_version: 0,
      interview: { candidate_user_id: 42, status: 'IN_PROGRESS' },
    });
    expect(data.answer_text).toBe('abc');
    expect(data.answered_at).toBeInstanceOf(Date);
    expect(data.draft_text).toBeNull();
    expect(data.draft_updated_at).toBeNull();
    expect(data.draft_version).toEqual({ increment: 1 });
    expect(result.answer).toBe('abc');
    expect(result.draftText).toBeNull();
    expect(result.draftUpdatedAt).toBeNull();
    expect(result.draftVersion).toBe(5);
  });

  it('a versão do rascunho só AVANÇA (increment), nunca é zerada pela confirmação', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 1 });
    prisma.interview_question.findFirst.mockResolvedValue(storedQuestion(1));

    await service.saveAnswer(42, INTERVIEW_ID, QUESTION_ID, 'x', 0);

    const data = prisma.interview_question.updateMany.mock.calls[0][0].data;
    expect(data.draft_version).toEqual({ increment: 1 });
    expect(data.draft_version).not.toBe(0);
  });

  it('dispositivo antigo (versão 4) depois da confirmação (versão 5) recebe 409 e não recria o rascunho', async () => {
    const { service, prisma } = makeService();
    // o WHERE draft_version = 4 não casa mais (a confirmação levou a 5)
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue({
      question_id: QUESTION_ID,
      draft_text: null,
      draft_updated_at: null,
      draft_version: 5,
      interview: { status: 'IN_PROGRESS' },
    });

    const error = await service
      .saveDraft(42, INTERVIEW_ID, QUESTION_ID, 'rascunho antigo do A', 4)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'DRAFT_VERSION_CONFLICT',
      draftText: null,
      draftVersion: 5,
    });
    expect(prisma.interview_question.updateMany).toHaveBeenCalledTimes(1);
    expect(
      prisma.interview_question.updateMany.mock.calls[0][0].where.draft_version,
    ).toBe(4);
  });

  it('depois do envio nenhum dispositivo recria rascunho: o WHERE exige IN_PROGRESS e a resposta é 409 de entrevista enviada', async () => {
    const { service, prisma } = makeService();
    prisma.interview_question.updateMany.mockResolvedValue({ count: 0 });
    prisma.interview_question.findFirst.mockResolvedValue({
      question_id: QUESTION_ID,
      draft_text: null,
      draft_updated_at: null,
      draft_version: 6,
      interview: { status: 'PENDING_ASSIGNMENT' },
    });

    const error = await service
      .saveDraft(42, INTERVIEW_ID, QUESTION_ID, 'tentando recriar', 4)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'INTERVIEW_NOT_IN_PROGRESS',
    });
    expect(
      prisma.interview_question.updateMany.mock.calls[0][0].where.interview,
    ).toEqual({ candidate_user_id: 42, status: 'IN_PROGRESS' });
  });
});
