import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JOB_LIMITS } from '../../interviews/job-context';
import { AI_EVALUATION_LIMITS, EvaluateDto } from './evaluate.dto';
import { JobContextDto } from './job-context.dto';
import { QuestionsDto } from './questions.dto';

async function errorsOf<T extends object>(
  type: new () => T,
  plain: unknown,
): Promise<string[]> {
  const errors = await validate(plainToInstance(type, plain));
  return errors.map((error) => error.property);
}

const context = {
  title: 'Analista de RH',
  company: 'ACME',
  summary: 'Resumo da vaga',
  activities: ['Recrutar'],
  requirements: ['Comunicação'],
  location: 'Três Lagoas - MS',
  contractType: 'CLT',
  workMode: 'HYBRID',
  sourceUrl: 'https://www.empregare.com/pt-br/vaga-x_1',
};

const answer = {
  questionId: 1,
  questionText: 'Fale sobre sua experiência.',
  questionType: 'Tecnica',
  answer: 'Trabalhei com recrutamento por dois anos, conduzindo entrevistas.',
};

describe('JobContextDto (POST /interviews/ai/job-context)', () => {
  it('aceita um link da Empregare', async () => {
    expect(
      await errorsOf(JobContextDto, {
        url: 'https://www.empregare.com/pt-br/vaga-x_1',
      }),
    ).toEqual([]);
  });

  it.each([
    ['ausente', {}],
    ['não é texto', { url: 123 }],
    ['vazia', { url: '' }],
    ['localhost', { url: 'http://localhost:3000/admin' }],
    ['metadados de nuvem', { url: 'http://169.254.169.254/latest/meta-data/' }],
    ['outro domínio', { url: 'https://example.com/vaga' }],
    [
      'acima de 2048 caracteres',
      {
        url: `https://www.empregare.com/${'a'.repeat(2100)}`,
      },
    ],
  ])('rejeita URL %s', async (_name, body) => {
    expect(await errorsOf(JobContextDto, body)).toContain('url');
  });
});

describe('QuestionsDto (POST /interviews/ai/questions)', () => {
  it('aceita o contexto completo e o mínimo (só título)', async () => {
    expect(await errorsOf(QuestionsDto, { context })).toEqual([]);
    expect(
      await errorsOf(QuestionsDto, { context: { title: 'Analista' } }),
    ).toEqual([]);
  });

  it.each([
    ['sem contexto', {}],
    ['contexto nulo', { context: null }],
    ['contexto texto', { context: 'vaga' }],
    ['contexto lista', { context: [] }],
    ['sem título', { context: { company: 'ACME' } }],
    ['título vazio', { context: { title: '' } }],
    [
      `título acima de ${JOB_LIMITS.title}`,
      { context: { title: 'a'.repeat(JOB_LIMITS.title + 1) } },
    ],
    [
      `resumo acima de ${JOB_LIMITS.summary}`,
      { context: { title: 'x', summary: 'a'.repeat(JOB_LIMITS.summary + 1) } },
    ],
    [
      `mais de ${JOB_LIMITS.listMaxItems} requisitos`,
      {
        context: {
          title: 'x',
          requirements: Array.from(
            { length: JOB_LIMITS.listMaxItems + 1 },
            () => 'r',
          ),
        },
      },
    ],
    [
      'requisito gigante',
      {
        context: {
          title: 'x',
          requirements: ['a'.repeat(JOB_LIMITS.listItemLength + 1)],
        },
      },
    ],
    [
      'requisitos não são texto',
      { context: { title: 'x', requirements: [1] } },
    ],
    ['workMode inválido', { context: { title: 'x', workMode: 'MARS' } }],
  ])('rejeita %s', async (_name, body) => {
    expect(await errorsOf(QuestionsDto, body)).toContain('context');
  });
});

describe('EvaluateDto (POST /interviews/ai/evaluate)', () => {
  const valid = { context, answers: [answer] };

  it('aceita contexto + respostas (inclusive resposta vazia)', async () => {
    expect(await errorsOf(EvaluateDto, valid)).toEqual([]);
    expect(
      await errorsOf(EvaluateDto, {
        context,
        answers: [{ ...answer, answer: '' }],
      }),
    ).toEqual([]);
  });

  it('aceita exatamente o máximo de respostas', async () => {
    const answers = Array.from(
      { length: AI_EVALUATION_LIMITS.maxAnswers },
      (_, index) => ({ ...answer, questionId: index + 1 }),
    );
    expect(await errorsOf(EvaluateDto, { context, answers })).toEqual([]);
  });

  it.each([
    ['sem contexto', { answers: [answer] }],
    ['contexto inválido', { context: { title: '' }, answers: [answer] }],
    ['sem respostas', { context }],
    ['respostas vazias', { context, answers: [] }],
    ['respostas não são lista', { context, answers: 'texto' }],
    [
      'respostas demais',
      {
        context,
        answers: Array.from(
          { length: AI_EVALUATION_LIMITS.maxAnswers + 1 },
          (_, index) => ({ ...answer, questionId: index + 1 }),
        ),
      },
    ],
    [
      'questionId repetido',
      { context, answers: [answer, { ...answer, answer: 'outra' }] },
    ],
    ['questionId zero', { context, answers: [{ ...answer, questionId: 0 }] }],
    [
      'questionId fracionado',
      { context, answers: [{ ...answer, questionId: 1.5 }] },
    ],
    [
      'questionId texto',
      { context, answers: [{ ...answer, questionId: '1' }] },
    ],
    [
      'resposta acima de 1000',
      {
        context,
        answers: [
          { ...answer, answer: 'a'.repeat(AI_EVALUATION_LIMITS.answer + 1) },
        ],
      },
    ],
    [
      'pergunta acima de 500',
      {
        context,
        answers: [
          {
            ...answer,
            questionText: 'a'.repeat(AI_EVALUATION_LIMITS.questionText + 1),
          },
        ],
      },
    ],
    ['resposta sem texto', { context, answers: [{ ...answer, answer: null }] }],
    ['item que não é objeto', { context, answers: ['x'] }],
  ])('rejeita %s', async (_name, body) => {
    expect((await errorsOf(EvaluateDto, body)).length).toBeGreaterThan(0);
  });
});

describe('ValidationPipe global (whitelist) com os DTOs de IA', () => {
  const pipe = new ValidationPipe({ whitelist: true });

  it('descarta campos extras, inclusive nos objetos aninhados', async () => {
    const result = (await pipe.transform(
      {
        context: { ...context, isAdmin: true },
        answers: [{ ...answer, score: 10 }],
        candidateId: 99,
      },
      { type: 'body', metatype: EvaluateDto },
    )) as Record<string, unknown>;

    expect(result).not.toHaveProperty('candidateId');
    expect(result.context).not.toHaveProperty('isAdmin');
    expect((result.answers as object[])[0]).not.toHaveProperty('score');
  });

  it('responde 400 para payload excessivo', async () => {
    await expect(
      pipe.transform(
        {
          context,
          answers: [{ ...answer, answer: 'a'.repeat(5000) }],
        },
        { type: 'body', metatype: EvaluateDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
});
