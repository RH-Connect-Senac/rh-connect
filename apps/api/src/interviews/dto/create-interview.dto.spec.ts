import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateInterviewDto } from './create-interview.dto';

async function errorsOf(plain: Record<string, unknown>): Promise<string[]> {
  const errors = await validate(plainToInstance(CreateInterviewDto, plain));
  return errors.map((e) => e.property);
}

const valid = {
  sourceUrl: 'https://empregare.example/vaga/1',
  title: 'Desenvolvedor Front-end',
};

describe('CreateInterviewDto', () => {
  it('aceita o mínimo (URL + título) e o contexto completo', async () => {
    expect(await errorsOf(valid)).toEqual([]);
    expect(
      await errorsOf({
        ...valid,
        company: 'ACME',
        summary: null,
        activities: ['a'],
        requirements: ['r1', 'r2'],
        location: null,
        contractType: 'CLT',
        workMode: 'HYBRID',
      }),
    ).toEqual([]);
  });

  it('exige sourceUrl válida e título não vazio', async () => {
    expect(await errorsOf({ title: 'x' })).toContain('sourceUrl');
    expect(await errorsOf({ ...valid, sourceUrl: 'não é url' })).toContain(
      'sourceUrl',
    );
    expect(await errorsOf({ ...valid, title: '   ' })).toContain('title');
    expect(await errorsOf({ sourceUrl: valid.sourceUrl })).toContain('title');
  });

  it('rejeita URL acima de 2048 caracteres', async () => {
    const url = `https://example.test/${'a'.repeat(2100)}`;
    expect(await errorsOf({ ...valid, sourceUrl: url })).toContain('sourceUrl');
  });

  it.each([
    ['title', 80],
    ['company', 80],
    ['summary', 800],
    ['location', 60],
    ['contractType', 40],
  ])('%s: aceita o limite (%i) e rejeita limite + 1', async (field, max) => {
    expect(await errorsOf({ ...valid, [field]: 'a'.repeat(max) })).toEqual([]);
    expect(await errorsOf({ ...valid, [field]: 'a'.repeat(max + 1) })).toEqual([
      field,
    ]);
  });

  it('o limite considera o texto normalizado (espaços repetidos não contam)', async () => {
    const spaced = `${'a'.repeat(39)}${' '.repeat(60)}${'b'.repeat(40)}`;
    expect(await errorsOf({ ...valid, title: spaced })).toEqual([]);
  });

  it('rejeita workMode fora de REMOTE/HYBRID/ONSITE', async () => {
    expect(await errorsOf({ ...valid, workMode: 'FULL_TIME' })).toContain(
      'workMode',
    );
  });

  it('rejeita listas com itens que não são texto', async () => {
    expect(await errorsOf({ ...valid, requirements: [1, 2] })).toContain(
      'requirements',
    );
  });

  // Configuração REAL do main.ts: `new ValidationPipe({ whitelist: true })`
  // (sem `transform` e sem `forbidNonWhitelisted`). Logo, campos extras são
  // REMOVIDOS em silêncio (não geram 400) e o pipe devolve um objeto simples
  // (não uma instância do DTO).
  it('remove campos de dono/status/modalidade vindos do cliente (whitelist, como no main.ts)', async () => {
    const pipe = new ValidationPipe({ whitelist: true });
    const result = (await pipe.transform(
      {
        ...valid,
        candidateId: 99,
        candidate_user_id: 99,
        status: 'COMPLETED',
        evaluationMode: 'AI',
        evaluation_mode: 'AI',
        evaluatorId: 5,
        evaluator_profile_id: 3,
        assigned_by_user_id: 1,
      },
      { type: 'body', metatype: CreateInterviewDto },
    )) as Record<string, unknown>;

    for (const forbidden of [
      'candidateId',
      'candidate_user_id',
      'status',
      'evaluationMode',
      'evaluation_mode',
      'evaluatorId',
      'evaluator_profile_id',
      'assigned_by_user_id',
    ]) {
      expect(result).not.toHaveProperty(forbidden);
    }
    expect(result).toEqual(valid);
  });
});
