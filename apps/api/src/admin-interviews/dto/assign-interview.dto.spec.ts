import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { AssignInterviewDto } from './assign-interview.dto';

// Configuração REAL do main.ts: `new ValidationPipe({ whitelist: true })`.
const pipe = new ValidationPipe({ whitelist: true });

function run(body: unknown) {
  return pipe.transform(body, { type: 'body', metatype: AssignInterviewDto });
}

describe('AssignInterviewDto', () => {
  it('aceita evaluatorId inteiro e descarta qualquer outro campo (Admin, status, datas)', async () => {
    await expect(
      run({
        evaluatorId: 3,
        assigned_by_user_id: 999,
        assignedBy: 999,
        status: 'COMPLETED',
        evaluator_profile_id: 8,
        assigned_at: '2020-01-01',
        candidateId: 1,
      }),
    ).resolves.toEqual({ evaluatorId: 3 });
  });

  it.each([
    ['ausente', {}],
    ['string', { evaluatorId: '3' }],
    ['decimal', { evaluatorId: 1.5 }],
    ['zero', { evaluatorId: 0 }],
    ['negativo', { evaluatorId: -1 }],
    ['acima do int4', { evaluatorId: 2147483648 }],
    ['nulo', { evaluatorId: null }],
    ['id mock antigo', { evaluatorId: 'evaluator-carlos-andrade' }],
  ])('rejeita evaluatorId %s', async (_name, body) => {
    await expect(run(body)).rejects.toBeInstanceOf(BadRequestException);
  });
});
