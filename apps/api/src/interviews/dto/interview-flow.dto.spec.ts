import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { SaveAnswerDto } from './save-answer.dto';
import { SetEvaluationModeDto } from './set-evaluation-mode.dto';
import { SubmitInterviewDto } from './submit-interview.dto';

// Configuração REAL do main.ts: `new ValidationPipe({ whitelist: true })`
// (transform e forbidNonWhitelisted não definidos). Campos extras são
// removidos em silêncio e o resultado é um objeto simples.
const pipe = new ValidationPipe({ whitelist: true });

function run(metatype: new () => object, body: unknown) {
  return pipe.transform(body, { type: 'body', metatype });
}

describe('SaveAnswerDto', () => {
  it('aceita texto e remove campos extras (dono/status/ids)', async () => {
    const result = await run(SaveAnswerDto, {
      answer: 'minha resposta',
      candidateId: 9,
      questionId: 'outra',
      status: 'COMPLETED',
    });
    expect(result).toEqual({ answer: 'minha resposta' });
  });

  it('aceita string vazia (limpa a resposta)', async () => {
    await expect(run(SaveAnswerDto, { answer: '' })).resolves.toEqual({
      answer: '',
    });
  });

  it.each([
    ['sem answer', {}],
    ['answer numérico', { answer: 10 }],
    ['answer nulo', { answer: null }],
    ['corpo absurdo (> 5000)', { answer: 'a'.repeat(5001) }],
  ])('rejeita %s', async (_name, body) => {
    await expect(run(SaveAnswerDto, body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('SetEvaluationModeDto', () => {
  it.each(['AI', 'HUMAN'])('aceita %s', async (evaluationMode) => {
    await expect(
      run(SetEvaluationModeDto, { evaluationMode }),
    ).resolves.toEqual({ evaluationMode });
  });

  it.each([
    ['ausente', {}],
    ['minúsculo', { evaluationMode: 'ai' }],
    ['desconhecido', { evaluationMode: 'ROBOT' }],
    ['evaluation_mode (snake_case)', { evaluation_mode: 'AI' }],
  ])('rejeita %s', async (_name, body) => {
    await expect(run(SetEvaluationModeDto, body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('remove campos extras (status, evaluatorId...)', async () => {
    await expect(
      run(SetEvaluationModeDto, {
        evaluationMode: 'HUMAN',
        status: 'COMPLETED',
        evaluatorId: 5,
        candidate_user_id: 3,
      }),
    ).resolves.toEqual({ evaluationMode: 'HUMAN' });
  });
});

describe('SubmitInterviewDto', () => {
  it('corpo vazio é válido (usa a modalidade já escolhida)', async () => {
    await expect(run(SubmitInterviewDto, {})).resolves.toEqual({});
  });

  it('aceita modalidade e remove campos extras', async () => {
    await expect(
      run(SubmitInterviewDto, {
        evaluationMode: 'AI',
        status: 'COMPLETED',
        submittedAt: '2020-01-01',
        evaluatorId: 5,
      }),
    ).resolves.toEqual({ evaluationMode: 'AI' });
  });

  it('rejeita modalidade inválida', async () => {
    await expect(
      run(SubmitInterviewDto, { evaluationMode: 'ROBOT' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
